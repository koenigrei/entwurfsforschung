// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const S = M.STANDARD, MU = Object.assign({}, S, M.MULTI, { fassung: "1.1" });
const nah = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);
const lauf = (p, saat, n) => { const z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };
/** Zufall mit festen Werten für einzelne Regeln */
const fest = (...w) => { let i = 0; const f = () => w[i++ % w.length]; f.ganz = n => Math.floor(f() * n); return f; };

test("Delphis Round (Banker's Rounding) und Feldgröße round(404 / Zellgröße)", () => {
  assert.equal(M.rundeD(180.5), 180); assert.equal(M.rundeD(181.5), 182); assert.equal(M.rundeD(-0.5), 0); assert.equal(M.rundeD(2.6), 3);
  assert.equal(M.zellen(4), 101); assert.equal(M.zellen(8), 50); assert.equal(M.zellen(1), 404); assert.equal(M.zellen(10), 40);
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.N, 101); assert.equal(z.mark.length, 101 * 101); assert.equal(z.t, 0);
});

test("Sichtfeld: angle threshold 157 sieht alle acht Nachbarn, 0 nur die Zelle voraus, 180 nur eine (Eigenheit)", () => {
  assert.deepEqual(M.sichtfeld(0, 157), [4, 5, 6, 7, 8, 1, 2, 3]);       // −179,5 → 180,5 → round 180 → Sektor 4 … 134,5 → 134 → 3
  assert.deepEqual(M.sichtfeld(0, 0), [8]);                               // heading 0 (Osten) → Zelle (1, 0)
  assert.deepEqual(M.NACHBAR[M.sichtfeld(90, 0)[0]], [0, 1]);              // 90° → nach unten (y wächst nach unten)
  assert.deepEqual(M.sichtfeld(45, 45), [8, 1, 2]);                       // Osten, Südost, Süden
  assert.equal(M.sichtfeld(0, 180).length, 1);                            // Anfang und Ende im selben Sektor
});

test("Landscape Rule: mark += √(dScale · round(Zellgröße · Abstand)), Abstand im Torus", () => {
  const z = M.erzeuge({}, zufall(1)), N = z.N;
  M.landschaft(z, 50, 50);
  nah(z.mark[50 * N + 50], 0);
  nah(z.mark[50 * N + 51], Math.sqrt(0.01 * 4));                           // 4 px
  nah(z.mark[51 * N + 51], Math.sqrt(0.01 * 6));                           // round(5,66) = 6 px
  nah(z.mark[50 * N + 0], Math.sqrt(0.01 * 200));                          // 50 Zellen = 200 px
  const t = M.erzeuge({}, zufall(1));
  M.landschaft(t, 0, 0);
  nah(t.mark[0 * N + 100], Math.sqrt(0.01 * 4));                           // über den Rand: Nachbar
  assert.equal(M.falte(60, 101), 41); assert.equal(M.falte(-90, 101), 11);
});

test("Stepping Rule: hill climbing zur Zelle mit dem höchsten mark, heading = arcTan2(dY, dX)", () => {
  const z = M.erzeuge({}, zufall(1)), N = z.N;
  for (let c = 0; c < z.mark.length; c++) z.mark[c] = 1;
  z.mark[49 * N + 49] = 5;                                                 // links oben (−1, −1)
  z.x[0] = 50; z.y[0] = 50; z.h[0] = 0;
  M.bewegeWalker(z, S, 0);
  assert.equal(z.x[0], 49); assert.equal(z.y[0], 49); assert.equal(z.h[0], 225);   // −135° + 360
});

test("Stepping Rule: Summe ≤ 3 → random walk um bis zu ±angle threshold, Schritt round(cos), round(sin)", () => {
  const z = M.erzeuge({}, zufall(1));
  z.x[0] = 50; z.y[0] = 50; z.h[0] = 0;
  z.zufall = fest(0.5, 0.9);                                               // random(158) = 79, random(2) = 1 → +79°
  M.bewegeWalker(z, S, 0);
  assert.equal(z.h[0], 79); assert.equal(z.x[0], 50); assert.equal(z.y[0], 51);    // cos 79° ≈ 0,19 → 0, sin ≈ 0,98 → 1
});

