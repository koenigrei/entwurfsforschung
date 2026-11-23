// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const nah = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const QUADRAT = [[0, 0], [10, 0], [10, 10], [0, 10]];
const RECHTECK = [[0, 0], [30, 0], [30, 10], [0, 10]];

test("erzeuge: t = 0, Blöcke gegen den Uhrzeigersinn, Plan mit (n − 1) Schnitten je Block", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.t, 0);
  assert.ok(z.bloecke.length >= 15);
  assert.ok(z.bloecke.every(b => Geo.flaecheS(b.poly) > 0));
  assert.equal(z.plan.length, z.bloecke.length * (M.STANDARD.n - 1));
});

test("Flächenliste: Range → Consecutive Domains → Remap ergibt k / (1 + … + s), Summe 1", () => {
  const f = M.flaechenListe(7);
  assert.equal(f.length, 7);
  f.forEach((x, k) => nah(x, (k + 1) / 28, 1e-12));
  nah(f.reduce((a, b) => a + b, 0), 1, 1e-12);
  assert.deepEqual(M.flaechenListe(0), []);
  assert.deepEqual(M.flaechenListe(1), [1]);
});

test("Richtung: längste Kante × Z", () => {
  const d = M.richtungVonLaengsterKante(RECHTECK);       // längste Kante (0,0)→(30,0) → (0, −1)
  nah(d[0], 0); nah(d[1], -1);
});

test("Linienschar: abgetrennte Fläche ist genau T", () => {
  const f = M.schar(RECHTECK, 0, 2, 120);                 // Kante 0 unten, Kante 2 oben; Seite zwischen = rechts
  for (const u of [0, 0.25, 0.5]) {
    const k = f(u); assert.ok(k);
    const [zw] = M.teileAn(RECHTECK, 0, 2, k.pA, k.pB);
    nah(Geo.flaeche(zw), 120, 1e-9);
  }
});

test("Schnitt im Quadrat: Hälfte mit Linie der Länge 10; im Rechteck 3 Streifen zu 100 m²", () => {
  const s = M.schneide(QUADRAT, 50);
  nah(s.laenge, 10, 1e-6); nah(Geo.flaeche(s.parzelle), 50); nah(Geo.flaeche(s.rest), 50);
  const r = M.parzelliere(RECHTECK, { n: 3 });
  assert.equal(r.parzellen.length, 3);
  r.parzellen.forEach(q => nah(Geo.flaeche(q), 100, 1e-6));
  r.linien.forEach(l => nah(Geo.abstand(l[0], l[1]), 10, 1e-4));   // kürzeste Schnitte quer
});

test("kürzester Schnitt: im Trapez wird nicht die lange Diagonale gewählt", () => {
  const T = [[0, 0], [40, 0], [30, 10], [10, 10]], A = Geo.flaeche(T);
  const s = M.schneide(T, A / 4);
  assert.ok(s.laenge < 12, `Schnitt ${s.laenge}`);
  nah(Geo.flaeche(s.parzelle), A / 4, 1e-6);
});

test("Vektorrichtung: Schnitte parallel zu dir, auch wenn ein anderer kürzer wäre", () => {
  // Trapez mit schräger längster Kante (40, 30) → (0, 10): dir steht senkrecht auf ihr
  const P = [[0, 0], [40, 0], [40, 30], [0, 10]], A = Geo.flaeche(P);
  const r = M.parzelliere(P, { option: "vektor", n: 2 }), e = Geo.norm([-40, -20]);
  const l = r.linien[0], d = Geo.norm([l[1][0] - l[0][0], l[1][1] - l[0][1]]);
  nah(Math.abs(d[0] * e[0] + d[1] * e[1]), 0, 1e-3);      // Schnitt quer zur längsten Kante
  r.parzellen.forEach(q => nah(Geo.flaeche(q), A / 2, 1e-6));
  const g = M.parzelliere(P, { option: "greedy", n: 2 });
  const lg = Geo.abstand(g.linien[0][0], g.linien[0][1]), lv = Geo.abstand(l[0], l[1]);
  assert.ok(lg < lv - 0.5, `kürzester ${lg} < Vektor ${lv}`);
});

test("Individual Area: Flächen im Verhältnis 1 : 2 : 3", () => {
  const r = M.parzelliere(RECHTECK, { option: "liste", stufen: 3 });
  assert.deepEqual(r.parzellen.map(q => Math.round(Geo.flaeche(q))), [50, 100, 150]);
});

test("Grenzfälle: n < 2 teilt nicht, Dreieck lässt sich nicht teilen, Zielfläche ≥ Fläche → null", () => {
  assert.equal(M.parzelliere(QUADRAT, { n: 1 }).parzellen.length, 1);
  assert.equal(M.parzelliere(QUADRAT, { n: 0 }).parzellen.length, 1);
  assert.equal(M.schneide([[0, 0], [10, 0], [0, 10]], 10), null);
  assert.equal(M.schneide(QUADRAT, 100), null);
  assert.equal(M.zielflaechen(100, { option: "liste", stufen: 0 }).length, 0);
});

test("Gültigkeit: Linie durch die Kerbe eines L-Polygons ist ungültig", () => {
  const L = [[0, 0], [20, 0], [20, 10], [10, 10], [10, 20], [0, 20]];
  assert.equal(M.gueltig(L, 1, 4, [20, 5], [5, 20]), false);   // läuft außerhalb
  assert.equal(M.gueltig(L, 0, 5, [5, 0], [0, 5]), true);
});

test("Ablauf: Schritt = ein Schnitt, am Ende hat jeder Block n gleich große Parzellen (Katalog: parcels of specified area)", () => {
  const p = Object.assign({}, M.STANDARD), z = M.erzeuge(p, zufall(2));
  M.schritt(z, p);
  assert.equal(z.t, 1);
  assert.equal(z.bloecke[0].parzellen.length, 1);
  while (!M.fertig(z)) M.schritt(z, p);
  for (const b of z.bloecke) {
    const q = M.parzellenVon(b);
    assert.equal(q.length, p.n);
    q.forEach(x => nah(Geo.flaeche(x), b.A / p.n, b.A * 1e-6));
    nah(q.reduce((s, x) => s + Geo.flaeche(x), 0), b.A, b.A * 1e-9);
  }
});

test("Wiederholbarkeit: gleiche Saat gleiches Ergebnis, andere Saat anderes", () => {
  const lauf = s => { const z = M.erzeuge({}, zufall(s)); for (let i = 0; i < 30; i++) M.schritt(z, {}); return z.bloecke.map(b => b.linien); };
  assert.deepEqual(lauf(5), lauf(5));
  assert.notDeepEqual(lauf(5), lauf(6));
});

test("Klick: Block unter dem Punkt", () => {
  const z = M.erzeuge({}, zufall(3)), c = Geo.schwerpunkt(z.bloecke[4].poly);
  assert.equal(M.blockBei(z, c), 4);
  assert.equal(M.blockBei(z, [-5, -5]), -1);
});
