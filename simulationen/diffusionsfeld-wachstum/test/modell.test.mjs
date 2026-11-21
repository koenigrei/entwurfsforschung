// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD, S = M.S;
const nah = (a, b, e = 1e-12) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);
const idx = (k, i) => i * S + k;
const lauf = (p, saat, n) => { const z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };

test("Feld wie im Original: 101 × 101 Zellen, Saat in (50, 50), Entfernungen in Bildpunkten", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.state.length, 101 * 101);
  assert.equal(z.t, 0); assert.equal(z.anzahl, 1);
  assert.equal(z.state[idx(50, 50)], 1);
  assert.equal(z.rDist, 4);                                   // rDist := cellScal
  assert.equal(M.DIST[idx(50, 50)], 0);
  assert.equal(M.DIST[idx(60, 50)], 40);                      // 10 Zellen · 4 px
  assert.equal(M.DIST[idx(53, 54)], 20);                      // 4 · √(9 + 16)
  assert.equal(M.DIST[idx(51, 51)], 6);                       // Round(4 · √2) = Round(5,66)
});

test("von-Neumann-Nachbarn mit Torus (checkNei)", () => {
  assert.deepEqual(Array.from(M.NB.slice(4 * idx(0, 0), 4 * idx(0, 0) + 4)), [idx(0, 1), idx(0, 100), idx(1, 0), idx(100, 0)]);
  const z = M.erzeuge(P, zufall(1));
  assert.equal(M.nachbarn(z, idx(50, 51)), 1);
  assert.equal(M.nachbarn(z, idx(51, 51)), 0);                // diagonal zählt nicht
});

test("infl_Field: P = 1 nur außerhalb von rDist + R · cellScal", () => {
  const z = M.erzeuge(P, zufall(1));
  M.einfluss(z, P);                                           // Grenze 4 + 20 · 4 = 84 px = 21 Zellen
  assert.equal(z.pot[idx(50 + 21, 50)], 0);                   // dist 84 → nicht größer
  assert.equal(z.pot[idx(50 + 22, 50)], 1);                   // dist 88
  assert.equal(z.pot[idx(0, 0)], 1);
  assert.equal(z.pot[idx(50, 50)], 0);
});

test("equiPot: Mittel der vier Nachbarn, gleichzeitig; entwickelte Zellen P = 0", () => {
  const z = M.erzeuge(P, zufall(1));
  z.pot[idx(10, 10)] = 1;
  M.ausgleich(z);
  nah(z.pot[idx(10, 10)], 0);                                  // keine Nachbarn mit Potential
  nah(z.pot[idx(10, 11)], 0.25); nah(z.pot[idx(11, 10)], 0.25);
  nah(z.pot[idx(11, 11)], 0);                                  // diagonal erst im zweiten Durchgang
  M.ausgleich(z);
  nah(z.pot[idx(10, 10)], 0.25);                               // 4 · 0,25 / 4
  nah(z.pot[idx(11, 11)], 0.125);                              // (0,25 + 0,25) / 4
  z.pot[idx(50, 51)] = 1; z.pot[idx(50, 50)] = 0.7;
  M.ausgleich(z); nah(z.pot[idx(50, 50)], 0);                  // Saat bleibt bei 0
});

test("dev_Cell: genau eine Randzelle, die mit dem größten P (ohne noise deterministisch)", () => {
  const p = Object.assign({}, P, { noise: 0 });
  const z = M.erzeuge(p, zufall(1));
  z.pot[idx(51, 50)] = 0.3; z.pot[idx(49, 50)] = 0.2; z.pot[idx(70, 70)] = 0.9;   // (70, 70) ist keine Randzelle
  assert.equal(M.entwickle(z, p), idx(51, 50));
  assert.equal(z.state[idx(51, 50)], 1); nah(z.pot[idx(51, 50)], 0);
  assert.equal(z.rDist, 4);                                    // dist 4 ist nicht größer als rDist 4
  z.pot[idx(52, 50)] = 0.5;
  assert.equal(M.entwickle(z, p), idx(52, 50));
  assert.equal(z.rDist, 8);
  // Gleichstand: die erste Randzelle in Lesereihenfolge (Zeilen von oben) gewinnt, wie mit „>“ im Original
  const g = M.erzeuge(p, zufall(1));
  assert.equal(M.entwickle(g, p), idx(50, 49));
});

test("noise: ε = random · noise wird zum Potential addiert", () => {
  const p = Object.assign({}, P, { noise: 5 });
  const z = M.erzeuge(p, zufall(1));
  z.zufall = () => 0.5;                                        // alle vier Randzellen gleich hoch → Potential entscheidet
  z.pot[idx(50, 51)] = 0.1;
  assert.equal(M.entwickle(z, p), idx(50, 51));
  const w = [0.1, 0.9, 0.2, 0.3]; let i = 0;                   // Reihenfolge: (50,49), (49,50), (51,50), (50,51)
  const y = M.erzeuge(p, zufall(1)); y.zufall = () => w[i++];
  assert.equal(M.entwickle(y, p), idx(49, 50));
});

test("ein Schritt = eine neue Zelle; Verlauf zählt mit", () => {
  const z = lauf(P, 3, 200);
  assert.equal(z.t, 200); assert.equal(z.anzahl, 201); assert.equal(z.verlauf.length, 201);
  assert.equal(z.verlauf[200], 201);
  let a = 0; for (const v of z.state) a += v; assert.equal(a, 201);
});

test("aging: entwickelte Zellen sterben nach „die with age“ Schritten; Grauwerte wie paint_Field", () => {
  const p = Object.assign({}, P, { aging: true, death: 50 });
  const z = lauf(p, 2, 120);
  assert.ok(z.anzahl <= 52 && z.anzahl >= 40, String(z.anzahl));   // nur die jüngsten Zellen leben noch
  for (let n = 0; n < z.state.length; n++) if (z.state[n]) assert.ok(z.t - 1 - z.birth[n] <= 50);
  const y = M.erzeuge(P, zufall(1)); y.age[idx(50, 50)] = 100;
  assert.equal(M.grau(y, idx(50, 50)), 50);                    // 0,5 · Alter
  y.pot[idx(0, 0)] = 1; assert.equal(M.grau(y, idx(0, 0)), 255);   // (1 + 0,5) · 170, begrenzt
  assert.equal(M.grau(y, idx(1, 1)), 85);                      // (0 + 0,5) · 170
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => Array.from(lauf(P, s, 150).state).join("");
  assert.equal(f(7), f(7));
  assert.notEqual(f(7), f(8));
});

test("erwartetes Verhalten: wenig noise → lineare, verästelte Struktur; viel noise → dichter Haufen", () => {
  for (const s of [1, 2, 3]) {
    const d = noise => M.auswertung(lauf(Object.assign({}, P, { noise }), s, 500)).dichte;
    const linear = d(0.5), standard = d(5), dicht = d(50);
    assert.ok(linear < standard && standard < dicht, `${linear} < ${standard} < ${dicht}`);
    assert.ok(linear < 0.08 && dicht > 0.3, `${linear} / ${dicht}`);
  }
});

test("erwartetes Verhalten: Wachstum eher am Rand – die Struktur reicht weit hinaus (Voreinstellung)", () => {
  for (const s of [1, 2, 3]) {
    const a = M.auswertung(lauf(P, s, 500));
    assert.ok(a.radius > 25 && a.dichte < 0.2, `r ${a.radius}, Dichte ${a.dichte}`);
  }
});
