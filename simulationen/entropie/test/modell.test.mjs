// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD, N = M.N;
const lauf = (param, n, saat = 1) => { const p = Object.assign({}, P, param), z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };
const zeile = (z, r) => Array.from(z.feld.subarray(r * N, (r + 1) * N));

test("Regelcode wie im Original: 00011110 = Regel 30, Ziffer 1 gilt für das Muster 111", () => {
  assert.equal(M.code(30), "00011110");
  assert.deepEqual(M.VORLAGEN, [136, 4, 90, 18, 30, 110, 104]);
  assert.equal(M.regelWert(30, 1, 1, 1), 0); assert.equal(M.regelWert(30, 1, 0, 0), 1);
  assert.equal(M.regelWert(30, 0, 0, 1), 1); assert.equal(M.regelWert(30, 0, 0, 0), 0);
  assert.equal(M.regelWert(128, 1, 1, 1), 1);
});

test("Start: eine Zelle in der Mitte (D_101 = 1), Feld 202 × 202", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.feld.length, N * N); assert.equal(zeile(z, 0).reduce((s, v) => s + v, 0), 1); assert.equal(z.feld[101], 1);
});

test("Regel 30 aus einer Zelle: Zeile 1 = 100, 101, 102; Ring am Rand", () => {
  const z = lauf({}, 1);
  const r = zeile(z, 1);
  assert.deepEqual([r[99], r[100], r[101], r[102], r[103]], [0, 1, 1, 1, 0]);
  const neu = M.naechsteZeile(Uint8Array.from([1, 0, 0, 0]), new Uint8Array(4), 30);
  assert.deepEqual(Array.from(neu), [1, 1, 0, 1]);           // Zelle 3 sieht über den Ring links die 0, rechts die 1
});

test("Regel 90 aus einer Zelle: Sierpinski-Dreieck, Zeile 4 hat nur die Zellen ±4", () => {
  const z = lauf({ regel: 90 }, 4);
  const r = zeile(z, 4), an = r.map((v, k) => v ? k : -1).filter(k => k >= 0);
  assert.deepEqual(an, [97, 105]);
});

test("Entropie: leere Zeile 0, Wechsel 0101 → 1/4, alle 16 Teilfolgen gleich häufig → 1", () => {
  assert.deepEqual(M.entropie(new Uint8Array(16)), { topologisch: 0, metrisch: 0 });
  const w = Uint8Array.from({ length: 16 }, (_, k) => k % 2);
  const e = M.entropie(w); assert.ok(Math.abs(e.topologisch - 0.25) < 1e-12 && Math.abs(e.metrisch - 0.25) < 1e-12);
  const db = Uint8Array.from("0000100110101111".split(""), Number);   // de-Bruijn-Folge B(2, 4)
  const g = M.entropie(db); assert.ok(Math.abs(g.topologisch - 1) < 1e-12 && Math.abs(g.metrisch - 1) < 1e-12);
});

test("0 ≤ metrische ≤ topologische Entropie ≤ 1", () => {
  const z = lauf({ start: "zufall", regel: 110 }, 150, 3);
  z.metrisch.forEach((m, i) => assert.ok(m >= -1e-12 && m <= z.topologisch[i] + 1e-12 && z.topologisch[i] <= 1 + 1e-12));
});

test("erwartetes Verhalten: Regel 30 mit Zufallsstart bleibt chaotisch (S_met nahe 1), Regel 136 stirbt aus (0)", () => {
  assert.ok(M.mittelMetrisch(lauf({ start: "zufall", regel: 30 }, 150, 2)) > 0.9);
  const z = lauf({ start: "zufall", regel: 136 }, 150, 2);
  assert.equal(z.metrisch[150], 0);
  assert.ok(M.mittelMetrisch(lauf({ regel: 4 }, 50)) < 0.05);
});

test("am unteren Rand rollt das Bild weiter (Zeile bleibt die letzte)", () => {
  const z = lauf({}, N + 9);
  assert.equal(z.zeile, N - 1); assert.equal(z.gerollt, 10); assert.equal(z.metrisch.length, N + 10); assert.equal(z.t, N + 9);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => Array.from(lauf({ start: "zufall" }, 30, s).feld).join("");
  assert.equal(f(7), f(7)); assert.notEqual(f(7), f(8));
});
