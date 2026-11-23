// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const mit = o => Object.assign({}, P, o);
const nahe = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);
const summeFlaeche = L => L.reduce((s, q) => s + Geo.flaeche(q.poly), 0);
/** Quadrat 0…100 als vier Straßen */
const QUADRAT = [[[0, 0], [100, 0]], [[100, 0], [100, 100]], [[100, 100], [0, 100]], [[0, 100], [0, 0]]];

test("erzeuge: t = 0, Straßennetz auf Gelände, über 80 Plots, offene Anschlüsse an den Lücken", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.k, 0);
  assert.equal(z.G.groesse, 1000); assert.ok(z.G.max > 50);
  assert.ok(z.plots.length > 80, "Plots: " + z.plots.length);
  assert.ok(z.S.luecken.length > 0 && z.offen.length >= z.S.luecken.length);
  assert.ok(z.plots.every(q => Geo.flaecheS(q.poly) > 0));
});

test("Network to Segments: Kreuzung und T-Stoß werden geteilt, knapp daneben nicht", () => {
  assert.equal(M.teileAnSchnitten([[[0, 0], [10, 0]], [[5, -5], [5, 5]]]).length, 4);
  assert.equal(M.teileAnSchnitten([[[0, 0], [10, 0]], [[5, 0], [5, 5]]]).length, 3);
  assert.equal(M.teileAnSchnitten([[[0, 0], [10, 0]], [[5, 0.5], [5, 5]]]).length, 2);
});

test("verlaengere: nur offene Enden wachsen um die Toleranz", () => {
  const V = M.verlaengere([[[0, 0], [10, 0]], [[10, 0], [10, 10]]], 2);   // Knick bei (10, 0), offene Enden (0, 0) und (10, 10)
  assert.deepEqual(V, [[[-2, 0], [10, 0]], [[10, 0], [10, 12]]]);
});

test("Plot Division (nachgerechnet): Straße endet 0,5 m vor der Gegenseite", () => {
  const S = M.teileAnSchnitten(QUADRAT.concat([[[40, 0], [40, 99.5]]]));
  const A = M.teilungDCS(S), B = M.teilungSplit(S, 1), C = M.teilungSplit(S, 0.3);
  assert.equal(A.plots.length, 1); nahe(summeFlaeche(A.plots), 10000);   // fast: die Straße trennt nicht
  assert.equal(B.plots.length, 2);                                       // Split mit Toleranz 1 m: trennt
  assert.deepEqual(B.plots.map(q => Math.round(Geo.flaeche(q.poly))).sort((a, b) => a - b), [4000, 6000]);
  assert.equal(C.plots.length, 1);                                       // Toleranz kleiner als die Lücke
  assert.equal(M.offeneAnschluesse(A.N, 1).length, 1);
  assert.equal(M.offeneAnschluesse(A.N, 0.3).length, 0);
});

test("Plot Division: Stiche nach außen und Sackgassen gehören zu keinem Plot", () => {
  const S = M.teileAnSchnitten(QUADRAT.concat([[[50, 100], [50, 140]], [[50, 0], [50, 30]], [[100, 50], [0, 50]]]));
  for (const T of [M.teilungDCS(S), M.teilungSplit(S, 1.5)]) {
    assert.equal(T.plots.length, 2); T.plots.forEach(q => nahe(Geo.flaeche(q.poly), 5000));
  }
});

test("Beide Verfahren: ohne Lücken gleich, mit Lücken trennt nur Split Surface alle Plots (Katalog: „try the alternative method“)", () => {
  for (const s of [1, 2, 3, 4]) {
    const ohne = M.erzeuge(mit({ luecken: 0 }), zufall(s)), mitL = M.erzeuge(mit({ luecken: 0.08 }), zufall(s));
    const a = M.teilungDCS(ohne.segmente), b = M.teilungSplit(ohne.segmente, 1.5);
    assert.equal(a.plots.length, b.plots.length); nahe(summeFlaeche(a.plots), summeFlaeche(b.plots), 1e-3);
    const c = M.teilungDCS(mitL.segmente), d = M.teilungSplit(mitL.segmente, 1.5);
    assert.ok(c.plots.length < d.plots.length, `Saat ${s}: Lücken ohne Wirkung`);
    assert.equal(d.plots.length, a.plots.length);
  }
});

