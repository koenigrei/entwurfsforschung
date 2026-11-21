// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD, S = M.S;
const nah = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);
const idx = (k, i) => i * S + k;
const mit = q => Object.assign({}, P, q);
const lauf = (p, saat, n) => { const z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };

test("Anfang: P = 0, eine Saat in (50, 50) mit P = 1; random seed: vier zufällige Saaten", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.anzahl, 1);
  assert.equal(z.state[idx(50, 50)], 1); nah(z.pot[idx(50, 50)], 1); nah(M.gesamtpotential(z), 1);
  const r = M.erzeuge(mit({ zufallsSaat: true }), zufall(5));
  assert.ok(r.anzahl >= 1 && r.anzahl <= 4); assert.equal(r.state[idx(50, 50)], 0);
});

test("equiPot nachgerechnet: ξ / (T − 1) · Σ w (P_k − P_i), orthogonal 1/6, diagonal 1/12", () => {
  const z = M.erzeuge(P, zufall(1));                         // T 5 → 4 Durchgänge mit Faktor 1/4
  M.ausgleich(z);
  nah(z.pot[idx(50, 50)], 1 + 0.25 * (-1));                  // Σ w · (0 − 1) = −1
  nah(z.pot[idx(51, 50)], 0.25 / 6);
  nah(z.pot[idx(51, 51)], 0.25 / 12);
  nah(M.gesamtpotential(z), 1);                               // Erhaltung
});

test("checkNei: orthogonal Gewicht 2, diagonal 1; nrD zählt alle entwickelten Nachbarn", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.deepEqual(M.nachbarn(z, idx(51, 50)), { summe: 2, nrD: 1 });
  assert.deepEqual(M.nachbarn(z, idx(51, 51)), { summe: 1, nrD: 1 });
  z.state[idx(52, 51)] = 1;
  assert.deepEqual(M.nachbarn(z, idx(51, 51)), { summe: 3, nrD: 2 });
  assert.deepEqual(M.nachbarn(z, idx(53, 50)), { summe: 1, nrD: 1 });
});

test("Schwelle: U (1 + δ ε) + θ (Σ w D − ς nrD); ς = 1,5 bevorzugt orthogonale Anlagerung", () => {
  nah(M.schwelle(P, 1.5, 2, 1, 0), 0.09 + 0.02 * 0.5);       // orthogonal: + 0,01
  nah(M.schwelle(P, 1.5, 1, 1, 0), 0.09 - 0.02 * 0.5);       // diagonal: − 0,01
  nah(M.schwelle(P, 1.5, 2, 1, -1), 0.09 * 0.6 + 0.01);
  nah(M.schwelle(P, 1.5, 2, 1, 1), 0.09 * 1.4 + 0.01);
});

test("dev_Cell: gleichzeitig, P + 1 je neuer Zelle (Gesamtpotential = Zahl der Zellen ohne Altern)", () => {
  const p = mit({ delta: 0 }), z = M.erzeuge(p, zufall(1));
  const k = M.entwickle(z, p);                                // alle 8 Nachbarn haben P = 0 ≤ Schwelle (orthogonal 0,1, diagonal 0,08)
  assert.equal(k, 8); assert.equal(z.state[idx(52, 50)], 0);  // keine Kettenreaktion im selben Schritt
  nah(z.pot[idx(51, 50)], 1);
  const y = lauf(P, 3, 150);
  nah(M.gesamtpotential(y), y.anzahl, 1e-6);
});

test("Grauwert: entwickelt weiß, Feld 255 · multi · P mit Überlauf (mod 256) wie Delphis RGB(Byte)", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(M.grau(z, idx(50, 50), P), 255);
  z.pot[idx(0, 0)] = 0.2; assert.equal(M.grau(z, idx(0, 0), P), 102);
  z.pot[idx(0, 0)] = 0.6; assert.equal(M.grau(z, idx(0, 0), P), 306 - 256);
  assert.equal(M.grau(z, idx(50, 50), mit({ nurFeld: true })), 510 % 256);   // just the field
  z.age[idx(50, 50)] = 100; assert.equal(M.grau(z, idx(50, 50), P), 205);
});

test("aging: entwickelte Zellen sterben nach „die at age“, unentwickelte bleiben unberührt", () => {
  const p = mit({ aging: true, death: 20 }), z = lauf(p, 1, 60);
  for (let n = 0; n < z.state.length; n++) if (z.state[n]) assert.ok(z.t - 1 - z.birth[n] <= 20);
  assert.ok(M.gesamtpotential(z) > 0);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => Array.from(lauf(P, s, 60).state).join("");
  assert.equal(f(7), f(7));
  assert.notEqual(f(7), f(8));
});

test("erwartetes Verhalten: ohne Rauschen (δ = 0) vierzählig symmetrisch", () => {
  const z = lauf(mit({ delta: 0 }), 1, 120), s = z.state;
  for (let i = 0; i < S; i++) for (let k = 0; k < S; k++) {
    const v = s[i * S + k];
    assert.equal(v, s[k * S + (S - 1 - i)]); assert.equal(v, s[i * S + (S - 1 - k)]);
  }
});

test("erwartetes Verhalten: Wachstum kommt zum Stillstand, sobald das Feld über U erwärmt ist; größeres U → größerer Kristall", () => {
  const z = lauf(P, 1, 400), a = z.anzahl;
  for (let i = 0; i < 100; i++) M.schritt(z, P);
  assert.equal(z.anzahl, a);                                   // fertig
  assert.ok(a > 800 && a < 3000, String(a));
  const n = U => lauf(mit({ U }), 2, 300).anzahl;
  assert.ok(n(0.06) < n(0.09) && n(0.09) < n(0.12));
});
