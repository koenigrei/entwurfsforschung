// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const F580 = { fassung: "strassen", radius: 5, schwelle: 30, toleranz: "gleich", miete: false };
const mit = q => Object.assign({}, P, q);

/** leerer Zustand, Agenten [[x, y, typ], …] von Hand gesetzt */
function feld(agenten, q = {}) {
  const p = mit({ anzahl: 0, ...q }), z = M.erzeuge(p, zufall(1));
  z.nMax = agenten.length;
  for (const k of ["x", "y"]) z[k] = new Int16Array(z.nMax);
  z.typ = new Uint8Array(z.nMax); z.budget = new Float32Array(z.nMax); z.halt = new Uint8Array(z.nMax); z.sati = new Float32Array(z.nMax);
  agenten.forEach(([x, y, t], i) => { z.x[i] = x; z.y[i] = y; z.typ[i] = t; z.budget[i] = M.budget(t, p); const c = y * 116 + x; z.zelle[c] = i; z.zelltyp[c] = t; });
  z.n = agenten.length;
  return { z, p };
}

test("Voreinstellungen aus CellForm.dfm (550) und Feldgröße", () => {
  assert.equal(P.anzahl, 12000);
  assert.equal(P.gruppen, 6);
  assert.equal(P.radius, 2);
  assert.equal(P.weite, 54);
  assert.equal(P.schwelle, 100);
  assert.equal(P.abneigungUnten, 20);          // UpD_toInfer −20
  assert.equal(P.stopp, 500);
  assert.equal(M.SPALTEN, 116);                // round(694 / 6)
});

test("Sprung rndN(−d−1, d) liefert −d−1 … d+1", () => {
  const r = zufall(2), seen = new Set();
  for (let i = 0; i < 20000; i++) seen.add(M.sprung(r, 3));
  assert.deepEqual([...seen].sort((a, b) => a - b), [-4, -3, -2, -1, 0, 1, 2, 3, 4]);
});

test("Mieten und Budgets der Gruppen (rentGroupsCreate, setupAgents)", () => {
  const p = mit({});
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(t => +M.gruppenMiete(t, p).toFixed(2)), [-1, -0.6, -0.2, 0.2, 0.6, 1]);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(t => +M.budget(t, p).toFixed(3)), [-0.667, -0.333, 0, 0.333, 0.667, 1]);
});

test("Toleranztabelle: 20 % Abneigung je Stufe gegenüber niedrigeren Gruppen (ToleranZ.setValues)", () => {
  const tol = M.toleranzen(mit({}));          // n = 25
  assert.deepEqual(tol[1], [25, 25, 25, 25, 25, 25, 25]);
  assert.deepEqual(tol[3], [25, 15, 20, 25, 25, 25, 25]);   // Gruppe 1: 40 % → 15, Gruppe 2: 20 % → 25 − round(0,2 · 25) = 20
  assert.deepEqual(tol[6], [25, 0, 5, 10, 15, 20, 25]);     // Gruppe 1: 100 % → keiner erlaubt
});

test("individuelle Toleranz: Überschuss über die Toleranz senkt die Zufriedenheit", () => {
  // Agent der Gruppe 6 bei (10,10), sechs Nachbarn der Gruppe 5 (erlaubt 20) und zwei der Gruppe 1 (erlaubt 0)
  const A = [[10, 10, 6], [9, 9, 5], [10, 9, 5], [11, 9, 5], [9, 10, 5], [11, 10, 5], [9, 11, 5], [10, 11, 1], [11, 11, 1]];
  const { z, p } = feld(A);
  assert.equal(M.zufriedenheit(z, p, 10, 10, 6), (25 - 2) / 25 * 100);
  assert.equal(M.zufriedenheit(z, p, 10, 10, 1), 100);      // Gruppe 1 duldet alle
  assert.equal(M.zufriedenheit(z, p, 0, 0, 6), 100);         // Ecke: Nachbarschaft ohne Torus, nur 9 Zellen, alle frei
});

test("gleiche Toleranz: Anteil gleicher mit Gewichten, die Zelle selbst zählt mit, freie Zellen nach Wahl", () => {
  const A = [[10, 10, 1], [11, 10, 1], [9, 10, 2], [10, 11, 2], [10, 9, 2]];
  const { z, p } = feld(A, { ...F580, radius: 1 });
  assert.equal(M.zufriedenheit(z, p, 10, 10, 1), 2 / 5 * 100);
  assert.equal(M.zufriedenheit(z, { ...p, freie: "anders" }, 10, 10, 1), 2 / 9 * 100);
  assert.equal(M.zufriedenheit(z, { ...p, freie: "gleich" }, 10, 10, 1), 6 / 9 * 100);
  // alter Ort gilt als frei: Agent 0 denkt sich nach (12,10)
  assert.equal(M.zufriedenheit(z, p, 12, 10, 1, 10 * 116 + 10), 100);
});

