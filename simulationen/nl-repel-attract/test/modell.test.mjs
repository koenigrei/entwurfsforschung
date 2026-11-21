// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);
const nah = (a, b, e = 1e-9) => Math.abs(a - b) < e;

/** Zustand mit turtles an festen Orten [[x, y, heading], …] */
function feld(t) {
  const z = M.erzeuge(mit({ density: t.length }), zufall(1));
  t.forEach(([x, y, h], i) => { z.x[i] = x; z.y[i] = y; z.h[i] = h || 0; });
  return z;
}

test("Voreinstellungen aus den SLIDER-Blöcken, Welt 201 × 201", () => {
  assert.equal(P.density, 105);
  assert.equal(P.radius, 33);
  assert.equal(P["repel-strength"], 1.0);
  assert.equal(M.N, 201);
});

test("Torus: Koordinaten in [−100,5; 100,5), kürzeste Differenz über den Rand", () => {
  assert.equal(M.falte(101), -100);
  assert.equal(M.falte(-101), 100);
  assert.equal(M.falte(100.4), 100.4);
  assert.equal(M.falte(150), -51);
  assert.equal(M.diff(95, -95), 11);
  assert.equal(M.diff(-95, 95), -11);
  assert.equal(M.diff(0, 50), 50);
});

test("heading wie NetLogo: 0 = Norden, im Uhrzeigersinn; towards über den Rand", () => {
  assert.equal(M.richtung(0, 0, 0, 10), 0);
  assert.equal(M.richtung(0, 0, 10, 0), 90);
  assert.equal(M.richtung(0, 0, 0, -10), 180);
  assert.equal(M.richtung(0, 0, -10, 0), 270);
  assert.equal(M.richtung(95, 0, -95, 0), 90);           // kürzer über den rechten Rand
  assert.equal(M.richtung(3, 4, 3, 4), null);
});

test("attract: zum Ursprung drehen, außerhalb radius fd 1, innerhalb bk 1", () => {
  const z = feld([[0, 50], [0, 10]]);
  M.attract(z, P, 0); M.attract(z, P, 1);
  assert.equal(z.h[0], 180);
  assert.ok(nah(z.y[0], 49));                            // außerhalb: einen Schritt zum Ursprung
  assert.ok(nah(z.y[1], 11));                            // innerhalb: einen Schritt zurück
  const o = feld([[0, 0, 77]]); M.attract(o, P, 0);
  assert.equal(o.h[0], 77);                              // im Ursprung bleibt die Richtung, bk 1
  assert.ok(nah(Math.hypot(o.x[0], o.y[0]), 1));
});

test("repel: zur nächsten turtle drehen und repel-strength zurückgehen", () => {
  const z = feld([[0, 0], [3, 0], [-10, 0]]);
  assert.equal(M.naechste(z, 0), 1);
  M.repel(z, mit({ "repel-strength": 2 }), 0);
  assert.equal(z.h[0], 90);
  assert.ok(nah(z.x[0], -2) && nah(z.y[0], 0));
  const r = feld([[99, 0], [-99, 0]]);                   // nächste über den Rand: Abstand 3
  assert.ok(nah(M.abstand(r, 0, 1), 3));
  M.repel(r, P, 0);
  assert.ok(nah(r.x[0], 98));
  const g = feld([[5, 5, 30], [5, 5, 0]]);               // gleicher Punkt: Richtung bleibt (Original: Laufzeitfehler)
  M.repel(g, P, 0);
  assert.equal(g.h[0], 30);
});

test("setup: density turtles, keine zwei auf einem Patch, Patches ganzzahlig", () => {
  for (const s of [1, 2]) {
    const z = M.erzeuge(mit({ density: 300 }), zufall(s));
    const belegt = new Set();
    for (let i = 0; i < z.n; i++) {
      const k = M.patch(z.x[i]) + "," + M.patch(z.y[i]);
      assert.ok(!belegt.has(k), `doppelt ${k}`); belegt.add(k);
      assert.ok(z.x[i] >= -100.5 && z.x[i] < 100.5 && z.y[i] >= -100.5 && z.y[i] < 100.5);
      assert.ok(Number.isInteger(z.h[i]) && z.h[i] >= 0 && z.h[i] < 360);
    }
  }
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); for (let i = 0; i < 50; i++) M.schritt(z, P); return Array.from(z.x).join() + Array.from(z.y).join(); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});

test("nur attract: alle turtles sammeln sich auf dem Kreis mit radius", () => {
  for (const radius of [20, 33, 70]) {
    const p = mit({ repel: false, radius }), z = M.erzeuge(p, zufall(3));
    for (let i = 0; i < 300; i++) M.schritt(z, p);
    const a = M.auswertung(z);
    assert.ok(Math.abs(a.mitte - radius) < 1 && a.streuung < 1, `radius ${radius}: ${a.mitte} ± ${a.streuung}`);
  }
});

test("nur repel: die turtles verteilen sich gleichmäßig über die Welt", () => {
  const p = mit({ attract: false }), z = M.erzeuge(p, zufall(1));
  const vor = M.auswertung(z);
  for (let i = 0; i < 300; i++) M.schritt(z, p);
  const a = M.auswertung(z), gleich = Math.sqrt(201 * 201 / z.n);   // Abstand bei gleichmäßiger Verteilung ≈ 19,6
  assert.ok(a.nn > vor.nn * 1.5 && Math.abs(a.nn - gleich) < 2.5, `nn ${a.nn}`);
  assert.ok(a.nnStreuung < 0.15 * a.nn && a.nnMin > 0.8 * a.nn);
});

test("attract und repel zusammen: Kreis mit größeren Abständen als ohne repel", () => {
  const beide = P, nurA = mit({ repel: false });
  const a = M.erzeuge(beide, zufall(1)), b = M.erzeuge(nurA, zufall(1));
  for (let i = 0; i < 500; i++) { M.schritt(a, beide); M.schritt(b, nurA); }
  const ea = M.auswertung(a), eb = M.auswertung(b);
  assert.ok(Math.abs(ea.mitte - P.radius) < 6);
  assert.ok(ea.nn > 2 * eb.nn && ea.nnMin > eb.nnMin);
});
