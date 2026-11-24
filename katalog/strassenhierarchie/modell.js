/* Straßenhierarchie · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Street Hierarchy“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie die Schaltung der .gh-Datei: Straßensegmente (Network Smooth → Network to Segments → 1. ProcessGeometry)
   werden zum gerichteten Segmentgraphen (2. BuildGraph: je Segment zwei Fahrtrichtungen, Kosten aus Längen- und Winkelkoeffizient,
   Geo.richtungsGraph). Von jedem Segment zu jedem Segment werden die kürzesten Wege gesucht (3. ShortestFloydWarshal, 4. FWGetPaths)
   und gezählt, wie oft ein Segment auf ihnen liegt – gewichtet mit Ursprungs- und Zielgewichten (Betweenness Centrality weighted).
   Segmente, die einem Stadteingang oder einem Point of Interest am nächsten liegen, bekommen statt des Grundgewichts das Gewicht
   „Weight × Anzahl Segmente“ (Cluster „Custom edge weights“, dessen C#-Skript in der .gh-Datei steht).
   Definitionen abgeglichen mit der DeCodingSpaces-Toolbox (GPL-3.0, docs/measures.md, docs/review-2026-11.md; kein Code übernommen).
   Danach: Logarithmus → Remap auf 0…1 → Einteilung in drei Bereiche (Consecutive Domains aus den Gewichten für Tertiary,
   Secondary, Primary, Find Domain) → Tertiary / Secondary / Primary Street. Ein Schritt = ein Ursprungssegment. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen,
                   node ? require("../_gemeinsam/hierarchie.js") : wurzel.Hierarchie);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen, Hierarchie) {
  "use strict";

  /** Voreinstellungen der .gh-Datei (Schieberegler: Wert [Bereich]):
      fang: Snap threshold 2 [0..10] (Network Smooth) · kL, kW: Length/Angular Coefficient 0.5 [0..1] (2. BuildGraph)
      grund: Grundgewicht jedes Segments 1 [0..1], ganzzahlig (Number Slider in „Custom edge weights“)
      wEingang: Weight City Entrance 1 [0..1] · wPoi: Weight Point Of Interest 0.5 [0..1] (beide × Anzahl Segmente)
      wTertiaer, wSekundaer, wPrimaer: Weight Tertiary/Secondary/Primary Road 1 [0..1] · faktor: 1.001 [0..10] (Multiplication vor Consecutive Domains)
      definition: "dcs2020" = Legacy-Komponenten des Originals (Kosten kL·m/l_max + kW·θ/180°, Start- und Zielsegment zählen mit),
                  "standard" = DeCodingSpaces-Toolbox v2 (kL·m + kW·θ/90°, Start und Ziel zählen nicht; docs/measures.md) */
  const STANDARD = { definition: "dcs2020", fang: 2, kL: 0.5, kW: 0.5, grund: 1, wEingang: 1, wPoi: 0.5, wTertiaer: 1, wSekundaer: 1, wPrimaer: 1, faktor: 1.001,
                     darstellung: "hierarchie", gebaeude: true };
  const KLASSEN = Hierarchie.KLASSEN;

  /** Straßennetz der Beispielstadt: verzogenes Raster (Szenen.stadt) mit Rand, dazu vier Zufahrten vom Bildrand (je zwei Segmente).
      → {szene, segmente, zufahrten: [{rand: [x, y], segmente: [..]}], b, h} */
  function strassennetz(zufall, opt = {}) {
    const o = Object.assign({ b: 600, h: 420, nx: 11, ny: 8, jitter: 0.3, zusammen: 0.25, rand: 42, gebaeude: true, kirche: false, breite: [7, 13], tiefe: 10 }, opt);
    const szene = Szenen.stadt(zufall, o);
    const K = szene.knoten, id = (i, j) => j * o.nx + i;
    const zufahrt = (knoten, rand) => {
      const d = Geo.sub(knoten, rand), n = Geo.norm([-d[1], d[0]]);
      const mitte = Geo.add(Geo.lerp(rand, knoten, 0.5), Geo.mul(n, (zufall() - 0.5) * 0.5 * o.rand));
      return { rand, segmente: [[rand, mitte], [mitte, knoten]] };
    };
    const jl = 1 + Math.floor(zufall() * (o.ny - 2)), jr = 1 + Math.floor(zufall() * (o.ny - 2));
    const it = 1 + Math.floor(zufall() * (o.nx - 2)), ib = 1 + Math.floor(zufall() * (o.nx - 2));
    const kl = K[id(0, jl)], kr = K[id(o.nx - 1, jr)], kt = K[id(it, 0)], kb = K[id(ib, o.ny - 1)];
    const zufahrten = [
      zufahrt(kl, [0, kl[1] + (zufall() - 0.5) * o.rand]),
      zufahrt(kr, [o.b, kr[1] + (zufall() - 0.5) * o.rand]),
      zufahrt(kt, [kt[0] + (zufall() - 0.5) * o.rand, 0]),
      zufahrt(kb, [kb[0] + (zufall() - 0.5) * o.rand, o.h])
    ];
    const segmente = szene.strassen.concat(...zufahrten.map(z => z.segmente));
    return { szene, segmente, zufahrten, b: o.b, h: o.h };
  }

  /* Straßenhierarchie: Gewichte (Cluster „Custom edge weights“), gewichtete Betweenness (Geo.segmentBetweennessVon; mit Enden =
     Legacy: Start- und Zielsegment zählen mit – so werden die Zufahrten an den Stadteingängen wie im Katalogbild zu Hauptstraßen),
     Bereiche, Find Domain und Klassifizierung stehen in ../_gemeinsam/hierarchie.js */
  const naechstesSegment = Geo.naechstesSegment;
  const { clusterListe, gewichte, betweennessVon, mitEnden, bereiche, findeBereich, klassifiziere } = Hierarchie;

  /** Neuer Zustand: Beispielstadt, zwei Stadteingänge (am Anfang der Zufahrten links und rechts), ein PoI auf dem Platz in der Mitte */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const S = strassennetz(zufall);
    const mitte = S.szene.platz ? Geo.schwerpunkt(S.szene.platz) : [S.b / 2, S.h / 2];
    const z = { t: 0, S, szene: S.szene, b: S.b, h: S.h, poi: [mitte], eingang: [0, 1].map(i => Geo.lerp(S.zufahrten[i].rand, S.zufahrten[i].segmente[0][1], 0.2)) };
    baueNetz(z, p);
    return z;
  }

  /** Netz und dualen Graphen aufbauen (Snap threshold, Length/Angular Coefficient), Gewichte und Analyse zurücksetzen */
  function baueNetz(z, p) {
    z.N = Geo.netz(z.S.segmente, Math.max(0.01, p.fang));
    baueGraph(z, p);
  }
  function baueGraph(z, p) {
    z.G = Hierarchie.graph(z.N, p);
    neueGewichte(z, p);
  }
  function neueGewichte(z, p) {
    z.gQ = gewichte(z.N, z.poi, z.eingang, p);
    z.poiSeg = z.poi.map(q => naechstesSegment(z.N, q));
    z.eingangSeg = z.eingang.map(q => naechstesSegment(z.N, q));
    leere(z, p);
  }
  function leere(z, p) {
    z.bc = new Float64Array(z.G.n); z.fertig = 0; z.t = 0; z.letzter = -1;
    z.K = klassifiziere(z.bc, p);
  }

  /** Ein Schritt: das nächste Ursprungssegment geht in die Betweenness ein, danach neu klassifizieren. Nach dem letzten tut er nichts mehr. */
  function schritt(z, p) {
    if (z.fertig < z.G.n) {
      const s = z.fertig++;
      betweennessVon(z.G, s, z.gQ, z.gQ, z.bc, mitEnden(p)); // Origins = Destinations, Weights Origin = Weights Destination
      z.letzter = s;
      z.K = klassifiziere(z.bc, p);
    }
    z.t++;
    return z;
  }
  const fertig = z => z.fertig >= z.G.n;

  /** ganze Analyse auf einmal (nach einer Änderung, wenn schon gerechnet wurde) */
  function rechneAlles(z, p) {
    z.bc = new Float64Array(z.G.n);
    for (let s = 0; s < z.G.n; s++) betweennessVon(z.G, s, z.gQ, z.gQ, z.bc, mitEnden(p));
    z.fertig = z.G.n; z.t = Math.max(z.t, z.G.n); z.letzter = -1;
    z.K = klassifiziere(z.bc, p);
  }

  /** Parameter ohne Neustart: Netz/Graph/Gewichte neu; war die Analyse schon begonnen, wird sie gleich ganz gerechnet */
  function aendere(z, p, id) {
    const lief = z.t > 0;
    if (id === "fang") baueNetz(z, p);
    else if (id === "kL" || id === "kW" || id === "definition") baueGraph(z, p);
    else if (id === "grund" || id === "wEingang" || id === "wPoi") neueGewichte(z, p);
    else { z.K = klassifiziere(z.bc, p); return; }        // Klassengewichte, Faktor, Darstellung
    if (lief) rechneAlles(z, p);
  }
  /** nach Ändern der Punkte: Gewichte neu, ggf. sofort ganz rechnen */
  function punkteGeaendert(z, p) {
    const lief = z.t > 0;
    neueGewichte(z, p);
    if (lief) rechneAlles(z, p);
  }

  /** nächster Punkt (PoI oder Eingang) im Umkreis r → {art: "poi"|"eingang", i} oder null */
  function punktBei(z, q, r) {
    let best = null, bd = r;
    z.poi.forEach((x, i) => { const d = Geo.abstand(x, q); if (d <= bd) { bd = d; best = { art: "poi", i }; } });
    z.eingang.forEach((x, i) => { const d = Geo.abstand(x, q); if (d <= bd) { bd = d; best = { art: "eingang", i }; } });
    return best;
  }

  /** Zählung der Klassen: Anzahl und Länge je Klasse */
  function bilanz(z) {
    const anz = [0, 0, 0], len = [0, 0, 0];
    z.N.kanten.forEach((e, k) => { const c = z.K.klasse[k]; if (c >= 0) { anz[c]++; len[c] += e.l; } });
    return { anz, len };
  }

  return { STANDARD, KLASSEN, strassennetz, naechstesSegment, clusterListe, gewichte, mitEnden, betweennessVon, bereiche, findeBereich, klassifiziere,
           erzeuge, baueNetz, leere, schritt, fertig, rechneAlles, aendere, punkteGeaendert, punktBei, bilanz };
});
