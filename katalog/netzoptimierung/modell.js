/* Straßennetz-Optimierung · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Street Network Optimization“ aus dem Parametric Planning Catalogue
   (DeCodingSpaces – Reinhard König, Martin Bielik, Ekaterina Fuchkina).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Ablauf wie die Schaltung der .gh-Datei:
   Street Network Chromosome (Instruktionsbaum je Knoten der Startstraßen) → ChromosomeFactory (Nr Parents Zufallsnetze)
   → Schleife je Generation (Loop Start/End): OffspringGenerator (Nr Offsprings, Crossover/Mutation Rate, Random Generation,
   Shuffle Chromosomes) → ChromosomeMapper (Baum → Straßengeometrie) → Fitness (Length → Mass Addition → (1/(x+0.000001))*10000;
   Network Smooth → 1. ProcessGeometry → 2. BuildGraph (Length Coefficient 0.219, Angular Coefficient 1) → 3./4. Floyd–Warshall
   → Closeness Centrality → größter Wert) → ChromosomeInfo (Set Fitness Values) → Selection (PISA, 2 Ziele, beide werden
   minimiert; hier SPEA2) → Parents/Archive. Ein Schritt = eine Generation.

   Abbildung Chromosom → Straßennetz: Abgleich mit dem Quelltext der DeCodingSpaces-Toolbox (Bauhaus-InfAU/decoding-spaces-toolbox,
   GPL-3.0; Ablauf, Voreinstellungen und Randfälle aus docs/research/legacy-generation.md §1 abgelesen; kein Code übernommen). */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo) {
  "use strict";

  /** Voreinstellungen (Schieberegler der .gh-Datei: Wert [Bereich]; feste Eingänge „PD“):
      generationen: Iterations/Generations 1 [0..100] – in der App 20, damit Start einen sichtbaren Lauf zeigt
      nachkommen: Nr Offsprings 30 [0..100] (= Lambda) · eltern: Nr Parents 10 [0..100] (= Mu, auch ChromosomeFactory Number)
      kreuzung: Crossover Rate 0.8 [0..1] · mutation: Mutation Rate 0.1 [0..1] · neuAnteil: Random Generation 0.1 [0..1]
      mischen: Shuffle Chromosomes false
      baumtiefe: TreeDepth 7 [0..20] · minLaenge: MinLength 30 · maxLaenge: MaxLength 100 (Spanne: Länge ∈ [30, 130) m)
      minAbstand: MinDist 20 · zufallsWinkel: RandomAngle 10 (Abweichung ∈ [−5°, +5°)) · maxArme: MaxArms 4
      kL: Length Coefficient 0.219 [0..1] · kW: Angular Coefficient 1 [0..1] (2. BuildGraph)
      variante: Show Variant 0 [0..9]
      ziel2: Lesart von f₂ – "closeness" = größte Closeness n / Σd (Quelltext der Legacy-Komponente, Voreinstellung) oder
             "weglaenge" = größte mittlere Weglänge Σd / n (Beschreibung im Panel: „average length of the shortest path“) */
  const STANDARD = {
    generationen: 20, nachkommen: 30, eltern: 10, kreuzung: 0.8, mutation: 0.1, neuAnteil: 0.1, mischen: false,
    baumtiefe: 7, minLaenge: 30, maxLaenge: 100, minAbstand: 20, zufallsWinkel: 10, maxArme: 4,
    kL: 0.219, kW: 1, variante: 0, ziel2: "closeness"
  };
  /** die beiden Lesarten von f₂ (beide werden minimiert: kleine größte Closeness bzw. kurze größte mittlere Weglänge) */
  const ZIELE2 = ["closeness", "weglaenge"];
  /** feste Werte im Inneren der kompilierten Komponenten (legacy-generation.md §1) und eigene Grenzen der App */
  const INTERN = {
    freiwinkel: 80,      // kleinster freier Winkel für einen neuen Arm (_minAngle = 80°)
    wurzelArme: 3,       // drei Arm-Plätze je Knoten der Startstraßen
    wurzelMaxArme: 4,    // höchster Grad an den Wurzeln (maxConn = 4)
    fangStart: 1,        // Rand und Startstraßen werden mit 1 m Fangabstand eingefügt
    glaetten: 1,         // Network Smooth: Snap threshold 1
    maxKnoten: 20000,    // Obergrenze der Baumgröße (bei TreeDepth 20 wüchse der Baum sonst auf Millionen Knoten)
    pGen: 0.05,          // Anteil der Knoten, deren Gene eine Mutation neu zieht
    minSegment: 1        // kürzere Arme werden verworfen
  };
  const ART = { RAND: 0, START: 1, NEU: 2 };

  /* ---------------------------------------------------------------- Szene */
  /** Beispielszene (Meter, y nach unten): fünfeckiges Baufeld in einer Stadt wie im Katalogbild, drei Startstraßen
      (zwei Achsen von West nach Ost, eine Zufahrt von Nordosten), Umgebungsstraßen nur als Hintergrund. */
  function szene() {
    const rand = [[120, 408], [258, 62], [445, 42], [652, 175], [420, 500]];
    const start = [
      [[30, 232], [188, 238], [290, 247], [395, 256], [490, 262], [584, 270]],
      [[170, 106], [236.5, 116], [330, 129], [430, 142], [540, 157], [652, 175]],
      [[610, 60], [572, 112], [548, 128]]
    ];
    const ring = Geo.versetze(rand, -48);
    const umgebung = [];
    ring.forEach((q, i) => { umgebung.push([q, ring[(i + 1) % ring.length]]); umgebung.push([rand[i], q]); });
    umgebung.push([[0, 228], [30, 232]], [[170, 106], [70, 86]], [[70, 86], [0, 96]], [[610, 60], [640, 0]],
                  [[420, 500], [380, 540]], [[652, 175], [680, 168]], [[120, 408], [0, 452]], [[258, 62], [230, 0]], [[445, 42], [470, 0]]);
    return { b: 680, h: 540, rand, start, umgebung };
  }

  /* ---------------------------------------------------------------- Straßengraph für das Wachstum */
  function netzNeu() { return { P: [], adj: [], E: [] }; }
  function knotenNeu(G, q) { G.P.push([q[0], q[1]]); G.adj.push([]); return G.P.length - 1; }
  function kanteNeu(G, a, b, art) { const k = G.E.length; G.E.push({ a, b, art, lebt: true }); G.adj[a].push(k); G.adj[b].push(k); return k; }
  const gegenueber = (G, v, k) => (G.E[k].a === v ? G.E[k].b : G.E[k].a);
  const grad = (G, v) => G.adj[v].length;
  const nachbarn = (G, v) => G.adj[v].map(k => gegenueber(G, v, k));
  const verbunden = (G, a, b) => G.adj[a].some(k => gegenueber(G, a, k) === b);
  const amRand = (G, v) => G.adj[v].some(k => G.E[k].art === ART.RAND);
  /** Kante k am Knoten v teilen (v liegt auf k) */
  function kanteTeilen(G, k, v) {
    const e = G.E[k]; e.lebt = false;
    G.adj[e.a] = G.adj[e.a].filter(x => x !== k); G.adj[e.b] = G.adj[e.b].filter(x => x !== k);
    kanteNeu(G, e.a, v, e.art); kanteNeu(G, v, e.b, e.art);
  }
  /** nächster Knoten zu q (ohne Knoten „ohne“) → {v, d} */
  function naechsterKnoten(G, q, ohne = -1) {
    let v = -1, d = Infinity;
    for (let i = 0; i < G.P.length; i++) {
      if (i === ohne) continue;
      const di = Math.hypot(G.P[i][0] - q[0], G.P[i][1] - q[1]); if (di < d) { d = di; v = i; }
    }
    return { v, d };
  }
  /** nächste lebende Kante zu q, die nicht am Knoten „ohne“ hängt → {k, d, q (Fußpunkt), t} */
  function naechsteKante(G, q, ohne = -1) {
    let best = { k: -1, d: Infinity, q: null, t: 0 };
    for (let k = 0; k < G.E.length; k++) {
      const e = G.E[k]; if (!e.lebt || e.a === ohne || e.b === ohne) continue;
      const r = Geo.abstandSegment(q, G.P[e.a], G.P[e.b]); if (r.d < best.d) best = { k, d: r.d, q: r.q, t: r.t };
    }
    return best;
  }
  /** erster Schnitt der Strecke a → b mit lebenden Kanten, die nicht an den Knoten v1/v2 hängen und nicht k0 sind → {k, t, p} | null */
  function ersterSchnitt(G, a, b, v1, v2, k0) {
    let best = null;
    for (let k = 0; k < G.E.length; k++) {
      const e = G.E[k];
      if (!e.lebt || k === k0 || e.a === v1 || e.b === v1 || (v2 >= 0 && (e.a === v2 || e.b === v2))) continue;
      const s = Geo.segmentSchnitt(a, b, G.P[e.a], G.P[e.b]);
      if (s && s.t > 1e-9 && s.t < 1 - 1e-9 && (!best || s.t < best.t)) best = { k, t: s.t, p: s.p };
    }
    return best;
  }
  /** Knoten (≠ v1, v2), der näher als md an der Strecke a → b liegt, der erste entlang der Strecke → {v, t} | null */
  function knotenAnStrecke(G, a, b, v1, v2, md) {
    let best = null;
    for (let i = 0; i < G.P.length; i++) {
      if (i === v1 || i === v2 || !G.adj[i].length) continue;
      const r = Geo.abstandSegment(G.P[i], a, b);
      if (r.d < md && r.t > 1e-9 && r.t < 1 - 1e-9 && (!best || r.t < best.t)) best = { v: i, t: r.t };
    }
    return best;
  }

  /** Strecke a–b (Rand oder Startstraße) mit Fangabstand tol einfügen: Endpunkte fangen an Knoten oder Kanten,
      unterwegs jede gekreuzte Kante teilen (Knoten an Kreuzungen). → [Knoten am Anfang, Knoten am Ende] */
  function fuegeStreckeEin(G, a, b, art, tol) {
    const ende = q => {
      const nv = naechsterKnoten(G, q); if (nv.v >= 0 && nv.d <= tol) return nv.v;
      const ne = naechsteKante(G, q); const v = knotenNeu(G, ne.k >= 0 && ne.d <= tol ? ne.q : q);
      if (ne.k >= 0 && ne.d <= tol) kanteTeilen(G, ne.k, v);
      return v;
    };
    const va = ende(a), vb = ende(b);
    if (va === vb) return [va, vb];
    const pa = G.P[va], pb = G.P[vb], kette = [];
    for (let k = 0; k < G.E.length; k++) {
      const e = G.E[k]; if (!e.lebt || e.a === va || e.b === va || e.a === vb || e.b === vb) continue;
      const s = Geo.segmentSchnitt(pa, pb, G.P[e.a], G.P[e.b]);
      if (s && s.t > 1e-9 && s.t < 1 - 1e-9) kette.push({ t: s.t, k, p: s.p });
    }
    kette.sort((x, y) => x.t - y.t);
    let u = va;
    for (const c of kette) {
      const e = G.E[c.k]; let v;
      if (Geo.abstand(c.p, G.P[e.a]) <= tol) v = e.a; else if (Geo.abstand(c.p, G.P[e.b]) <= tol) v = e.b;
      else { v = knotenNeu(G, c.p); kanteTeilen(G, c.k, v); }
      if (v !== u && !verbunden(G, u, v)) kanteNeu(G, u, v, art);
      u = v;
    }
    if (u !== vb && !verbunden(G, u, vb)) kanteNeu(G, u, vb, art);
    return [va, vb];
  }

  /** Grundnetz: Rand (geschlossen) und Startstraßen mit 1 m Fangabstand. → {G, wurzeln: Knoten der Startstraßen (eine Wurzel je Stützpunkt)} */
  function grundnetz(S) {
    const G = netzNeu(), R = S.rand;
    for (let i = 0; i < R.length; i++) fuegeStreckeEin(G, R[i], R[(i + 1) % R.length], ART.RAND, INTERN.fangStart);
    for (const pl of S.start) for (let i = 0; i + 1 < pl.length; i++) fuegeStreckeEin(G, pl[i], pl[i + 1], ART.START, INTERN.fangStart);
    const wurzeln = [];
    for (const pl of S.start) for (const q of pl) wurzeln.push(naechsterKnoten(G, q).v);
    return { G, wurzeln };
  }
  /** Punkt im äußeren Rand (Rand + 1 m) */
  function imAussenrand(S, q) {
    if (Geo.punktInPoly(q, S.rand)) return true;
    const R = S.rand;
    for (let i = 0; i < R.length; i++) if (Geo.abstandSegment(q, R[i], R[(i + 1) % R.length]).d <= 1) return true;
    return false;
  }

  /** Einen Arm vom Knoten pv zum Zielpunkt einfügen (AddGraphElement, eigene geordnete Fangregeln):
      1. Zielpunkt fängt an einem Knoten (näher als MinDist; Knoten mit Grad ≥ MaxArms lehnen ab), sonst an einer Kante (Fußpunkt);
      2. der Arm endet am ersten Schnitt mit einer anderen Straße (die geteilt wird) – ein Arm, der den Rand trifft, ist geschlossen;
      3. liegt ein Knoten näher als MinDist an der Strecke, endet der Arm dort; 2. und 3. werden wiederholt, bis sich nichts ändert;
      4. Ziel außerhalb des äußeren Rands oder kürzer als 1 m → verworfen.  → {v, zu} oder null */
  function arm(G, S, pv, ziel, md, maxArme) {
    let q = ziel, zielV = -1, teilK = -1, zu = false;
    const nv = naechsterKnoten(G, q, pv);
    if (nv.v >= 0 && nv.d < md) { if (grad(G, nv.v) >= maxArme) return null; zielV = nv.v; q = G.P[zielV]; }
    else { const ne = naechsteKante(G, q, pv); if (ne.k >= 0 && ne.d < md && ne.t > 0 && ne.t < 1) { q = ne.q; teilK = ne.k; } }
    for (let runde = 0; runde < 6; runde++) {
      let geaendert = false;
      const s = ersterSchnitt(G, G.P[pv], q, pv, zielV, teilK);
      if (s) {
        const e = G.E[s.k], da = Geo.abstand(s.p, G.P[e.a]), db = Geo.abstand(s.p, G.P[e.b]);
        if (Math.min(da, db) <= INTERN.fangStart) { zielV = da <= db ? e.a : e.b; q = G.P[zielV]; teilK = -1; }
        else { zielV = -1; q = s.p; teilK = s.k; }
        geaendert = true;
      }
      const w = knotenAnStrecke(G, G.P[pv], q, pv, zielV, md);
      if (w) { zielV = w.v; q = G.P[zielV]; teilK = -1; geaendert = true; }
      if (zielV === pv) return null;
      if (zielV >= 0 && grad(G, zielV) >= maxArme) return null;
      if (!geaendert) break;
    }
    if (zielV < 0 && teilK < 0 && !imAussenrand(S, q)) return null;
    if (Geo.abstand(G.P[pv], q) < INTERN.minSegment) return null;
    if (zielV >= 0 && verbunden(G, pv, zielV)) return null;
    let v = zielV;
    if (v < 0) { v = knotenNeu(G, q); if (teilK >= 0) { if (G.E[teilK].art === ART.RAND) zu = true; kanteTeilen(G, teilK, v); } }
    else if (amRand(G, v)) zu = true;
    kanteNeu(G, pv, v, ART.NEU);
    return { v, zu };
  }

  /** Richtung von a nach b in Grad */
  const richtung = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
  /** Richtung des neuen Arms am Knoten pv relativ zur Herkunft ref (Grad, gegen den Uhrzeigersinn im Rechensinn):
      ein Nachbar → 180° (geradeaus); sonst Winkelhalbierende der größten freien Lücke zwischen den Nachbarn (die Herkunft
      zählt als belegt); Lücke < 80° → null (kein Platz); Lücke ≥ 260° → Versatz 45°/90°/135°/… vom Lückenanfang (teiler). */
  function armRichtung(P, pv, ref, nb, teiler) {
    if (nb.length <= 1) return 180;
    const a0 = richtung(P[pv], P[ref]);
    const W = [0];
    for (const v of nb) { const w = ((richtung(P[pv], P[v]) - a0) % 360 + 360) % 360; if (w > 1e-9 && w < 360 - 1e-9) W.push(w); }
    W.sort((x, y) => x - y);
    let luecke = -1, anfang = 0;
    for (let i = 0; i < W.length; i++) {
      const g = (i + 1 < W.length ? W[i + 1] : 360) - W[i];
      if (g > luecke + 1e-9) { luecke = g; anfang = W[i]; }
    }
    if (luecke < INTERN.freiwinkel) return null;
    if (luecke >= 260) luecke = 90 + 90 * Math.floor(teiler * Math.ceil(luecke / 90));
    return anfang + luecke / 2;
  }

  /* ---------------------------------------------------------------- Chromosom: Instruktionsbaum */
  /** Gene eines Knotens wie im Original: Winkel = Next(RandomAngle) − RandomAngle/2 (ganze Grad), Länge = Next(MaxLength) + MinLength
      (ganze Meter), höchster Grad maxArme = Next(MaxArms − 1) + 2, teiler für sehr große Lücken */
  function gene(zufall, p) {
    const ra = Math.max(0, Math.round(p.zufallsWinkel)), ml = Math.max(1, Math.round(p.maxLaenge)), ma = Math.max(1, Math.round(p.maxArme));
    return { winkel: zufall.ganz(ra) - ra / 2, laenge: zufall.ganz(ml) + p.minLaenge, maxArme: zufall.ganz(ma - 1) + 2, teiler: zufall() };
  }
  /** Zufälliger Instruktionsbaum (Street Network Chromosome): je Knoten der Startstraßen eine Wurzel mit drei Arm-Plätzen;
      TreeDepth Ebenen breitenweise; jeder Knoten bekommt einen sicheren Platz und k − 1 weitere (k = Next(MaxArms − 1) + 1),
      ab Ebene 4 jeden weiteren nur mit Wahrscheinlichkeit (k + 1) / Ebene. → {wurzeln: [{kinder: [...]}], anzahl} */
  function baum(zufall, nWurzeln, p) {
    const ma = Math.max(1, Math.round(p.maxArme)), tiefe = Math.max(0, Math.round(p.baumtiefe));
    const wurzeln = [];
    let plaetze = [], anzahl = 0;
    for (let i = 0; i < nWurzeln; i++) { const w = { kinder: [] }; wurzeln.push(w); for (let j = 0; j < INTERN.wurzelArme; j++) plaetze.push(w); }
    for (let ebene = 1; ebene <= tiefe && plaetze.length; ebene++) {
      const naechste = [];
      for (const e of plaetze) {
        if (anzahl >= INTERN.maxKnoten) break;
        const c = Object.assign({ kinder: [] }, gene(zufall, p));
        e.kinder.push(c); anzahl++; naechste.push(c);
        const k = zufall.ganz(ma - 1) + 1;
        for (let x = 1; x < k; x++) if (ebene <= 3 || zufall() <= (k + 1) / ebene) naechste.push(c);
      }
      plaetze = naechste;
    }
    return { wurzeln, anzahl };
  }
  function kopiereKnoten(k) { return { winkel: k.winkel, laenge: k.laenge, maxArme: k.maxArme, teiler: k.teiler, kinder: k.kinder.map(kopiereKnoten) }; }
  const kopiereBaum = b => ({ wurzeln: b.wurzeln.map(w => ({ kinder: w.kinder.map(kopiereKnoten) })), anzahl: b.anzahl });
  /** Kreuzung: Wurzeln sind bei allen Chromosomen dieselben (Knoten der Startstraßen); je Arm-Platz einer Wurzel stammt der ganze
      Teilbaum zufällig vom einen oder anderen Elternteil (gleichmäßige Kreuzung über die Teilbäume). */
  function kreuze(a, b, zufall) {
    const wurzeln = a.wurzeln.map((wa, i) => {
      const wb = b.wurzeln[i] || wa, n = Math.max(wa.kinder.length, wb.kinder.length), kinder = [];
      for (let j = 0; j < n; j++) { const q = zufall() < 0.5 ? wa : wb, k = q.kinder[j] || (q === wa ? wb : wa).kinder[j]; if (k) kinder.push(kopiereKnoten(k)); }
      return { kinder };
    });
    return { wurzeln, anzahl: zaehle({ wurzeln }) };
  }
  function zaehle(b) { let n = 0; const st = b.wurzeln.slice(); while (st.length) { const k = st.pop(); for (const c of k.kinder) { n++; st.push(c); } } return n; }
  /** Mutation: jeder Knoten zieht mit Wahrscheinlichkeit pGen neue Gene (Winkel, Länge, Grad, Teiler) – in beide Richtungen */
  function mutiere(b, zufall, p, pGen = INTERN.pGen) {
    const st = b.wurzeln.slice();
    while (st.length) { const k = st.pop(); for (const c of k.kinder) { if (zufall() < pGen) Object.assign(c, gene(zufall, p)); st.push(c); } }
    return b;
  }

  /** ChromosomeMapper: Baum → Straßennetz. Die Knoten werden breitenweise abgearbeitet (alle Wurzeln je Ebene verschränkt);
      ein Knoten wächst vom Endpunkt seines Elternknotens aus, wenn dieser offen ist, dessen Grad unter maxArme liegt und eine
      Lücke ≥ 80° frei ist. → {segmente: [[a, b]], art: [ART], gesetzt: Zahl der gesetzten Arme} */
  function wachse(b, S, p, stat) {
    const { G, wurzeln } = grundnetz(S);
    const zaehl = k => { if (stat) stat[k] = (stat[k] || 0) + 1; };
    const md = Math.max(0, p.minAbstand), maxArme = Math.max(2, Math.round(p.maxArme));
    let ebene = b.wurzeln.map((w, i) => ({ k: w, e: null, pos: wurzeln[i] != null ? wurzeln[i] : -1, zu: false, wurzel: true }));
    let gesetzt = 0;
    while (ebene.length) {
      const naechste = [];
      for (const r of ebene) for (const c of r.k.kinder) naechste.push({ k: c, e: r, pos: -1, zu: false });
      for (const c of naechste) {
        const e = c.e;
        if (e.zu || e.pos < 0) { c.zu = true; zaehl("elternZu"); continue; }
        const pv = e.pos, cap = e.wurzel ? INTERN.wurzelMaxArme : e.k.maxArme;
        if (grad(G, pv) >= cap) { e.zu = c.zu = true; zaehl("grad"); continue; }
        const nb = nachbarn(G, pv);
        if (!nb.length) { c.zu = true; continue; }
        let ref = e.e && e.e.pos >= 0 && e.e.pos !== pv ? e.e.pos : nb[0];
        if (nb.length === 1) ref = nb[0];
        const dir = armRichtung(G.P, pv, ref, nb, c.k.teiler);
        if (dir === null) { c.zu = true; zaehl("luecke"); continue; }
        const th = (richtung(G.P[pv], G.P[ref]) + dir + c.k.winkel) * Math.PI / 180;
        const ziel = [G.P[pv][0] + c.k.laenge * Math.cos(th), G.P[pv][1] + c.k.laenge * Math.sin(th)];
        const a = arm(G, S, pv, ziel, md, maxArme);
        if (!a) { c.zu = true; zaehl("abgelehnt"); continue; }
        c.pos = a.v; c.zu = a.zu; gesetzt++;
      }
      ebene = naechste;
    }
    const segmente = [], art = [];
    for (const e of G.E) if (e.lebt) { segmente.push([G.P[e.a], G.P[e.b]]); art.push(e.art); }
    return { segmente, art, gesetzt };
  }

  /* ---------------------------------------------------------------- Fitness */
  /** Closeness je Segment wie die Legacy-Komponente 4. FWGetPaths: n / Σd (n erreichte Segmente, d kürzeste Wegkosten im gerichteten
      Segmentgraphen, ohne Radius); isolierte Segmente 0. Eigene schnelle Dijkstra-Suche über die Zustände von Geo.richtungsGraph
      (gleiches Ergebnis wie Geo.segmentClosenessVon(G, s).dcs2020). → Float64Array */
  function naehe(G, art = "closeness") {
    const z = G.z, n = G.n;
    let m = 0; for (let s = 0; s < z; s++) m += G.nb[s].length;
    const off = new Int32Array(z + 1), zi = new Int32Array(m), ko = new Float64Array(m);
    for (let s = 0, j = 0; s < z; s++) { off[s] = j; for (const x of G.nb[s]) { zi[j] = x[0]; ko[j] = x[1]; j++; } off[z] = j; }
    const dist = new Float64Array(z), fest = new Uint8Array(z), cc = new Float64Array(n);
    const hk = new Float64Array(m + 2 * z + 2), hv = new Int32Array(m + 2 * z + 2);
    for (let s = 0; s < n; s++) {
      dist.fill(Infinity); fest.fill(0);
      let hn = 0;
      const push = (k, v) => { let i = hn++; while (i > 0) { const q = (i - 1) >> 1; if (hk[q] <= k) break; hk[i] = hk[q]; hv[i] = hv[q]; i = q; } hk[i] = k; hv[i] = v; };
      const pop = () => {
        const top = hv[0], lk = hk[--hn], lv = hv[hn]; let i = 0;
        while (true) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && hk[c + 1] < hk[c]) c++; if (hk[c] >= lk) break; hk[i] = hk[c]; hv[i] = hv[c]; i = c; }
        hk[i] = lk; hv[i] = lv; return top;
      };
      dist[2 * s] = 0; dist[2 * s + 1] = 0; push(0, 2 * s); push(0, 2 * s + 1);
      while (hn > 0) {
        const v = pop(); if (fest[v]) continue; fest[v] = 1;
        const dv = dist[v];
        for (let j = off[v]; j < off[v + 1]; j++) { const w = zi[j], d = dv + ko[j]; if (d < dist[w]) { dist[w] = d; push(d, w); } }
      }
      let cnt = 0, sum = 0;
      for (let t = 0; t < n; t++) { if (t === s) continue; const d = Math.min(dist[2 * t], dist[2 * t + 1]); if (d < Infinity) { cnt++; sum += d; } }
      cc[s] = art === "weglaenge" ? (cnt > 0 ? sum / cnt : NaN) : (sum > 0 ? cnt / sum : 0);
    }
    return cc;
  }

  /** Fitness eines Straßennetzes (Set Fitness Values): f1 = (1/(L + 0.000001))·10000 (L = Gesamtlänge, Number-Ausdruck der .gh),
      f2 = größter Wert je Segment (C#_Normalize → maxValue) – je nach p.ziel2 der Closeness n / Σd oder der mittleren Weglänge
      Σd / n. Beide Ziele werden minimiert. cc enthält den Wert je Segment in der gewählten Lesart. → {N, cc, L, f1, f2} */
  function bewerte(segmente, p) {
    const N = Geo.netz(segmente, INTERN.glaetten);
    const G = Geo.richtungsGraph(N, { kL: p.kL, kW: p.kW, norm: "dcs2020" });
    const cc = naehe(G, p.ziel2 === "weglaenge" ? "weglaenge" : "closeness");
    let L = 0; for (const e of N.kanten) L += e.l;
    let f2 = 0; for (const c of cc) if (c > f2) f2 = c;             // NaN (isoliert) zählt nicht
    return { N, cc, L, f1: (1 / (L + 0.000001)) * 10000, f2 };
  }

  /* ---------------------------------------------------------------- Auswahl (zwei Ziele, minimiert) */
  /** a dominiert b: in keinem Ziel schlechter, in einem besser (beide Ziele klein = gut) */
  const dominiert = (a, b) => a.f1 <= b.f1 && a.f2 <= b.f2 && (a.f1 < b.f1 || a.f2 < b.f2);
  /** nicht dominierte Individuen (Pareto-Front), nach f1 sortiert */
  function front(liste) {
    const L = liste.slice().sort((a, b) => a.f1 - b.f1 || a.f2 - b.f2 || a.id - b.id), F = [];
    let best = Infinity;
    for (const x of L) if (x.f2 < best) { F.push(x); best = x.f2; }
    return F;
  }
  /** SPEA2 (Zitzler, Laumanns & Thiele 2001) als Auswahl aus der PISA-Sammlung: Stärke S = Zahl der Dominierten, Rohfitness R =
      Σ S der Dominierenden, Dichte D = 1 / (σ_k + 2) mit dem Abstand zum k-ten Nachbarn (k = ⌊√N⌋, Ziele auf 0…1 normiert),
      Fitness F = R + D. Archiv: alle mit F < 1 (nicht dominiert); zu wenige → mit den besten Dominierten auffüllen, zu viele →
      Ausdünnen (wiederholt das Individuum mit dem kleinsten Abstand zum nächsten Nachbarn entfernen). → {archiv (nach F sortiert), F} */
  function spea2(pop, mu) {
    const n = pop.length, F = new Map();
    if (!n) return { archiv: [], F };
    let a1 = Infinity, b1 = -Infinity, a2 = Infinity, b2 = -Infinity;
    for (const x of pop) { a1 = Math.min(a1, x.f1); b1 = Math.max(b1, x.f1); a2 = Math.min(a2, x.f2); b2 = Math.max(b2, x.f2); }
    const s1 = b1 - a1 > 1e-12 ? b1 - a1 : 1, s2 = b2 - a2 > 1e-12 ? b2 - a2 : 1;
    const X = pop.map(x => [(x.f1 - a1) / s1, (x.f2 - a2) / s2]);
    const D = Array.from({ length: n }, () => new Float64Array(n));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) D[i][j] = D[j][i] = Math.hypot(X[i][0] - X[j][0], X[i][1] - X[j][1]);
    const S = new Float64Array(n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && dominiert(pop[i], pop[j])) S[i]++;
    const k = Math.max(1, Math.min(n - 1, Math.floor(Math.sqrt(n))));
    const fit = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let R = 0; for (let j = 0; j < n; j++) if (i !== j && dominiert(pop[j], pop[i])) R += S[j];
      const d = Array.from(D[i]).filter((_, j) => j !== i).sort((x, y) => x - y), sk = n > 1 ? d[k - 1] : 0;
      fit[i] = R + 1 / (sk + 2);
      F.set(pop[i].id, fit[i]);
    }
    const ord = [...pop.keys()].sort((i, j) => fit[i] - fit[j] || pop[i].id - pop[j].id);
    let A = ord.filter(i => fit[i] < 1);
    if (A.length < mu) A = ord.slice(0, Math.min(mu, n));
    else {
      while (A.length > mu) {
        let weg = -1, bestL = null;
        for (const i of A) {
          const L = A.filter(j => j !== i).map(j => D[i][j]).sort((x, y) => x - y);
          if (!bestL || kleinerLex(L, bestL)) { bestL = L; weg = i; }
        }
        A = A.filter(i => i !== weg);
      }
    }
    A.sort((i, j) => fit[i] - fit[j] || pop[i].id - pop[j].id);
    return { archiv: A.map(i => pop[i]), F };
  }
  function kleinerLex(a, b) { for (let i = 0; i < a.length && i < b.length; i++) { if (a[i] < b[i] - 1e-12) return true; if (a[i] > b[i] + 1e-12) return false; } return false; }

  /** OffspringGenerator: Nachkommen aus den Eltern. Je Nachkomme: mit Random Generation ein ganz neues Zufallsnetz, sonst Eltern
      i und i + 1 der (bei Shuffle Chromosomes gemischten) Elternliste; mit Crossover Rate gekreuzt, sonst Kopie des ersten;
      danach mit Mutation Rate mutiert. → [{baum, herkunft}] */
  function nachkommen(eltern, p, zufall, nWurzeln) {
    const n = Math.max(0, Math.round(p.nachkommen)), E = eltern.slice(), out = [];
    if (p.mischen) for (let i = E.length - 1; i > 0; i--) { const j = zufall.ganz(i + 1); [E[i], E[j]] = [E[j], E[i]]; }
    for (let i = 0; i < n; i++) {
      if (!E.length || zufall() < p.neuAnteil) { out.push({ baum: baum(zufall, nWurzeln, p), herkunft: "neu" }); continue; }
      const a = E[i % E.length].baum, b = E[(i + 1) % E.length].baum;
      let kind, herkunft;
      if (zufall() < p.kreuzung) { kind = kreuze(a, b, zufall); herkunft = "kreuzung"; } else { kind = kopiereBaum(a); herkunft = "kopie"; }
      if (zufall() < p.mutation) { mutiere(kind, zufall, p); herkunft += "+mutation"; }
      out.push({ baum: kind, herkunft });
    }
    return out;
  }

  /* ---------------------------------------------------------------- Ablauf */
  /** ein Individuum: Baum → Netz → Fitness; Geometrie kompakt gespeichert (für Diagramm, Miniaturen, Anzeige) */
  function individuum(z, b, herkunft, gen, p) {
    const ph = wachse(b, z.S, p), B = bewerte(ph.segmente, p), N = B.N, m = N.kanten.length;
    const seg = new Float32Array(4 * m), cc = new Float32Array(m);
    N.kanten.forEach((e, k) => { const a = N.knoten[e.a], c = N.knoten[e.b]; seg.set([a[0], a[1], c[0], c[1]], 4 * k); cc[k] = B.cc[k]; });
    return { id: z.naechsteId++, g: gen, herkunft, baum: b, f1: B.f1, f2: B.f2, L: B.L, n: m, seg, cc, gesetzt: ph.gesetzt };
  }
  function nWurzeln(S) { return S.start.reduce((s, pl) => s + pl.length, 0); }

  /** Generation 0: ChromosomeFactory erzeugt Nr Parents Zufallsnetze; sie werden bewertet und bilden das erste Archiv */
  function generationNull(z, p) {
    z.alle = []; z.gen = 0; z.t = 0; z.wahlFest = false; z.naechsteId = 0;
    const mu = Math.max(1, Math.round(p.eltern));
    const start = [];
    for (let i = 0; i < mu; i++) start.push(individuum(z, baum(z.zufall, nWurzeln(z.S), p), "neu", 0, p));
    z.alle.push(...start);
    z.archiv = spea2(start, mu).archiv;
    nachAuswahl(z, p);
  }
  function nachAuswahl(z, p) {
    const im = new Set(z.archiv.map(x => x.id));
    for (const x of z.alle) if (!im.has(x.id)) x.baum = null;          // Gene nur für das Archiv aufheben
    z.front = front(z.alle);
    if (!z.wahlFest) z.wahl = variante(z, p.variante);
  }
  /** Archiv sortiert wie „Show Variant“ (Sort List nach der Summe f1 + f2, aufsteigend) */
  function sortiert(z) { return z.archiv.slice().sort((a, b) => (a.f1 + a.f2) - (b.f1 + b.f2) || a.id - b.id); }
  function variante(z, i) { const A = sortiert(z); return A.length ? A[Math.max(0, Math.min(A.length - 1, Math.round(i)))].id : -1; }
  const finde = (z, id) => z.alle.find(x => x.id === id) || null;

  /** neuer Zustand: Szene, Generation 0 */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, S: szene(), zufall, alle: [], archiv: [], front: [], gen: 0, wahl: -1, wahlFest: false, naechsteId: 0 };
    generationNull(z, p);
    return z;
  }
  /** Ein Schritt = eine Generation: Nachkommen erzeugen und bewerten, mit dem Archiv zusammen auswählen (SPEA2, Mu = Nr Parents) */
  function schritt(z, p) {
    if (!fertig(z, p)) {
      const mu = Math.max(1, Math.round(p.eltern)), g = z.gen + 1;
      const kinder = nachkommen(z.archiv, p, z.zufall, nWurzeln(z.S)).map(k => individuum(z, k.baum, k.herkunft, g, p));
      z.alle.push(...kinder);
      z.archiv = spea2(z.archiv.concat(kinder), mu).archiv;
      z.gen = g;
      nachAuswahl(z, p);
    }
    z.t++;
    return z;
  }
  const fertig = (z, p) => z.gen >= Math.round(p.generationen);

  /** Parameter ohne Neustart: GA-Parameter gelten ab der nächsten Generation; Show Variant wählt die Variante im Archiv */
  function aendere(z, p, id) {
    if (id === "variante") { z.wahlFest = false; z.wahl = variante(z, p.variante); }
  }
  /** Variante direkt wählen (Klick in Diagramm oder Leiste) */
  function waehle(z, id) { if (finde(z, id)) { z.wahl = id; z.wahlFest = true; } }
  /** Rand- oder Startstraßenpunkt verschieben (wie in Rhino) und die Optimierung neu beginnen */
  function verschiebe(z, p, griff, q) {
    const L = griff.art === "rand" ? z.S.rand : z.S.start[griff.i];
    const j = griff.art === "rand" ? griff.i : griff.j;
    L[j] = [Math.max(0, Math.min(z.S.b, q[0])), Math.max(0, Math.min(z.S.h, q[1]))];
    generationNull(z, p);
  }
  /** Griff (Randecke oder Stützpunkt einer Startstraße) im Umkreis r → {art, i, j} | null */
  function griffBei(z, q, r) {
    let best = null, bd = r;
    z.S.rand.forEach((x, i) => { const d = Geo.abstand(x, q); if (d <= bd) { bd = d; best = { art: "rand", i }; } });
    z.S.start.forEach((pl, i) => pl.forEach((x, j) => { const d = Geo.abstand(x, q); if (d <= bd) { bd = d; best = { art: "start", i, j }; } }));
    return best;
  }

  return { STANDARD, ZIELE2, INTERN, ART, szene, netzNeu, knotenNeu, kanteNeu, kanteTeilen, fuegeStreckeEin, grundnetz, imAussenrand, arm,
           richtung, armRichtung, gene, baum, kopiereBaum, kreuze, zaehle, mutiere, wachse, naehe, bewerte, dominiert, front, spea2,
           nachkommen, individuum, generationNull, sortiert, variante, finde, erzeuge, schritt, fertig, aendere, waehle, verschiebe, griffBei };
});
