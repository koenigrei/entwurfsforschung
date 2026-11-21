// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);
const nah = (a, b) => Math.abs(a - b) < 1e-12;

/** Zustand mit Kugeln [[x, y, vx, vy], …] */
function feld(k) {
  const z = M.erzeuge(mit({ amount: k.length }), zufall(1));
  k.forEach(([x, y, vx, vy], i) => { z.x[i] = x; z.y[i] = y; z.vx[i] = vx; z.vy[i] = vy; });
  return z;
}

test("Konstanten des VBA-Makros", () => {
  assert.deepEqual([P.amount, P.maxDist, P.bremse, P.zug, M.UNIMIN, M.UNIMAX], [10, 30, 0.98, 0.01, 10, 100]);
});

test("Start: Mitte random(10, 100) = [10, 101), Vektor (Rnd · 10 − 5) / 2 = [−2,5; 2,5)", () => {
  assert.equal(M.random(() => 0, 10, 100), 10);
  assert.equal(M.random(() => 0.5, 10, 100), 55.5);
  const z = M.erzeuge(mit({ amount: 200 }), zufall(2));
  for (let i = 0; i < z.n; i++) {
    assert.ok(z.x[i] >= 10 && z.x[i] < 101 && z.y[i] >= 10 && z.y[i] < 101);
    assert.ok(z.vx[i] >= -2.5 && z.vx[i] < 2.5 && z.vy[i] >= -2.5 && z.vy[i] < 2.5);
  }
});

test("Vergleich unter maxDist: beide ziehen sich an und bremsen (loser(u) − dx · 0,01) · bremse", () => {
  const z = feld([[50, 50, 1, 0], [60, 50, -1, 0.5]]);
  assert.equal(M.vergleiche(z, 0, 1, 50, 50, P), true);
  // dx = 50 − 60 = −10: u bekommt +0,1, j bekommt −0,1, beide · 0,98
  assert.ok(nah(z.vx[0], (1 + 0.1) * 0.98) && nah(z.vy[0], 0));
  assert.ok(nah(z.vx[1], (-1 - 0.1) * 0.98) && nah(z.vy[1], 0.5 * 0.98));
  const w = feld([[10, 10, 1, 1], [50, 10, 0, 0]]);       // 40 ≥ 30: keine Wirkung
  assert.equal(M.vergleiche(w, 0, 1, 10, 10, P), false);
  assert.deepEqual([w.vx[0], w.vy[0], w.vx[1]], [1, 1, 0]);
});

test("run: Bewegung um den Vektor, Sprung an die Gegenseite des Rahmens", () => {
  const z = feld([[99.5, 50, 1, 0], [10.2, 12, -0.5, -3], [50, 50, 0.3, 0.4]]);
  M.bewege(z, 0); M.bewege(z, 1); M.bewege(z, 2);
  assert.deepEqual([z.x[0], z.y[0]], [10, 50]);
  assert.deepEqual([z.x[1], z.y[1]], [100, 100]);
  assert.ok(nah(z.x[2], 50.3) && nah(z.y[2], 50.4));
});

test("Reihenfolge: u wird erst nach dem Vergleich mit allen späteren bewegt, mit der Mitte vom Anfang", () => {
  const z = feld([[50, 50, 0, 0], [55, 50, 0, 0], [45, 50, 0, 0]]);
  M.schritt(z, P);
  // u = 0 vergleicht mit 1 (dx −5) und 2 (dx +5): vx0 = ((0 + 0,05) · 0,98 − 0,05) · 0,98
  assert.ok(nah(z.vx[0], ((0.05) * 0.98 - 0.05) * 0.98));
  assert.equal(z.t, 1);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); for (let i = 0; i < 100; i++) M.schritt(z, P); return Array.from(z.x).join() + Array.from(z.y).join(); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});

test("es bilden sich node-Gruppen, die Kugeln werden langsamer und kommen zur Ruhe", () => {
  for (const s of [1, 2, 3, 4]) {
    const z = M.erzeuge(P, zufall(s));
    const v0 = M.tempo(z), g0 = M.gruppen(z);
    for (let i = 0; i < 400; i++) M.schritt(z, P);
    const g = M.gruppen(z);
    assert.ok(v0 > 1 && M.tempo(z) < 1e-3, `Saat ${s}: ${M.tempo(z)}`);
    assert.ok(g.gruppen >= 1 && g.zahl < g0.zahl && g.groesste >= 3, `Saat ${s}: ${JSON.stringify(g)}`);
  }
});

test("ohne Anziehung und Bremse fliegen die Kugeln geradeaus weiter", () => {
  const p = mit({ zug: 0, bremse: 1 }), z = M.erzeuge(p, zufall(1));
  const v0 = Array.from(z.vx);
  for (let i = 0; i < 50; i++) M.schritt(z, p);
  assert.deepEqual(Array.from(z.vx), v0);
});

test("Spur: Punkte der letzten Schritte", () => {
  const z = feld([[50, 50, 1, 0]]);
  M.schritt(z, P); M.schritt(z, P);
  assert.equal(z.spurLaenge, 3);
  assert.deepEqual(M.spurPunkt(z, 0, 0), [52, 50]);
  assert.deepEqual(M.spurPunkt(z, 0, 2)[0], z.spur[0]);
});
