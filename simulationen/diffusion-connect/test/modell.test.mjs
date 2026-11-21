// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD, N = M.N;
const mit = q => Object.assign({}, P, q);

/** Zustand mit Agenten an festen Zellen [[x, y, heading], …] */
function feld(agenten) {
  const z = M.erzeuge(mit({ anzahl: agenten.length }), zufall(1));
  agenten.forEach(([x, y, h], i) => { z.x[i] = x; z.y[i] = y; z.h[i] = h; });
  return z;
}
const laufBisRuhe = (p, s, max = 4000) => { const z = M.erzeuge(p, zufall(s)); for (let i = 0; i < max && z.anzahlFrei > 0; i++) M.schritt(z, p); return z; };

test("Voreinstellungen aus CellForm.dfm/.pas", () => {
  assert.equal(N, 135);                                  // round(404 / cellScal 3)
  assert.equal(P.schwelle, 7);
  assert.equal(P.anzahl, 2000);
});

test("rndN(−2, 2) liefert −2 … 3 wie im Original, Torus klappt um", () => {
  const r = zufall(4), seen = new Map();
  for (let i = 0; i < 30000; i++) { const v = M.rndN(r, -2, 2); seen.set(v, (seen.get(v) || 0) + 1); }
  assert.deepEqual([...seen.keys()].sort((a, b) => a - b), [-2, -1, 0, 1, 2, 3]);
  assert.ok(seen.get(-2) < seen.get(0) * 0.6 && seen.get(3) < seen.get(0) * 0.6);   // Ränder nur halb so oft (Rundung)
  assert.deepEqual([M.torus(-1), M.torus(N), M.torus(5)], [N - 1, 0, 5]);
});

test("Schritt aus der Richtung: round(sin), round(cos) – im Original mit Grad als Bogenmaß", () => {
  assert.deepEqual(M.schrittVon(90, true), [1, 0]);
  assert.deepEqual(M.schrittVon(45, true), [1, 1]);
  assert.deepEqual(M.schrittVon(180, true), [0, -1]);
  assert.deepEqual(M.schrittVon(90, false), [1, 0]);     // sin(90 rad) = 0,89, cos(90 rad) = −0,45
  assert.deepEqual(M.schrittVon(45, false), [1, 1]);     // sin(45 rad) = 0,85, cos(45 rad) = 0,53
  assert.deepEqual(M.schrittVon(180, false), [-1, -1]);  // sin(180 rad) = −0,80, cos(180 rad) = −0,60
  for (let h = -3600; h <= 3600; h += 45) {               // nie Stillstand: mindestens eine Achse ±1
    const [a, b] = M.schrittVon(h, false);
    assert.ok(Math.abs(a) + Math.abs(b) >= 1 && Math.abs(a) <= 1 && Math.abs(b) <= 1);
  }
});

test("Moore-Summe schließt die Zelle selbst ein, über den Rand (Torus)", () => {
  const z = feld([[0, 0, 0], [N - 1, N - 1, 0], [1, 0, 0], [5, 5, 0]]);
  for (let i = 0; i < z.n; i++) z.state[z.y[i] * N + z.x[i]] += 1;
  assert.equal(M.nachbarSumme(z, 0, 0), 3);
  assert.equal(M.nachbarSumme(z, 5, 5), 1);
  assert.equal(M.nachbarSumme(z, 7, 7), 0);
});

