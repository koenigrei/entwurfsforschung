/* Verkehrsaufkommen · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 343_Verkehrsaufkommen („Verkersmodell“ / „traffic rhythms“, Version 1.0 vom 07.01.2007; Projekt Verkehr_01.dpr,
   Units Main.pas, agent.pas, calc_AStern.pas, cell.pas, timeGraph.pas), Delphi, Reinhard König.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Ablauf wie die Knöpfe des Originals:
     load data (BmpInfoRead)   – Zellen 30 × 30 px: Arbeitsbevölkerung, Arbeitsplätze, Einzelhandel aus den drei Bildern
                                 (255 − Rot / Grün / Blau in der Zellmitte). Die Werte stehen unten in DATEN.
     AssignWorkers             – solange Arbeiter und Arbeitsplätze übrig sind: zufällige Wohnzelle, zufällige Arbeitsplatzzelle.
     agents create             – 42 Verkehrsknoten an zufälligen Orten ordnen sich (Count · 5 Durchläufe von NeigborCheck/Anlagern):
                                 Halt im connect distance (130), Ausweichen unter connect − repel distance (40); Kanten = Knoten näher als 130.
     CellsNearNode             – jede Zelle gehört zum nächsten Knoten.
     workers path              – Abfahrtszeiten je Arbeiter RandG(8, 1,0) morgens und RandG(17, 1,0) abends (auf 0,1 h gerundet);
                                 Arbeitsweg = A* vom Knoten der Wohnzelle zum Knoten der Arbeitsplatzzelle.
     startTimer / execute      – je Schritt rückt die Uhr um 1/timeScale Stunden vor (6 → 10 min); wessen Abfahrtszeit in das Intervall fällt,
                                 fährt los (abends heim, morgens zur Arbeit); jeder Reisende rückt je Schritt einen Knoten weiter (travel).
                                 Die Belastung einer Kante zählt die Reisenden, die sie gerade befahren; Linienstärke 2 + ceil(Belastung / scale). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const BREITE = 640, HOEHE = 666, ZELLE = 30, HALB = 15;                       // Image_Cells 640 × 666, cell scale 30
  const SPALTEN = Math.floor(BREITE / ZELLE), ZEILEN = Math.floor(HOEHE / ZELLE); // floor → 21 × 22
  const RECHTS = SPALTEN * ZELLE, UNTEN = ZEILEN * ZELLE;                      // leftBorder, bottomBorder (Grenzen der Knoten)
  /** Zellwerte 21 × 22 (Zeilen von oben), abgelesen aus pictures/arbeiter.bmp (255 − Rot), arbeitsstaetten.bmp (255 − Grün),
      verkaufsflaechen.bmp (255 − Blau) an den Zellmitten (15 + 30 · k) – so wie BmpInfoRead sie liest. */
