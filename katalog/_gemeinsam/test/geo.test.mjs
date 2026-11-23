// Tests der gemeinsamen Geometrie, Graphen und Szenen (node --test im Ordner katalog/_gemeinsam) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const G = require("../geo.js");
const S = require("../szenen.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const nah = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} ≉ ${b}`);
const Q = [[0, 0], [10, 0], [10, 10], [0, 10]];

test("Fläche, Umfang, Schwerpunkt eines Quadrats", () => {
  nah(G.flaeche(Q), 100); nah(G.umfang(Q), 40);
  assert.deepEqual(G.schwerpunkt(Q).map(v => +v.toFixed(9)), [5, 5]);
  assert.ok(G.punktInPoly([5, 5], Q)); assert.ok(!G.punktInPoly([15, 5], Q));
});

test("Halbebene und Teilen erhalten die Fläche", () => {
  const [l, r] = G.teilePolygon(Q, [3, 0], [0, 1]);
  nah(G.flaeche(l) + G.flaeche(r), 100); nah(Math.min(G.flaeche(l), G.flaeche(r)), 30);
});

test("Versatz eines Quadrats nach innen", () => {
  const v = G.versetze(Q, 1); nah(G.flaeche(v), 64);
  const w = G.versetze([[0, 0], [0, 10], [10, 10], [10, 0]], 1); nah(G.flaeche(w), 64);   // andere Umlaufrichtung
});

test("Strahl trifft Segment", () => {
  nah(G.strahlSegment([0, 0], [1, 0], [5, -1], [5, 1]), 5);
  assert.equal(G.strahlSegment([0, 0], [-1, 0], [5, -1], [5, 1]), Infinity);
});

test("Isovist im leeren Raum: Kreis mit Radius = Reichweite", () => {
  const iso = G.isovist([0, 0], [], { winkel: 360, reichweite: 50, strahlen: 720 });
  const m = G.isovistMasse(iso);
  nah(m.area, Math.PI * 2500, 5); nah(m.meanRadial, 50); nah(m.stdDev, 0, 1e-6); nah(m.compactness, 1, 1e-3); nah(m.driftMagnitude, 0, 1e-6);
});

test("Isovist in einem Raum 20 × 20: Fläche 400, Drift zur Mitte", () => {
  const H = G.kanten([[-5, -5], [15, -5], [15, 15], [-5, 15]]);
  const m = G.isovistMasse(G.isovist([0, 0], H, { winkel: 360, reichweite: 100, strahlen: 1440 }));
  nah(m.area, 400, 0.5); nah(m.driftMagnitude, Math.hypot(5, 5), 0.05); nah(m.maxRadial, Math.hypot(15, 15), 0.2); nah(m.minRadial, 5, 0.01);
});

test("Blickwinkel 90°: Viertelkreis", () => {
  const iso = G.isovist([0, 0], [], { winkel: 90, reichweite: 10, strahlen: 901, richtung: 0 });
  nah(G.flaeche(G.isovistPolygon(iso)), Math.PI * 25, 0.01);
  // Strahlen von Richtung − 45° bis Richtung + 45° (Sweep der Toolbox), Mittelwert und Abweichung wie im leeren Raum
  nah(iso.winkel[0], -Math.PI / 4, 1e-12); nah(iso.winkel[900], Math.PI / 4, 1e-12);
  const m = G.isovistMasse(iso); nah(m.meanRadial, 10); assert.equal(m.stdDev, 0); assert.equal(m.skewness, 0); assert.equal(m.occlusivity, 0);
});

test("Verdeckung wie docs/visibility.md der Toolbox: Sprünge hinter einer freistehenden Wand, Raumecken zählen nicht", () => {
  // Raum 20 × 20 um den Standpunkt, freistehende Wand x = 5, y −2…2: an beiden Wandenden springt r von √29 auf 2·√29
  const H = G.kanten([[-10, -10], [10, -10], [10, 10], [-10, 10]]).concat([[[5, -2], [5, 2]]]);
  const m = G.isovistMasse(G.isovist([0, 0], H, { winkel: 360, reichweite: 100, strahlen: 7200 }));
  assert.equal(m.occlusions, 2);
  nah(m.occlusivity, 2 * Math.sqrt(29), 0.05);
  // ohne die Wand: nur Raumecken → keine Verdeckung
  const leer = G.isovistMasse(G.isovist([1, 2], H.slice(0, 4), { winkel: 360, reichweite: 100, strahlen: 3600 }));
  assert.equal(leer.occlusions, 0); assert.equal(leer.occlusivity, 0);
  // ein Strahl ins Freie neben einer Wand ist ebenfalls ein Sprung (Reichweite 8: Wand x = 5 sichtbar, dahinter frei)
  const frei = G.isovistMasse(G.isovist([0, 0], [[[5, -2], [5, 2]]], { winkel: 360, reichweite: 8, strahlen: 7200 }));
  assert.equal(frei.occlusions, 2); nah(frei.occlusivity, 2 * (8 - Math.sqrt(29)), 0.05);
});

test("Drift-Winkel wie in Rhino: Grad ab +x gegen den Uhrzeigersinn (Szene mit y nach unten)", () => {
  // Raum, der vom Standpunkt aus nach oben (−y, Norden) reicht: Schwerpunkt oberhalb → 90°
  const H = G.kanten([[-5, -30], [5, -30], [5, 2], [-5, 2]]);
  const m = G.isovistMasse(G.isovist([0, 0], H, { winkel: 360, reichweite: 100, strahlen: 1440 }));
  nah(m.driftAngle, 90, 0.5); nah(m.driftMagnitude, 14, 0.1);
  const o = G.isovistMasse(G.isovist([0, 0], G.kanten([[-2, -5], [30, -5], [30, 5], [-2, 5]]), { winkel: 360, reichweite: 100, strahlen: 1440 }));
  assert.ok(o.driftAngle < 0.5 || o.driftAngle > 359.5, "nach Osten → 0°");
  assert.equal(G.isovistMasse(G.isovist([0, 0], [], { strahlen: 360 })).driftAngle, 0, "keine Drift → 0");
});

test("Strahlstatistik: Varianz und Schiefe über alle Richtungen (geteilt durch die Zahl der Richtungen)", () => {
  // Halbe Richtungen 10 m, halbe 20 m (Halbebene y > 0 durch Wand bei y = 10 begrenzt ist nicht konstant – daher künstlich)
  const iso = { o: [0, 0], voll: true, laengen: Float64Array.from([10, 20, 10, 20]), treffer: Int32Array.from([0, 1, 0, 1]),
                punkte: [[10, 0], [0, 20], [-10, 0], [0, -20]], winkel: Float64Array.from([0, 1, 2, 3]), reichweite: 100 };
  const m = G.isovistMasse(iso);
  nah(m.meanRadial, 15); nah(m.variance, 25); nah(m.stdDev, 5); nah(m.skewness, 0);
  const iso2 = Object.assign({}, iso, { laengen: Float64Array.from([10, 10, 10, 30]) });
  const m2 = G.isovistMasse(iso2);   // μ = 15, σ² = (25·3 + 225)/4 = 75, μ3 = (3·(−125) + 3375)/4 = 750
  nah(m2.variance, 75); nah(m2.skewness, 750 / Math.pow(75, 1.5));
});

test("Voronoi-Zellen füllen den Rahmen", () => {
  const P = [[2, 2], [8, 2], [5, 8], [2, 7]], Z = G.voronoi(P, Q);
  nah(Z.reduce((s, z) => s + G.flaeche(z), 0), 100);
  Z.forEach((z, i) => assert.ok(G.punktInPoly(P[i], z)));
});

test("Dijkstra und Floyd–Warshall finden denselben Weg", () => {
  const N = G.netz([[[0, 0], [10, 0]], [[10, 0], [10, 10]], [[0, 0], [0, 10]], [[0, 10], [10, 10]], [[0, 0], [10, 10]]]);
  const A = G.adjazenz(N), nb = i => A[i].map(x => [x.j, N.kanten[x.k].l, x.k]);
  const d = G.dijkstra(N.knoten.length, nb, 0);
  const z = N.knoten.findIndex(p => p[0] === 10 && p[1] === 10);
  nah(d.dist[z], Math.hypot(10, 10));
  const F = G.floydWarshall(N.knoten.length, N.kanten.map(e => ({ a: e.a, b: e.b, c: e.l })));
  nah(F.dist[0 * N.knoten.length + z], Math.hypot(10, 10));
  assert.deepEqual(G.floydWeg(N.knoten.length, F.next, 0, z), G.weg(d.vor, z));
});

test("Betweenness: Mittelknoten einer Kette trägt alle Wege", () => {
  const nb = i => [[i - 1, 1], [i + 1, 1]].filter(([j]) => j >= 0 && j < 3);
  const bc = new Float64Array(3);
  for (let s = 0; s < 3; s++) G.betweennessVon(3, nb, s, null, null, bc);
  assert.deepEqual(Array.from(bc), [0, 2, 0]);    // Wege 0→2 und 2→0
});

test("Segmentgraph: Geradeaus kostet weniger als Abbiegen", () => {
  const N = G.netz([[[0, 0], [10, 0]], [[10, 0], [20, 0]], [[10, 0], [10, 10]]]);
  const SG = G.segmentGraph(N, 0, 1);
  const c = (i, j) => SG.adj[i].find(x => x[0] === j)[1];
  assert.ok(c(0, 1) < c(0, 2)); nah(c(0, 2), 1);
});

test("Heap: zweiter Schlüssel ordnet gleiche erste Schlüssel; ohne ihn wie bisher", () => {
  const H = new G.Heap(); H.push(1, 10, 3); H.push(1, 11, 1); H.push(0.5, 12); H.push(1, 13, 2);
  assert.deepEqual([H.pop(), H.pop(), H.pop(), H.pop()], [12, 11, 13, 10]);
  const H2 = new G.Heap(); [5, 1, 4, 2, 3].forEach(k => H2.push(k, k)); assert.deepEqual([1, 2, 3, 4, 5].map(() => H2.pop()), [1, 2, 3, 4, 5]);
});

test("naechstesSegment und gerichteter Floyd–Warshall", () => {
  const N = G.netz([[[0, 0], [10, 0]], [[10, 0], [10, 10]]]);
  assert.equal(G.naechstesSegment(N, [9, 6]), 1); assert.equal(G.naechstesSegment(N, [3, -1]), 0);
  const F = G.floydWarshall(3, [{ a: 0, b: 1, c: 1 }, { a: 1, b: 2, c: 1 }], true);
  nah(F.dist[0 * 3 + 2], 2); assert.equal(F.dist[2 * 3 + 0], Infinity);
});

test("richtungsGraph (nachgerechnet): T-Kreuzung, keine Wende, Sackgasse; Kosten standard und dcs2020", () => {
  // 0: (0,0)–(10,0), 1: (10,0)–(20,0), 2: (10,0)–(10,10); Zustand 2s = a → b, 2s+1 = b → a
  const N = G.netz([[[0, 0], [10, 0]], [[10, 0], [20, 0]], [[10, 0], [10, 10]]]);
  const R = G.richtungsGraph(N, { kL: 0, kW: 1 });
  assert.equal(R.z, 6);
  const zu = (st, nx) => R.nb[st].find(x => x[0] === nx);
  nah(zu(0, 2)[1], 0); nah(zu(0, 4)[1], 1); nah(zu(0, 4)[3], 90); nah(zu(0, 4)[2], 10);
  assert.equal(zu(0, 1), undefined, "keine Wende auf dasselbe Segment");
  assert.equal(R.nb[1].length, 0, "Sackgasse bei (0, 0)");
  const L = G.richtungsGraph(N, { kL: 1, kW: 1, norm: "dcs2020" });
  nah(L.nb[0].find(x => x[0] === 4)[1], 10 / 10 + 90 / 180);
  const S = G.richtungsGraph(N, { kL: 1, kW: 1 });
  nah(S.nb[0].find(x => x[0] === 4)[1], 10 + 1);
});

test("richtungsGraph: kein Abbiegen „über“ ein Nachbarsegment ohne es zu durchfahren", () => {
  // a kommt von Westen nach J = (0, 0); b führt fast geradeaus weiter (10°), c fast zurück (170°)
  const r = Math.PI / 18, N = G.netz([[[-10, 0], [0, 0]], [[0, 0], [10 * Math.cos(r), 10 * Math.sin(r)]], [[0, 0], [-10 * Math.cos(r), 10 * Math.sin(r)]]]);
  const U = G.segmentGraph(N, 0, 1), d = G.dijkstra(3, i => U.adj[i], 0).dist;
  assert.ok(d[2] < 170 / 90 - 0.5, "ungerichtet: Umweg über b ist billiger (Schwäche von segmentGraph)");
  const R = G.richtungsGraph(N, { kL: 0, kW: 1 }), A = G.segmentAbstaende(R, G.zustandsSuche(R, 0));
  nah(A.kosten[2], 170 / 90, 1e-6); assert.deepEqual(G.zustandsWeg(G.zustandsSuche(R, 0), 2), [0, 2]);
});

test("segmentBetweennessVon: Kette (geordnete Paare), mit Endsegmenten (dcs2020), Gleichstand wird geteilt", () => {
  const K = G.netz([[[0, 0], [10, 0]], [[10, 0], [20, 0]], [[20, 0], [30, 0]]]), R = G.richtungsGraph(K);
  const bc = new Float64Array(3), be = new Float64Array(3);
  for (let s = 0; s < 3; s++) { G.segmentBetweennessVon(R, s, null, null, bc); G.segmentBetweennessVon(R, s, null, null, be, { enden: true }); }
  assert.deepEqual([...bc], [0, 2, 0]); assert.deepEqual([...be], [4, 6, 4]);
  // Quadrat: von Segment 0 zum gegenüberliegenden Segment 2 gibt es zwei gleich lange Wege (über 1 und über 3)
  const Q = G.netz([[[0, 0], [10, 0]], [[10, 0], [10, 10]], [[10, 10], [0, 10]], [[0, 10], [0, 0]]]), RQ = G.richtungsGraph(Q);
  const bq = new Float64Array(4); G.segmentBetweennessVon(RQ, 0, null, new Float64Array([0, 0, 1, 0]), bq);
  assert.deepEqual([...bq].map(v => +v.toFixed(9)), [0, 0.5, 0, 0.5]);
  const gq = new Float64Array(4); G.segmentBetweennessVon(RQ, 0, new Float64Array([3, 1, 1, 1]), new Float64Array([0, 0, 2, 0]), gq);
  nah(gq[1], 3 * 2 * 0.5);
});

test("segmentClosenessVon: Kette metrisch – NC, TD, Integration, harmonisch, dcs2020 = n/Σd", () => {
  const K = G.netz([[[0, 0], [10, 0]], [[10, 0], [20, 0]], [[20, 0], [30, 0]]]), C = G.segmentClosenessVon(G.richtungsGraph(K), 0);
  assert.equal(C.nc, 3); nah(C.td, 30); nah(C.md, 15); nah(C.integration, 9 / 30); nah(C.harmonisch, 1 / 10 + 1 / 20); nah(C.dcs2020, 2 / 30);
  nah(C.nain, Math.pow(3, 1.2) / 32);
});

test("Polylinien: Länge, nächster Anteil, Ecken abrunden (Bézier-Mitte = ¼·p0 + ½·Ecke + ¼·p2)", () => {
  assert.equal(G.polylinienLaenge([[0, 0], [3, 4]]), 5); assert.equal(G.polylinienLaenge([[1, 1]]), 0);
  assert.equal(G.naechsterAnteil([[0, 0], [10, 0], [10, 10]], [10, 5]), 0.75);
  assert.equal(G.naechsterAnteil([[0, 0], [10, 0]], [-5, 3]), 0); assert.equal(G.naechsterAnteil([[2, 2], [2, 2]], [0, 0]), 0);
  const Q = G.rundeEcken([[0, 0], [10, 0], [10, 10]], 3, 2);
  assert.deepEqual(Q, [[0, 0], [7, 0], [9.25, 0.75], [10, 3], [10, 10]]);
  // kurze Kanten begrenzen den Abstand auf ⅓; zwei Punkte bleiben (als Kopie)
  assert.deepEqual(G.rundeEcken([[0, 0], [3, 0], [3, 3]], 4, 1), [[0, 0], [2, 0], [3, 1], [3, 3]]);
  const P = [[0, 0], [1, 1]], R = G.rundeEcken(P); assert.deepEqual(R, P); assert.notEqual(R[0], P[0]);
});

test("Radius (nachgerechnet): Kette aus 100-m-Segmenten, Radius 250 m erreicht zwei Nachbarn, Rn alle", () => {
  const K = G.netz([0, 1, 2, 3, 4].map(i => [[i * 100, 0], [(i + 1) * 100, 0]])), RG = G.richtungsGraph(K);
  const A = G.segmentAbstaende(RG, G.zustandsSuche(RG, 0, { radius: 250 }));
  assert.deepEqual([...A.meter], [0, 100, 200, Infinity, Infinity]);
  const B = G.segmentAbstaende(RG, G.zustandsSuche(RG, 0, { radius: Infinity }));
  assert.deepEqual([...B.meter], [0, 100, 200, 300, 400]);
  // ohne Radius gleich wie Radius Infinity; genau auf dem Radius zählt noch
  assert.deepEqual([...G.segmentAbstaende(RG, G.zustandsSuche(RG, 0)).meter], [...B.meter]);
  assert.deepEqual([...G.segmentAbstaende(RG, G.zustandsSuche(RG, 0, { radius: 200 })).meter], [0, 100, 200, Infinity, Infinity]);
  // Closeness im Radius: nur die zwei erreichten Segmente
  const C = G.segmentClosenessVon(RG, 0, { radius: 250 });
  assert.equal(C.nc, 3); nah(C.td, A.kosten[1] + A.kosten[2]); nah(C.td, 100 + 200);   // Standard kL = 1: Kosten = Meter
  assert.equal(G.segmentClosenessVon(RG, 0).nc, 5);
});

test("Betweenness mit Radius und aus einer fertigen Suche: gleich wie segmentBetweennessVon", () => {
  const K = G.netz([0, 1, 2, 3, 4].map(i => [[i * 100, 0], [(i + 1) * 100, 0]])), RG = G.richtungsGraph(K);
  const a = new Float64Array(5), b = new Float64Array(5), c = new Float64Array(5);
  for (let s = 0; s < 5; s++) {
    G.segmentBetweennessVon(RG, s, null, null, a, { radius: 150 });
    G.segmentBetweennessAus(RG, G.zustandsSuche(RG, s, { radius: 150 }), null, null, b);
    G.segmentBetweennessVon(RG, s, null, null, c);
  }
  // Radius 150 m: nur direkte Nachbarn erreichbar, nichts liegt dazwischen; global trägt die Mitte am meisten
  assert.deepEqual([...a], [0, 0, 0, 0, 0]); assert.deepEqual([...b], [...a]);
  assert.deepEqual([...c], [0, 6, 8, 6, 0]);
  const d = new Float64Array(5);
  for (let s = 0; s < 5; s++) G.segmentBetweennessVon(RG, s, null, null, d, { radius: 250 });
  assert.deepEqual([...d], [0, 2, 2, 2, 0]);
  const e = new Float64Array(5); G.segmentBetweennessAus(RG, G.zustandsSuche(RG, 2), new Float64Array(5), null, e);
  assert.deepEqual([...e], [0, 0, 0, 0, 0]);   // Ursprungsgewicht 0
});

test("isovistRaster: gleiche Strahlen, Längen und Treffer wie isovist; außerhalb des Rasters ohne Raster", () => {
  const st = S.stadt(zufall(6)), H = [];
  for (const g of st.gebaeude) G.kanten(g.poly || g).forEach(k => H.push(k));
  const R = G.segmentRaster(H, 5);
  assert.ok(R.nx > 1 && R.ny > 1 && R.zellen.length === R.nx * R.ny);
  for (const [o, opt] of [[[300, 200], { strahlen: 180, reichweite: 100 }], [[120, 90], { strahlen: 90, reichweite: 60, winkel: 120, richtung: 1 }], [[-500, -500], { strahlen: 36 }]]) {
    const a = G.isovist(o, H, opt), b = G.isovistRaster(o, H, R, opt);
    assert.deepEqual([...b.treffer], [...a.treffer]);
    for (let i = 0; i < a.laengen.length; i++) nah(b.laengen[i], a.laengen[i], 1e-9);
    assert.equal(b.voll, a.voll);
  }
  // leere Hindernisliste: Raster 1 × 1 um den Ursprung, Kreis
  const L = G.segmentRaster([], 5); assert.ok(L.nx >= 1 && L.ny >= 1);
  assert.ok(G.segmentRechteck([0, 0], [10, 10], 4, 4, 6, 6)); assert.ok(!G.segmentRechteck([0, 0], [10, 0], 4, 4, 6, 6));
});

test("Isovist-Kennzeichnung: fünf eigene Definitionen mit „ *“, Fußnote, Auswahleintrag", () => {
  assert.deepEqual(G.ISOVIST_EIGENE_DEFINITION, ["areaDist", "circularity", "convexDeficiency", "dispersion", "elongation"]);
  for (const k of G.ISOVIST_EIGENE_DEFINITION) assert.ok(G.ISOVIST_MASSE.some(m => m[0] === k), k);
  assert.deepEqual(G.isovistMassName("circularity"), { de: "Kreisähnlichkeit *", en: "Circularity *" });
  assert.deepEqual(G.isovistMassName("area"), { de: "Fläche", en: "Area" });
  assert.deepEqual(G.isovistMassOption("elongation"), { wert: "elongation", name: { de: "Streckung (Elongation) *", en: "Elongation *" } });
  assert.deepEqual(G.isovistMassOption("area").name, { de: "Fläche (Area)", en: "Area" });
  assert.equal(G.ISOVIST_MASSE.filter(([k]) => G.isovistMassName(k).de.endsWith(" *")).length, 5);
  assert.ok(G.ISOVIST_FUSSNOTE.de.startsWith("* eigene Definition") && G.ISOVIST_FUSSNOTE.en.startsWith("* own definition"));
});

test("Stadt: gleiche Saat, gleiche Szene; Gebäude liegen in Blöcken", () => {
  const a = S.stadt(zufall(3)), b = S.stadt(zufall(3)), c = S.stadt(zufall(4));
  assert.deepEqual(a.knoten, b.knoten); assert.notDeepEqual(a.knoten, c.knoten);
  assert.ok(a.gebaeude.length > 40 && a.bloecke.length > 8 && a.strassen.length > 20);
  assert.ok(a.platz && a.kirche);
  assert.ok(G.netz(a.strassen).knoten.length === a.opt.nx * a.opt.ny);
});

test("Gelände: Höhen ≥ 0, bilinear, Gefälle zeigt bergauf", () => {
  const T = S.gelaende(zufall(5), { n: 41, groesse: 400 });
  assert.ok(T.h.every(v => v >= 0)); nah(S.hoehe(T, 0, 0), T.h[0]);
  const g = S.gradient(T, 200, 200), e = 1;
  assert.ok(S.hoehe(T, 200 + g[0] * e, 200 + g[1] * e) >= S.hoehe(T, 200 - g[0] * e, 200 - g[1] * e));
});
