// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD, N = M.N;
const lauf = (param, n, saat = 1) => { const p = Object.assign({}, P, param), z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };

test("Anfang: 101 × 101 Zellen, nur die mittlere Zelle (50, 50) entwickelt", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.zustand.length, N * N); assert.equal(M.anzahl(z), 1); assert.equal(z.zustand[50 * N + 50], 1);
  const r = M.erzeuge({ samen: true }, zufall(1));
  assert.ok(M.anzahl(r) > 15 && M.anzahl(r) <= 22);
});

test("Moore-Nachbarn ohne die Zelle selbst, Rand als Torus", () => {
  const s = new Uint8Array(25); s[0] = 1;
  assert.equal(M.nachbarn(s, 5, 0, 0), 0); assert.equal(M.nachbarn(s, 5, 4, 4), 1); assert.equal(M.nachbarn(s, 5, 1, 1), 1); assert.equal(M.nachbarn(s, 5, 2, 2), 0);
});

test("p = 100 % ohne Sterben: deterministisches Wachstum als Quadrat (2t + 1)²", () => {
  const p = Object.assign({}, P, { wahrscheinlichkeit: 100, lebensdauer: 1000 }), z = M.erzeuge(p, zufall(1));
  for (let t = 1; t <= 20; t++) { M.schritt(z, p); assert.equal(M.anzahl(z), (2 * t + 1) ** 2); }
});

test("misslungene Entwicklung quadriert die Wahrscheinlichkeit und setzt die Geburtszeit", () => {
  const p = Object.assign({}, P, { wahrscheinlichkeit: 50 }), z = M.erzeuge(p, zufall(9));
  z.zufall = () => 0.9;                                    // jede Entwicklung misslingt
  M.schritt(z, p);
  const j = 50 * N + 51;
  assert.equal(z.prob[j], 0.25); assert.equal(z.geburt[j], 0); assert.equal(z.zustand[j], 0);
  M.schritt(z, p); assert.equal(z.prob[j], 0.0625);
});

test("Überalterung: eine Zelle älter als die Lebensdauer stirbt und erhält wieder p", () => {
  const p = Object.assign({}, P, { wahrscheinlichkeit: 100, lebensdauer: 3 }), z = M.erzeuge(p, zufall(1));
  const m = 50 * N + 50;
  for (let i = 0; i < 4; i++) M.schritt(z, p);
  assert.equal(z.zustand[m], 1);                            // Alter 3 im vierten Schritt: noch nicht > 3
  M.schritt(z, p);                                          // Alter 4 > 3 → stirbt, wird aber sofort neu geboren (Nachbarn entwickelt, p = 1)
  assert.equal(z.geburt[m], 4); assert.equal(z.alter[m], 0);
});

test("Beschreibung: Wachstum von der Mitte aus, danach ständige Erneuerung durch Sterben und Neuentwicklung", () => {
  const z = lauf({}, 300, 1), v = z.verlauf;
  for (let t = 1; t <= 40; t++) assert.ok(v[t] > v[t - 1]);           // wächst zunächst von der Mitte aus
  const spaet = v.slice(150);
  assert.ok(Math.min(...spaet) > 0.5 * N * N && Math.max(...spaet) < 0.8 * N * N);   // Sättigung wie im Diagramm des Originals
  let jung = 0; for (let j = 0; j < z.zustand.length; j++) if (z.zustand[j] && z.alter[j] < 5) jung++;
  assert.ok(jung > 500);                                                // laufend neu entwickelte Zellen (Entwicklungswellen)
});

test("Grauwert D · (255 − 5 · Alter), begrenzt", () => {
  assert.equal(M.grau(1, 0), 255); assert.equal(M.grau(1, 30), 105); assert.equal(M.grau(1, 60), 0); assert.equal(M.grau(0, 3), 0);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => Array.from(lauf({}, 40, s).zustand).join("");
  assert.equal(f(7), f(7)); assert.notEqual(f(7), f(8));
});
