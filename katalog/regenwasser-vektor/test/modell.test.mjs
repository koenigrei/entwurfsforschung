// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);

/** Gelände aus einer Funktion h(x, y) auf n × n Punkten, Seitenlänge L */
function flaeche(f, n = 21, L = 100) {
  const z = L / (n - 1), h = new Float64Array(n * n); let mx = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { h[j * n + i] = f(i * z, j * z); mx = Math.max(mx, h[j * n + i]); }
  return { n, groesse: L, zelle: z, h, min: 0, max: mx };
}
const lauf = (z, p = P) => { let n = 0; while (!M.fertig(z) && n < 20000) { M.schritt(z, p); n++; } return n; };

test("Rasterteilung wie die Komponente: 300 → 17 × 18, 100 → 10 × 10, 1000 → 32 × 31, 2 → 2 × 2", () => {
  assert.deepEqual(M.rasterTeilung(300, 1, 1), [17, 18]);
  assert.deepEqual(M.rasterTeilung(100, 1, 1), [10, 10]);
  assert.deepEqual(M.rasterTeilung(1000, 1, 1), [32, 31]);
  assert.deepEqual(M.rasterTeilung(2, 1, 1), [2, 2]);
});

test("Startpunkte: Raster mit Rändern, zufällig im Gelände, mindestens 2", () => {
  const G = flaeche(() => 0);
  const R = M.startpunkte(G, 100, false, zufall(1));
  assert.equal(R.length, 100);
  assert.deepEqual(R[0], [0, 0]); assert.deepEqual(R[R.length - 1], [100, 100]);
  const Z = M.startpunkte(G, 50, true, zufall(1));
  assert.equal(Z.length, 50); assert.ok(Z.every(q => q[0] >= 0 && q[0] <= 100 && q[1] >= 0 && q[1] <= 100));
  assert.equal(M.startpunkte(G, 0, true, zufall(1)).length, 2);
  assert.equal(M.startpunkte(G, 0, false, zufall(1)).length, 4);
});

test("Gefälle auf der schiefen Ebene h = 0,5·x: Richtung −x, dz/|d| = −sin(Neigung), Einheitsvektor", () => {
  const G = flaeche((x) => 0.5 * x);
  const d = M.gefaelle(G, 40, 40), a = Math.atan(0.5);
  assert.ok(Math.abs(Math.hypot(...d) - 1) < 1e-9);
  assert.ok(Math.abs(d[0] + Math.cos(a)) < 1e-9 && Math.abs(d[1]) < 1e-9 && Math.abs(d[2] + Math.sin(a)) < 1e-9);
  assert.equal(M.gefaelle(flaeche(() => 3), 50, 50), null, "eben → keine Richtung");
});

test("Schritt: Länge s entlang der Fläche, waagerecht s·cos(Neigung); auf der Ebene endet der Weg am tiefen Rand", () => {
  const G = flaeche((x) => 0.5 * x), w = M.fliessweg(G, 60, 30);
  M.schreite(G, w, 2);
  const [a, b] = w.pkt, a0 = Math.atan(0.5);
  assert.ok(Math.abs(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) - 2) < 1e-6);
  assert.ok(Math.abs((a[0] - b[0]) - 2 * Math.cos(a0)) < 1e-6);
  let n = 0; while (w.aktiv && n < 1000) { M.schreite(G, w, 2); n++; }
  assert.equal(w.grund, "stillstand"); assert.ok(Math.abs(w.pkt[w.pkt.length - 1][0]) < 1e-9, "am Rand x = 0 festgehalten");
});

test("Mulde: Weg endet als „senke“ am Tiefpunkt, nicht nach 5000 Schritten", () => {
  const G = flaeche((x, y) => 0.01 * ((x - 50) ** 2 + (y - 50) ** 2)), w = M.fliessweg(G, 80, 20);
  let n = 0; while (w.aktiv && n < 6000) { M.schreite(G, w, 1); n++; }
  assert.equal(w.grund, "senke"); assert.ok(n < 500);
  const e = w.pkt[w.pkt.length - 1];
  assert.ok(Math.hypot(e[0] - 50, e[1] - 50) < 1.5, "endet nahe der tiefsten Stelle");
  for (let i = 1; i < w.pkt.length; i++) assert.ok(w.pkt[i][2] <= w.pkt[0][2]);
});