test("Anlagerung: Summe > Schwellenwert, Zelle unentwickelt, mindestens ein Agent darauf", () => {
  const block = []; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) block.push([50 + u, 50 + v, 0]);
  const c = (x, y) => y * N + x;
  const z = feld(block); z.frei.fill(0);                  // stehen lassen: je Zelle ein Agent
  M.schritt(z, mit({ schwelle: 7 }));
  assert.equal(z.entw[c(50, 50)], 1);                     // Mitte: Summe 9 > 7
  assert.equal(z.entw[c(51, 50)], 0);                     // Kante: Summe 6
  assert.equal(z.entw[c(51, 51)], 0);                     // Ecke: Summe 4
  assert.equal(z.frei.reduce((s, v) => s + v, 0), 0);
  const w = feld(block); w.frei.fill(0);
  M.schritt(w, mit({ schwelle: 5 }));
  assert.deepEqual([w.entw[c(50, 50)], w.entw[c(51, 50)], w.entw[c(49, 50)], w.entw[c(51, 51)]], [1, 1, 1, 0]);
  const ring = block.filter(([x, y]) => !(x === 50 && y === 50));   // acht um eine leere Mitte: Summe 8 > 7, aber kein Agent darauf
  const r = feld(ring); r.frei.fill(0);
  M.schritt(r, mit({ schwelle: 7 }));
  assert.equal(r.entw[c(50, 50)], 0);
  assert.equal(M.entwickelt(r), 0);
});

test("entwickelte Zellen zählen weiter, ihre Agenten sind angelagert und bewegen sich nicht mehr", () => {
  const pos = []; for (let k = 0; k < 9; k++) pos.push([20, 20, 0]);   // neun Agenten auf einer Zelle: Summe 9 > 7
  const z = feld(pos);
  z.frei.fill(0);                                         // stehen bleiben lassen, damit sie sicher auf der Zelle sind
  M.schritt(z, P);
  const c = 20 * N + 20;
  assert.equal(z.entw[c], 1);
  assert.equal(z.state[c], 9);
  M.schritt(z, P); M.schritt(z, P);
  assert.equal(z.state[c], 27);                           // State wird für entwickelte Zellen nicht zurückgesetzt
  assert.ok(Array.from(z.x).every(v => v === 20));
});

test("ein freier Agent neben einem Cluster lagert sich an", () => {
  const pos = []; for (let k = 0; k < 9; k++) pos.push([20, 20, 0]);
  pos.push([30, 30, 0]);
  const z = feld(pos); z.frei.fill(0); z.frei[9] = 1;
  M.schritt(z, P);                                        // Cluster bei (20, 20) entsteht
  z.x[9] = 22; z.y[9] = 20; z.h[9] = 0;                   // Agent zwei Zellen daneben: Schritt führt in die Nachbarschaft
  let n = 0;
  while (z.frei[9] && n++ < 200) M.schritt(z, P);
  assert.equal(z.frei[9], 0);
  assert.ok(z.entw[z.y[9] * N + z.x[9]] === 1);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); for (let i = 0; i < 200; i++) M.schritt(z, P); return Array.from(z.x).join() + Array.from(z.entw).join(""); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});

test("Voreinstellung: alle Agenten lagern sich in einzelnen Clustern an, die Kurve der freien Agenten fällt", () => {
  for (const s of [1, 2, 3]) {
    const z = laufBisRuhe(P, s);
    assert.equal(z.anzahlFrei, 0, `Saat ${s}`);
    const [zahl, groesst] = M.cluster(z);
    assert.ok(zahl >= 5 && zahl <= 30, `Saat ${s}: ${zahl} Cluster`);
    assert.ok(groesst > 100, `größter ${groesst}`);
    assert.equal(z.verlauf[0], 2000);
    assert.ok(z.verlauf[300] < z.verlauf[1]);
  }
});

test("höherer Schwellenwert → weniger Cluster; mehr Agenten → mehr Cluster (Beschreibung des Originals)", () => {
  const cl = q => M.cluster(laufBisRuhe(mit(q), 1, 6000))[0];
  assert.ok(cl({ schwelle: 5 }) > cl({ schwelle: 7 }));
  assert.ok(cl({ schwelle: 6 }) > cl({ schwelle: 8 }));
  assert.ok(cl({ anzahl: 4000 }) > cl({ anzahl: 2000 }));
});

test("korrigierte Richtung: auch dann wachsen Cluster und alle Agenten lagern sich an", () => {
  const z = laufBisRuhe(mit({ korrigiert: true }), 1);
  assert.equal(z.anzahlFrei, 0);
  assert.ok(M.cluster(z)[0] >= 5);
});
