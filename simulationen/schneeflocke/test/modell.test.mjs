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
const lauf = (p, n, z0) => { const z = z0 || M.erzeuge(p, zufall(1)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };

test("Anfang: P = β überall, Saat in (50, 50) mit P = 1 und D = 1", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.anzahl, 1);
  nah(z.pot[idx(0, 0)], 0.3); nah(z.pot[idx(50, 50)], 1);
  assert.equal(z.state[idx(50, 50)], 1);
  nah(M.GEWICHTE.programm[0] * 4 + M.GEWICHTE.programm[1] * 4, 1);   // Gewichte summieren sich zu 1
});

test("receptive: entwickelt oder entwickelte Zelle in der Moore-Nachbarschaft", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.ok(M.rezeptiv(z, idx(50, 50)));
  assert.ok(M.rezeptiv(z, idx(51, 51)));                    // diagonal zählt (Moore)
  assert.ok(M.rezeptiv(z, idx(50, 49)));
  assert.ok(!M.rezeptiv(z, idx(52, 50)));
  z.state[idx(0, 0)] = 1; assert.ok(M.rezeptiv(z, idx(100, 100)));   // Torus
});

test("equiPot nachgerechnet: rezeptive Zellen bekommen Zufluss und γ, nichtrezeptive mitteln (Programm-Gewichte)", () => {
  const z = M.erzeuge(P, zufall(1));
  M.ausgleich(z, P);
  // orthogonaler Nachbar der Saat (51, 50): rezeptiv, P_nonRec 0 → Zufluss von den nichtrezeptiven Nachbarn
  //   orthogonal (1/12): (52,50) 0,3; (50,50), (51,51), (51,49) rezeptiv → 0  ⇒ 0,3/12
  //   diagonal (1/6): (52,51), (52,49) 0,3; (50,51), (50,49) rezeptiv → 0      ⇒ 0,6/6
  nah(z.non[idx(51, 50)], 0.3 / 12 + 0.6 / 6);
  nah(z.rec[idx(51, 50)], 0.3 + 0.002);
  // weit weg: alles 0,3 → Mittel bleibt 0,3, kein γ
  nah(z.non[idx(10, 10)], 0.3); nah(z.rec[idx(10, 10)], 0);
  // Saat: rezeptiv mit P_rec 1 + γ
  nah(z.rec[idx(50, 50)], 1.002);
  M.entwickle(z);
  nah(z.pot[idx(51, 50)], 0.302 + 0.025 + 0.1);
});

test("Gewichte laut Beschreibung (orthogonal 1/6, diagonal 1/12) als Option", () => {
  const p = Object.assign({}, P, { gewichte: "beschreibung" }), z = M.erzeuge(p, zufall(1));
  M.ausgleich(z, p);
  nah(z.non[idx(51, 50)], 0.3 / 6 + 0.6 / 12);
});

test("γ nur, wenn P_rec > 0 (β = 0: rezeptive Randzellen ohne Potential wachsen nicht von selbst)", () => {
  const p = Object.assign({}, P, { beta: 0 }), z = lauf(p, 50);
  assert.equal(z.anzahl, 1);
  nah(z.pot[idx(51, 50)], 0);
});

test("Transition Rule: P ≥ 1 → entwickelt", () => {
  const z = M.erzeuge(P, zufall(1));
  z.non[idx(20, 20)] = 0.6; z.rec[idx(20, 20)] = 0.4; z.non[idx(21, 20)] = 0.99;
  assert.equal(M.entwickle(z), 1);                          // nur (20, 20) mit P = 1 genau; 0,99 reicht nicht
  assert.equal(z.state[idx(20, 20)], 1); assert.equal(z.state[idx(21, 20)], 0);
});

test("Zählen und Verlauf; deterministisch (kein Zufall, die Saat spielt keine Rolle)", () => {
  const z = lauf(P, 100);
  assert.equal(z.t, 100); assert.equal(z.verlauf.length, 101);
  let a = 0; for (const v of z.state) a += v; assert.equal(a, z.anzahl);
  const y = lauf(P, 100, M.erzeuge(P, zufall(99)));
  assert.equal(Array.from(y.state).join(""), Array.from(z.state).join(""));
});

test("Grauwerte wie paint_Field: entwickelt 255 − 25 · P, sonst 125 · P", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(M.grau(z, idx(50, 50)), 230);
  assert.equal(M.grau(z, idx(0, 0)), 38);                    // round(37,5) = 38
});

test("erwartetes Verhalten: symmetrischer Kristall mit Armen längs der Diagonalen (wie die Bilder der alten Seite)", () => {
  for (const g of ["programm", "beschreibung"]) {
    const p = Object.assign({}, P, { gewichte: g }), z = lauf(p, M.HALT), a = M.auswertung(z);
    assert.equal(a.symmetrie, 1);                             // vierzählig und spiegelsymmetrisch
    assert.ok(a.diagonale > 40 && a.achse < 5, `${g}: diagonal ${a.diagonale}, Achse ${a.achse}`);
    assert.ok(z.anzahl > 1000 && z.anzahl < 2500, String(z.anzahl));
  }
});

test("erwartetes Verhalten: größeres β oder γ → schnelleres, dichteres Wachstum", () => {
  const n = q => lauf(Object.assign({}, P, q), 300).anzahl;
  assert.ok(n({ beta: 0.2 }) < n({}) && n({}) < n({ beta: 0.5 }));
  assert.ok(n({}) < n({ gamma: 0.01 }));
});