test("ebenes Gelände: kein Gefälle → Weg endet sofort („flach“)", () => {
  const G = flaeche(() => 7), w = M.fliessweg(G, 50, 50);
  M.schreite(G, w, 1); assert.equal(w.grund, "flach"); assert.equal(w.pkt.length, 1);
});

test("höchstens 5000 Schritte je Weg", () => {
  // lange Rampe, sehr kleine Schritte: der Weg bricht nach MAX_SCHRITTE ab
  const G = flaeche((x) => x, 21, 100000), w = M.fliessweg(G, 99000, 500);
  let n = 0; while (w.aktiv) { M.schreite(G, w, 1); n++; }
  assert.equal(w.grund, "max"); assert.equal(w.pkt.length - 1, M.MAX_SCHRITTE);
});

test("erzeuge/schritt: 306 Wege bei 300 Punkten, Schritt lässt jeden laufenden Weg um einen Punkt wachsen", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.wege.length, 306); assert.equal(z.aktiv, 306);
  const vorher = z.wege.map(w => w.pkt.length);
  M.schritt(z, P);
  assert.equal(z.t, 1);
  z.wege.forEach((w, i) => assert.ok(w.pkt.length === vorher[i] + 1 || !w.aktiv));
});

test("ganzer Lauf (Katalog: Fließrichtung des Regenwassers): alle Wege enden, keiner endet höher als sein Start", () => {
  const z = M.erzeuge(P, zufall(2)); lauf(z);
  assert.ok(M.fertig(z));
  for (const w of z.wege) { assert.ok(w.pkt[w.pkt.length - 1][2] <= w.pkt[0][2] + 1e-9); assert.notEqual(w.grund, null); }
  const A = M.auswertung(z);
  assert.ok(A.mittel > 50 && A.fall > 0);
  assert.equal(A.gruende.senke + A.gruende.stillstand + A.gruende.flach + A.gruende.max, z.wege.length);
});

test("Klick: zusätzlicher Tropfen läuft mit und bergab", () => {
  const z = M.erzeuge(P, zufall(3)); lauf(z);
  const w = M.tropfen(z, 1000, 700);
  assert.ok(!M.fertig(z)); assert.equal(z.wege.length, 307); assert.ok(w.eigen);
  lauf(z);
  assert.ok(M.fertig(z)); assert.ok(w.pkt.length > 1); assert.ok(w.pkt[w.pkt.length - 1][2] < w.pkt[0][2]);
});

test("Zufall statt Raster: genau die eingestellte Zahl, andere Startpunkte", () => {
  const a = M.erzeuge(Object.assign({}, P, { zufaellig: true, punkte: 123 }), zufall(4));
  assert.equal(a.wege.length, 123);
});

test("gleiche Saat → gleiche Wege, andere Saat → andere", () => {
  const a = M.erzeuge(P, zufall(5)), b = M.erzeuge(P, zufall(5)), c = M.erzeuge(P, zufall(6));
  lauf(a); lauf(b); lauf(c);
  assert.deepEqual(a.wege.map(w => w.pkt), b.wege.map(w => w.pkt));
  assert.notDeepEqual(a.wege.map(w => w.pkt), c.wege.map(w => w.pkt));
});

test("Gipfel ist keine Senke: Start knapp neben der Kuppe läuft bis zum Rand", () => {
  const G = flaeche((x, y) => 100 - 0.002 * ((x - 50) ** 2 + (y - 50) ** 2)), w = M.fliessweg(G, 50.3, 50.1);
  let n = 0; while (w.aktiv && n < 6000) { M.schreite(G, w, 1); n++; }
  assert.equal(w.grund, "stillstand");
  const e = w.pkt[w.pkt.length - 1]; assert.ok(e[0] === 100 || e[1] === 100 || e[0] === 0 || e[1] === 0);
});
