/* Multiplikatoreffekt · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Forschungsprojekts „Evolving Configurational Properties – Simulating multiplier effects between land use and
   movement patterns“ aus dem DeCodingSpaces Lab (Bielik, König, Fuchkina, Schneider, Abdulmawla 2019, 12th Space Syntax Symposium,
   Paper #279; Grasshopper-Skripte „Evolution of configurational properties_simple/_full.gh“).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren (Paper Gl. 4–9, Skript „simple“ mit vier Clustern):
   Straßennetz → Segmentgraph (1. ProcessGeometry ohne Teilung, 2. BuildGraph mit Length Coefficient 0 und Angular Coefficient 1 =
   winkelbasiert, Geo.richtungsGraph). Je Iteration i (Loop Start … Loop End):
     MPC_i = gewichtete Zentralität mit den Nutzungen w als Ursprungs-/Zielgewichten (4. FWGetPaths, Ausgang CW oder BW),
             Closeness Gl. 4: Σ w_k / Σ d_ik · w_k; Betweenness Gl. 5: Σ n_jk[i] / n_jk · w_j · w_k; Radius R600 m oder Rn.
     LPC:    w_neu = MPC · Σw / ΣMPC (Cluster „Normalize (temp disruption)“: Summe der Nutzungen bleibt gleich), oder bei
             „Permanent disruption“ behalten die Disruptorsegmente d, die übrigen teilen sich Σw − n·d nach der Zentralität
             (Cluster „Normalize (permanent disruption)“).
   Anfangsgewichte aus dem Cluster „Custom OD weights“: k für jedes Segment, d für das Segment, das einem Disruptor am nächsten liegt.
   Maße (Paper Gl. 14–16): Me = R²(MPC_1, MPC_i), Ch = 1 − R²(MPC_{i−1}, MPC_i), Ne = R²(MPC(gleich belastet)_1, MPC_i).
   Ein Schritt = eine Rückkopplungsrunde (MPC → LPC). Abgleich der Netzmaße mit der DeCodingSpaces-Toolbox (GPL-3.0,
   docs/measures.md, docs/review-2026-11.md); kein Code übernommen. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen des Skripts „simple“ (Schieberegler Wert [Bereich], Wertelisten):
      mass: Werteliste „Closennes“ (Betweenness | Closennes) · radius: „Pedestrian radius R600m“ (Global radius N | R600m)
      modus: „update origins & destinations“ (update destinations | update origins & destinations)
      stoerung: „Temporal disruption“ (Temporal | Permanent disruption)
      k: „k (konstant weight)“ 1 [0..10] · d: „d (disruptor force)“ 300 [0..1000000] · iterationen: Loop Start Repeat 29 [0..100]
      darstellung: „display log values“ (display original values | display log values) · werte: „value preview Off“
      closeness: "gl4" = Paper Gl. 4 (Standard), "legacy" = Legacy-Komponente 2019 ((Σw)^2,5 / Σd·w mit Radius, siehe closenessVon)
      verlauf: Browse History (0 = laufende Iteration) · definition: "dcs2020" = Legacy-Komponenten (Winkel θ/180°, Start- und
      Zielsegment zählen bei der Betweenness mit), "standard" = DeCodingSpaces-Toolbox v2 (θ/90°, Start und Ziel zählen nicht) */
  const STANDARD = { mass: "closeness", closeness: "gl4", radius: "r600", modus: "beide", stoerung: "temporaer", k: 1, d: 300, iterationen: 29,
                     definition: "dcs2020", zeige: "mpc", darstellung: "log", verlauf: 0, werte: false, diagramme: true };
  /** Radius der Werteliste in m (Global radius N = unbegrenzt) */
  const RADIUS = { r600: 600, rn: Infinity };
  /** Verschiebung im Logarithmus des Clusters zur Darstellung (Number Slider 3 [0..10]) */
  const LOG_VERSATZ = 3;
  /** Lage der beiden Disruptoren der .gh-Datei (Parameter „2d Closeness R600“, zwei Punkte) – hier als Anteil der Planfläche */
  const DISRUPTOREN = [[0.24, 0.3], [0.76, 0.7]];

  /* ---------------------------------------------------------------- Straßennetz */

  /** Beispielnetz: verzogenes Raster mit zusammengelegten Blöcken (Szenen.stadt) und Diagonalen, die vom Zentrum aus über
      mehrere Zellen nach außen laufen (wie Ausfallstraßen einer gewachsenen Stadt). Diagonalen verbinden Rasterknoten und
      kreuzen nur das Innere der Zellen, die sie queren; jede Zelle höchstens einmal. → {segmente, b, h, szene} */
  function strassennetz(zufall, opt = {}) {
    const o = Object.assign({ b: 1500, h: 1050, nx: 17, ny: 12, rand: 20, jitter: 0.32, zusammen: 0.3, diagonalen: 3, randJitter: 0.3,
                              gebaeude: false, kirche: false, platz: false }, opt);
    const szene = Szenen.stadt(zufall, o);
    const K = szene.knoten, id = (i, j) => j * o.nx + i, segmente = szene.strassen.slice();
    // Randknoten (außer den Ecken) ein Stück nach innen rücken: ein schnurgerader Rahmen wäre im Winkelgraphen eine Ringstraße
    // ohne Abbiegekosten, auf der sich jede globale Betweenness sammelt. Die Segmente teilen die Knotenarrays, daher in place.
    const dx = (o.b - 2 * o.rand) / (o.nx - 1), dy = (o.h - 2 * o.rand) / (o.ny - 1), rein = o.randJitter;
    for (let j = 0; j < o.ny; j++) for (let i = 0; i < o.nx; i++) {
      const ecke = (i === 0 || i === o.nx - 1) && (j === 0 || j === o.ny - 1); if (ecke) continue;
      const q = K[id(i, j)], u = zufall() * rein;
      if (i === 0) q[0] += u * dx; else if (i === o.nx - 1) q[0] -= u * dx;
      else if (j === 0) q[1] += u * dy; else if (j === o.ny - 1) q[1] -= u * dy;
    }
    const belegt = new Set();
    const richtungen = [[1, 1], [-1, -1], [1, -1], [-1, 1]];
    for (let a = richtungen.length - 1; a > 0; a--) { const b = Math.floor(zufall() * (a + 1)); [richtungen[a], richtungen[b]] = [richtungen[b], richtungen[a]]; }
    const ci = Math.floor(o.nx / 2), cj = Math.floor(o.ny / 2);
    for (const [di, dj] of richtungen.slice(0, Math.max(0, Math.min(4, o.diagonalen)))) {
      let i = ci, j = cj;
      while (i + di >= 0 && i + di < o.nx && j + dj >= 0 && j + dj < o.ny) {
        const zelle = Math.min(i, i + di) + "," + Math.min(j, j + dj);
        if (belegt.has(zelle)) break;
        belegt.add(zelle);
        segmente.push([K[id(i, j)], K[id(i + di, j + dj)]]);
        i += di; j += dj;
      }
    }
    return { segmente, b: o.b, h: o.h, szene };
  }

  /* ---------------------------------------------------------------- Netzmaße mit Radius */

  /** Kürzeste Wege im gerichteten Segmentgraphen vom Segment s aus, Radius r in m (metrische Länge Mitte zu Mitte; Rangfolge nach
      Kosten, dann Schritten). Ein Schritt, der die Länge über r brächte, wird nicht gegangen (Radius beschneidet die Suche,
      measures.md §3). r = Infinity: global (Rn). Steht in ../_gemeinsam/geo.js (Geo.zustandsSuche mit opt.radius). */
  const suche = (G, s, r = Infinity) => Geo.zustandsSuche(G, s, { radius: r });

  /** Exponent des Zählers der Legacy-Closeness mit Radius (review-2026-11.md: „n/Σd … with a radius set it silently becomes n^2.5/Σd“) */
  const LEGACY_EXPONENT = 2.5;

  /** Gewichtete Closeness des Segments s über alle im Radius erreichten Segmente k ≠ s, d = Winkelkosten des kürzesten Weges.
      legacy = false (Paper Gl. 4): Σ w_k / Σ d_sk · w_k.
      legacy = true (Legacy-Komponente 2019 mit gesetztem Radius): (Σ w_k)^2,5 / Σ d_sk · w_k. Annahme für die gewichtete Fassung:
      wie in Gl. 4 tritt die gewichtete Anzahl Σ w_k an die Stelle der Anzahl n der ungewichteten Legacy-Formel n^2,5/Σd.
      Ohne erreichbares Gewicht oder ohne messbaren Abstand (Σ d·w = 0) → 0. */
  function closenessVon(G, R, w, legacy = false) {
    const A = Geo.segmentAbstaende(G, R).kosten;
    let zaehler = 0, nenner = 0;
    for (let k = 0; k < G.n; k++) {
      if (k === R.s || A[k] === Infinity) continue;
      const wk = w ? w[k] : 1; zaehler += wk; nenner += A[k] * wk;
    }
    if (!(nenner > 0)) return 0;
    return (legacy ? Math.pow(zaehler, LEGACY_EXPONENT) : zaehler) / nenner;
  }

  /** Beitrag des Ursprungssegments s zur gewichteten Betweenness (Paper Gl. 5) über die Suche R: jedes Paar (s, t), t im Radius,
      zählt w_s · w_t, aufgeteilt auf die gleichrangig kürzesten Wege (Brandes, über die Fahrtrichtungen). enden = true (Legacy):
      Start- und Zielsegment zählen mit (review-2026-11.md: „both endpoints count“). Addiert in bc. Steht in ../_gemeinsam/geo.js
      (Geo.segmentBetweennessAus). */
  function betweennessVon(G, R, gQ, gZ, bc, enden) { Geo.segmentBetweennessAus(G, R, gQ, gZ, bc, { enden }); }

  /** Bewegungspotenzial MPC je Segment (4. FWGetPaths, Stream Filter CW/BW): gQ Ursprungs-, gZ Zielgewichte, p.mass, p.radius,
      p.definition, p.closeness ("gl4" | "legacy"). Closeness nutzt die Zielgewichte (Gl. 4 enthält kein Ursprungsgewicht). → Float64Array */
  function bewegungspotenzial(G, gQ, gZ, p) {
    const r = RADIUS[p.radius] ?? Infinity, n = G.n, M = new Float64Array(n);
    if (p.mass === "betweenness") {
      const enden = p.definition !== "standard";
      for (let s = 0; s < n; s++) { if (gQ && gQ[s] === 0) continue; betweennessVon(G, suche(G, s, r), gQ, gZ, M, enden); }
    } else {
      const legacy = p.closeness === "legacy" && r < Infinity;      // ohne Radius ist auch die Legacy-Formel n/Σd = Gl. 4
      for (let s = 0; s < n; s++) M[s] = closenessVon(G, suche(G, s, r), gZ, legacy);
    }
    return M;
  }

  /* ---------------------------------------------------------------- Nutzungen (Cluster der .gh-Datei) */

  /** Cluster „Custom OD weights“ (C#-Skript): k für jedes Segment, d für die Segmente, die einem Disruptor am nächsten liegen */
  function anfangsGewichte(n, dSeg, k, d) {
    const w = new Float64Array(n).fill(k);
    for (const s of dSeg) if (s >= 0 && s < n) w[s] = d;
    return w;
  }
  const summe = a => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };

  /** Cluster „Normalize (temp disruption)“ (LPC, Paper Gl. 7): w_neu = MPC · Σw / ΣMPC. ΣMPC = 0 → Nutzungen bleiben. */
  function normiereTemporaer(M, w) {
    const sm = summe(M), sw = summe(w), out = new Float64Array(M.length);
    if (!(sm > 0)) { out.set(w); return out; }
    const f = sw / sm;
    for (let i = 0; i < M.length; i++) out[i] = M[i] * f;
    return out;
  }
  /** Cluster „Normalize (permanent disruption)“: Disruptorsegmente behalten d, alle übrigen teilen sich Σw − n·d im Verhältnis
      ihrer Zentralität (Cull Index → Mass Addition → (Σw − d·n) / ΣMPC_rest → Multiplication → Replace Items) */
  function normiereDauerhaft(M, w, dSeg, d) {
    const n = M.length, D = new Set(dSeg.filter(s => s >= 0 && s < n)), out = new Float64Array(n);
    let sm = 0; for (let i = 0; i < n; i++) if (!D.has(i)) sm += M[i];
    const rest = summe(w) - d * D.size;
    for (let i = 0; i < n; i++) out[i] = D.has(i) ? d : sm > 0 ? M[i] * rest / sm : w[i];
    return out;
  }

  /** Darstellung „display log values“ (Cluster: ln(x + 3) − ln 3) */
  const logWert = x => Math.log(x + LOG_VERSATZ) - Math.log(LOG_VERSATZ);

  /** Bestimmtheitsmaß R² der linearen Regression y ~ x (= quadrierte Korrelation; R-Skript „lm(df[,1] ~ df[,2])“ der Vollversion).
      Keine Streuung in x oder y → NaN */
  function r2(x, y) {
    const n = Math.min(x.length, y.length); if (n < 2) return NaN;
    let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; } mx /= n; my /= n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
    if (!(sxx > 1e-300) || !(syy > 1e-300)) return NaN;
    return Math.min(1, sxy * sxy / (sxx * syy));
  }

  /* ---------------------------------------------------------------- Zustand und Ablauf */

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const S = strassennetz(zufall);
    const z = { t: 0, S, b: S.b, h: S.h, disruptoren: DISRUPTOREN.map(([fx, fy]) => [fx * S.b, fy * S.h]) };
    z.N = Geo.netz(S.segmente, 0.5);
    baueGraph(z, p);
    return z;
  }
  /** 2. BuildGraph: Length Coefficient 0, Angular Coefficient 1 */
  function baueGraph(z, p) {
    z.G = Geo.richtungsGraph(z.N, { kL: 0, kW: 1, norm: p.definition === "standard" ? "standard" : "dcs2020" });
    z.eins = new Float64Array(z.G.n).fill(1);
    neueReferenz(z, p);
  }
  /** Bewegungspotenzial des gleich belasteten Netzes (alle Gewichte 1) als Bezug für Ne */
  function neueReferenz(z, p) {
    z.gleich = bewegungspotenzial(z.G, z.eins, z.eins, p);
    leere(z, p);
  }
  /** Rückkopplung von vorn: Anfangsgewichte aus k, d und Disruptoren; Verlauf leer */
  function leere(z, p) {
    z.dSeg = [...new Set(z.disruptoren.map(q => Geo.naechstesSegment(z.N, q)).filter(s => s >= 0))];
    z.w0 = anfangsGewichte(z.G.n, z.dSeg, p.k, p.d);
    z.gew = [z.w0];            // gew[i]: Nutzungen vor Iteration i + 1 (gew[0] = Anfang)
    z.mpc = [];                // mpc[i]: MPC der Iteration i + 1
    z.me = []; z.ch = []; z.ne = [];
    z.iter = 0; z.t = 0;
  }

  /** Eine Rückkopplungsrunde: MPC aus den aktuellen Nutzungen, dann LPC (neue Nutzungen). Nach der letzten Iteration nur t + 1. */
  function schritt(z, p) {
    if (z.iter < Math.round(p.iterationen)) {
      const w = z.gew[z.gew.length - 1];
      const gQ = p.modus === "ziele" ? z.eins : w;          // „update destinations“: Ursprünge bleiben 1 (Duplicate Data 1)
      const M = bewegungspotenzial(z.G, gQ, w, p);
      const neu = p.stoerung === "dauerhaft" ? normiereDauerhaft(M, w, z.dSeg, p.d) : normiereTemporaer(M, w);
      z.mpc.push(M); z.gew.push(neu); z.iter++;
      z.me.push(r2(z.mpc[0], M));
      z.ch.push(z.iter > 1 ? 1 - r2(z.mpc[z.iter - 2], M) : NaN);
      z.ne.push(r2(z.gleich, M));
    }
    z.t++;
    return z;
  }
  const fertig = (z, p) => z.iter >= Math.round(p.iterationen);

  /** Parameter ohne Neustart (die Disruptoren bleiben): Netzmaß, Radius, Definition → neue Referenz; Modus, Störung, k, d →
      Rückkopplung von vorn; Darstellung → nichts zu rechnen */
  function aendere(z, p, id) {
    if (id === "definition") baueGraph(z, p);
    else if (id === "mass" || id === "radius" || id === "closeness") neueReferenz(z, p);
    else if (id === "modus" || id === "stoerung" || id === "k" || id === "d") leere(z, p);
  }

  /** Disruptor im Umkreis r um q (Index) oder −1 */
  function disruptorBei(z, q, r) {
    let best = -1, bd = r;
    z.disruptoren.forEach((x, i) => { const d = Geo.abstand(x, q); if (d <= bd) { bd = d; best = i; } });
    return best;
  }
  /** Klick: Disruptor in der Nähe entfernen, sonst einen setzen; danach Rückkopplung von vorn */
  function schalteDisruptor(z, p, q, r) {
    const i = disruptorBei(z, q, r);
    if (i >= 0) z.disruptoren.splice(i, 1); else z.disruptoren.push([q[0], q[1]]);
    leere(z, p);
    return i < 0;
  }

  /** gezeigte Iteration (Browse History: verlauf 0 = laufende) */
  const gezeigt = (z, p) => p.verlauf > 0 ? Math.min(Math.round(p.verlauf), z.iter) : z.iter;

  /** Anteil der Nutzungen auf den stärksten q · 100 % der Segmente (Konzentration, „the winner takes it all“) */
  function konzentration(w, q = 0.1) {
    const a = Array.from(w).sort((x, y) => y - x), n = Math.max(1, Math.round(a.length * q)), s = summe(a);
    let top = 0; for (let i = 0; i < n; i++) top += a[i];
    return s > 0 ? top / s : NaN;
  }
  /** Kennwerte der Iteration i (1 … iter) bzw. des Anfangs (i = 0) */
  function kennwerte(z, i = z.iter) {
    const w = z.gew[i], sd = z.dSeg.reduce((s, k) => s + w[k], 0);
    return { iter: i, summe: summe(w), me: i ? z.me[i - 1] : NaN, ch: i ? z.ch[i - 1] : NaN, ne: i ? z.ne[i - 1] : NaN,
             top10: konzentration(w, 0.1), disruptorAnteil: summe(w) > 0 ? sd / summe(w) : NaN };
  }

  return { STANDARD, RADIUS, LOG_VERSATZ, LEGACY_EXPONENT, DISRUPTOREN, strassennetz, suche, closenessVon, betweennessVon, bewegungspotenzial,
           anfangsGewichte, summe, normiereTemporaer, normiereDauerhaft, logWert, r2,
           erzeuge, baueGraph, neueReferenz, leere, schritt, fertig, aendere, disruptorBei, schalteDisruptor, gezeigt, konzentration, kennwerte };
});
