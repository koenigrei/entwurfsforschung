// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);

/** Raster aus Textzeilen: „#“ gesperrt, „.“ frei */
function bild(zeilen, cs = 1) {
  const ny = zeilen.length, nx = zeilen[0].length, gesperrt = new Uint8Array(nx * ny);
  let frei = 0;
  zeilen.forEach((z, j) => [...z].forEach((c, i) => { if (c === "#") gesperrt[j * nx + i] = 1; else frei++; }));
  return { nx, ny, cs, gesperrt, frei };
}
const id = (R, i, j) => j * R.nx + i;
const sichtSet = (R, s) => { const S = new Set(); M.sichtbar(R, s, k => S.add(k)); return S; };
/** Zustand auf einem selbst gebauten Raster */
function zustand(R, starts) {
  const z = { t: 0, b: R.nx * R.cs, h: R.ny * R.cs, szene: { gebaeude: [] }, R, ziel: -1, startPunkte: starts.map(k => M.zellMitte(R, k)) };
  M.neu(z); return z;
}

test("Raster: Zellen, deren Mitte in einem Gebäude liegt, sind gesperrt", () => {
  const R = M.raster(10, 6, 2, [[[2, 2], [6, 2], [6, 4], [2, 4]]]);
  assert.equal(R.nx, 5); assert.equal(R.ny, 3);
  // Mitten (3, 3) und (5, 3) liegen im Gebäude
  assert.equal(R.gesperrt[id(R, 1, 1)], 1); assert.equal(R.gesperrt[id(R, 2, 1)], 1);
  assert.equal(R.gesperrt[id(R, 0, 1)], 0); assert.equal(R.gesperrt[id(R, 3, 1)], 0);
  assert.equal(R.frei, 13);
  // „Closest Point“: (4, 3) liegt in Zelle (1, 1), gesperrt; nächste freie Mitten (3, 1) und (3, 5) gleich weit → erste
  assert.equal(M.naechsteFreie(R, [4, 3]), id(R, 1, 0));
  assert.equal(M.naechsteFreie(R, [0.5, 0.5]), id(R, 0, 0));
});

test("Shadowcasting: im offenen Feld sieht jede Zelle alle anderen; eine Wand verdeckt, was dahinter liegt", () => {
  const R = bild([".....", ".....", ".....", ".....", "....."]);
  assert.equal(sichtSet(R, id(R, 2, 2)).size, 24);
  assert.equal(sichtSet(R, id(R, 0, 0)).size, 24);
  const W = bild([".......", ".......", "...#...", ".......", "......."]);
  const s = id(W, 0, 2), S = sichtSet(W, s);
  assert.ok(!S.has(id(W, 4, 2)) && !S.has(id(W, 6, 2)), "direkt hinter der Wand verdeckt");
  assert.ok(S.has(id(W, 6, 0)) && S.has(id(W, 6, 4)), "schräg vorbei sichtbar");
  assert.ok(!S.has(id(W, 3, 2)), "Wandzellen gehören nicht zum Graphen");
});

test("Sichtbarkeit ist symmetrisch (A sieht B ⇔ B sieht A)", () => {
  const r = zufall(3), z = M.erzeuge(P, zufall(2)), R = z.R, frei = [];
  for (let k = 0; k < R.gesperrt.length; k++) if (!R.gesperrt[k]) frei.push(k);
  for (let i = 0; i < 200; i++) {
    const a = frei[Math.floor(r() * frei.length)], b = frei[Math.floor(r() * frei.length)];
    if (a !== b) assert.equal(M.sieht(R, a, b), M.sieht(R, b, a));
  }
});

test("Breitensuche nachgerechnet: L-förmiger Gang – Tiefe 1 im ersten Schenkel, Tiefe 2 um die Ecke", () => {
  const R = bild(["......", "#####.", "#####.", "#####.", "#####."]);
  const z = zustand(R, [id(R, 0, 0)]);
  assert.equal(z.tiefe[id(R, 0, 0)], 0);
  M.schritt(z, P);
  assert.equal(z.t, 1); assert.equal(z.stufe, 1);
  for (let i = 1; i < 6; i++) assert.equal(z.tiefe[id(R, i, 0)], 1);
  assert.equal(z.tiefe[id(R, 5, 4)], -1);
  M.rechneAlle(z);
  assert.equal(z.tiefe[id(R, 5, 4)], 2); assert.equal(z.tiefe[id(R, 5, 3)], 2);
  assert.ok(M.fertig(z)); assert.deepEqual(z.jeStufe, [1, 5, 4]);   // Schenkel 5 Zellen, Gang um die Ecke 4 Zellen
  assert.ok(Math.abs(M.mittel(z) - (5 * 1 + 4 * 2) / 9) < 1e-12);
  assert.equal(z.tiefe[id(R, 5, 1)], 2);   // (5, 1) liegt schon hinter der Ecke
  // Weg der wenigsten Richtungswechsel: Start → Ecke des Gangs → Ziel, jeder Abschnitt eine Sichtlinie
  const w = M.weg(z, id(R, 5, 4));
  assert.equal(w.length, 3); assert.equal(w[0], id(R, 0, 0)); assert.equal(w[2], id(R, 5, 4));
  for (let i = 0; i < w.length - 1; i++) assert.ok(M.sieht(R, w[i], w[i + 1]));
});

