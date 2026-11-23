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