const DATEN = {
    arbeiter: [
      77,77,83,106,121,123,121,128,133,136,135,130,119,102,88,81,78,78,76,76,77,
      77,84,121,157,168,170,171,170,170,170,167,163,154,145,138,126,106,87,75,64,74,
      79,110,163,175,174,174,174,175,175,175,175,175,175,173,168,156,141,128,100,76,74,
      80,121,168,175,174,172,168,164,158,159,163,165,166,169,174,175,162,135,125,103,79,
      84,120,147,155,140,112,96,89,92,98,109,130,142,143,149,160,172,148,123,130,94,
      99,135,138,120,92,84,81,78,77,77,78,95,136,138,139,141,152,147,138,135,120,
      120,138,129,102,116,127,115,84,76,77,75,75,108,136,138,138,130,117,138,138,135,
      130,138,119,131,138,138,137,102,78,75,48,19,65,91,105,105,87,91,133,138,135,
      135,136,120,138,138,138,138,120,55,16,0,0,0,29,73,78,75,83,122,139,133,
      137,135,121,138,138,138,138,119,13,0,0,0,0,29,77,87,98,93,117,150,146,
      135,134,117,138,138,138,138,97,0,0,0,0,0,18,81,121,138,118,129,167,170,
      127,133,108,134,138,137,125,73,0,0,0,0,0,0,52,115,112,94,104,144,163,
      101,130,95,96,109,103,88,75,41,40,39,22,4,0,26,80,78,78,85,134,171,
      113,133,95,81,81,79,77,77,76,77,77,77,74,56,50,77,76,77,88,143,171,
      134,145,126,114,102,88,79,77,73,77,77,77,77,81,80,80,77,85,112,147,172,
      136,165,157,140,137,131,104,82,54,60,78,77,77,81,107,102,93,123,139,153,174,
      127,166,168,146,139,138,136,115,82,61,69,63,58,79,118,135,128,138,142,164,175,
      105,153,173,164,148,140,139,138,130,126,124,117,96,83,118,138,135,141,156,174,174,
      84,119,158,172,170,157,145,140,139,138,138,138,137,96,110,135,142,159,172,175,166,
      78,87,117,146,159,166,161,142,128,124,126,129,115,91,106,148,166,173,174,166,148,
      77,78,82,100,124,139,141,139,135,129,123,119,119,124,133,150,169,174,165,147,139,
      77,77,77,78,85,100,120,132,137,138,138,138,138,138,138,136,135,135,132,128,126
    ],
    arbeitsplaetze: [
      160,160,153,121,100,97,100,89,82,76,79,87,102,126,146,155,159,159,161,161,160,
      160,151,100,46,29,24,23,24,24,24,30,35,51,65,74,92,121,147,163,176,164,
      158,115,35,17,18,18,18,17,17,17,17,17,17,21,29,47,69,89,128,161,164,
      156,100,29,17,18,22,29,33,43,42,35,32,31,25,18,17,37,79,95,125,158,
      151,101,60,48,71,113,135,145,141,132,116,87,68,67,58,40,22,59,97,87,137,
      129,79,74,101,141,151,155,159,160,160,159,136,76,74,73,69,53,60,74,79,101,
      101,74,88,126,107,90,108,151,161,160,163,163,117,76,74,74,87,106,74,74,79,
      87,74,102,86,74,74,75,126,159,163,194,225,175,142,122,122,147,142,82,74,79,
      79,76,101,74,74,74,74,101,187,227,248,254,246,214,165,159,163,153,98,73,82,
      75,79,100,74,74,74,74,102,230,254,255,255,254,214,160,147,132,140,106,56,61,
      79,80,106,74,74,74,74,134,248,255,255,255,254,226,155,100,74,103,88,30,24,
      90,82,117,80,74,75,95,165,248,254,254,255,255,249,190,108,113,137,123,66,35,
      127,87,136,135,116,125,146,163,203,204,205,222,237,248,218,156,159,159,149,80,23,
      110,82,136,155,155,158,160,160,161,160,160,160,164,186,192,160,161,160,146,67,23,
      80,65,92,109,126,146,158,160,165,160,160,160,160,155,156,156,160,149,113,60,22,
      76,32,46,71,75,86,123,154,188,181,159,160,160,155,120,126,140,97,73,52,18,
      90,31,29,61,73,74,76,108,154,180,170,177,183,158,103,79,89,74,68,33,17,
      122,52,21,33,59,71,73,74,87,92,96,106,135,153,103,74,79,69,47,18,18,
      151,102,43,22,24,46,65,71,73,74,74,74,75,135,115,79,68,42,22,17,31,
      159,147,106,61,42,31,39,68,89,96,92,88,108,142,121,59,31,21,18,31,59,
      160,159,154,128,96,73,69,73,79,88,97,102,102,96,82,56,25,18,32,60,73,
      160,160,160,159,149,128,101,83,75,74,74,74,74,74,74,76,79,79,83,89,92
    ],
    einzelhandel: [
      10,19,28,38,47,55,63,69,74,77,78,77,73,68,62,55,46,36,27,18,9,
      19,29,40,51,62,72,81,88,94,97,98,96,93,87,80,71,61,50,39,28,18,
      29,41,53,66,78,89,99,108,114,117,118,117,113,106,98,88,76,65,51,39,27,
      38,52,65,81,93,107,118,128,134,139,139,138,133,126,116,105,92,78,64,50,36,
      47,63,79,94,110,123,136,146,155,159,160,158,153,145,134,121,107,92,76,60,45,
      55,73,89,106,124,139,153,165,174,179,181,178,172,163,151,137,122,104,87,71,53,
      64,82,100,118,136,153,168,181,191,198,199,197,190,180,167,151,133,116,97,78,60,
      70,89,108,128,146,165,182,196,207,214,217,214,206,194,180,163,145,125,105,86,67,
      74,94,114,135,155,174,192,207,221,229,232,228,219,206,189,172,152,132,111,92,71,
      77,97,118,139,160,180,198,215,230,241,246,240,228,213,196,176,157,137,116,94,75,
      78,98,119,141,161,181,201,218,233,245,255,244,231,215,198,179,158,137,117,95,76,
      77,97,118,139,160,179,198,214,229,240,245,239,228,213,196,177,157,136,115,95,74,
      74,93,114,134,154,173,191,207,219,228,232,228,218,205,189,171,151,131,111,91,71,
      70,88,107,127,146,164,181,195,206,213,216,213,205,193,178,162,144,124,105,85,66,
      63,80,99,117,136,152,167,180,190,196,199,196,189,178,166,150,133,115,97,79,60,
      55,72,89,106,122,138,152,163,172,178,179,177,171,162,150,136,121,104,87,70,53,
      46,61,77,93,108,122,135,145,153,158,160,157,152,144,134,120,106,91,75,59,45,
      37,51,65,79,93,105,116,126,132,137,138,136,132,125,115,104,91,77,63,49,35,
      28,39,52,65,77,88,98,106,112,117,117,116,112,106,97,86,76,64,50,38,26,
      18,28,40,50,61,71,79,87,92,95,96,95,92,86,79,70,59,49,38,27,17,
      10,18,27,37,46,54,62,68,72,75,76,75,72,67,60,53,45,36,27,17,9,
      2,9,16,24,31,38,45,50,54,57,57,56,53,50,44,37,31,23,15,8,1
    ],
  };

  /** Voreinstellungen aus Main.dfm */
  const STANDARD = { knoten: 41, conDist: 130, repDist: 40, std: 1.0, morgens: 8, abends: 17, timeScale: 6, tScale: 10, zeige: "alle", linien: false, diagramm: true };

  function rundeD(x) {
    const f = Math.floor(x), d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  }
  const dist = (ax, ay, bx, by) => rundeD(Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by)));
  const zx = k => HALB + (k % SPALTEN) * ZELLE, zy = k => HALB + Math.floor(k / SPALTEN) * ZELLE;   // Mitte der Zelle k

  /** RandG(mittel, std) – normalverteilt (Box-Muller mit der übergebenen Zufallsfunktion) */
  function randG(zufall, m, s) {
    let u = 0; while (u === 0) u = zufall();
    return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * zufall());
  }
  const roundTo1 = v => Math.round(v * 10) / 10;                                  // RoundTo(…, −1)

  /** AssignWorkers: liefert je Arbeiter Wohnzelle und Arbeitsplatzzelle (−1 = kein Arbeitsplatz frei) */
  function verteile(zufall) {
    const heim = [], rest = DATEN.arbeiter.slice(), frei = DATEN.arbeitsplaetze.slice();
    const erster = new Int32Array(SPALTEN * ZEILEN);                               // Index des ersten Arbeiters je Zelle
    for (let k = 0; k < rest.length; k++) { erster[k] = heim.length; for (let m = 0; m < rest[k]; m++) heim.push(k); }
    const arbeit = new Int16Array(heim.length).fill(-1);
    const W = [], P = [];
    for (let k = 0; k < rest.length; k++) { if (rest[k] > 0) W.push(k); if (frei[k] > 0) P.push(k); }
    while (W.length && P.length) {
      const a = zufall.ganz(W.length), b = zufall.ganz(P.length), o = W[a], d = P[b];
      arbeit[erster[o] + rest[o] - 1] = d;                                         // Worker[tmpInfo[0] − 1]
      rest[o]--; frei[d]--;
      if (rest[o] === 0) { W[a] = W[W.length - 1]; W.pop(); }
      if (frei[d] === 0) { P[b] = P[P.length - 1]; P.pop(); }
    }
    return { heim: Int16Array.from(heim), arbeit };
  }

  /** agents create: Knoten anlegen und Count · 5 mal ordnen (Agents_Organise) */
  function graph(z, p) {
    const n = p.knoten + 1, r = z.zufall;                                          // For I := 0 To E_nodeNumber → 42 Knoten
    const x = [], y = [], sx = [], sy = [];
    for (let i = 0; i < n; i++) { x.push(r.ganz(BREITE)); y.push(r.ganz(HOEHE)); sx.push(r.dreh()); sy.push(r.dreh()); }
    const ox = x.slice(), oy = y.slice(), nb = x.map(() => []);
    for (let it = 0; it <= n * 5; it++) {
      for (let j = 0; j < n; j++) {
        ox[j] = x[j]; oy[j] = y[j];
        let kurz = 1000, naechster = -1; const L = [];
        for (let k = 0; k < n; k++) {
          if (k === j) continue;
          const d = dist(x[k], y[k], x[j], y[j]);
          if (d < p.conDist) L.push(k);
          if (d < kurz) { kurz = d; naechster = k; }
        }
        nb[j] = L;
        if (kurz < p.conDist) for (let q = 0; q < L.length; q++) {                 // Anlagern
          sx[j] = 0; sy[j] = 0;
          if (kurz < p.conDist - p.repDist) { sx[j] = r.dreh() + (x[j] - x[naechster]) / 20; sy[j] = r.dreh() + (y[j] - y[naechster]) / 20; }
        }
        x[j] += rundeD(sx[j]); y[j] += rundeD(sy[j]);
        x[j] = Math.max(0, Math.min(RECHTS, x[j])); y[j] = Math.max(0, Math.min(UNTEN, y[j]));   // „torus“: an den Rand klemmen
      }
    }
    z.n = n; z.x = x; z.y = y; z.ox = ox; z.oy = oy; z.nb = nb;
  }

  /** CellsNearNode */
  function naechsteKnoten(z) {
    const nah = new Int16Array(SPALTEN * ZEILEN);
    for (let k = 0; k < nah.length; k++) {
      let best = 999999;
      for (let m = 0; m < z.n; m++) { const d = dist(zx(k), zy(k), z.x[m], z.y[m]); if (d < best) { best = d; nah[k] = m; } }
    }
    return nah;
  }

  /** findPath (calc_AStern): Knotenfolge von s nach ziel (beide eingeschlossen) oder [] */
  function findePfad(z, s, ziel) {
    const n = z.n, F = new Float64Array(n), G = new Float64Array(n), H = new Float64Array(n), vorg = new Int32Array(n).fill(-1);
    const zu = new Uint8Array(n), inOffen = new Uint8Array(n), offen = [s];
    inOffen[s] = 1;
    const calcF = (v, me) => { G[me] = G[v] + dist(z.x[v], z.y[v], z.x[me], z.y[me]); H[me] = dist(z.x[ziel], z.y[ziel], z.x[me], z.y[me]); F[me] = G[me] + H[me]; };
    let gefunden = false;
    while (offen.length && !gefunden) {
      const expl = offen[offen.length - 1];
      zu[expl] = 1;
      for (const c of z.nb[expl]) {
        if (zu[c]) continue;
        if (!inOffen[c]) { calcF(expl, c); vorg[c] = expl; offen.push(c); inOffen[c] = 1; if (c === ziel) gefunden = true; }
        else { const aG = G[c], aH = H[c], aF = F[c]; calcF(expl, c); if (aG < G[c]) { G[c] = aG; H[c] = aH; F[c] = aF; } else vorg[c] = expl; }
      }
      offen.sort((a, b) => F[b] - F[a]);
      offen.splice(offen.indexOf(expl), 1); inOffen[expl] = 0;
    }
    if (!gefunden) return [];
    const p = [ziel]; let k = vorg[ziel];
    while (k >= 0 && p.length <= n) { p.push(k); if (k === s) break; k = vorg[k]; }
    return p.reverse();
  }

  /** Uhrzeit nach Schritt t: SimpleRoundTo((steps mod (24 · timeScale)) / timeScale, −2) */
  const uhrzeit = (t, ts) => Math.round((t % (24 * ts)) / ts * 100) / 100;

  /** Schritt des Tages (1 … 24 · timeScale), in dessen Intervall (vorige Zeit + 0,01 … Zeit] eine Abfahrtszeit fällt; −1 = nie */
  function abfahrtsSchritt(v, ts) {
    const tag = 24 * ts;
    for (let s = 1; s < tag; s++) { const a = uhrzeit(s - 1, ts) + 0.01, b = uhrzeit(s, ts); if (v >= a - 1e-9 && v <= b + 1e-9) return s; }
    return -1;
  }

  /** Abfahrten den Schritten des Tages zuordnen (abends zuerst geprüft, wie in execute) */
  function fahrplan(z, p) {
    const ts = p.timeScale, tag = 24 * ts, liste = Array.from({ length: tag }, () => []);
    const cache = new Map(), s = v => { if (!cache.has(v)) cache.set(v, abfahrtsSchritt(v, ts)); return cache.get(v); };
    for (let w = 0; w < z.W; w++) {
      if (!z.route[w]) continue;
      const se = s(z.abendZeit[w]), sm = s(z.morgenZeit[w]);
      if (se > 0) liste[se].push(-1 - w);                                         // negativ = Heimweg
      if (sm > 0 && sm !== se) liste[sm].push(w);
    }
    z.fahrplan = liste; z.tag = tag;
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, zufall, breite: BREITE, hoehe: HOEHE, reisende: [], zeit: 0, unterwegs: 0, verlaufUnterwegs: [] };
    const v = verteile(zufall);
    z.heim = v.heim; z.arbeit = v.arbeit; z.W = v.heim.length;
    graph(z, p);
    z.nah = naechsteKnoten(z);
    z.belastung = new Int32Array(z.n * z.n);
    // workers path: Abfahrtszeiten und Arbeitswege
    z.morgenZeit = new Float32Array(z.W); z.abendZeit = new Float32Array(z.W);
    z.histogramm = new Float64Array(241);
    for (let w = 0; w < z.W; w++) {
      const m = roundTo1(randG(zufall, p.morgens, p.std)), e = roundTo1(randG(zufall, p.abends, p.std));
      z.morgenZeit[w] = m; z.abendZeit[w] = e;
      for (const t of [m, e]) { const i = Math.round(t * 10); if (i >= 0 && i <= 240) z.histogramm[i]++; }
    }
    const wege = new Map();
    z.route = new Array(z.W); z.pendler = 0;
    for (let w = 0; w < z.W; w++) {
      if (z.arbeit[w] < 0) continue;                                               // ohne Arbeitsplatz: keine Fahrten
      const a = z.nah[z.heim[w]], b = z.nah[z.arbeit[w]], k = a * z.n + b;
      if (!wege.has(k)) wege.set(k, a === b ? [] : findePfad(z, a, b));
      const r = wege.get(k);
      if (r.length > 1) { z.route[w] = r; z.pendler++; }
    }
    z.wege = wege;
    fahrplan(z, p);
    return z;
  }

  /** travel: jeder Reisende rückt einen Knoten weiter; Belastung der befahrenen Kante + 1, der vorigen − 1; Ankunft am letzten Knoten */
  function reise(z) {
    const n = z.n, b = z.belastung, weiter = [];
    for (const r of z.reisende) {
      const A = r.p[r.i], B = r.p[r.i + 1];
      b[B * n + A]++;                                                              // inc(BShape.Usage[idx(AShape)])
      if (r.i > 0) b[A * n + r.p[r.i - 1]]--;                                      // dec(AShape.Usage[vorgIdx])
      r.i++;
      if (r.i === r.p.length - 1) b[B * n + A]--;                                  // angekommen: letzte Kante wieder frei
      else weiter.push(r);
    }
    z.reisende = weiter;
  }

  /** execute: Uhr weiter, Abfahrten starten, reisen; erhöht z.t */
  function schritt(z, p) {
    z.t++;
    const s = z.t % z.tag;
    z.zeit = uhrzeit(z.t, p.timeScale);
    for (const c of z.fahrplan[s] || []) {
      const w = c < 0 ? -1 - c : c, r = z.route[w];
      z.reisende.push({ p: c < 0 ? r.slice().reverse() : r, i: 0 });              // abends heim (umgekehrt), morgens zur Arbeit
    }
    z.unterwegs = z.reisende.length;                                               // lbl_onRoad vor travel
    reise(z);
    z.verlaufUnterwegs[s] = z.unterwegs;
    return z;
  }

  /** Parameter ohne Neustart: timeScale ordnet die Abfahrten neu den Schritten zu */
  function aendere(z, p, id) { if (id === "timeScale") fahrplan(z, p); }

  /** Summen (Lbl_worker, Lbl_workPl, Lbl_retail) und größte Kantenbelastung */
  function summen() {
    const s = a => a.reduce((x, y) => x + y, 0);
    return { arbeiter: s(DATEN.arbeiter), plaetze: s(DATEN.arbeitsplaetze), handel: s(DATEN.einzelhandel) };
  }
  function maxBelastung(z) { let m = 0; for (let k = 0; k < z.belastung.length; k++) if (z.belastung[k] > m) m = z.belastung[k]; return m; }
  const linie = (u, tScale) => 2 + Math.ceil(u / tScale);                          // Pen.Width := 2 + ceil(Usage / tScale)

  return { STANDARD, DATEN, BREITE, HOEHE, ZELLE, SPALTEN, ZEILEN, RECHTS, UNTEN, rundeD, dist, zx, zy, randG, verteile, graph, naechsteKnoten,
           findePfad, uhrzeit, abfahrtsSchritt, fahrplan, erzeuge, reise, schritt, aendere, summen, maxBelastung, linie };
});
