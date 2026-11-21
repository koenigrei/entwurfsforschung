/* Wachstumssimulation urbaner Strukturen · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 600_Wachstumssimulation (Delphi, Projekt growingCity, Reinhard König 2007/2008).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Zwei Raster wie im Original: Zellen (cellList, cell scale 24 px auf der Zeichenfläche 611 × 689 px → 25 × 28) für die
   Knoten des Erschließungsgraphen und das Potentialfeld, darunter das dreifach feinere Raster (SmalGridList) für Straßen
   und Bebauung. Ein Schritt ist ein Timer-Durchlauf (Main.pas, Execute_Step) in einer der vier Laufarten (runMode):
     1 „network only“  Develop: die Kandidatenzelle mit dem größten Pot + noise weight · random wird Knoten
                        (testNeighState: Nachbarn eines Knotens sind gesperrt, deren Nachbarn Kandidaten), er verbindet
                        sich mit dem nächsten Knoten im 5 × 5-Umkreis (lookForOtherNodes, calcConnections) und – Interlink –
                        mit jedem weiteren, zu dem A* (calc_AStern) keinen Weg mit höchstens „min Distance“ Kanten findet.
                        Jede Kante wird als Straße auf das feine Raster gelegt (transferLine.transLine).
     2 „boom“          zuerst „cluster rounds“, dann Develop (nur Pot > grow thresh., ohne Interlink) und Highwayman.
     3 „interlink“     zuerst „cluster rounds“, dann Highwayman und Develop (Pot > grow thresh., mit Interlink).
     4 „cluster“       nur ExecuteCluster.
   Highwayman (potentialField.dev_Cell): Potentialfeld 5 × equiPot, dann je growth rate eine Zelle an einer Straße bebauen
   (größtes A·(1 − e^(−w1·Pot)) + r·random − (B·(1 − e^(−w2·Pot)) + r·random)). Cluster (dev_ClusterCell): dieselbe Wahl
   unter allen freien Zellen; liegt die neue Zelle allein, führt buildStreet eine Straße mit Zwischenknoten
   (subdivideEdge) zum nächsten Knoten. Danach der 2D-Bebauungsautomat (buildings_Calc, Regel A/B/C/D) und alle
   10 Schritte die Clusteranalyse (DetermineCluster, startCAna). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** Zeichenfläche Panel_Paint in Main.dfm (611 × 689 px); Zellenzahl = floor(Fläche / cell scale) wie in Setup */
  const BREITE = 611, HOEHE = 689;
  const LAUFART = { netz: 1, boom: 2, interlink: 3, cluster: 4 };

  /** Voreinstellungen aus Main.dfm (Value, Text, Checked, Position) */
  const STANDARD = {
    fassung: "netz",            // RadioGroup „choose active field-type“ (im Original war „cluster“ vorgewählt, siehe QUELLE.md)
    zellgroesse: 24,            // SE_cellScale
    startknoten: true,          // cb_centerNode „start with initial street“
    minDist: 3,                 // SE_minDist „min Distance (only for interlink)“
    fieldW: 0.1,                // E_fieldW „noise weight“
    nodeThresh: 0.1,            // E_nodeThresh „grow thresh.“
    strStep: 3,                 // SE_strStep „max street step“
    clusterRds: 3,              // se_clusterRds „start with … cluster rounds“
    w1: 2.0, A: 1.7,            // E_centriPe „centripetal weight (w1)“, E_peScale „x scale (A)“
    w2: 1.0, B: 2.0,            // E_centriFu „centrifugal weight (w2)“, E_fuScale „x scale (B)“
    devThresh: 0.1,             // E_devThresh „development threshold“
    gRate: 5,                   // SE_HWM_gRate „growth rate“
    rndScale: 1.0,              // E_rndScale „random scale“
    stopAt: 500,                // SE_stopAt „auto-stop at“
    autoBuild: true,            // b_autoBuild (Down = True)
    genA: 7, genB: 0, genC: 1, genD: 3,   // SE_genA … SE_genD (Regel 7013)
    // Darstellung
    konnekt: true,              // Knoten nach Erreichbarkeit färben (B_CalcPathes → ListKonnVals → StandardVal)
    lokal: true,                // CB_locMeas „use local measure“
    locRad: 4,                  // SE_locRad
    farbskala: 5,               // TB_color (Position 5 → colExpo 1)
    knotenGroesse: 5,           // SE_nSz (Radius in px bei cell scale 24)
    knoten: true,               // CB_agLayer „show agent layer“
    zellen: false,              // CB_cellLayer „show cell layer“ (Straßen und Bebauung; in Laufart 2–4 an)
    potential: false,           // Potentialfeld unterlegen (paint_Field)
    verlauf: true               // Diagramme neben dem Feld
  };

  const fr = Math.fround;                                            // Delphi Single

  /** Delphis Round: bei genau ,5 zur geraden Zahl (Banker's Rounding) */
  function rundeD(x) { const f = Math.floor(x), r = x - f; return r > 0.5 ? f + 1 : r < 0.5 ? f : (f % 2 === 0 ? f : f + 1); }
  /** RoundTo(x, −2) */
  const roundTo2 = x => rundeD(x * 100) / 100;
  /** calc_AStern.distance, transferLine.CalcDistance: gerundeter Abstand in px */
  const abstand = (ax, ay, bx, by) => rundeD(Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by)));
  /** colExpo aus TB_color.Position (adjustColScale) */
  const farbExponent = pos => pos <= 5 ? 0.5 + pos * 0.1 : 1 + (pos - 5) / 2;
  /** Feldgröße aus cell scale (Setup: spalt = floor(Width / cellScal), reih = floor(Height / cellScal)) */
  const feld = cs => ({ spalt: Math.floor(BREITE / cs), reih: Math.floor(HOEHE / cs) });

  /** TList.Sort von Delphi (Classes.QuickSort) – bei gleichem F entscheidet dieselbe Reihenfolge wie im Original */
  function sortiereDelphi(a, vergleich) { if (a.length > 0) qs(a, 0, a.length - 1, vergleich); return a; }
  function qs(a, L, R, cmp) {
    let I, J;
    do {
      I = L; J = R; const P = a[(L + R) >> 1];
      do {
        while (cmp(a[I], P) < 0) I++;
        while (cmp(a[J], P) > 0) J--;
        if (I <= J) { const T = a[I]; a[I] = a[J]; a[J] = T; I++; J--; }
      } while (I <= J);
      if (L < J) qs(a, L, J, cmp);
      L = I;
    } while (I < R);
  }

  /* ------------------------------------------------------------------ Zustand */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const cs = Math.max(3, Math.round(p.zellgroesse)), { spalt: sp, reih: rh } = feld(cs), sb = 3 * sp, sh = 3 * rh, n = sp * rh, m = sb * sh;
    const z = {
      t: 0, zufall, modus: LAUFART[p.fassung] || 1, cs, half: Math.floor(cs / 2), sp, rh, sb, sh,
      // Zellen (cellList): State 0 frei, 1 Knoten, 2 gesperrt, 3 Kandidat; Pot; buildDense, streetDense
      state: new Int8Array(n), nodeNr: new Int32Array(n).fill(-1), pot: new Float32Array(n), limbo: new Float32Array(n),
      buildDense: new Int32Array(n), streetDense: new Int32Array(n),
      // feines Raster (SmalGridList): cState 0 frei, 1 Straße, 2 bebaut; subState 2 bebaut (blau), 3 grün; isDev; ClustSize
      cState: new Uint8Array(m), subState: new Uint8Array(m), isDev: new Uint8Array(m), clustSize: new Int32Array(m),
      devList: [],
      // Knoten (NodeList): Zelle, Lage in px, Nachbarn (NachbList) mit Abstand
      nk: [], ni: [], nx: [], ny: [], nb: [], nd: [],
      conns: 0, netz: 0, strassen: 0, bebaut: 0,
      verlauf: [], cluster: null, fertig: false, version: 0,
      puffer: { pe: new Float64Array(n), fu: new Float64Array(n) }, astern: null
    };
    // Setup: „first street“ – erster Knoten auf cellList[round(spalt/2), round(reih/2)]
    if (p.startknoten) agentsCreate(z, rundeD(rh / 2) * sp + rundeD(sp / 2));
    return z;
  }

  /* ------------------------------------------------------------------ Knoten und Kanten */
  /** agent.AgentsCreate: Knoten auf der Zelle c, danach testNeighState */
  function agentsCreate(z, c) {
    const K = c % z.sp, I = (c - K) / z.sp, nr = z.nk.length;
    z.state[c] = 1; z.nodeNr[c] = nr;
    z.nk.push(K); z.ni.push(I); z.nx.push(z.half + K * z.cs); z.ny.push(z.half + I * z.cs); z.nb.push([]); z.nd.push([]);
    testNeighState(z);
    return nr;
  }

  /** Main.testNeighState: zwei Durchläufe; Moore-Nachbar eines Knotens → gesperrt (2), Nachbar einer gesperrten Zelle →
      Kandidat (3) und in DevList (ein Kandidat kann zweimal darin stehen, wie im Original) */
  function testNeighState(z) {
    const { sp, rh, state } = z, L = z.devList;
    L.length = 0;
    for (let J = 0; J < 2; J++) {
      for (let I = 0; I < rh; I++) {
        for (let K = 0; K < sp; K++) {
          const c = I * sp + K;
          if (state[c] === 1) continue;
          const v = testMooreNeigh(z, K, I);
          if (v === 1) state[c] = 2;
          else if (v === 2) { state[c] = 3; L.push(c); }
        }
      }
    }
  }
  /** Main.testMooreNeigh (3 × 3 samt der Zelle selbst): 1 = Knoten in der Nähe, 2 = gesperrte Zelle in der Nähe, sonst 0 */
  function testMooreNeigh(z, K, I) {
    let v = 0;
    for (let u = -1; u <= 1; u++) {
      const y = I + u; if (y < 0 || y >= z.rh) continue;
      for (let w = -1; w <= 1; w++) {
        const x = K + w; if (x < 0 || x >= z.sp) continue;
        const s = z.state[y * z.sp + x];
        if (s === 1) return 1;
        if (s === 2) v = 2;
      }
    }
    return v;
  }

  /** Main.lookForOtherNodes: Knoten im 5 × 5-Umkreis der Zelle (Reihenfolge: Spalte −2…2, darin Reihe −2…2) */
  function lookForOtherNodes(z, c) {
    const K = c % z.sp, I = (c - K) / z.sp, L = [];
    for (let n = -2; n <= 2; n++) for (let m = -2; m <= 2; m++) {
      const x = K + n, y = I + m;
      if (x < 0 || x >= z.sp || y < 0 || y >= z.rh || (n === 0 && m === 0)) continue;
      const d = y * z.sp + x;
      if (z.state[d] === 1) L.push(z.nodeNr[d]);
    }
    return L;
  }

  /** Main.Connect(FromNode a, ToNode b): Kante mit gerundetem Abstand, Straße von b nach a auf dem feinen Raster */
  function connect(z, a, b) {
    const d = abstand(z.nx[a], z.ny[a], z.nx[b], z.ny[b]);
    z.nb[b].push(a); z.nd[b].push(d); z.nb[a].push(b); z.nd[a].push(d);
    z.conns++; z.netz += d;
    const fk = 3 * z.nk[a] + 1, fi = 3 * z.ni[a] + 1, tk = 3 * z.nk[b] + 1, ti = 3 * z.ni[b] + 1;
    transLine(z, tk, ti, fk, fi, Math.atan2(fi - ti, fk - tk));
  }
  /** Connect nur zwischen zwei verschiedenen, noch nicht verbundenen Knoten (Behebung, siehe subdivideEdge) */
  function verbinde(z, a, b) { if (a !== b && z.nb[a].indexOf(b) < 0) connect(z, a, b); }

  const KLEIN = 1e-12;
  /** transferLine.transLine: Straße Zelle für Zelle (von Neumann) von (k, i) zum Ziel; je Schritt der Nachbar, der dem Ziel
      in keiner Achse ferner liegt und dessen Winkel zum Ziel dem Zielwinkel am nächsten kommt (ohne Umbruch bei ±π) */
  function transLine(z, k, i, tk, ti, wink) {
    const { sb, sp, cState, subState } = z, NB = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (let schutz = 0; schutz < 4 * (z.sb + z.sh); schutz++) {
      const s = i * sb + k, c = Math.floor(i / 3) * sp + Math.floor(k / 3);
      if (cState[s] === 1) z.streetDense[c]--;
      else { z.strassen++; if (cState[s] === 2) { z.buildDense[c]--; z.bebaut--; } }
      z.streetDense[c]++; cState[s] = 1; subState[s] = 1;
      if (k === tk && i === ti) return;
      let best = -1, min = 999999999;
      for (let q = 0; q < 4; q++) {
        const x = k + NB[q][0], y = i + NB[q][1];
        if (Math.abs(ti - y) <= Math.abs(ti - i) && Math.abs(tk - x) <= Math.abs(tk - k)) {
          const diff = Math.abs(wink - Math.atan2(ti - y, tk - x));
          if (diff < min - KLEIN) { min = diff; best = q; }   // Gleichstand → der erste Nachbar (unten, oben, rechts, links)
        }
      }
      k += NB[best][0]; i += NB[best][1];
    }
  }

  /* ------------------------------------------------------------------ A* (calc_AStern.findPath) */
  /** Zahl der Kanten des von A* gefundenen Weges von start nach ziel, 0 = kein Weg. Offene Liste absteigend nach F sortiert
      (Delphi-QuickSort), der letzte Eintrag wird expandiert, das Ziel gilt beim Aufnehmen als gefunden. */
  function findPath(z, start, ziel) {
    const n = z.nk.length;
    if (!z.astern || z.astern.F.length < n) {
      const k = Math.max(64, 2 * n);
      z.astern = { F: new Int32Array(k), G: new Int32Array(k), H: new Int32Array(k), zu: new Uint8Array(k), vorg: new Int32Array(k) };
    }
    const { F, G, H, zu, vorg } = z.astern, nx = z.nx, ny = z.ny;
    F.fill(0, 0, n); G.fill(0, 0, n); H.fill(0, 0, n); zu.fill(0, 0, n);   // deletePath
    const calcF = (v, me) => { G[me] = G[v] + abstand(nx[v], ny[v], nx[me], ny[me]); H[me] = abstand(nx[ziel], ny[ziel], nx[me], ny[me]); F[me] = G[me] + H[me]; };
    const nachF = (a, b) => F[a] < F[b] ? 1 : F[a] === F[b] ? 0 : -1;     // compareByF
    const open = [start];
    let gefunden = false;
    while (open.length > 0 && !gefunden) {
      const ex = open[open.length - 1];
      zu[ex] = 1;
      const L = z.nb[ex];
      for (let q = 0; q < L.length; q++) {                                  // checkNeighbour
        const c = L[q];
        if (zu[c]) continue;
        if (open.indexOf(c) < 0) {
          calcF(ex, c); vorg[c] = ex; open.push(c);
          if (c === ziel) gefunden = true;
        } else {
          const aG = G[c], aH = H[c], aF = F[c];
          calcF(ex, c);
          if (aG < G[c]) { G[c] = aG; H[c] = aH; F[c] = aF; } else vorg[c] = ex;
        }
      }
      sortiereDelphi(open, nachF);
      open.splice(open.indexOf(ex), 1);
    }
    if (!gefunden) return 0;
    let zahl = 0, e = ziel;
    do { zahl++; e = vorg[e]; } while (e !== start && zahl <= n);
    return zahl;
  }

  /** Main.Interlink: Verbindung zu jedem Kandidaten, zu dem es keinen Weg oder nur einen mit mehr als minDist Kanten gibt */
  function interlink(z, cur, kandidaten, minDist) {
    for (const to of kandidaten) {
      const k = findPath(z, cur, to);
      if (k > minDist || k === 0) connect(z, cur, to);
    }
  }

  /** Main.calcConnections: mit dem nächsten Kandidaten (Manhattan-Abstand in px) verbinden; Laufart 1 und 3 auch Interlink */
  function calcConnections(z, c, kandidaten, p) {
    const cur = z.nodeNr[c];
    if (kandidaten.length === 1) { connect(z, cur, kandidaten[0]); return; }
    if (kandidaten.length === 0) return;                                   // kommt nicht vor (Kandidaten liegen nahe einem Knoten)
    let min = 9999999, to = -1;
    for (const k of kandidaten) {
      const d = Math.abs(z.nx[k] - z.nx[cur]) + Math.abs(z.ny[k] - z.ny[cur]);
      if (d < min) { min = d; to = k; }
    }
    connect(z, cur, to);
    kandidaten.splice(kandidaten.indexOf(to), 1);
    if (z.modus === 1 || z.modus === 3) interlink(z, cur, kandidaten, p.minDist);
  }

  /** Main.Develop: Kandidat mit größtem Pot + noise weight · random wird Knoten (Laufart 2–4 nur bei Pot > grow thresh.) */
  function develop(z, p) {
    const L = z.devList, fw = fr(p.fieldW), nt = fr(p.nodeThresh);
    if (L.length === 0) { z.fertig = true; return; }
    let maxPot = -999999999, dev = -1;
    for (let q = 0; q < L.length; q++) {
      const c = L[q];
      if (z.state[c] !== 3) continue;
      const tmp = fr(z.pot[c] + fw * z.zufall());                          // tmpPot ist Single
      if (tmp > maxPot) { maxPot = tmp; dev = c; }
    }
    if (dev < 0) return;
    if (z.modus > 1 && !(z.pot[dev] > nt)) return;
    agentsCreate(z, dev);
    if (z.nk.length > 1) calcConnections(z, dev, lookForOtherNodes(z, dev), p);
  }

  /** transferLine.subdivideEdge: Straße von Zelle a nach b mit Zwischenknoten alle cell scale · max street step px.
      Behoben: liegt schon ein Knoten auf einer Zelle, wird er benutzt (das Original legte einen zweiten an). */
  function subdivideEdge(z, a, b, p) {
    const sp = z.sp, aK = a % sp, aI = (a - aK) / sp, bK = b % sp, bI = (b - bK) / sp, cs = z.cs;
    const wink = Math.atan2(aI - bI, aK - bK);
    const laenge = abstand(z.half + aK * cs, z.half + aI * cs, z.half + bK * cs, z.half + bI * cs);
    const ref = cs * Math.max(1, Math.round(p.strStep)), M = rundeD(laenge / ref);
    const dx = fr(Math.cos(wink) * ref), dy = fr(Math.sin(wink) * ref);
    let von = z.state[a] === 1 ? z.nodeNr[a] : agentsCreate(z, a);
    for (let I = 1; I <= M - 1; I++) {
      const k = aK - rundeD(I * dx / cs), i = aI - rundeD(I * dy / cs), c = i * sp + k;
      const cur = z.state[c] === 1 ? z.nodeNr[c] : agentsCreate(z, c);
      verbinde(z, cur, von);
      von = cur;
    }
    const ende = z.state[b] === 1 ? z.nodeNr[b] : agentsCreate(z, b);
    verbinde(z, ende, von);
  }

  /** Lage einer feinen Zelle in px (SmalGridCreate: Mitte der Zelle + round(M · 0,33 · cellScal)) */
  const feinPx = (z, k) => z.half + Math.floor(k / 3) * z.cs + rundeD((k % 3 - 1) * 0.33 * z.cs);

  /** potentialField.buildStreet: Knoten auf der Zelle der allein liegenden Bebauung, Straße mit Zwischenknoten zum
      nächsten Knoten, dann Interlink mit den Knoten im 5 × 5-Umkreis */
  function buildStreet(z, s, p) {
    const k = s % z.sb, i = (s - k) / z.sb, x = feinPx(z, k), y = feinPx(z, i);
    let min = 999999999, nah = -1;
    for (let n = 0; n < z.nk.length; n++) {
      const d = abstand(x, y, z.nx[n], z.ny[n]);
      if (d < min) { min = d; nah = n; }
    }
    const par = Math.floor(i / 3) * z.sp + Math.floor(k / 3);
    const cur = agentsCreate(z, par);
    if (nah < 0) return;                                                   // ohne Knoten: im Original Zugriff auf nil
    subdivideEdge(z, z.ni[nah] * z.sp + z.nk[nah], par, p);
    if (z.nk.length > 1) interlink(z, cur, lookForOtherNodes(z, par), p.minDist);
  }

  /* ------------------------------------------------------------------ Potentialfeld und Bebauung */
  /** potentialField.equiPot: Pot = (( buildDense/9 )^(1 − Pot) + Summe Pot der vier Nachbarn) / 5, höchstens 1.
      limbo und Pot sind Float32Array – jede Zuweisung rundet auf Single wie im Original. */
  function equiPot(z) {
    const { sp, rh, pot, limbo, buildDense } = z;
    for (let I = 0; I < rh; I++) for (let K = 0; K < sp; K++) {
      const c = I * sp + K;
      limbo[c] = buildDense[c] > 0 ? Math.pow(buildDense[c] / 9, 1 - pot[c]) : 0;
      if (I + 1 < rh) limbo[c] = limbo[c] + pot[c + sp];                // checkPot: (K, I+1), (K, I−1), (K+1, I), (K−1, I)
      if (I > 0) limbo[c] = limbo[c] + pot[c - sp];
      if (K + 1 < sp) limbo[c] = limbo[c] + pot[c + 1];
      if (K > 0) limbo[c] = limbo[c] + pot[c - 1];
      limbo[c] = limbo[c] / 5;
    }
    for (let c = 0; c < pot.length; c++) { pot[c] = limbo[c]; if (pot[c] > 1) pot[c] = 1; }
  }

  /** von-Neumann-Nachbarn einer feinen Zelle (Reihenfolge des Originals: unten, oben, rechts, links) */
  function vnNachbar(z, s, test) {
    const k = s % z.sb, i = (s - k) / z.sb;
    return (i + 1 < z.sh && test(s + z.sb)) || (i > 0 && test(s - z.sb)) || (k + 1 < z.sb && test(s + 1)) || (k > 0 && test(s - 1));
  }

  /** dev_Cell (Highwayman) bzw. dev_ClusterCell: freie Zelle mit dem größten
      A·(1 − e^(−w1·Pot)) + r·random − (B·(1 − e^(−w2·Pot)) + r·random) wird bebaut.
      Highwayman: nur Zellen mit Straße oder (bebaut und Pot > development threshold) als Nachbar (checkNei). */
  function entwickleZelle(z, p, cluster) {
    const { sb, sh, sp, cState, pot } = z, { pe, fu } = z.puffer;
    const ePe = fr(p.w1), eFu = fr(p.w2), sPe = fr(p.A), sFu = fr(p.B), rnd = fr(p.rndScale), dt = fr(p.devThresh);
    for (let c = 0; c < pot.length; c++) {                                // Pot ist während der growth-rate-Schleife fest
      pe[c] = sPe * (1 - Math.exp(-ePe * pot[c])); fu[c] = sFu * (1 - Math.exp(-eFu * pot[c]));
    }
    const nebenStrasse = q => cState[q] === 1 || (cState[q] === 2 && pot[Math.floor(q / sb / 3) * sp + Math.floor((q % sb) / 3)] > dt);
    let max = -999999999, best = -1;
    for (let i = 0; i < sh; i++) {
      const zr = Math.floor(i / 3) * sp;
      for (let k = 0; k < sb; k++) {
        const s = i * sb + k;
        if (cState[s] !== 0) continue;
        if (!cluster && !vnNachbar(z, s, nebenStrasse)) continue;
        const c = zr + Math.floor(k / 3);
        let a = 0, b = 0;
        if (ePe !== 0) a = pe[c] + rnd * z.zufall();
        if (eFu !== 0) b = fu[c] + rnd * z.zufall();
        if (a - b > max) { max = a - b; best = s; }
      }
    }
    if (best < 0) { z.fertig = true; return -1; }
    const k = best % sb, i = (best - k) / sb, c = Math.floor(i / 3) * sp + Math.floor(k / 3);
    cState[best] = 2; z.subState[best] = 2; z.buildDense[c]++; z.bebaut++;
    if (cluster && !vnNachbar(z, best, q => cState[q] !== 0) && (z.state[c] === 3 || z.state[c] === 0)) buildStreet(z, best, p);
    return best;
  }

  /** Main.buildings_Calc (2D building CA), in Lesereihenfolge an Ort und Stelle: bebaut (2) → grün (3), wenn
      Nachbarn ≥ A oder ≤ B; grün → bebaut, wenn C ≤ Nachbarn ≤ D; nur bebaute Zellen in Clustern mit mehr als 4 Zellen */
  function buildingsCalc(z, p) {
    const { sb, sh, cState, subState, clustSize } = z, A = p.genA, B = p.genB, C = p.genC, D = p.genD;
    for (let i = 0; i < sh; i++) for (let k = 0; k < sb; k++) {
      const s = i * sb + k;
      if (cState[s] !== 2 || clustSize[s] <= 4) continue;
      let n = 0;
      for (let u = -1; u <= 1; u++) {
        const y = i + u; if (y < 0 || y >= sh) continue;
        for (let v = -1; v <= 1; v++) { const x = k + v; if (x >= 0 && x < sb && subState[y * sb + x] === 2) n++; }
      }
      if (subState[s] === 2) { n--; if (n >= A || n <= B) subState[s] = 3; }
      else if (subState[s] === 3 && n >= C && n <= D) subState[s] = 2;
    }
  }

  /** Main.buildings_Init („random build“): bebaute Zellen in Clustern > 4 zufällig grün oder bebaut */
  function zufallsBebauung(z) {
    const { cState, subState, clustSize } = z;
    for (let s = 0; s < cState.length; s++) {
      if (clustSize[s] <= 4) continue;
      if (cState[s] === 2) subState[s] = z.zufall() > 0.5 ? 3 : 2;
      else subState[s] = cState[s];
    }
    z.version++;
  }

  /** cluster.DetermineCluster und startCAna: entwickelt = bebaut oder Straße neben Bebauung; zusammenhängende entwickelte
      Zellen (von Neumann) bilden Cluster, ClustSize = Größe. Eigenheit des Originals: die erste Zelle jedes Clusters
      (toCluster bleibt −1) behält ihren alten Wert. */
  function clusterAnalyse(z) {
    const { sb, sh, cState, isDev, clustSize } = z, m = sb * sh;
    for (let s = 0; s < m; s++) isDev[s] = cState[s] === 2 || (cState[s] === 1 && vnNachbar(z, s, q => cState[q] === 2)) ? 1 : 0;
    const zu = new Int32Array(m).fill(-1), groessen = [], stapel = [];
    for (let s = 0; s < m; s++) {
      if (!isDev[s] || zu[s] !== -1) continue;
      const id = groessen.length; let g = 1;
      zu[s] = id; stapel.push(s);
      while (stapel.length) {
        const q = stapel.pop(), k = q % sb, i = (q - k) / sb;
        const nb = [i + 1 < sh ? q + sb : -1, i > 0 ? q - sb : -1, k + 1 < sb ? q + 1 : -1, k > 0 ? q - 1 : -1];
        for (const r of nb) if (r >= 0 && isDev[r] && zu[r] === -1) { zu[r] = id; g++; stapel.push(r); }
      }
      groessen.push(g);
      zu[s] = -2 - id;                                                     // Startzelle: behält ihren ClustSize
    }
    for (let s = 0; s < m; s++) if (zu[s] >= 0) clustSize[s] = groessen[zu[s]];
    let groesster = 0, ueber10 = 0;
    for (const g of groessen) { if (g > groesster) groesster = g; if (g > 10) ueber10++; }
    z.cluster = { anzahl: groessen.length, groesster, ueber10 };
  }

  /** Main.countCellTypes: Anteile am feinen Raster (für das Verlaufsdiagramm) */
  function zellAnteile(z) {
    const { cState, subState } = z, m = cState.length;
    let gruen = 0;
    for (let s = 0; s < m; s++) if (cState[s] === 2 && subState[s] === 3) gruen++;
    return { strasse: z.strassen / m, bebaut: z.bebaut / m, gruen: gruen / m, gruenZahl: gruen };
  }

  /* ------------------------------------------------------------------ Ablauf (Execute_Step) */
  function highwayman(z, p) {
    for (let j = 0; j < 5; j++) equiPot(z);                              // „bring the potential field near equilibrium“
    for (let g = 0; g < p.gRate; g++) entwickleZelle(z, p, false);
  }
  function clusterLauf(z, p) {
    for (let j = 0; j < 5; j++) equiPot(z);
    for (let g = 0; g < p.gRate; g++) entwickleZelle(z, p, true);
  }
  function knotenLauf(z, p) {                                              // ExecuteInterlink / ExecuteBoom
    develop(z, p);
    if (z.nk.length >= p.stopAt) z.fertig = true;
  }

  function schritt(z, p) {
    z.fertig = false;
    const m = z.modus;
    if (m === 1) knotenLauf(z, p);
    else if (m === 2) { if (z.t < p.clusterRds) clusterLauf(z, p); else { knotenLauf(z, p); highwayman(z, p); } }
    else if (m === 3) { if (z.t < p.clusterRds) clusterLauf(z, p); else { highwayman(z, p); knotenLauf(z, p); } }
    else clusterLauf(z, p);
    if (p.autoBuild) buildingsCalc(z, p);
    if (z.t >= p.stopAt) z.fertig = true;
    if (z.t % 10 === 0) {                                                  // subTime: alle 10 Schritte Analyse (Laufart 2–4)
      if (m > 1) clusterAnalyse(z);
      const a = zellAnteile(z);
      z.verlauf.push([z.t, a.strasse, a.bebaut, a.gruen]);
    }
    z.t++;
    z.version++;
    return z;
  }

  /** Parameter ohne Neustart: das Modell liest sie in jedem Schritt */
  function aendere(z, param, id) {}

  /* ------------------------------------------------------------------ Maus (Panel_PaintMouseDown/Up) */
  const zelleBei = (z, x, y) => { const K = Math.floor(x / 3), I = Math.floor(y / 3); return K >= 0 && K < z.sp && I >= 0 && I < z.rh ? I * z.sp + K : -1; };
  /** linke Maustaste ohne Ziehen: Knoten auf der Zelle (AgentsCreate), nicht auf einem vorhandenen Knoten */
  function setzeKnoten(z, x, y) {
    const c = zelleBei(z, x, y);
    if (c < 0 || z.state[c] === 1) return false;
    agentsCreate(z, c); z.version++; return true;
  }
  /** linke Maustaste gezogen: Straße mit Zwischenknoten von Zelle zu Zelle (subdivideEdge) */
  function zieheStrasse(z, p, x0, y0, x1, y1) {
    const a = zelleBei(z, x0, y0), b = zelleBei(z, x1, y1);
    if (a < 0 || b < 0) return false;
    if (a === b) return setzeKnoten(z, x0, y0);
    subdivideEdge(z, a, b, p); z.version++; return true;
  }
  /** rechte Maustaste: freie feine Zelle bebauen (cState 2, buildDense + 1) */
  function bebaue(z, x, y) {
    const k = Math.floor(x), i = Math.floor(y);
    if (k < 0 || k >= z.sb || i < 0 || i >= z.sh) return false;
    const s = i * z.sb + k;
    if (z.cState[s] !== 0) return false;
    z.cState[s] = 2; z.buildDense[Math.floor(i / 3) * z.sp + Math.floor(k / 3)]++; z.bebaut++; z.version++;
    return true;
  }

  /* ------------------------------------------------------------------ Auswertung */
  /** dijkstra.CalculatePathes + ConnTable.ListKonnVals + StandardVal: kürzeste Wege in Kanten (Knotenschritte) zwischen
      allen Knoten; ML je Knoten = RoundTo(Zeilensumme / n, −2), globML = RoundTo(Mittel, −2); lokales Maß = Summe von
      (locRad − Weglänge) über alle Knoten mit Weglänge ≤ locRad (wie im Original zählen der Knoten selbst und
      unerreichbare mit 0). wert = auf [0, 1] gebrachtes Maß hoch colExpo (Farbe der Knoten). */
  function konnektivitaet(z, opt) {
    const o = Object.assign({ lokal: true, locRad: 4, farbskala: 5 }, opt), n = z.nk.length;
    const ml = new Float64Array(n), loc = new Float64Array(n), wert = new Float64Array(n), d = new Int32Array(n), schlange = new Int32Array(n);
    let summe = 0, weite = 0;
    for (let a = 0; a < n; a++) {
      d.fill(-1); d[a] = 0; let kopf = 0, ende = 0; schlange[ende++] = a;
      while (kopf < ende) { const v = schlange[kopf++]; for (const w of z.nb[v]) if (d[w] < 0) { d[w] = d[v] + 1; schlange[ende++] = w; } }
      let zeile = 0, l = 0;
      for (let b = 0; b < n; b++) {
        const pl = d[b] < 0 ? 0 : d[b];
        zeile += pl; if (pl <= o.locRad) l += o.locRad - pl; if (pl > weite) weite = pl;
      }
      ml[a] = roundTo2(zeile / n); loc[a] = l; summe += ml[a];
    }
    const mass = o.lokal ? loc : ml, ex = farbExponent(o.farbskala);
    let mi = Infinity, ma = 0;
    for (let a = 0; a < n; a++) { if (mass[a] > ma) ma = mass[a]; if (mass[a] < mi) mi = mass[a]; }
    for (let a = 0; a < n; a++) {
      const r = ma > mi ? roundTo2((mass[a] - mi) / (ma - mi)) : 0;
      wert[a] = Math.pow(ma > mi && !o.lokal ? 1 - r : r, ex);
    }
    return { ml, lokal: loc, wert, globML: n ? roundTo2(summe / n) : 0, weite };
  }

  /** Main.EdgesPerNode: Zahl der Knoten je Kantenzahl 0 … 8 (letzte Klasse: 8 und mehr) */
  function grade(z) {
    const h = new Array(9).fill(0);
    for (const L of z.nb) h[Math.min(8, L.length)]++;
    return h;
  }

  /** Kennzahlen für Bedienfeld, Tests und pruef_ausdruck */
  function auswertung(z) {
    const n = z.nk.length, a = zellAnteile(z), sp = z.sp;
    let naechster = Infinity;                                              // kleinster Abstand zweier Knoten (Chebyshev, Zellen)
    for (let q = 0; q < n; q++) for (const r of lookForOtherNodes(z, z.ni[q] * sp + z.nk[q])) {
      const dd = Math.max(Math.abs(z.nk[q] - z.nk[r]), Math.abs(z.ni[q] - z.ni[r]));
      if (dd < naechster) naechster = dd;
    }
    let zusammen = 0;                                                      // Größe der Komponente des ersten Knotens
    if (n) {
      const gesehen = new Uint8Array(n), st = [0]; gesehen[0] = 1;
      while (st.length) { const v = st.pop(); zusammen++; for (const w of z.nb[v]) if (!gesehen[w]) { gesehen[w] = 1; st.push(w); } }
    }
    return {
      knoten: n, kanten: z.conns, grad: n ? 2 * z.conns / n : 0, netzLaenge: z.netz / z.cs,
      strassen: z.strassen, bebaut: z.bebaut, gruen: a.gruenZahl, anteilStrasse: a.strasse, anteilBebaut: a.bebaut, anteilGruen: a.gruen,
      naechster: naechster === Infinity ? null : naechster, zusammenhaengend: n > 0 && zusammen === n,
      cluster: z.cluster, kandidaten: z.devList.length
    };
  }

  return {
    STANDARD, LAUFART, BREITE, HOEHE, erzeuge, schritt, aendere,
    rundeD, roundTo2, abstand, farbExponent, feld, sortiereDelphi,
    agentsCreate, testNeighState, testMooreNeigh, lookForOtherNodes, connect, transLine, findPath, interlink, calcConnections,
    develop, subdivideEdge, buildStreet, equiPot, entwickleZelle, buildingsCalc, zufallsBebauung, clusterAnalyse, zellAnteile,
    setzeKnoten, zieheStrasse, bebaue, konnektivitaet, grade, auswertung
  };
});
