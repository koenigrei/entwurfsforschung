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
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
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
  const WINKEL_TOL = 0.01;           // rad, „quasi-kollinear“
  const MAX_EBENE = 40;              // Schutz gegen endlose Rekursion (im Original: Stapelüberlauf bei Schnitt der Länge 0)

  /** Beispielquartier: verzogenes Straßenraster, nur Blöcke (wie „Polygons from lines“ aus dem Straßennetz, MinBlockSize 0) */
  function quartier(zufall) {
    const s = Szenen.stadt(zufall, { b: 720, h: 500, nx: 7, ny: 6, strasse: 14, gebaeude: false, platz: false, kirche: false });
    s.bloecke = s.bloecke.map(b => Geo.flaecheS(b) < 0 ? b.slice().reverse() : b);
    return s;
  }

  /* ---------------------------------------------------------------- Drehung ins Rechteck der kleinsten Fläche */
  const dreh = (p, c, w) => { const co = Math.cos(w), si = Math.sin(w), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + co * x - si * y, c[1] + si * x + co * y]; };
  /** Winkel, um den das Polygon zu drehen ist, damit die lange Seite seines kleinsten umschließenden Rechtecks waagrecht liegt */
  function rechteckWinkel(poly) {
    const H = Geo.konvexeHuelle(poly);
    let best = { A: Infinity, w: 0 };
    for (let i = 0; i < H.length; i++) {
      const a = H[i], b = H[(i + 1) % H.length], phi = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const Q = H.map(p => dreh(p, [0, 0], -phi)), bb = Geo.bbox(Q), A = bb.b * bb.h;
      if (A < best.A - 1e-9) best = { A, w: bb.b >= bb.h ? -phi : -phi + Math.PI / 2 };
    }
    return best.w;
  }

  /* ---------------------------------------------------------------- Kanten */
  function kantenVon(poly) { return poly.map((a, i) => { const b = poly[(i + 1) % poly.length]; return { a, b, l: Geo.abstand(a, b) }; }); }
  const winkelDiff = (u, v) => { let d = Math.abs(Math.atan2(u[1], u[0]) - Math.atan2(v[1], v[0])) % Math.PI; return Math.min(d, Math.PI - d); };
  /** Straßenkante: quasi-kollinear (Winkel < 0,01 rad, Abstand < 1 · scalingFactor) mit einer Kante des Wurzelblocks */
  function istStrasse(k, wurzel, skal) {
    const m = Geo.lerp(k.a, k.b, 0.5), d = Geo.sub(k.b, k.a);
    return wurzel.some(r => winkelDiff(d, Geo.sub(r.b, r.a)) < WINKEL_TOL && Geo.abstandSegment(m, r.a, r.b).d < skal);
  }
  function teileKanten(poly, wurzel, skal) {
    const K = kantenVon(poly).filter(k => k.l > 1e-9), strasse = [], innen = [];
    for (const k of K) (istStrasse(k, wurzel, skal) ? strasse : innen).push(k);
    strasse.sort((x, y) => y.l - x.l); innen.sort((x, y) => y.l - x.l);
    return { strasse, innen };
  }
  const front = (poly, wurzelPoly, skal = STANDARD.skalierung) => teileKanten(poly, kantenVon(wurzelPoly), skal).strasse.reduce((s, k) => s + k.l, 0);
  /** „senkrecht“ im gedrehten Rahmen: 45° < |Winkel| < 135° */
  const senkrecht = k => { const w = Math.abs(Math.atan2(k.b[1] - k.a[1], k.b[0] - k.a[0])) * 180 / Math.PI; return w > 45 && w < 135; };
  const beruehren = (k, e, tol = 1e-6) => [k.a, k.b].some(p => Geo.abstandSegment(p, e.a, e.b).d < tol) || [e.a, e.b].some(p => Geo.abstandSegment(p, k.a, k.b).d < tol);
  /** Abstand zweier (fast) paralleler Kanten: Abstand der Mitte der einen von der Geraden der anderen */
  function parallelAbstand(k, e) {
    if (winkelDiff(Geo.sub(k.b, k.a), Geo.sub(e.b, e.a)) >= WINKEL_TOL) return -1;
    const n = Geo.norm([-(e.b[1] - e.a[1]), e.b[0] - e.a[0]]);
    return Math.abs(Geo.dot(Geo.sub(Geo.lerp(k.a, k.b, 0.5), e.a), n));
  }

  /** Teilungsregel eines Teils (im gedrehten Rahmen). → {op: "V"|"H", x|y, kante, ruecken} oder null (Blatt) */
  function regel(poly, wurzel, p) {
    const { strasse, innen } = teileKanten(poly, wurzel, p.skalierung);
    if (!strasse.length) return null;                                   // Restfläche ohne Straße: Blatt
    const kandidaten = strasse.slice();
    let ruecken = null;
    if (strasse.length >= 2 && innen.length >= 2) {                      // Rücken an Rücken bei durchgehenden Streifen
      const [i1, i2] = innen, abst = parallelAbstand(i2, i1);
      const gegenueber = strasse.some(k => !beruehren(k, strasse[0]));
      if (abst >= p.minAbstand * p.teilung && gegenueber && i1.l > 2 * p.breite) { ruecken = i1; kandidaten.push(i1); }
    }
    const e = kandidaten.find(k => p.teilung * k.l > p.breite);
    if (!e) return null;
    const bb = Geo.bbox(poly), op = senkrecht(e) ? "H" : "V";
    return op === "V" ? { op, x: bb.x0 + p.teilung * bb.b, kante: e, ruecken: e === ruecken } : { op, y: bb.y0 + p.teilung * bb.h, kante: e, ruecken: e === ruecken };
  }

  /** Polygon an der achsparallelen Geraden teilen → [kleinere Koordinate, größere] oder null */
  function teile(poly, r) {
    const p = r.op === "V" ? [r.x, 0] : [0, r.y], n = r.op === "V" ? [1, 0] : [0, 1];
    const a = Geo.bereinige(Geo.schneideHalbebene(poly, p, n), 1e-7), b = Geo.bereinige(Geo.schneideHalbebene(poly, p, [-n[0], -n[1]]), 1e-7);
    const A = Geo.flaeche(poly);
    if (a.length < 3 || b.length < 3 || Geo.flaeche(a) < 1e-6 * A || Geo.flaeche(b) < 1e-6 * A) return null;
    const S = r.op === "V" ? Geo.geradeSchnittPoly(poly, [r.x, 0], [0, 1]) : Geo.geradeSchnittPoly(poly, [0, r.y], [1, 0]);
    const linie = r.op === "V" ? [[r.x, S[0]], [r.x, S[S.length - 1]]] : [[S[0], r.y], [S[S.length - 1], r.y]];
    return { kinder: [a, b], linie };
  }

  /** Slicing Tree eines Blocks → Knotenliste {id, poly, ebene, eltern, kinder, op, linie, ruecken} in Weltkoordinaten */
  function baum(block, param) {
    const p = Object.assign({}, STANDARD, param), c = Geo.schwerpunkt(block), w = rechteckWinkel(block);
    const wurzelPoly = block.map(q => dreh(q, c, w)), wurzel = kantenVon(wurzelPoly), K = [];
    const zurueck = P => P.map(q => dreh(q, c, -w));
    (function teileRek(poly, ebene, eltern) {
      const kn = { id: K.length, poly: zurueck(poly), ebene, eltern, kinder: null, op: null, linie: null, ruecken: false };
      K.push(kn);
      const r = ebene < MAX_EBENE ? regel(poly, wurzel, p) : null, s = r && teile(poly, r);
      if (s) {
        kn.op = r.op; kn.linie = zurueck(s.linie); kn.ruecken = r.ruecken;
        kn.kinder = s.kinder.map(q => teileRek(q, ebene + 1, kn.id));
      }
      return kn.id;
    })(wurzelPoly, 0, -1);
    return K;
  }
  const blaetter = K => K.filter(k => !k.kinder);

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
