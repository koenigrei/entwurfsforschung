// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD, P4 = Object.assign({}, M.STANDARD, { fassung: "rd04", seed: 61 });
const nah = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);
const bis = (p, saat, max = 2000) => { const z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < max && z.fertig === null; i++) M.schritt(z, p); return z; };
/** leere Welt 03 ohne Keime zum Nachrechnen */
const leer = () => M.erzeuge(Object.assign({}, P, { seed: 0 }), zufall(1));
const ix = (z, px, py) => (z.e - py) * z.N + (px + z.e);

test("Welt: 161 × 161 (03), 201 × 201 (04); setup 03 prägt seed Keime mit Farben 55, 56, …", () => {
  const z = M.erzeuge(P, zufall(2));
  assert.equal(z.N, 161); assert.equal(M.erzeuge(P4, zufall(2)).N, 201);
  const f = new Set(Array.from(z.pcolor).filter(v => v > 0));
  assert.ok(f.size >= 48 && f.size <= 50);                            // zwei turtles können auf einem Patch landen
  for (const v of f) assert.ok(v >= 55 && v <= 104);
  assert.equal(z.phase, "leak"); assert.equal(z.n, 0);
});

test("Torus und Patch eines Punkts", () => {
  nah(M.wickle(80.6, 80), -80.4);
  const z = leer();
  assert.equal(M.patchIndex(0, 0, 80), ix(z, 0, 0));
  assert.equal(M.patchIndex(80.6, 0, 80), ix(z, -80, 0));
  assert.equal(M.delta(70, -70, 80), 21);                              // kürzer über den Rand
  nah(M.richtung(1, 0), 90); nah(M.richtung(0, -1), 180);
});

test("checkdiffuse: gleiche Farbe → übernehmen, verschiedene → boundary, teilbare Mischung → Mittelwert", () => {
  const z = leer();
  z.pcolor[ix(z, 0, 1)] = 60; z.pcolor[ix(z, 1, 1)] = 60;
  assert.deepEqual(M.pruefe(z, ix(z, 0, 0)), [60, false]);           // s1 120, s2 2
  z.pcolor[ix(z, -1, -1)] = 57;                                        // s1 177, s2 3 → 59: teilbar!
  assert.deepEqual(M.pruefe(z, ix(z, 0, 0)), [59, false]);
  z.pcolor[ix(z, -1, -1)] = 58;                                        // s1 178, s2 3 → nicht teilbar
  assert.deepEqual(M.pruefe(z, ix(z, 0, 0)), [178, true]);
  z.pcolor[ix(z, -1, -1)] = 0; z.pcolor[ix(z, 1, 1)] = M.WEISS;        // neben einer Grenze: 69,9 / 2 nicht ganzzahlig
  assert.equal(M.pruefe(z, ix(z, 0, 0))[1], true);
  assert.deepEqual(M.pruefe(z, ix(z, 5, 5)), [0, false]);             // ohne farbige Nachbarn nichts
});

test("leak: erst alle prüfen, dann färben – eine Region wächst je Schritt um einen Patch (Moore)", () => {
  const z = leer(); z.pcolor[ix(z, 0, 0)] = 70;
  assert.equal(M.leck(z), 8);
  assert.equal(z.pcolor[ix(z, 1, 1)], 70); assert.equal(z.pcolor[ix(z, 2, 0)], 0);
  assert.equal(M.leck(z), 16);
});

test("leak: zwei Regionen treffen sich in einer weißen Grenzlinie", () => {
  const z = leer(); z.pcolor[ix(z, -3, 0)] = 60; z.pcolor[ix(z, 3, 0)] = 61;
  for (let i = 0; i < 5; i++) M.leck(z);
  assert.equal(z.pcolor[ix(z, 0, 0)], M.WEISS);                       // in der Mitte zwischen beiden
  assert.equal(z.pcolor[ix(z, -2, 0)], 60); assert.equal(z.pcolor[ix(z, 2, 0)], 61);
});

test("04: setup verteilt density turtles einzeln auf Patches; attract sammelt sie auf dem Kreis mit radius", () => {
  const z = M.erzeuge(P4, zufall(4));
  assert.equal(z.phase, "bewegen"); assert.equal(z.n, 61);
  const patches = new Set(Array.from({ length: z.n }, (_, k) => M.patchIndex(z.x[k], z.y[k], z.e)));
  assert.equal(patches.size, 61);
  const p = Object.assign({}, P4, { repel: false, stampNach: 0 });
  for (let i = 0; i < 200; i++) M.schritt(z, p);
  for (let k = 0; k < z.n; k++) { const r = Math.hypot(z.x[k], z.y[k]); assert.ok(r > 31.5 && r < 34.5, String(r)); }
});

test("04: repel schiebt die nächste turtle weg (bk repel-strength)", () => {
  const z = M.erzeuge(Object.assign({}, P4, { seed: 2 }), zufall(1));
  z.x[0] = 0; z.y[0] = 0; z.x[1] = 3; z.y[1] = 0;
  M.abstossen(z, P4);
  assert.ok(z.x[1] - z.x[0] > 3 + 1.5, `${z.x[0]} / ${z.x[1]}`);     // beide je 0,8 weg
});

test("04: stamp-agents prägt die turtles als Keime ein, danach leak bis zur fertigen Teilung", () => {
  const z = bis(P4, 1);
  assert.equal(z.phase, "leak"); assert.equal(z.keime, 61);
  const a = M.auswertung(z);
  assert.equal(a.schwarz, 0); assert.ok(a.grenze > 0.02 && a.grenze < 0.12, String(a.grenze));
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = (p, s) => Array.from(bis(p, s).pcolor).join(",");
  assert.equal(f(P, 7), f(P, 7)); assert.notEqual(f(P, 7), f(P, 8));
  assert.equal(f(P4, 7), f(P4, 7)); assert.notEqual(f(P4, 7), f(P4, 8));
});

test("erwartetes Verhalten 03: Flächenteilung – jede Zelle gehört zu einer Region oder zur dünnen Grenze", () => {
  for (const s of [1, 2, 3]) {
    const z = bis(P, s), a = M.auswertung(z);
    assert.ok(z.fertig !== null && z.fertig < 80, String(z.fertig));
    assert.equal(a.schwarz, 0);
    assert.ok(a.grenze > 0.03 && a.grenze < 0.12, String(a.grenze));   // dünne Grenzlinien
    assert.ok(a.farben >= 45, String(a.farben));                       // jede Region behält ihre Farbe
  }
});
