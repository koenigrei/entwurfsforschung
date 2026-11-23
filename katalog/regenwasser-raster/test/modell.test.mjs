// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);

/** Gelände aus einer Funktion h(x, y) auf n × n Punkten, Seitenlänge L */
function flaeche(f, n = 11, L = 100) {
  const z = L / (n - 1), h = new Float64Array(n * n); let mx = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { h[j * n + i] = f(i * z, j * z); mx = Math.max(mx, h[j * n + i]); }
  return { n, groesse: L, zelle: z, h, min: 0, max: mx };
}
const lauf = z => { let n = 0; while (!M.fertig(z) && n < 100000) { M.schritt(z, P); n++; } return n; };

test("Smooth: 0 = glatt (8 Durchgänge), 0,5 → 4, 1 = genau (keine Glättung)", () => {
  assert.equal(M.durchgaenge(0), M.GLAETTUNG_MAX); assert.equal(M.durchgaenge(0.5), 4); assert.equal(M.durchgaenge(1), 0);
});

test("Abtasten: Resolution 2 → 3 × 3 Punkte mit Höhen der schiefen Ebene; Resolution 0 → kleinstes Raster 2 × 2", () => {
  const G = flaeche((x, y) => 2 * x + y);
  const A = M.abtasten(G, 2);
  assert.equal(A.m, 3); assert.equal(A.d, 50);
  assert.ok(Math.abs(A.H[1 * 3 + 2] - (2 * 100 + 50)) < 1e-3);
  assert.equal(M.abtasten(G, 0).m, 2);
});

test("D8: steilster Nachbar nach Höhenunterschied / Abstand – Diagonale gewinnt bei 5/√2 > 3", () => {
  // 3 × 3, Mitte 10; rechts 7 (Gefälle 3), rechts unten 5 (Gefälle 5/√2 ≈ 3,54), sonst 9
  const H = Float64Array.from([9, 9, 9, 9, 10, 7, 9, 9, 5]);
  const nach = M.abfluss(H, 3, 1);
  assert.equal(nach[4], 8);
  assert.equal(nach[8], -1, "tiefster Punkt ist Senke");
  assert.equal(nach[5], 8, "7 fließt zur 5");
});

test("D8: ebenes Feld → jeder Punkt ist Senke (kein tieferer Nachbar)", () => {
  const nach = M.abfluss(new Float64Array(16), 4, 1);
  assert.ok(nach.every(q => q === -1));
});

test("lange Fließwege: Kette 0 → 1 → 2 endet in 2, Längen 2, 1, 0", () => {
  const E = M.endpunkte(Int32Array.from([1, 2, -1]));
  assert.deepEqual([...E.ende], [2, 2, 2]); assert.deepEqual([...E.laenge], [2, 1, 0]);
});

test("Point Groups: Abstand ≤ Distance verbindet, auch über Zwischenpunkte (transitiv)", () => {
  const pts = [[0, 0, 0], [0.05, 0, 0], [0.1, 0, 0], [5, 5, 0]];
  assert.deepEqual([...M.gruppiere(pts, 0.06)], [0, 0, 0, 1]);
  assert.deepEqual([...M.gruppiere(pts, 0.01)], [0, 1, 2, 3]);
  assert.deepEqual([...M.gruppiere(pts, 10)], [0, 0, 0, 0]);
});

test("Farbfolge (Jitter): Mischung aller Stufen, fest für die Saat", () => {
  const f = M.farbfolge(5);
  assert.deepEqual([...f].sort(), [0, 0.25, 0.5, 0.75, 1]); assert.deepEqual(M.farbfolge(5), f);
});

test("schiefe Ebene: alles fließt bergab zum tiefen Rand, lokaler Pfeil zeigt bergab, Neigung = atan(Gefälle)", () => {
  const z = M.erzeuge(P, zufall(1));
  z.G0 = flaeche((x, y) => 0.1 * (100 - x) + 0.01 * y * 0, 21, 100);
  M.analysiere(z, Object.assign({}, P, { glaettung: 1, aufloesung: 10 }));
  for (let k = 0; k < z.nach.length; k++) {
    const i = k % z.m;
    if (i < z.m - 1) assert.equal(z.nach[k], k + 1, "Wasser fließt nach +x"); else assert.equal(z.nach[k], -1);
  }
  assert.equal(z.senken.length, z.m);
  const L = M.lokal(z, [50, 50]);
  assert.ok(Math.abs(L.richtung[0] - 1) < 1e-9 && Math.abs(L.richtung[1]) < 1e-9);
  assert.ok(Math.abs(L.neigung - Math.atan(0.1) * 180 / Math.PI) < 1e-6);
});

