// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);

test("Voreinstellungen aus den SLIDER-Blöcken, Welt 201 × 201", () => {
  assert.deepEqual([P.anzahl, P.farben, P.startfarbe], [132, 14, 5]);
  assert.equal(M.SEITE, 201);
});

test("Territoriumsfarben: wrap-color (start + k · 140 / number-of-colors)", () => {
  assert.equal(M.territoriumsfarbe(5, 0, 14), 5);
  assert.equal(M.territoriumsfarbe(5, 3, 14), 35);
  assert.equal(M.territoriumsfarbe(5, 14, 14), 5);           // 145 → 5
  assert.equal(M.territoriumsfarbe(5, 131, 14), 55);            // 1315 mod 140
  const z = M.erzeuge(P, zufall(1));
  assert.deepEqual(z.farben, [5, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135]);
});

test("Torus und Patch eines Punkts (gerundete Koordinate)", () => {
  assert.equal(M.falte(150), -51);
  assert.equal(M.falte(-100.6), 100.4);
  assert.equal(M.patch(0, 0), 100 * 201 + 100);
  assert.equal(M.patch(0.49, -0.49), 100 * 201 + 100);
  assert.equal(M.patch(100.4, 100.4), 0 * 201 + 200);
});

test("Heimat ganzzahlig im Feld, Richtung ganzzahlig, zu Beginn ist nichts gefärbt", () => {
  const z = M.erzeuge(P, zufall(3));
  for (let i = 0; i < z.n; i++) {
    assert.ok(Number.isInteger(z.hx[i]) && Math.abs(z.hx[i]) <= 100 && Number.isInteger(z.hy[i]));
    assert.ok(Number.isInteger(z.h[i]) && z.h[i] >= 0 && z.h[i] < 360);
  }
  assert.ok(z.mark.every(v => v === M.LEER));
});

test("Regel: fremder Patch → färben, heim, drehen; eigener Patch → forward 1", () => {
  const z = M.erzeuge(mit({ anzahl: 1 }), zufall(2));
  z.hx[0] = z.x[0] = 10; z.hy[0] = z.y[0] = -20; z.h[0] = 90; z.tMark[0] = 45;
  M.bewege(z, 0);                                            // Heimat noch ohne Farbe → färben, Richtung zufällig
  assert.equal(z.mark[M.patch(10, -20)], 45);
  assert.deepEqual([z.x[0], z.y[0]], [10, -20]);
  z.h[0] = 90;
  M.bewege(z, 0);                                            // eigener Patch → einen Schritt nach Osten
  assert.ok(Math.abs(z.x[0] - 11) < 1e-9 && Math.abs(z.y[0] + 20) < 1e-9);
  z.mark[M.patch(11, -20)] = 105;                            // fremde Farbe
  M.bewege(z, 0);
  assert.equal(z.mark[M.patch(11, -20)], 45);                // übernommen
  assert.deepEqual([z.x[0], z.y[0]], [10, -20]);             // zurück zur Heimat
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); for (let i = 0; i < 200; i++) M.schritt(z, P); return Array.from(z.mark).join(); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});

test("Territorien wachsen und teilen die Fläche; Grenzen bleiben umkämpft", () => {
  const z = M.erzeuge(P, zufall(1));
  for (let i = 0; i < 3000; i++) M.schritt(z, P);
  const a = z.verlauf[z.verlauf.length - 1];
  assert.ok(z.gefaerbt / z.mark.length > 0.6);
  assert.equal(a.filter(v => v > 0).length, 14);
  assert.ok(Math.max(...a) < 0.3);                           // keine Farbe beherrscht das Feld
  // Kampf: gefärbte Patches wechseln auch später noch die Farbe
  const vor = Float32Array.from(z.mark);
  for (let i = 0; i < 50; i++) M.schritt(z, P);
  let wechsel = 0; for (let c = 0; c < vor.length; c++) if (vor[c] !== M.LEER && vor[c] !== z.mark[c]) wechsel++;
  assert.ok(wechsel > 20, `Wechsel ${wechsel}`);
});

test("Fläche je Farbe summiert sich zum gefärbten Anteil", () => {
  const z = M.erzeuge(P, zufall(4));
  for (let i = 0; i < 300; i++) M.schritt(z, P);
  const s = M.flaechen(z).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(s - z.gefaerbt / z.mark.length) < 1e-9);
});
