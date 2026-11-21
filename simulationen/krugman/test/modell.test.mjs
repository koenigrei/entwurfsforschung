// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;

test("24 Orte auf dem Kreis, Entfernungen auf dem Einheitskreis", () => {
  assert.equal(M.ORTE.length, 24);
  assert.deepEqual(M.ORTE[0], { x: 200, y: 300 });                  // sin 0 · 100 + 200, cos 0 · 100 + 200
  assert.ok(Math.abs(M.DIST[0][12] - 2) < 0.02);                    // gegenüber: Durchmesser 2
  assert.ok(Math.abs(M.DIST[0][1] - 2 * Math.sin(Math.PI / 24)) < 0.02);
  assert.equal(M.DIST[3][3], 0);
});

test("Startverteilung: Summe 1, alle Werte nicht negativ", () => {
  for (let s = 1; s < 20; s++) {
    const p = M.startverteilung(zufall(s));
    assert.ok(Math.abs(M.summe(p) - 1) < 1e-12);
    assert.ok(p.every(v => v >= 0));
    assert.ok(p.slice(0, 23).every(v => v < 2 / 24));
  }
});

test("Potential = K1·Σ P·e^(−α d) − K2·Σ P·e^(−β d), nachgerechnet bei gleichverteilter Bevölkerung", () => {
  const gleich = new Float64Array(24).fill(1 / 24);
  const { v, v1, v2 } = M.potentiale(gleich, P);
  let s1 = 0, s2 = 0;
  for (let k = 0; k < 24; k++) { s1 += Math.exp(-0.3 * M.DIST[k][5]) / 24; s2 += Math.exp(-0.05 * M.DIST[k][5]) / 24; }
  assert.ok(Math.abs(v1[5] - 0.2 * s1) < 1e-12 && Math.abs(v2[5] - s2) < 1e-12 && Math.abs(v[5] - (0.2 * s1 - s2)) < 1e-12);
});

test("Mittel durch die Zahl der Orte, Veränderung (V − V̄)·P mal Wachstum", () => {
  const z = M.erzeuge({}, zufall(1)), vor = Array.from(z.P);
  const { v } = M.potentiale(z.P, P), m = M.mittel(z.P, v);
  assert.ok(Math.abs(m - vor.reduce((s, p, i) => s + p * v[i], 0) / 24) < 1e-15);
  M.schritt(z, P);
  for (const i of [0, 7, 23]) assert.ok(Math.abs(z.P[i] - 2 * (vor[i] + (v[i] - m) * vor[i])) < 1e-15);
});

test("aus der Zufallsverteilung entstehen mehrere zentrale Orte (zwei gegenüber)", () => {
  for (const s of [1, 2, 3]) {
    const z = M.erzeuge({}, zufall(s));
    assert.ok(M.zentren(z.P).length >= 5);
    for (let i = 0; i < 20000; i++) M.schritt(z, P);
    const Z = M.zentren(z.P);
    assert.equal(Z.length, 2);
    const abstand = Math.min(Math.abs(Z[0] - Z[1]), 24 - Math.abs(Z[0] - Z[1]));
    assert.ok(abstand >= 10 && abstand <= 12);
    assert.ok(Z.reduce((a, i) => a + z.P[i], 0) / M.summe(z.P) > 0.9);
  }
});

test("weiter reichende Anziehung (α = 1) lässt nur ein Zentrum übrig", () => {
  const p = Object.assign({}, P, { alpha: 1 });
  const z = M.erzeuge(p, zufall(4));
  for (let i = 0; i < 20000; i++) M.schritt(z, p);
  assert.equal(M.zentren(z.P).length, 1);
});

test("Gesamtbevölkerung pendelt sich ein: Wachstum · (1 + V − V̄) ≈ 1", () => {
  const z = M.erzeuge({}, zufall(6));
  for (let i = 0; i < 5000; i++) M.schritt(z, P);
  const a = M.summe(z.P); M.schritt(z, P);
  assert.ok(Math.abs(M.summe(z.P) - a) / a < 1e-3 && a > 0.5 && a < 0.8);
});

test("Diagramm: ein Profil alle 1000 Schritte, höchstens 38", () => {
  const z = M.erzeuge({}, zufall(2));
  for (let i = 0; i < 2500; i++) M.schritt(z, P);
  assert.equal(z.kurven.length, 3);                                 // Anfang, 1000, 2000
});

test("keine negative Bevölkerung bei extremen Parametern", () => {
  const p = Object.assign({}, P, { k2: 2, beta: 0, wachstum: 0.5 });
  const z = M.erzeuge(p, zufall(5));
  for (let i = 0; i < 500; i++) M.schritt(z, p);
  assert.ok(Array.from(z.P).every(v => v >= 0 && Number.isFinite(v)));
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge({}, zufall(s)); for (let i = 0; i < 300; i++) M.schritt(z, P); return Array.from(z.P).join(","); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});
