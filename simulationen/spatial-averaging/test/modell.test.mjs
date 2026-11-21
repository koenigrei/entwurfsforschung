// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const param = f => Object.assign({}, M.STANDARD, { fassung: f }, { rauschen: M.FASSUNGEN[f].rauschen, anzeige: M.FASSUNGEN[f].anzeige });
const lauf = (f, n, saat = 1, extra = {}) => { const p = Object.assign(param(f), extra), z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };

test("Felder wie im Original: 67 × 67 (21, cellScal 6) und 135 × 135 (22, cellScal 3), Anfangswerte −1 oder 1", () => {
  const a = M.erzeuge(param("mittelung"), zufall(1)), b = M.erzeuge(param("vicsek"), zufall(1));
  assert.equal(a.n, 67); assert.equal(b.n, 135); assert.equal(a.t, 0);
  assert.ok(a.wert.every(v => v === 1 || v === -1));
  const plus = a.wert.filter(v => v === 1).length / a.wert.length;
  assert.ok(plus > 0.45 && plus < 0.55);
});

test("von-Neumann-Summe: Zelle, links, rechts, oben, unten, Rand als Torus", () => {
  const n = 5, w = new Float64Array(n * n);
  w[0] = 1;                                                   // Zelle (0, 0)
  assert.equal(M.neumannSumme(w, n, 0, 0), 1);
  assert.equal(M.neumannSumme(w, n, 4, 0), 1);                // linker Nachbar über den Rand
  assert.equal(M.neumannSumme(w, n, 0, 4), 1);
  assert.equal(M.neumannSumme(w, n, 1, 1), 0);                // diagonal zählt nicht
  w.fill(2); assert.equal(M.neumannSumme(w, n, 2, 2), 10);
});

test("Mittelung (21): Summe bleibt erhalten, Höchstwert geht gegen den Mittelwert, Streuung gegen 0", () => {
  const z0 = M.erzeuge(param("mittelung"), zufall(2)), s0 = z0.wert.reduce((s, v) => s + v, 0);
  const z = lauf("mittelung", 600, 2), a = M.auswertung(z);
  assert.ok(Math.abs(z.wert.reduce((s, v) => s + v, 0) - s0) < 1e-6);
  assert.ok(Math.abs(a.max) < 0.06 && a.streuung < 0.02);
  assert.equal(a.entwickelt, 0);
});

test("ein Schritt der Mittelung von Hand nachgerechnet", () => {
  const p = param("mittelung"), z = M.erzeuge(p, zufall(5)), w0 = Float64Array.from(z.wert), n = z.n;
  M.schritt(z, p);
  assert.ok(Math.abs(z.wert[3 * n + 7] - M.neumannSumme(w0, n, 7, 3) / 5) < 1e-12);
  assert.equal(z.t, 1); assert.equal(z.verlauf.length, 2);
});

test("Rauschen ε = ±1: Wert minus Mittel ist genau −1 oder 1", () => {
  const p = param("rauschen"), z = M.erzeuge(p, zufall(4)), w0 = Float64Array.from(z.wert), n = z.n;
  M.schritt(z, p);
  for (const j of [0, 100, 2000, n * n - 1]) {
    const k = j % n, i = (j - k) / n, e = z.wert[j] - M.neumannSumme(w0, n, k, i) / 5;
    assert.ok(Math.abs(Math.abs(e) - 1) < 1e-12);
  }
});

test("Entwicklung: |P| > Schwelle markiert dauerhaft", () => {
  const z = { wert: Float64Array.from([5, -5, 4.5, 0]), entwickelt: new Uint8Array(4) };
  M.entwickle(z, 4.5);
  assert.deepEqual(Array.from(z.entwickelt), [1, 1, 0, 0]);
  z.wert.fill(0); M.entwickle(z, 4.5);
  assert.deepEqual(Array.from(z.entwickelt), [1, 1, 0, 0]);
});

test("Vicsek-Szalay (Beschreibung): entwickelte Flächen entstehen und wachsen, ohne Rauschen nicht", () => {
  const a = M.auswertung(lauf("vicsek", 300, 1)).entwickelt, b = M.auswertung(lauf("vicsek", 1000, 1)).entwickelt;
  assert.ok(a > 0.01 && b > a && b < 0.9);
  assert.equal(M.auswertung(lauf("mittelung", 300, 1)).entwickelt, 0);
});

test("Grauwert wie im Original: 255 / (2 |max|) · (|max| + P)", () => {
  assert.equal(M.grau(1, 1), 255); assert.equal(M.grau(-1, 1), 0); assert.equal(M.grau(0, -2), 128); assert.equal(M.grau(5, 1), 255);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => Array.from(lauf("rauschen", 20, s).wert).join(",");
  assert.equal(f(7), f(7)); assert.notEqual(f(7), f(8));
});
