// Tests der gemeinsamen Rasterverfahren raster.js (node --test im Ordner katalog/_gemeinsam) · CC BY 4.0
// Teils übernommen aus den Tests der Apps hochwasser-pegel, sichttiefe und isochronen-oepnv, ergänzt um Handrechnungen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const R = require("../raster.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const nah = (a, b, e = 1e-9, was = "") => assert.ok(Math.abs(a - b) <= e, `${was} ${a} ≉ ${b}`);

/** Raster aus Textzeilen: „#“ gesperrt, „.“ frei */
function bild(zeilen) {
  const ny = zeilen.length, nx = zeilen[0].length, gesperrt = new Uint8Array(nx * ny);
  zeilen.forEach((z, j) => [...z].forEach((c, i) => { if (c === "#") gesperrt[j * nx + i] = 1; }));
  return { nx, ny, gesperrt };
}
const id = (B, i, j) => j * B.nx + i;
const sichtSet = (B, s) => { const S = new Set(); R.sichtbar(B, s, k => S.add(k)); return S; };

/* ---------------------------------------------------------------- Priority-Flood */
test("Überlaufhöhe: Wasser von der Quelle aus über den niedrigsten Pass; Senke hinter dem Wall erst ab Wallhöhe", () => {
  // 1 × 6: Quelle (0) | Ufer 1 | Wall 3 | Senke 0.5 | Senke 0.2 | Hang 2
  const h = Float64Array.from([0, 1, 3, 0.5, 0.2, 2]), Q = Uint8Array.from([1, 0, 0, 0, 0, 0]);
  assert.deepEqual([...R.ueberlauf(h, 6, 1, Q)], [0, 1, 3, 3, 3, 3]);
  // zwei Wege um einen Berg (9): oben herum über 5, unten herum über 4 → der niedrigere Pass gewinnt (Minimax)
  const h2 = Float64Array.from([
    0, 5, 1,
    2, 9, 0,
    4, 4, 4]);
  const W = R.ueberlauf(h2, 3, 3, Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0]));
  assert.deepEqual([...W], [0, 5, 4, 2, 9, 4, 4, 4, 4]);
});

test("Überlaufhöhe nachgerechnet: Minimax-Weg gegen eine Brute-Force-Rechnung (Bellman-Ford) auf Zufallsgelände", () => {
  const r = zufall(7), nx = 9, ny = 7, h = new Float64Array(nx * ny), Q = new Uint8Array(nx * ny);
  for (let k = 0; k < h.length; k++) h[k] = Math.round(r() * 100) / 10;
  Q[0] = 1; Q[nx * ny - 1] = 1;
  const W = R.ueberlauf(h, nx, ny, Q);
  // unabhängig: wiederholtes Entspannen W[m] = min(W[m], max(h[m], W[Nachbar]))
  const V = new Float64Array(nx * ny).fill(Infinity);
  for (let k = 0; k < V.length; k++) if (Q[k]) V[k] = h[k];
  for (let it = 0; it < nx * ny; it++) for (let k = 0; k < V.length; k++) {
    const i = k % nx, j = (k - i) / nx;
    for (const m of [i > 0 ? k - 1 : -1, i < nx - 1 ? k + 1 : -1, j > 0 ? k - nx : -1, j < ny - 1 ? k + nx : -1])
      if (m >= 0) V[k] = Math.min(V[k], Math.max(h[k], V[m]));
  }
  assert.deepEqual([...W], [...V]);
  for (let k = 0; k < W.length; k++) assert.ok(W[k] >= h[k]);
});

test("Überlaufhöhe: ohne Quelle bleibt alles Infinity; abgeschnittene Bereiche (Wand ∞) ebenso", () => {
  assert.ok([...R.ueberlauf(new Float64Array(4), 2, 2, new Uint8Array(4))].every(v => v === Infinity));
  const h = Float64Array.from([0, Infinity, 1]);
  const W = R.ueberlauf(h, 3, 1, Uint8Array.from([1, 0, 0]));
  assert.equal(W[0], 0); assert.equal(W[1], Infinity); assert.equal(W[2], Infinity);
});

/* ---------------------------------------------------------------- Shadowcasting */
test("Shadowcasting: im offenen Feld sieht jede Zelle alle anderen; eine Wand verdeckt, was dahinter liegt", () => {
  const B = bild([".....", ".....", ".....", ".....", "....."]);
  assert.equal(sichtSet(B, id(B, 2, 2)).size, 24);
  assert.equal(sichtSet(B, id(B, 0, 0)).size, 24);
  const W = bild([".......", ".......", "...#...", ".......", "......."]);
  const s = id(W, 0, 2), S = sichtSet(W, s);
  assert.ok(!S.has(id(W, 4, 2)) && !S.has(id(W, 6, 2)), "direkt hinter der Wand verdeckt");
  assert.ok(S.has(id(W, 6, 0)) && S.has(id(W, 6, 4)), "schräg vorbei sichtbar");
  assert.ok(!S.has(id(W, 3, 2)), "Wandzellen werden nicht gemeldet");
  assert.ok(!S.has(s), "die Startzelle selbst nicht");
});

