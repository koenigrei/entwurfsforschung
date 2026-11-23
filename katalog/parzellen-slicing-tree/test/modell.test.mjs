// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const nah = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const BLOCK = [[0, 0], [120, 0], [120, 90], [0, 90]];
const P = Object.assign({}, M.STANDARD);
const W = M.kantenVon(BLOCK);

test("erzeuge: t = 0, Schnittreihenfolge nach Ebenen, gewählt ist der größte Block", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.t, 0);
  for (let i = 1; i < z.schnitte.length; i++) assert.ok(z.schnitte[i][0] >= z.schnitte[i - 1][0]);
  assert.ok(z.bloecke.every(b => b.A <= z.bloecke[z.wahl].A));
});

test("Customized Parameters: alle 18 Werte der .gh-Datei, Bedeutung der nicht gelesenen dokumentiert", () => {
  assert.equal(Object.keys(M.CUSTOMIZED).length, 18);
  for (const k of Object.keys(M.CUSTOMIZED)) if (!["scalingFactor", "minDistance", "parcelWidth", "splitRate"].includes(k)) assert.ok(M.BEDEUTUNG[k], k);
  assert.equal(M.STANDARD.breite, M.CUSTOMIZED.parcelWidth); assert.equal(M.STANDARD.teilung, M.CUSTOMIZED.splitRate);
});

test("Drehung: lange Seite des kleinsten Rechtecks wird waagrecht", () => {
  const w = 0.6, R = BLOCK.map(p => [Math.cos(w) * p[0] - Math.sin(w) * p[1], Math.sin(w) * p[0] + Math.cos(w) * p[1]]);
  const d = M.rechteckWinkel(R), Q = R.map(p => [Math.cos(d) * p[0] - Math.sin(d) * p[1], Math.sin(d) * p[0] + Math.cos(d) * p[1]]);
  const bb = Geo.bbox(Q); nah(bb.b, 120, 1e-6); nah(bb.h, 90, 1e-6);
});

test("Straßenkanten: quasi-kollinear mit einer Blockkante (Winkel < 0,01 rad, Abstand < scalingFactor)", () => {
  const halb = [[0, 0], [60, 0], [60, 90], [0, 90]];
  const { strasse, innen } = M.teileKanten(halb, W, 1);
  assert.equal(strasse.length, 3); assert.equal(innen.length, 1);
  assert.deepEqual(strasse.map(k => k.l), [90, 60, 60]);            // längste zuerst
  assert.equal(M.istStrasse({ a: [0, 0.5], b: [50, 0.5], l: 50 }, W, 1), true);
  assert.equal(M.istStrasse({ a: [0, 2], b: [50, 2], l: 50 }, W, 1), false);
});

test("Regel: Schnitt senkrecht zur längsten Straßenkante bei bbox.min + splitRate · Größe", () => {
  const r = M.regel(BLOCK, W, P);
  assert.equal(r.op, "V"); nah(r.x, 60);                            // Kante 120 waagrecht → senkrechter Schnitt
  const r2 = M.regel([[0, 0], [60, 0], [60, 90], [0, 90]], W, P);
  assert.equal(r2.op, "H"); nah(r2.y, 45);                         // längste Straßenkante 90 senkrecht → waagrechter Schnitt
  const r3 = M.regel(BLOCK, W, Object.assign({}, P, { teilung: 0.3 }));
  nah(r3.x, 36);                                                    // 0,3 · 120 = 36 > 31 → Schnitt bei 30 %
});

test("Blatt: keine Straßenkante mit splitRate · |e| > parcelWidth; Teil ohne Straße", () => {
  assert.equal(M.regel([[0, 0], [60, 0], [60, 45], [0, 45]], W, P), null);         // 0,5 · 60 = 30 < 31
  assert.equal(M.regel([[20, 20], [100, 20], [100, 70], [20, 70]], W, P), null);   // innen, ohne Straße
});

