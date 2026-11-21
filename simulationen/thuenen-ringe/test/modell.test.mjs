// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;

test("Lagerente nach der Formel des Originals (cell.pas)", () => {
  // A: 2500 · (400 − 10) − 2500 · 10 · 5 = 975000 − 125000
  assert.equal(M.lagerente(P, 0, 10), 850000);
  assert.equal(M.lagerente(P, 1, 0), 500 * 899);
  assert.equal(M.lagerente(P, 2, 100), 2000 * 394 - 2000 * 100 * 3);
});

test("höchste Lagerente gewinnt, ungenutzt ab Rente ≤ 1", () => {
  assert.equal(M.nutzung(P, 0), 0);        // A am Markt
  assert.equal(M.nutzung(P, 60), 2);       // C im mittleren Ring
  assert.equal(M.nutzung(P, 130), 1);      // B außen
  assert.equal(M.nutzung(P, 200), M.KEINE);
});

test("Ringfolge mit Voreinstellungen: A, C, B", () => {
  const r = M.ringfolge(P);
  assert.deepEqual(r.map(q => q.produkt), [0, 2, 1]);
  assert.equal(r[0].von, 0);
  assert.equal(r[1].von, 29);   // 975000 − 12500 d = 788000 − 6000 d → d ≈ 28,8
  assert.equal(r[2].von, 113);  // 788000 − 6000 d = 449500 − 3000 d → d ≈ 112,8
  assert.equal(r[2].bis, 149);  // B: 449500 − 3000 d > 1 → d < 149,8
});

test("höhere Transportkosten von A verengen den inneren Ring", () => {
  const eng = M.ringfolge(Object.assign({}, P, { transportA: 15 }));
  assert.ok(eng[0].bis < M.ringfolge(P)[0].bis);
});

test("ohne Markt bleibt alles ungenutzt", () => {
  const z = M.erzeuge({ maerkte: 0 }, zufall(1));
  assert.equal(z.maerkte.length, 0);
  assert.ok(z.nutzung.every(u => u === M.KEINE));
});

test("ein Markt in der Mitte erzeugt konzentrische Nutzung", () => {
  const z = M.erzeuge({ maerkte: 1 }, zufall(1));
  const mitte = Math.floor(z.zeilen / 2) * z.spalten + Math.floor(z.spalten / 2);
  assert.equal(z.nutzung[mitte], 0);
  const a = M.anteile(z);
  assert.ok(a[0] > 0 && a[1] > 0 && a[2] > 0 && a[3] > 0);
  assert.ok(Math.abs(a.reduce((s, v) => s + v, 0) - 100) < 1e-9);
});

test("nächster Markt und gerundete Entfernung", () => {
  const m = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
  assert.deepEqual(M.naechsterMarkt(m, 90, 0), { d: 10, k: 1 });
  assert.deepEqual(M.naechsterMarkt(m, 3, 4), { d: 5, k: 0 });
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge({ maerkte: 3 }, zufall(s)); for (let i = 0; i < 50; i++) M.schritt(z, P); return JSON.stringify(z.maerkte); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});

test("wandernde Märkte bleiben im Feld (Torus) und unter der Höchstgeschwindigkeit", () => {
  const z = M.erzeuge({ maerkte: 5 }, zufall(3));
  for (let i = 0; i < 600; i++) M.schritt(z, P);
  for (const m of z.maerkte) {
    assert.ok(m.x >= 0 && m.x < z.breite && m.y >= 0 && m.y < z.hoehe);
    assert.ok(Math.abs(m.vx) <= M.VMAX && Math.abs(m.vy) <= M.VMAX);
  }
  assert.equal(z.t, 600);
});

test("ohne „Märkte bewegen“ bleiben die Märkte stehen", () => {
  const z = M.erzeuge({ maerkte: 2 }, zufall(4)), vor = JSON.stringify(z.maerkte.map(m => [m.x, m.y]));
  for (let i = 0; i < 20; i++) M.schritt(z, Object.assign({}, P, { bewegen: false }));
  assert.equal(JSON.stringify(z.maerkte.map(m => [m.x, m.y])), vor);
});
