/* Parametric Planning Catalogue · Straßenhierarchie aus gewichteter Betweenness (ohne DOM, in Node testbar)
   Herkunft: katalog/strassenhierarchie/modell.js (Grasshopper-Modul „Street Hierarchy“, DeCodingSpaces – Martin Dennemark,
   Parametric Planning Catalogue, MIT) und die vereinfachte Fassung aus katalog/wassernetz/modell.js.
   Verfahren: Segmente, die einem Stadteingang oder einem Point of Interest am nächsten liegen, bekommen ein Zusatzgewicht
   (Cluster „Custom edge weights“ der .gh-Datei); gewichtete Betweenness im Segmentgraphen; Logarithmus → Remap auf 0…1 →
   Consecutive Domains aus den Gewichten Tertiary/Secondary/Primary → Find Domain → Klasse 0 tertiary, 1 secondary, 2 primary.
   Definitionen abgeglichen mit der DeCodingSpaces-Toolbox (github.com/Bauhaus-InfAU/decoding-spaces-toolbox, GPL-3.0,
   docs/measures.md, docs/review-2026-11.md; kein Code übernommen).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const H = fabrik(node ? require("./geo.js") : wurzel.Geo);
  if (node) module.exports = H;
  else wurzel.Hierarchie = H;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo) {
  "use strict";

  /** Voreinstellungen der .gh-Datei „Street Hierarchy“: kL, kW Length/Angular Coefficient 0.5 · grund Grundgewicht 1 ·
      wEingang Weight City Entrance 1 · wPoi Weight Point Of Interest 0.5 (beide × Anzahl Segmente) ·
      wTertiaer/wSekundaer/wPrimaer 1 · faktor 1.001 (Multiplication vor Consecutive Domains) ·
      definition "dcs2020" (Legacy-Komponenten: Kosten kL·m/l_max + kW·θ/180°, Start- und Zielsegment zählen mit) oder
      "standard" (Toolbox v2: kL·m + kW·θ/90°, Start und Ziel zählen nicht) */
  const STANDARD = { definition: "dcs2020", kL: 0.5, kW: 0.5, grund: 1, wEingang: 1, wPoi: 0.5, wTertiaer: 1, wSekundaer: 1, wPrimaer: 1, faktor: 1.001 };
  const KLASSEN = ["tertiary", "secondary", "primary"];

  /** eine Liste des Clusters „Custom edge weights“: Grundgewicht für jedes Segment; das Gewicht ersetzt es an den Segmenten,
      die einem der Punkte am nächsten liegen (zwei Punkte am selben Segment: ersetzt, nicht summiert) */
  function clusterListe(N, punkte, gewicht, grund) {
    const w = new Float64Array(N.kanten.length).fill(grund);
    for (const q of punkte) { const k = Geo.naechstesSegment(N, q); if (k >= 0) w[k] = gewicht; }
    return w;
  }
  /** Ursprungs- und Zielgewichte je Segment wie die .gh-Datei: Summe der beiden Cluster-Listen (Stadteingänge mit
      wEingang × Anzahl Segmente, PoI mit wPoi × Anzahl Segmente) */
  function gewichte(N, poi, eingang, p) {
    const m = N.kanten.length, a = clusterListe(N, eingang, p.wEingang * m, p.grund), b = clusterListe(N, poi, p.wPoi * m, p.grund);
    for (let i = 0; i < m; i++) a[i] += b[i];
    return a;
  }
  /** vereinfachte Gewichte (wassernetz): 2 · grund an jedem Segment, Zusatzgewichte je Punkt addiert */
  function gewichteSumme(N, poi, eingang, p) {
    const m = N.kanten.length, w = new Float64Array(m).fill(2 * p.grund);
    for (const q of eingang) { const k = Geo.naechstesSegment(N, q); if (k >= 0) w[k] += p.wEingang * m; }
    for (const q of poi) { const k = Geo.naechstesSegment(N, q); if (k >= 0) w[k] += p.wPoi * m; }
    return w;
  }

  /** zählen Start- und Zielsegment eines Weges mit? (Legacy dcs2020: ja; Toolbox v2 „standard“: nein) */
  const mitEnden = p => p.definition !== "standard";
  /** gerichteter Segmentgraph nach den Parametern (Geo.richtungsGraph) */
  const graph = (N, p) => Geo.richtungsGraph(N, { kL: p.kL, kW: p.kW, norm: p.definition === "standard" ? "standard" : "dcs2020" });

  /** Beitrag eines Ursprungssegments s zur gewichteten Betweenness im gerichteten Segmentgraphen (Geo.segmentBetweennessVon);
      Ursprungsgewicht 0 → nichts, Ergebnis null */
  function betweennessVon(G, s, gQ, gZ, bc, enden = true) {
    if (gQ[s] === 0) return null;
    return Geo.segmentBetweennessVon(G, s, gQ, gZ, bc, { enden });
  }
  /** Betweenness über alle Ursprungssegmente (Ursprung = Ziel, gleiche Gewichte) */
  function betweenness(G, g, enden = true) {
    const bc = new Float64Array(G.n);
    for (let s = 0; s < G.n; s++) betweennessVon(G, s, g, g, bc, enden);
    return bc;
  }
  /** vereinfachte Betweenness auf dem ungerichteten Segmentgraphen (Geo.segmentGraph, wassernetz): Brandes je Start mit
      Geo.betweennessVon, dazu zählen Start und Ziel jedes erreichbaren Paares mit (g_s · g_t) */
  function betweennessEinfach(G, g) {
    const bc = new Float64Array(G.n);
    for (let s = 0; s < G.n; s++) {
      if (!g[s]) continue;
      const dist = Geo.betweennessVon(G.n, i => G.adj[i], s, g, g, bc);
      for (let t = 0; t < G.n; t++) if (t !== s && dist[t] !== Infinity) { bc[s] += g[s] * g[t]; bc[t] += g[s] * g[t]; }
    }
    return bc;
  }

  /** Grenzen der drei Bereiche: Merge(0, Tertiary, Secondary, Primary) / Summe × faktor → Consecutive Domains (additiv).
      → [[a0, b0], [a1, b1], [a2, b2]]; null, wenn alle Gewichte 0 sind */
  function bereiche(p) {
    const w = [p.wTertiaer, p.wSekundaer, p.wPrimaer], s = w[0] + w[1] + w[2];
    if (!(s > 0)) return null;
    const c = [0]; for (let i = 0; i < 3; i++) c.push(c[i] + w[i] / s * p.faktor);
    return [[c[0], c[1]], [c[1], c[2]], [c[2], c[3]]];
  }
  /** Find Domain (Strict = false): erster Bereich, der x einschließt, sonst −1 */
  function findeBereich(B, x) {
    if (!B) return -1;
    for (let i = 0; i < B.length; i++) if (x >= B[i][0] - 1e-12 && x <= B[i][1] + 1e-12) return i;
    return -1;
  }
  /** Logarithmus → Remap auf 0…1 → Find Domain. Betweenness 0 erhält den kleinsten Wert; ist noch alles 0, bleibt jede Klasse −1.
      → {wert: Float64Array (0…1), klasse: Int8Array (0 tertiary, 1 secondary, 2 primary, −1 keine)} */
  function klassifiziere(bc, p) {
    const n = bc.length, L = new Float64Array(n), wert = new Float64Array(n), klasse = new Int8Array(n).fill(-1);
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < n; i++) if (bc[i] > 0) { L[i] = Math.log(bc[i]); if (L[i] < mn) mn = L[i]; if (L[i] > mx) mx = L[i]; }
    if (mn === Infinity) return { wert, klasse };
    const B = bereiche(p), sp = mx - mn;
    for (let i = 0; i < n; i++) {
      wert[i] = bc[i] > 0 && sp > 1e-12 ? (L[i] - mn) / sp : 0;
      klasse[i] = findeBereich(B, wert[i]);
    }
    return { wert, klasse };
  }

  /** ganze Hierarchie auf einmal (gerichteter Segmentgraph wie strassenhierarchie) → {G, g, bc, wert, klasse} */
  function analyse(N, poi, eingang, param = {}) {
    const p = Object.assign({}, STANDARD, param), G = graph(N, p), g = gewichte(N, poi, eingang, p), bc = betweenness(G, g, mitEnden(p));
    return Object.assign({ G, g, bc }, klassifiziere(bc, p));
  }
  /** vereinfachte Hierarchie (ungerichteter Geo.segmentGraph, gewichteSumme, betweennessEinfach – Fassung des wassernetz)
      → {G, g, bc, wert, klasse} */
  function analyseEinfach(N, poi, eingang, param = {}) {
    const p = Object.assign({}, STANDARD, param), G = Geo.segmentGraph(N, p.kL, p.kW), g = gewichteSumme(N, poi, eingang, p), bc = betweennessEinfach(G, g);
    return Object.assign({ G, g, bc }, klassifiziere(bc, p));
  }

  return { STANDARD, KLASSEN, clusterListe, gewichte, gewichteSumme, mitEnden, graph, betweennessVon, betweenness, betweennessEinfach,
           bereiche, findeBereich, klassifiziere, analyse, analyseEinfach };
});