test("kommunikative Straße erhöht das Gewicht der angrenzenden Zellen, eine Barriere senkt es zwischen Zellpaaren", () => {
  const A = [[10, 10, 1], [10, 12, 1], [12, 10, 2]];
  const { z, p } = feld(A, { ...F580, radius: 2 });
  assert.equal(M.zufriedenheit(z, p, 10, 10, 1), 2 / 3 * 100);
  M.setzeStrassen(z, [{ a: [13, 5], b: [13, 15], typ: 3 }], p);          // +3 neben (12,10) → Gewicht 8
  assert.equal(z.gewicht[10 * 116 + 12], 8);
  assert.equal(z.strasse[10 * 116 + 13], 3);
  assert.ok(Math.abs(M.zufriedenheit(z, p, 10, 10, 1) - 2 / 10 * 100) < 1e-9);
  M.setzeStrassen(z, [{ a: [11, 5], b: [11, 15], typ: -3 }], p);         // Barriere −3 zwischen (10,10) und (12,10) → Gewicht 0
  assert.equal(M.zufriedenheit(z, p, 10, 10, 1), 100);
});

test("Schnitt von Strecken und Übertragung einer Straße in das Raster (Intersect, transLine)", () => {
  assert.equal(M.schneidet(0, 0, 4, 4, 0, 4, 4, 0), true);
  assert.equal(M.schneidet(0, 0, 4, 0, 0, 1, 4, 1), false);   // parallel
  assert.equal(M.schneidet(0, 0, 2, 2, 2, 2, 4, 0), false);   // Berührung am Endpunkt
  const zellen = M.strassenZellen([0, 0], [5, 3], 116, 116);
  assert.deepEqual(zellen[0], [0, 0]); assert.deepEqual(zellen[zellen.length - 1], [5, 3]);
  assert.equal(zellen.length, 9);                              // 4er-Nachbarschaft: |dx| + |dy| + 1
  for (let i = 1; i < zellen.length; i++) assert.equal(Math.abs(zellen[i][0] - zellen[i - 1][0]) + Math.abs(zellen[i][1] - zellen[i - 1][1]), 1);
});

test("Diffusion: Mittel der acht Nachbarn, Summe bleibt erhalten (Torus)", () => {
  const z = M.erzeuge(mit({ anzahl: 0 }), zufall(1));
  z.miete[50 * 116 + 50] = 8;
  M.diffundiere(z);
  assert.equal(z.miete[50 * 116 + 50], 0);
  assert.equal(z.miete[49 * 116 + 51], 1);
  assert.ok(Math.abs(z.miete.reduce((s, v) => s + v, 0) - 8) < 1e-9);
});

test("Zufrieden-Bedingung: 550 mit ≥ und Miete < Budget, 580 mit >", () => {
  assert.equal(M.bleibt(100, 0.5, 0.667, mit({})), true);
  assert.equal(M.bleibt(100, 0.7, 0.667, mit({})), false);
  assert.equal(M.bleibt(30, 5, 0, mit(F580)), false);
  assert.equal(M.bleibt(31, 5, 0, mit(F580)), true);
});

test("Setup: Agenten auf freien Zellen ohne Straßen, höchstens einer je Zelle", () => {
  const L = [{ a: [0, 20], b: [115, 20], typ: 3 }];
  const z = M.erzeuge(mit({ linien: L }), zufall(3));
  assert.equal(z.n, 12000);
  const belegt = new Set();
  for (let i = 0; i < z.n; i++) { const c = z.y[i] * 116 + z.x[i]; assert.ok(!belegt.has(c)); belegt.add(c); assert.equal(z.strasse[c], 0); }
  M.schritt(z, mit({ linien: L }));
  for (let i = 0; i < z.n; i++) assert.equal(z.zelle[z.y[i] * 116 + z.x[i]], i);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const p = mit({ anzahl: 3000 }), z = M.erzeuge(p, zufall(s)); for (let i = 0; i < 10; i++) M.schritt(z, p); return Array.from(z.x).join() + Array.from(z.miete).join(); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});

test("Fassung 550: Segregation nach Gruppen steigt, ärmere Gruppen wohnen billiger", () => {
  const z = M.erzeuge(P, zufall(1)), s0 = M.segregationsindex(z);
  for (let i = 0; i < 150; i++) M.schritt(z, P);
  assert.ok(M.segregationsindex(z) > s0 + 20, `Index ${s0} → ${M.segregationsindex(z)}`);
  const m = M.mieteJeGruppe(z);
  for (let g = 1; g < m.length; g++) assert.ok(m[g] > m[g - 1], `Miete ${m.join(" ")}`);
});

test("Fassung 580: Segregation steigt, das Feld kommt zur Ruhe", () => {
  const p = mit(F580), z = M.erzeuge(p, zufall(1)), s0 = M.segregationsindex(z);
  for (let i = 0; i < 300 && z.fertig == null; i++) M.schritt(z, p);
  assert.ok(z.fertig != null && z.fertig < 300);
  assert.ok(M.segregationsindex(z) > s0 + 40);
});

test("Wachstum: 100 Agenten zu Beginn, 10 je Schritt", () => {
  const p = mit({ wachstum: true }), z = M.erzeuge(p, zufall(1));
  assert.equal(z.n, 100);
  for (let i = 0; i < 5; i++) M.schritt(z, p);
  assert.equal(z.n, 150);
});
