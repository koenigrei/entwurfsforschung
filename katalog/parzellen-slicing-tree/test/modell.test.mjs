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
const P0 = Object.assign({}, M.STANDARD, { streuung: 0 });      // ohne Zufall im Teilungsverhältnis

test("erzeuge: t = 0, Schnittreihenfolge nach Ebenen, gewählt ist der größte Block", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.t, 0);
  for (let i = 1; i < z.schnitte.length; i++) assert.ok(z.schnitte[i][0] >= z.schnitte[i - 1][0]);
  assert.ok(z.bloecke.every(b => b.A <= z.bloecke[z.wahl].A));
});

test("Straßenkanten: im Block alle vier Kanten, in der Hälfte drei", () => {
  assert.equal(M.strassenkanten(BLOCK, BLOCK).length, 4);
  const halb = [[0, 0], [120, 0], [120, 45], [0, 45]];
  assert.equal(M.strassenkanten(halb, BLOCK).length, 3);
  nah(M.front(halb, BLOCK), 120 + 45 + 45);
});

test("Regel längs: 90 m tiefer Block (Schwelle 60) wird in zwei 45 m tiefe Reihen geteilt", () => {
  const r = M.regel(BLOCK, BLOCK, P0, zufall(1), 0);
  assert.equal(r.art, "laengs");
  r.kinder.forEach(q => nah(Geo.flaeche(q), 5400, 1e-6));
  nah(r.linie[0][1], 45); nah(r.linie[1][1], 45);
});

test("Regel quer: Reihe 120 m bei parcelWidth 31 → k = 4, Schnitt bei 2/4 = 60 m, senkrecht zur Straßenkante", () => {
  const reihe = [[0, 0], [120, 0], [120, 45], [0, 45]];
  const r = M.regel(reihe, BLOCK, P0, zufall(1), 1);
  assert.equal(r.art, "quer"); assert.equal(r.k, 4); nah(r.anteil, 0.5);
  nah(r.linie[0][0], 60); nah(r.linie[1][0], 60);
});

test("Längsteilung nur einmal: im 130 × 220 m Block entstehen zwei Reihen, kein innerer Streifen ohne Langseite", () => {
  const B = [[0, 0], [130, 0], [130, 220], [0, 220]], K = M.baum(B, P0, zufall(1));
  assert.equal(K[0].art, "laengs");
  K[0].kinder.forEach(c => assert.equal(K[c].art, "quer"));
  for (const k of M.blaetter(K)) assert.ok(Math.max(...M.strassenkanten(k.poly, B).map(e => e.l)) > 20);
});

test("Blatt: weniger als zwei Parzellenbreiten, Baumtiefe erreicht, Block unter minBlockArea", () => {
  const schmal = [[0, 0], [40, 0], [40, 45], [0, 45]];      // round(45/31) = 1
  assert.equal(M.regel(schmal, BLOCK, P0, zufall(1), 2), null);
  assert.equal(M.regel(BLOCK, BLOCK, Object.assign({}, P0, { baumtiefe: 1 }), zufall(1), 1), null);
  const klein = [[0, 0], [25, 0], [25, 25], [0, 25]];       // 625 m² < 800 m²
  assert.equal(M.baum(klein, P0, zufall(1)).length, 1);
});

test("Baum des Rechteckblocks ohne Streuung: 8 Parzellen 30 × 45 m, 7 Schnitte, Tiefe 3", () => {
  const K = M.baum(BLOCK, P0, zufall(1)), B = M.blaetter(K);
  assert.equal(B.length, 8); assert.equal(K.filter(k => k.kinder).length, 7);
  B.forEach(k => nah(Geo.flaeche(k.poly), 1350, 1e-6));
  assert.equal(Math.max(...K.map(k => k.ebene)), 3);
  K.filter(k => k.kinder).forEach(k => assert.equal(k.kinder.length, 2));    // binärer Baum
});

test("Baumtiefe begrenzt die Zahl der Schnitte (höchstens 2^Tiefe Blätter)", () => {
  for (const d of [1, 2, 3]) {
    const K = M.baum(BLOCK, Object.assign({}, P0, { breite: 10, baumtiefe: d }), zufall(1));
    assert.ok(M.blaetter(K).length <= 2 ** d);
    assert.ok(Math.max(...K.map(k => k.ebene)) <= d);
  }
});

test("Katalog: jede Parzelle bleibt an der Straße, die Teilung ist lückenlos", () => {
  const z = M.erzeuge({}, zufall(2));
  for (const b of z.bloecke) {
    const B = M.blaetter(b.knoten);
    assert.ok(B.every(k => k.front > 1), "Parzelle ohne Straßenkante");
    nah(B.reduce((s, k) => s + k.A, 0), b.A, b.A * 1e-9);
  }
});

test("Parzellenbreite: größere Breite → weniger Parzellen; Straßenfront der Parzellen etwa parcelWidth", () => {
  const n = w => M.erzeuge({ breite: w }, zufall(3)).bloecke.reduce((s, b) => s + M.blaetter(b.knoten).length, 0);
  assert.ok(n(20) > n(31) && n(31) > n(60));
  const z = M.erzeuge(P0, zufall(3)), B = z.bloecke.flatMap(b => M.blaetter(b.knoten));
  const breiten = [];
  for (const b of z.bloecke) for (const k of M.blaetter(b.knoten)) {
    const K = M.strassenkanten(k.poly, b.poly); breiten.push(Math.max(...K.map(e => e.l)));
  }
  breiten.sort((a, b) => a - b);
  const median = breiten[Math.floor(breiten.length / 2)];
  assert.ok(median > 31 * 0.6 && median < 31 * 1.6, `Median ${median}`);
  assert.ok(B.length > 50);
});

test("Ablauf: Schritt = ein Schnitt; Teile zur Zeit t = Blöcke + t", () => {
  const z = M.erzeuge({}, zufall(4)), teile = () => z.bloecke.reduce((s, b) => s + M.teileZurZeit(b, z.t).length, 0);
  assert.equal(teile(), z.bloecke.length);
  M.schritt(z); assert.equal(z.t, 1); assert.equal(teile(), z.bloecke.length + 1);
  assert.equal(M.letzter(z).knoten.nr, 0);
  while (!M.fertig(z)) M.schritt(z);
  assert.equal(teile(), z.bloecke.length + z.schnitte.length);
  assert.equal(teile(), z.bloecke.reduce((s, b) => s + M.blaetter(b.knoten).length, 0));
});

test("Baumlayout: Blätter in [0, 1], Eltern zwischen ihren Kindern", () => {
  const K = M.baum(BLOCK, P0, zufall(1)), pos = M.baumLayout(K);
  for (const k of K) {
    assert.ok(pos[k.id][0] > 0 && pos[k.id][0] < 1); assert.equal(pos[k.id][1], k.ebene);
    if (k.kinder) { const xs = k.kinder.map(c => pos[c][0]); assert.ok(pos[k.id][0] >= Math.min(...xs) && pos[k.id][0] <= Math.max(...xs)); }
  }
});

test("Wiederholbarkeit: gleiche Saat gleiches Ergebnis, andere Saat anderes", () => {
  const lauf = s => M.erzeuge({}, zufall(s)).bloecke.map(b => b.knoten.map(k => k.linie));
  assert.deepEqual(lauf(5), lauf(5));
  assert.notDeepEqual(lauf(5), lauf(6));
});
