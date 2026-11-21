// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q && q.fassung ? { loops: M.FASSUNGEN[q.fassung].loops } : {}, q);
const lauf = (q, n = 100000, saat = 1) => { const p = mit(q), z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n && !z.fertig; i++) M.schritt(z, p); return z; };
const nah = (a, b) => Math.abs(a - b) < 1e-9;

test("VBA-Round und random(lower, upper) = Int((upper − lower + 1) · Rnd + lower)", () => {
  assert.deepEqual([0.5, 1.5, 2.5, -5.5, -4.5, 9.53, -0.4].map(M.vbaRound), [0, 2, 2, -6, -4, 10, 0]);
  assert.deepEqual([0, 0.33, 0.34, 0.66, 0.67, 0.999].map(r => M.random(r, -1, 1)), [-1, -1, 0, 0, 1, 1]);
  assert.deepEqual([0, 0.999999].map(r => M.random(r, 1, 255)), [1, 255]);
  assert.deepEqual([0, 0.999999].map(r => M.random(r, 0, 255)), [0, 255]);
});

test("Sprung: Round(Rnd · num + 1) · 2π/num, Länge 11; num = 4 → vier Hauptrichtungen, num = 3 → 120°-Raster", () => {
  const r4 = [0, 0.2, 0.5, 0.8, 0.99].map(r => M.sprung(r, 4).map(v => Math.round(v * 1e9) / 1e9 + 0));
  assert.deepEqual(r4, [[0, 11], [-11, 0], [0, -11], [11, 0], [0, 11]]);
  const [x, y] = M.sprung(0.2, 3);                          // Round(1,6) = 2 → 240°
  assert.ok(nah(x, -5.5) && nah(y, -11 * Math.sqrt(3) / 2));
  for (let r = 0; r < 1; r += 0.01) assert.ok(nah(Math.hypot(...M.sprung(r, 5)), 11));
});

test("01: zehn Ebenen à loops Würfel, jede ab (0, 0) auf Höhe u · 10, Sprünge von 11, Würfel überschneiden sich", () => {
  const z = lauf({ fassung: "01" });
  assert.equal(z.t, 1000);
  assert.equal(z.wuerfel.length, 1000);
  assert.ok(z.fertig);
  for (let u = 1; u <= 10; u++) {
    const e = z.wuerfel.slice((u - 1) * 100, u * 100);
    assert.ok(e.every(w => w.z === u * 10 - 5), "Ebene " + u);
    assert.ok(nah(e[0].x, 0) && nah(e[0].y, 0));
    for (let i = 1; i < e.length; i++) assert.ok(nah(Math.hypot(e[i].x - e[i - 1].x, e[i].y - e[i - 1].y), 11));
  }
  assert.equal(M.geschosse(z), 10);
  assert.ok(z.doppelt > 100, "viele Überschneidungen: " + z.doppelt);
  assert.equal(z.doppelt + M.plaetze(z), 1000);
  assert.ok(z.wuerfel.every(w => w.farbe >= 1 && w.farbe <= 255));
  const t = z.t; M.schritt(z, mit({ fassung: "01" })); assert.equal(z.t, t);
});

test("02: Ebenenwechsel nur nach einem Würfel auf besetztem Platz – Doppelbelegungen bleiben", () => {
  for (const saat of [1, 2, 3]) {
    const z = lauf({ fassung: "02" }, 100000, saat), W = z.wuerfel;
    assert.equal(W.length, 200);
    assert.ok(W.every(w => Number.isInteger(w.x) && Number.isInteger(w.y) && (w.z + 5) % 10 === 0));
    for (let j = 1; j < W.length; j++) assert.equal(Math.abs(W[j].x - W[j - 1].x) + Math.abs(W[j].y - W[j - 1].y), 11);
    // Wechsel der Ebene zwischen Würfel j und j + 1 nur, wenn Würfel j auf einem schon besetzten Platz steht
    // (oder j = 0: der erste Würfel steht auf (0, 0, 0) = dem Anfangswert von mitte in checkList(1))
    const vorher = new Set();
    for (let j = 0; j < W.length - 1; j++) {
      const k = W[j].x + "," + W[j].y + "," + W[j].z, besetzt = vorher.has(k);
      if (W[j + 1].z !== W[j].z) assert.ok(besetzt || j === 0, `Wechsel ohne Doppelbelegung bei ${j}`);
      vorher.add(k);
    }
    assert.ok(z.doppelt > 0, "Doppelbelegung trotz checkList");
    assert.ok(z.hoehenwechsel > 0);
  }
});

test("03: keine Doppelbelegung, besetzter Platz → nur die Höhe ändert sich; Würfel + Durchgänge ohne Würfel = loops", () => {
  for (const saat of [1, 2, 3, 4]) {
    const z = lauf({ fassung: "03" }, 100000, saat), W = z.wuerfel;
    assert.equal(z.t, 400);
    assert.equal(W.length + z.leer, 400);
    assert.equal(z.doppelt, 0);
    assert.equal(M.plaetze(z), W.length);
    for (let j = 1; j < W.length; j++) assert.equal(Math.abs(W[j].x - W[j - 1].x) + Math.abs(W[j].y - W[j - 1].y), 11);
    assert.ok(W.every(w => (w.z + 5) % 10 === 0 && w.farbe >= 0 && w.farbe <= 255));
    assert.ok(M.geschosse(z) >= 3, "wächst frei im Raum: " + M.geschosse(z));
    assert.ok(z.leer > 0);
  }
});

test("03 mit num = 3 verschiebt die Rasterung (gerundete 120°-Sprünge)", () => {
  const z = lauf({ fassung: "03", num: 3 });
  assert.equal(z.doppelt, 0);
  assert.ok(z.wuerfel.some(w => w.x % 11 !== 0), "nicht mehr auf dem 11er-Raster");
  assert.ok(z.wuerfel.every(w => Number.isInteger(w.x) && Number.isInteger(w.y)));
});

test("gleiche Saat → gleiche Struktur; andere Saat → andere", () => {
  for (const f of ["01", "02", "03"]) {
    const bild = s => JSON.stringify(lauf({ fassung: f }, 300, s).wuerfel);
    assert.equal(bild(7), bild(7));
    assert.notEqual(bild(7), bild(8));
  }
});
