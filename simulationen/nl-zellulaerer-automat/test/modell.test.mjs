// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD, B = Object.assign({}, M.STANDARD, M.BAU12, { fassung: "bau12" });
const lauf = (p, saat, n) => { const z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };
const bild = z => Array.from(z.state).join("");

test("Welt wie im GRAPHICS-WINDOW: 81 × 81 (02), 41 × 41 (12); setup-blank setzt nur patch 0 0", () => {
  assert.equal(M.erzeuge(P, zufall(1)).state.length, 81 * 81);
  assert.equal(M.erzeuge(B, zufall(1)).state.length, 41 * 41);
  const z = M.erzeuge(Object.assign({}, P, { setup: "blank" }), zufall(1));
  assert.equal(M.auswertung(z).blues, 1); assert.equal(z.state[40 * 81 + 40], 1);
});

test("setup-random: Anteil ≈ initial-density", () => {
  const a = M.auswertung(M.erzeuge(B, zufall(3))).ratioBlue;
  assert.ok(Math.abs(a - 0.5) < 0.04, String(a));
  const b = M.auswertung(M.erzeuge(P, zufall(3))).ratioBlue;
  assert.ok(b > 0.004 && b < 0.02, String(b));
});

test("counter: Moore-Nachbarschaft mit Torus", () => {
  const z = M.erzeuge(Object.assign({}, P, { setup: "blank", "screen-edge": 2 }), zufall(1));   // 5 × 5, Mitte (2, 2)
  z.state.fill(0); z.state[0] = 1;                                    // Ecke oben links
  M.zaehle(z);
  assert.equal(z.counter[1], 1); assert.equal(z.counter[5 + 1], 1);
  assert.equal(z.counter[24], 1);                                     // diagonal über den Rand
  assert.equal(z.counter[4], 1); assert.equal(z.counter[20], 1);
  assert.equal(z.counter[0], 0); assert.equal(z.counter[12], 0);
});

test("Regeln 02: Tod bei genA ≤ counter ≤ genB („and“), Geburt bei genC ≤ counter ≤ genD", () => {
  assert.equal(M.regel(1, 0, P), 1);                                  // ohne Nachbarn bleibt die Zelle
  assert.equal(M.regel(1, 1, P), 0); assert.equal(M.regel(1, 8, P), 0);
  assert.equal(M.regel(0, 0, P), 0); assert.equal(M.regel(0, 3, P), 1);
  const q = Object.assign({}, P, { genA: 2, genB: 3 });
  assert.equal(M.regel(1, 1, q), 1); assert.equal(M.regel(1, 4, q), 1); assert.equal(M.regel(1, 2, q), 0);
});

test("Regeln 12: Tod bei counter ≥ genA oder counter ≤ genB („or“), Geburt bei 1–3", () => {
  assert.equal(M.regel(1, 0, B), 0);                                  // vereinzelt
  assert.equal(M.regel(1, 7, B), 0); assert.equal(M.regel(1, 8, B), 0);   // überfüllt
  assert.equal(M.regel(1, 4, B), 1);
  assert.equal(M.regel(0, 3, B), 1); assert.equal(M.regel(0, 4, B), 0); assert.equal(M.regel(0, 0, B), 0);
});

test("synchron: aus einer Zelle (02, setup-blank) werden ihre acht Nachbarn, die Mitte bleibt", () => {
  const p = Object.assign({}, P, { setup: "blank" }), z = lauf(p, 1, 1);
  assert.equal(M.auswertung(z).blues, 9);
  const y = M.schritt(z, p);
  assert.equal(M.auswertung(y).blues, 16);                            // alle neun haben Nachbarn und sterben; geboren wird der Ring 5 × 5
  assert.equal(y.state[40 * 81 + 40], 0);
});

test("calc-ratio: greens = state 0, blues = state 1, ratio und ratio-blue", () => {
  const z = M.erzeuge(Object.assign({}, P, { setup: "blank", "screen-edge": 1 }), zufall(1));   // 3 × 3, eine Zelle
  assert.deepEqual(M.auswertung(z), { greens: 8, blues: 1, ratio: 8, ratioBlue: 1 / 9 });
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  assert.equal(bild(lauf(P, 7, 50)), bild(lauf(P, 7, 50)));
  assert.notEqual(bild(lauf(P, 7, 50)), bild(lauf(P, 8, 50)));
});

test("erwartetes Verhalten 02: Labyrinth aus Linien, das zwischen zwei Bildern wechselt (Anteil ≈ 50 %)", () => {
  for (const s of [1, 2, 3]) {
    const z = lauf(P, s, 200), a = M.auswertung(z).ratioBlue;
    assert.ok(a > 0.45 && a < 0.55, String(a));
    M.schritt(z, P); M.schritt(z, P);
    assert.ok(z.geaendert > 0);                                       // bleibt in Bewegung
    // Linienstruktur: viele Wechsel zwischen besetzt und leer entlang der Zeilen
    let wechsel = 0; for (let n = 1; n < z.state.length; n++) if (z.state[n] !== z.state[n - 1]) wechsel++;
    assert.ok(wechsel / z.state.length > 0.3, String(wechsel / z.state.length));
  }
});

test("erwartetes Verhalten 12: kommt zur Ruhe, gut die Hälfte der Fläche bebaut", () => {
  for (const s of [1, 2, 3]) {
    const z = lauf(B, s, 100), a = M.auswertung(z);
    assert.equal(z.geaendert, 0);                                     // stabile Bebauung
    assert.ok(a.ratioBlue > 0.5 && a.ratioBlue < 0.7, String(a.ratioBlue));
  }
});

test("Patches per Maus setzen und löschen", () => {
  const z = M.erzeuge(Object.assign({}, P, { setup: "blank" }), zufall(1));
  M.setze(z, 3.5, 2.2, 1); assert.equal(z.state[2 * 81 + 3], 1);
  M.setze(z, 3.5, 2.2, 0); assert.equal(z.state[2 * 81 + 3], 0);
  M.setze(z, -1, 2, 1); M.setze(z, 81, 2, 1);                         // außerhalb: nichts
  assert.equal(M.auswertung(z).blues, 1);
});
