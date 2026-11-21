// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const fassung = (f, q) => { const F = M.FASSUNGEN[f]; return Object.assign({}, P, { fassung: f, numbers: F.numbers, groesse: F.groesse, variation: F.variation, mutation: F.mutation }, q); };
const kopie = v => JSON.stringify([...v.px, ...v.py, ...v.cx, ...v.cy]);
/** Variante aus Rechtecken [px, py, cx, cy] */
function aus(rs) { const v = M.variante(rs.length); rs.forEach((r, i) => { v.px[i] = r[0]; v.py[i] = r[1]; v.cx[i] = r[2]; v.cy[i] = r[3]; }); return v; }

test("Delphi-Round rundet .5 zur geraden Zahl", () => {
  assert.deepEqual([0.5, 1.5, 2.5, 4.5, 191.5, 199.5, 2.49, 2.51].map(M.round), [0, 2, 2, 4, 192, 200, 2, 3]);
});

test("Fitness: Summe der paarweisen Schnittflächen (IntersectRect, Berührung zählt nicht)", () => {
  const v = aus([[50, 50, 30, 30], [90, 50, 30, 30], [140, 50, 30, 30], [200, 200, 10, 10]]);
  assert.equal(M.schnitt(v, 0, 1), 20 * 60);       // x 60…80 überlappt 20, y voll 60
  assert.equal(M.schnitt(v, 1, 2), 10 * 60);
  assert.equal(M.schnitt(v, 0, 2), 0);
  assert.equal(M.ueberschneidung(v), 1200 + 600);
  assert.equal(M.laps(v).length, 2);
  assert.equal(M.schnitt(aus([[0, 0, 10, 10], [20, 0, 10, 10]]), 0, 1), 0);   // berühren sich nur
  assert.equal(M.ueberschneidung(aus([[0, 0, 10, 10], [0, 0, 10, 10], [0, 0, 10, 10]])), 3 * 400);   // dreifach: jedes Paar zählt
});

test("Selectionsort wörtlich: sortiert, listInd[0] = Index der besten Variante, listInd[1..] keine Rangfolge", () => {
  const l = [5, 3, 8, 1], ind = [0, 0, 0, 0];
  M.selectionsort(l, ind, 0, 3);
  assert.deepEqual(l, [1, 3, 5, 8]);
  assert.equal(ind[0], 3);
  assert.deepEqual(ind, [3, 0, 3, 2]);              // nachgerechnet: i = 0 schreibt 1, 3 / 3, 0; i = 1: 0; i = 2: 3, 2
  const r = zufall(4);
  let falsch = 0;
  for (let n = 0; n < 500; n++) {
    const a = Array.from({ length: 16 }, () => r.ganz(1000)), b = a.slice(), ind2 = new Array(16).fill(0);
    M.selectionsort(b, ind2, 0, 15);
    assert.deepEqual(b, a.slice().sort((x, y) => x - y));
    assert.equal(a[ind2[0]], b[0]);
    assert.equal(ind2[0], a.indexOf(b[0]));         // erste beste Variante
    if (a[ind2[1]] !== b[1]) falsch++;
  }
  assert.ok(falsch > 30, "listInd[1] ist manchmal nicht die zweitbeste Variante: " + falsch);   // rund 13 %
});