test("Noise (1.1) verändert die Gewichte; Roulette Wheel wählt gewichtet", () => {
  const z = M.erzeuge({}, zufall(1)), N = z.N;
  for (let c = 0; c < z.mark.length; c++) z.mark[c] = 1;
  z.mark[50 * N + 51] = 1.4;                                               // Osten nur wenig höher
  let ost = 0;
  for (let i = 0; i < 300; i++) { z.x[0] = 50; z.y[0] = 50; z.h[0] = 0; M.bewegeWalker(z, Object.assign({}, S, { noise: 4 }), 0); if (z.x[0] === 51 && z.y[0] === 50) ost++; }
  assert.ok(ost > 20 && ost < 150, `mit Noise nicht immer Osten: ${ost}`);
  z.mark[50 * N + 51] = 100; ost = 0;
  for (let i = 0; i < 300; i++) { z.x[0] = 50; z.y[0] = 50; z.h[0] = 0; M.bewegeWalker(z, Object.assign({}, S, { methode: "roulette" }), 0); if (z.x[0] === 51 && z.y[0] === 50) ost++; }
  assert.ok(ost > 230 && ost < 300, `roulette: Osten mit 100 / 107 ≈ 93 %: ${ost}`);
});

test("Diffusion: mark += (Σ acht Nachbarn) / 8 · d, gleichzeitig für alle Zellen", () => {
  const z = M.erzeuge({}, zufall(1)), N = z.N;
  z.mark[50 * N + 50] = 8;
  M.diffundiere(z, 0.5);
  nah(z.mark[50 * N + 50], 8); nah(z.mark[50 * N + 51], 0.5); nah(z.mark[49 * N + 49], 0.5); nah(z.mark[50 * N + 52], 0);
});

test("1.1: nach jedem Schritt Minimum 0 (mark − minM); Start auf zufälligen Zellen", () => {
  const z = lauf(MU, 3, 20);
  assert.equal(Math.min(...z.mark), 0);
  const s = M.erzeuge(MU, zufall(3));
  assert.equal(s.n, 10);
  assert.ok(new Set(Array.from(s.x, (x, k) => x + "," + s.y[k])).size > 5);
  const e = M.erzeuge(S, zufall(3));
  assert.equal(e.x[0], 50); assert.equal(e.y[0], 50);                      // 1.0: onCell := (50, 50)
  assert.equal(M.erzeuge({ zellgroesse: 10 }, zufall(1)).x[0], 20);        // 40 Zellen: Mitte statt Absturz
});

test("Überlauf: große Diffusion bleibt endlich (Stauchung mit 2^−600)", () => {
  const p = Object.assign({}, MU, { diffusion: 0.5 }), z = lauf(p, 1, 2500);
  assert.ok(z.gestaucht > 0);
  assert.ok(z.mark.every(Number.isFinite) && z.maxM < Math.pow(2, 901));
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => { const z = lauf(MU, s, 200); return Array.from(z.x).join(",") + Array.from(z.mark.slice(0, 500)).join(","); };
  assert.equal(f(7), f(7));
  assert.notEqual(f(7), f(8));
});

test("erwartetes Verhalten 1.0: der Walker erreicht die am schlechtesten erreichbare Zelle nie", () => {
  for (const s of [1, 3, 5]) {
    const z = M.erzeuge(S, zufall(s));
    let min = Infinity;
    for (let i = 0; i < 3000; i++) { M.schritt(z, S); if (i > 10) min = Math.min(min, M.auswertung(z).ziel); }
    assert.ok(min >= 1.5, `Abstand zum Ziel ${min}`);
    assert.ok(M.auswertung(z).begangen > 0.1);                               // er kommt dabei weit herum
  }
});

test("erwartetes Verhalten 1.1: bei starker Diffusion finden sich die Walker zu Clustern", () => {
  const nn = d => { const p = Object.assign({}, MU, { diffusion: d }); let s = 0; for (const saat of [1, 2]) s += M.auswertung(lauf(p, saat, 3000)).naechster; return s / 2; };
  const ohne = nn(0), stark = nn(0.2);
  assert.ok(stark < 0.5, `mit Diffusion ${stark}`);
  assert.ok(stark < ohne, `${stark} < ${ohne}`);
});

test("t zählt die Zeitschritte", () => {
  assert.equal(lauf(S, 1, 25).t, 25);
});