test("mehrere Startpunkte: je Zelle die kleinste Tiefe; abgeschlossene Bereiche bleiben +∞ (−1)", () => {
  const R = bild(["......", "#####.", "#####.", "......", "######", "..####"]);
  const z1 = zustand(R, [id(R, 0, 0)]); M.rechneAlle(z1);
  assert.equal(z1.tiefe[id(R, 0, 3)], 3);
  const z2 = zustand(R, [id(R, 0, 0), id(R, 0, 3)]); M.rechneAlle(z2);
  assert.equal(z2.tiefe[id(R, 0, 3)], 0); assert.equal(z2.tiefe[id(R, 3, 3)], 1);
  assert.equal(z2.tiefe[id(R, 0, 5)], -1); assert.equal(z2.tiefe[id(R, 1, 5)], -1);
  assert.equal(z2.erreicht, R.frei - 2);
});

test("Schritt = eine Tiefenstufe; nach dem Ende zählt t weiter, ohne zu rechnen; Zurücksetzen t = 0", () => {
  const z = M.erzeuge(P, zufall(1));
  let n = 0; while (!M.fertig(z)) { M.schritt(z, P); n++; }
  assert.ok(n >= 3 && n <= 10, `Stufen ${n}`);
  const e = z.erreicht; M.schritt(z, P); assert.equal(z.erreicht, e); assert.equal(z.t, n + 1);
  M.neu(z); assert.equal(z.t, 0); assert.equal(z.erreicht, 1);
});

test("Tiefe 1 = genau die vom Start aus sichtbaren Zellen; Startpunkt nicht in ein Gebäude", () => {
  const z = M.erzeuge(P, zufall(4)), s = z.start[0], S = sichtSet(z.R, s);
  M.schritt(z, P);
  let n = 0; for (let k = 0; k < z.tiefe.length; k++) if (z.tiefe[k] === 1) { n++; assert.ok(S.has(k)); }
  assert.equal(n, S.size);
  const g = z.szene.gebaeude[0], c = g.reduce((a, q) => [a[0] + q[0] / g.length, a[1] + q[1] / g.length], [0, 0]);
  if (M.imGebaeude(z, c)) assert.equal(M.setzeStart(z, c), false);
  assert.equal(M.setzeStart(z, [3, 3]), true); assert.equal(z.t, 0); assert.equal(z.startPunkte.length, 1);
  assert.equal(M.setzeStart(z, [z.b - 3, z.h - 3], true), true); assert.equal(z.startPunkte.length, 2);
});

test("erwartetes Verhalten (Snippet „Visual Distance“): in der Stadt wird fast alles mit wenigen Richtungswechseln erreicht; feineres Raster, ähnliche Tiefen", () => {
  for (const s of [1, 2, 3]) {
    const z = M.rechneAlle(M.erzeuge(P, zufall(s)));
    assert.ok(z.erreicht / z.R.frei > 0.9, `Saat ${s}: ${z.erreicht} / ${z.R.frei}`);
    assert.ok(z.stufe >= 3 && z.stufe <= 8);
    assert.ok(M.mittel(z) > 1.5 && M.mittel(z) < 3.5);
  }
  const grob = M.rechneAlle(M.erzeuge(Object.assign({}, P, { zelle: 4 }), zufall(1))), fein = M.rechneAlle(M.erzeuge(P, zufall(1)));
  assert.ok(Math.abs(M.mittel(grob) - M.mittel(fein)) < 0.6);
});

test("Szene „Rechtecke“: n Rechtecke wie Populate 2D + Rectangle", () => {
  const z = M.erzeuge(Object.assign({}, P, { szene: "rechtecke", rechtecke: 40 }), zufall(1));
  assert.equal(z.szene.gebaeude.length, 40); assert.equal(z.b, M.GEBIET.b);
  assert.equal(M.erzeuge(Object.assign({}, P, { szene: "rechtecke", rechtecke: 0 }), zufall(1)).R.frei, z.R.nx * z.R.ny);
});

test("gleiche Saat → gleiche Tiefen, andere Saat → andere", () => {
  const lauf = s => Array.from(M.rechneAlle(M.erzeuge(P, zufall(s))).tiefe);
  assert.deepEqual(lauf(5), lauf(5));
  assert.notDeepEqual(lauf(5), lauf(6));
});