test("Rechteckblock 120 × 90 m: 4 Parzellen 60 × 45 m, Straßenfront in [parcelWidth, 2 · parcelWidth)", () => {
  const K = M.baum(BLOCK, P), B = M.blaetter(K);
  assert.equal(B.length, 4); assert.equal(K.filter(k => k.kinder).length, 3);
  B.forEach(k => nah(Geo.flaeche(k.poly), 2700, 1e-6));
  K.filter(k => k.kinder).forEach(k => assert.equal(k.kinder.length, 2));          // binärer Baum
  const S = M.blaetter(M.baum([[0, 0], [200, 0], [200, 30], [0, 30]], P));
  S.forEach(k => { const w = Geo.bbox(k.poly).b; assert.ok(w >= 31 && w < 62, `Breite ${w}`); });
});

test("Rücken an Rücken: durchgehender Streifen wird quer zur langen Innenkante geteilt", () => {
  // Streifen 40 × 120 m quer durch einen Block, Straße nur an den kurzen Enden
  const Wurzel = M.kantenVon([[0, 0], [40, 0], [40, 120], [0, 120]]).filter(k => k.a[1] === k.b[1]);
  const r = M.regel([[0, 0], [40, 0], [40, 120], [0, 120]], Wurzel, P);
  assert.ok(r && r.ruecken); assert.equal(r.op, "H"); nah(r.y, 60);
  assert.equal(M.regel([[0, 0], [40, 0], [40, 120], [0, 120]], Wurzel, Object.assign({}, P, { minAbstand: 200 })), null);
});

test("Katalog: jede Parzelle bleibt an der Straße, die Teilung ist lückenlos", () => {
  const z = M.erzeuge({}, zufall(2));
  for (const b of z.bloecke) {
    const B = M.blaetter(b.knoten);
    assert.ok(B.every(k => k.front > 1), "Parzelle ohne Straßenkante");
    nah(B.reduce((s, k) => s + k.A, 0), b.A, b.A * 1e-9);
  }
});

test("Parzellenbreite: größere Breite → weniger Parzellen", () => {
  const n = w => M.erzeuge({ breite: w }, zufall(3)).bloecke.reduce((s, b) => s + M.blaetter(b.knoten).length, 0);
  assert.ok(n(15) > n(31) && n(31) > n(60));
});

test("Ablauf: Schritt = ein Schnitt; Teile zur Zeit t = Blöcke + t", () => {
  const z = M.erzeuge({}, zufall(4)), teile = () => z.bloecke.reduce((s, b) => s + M.teileZurZeit(b, z.t).length, 0);
  assert.equal(teile(), z.bloecke.length);
  M.schritt(z); assert.equal(z.t, 1); assert.equal(teile(), z.bloecke.length + 1);
  assert.equal(M.letzter(z).knoten.nr, 0);
  while (!M.fertig(z)) M.schritt(z);
  assert.equal(teile(), z.bloecke.reduce((s, b) => s + M.blaetter(b.knoten).length, 0));
});

test("Baumlayout: Blätter in [0, 1], Eltern zwischen ihren Kindern", () => {
  const K = M.baum(BLOCK, P), pos = M.baumLayout(K);
  for (const k of K) {
    assert.ok(pos[k.id][0] > 0 && pos[k.id][0] < 1); assert.equal(pos[k.id][1], k.ebene);
    if (k.kinder) { const xs = k.kinder.map(c => pos[c][0]); assert.ok(pos[k.id][0] >= Math.min(...xs) && pos[k.id][0] <= Math.max(...xs)); }
  }
});

test("deterministisch wie das Original: gleicher Block gleicher Baum; andere Saat = anderes Quartier", () => {
  const lauf = s => M.erzeuge({}, zufall(s)).bloecke.map(b => b.knoten.map(k => k.linie));
  assert.deepEqual(lauf(5), lauf(5));
  assert.notDeepEqual(lauf(5), lauf(6));
  assert.deepEqual(M.baum(BLOCK, P).map(k => k.linie), M.baum(BLOCK, P).map(k => k.linie));
});