test("Gruppen der Fassung II: counter = Ceil(K/4 − 0,9) → je vier Varianten eines Elters", () => {
  assert.deepEqual(Array.from({ length: 16 }, (_, K) => M.gruppe(K)), [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
});

test("Seiten (Fassung II): Fläche (2·Größe)² bleibt bis auf Rundung erhalten, Grenzen 10 … Feld/2 − 5", () => {
  const F = M.FASSUNGEN.II, IR = 122 * 122;
  for (let cx = -5; cx < 400; cx++) {
    const [a, b] = M.seiten(cx, 61, F);
    assert.ok(a >= 10 && a <= 285 && b >= 10 && b <= 195, `${cx} → ${a}, ${b}`);
    assert.ok(Math.abs(4 * a * b - IR) <= 4 * Math.max(a, b), `Fläche ${4 * a * b} statt ${IR} bei cx ${cx}`);
  }
  assert.deepEqual(M.seiten(61, 61, F), [61, 61]);
  assert.deepEqual(M.seiten(80, 61, F), [80, M.round(IR / 160 / 2)]);
  assert.deepEqual(M.seiten(12, 61, F), [19, 195]);        // Höhe an der Grenze 195 → Breite IR / (4 · 195) (Original: IR / 195 = 76)
});

test("Verschieben: Mutation (mutRat > random(100)) springt irgendwohin, sonst höchstens ± Variationsweite", () => {
  const F = M.FASSUNGEN.I, r = zufall(2);
  for (let i = 0; i < 2000; i++) {
    const [x, y] = M.verschiebe(r, 200, 200, { mutation: 0, variation: 7 }, F);
    assert.ok(Math.abs(x - 200) <= 7 && Math.abs(y - 200) <= 7);
  }
  let spruenge = 0;
  for (let i = 0; i < 4000; i++) { const [x, y] = M.verschiebe(r, 200, 200, { mutation: 25, variation: 1 }, F); if (Math.abs(x - 200) > 1 || Math.abs(y - 200) > 1) spruenge++; }
  assert.ok(Math.abs(spruenge / 4000 - 0.25) < 0.03, String(spruenge));
  assert.deepEqual([M.klemme(5, 30, 379), M.klemme(400, 30, 379), M.klemme(100, 30, 379)], [30, 379, 100]);
});

test("Erzeugen: nrPop Varianten, Mittelpunkte Größe + random(Feld − 2·Größe), eine erste Bewertung", () => {
  for (const f of ["I", "II"]) {
    const p = fassung(f), F = M.FASSUNGEN[f], z = M.erzeuge(p, zufall(3));
    assert.equal(z.t, 0);
    assert.equal(z.pop.length, F.nrPop);
    assert.equal(z.verlauf.length, 1);
    const v0 = z.pop[z.best];                         // die beste Variante ist noch die zufällig erzeugte
    for (let i = 0; i < p.numbers; i++) {
      assert.equal(v0.cx[i], p.groesse); assert.equal(v0.cy[i], p.groesse);
      assert.ok(v0.px[i] >= p.groesse && v0.px[i] < F.breite - p.groesse);
      assert.ok(v0.py[i] >= p.groesse && v0.py[i] < F.hoehe - p.groesse);
    }
    assert.equal(z.flaeche, M.ueberschneidung(v0));
    assert.equal(z.flaeche, Math.min(...z.flaechen));
  }
});

test("Fassung I: die beste Variante bleibt erhalten, alle anderen stammen von ihr ab; Fläche fällt nie", () => {
  const p = fassung("I", { mutation: 0 }), z = M.erzeuge(p, zufall(5));
  for (let g = 0; g < 30; g++) {
    const vorher = z.pop.map(kopie);
    M.schritt(z, p);
    if (z.fertig) break;
    // overlap bewertet zuerst, dann erzeugt optimize aus der besten Variante nb alle anderen
    const nb = z.best;
    for (let K = 0; K < z.pop.length; K++) if (K !== nb) for (let i = 0; i < z.n; i++) {
      const e = z.pop[nb];
      assert.ok(Math.abs(z.pop[K].px[i] - e.px[i]) <= p.variation && Math.abs(z.pop[K].py[i] - e.py[i]) <= p.variation);
    }
    assert.ok(vorher.includes(kopie(z.pop[nb])), "beste Variante unverändert übernommen");
  }
  for (let t = 1; t < z.verlauf.length; t++) assert.ok(z.verlauf[t] <= z.verlauf[t - 1]);
});

test("Fassung I erreicht mit den Voreinstellungen eine Überlagerungsfläche ≤ 100 und hält dann an", () => {
  for (const s of [1, 2, 3, 4]) {
    const p = fassung("I"), z = M.erzeuge(p, zufall(s));
    while (!z.fertig && z.t < 3000) M.schritt(z, p);
    assert.ok(z.fertig, "Saat " + s);
    assert.ok(z.flaeche <= 100 && z.verlauf[0] > 3000, `${z.verlauf[0]} → ${z.flaeche}`);
    const t = z.t; M.schritt(z, p);
    assert.equal(z.t, t);
  }
});

test("Fassung II: vier Eltern bleiben erhalten, Flächen bleiben (2·Größe)², Fläche fällt nie, Packung wird dichter", () => {
  const p = fassung("II"), z = M.erzeuge(p, zufall(1)), IR = 122 * 122;
  for (let g = 0; g < 600 && !z.fertig; g++) {
    const vorher = z.pop.map(kopie);
    const ind = []; { const a = z.pop.map(M.ueberschneidung), i2 = new Array(16).fill(0); M.selectionsort(a, i2, 0, 15); ind.push(...i2.slice(0, 4)); }
    M.schritt(z, p);
    for (const J of new Set(ind)) assert.equal(kopie(z.pop[J]), vorher[J], "Elter " + J + " unverändert");
    for (const v of z.pop) for (let i = 0; i < z.n; i++) {
      assert.ok(Math.abs(4 * v.cx[i] * v.cy[i] - IR) <= 4 * Math.max(v.cx[i], v.cy[i]));
      assert.ok(v.px[i] - v.cx[i] >= 0 && v.px[i] + v.cx[i] <= 580 && v.py[i] - v.cy[i] >= 0 && v.py[i] + v.cy[i] <= 400);
    }
  }
  for (let t = 1; t < z.verlauf.length; t++) assert.ok(z.verlauf[t] <= z.verlauf[t - 1]);
  assert.ok(z.flaeche < z.verlauf[0] / 3, `${z.verlauf[0]} → ${z.flaeche}`);
  assert.equal(z.eltern.length, 4);
  assert.ok(Math.abs(M.istFlaeche(z.pop[z.best]) - M.sollFlaeche(z)) < 0.01 * M.sollFlaeche(z));
});

test("gleiche Saat → gleicher Lauf; andere Saat → anderer", () => {
  const lauf = (f, s) => { const p = fassung(f), z = M.erzeuge(p, zufall(s)); for (let i = 0; i < 60; i++) M.schritt(z, p); return JSON.stringify([z.verlauf, kopie(z.pop[z.best])]); };
  for (const f of ["I", "II"]) {
    assert.equal(lauf(f, 7), lauf(f, 7));
    assert.notEqual(lauf(f, 7), lauf(f, 8));
  }
});
