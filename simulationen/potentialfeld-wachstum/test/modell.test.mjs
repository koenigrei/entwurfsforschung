// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD, N = M.N, MI = M.MITTE * N + M.MITTE;
const lauf = (param, n, saat = 1) => { const p = Object.assign({}, P, param), z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };

test("Anfang: 101 × 101 Zellen, nichts entwickelt, Potential 1 nur in der Mitte", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.zustand.reduce((s, v) => s + v, 0), 0); assert.equal(z.pot[MI], 1); assert.equal(z.pot.reduce((s, v) => s + v, 0), 1);
  const r = M.erzeuge({ samen: true }, zufall(1));
  assert.ok(r.pot.reduce((s, v) => s + v, 0) >= 8);
});

test("Schritt 1: die Mitte wird entwickelt (P > ψ), ihr Potential 0, die Nachbarn erhalten 1/9 + Rauschen", () => {
  const z = lauf({}, 1);
  assert.equal(z.zustand[MI], 1); assert.equal(z.pot[MI], 0); assert.equal(z.verlauf[1], 1);
  for (const j of [MI - 1, MI + 1, MI - N, MI + N + 1]) assert.ok(z.pot[j] >= 1 / 9 && z.pot[j] < 1 / 9 + 0.27);
  assert.equal(z.pot[MI + 2], 0);
});

test("Potential = Nachbarmittel + random(10 · Noise) / 1000, höchstens 1", () => {
  assert.equal(M.potential(0.2, 50), 0.25); assert.equal(M.potential(0.95, 269), 1);
});

test("Nachbarn: entwickelte Moore-Nachbarn und Potentialsumme / 9 ohne die Zelle, Torus", () => {
  const z = M.erzeuge({}, zufall(1)); z.pot.fill(0); z.pot[0] = 0.9; z.zustand[N * N - 1] = 1;
  const nb = M.nachbarn(z, 0, 0);
  assert.equal(nb.entwickelt, 1); assert.equal(nb.potential, 0);
  assert.ok(Math.abs(M.nachbarn(z, 1, 1).potential - 0.1) < 1e-12);
});

test("ohne Rauschen und mit ψ = 10 %: nur der erste Ring entsteht, dann steht das Wachstum (Potential 1/9 · 3/9 < ψ)", () => {
  const z = lauf({ rauschen: 0, schwelle: 10 }, 30);
  assert.equal(M.dichte(z).zellen, 9);
});

test("Beschreibung: mit Rauschen entsteht eine weit verästelte, lockere Struktur (wie eine Koralle)", () => {
  for (const s of [1, 2, 3]) {
    const d = M.dichte(lauf({}, 50, s));
    assert.ok(d.radius > 30 && d.dichte < 0.45 && d.zellen > 500, JSON.stringify(d));
  }
});

test("Altern: nach der Lebensdauer sterben die ältesten Zellen, die Zahl der Zellen fällt wieder", () => {
  const z = lauf({}, 150), v = z.verlauf;
  const max = Math.max(...v);
  assert.ok(v[150] < 0.8 * max);
  const ohne = lauf({ altern: false }, 150).verlauf;
  for (let t = 1; t < ohne.length; t++) assert.ok(ohne[t] >= ohne[t - 1]);
});

test("Grauwert D · (255 − trunc(255 / Lebensdauer) · Alter)", () => {
  assert.equal(M.grau(1, 0, 50), 255); assert.equal(M.grau(1, 10, 50), 205); assert.equal(M.grau(1, 60, 50), 0); assert.equal(M.grau(0, 1, 50), 0);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => Array.from(lauf({}, 30, s).zustand).join("");
  assert.equal(f(7), f(7)); assert.notEqual(f(7), f(8));
});
