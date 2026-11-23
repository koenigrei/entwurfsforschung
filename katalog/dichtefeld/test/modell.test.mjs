// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const nah = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const quadrat = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];

test("erzeuge: t = 0, Raster 1000/50 × 700/50 = 20 × 14 Zellen, noch nichts gerechnet", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.R.nx, 20); assert.equal(z.R.ny, 14);
  assert.ok(z.werte[0].every(v => Number.isNaN(v)));
  assert.ok(z.D.n > 500, "Stadt mit vielen Gebäuden");
});

test("Teilung wie Divide Domain²: Länge / Zellmaß gerundet, mindestens 1", () => {
  assert.equal(M.teilung(1000, 50), 20); assert.equal(M.teilung(1000, 30), 33); assert.equal(M.teilung(700, 45), 16);
  assert.equal(M.teilung(100, 500), 1); assert.equal(M.teilung(100, 260), 1);
  const R = M.raster(1000, 700, 30, 45); assert.ok(nah(R.cw, 1000 / 33)); assert.ok(nah(R.ch, 700 / 16));
  assert.deepEqual(M.zellMitte(M.raster(100, 100, 50, 50), 3), [75, 75]);
  assert.equal(M.zelleBei(M.raster(100, 100, 50, 50), [80, 10]), 1); assert.equal(M.zelleBei(M.raster(100, 100, 50, 50), [-1, 10]), -1);
});

test("GSI nachgerechnet: Summe der Grundflächen mit Schwerpunkt im Radius / (π R²)", () => {
  // drei Quadrate 10 × 10 m: Schwerpunkte 50 m, 149 m und 200 m vom Punkt (0, 0) entfernt
  const D = M.gebaeudeDaten([quadrat(45, -5, 10), quadrat(144, -5, 10), quadrat(195, -5, 10)]);
  assert.deepEqual(Array.from(D.a), [100, 100, 100]);
  const s = M.summeImRadius(D, [0, 0], 150);
  assert.equal(s.summe, 200); assert.equal(s.anzahl, 2);
  assert.ok(nah(M.gsi(D, [0, 0], 150), 200 / (Math.PI * 150 * 150)));
  assert.ok(nah(M.gsi(D, [0, 0], 250), 300 / (Math.PI * 250 * 250)));
});

test("„Smaller Than“: ein Schwerpunkt genau auf dem Radius zählt nicht; Radius 0 ergibt 0", () => {
  const D = M.gebaeudeDaten([quadrat(95, -5, 10)]);          // Schwerpunkt bei (100, 0)
  assert.equal(M.summeImRadius(D, [0, 0], 100).anzahl, 0);
  assert.equal(M.summeImRadius(D, [0, 0], 100.001).anzahl, 1);
  assert.equal(M.gsi(D, [0, 0], 0), 0);
});

test("kleiner Radius kann wie im Original über 1 liegen (großes Gebäude, Schwerpunkt im Kreis)", () => {
  const D = M.gebaeudeDaten([quadrat(-20, -20, 40)]);
  assert.ok(M.gsi(D, [0, 0], 10) > 1);
});

test("Schritt = eine Rasterzeile; fertig nach ny Schritten; Werte im Bereich", () => {
  const z = M.erzeuge(P, zufall(2));
  M.schritt(z, P);
  assert.equal(z.t, 1); assert.equal(z.zeile, 1);
  for (let i = 0; i < z.R.nx; i++) assert.ok(Number.isFinite(z.werte[0][i]) && Number.isFinite(z.werte[1][i]));
  assert.ok(Number.isNaN(z.werte[0][z.R.nx]));
  while (!M.fertig(z)) M.schritt(z, P);
  assert.equal(z.t, z.R.ny);
  const q = M.zellMitte(z.R, 37);
  assert.ok(nah(z.werte[0][37], M.gsi(z.D, q, P.radius)));
  M.schritt(z, P); assert.equal(z.t, z.R.ny + 1);   // weiterer Schritt zählt, rechnet nichts mehr
});

test("Radius ändern rechnet die fertigen Zeilen sofort neu; Zellmaß ändern setzt zurück", () => {
  const z = M.erzeuge(P, zufall(3));
  for (let i = 0; i < 3; i++) M.schritt(z, P);
  const p2 = Object.assign({}, P, { radius: 80 });
  M.aendere(z, p2, "radius");
  assert.ok(nah(z.werte[0][5], M.gsi(z.D, M.zellMitte(z.R, 5), 80)));
  assert.equal(z.t, 3);
  const p3 = Object.assign({}, p2, { zelleX: 25 });
  M.aendere(z, p3, "zelleX");
  assert.equal(z.t, 0); assert.equal(z.R.nx, 40);
});

test("erwartetes Verhalten (Katalogtext): größerer Radius glättet – geringere Streuung, Werte nahe am Gebietsmittel", () => {
  for (const s of [1, 4, 9]) {
    const z = M.erzeuge(P, zufall(s));
    while (!M.fertig(z)) M.schritt(z, P);
    const a = M.statistik(z, 0), b = M.statistik(z, 1);
    assert.ok(b.std < a.std * 0.8, `Saat ${s}: Streuung ${b.std} vs. ${a.std}`);
    assert.ok(b.max - b.min < a.max - a.min);
    assert.ok(a.max > 0 && a.max < 1.2);
  }
});

test("gewählte Zelle: gezählte Gebäude passen zur Summe", () => {
  const z = M.erzeuge(P, zufall(5));
  assert.ok(M.waehle(z, 100)); assert.ok(!M.waehle(z, -1));
  const idx = M.gezaehlte(z, 100, 150), s = M.summeImRadius(z.D, M.zellMitte(z.R, 100), 150);
  assert.equal(idx.length, s.anzahl);
  assert.ok(nah(idx.reduce((t, i) => t + z.D.a[i], 0), s.summe, 1e-6));
});

test("Farbverlauf: Griffe der .gh-Datei bei 0, 0,5 und 1", () => {
  assert.deepEqual(M.verlauf(0), [0, 61, 89]); assert.deepEqual(M.verlauf(0.5), [148, 193, 28]); assert.deepEqual(M.verlauf(1), [183, 26, 73]);
  assert.deepEqual(M.verlauf(2), [183, 26, 73]);
});

test("gleiche Saat → gleiche Stadt und Werte, andere Saat → andere", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); for (let i = 0; i < 5; i++) M.schritt(z, P); return Array.from(z.werte[0].slice(0, 5 * z.R.nx)); };
  assert.deepEqual(lauf(7), lauf(7));
  assert.notDeepEqual(lauf(7), lauf(8));
});