test("Polygon Center (Mittel der Ecken) und Neigung auf einer schiefen Ebene", () => {
  assert.deepEqual(M.mittelpunkt([[0, 0], [10, 0], [10, 10], [0, 20]]), [5, 7.5]);
  const n = 11, h = new Float64Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = 0.1 * i * 10 + 0.2 * j * 10;   // h = 0,1·x + 0,2·y
  const G = { n, groesse: 100, zelle: 10, h, max: 30 };
  nahe(M.plotNeigung(G, [[20, 20], [60, 20], [60, 70], [20, 70]]), Math.atan(Math.hypot(0.1, 0.2)) * 180 / Math.PI, 1e-9);
});

test("Remap und Smaller Than: streng kleiner als WeightSlope bleibt", () => {
  const w = [10, 20, 30, 40];
  let F = M.filtere(w, 4, 1);
  assert.deepEqual([...F.wert].map(v => Math.round(v * 1e9) / 1e9), [0, 0.333333333, 0.666666667, 1]);
  assert.deepEqual([...F.behalten], [1, 1, 1, 0]);                       // der steilste fällt schon bei WeightSlope 1 heraus
  assert.deepEqual([...M.filtere(w, 4, 0.5).behalten], [1, 1, 0, 0]);
  assert.deepEqual([...M.filtere(w, 4, 0).behalten], [0, 0, 0, 0]);
  F = M.filtere([7, 7, 7], 3, 0.5); assert.deepEqual([...F.behalten], [1, 1, 1]);   // keine Spannweite → alle 0
  assert.equal(M.filtere(w, 2, 1).lo, 10); assert.equal(M.filtere(w, 2, 1).hi, 20);  // nur schon bestimmte Plots zählen
});

test("Schritt: eine Neigung je Schritt, danach Ende; t läuft weiter", () => {
  const z = M.erzeuge(P, zufall(2)), n = z.plots.length;
  M.schritt(z, P); assert.equal(z.k, 1); assert.equal(z.t, 1); assert.ok(z.neigung[0] > 0);
  for (let i = 0; i < n + 2; i++) M.schritt(z, P);
  assert.ok(M.fertig(z)); assert.equal(z.k, n); assert.equal(z.t, n + 3);
  M.leere(z, P); assert.equal(z.t, 0); assert.equal(z.k, 0);
});

test("Katalog: Plots auf steilem Gelände werden aussortiert", () => {
  for (const s of [1, 5, 9]) {
    const p = mit({ weightSlope: 0.6 }), z = M.erzeuge(p, zufall(s)); M.rechneAlles(z, p);
    const b = M.bilanz(z);
    assert.ok(b.behalten > 0 && b.aussortiert > 0);
    assert.ok(b.maxBehalten < b.minAussortiert, `Saat ${s}: aussortierter Plot flacher als ein behaltener`);
    const schwelle = b.lo + 0.6 * (b.hi - b.lo);                         // WeightSlope als Neigung
    assert.ok(b.maxBehalten < schwelle && b.minAussortiert >= schwelle - 1e-9);
    const g = M.geojson(z);
    assert.equal(g.features.length, b.behalten); assert.equal(g.features[0].properties.layer, "Plots");
  }
});

test("Wiederholbarkeit: gleiche Saat gleiche Plots, andere Saat andere", () => {
  const a = M.erzeuge(P, zufall(4)), b = M.erzeuge(P, zufall(4)), c = M.erzeuge(P, zufall(8));
  assert.deepEqual(a.plots.map(q => q.poly), b.plots.map(q => q.poly));
  assert.notDeepEqual(a.plots.map(q => q.poly), c.plots.map(q => q.poly));
});

test("aendere: Verfahren teilt neu, WeightSlope filtert ohne neu zu rechnen", () => {
  const z = M.erzeuge(P, zufall(1)); M.rechneAlles(z, P);
  const n0 = z.plots.length, alt = z.neigung;
  M.aendere(z, mit({ weightSlope: 0.3 }), "weightSlope");
  assert.equal(z.neigung, alt); assert.ok(M.bilanz(z).aussortiert > 0);
  const p2 = mit({ methode: "split" }); M.aendere(z, p2, "methode");
  assert.ok(z.plots.length > n0); assert.ok(M.fertig(z));
});
