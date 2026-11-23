/* Parzellierung mit Slicing Tree · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Parcellation Slicing Tree“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren der Komponente „Slicing Tree Structure for Parcels“ (C_RsTree → STreeExtended), wie es der rekonstruierte Quelltext
   der DeCodingSpaces-Toolbox beschreibt (docs/research/legacy-generation.md, Abschnitt 6; GPL-3.0, Abgleich, kein Code übernommen):
   rekursive Guillotine-Zweiteilung, gesteuert von der Straßenfront. Jeder Block wird so gedreht, dass die lange Seite seines
   kleinsten umschließenden Rechtecks achsparallel liegt. Ein Teil ist ein Blatt, wenn es keine Straßenkante hat. Sonst wird seine
   längste Straßenkante e mit splitRate · |e| > parcelWidth gesucht; der Schnitt steht senkrecht zu ihr, achsparallel an der
   Stelle bbox.min + splitRate · bbox.größe. Findet sich keine solche Kante, ist das Teil eine Parzelle. Durchgehende Streifen
   (Straße an beiden Enden, zwei lange parallele Innenkanten) dürfen zusätzlich quer zur längsten Innenkante geteilt werden
   („Rücken an Rücken“). Kein Zufall: das Verfahren ist deterministisch. Ein Schritt ist ein Schnitt. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen,
                   node ? require("../_gemeinsam/generierung.js") : wurzel.Generierung);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen, Generierung) {
  "use strict";

  /** Werte der Komponente „Customized Parameters“ in der .gh-Datei: parcelWidth = Regler 31 [10..100], sonst feste Werte.
      Bedeutung laut Quelltext (legacy-generation.md, Abschnitt 2): STX liest nur scalingFactor, minDistance, parcelWidth und splitRate. */
  const CUSTOMIZED = { scalingFactor: 1, maxLength: 100, minLength: 20, angleRange: 90, nChildren: 3, treeDepth: 7, minAngleD: 10, minDistance: 1,
    minBlockArea: 800, blockOffset: 0, maxRank: 4, rank: 0, maxArea: 20, parcelDepth: 5, parcelWidth: 31, splitRate: 0.5, density: 10, seed: -1 };
  /** Wofür die übrigen Werte da sind (nicht vom Slicing Tree gelesen) */
  const BEDEUTUNG = {
    maxLength: "Straßensegmentlänge in Synthesis Tree/Forest", minLength: "Straßensegmentlänge in Synthesis Tree/Forest",
    angleRange: "Winkelstreuung im Synthesis Tree", nChildren: "Äste je Knoten in Synthesis Tree/Forest", treeDepth: "Tiefe des Straßenbaums in Synthesis Tree/Forest",
    minAngleD: "Mindestwinkel im Synthesis Forest", minBlockArea: "Mindestfläche der Komponente Blocks", blockOffset: "Versatz der Komponente Blocks",
    maxRank: "nur im PISA-Chromosom", rank: "nur im PISA-Chromosom", maxArea: "nur im PISA-Chromosom", parcelDepth: "nur im PISA-Chromosom",
    density: "nur im PISA-Chromosom", seed: "von keiner Komponente gelesen"
  };
  const STANDARD = { breite: 31, teilung: 0.5, skalierung: 1, minAbstand: 1 };
  const MAX_EBENE = 40;              // Schutz gegen endlose Rekursion (im Original: Stapelüberlauf bei Schnitt der Länge 0)

  /** Beispielquartier (Szenen.quartier): verzogenes Straßenraster, nur Blöcke (wie „Polygons from lines“ aus dem Straßennetz, MinBlockSize 0) */
  const quartier = zufall => Szenen.quartier(zufall);

  /* ---------------------------------------------------------------- Slicing Tree (_gemeinsam/generierung.js)
     Drehung ins Rechteck der kleinsten Fläche, Straßenkanten (quasi-kollinear: Winkel < 0,01 rad, Abstand < scalingFactor),
     Teilungsregel (Variante „stx“), achsparalleler Schnitt und Baum stehen in Generierung (sliceRegel, sliceTeile, sliceBaum). */
  const { rechteckWinkel, kantenVon, istStrasse, teileKanten, senkrecht, parallelAbstand } = Generierung;
  const front = (poly, wurzelPoly, skal = STANDARD.skalierung) => teileKanten(poly, kantenVon(wurzelPoly), skal).strasse.reduce((s, k) => s + k.l, 0);
  /** Teilungsregel eines Teils (im gedrehten Rahmen), p = {breite, teilung, skalierung, minAbstand}. → {op: "V"|"H", x|y, kante, ruecken} oder null (Blatt) */
  const regel = (poly, wurzel, p) => Generierung.sliceRegel(poly, wurzel, p);
  /** Polygon an der achsparallelen Geraden teilen → {kinder: [kleinere Koordinate, größere], linie} oder null */
  const teile = Generierung.sliceTeile;
  /** Slicing Tree eines Blocks → Knotenliste {id, poly, ebene, eltern, kinder, op, linie, ruecken} in Weltkoordinaten */
  function baum(block, param) {
    const p = Object.assign({}, STANDARD, param);
    return Generierung.sliceBaum(block, { breite: p.breite, teilung: p.teilung, skalierung: p.skalierung, minAbstand: p.minAbstand, maxEbene: MAX_EBENE });
  }
  const blaetter = Generierung.sliceBlaetter;

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = quartier(zufall);
    const bloecke = szene.bloecke.map(poly => ({ poly, A: Geo.flaeche(poly), knoten: baum(poly, p) }));
    for (const b of bloecke) for (const k of b.knoten) if (!k.kinder) { k.front = front(k.poly, b.poly, p.skalierung); k.A = Geo.flaeche(k.poly); }
    // Schnittreihenfolge: Ebene für Ebene, darin Block für Block, im Block in Baumreihenfolge
    const schnitte = [];
    bloecke.forEach((b, bi) => b.knoten.forEach(k => { if (k.kinder) schnitte.push([k.ebene, bi, k.id]); }));
    schnitte.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
    schnitte.forEach(([, bi, id], i) => { bloecke[bi].knoten[id].nr = i; });
    for (const b of bloecke) { let j = 0; b.knoten.filter(k => k.kinder).sort((x, y) => x.nr - y.nr).forEach(k => { k.nrImBlock = ++j; }); }
    let wahl = 0; bloecke.forEach((b, i) => { if (b.A > bloecke[wahl].A) wahl = i; });
    return { t: 0, szene, b: szene.b, h: szene.h, bloecke, schnitte, wahl };
  }

  /** Ein Schritt = ein Schnitt (der nächste in der Schnittreihenfolge) */
  function schritt(z) { z.t++; return z; }
  const fertig = z => z.t >= z.schnitte.length;
  const geschnitten = (k, t) => !!k.kinder && k.nr < t;
  /** sichtbare Teile eines Blocks zur Zeit t: Knoten, deren Eltern geschnitten sind und die selbst (noch) nicht geschnitten sind */
  function teileZurZeit(b, t) { return b.knoten.filter(k => (k.eltern < 0 || b.knoten[k.eltern].nr < t) && !geschnitten(k, t)); }
  function letzter(z) { if (z.t < 1) return null; const [, bi, id] = z.schnitte[Math.min(z.t, z.schnitte.length) - 1]; return { bi, knoten: z.bloecke[bi].knoten[id] }; }
  function blockBei(z, q) { return z.bloecke.findIndex(b => Geo.punktInPoly(q, b.poly)); }

  /** Lage der Baumknoten für die Zeichnung: Blätter gleichmäßig verteilt (x in [0, 1]), Eltern mittig über den Kindern, y = Ebene */
  function baumLayout(K) {
    const pos = new Array(K.length), n = blaetter(K).length; let i = 0;
    (function lege(id) {
      const k = K[id];
      if (!k.kinder) { pos[id] = [(i++ + 0.5) / n, k.ebene]; return pos[id][0]; }
      const xs = k.kinder.map(lege); pos[id] = [(xs[0] + xs[xs.length - 1]) / 2, k.ebene]; return pos[id][0];
    })(0);
    return pos;
  }

  function aendere() {}

  return { STANDARD, CUSTOMIZED, BEDEUTUNG, quartier, rechteckWinkel, kantenVon, istStrasse, teileKanten, front, senkrecht, parallelAbstand,
           regel, teile, baum, blaetter, erzeuge, schritt, fertig, geschnitten, teileZurZeit, letzter, blockBei, baumLayout, aendere };
});