test("Shadowcasting: Ecke eines Gangs – um die Ecke nichts sichtbar; Diagonalzellen werden zweimal gemeldet", () => {
  const B = bild(["......", "#####.", "#####.", "#####.", "#####."]);
  const S = sichtSet(B, id(B, 0, 0));
  assert.deepEqual([...S].sort((a, b) => a - b), [1, 2, 3, 4, 5]);
  const O = bild(["...", "...", "..."]), n = new Map();
  R.sichtbar(O, id(O, 1, 1), k => n.set(k, (n.get(k) || 0) + 1));
  assert.equal(n.get(id(O, 0, 0)), 2); assert.equal(n.get(id(O, 1, 0)), 1);
  assert.ok(R.sieht(O, id(O, 1, 1), id(O, 2, 2)) && !R.sieht(B, id(B, 0, 0), id(B, 5, 4)));
});

test("Sichtbarkeit ist symmetrisch (A sieht B ⇔ B sieht A) auf einem Zufallsraster mit 25 % Hindernissen", () => {
  const r = zufall(3), nx = 23, ny = 17, g = new Uint8Array(nx * ny);
  for (let k = 0; k < g.length; k++) g[k] = r() < 0.25 ? 1 : 0;
  const B = { nx, ny, gesperrt: g }, frei = [];
  for (let k = 0; k < g.length; k++) if (!g[k]) frei.push(k);
  for (let i = 0; i < 300; i++) {
    const a = frei[Math.floor(r() * frei.length)], b = frei[Math.floor(r() * frei.length)];
    if (a !== b) assert.equal(R.sieht(B, a, b), R.sieht(B, b, a), `${a} ↔ ${b}`);
  }
});

/* ---------------------------------------------------------------- Marching Squares */
test("kontur: senkrechte Isolinie bei linearem Anstieg nachgerechnet (Lage und Länge)", () => {
  // T = 10 · i (Zellweite 10 m): Wert 25 liegt zwischen i = 2 und 3 → x = (2.5 + 0.5) · 10 = 30 m
  const nx = 6, ny = 4, T = new Float32Array(nx * ny), B = { nx, ny, zelle: 10 };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) T[j * nx + i] = 10 * i;
  const S = R.kontur(T, B, 25);
  assert.equal(S.length, ny - 1);
  for (const [a, b] of S) { nah(a[0], 30); nah(b[0], 30); nah(Math.abs(b[1] - a[1]), 10); }
  assert.equal(R.kontur(T, B, 100).length, 0, "Wert außerhalb → keine Linie");
});

test("kontur: Sattelzelle ergibt zwei Segmente; Infinity zählt als deckel", () => {
  const B = { nx: 2, ny: 2, zelle: 1 };
  assert.equal(R.kontur(Float64Array.from([0, 1, 1, 0]), B, 0.5).length, 2);   // links oben/rechts unten tief, Diagonale hoch
  const S = R.kontur(Float64Array.from([0, Infinity, 0, Infinity]), B, 5, 10);
  assert.equal(S.length, 1);
  nah(S[0][0][0], 0.5 + 0.5, 1e-9, "x bei t = 5 / 10");
});

/* ---------------------------------------------------------------- Abstandstransformation */
test("Abstandstransformation: gerade und diagonale Schritte, höchstens grenze Meter, Geschwindigkeit teilt den Weg", () => {
  const nx = 7, ny = 7, B = { nx, ny, zelle: 10 }, c = 3 * nx + 3;
  const T = new Float32Array(nx * ny).fill(Infinity), D = new Float32Array(nx * ny).fill(Infinity);
  T[c] = 0; D[c] = 0;
  R.abstandsTransformation(T, D, B);
  nah(T[3 * nx + 6], 30, 1e-5, "drei gerade Schritte");
  nah(T[0], 30 * Math.SQRT2, 1e-4, "drei diagonale Schritte");
  nah(T[1 * nx + 6], 10 * Math.SQRT2 * 2 + 10, 1e-4, "zwei diagonal + einer gerade");
  // begrenzt auf 25 m, Geschwindigkeit 2 m je Einheit
  const T2 = new Float32Array(nx * ny).fill(Infinity), D2 = new Float32Array(nx * ny).fill(Infinity);
  T2[c] = 5; D2[c] = 0;
  R.abstandsTransformation(T2, D2, B, 2, 25);
  nah(T2[3 * nx + 5], 5 + 20 / 2, 1e-5, "Startwert + Weg / v");
  assert.equal(T2[3 * nx + 6], Infinity, "30 m > grenze");
  nah(D2[4 * nx + 4], 10 * Math.SQRT2, 1e-5);
});

test("Abstandstransformation: kleinerer Wert setzt sich durch, auch wenn er weiter weg liegt; Chamfer höchstens 8 % über der Luftlinie", () => {
  const nx = 21, ny = 1, B = { nx, ny, zelle: 1 };
  const T = new Float64Array(nx).fill(Infinity), D = new Float64Array(nx).fill(Infinity);
  T[0] = 0; D[0] = 0; T[20] = 3; D[20] = 0;
  R.abstandsTransformation(T, D, B);
  assert.equal(T[10], 10); assert.equal(T[12], 11); assert.equal(D[12], 8);
  const n = 41, B2 = { nx: n, ny: n, zelle: 1 }, T2 = new Float64Array(n * n).fill(Infinity), D2 = new Float64Array(n * n).fill(Infinity);
  T2[0] = 0; D2[0] = 0;
  R.abstandsTransformation(T2, D2, B2);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const e = Math.hypot(i, j), t = T2[j * n + i];
    assert.ok(t >= e - 1e-9 && t <= e * 1.0824 + 1e-9, `${i},${j}: ${t} vs ${e}`);
  }
});