test("Schritt: nach TEILE Schritten ist jeder Fließweg um einen Abschnitt gewachsen; t zählt jeden Schritt", () => {
  const z = M.erzeuge(P, zufall(2)), start = z.aktiv;
  for (let i = 0; i < M.TEILE - 1; i++) M.schritt(z, P);
  assert.equal(z.abschnitte, 0); assert.equal(z.durch.reduce((a, b) => a + b, 0), 0);
  M.schritt(z, P);
  assert.equal(z.t, M.TEILE); assert.equal(z.abschnitte, 1);
  assert.equal(z.durch.reduce((a, b) => a + b, 0), start, "jeder Tropfen mit Abfluss hat einen Abschnitt durchflossen");
});

test("ganzer Lauf: Tropfen enden in Senken, Summe der Durchflüsse = Summe der Weglängen, danach Einzugsgebiete", () => {
  const z = M.erzeuge(P, zufall(3)), n = lauf(z);
  assert.equal(n, z.maxLaenge * M.TEILE + 1, "Abschnitte × TEILE + ein Schritt Gruppierung");
  assert.ok(z.gruppiert); assert.equal(z.aktiv, 0);
  for (let k = 0; k < z.pos.length; k++) { assert.equal(z.pos[k], z.ende[k]); assert.equal(z.nach[z.ende[k]], -1); assert.ok(z.H[z.ende[k]] <= z.H[k]); }
  assert.equal(z.durch.reduce((a, b) => a + b, 0), z.laenge.reduce((a, b) => a + b, 0));
  // gleicher Endpunkt → gleiches Einzugsgebiet (Katalog: „If they share the same point, they belong to the same water shed.“)
  for (let k = 0; k < z.pos.length; k++) assert.equal(z.gebiet[k], z.gebiet[z.ende[k]]);
  assert.equal(z.groesseGebiet.reduce((a, b) => a + b, 0), z.m * z.m);
});

test("Katalog: Smooth 0 (glatt) ergibt weniger Senken und Einzugsgebiete als Smooth 1 (genau)", () => {
  const glatt = M.erzeuge(Object.assign({}, P, { glaettung: 0 }), zufall(4)), genau = M.erzeuge(Object.assign({}, P, { glaettung: 1 }), zufall(4));
  assert.ok(glatt.senken.length < genau.senken.length);
  assert.ok(glatt.anzahlGebiete < genau.anzahlGebiete);
});

test("großer Gruppierungsabstand legt Senken zusammen, ohne den Ablauf zurückzusetzen", () => {
  const z = M.erzeuge(P, zufall(5)); lauf(z);
  const vorher = z.anzahlGebiete, t = z.t;
  M.aendere(z, Object.assign({}, P, { abstand: 200 }), "abstand");
  assert.ok(z.anzahlGebiete < vorher); assert.equal(z.t, t);
  M.aendere(z, Object.assign({}, P, { aufloesung: 20 }), "aufloesung");
  assert.equal(z.t, 0); assert.equal(z.m, 21);
});

test("Resolution 0: kleinstes Raster läuft durch", () => {
  const z = M.erzeuge(Object.assign({}, P, { aufloesung: 0 }), zufall(6));
  assert.equal(z.m, 2); lauf(z); assert.ok(z.gruppiert);
});

test("Analysepunkt bleibt auf dem Gelände", () => {
  const z = M.erzeuge(P, zufall(7));
  M.setzePunkt(z, [-50, z.h + 80]); assert.deepEqual(z.punkt, [0, z.h]);
});

test("gleiche Saat → gleiches Gelände und gleiche Gebiete, andere Saat → anderes", () => {
  const a = M.erzeuge(P, zufall(8)), b = M.erzeuge(P, zufall(8)), c = M.erzeuge(P, zufall(9));
  assert.deepEqual([...a.gebiet], [...b.gebiet]); assert.deepEqual([...a.nach], [...b.nach]);
  assert.notDeepEqual([...a.nach], [...c.nach]);
});
