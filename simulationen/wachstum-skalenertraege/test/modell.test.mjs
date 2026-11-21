// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const lauf = (param, n, saat = 1) => { const p = Object.assign({}, P, param), z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };

test("Feld wie im Original: 20 × 20 Zellen zu 20 px, Anfangswerte in [0, 1)", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.wert.length, 400); assert.equal(z.breite, 400);
  assert.ok(z.wert.every(v => v >= 0 && v < 1));
});

test("Regel 19_Growth_01: (P / P̄)^α", () => {
  assert.equal(M.skalenertrag(2, 1, 2), 4);
  assert.ok(Math.abs(M.skalenertrag(0.5, 0.25, 1.9) - Math.pow(2, 1.9)) < 1e-12);
  assert.equal(M.skalenertrag(0, 0.5, 1.9), 0);
});

test("Regel 20_Growth_02: Moore-Summe einschließlich der Zelle, Torus, geteilt durch 9", () => {
  const w = new Float64Array(9 * 9); w[0] = 9;          // Ecke (0, 0): wirkt über den Torus auf die Ecken gegenüber
  assert.equal(M.mooreSumme(w, 9, 0, 0), 9);
  assert.equal(M.mooreSumme(w, 9, 8, 8), 9);
  assert.equal(M.mooreSumme(w, 9, 2, 0), 0);
  assert.equal(M.moore(9, 1), 1);
  assert.ok(Math.abs(M.moore(4.5, 2) - 0.25) < 1e-12);
});

test("α = 1 (global): Werte werden nur auf den Mittelwert 1 normiert, danach Ruhe", () => {
  const z = lauf({ alpha: 1 }, 1);
  assert.ok(Math.abs(M.mittel(z.wert) - 1) < 1e-12);
  M.schritt(z, Object.assign({}, P, { alpha: 1 }));
  assert.ok(z.ruhe || Math.abs(M.mittel(z.wert) - 1) < 1e-12);
});

test("α = 1 (Moore): reines Ausmitteln erhält die Gesamtsumme", () => {
  const z0 = M.erzeuge({ fassung: "moore" }, zufall(3)), s0 = M.auswertung(z0).summe;
  const z = lauf({ fassung: "moore", alpha: 1 }, 25, 3);
  assert.ok(Math.abs(M.auswertung(z).summe - s0) < 1e-9);
});

test("Beschreibung: hohe Werte wachsen auf Kosten der Umgebung – am Ende hält eine Zelle alles (rot, > 255)", () => {
  const z = lauf({}, 80);
  const a = M.auswertung(z);
  assert.equal(a.positiv, 1);
  assert.equal(a.rot, 1);
  assert.ok(Math.abs(a.max - Math.pow(400, 1.9)) / a.max < 1e-9);   // (P / P̄)^α mit P̄ = P / 400
  assert.ok(z.ruhe);
});

test("Moore-Fassung mit α = 1,9: alle Werte gehen gegen 0, Lauf hält an (Stop wenn alles 0)", () => {
  const p = Object.assign({}, P, { fassung: "moore" }), z = M.erzeuge(p, zufall(2));
  let n = 0; while (!z.ruhe && n < 200) { M.schritt(z, p); n++; }
  assert.ok(z.leer); assert.equal(M.auswertung(z).max, 0);
});

test("α < 1 gleicht aus: alle Zellen nähern sich demselben Wert", () => {
  const z = lauf({ alpha: 0.5 }, 60);
  const a = M.auswertung(z); let min = Infinity; for (const v of z.wert) min = Math.min(min, v);
  assert.ok(a.max - min < 1e-6);
});

test("Grauwert relativ zum Höchstwert, begrenzt auf 0 … 255", () => {
  assert.equal(M.grauMit(5, 10), 128); assert.equal(M.grauMit(20, 10), 255); assert.equal(M.grauMit(1, 0), 0);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => Array.from(lauf({}, 5, s).wert).join(",");
  assert.equal(f(7), f(7)); assert.notEqual(f(7), f(8));
});
