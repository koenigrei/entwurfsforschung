// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD, N = M.N;
const lauf = (param, n, saat = 1) => { const p = Object.assign({}, P, param), z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };

test("Anfang: 101 × 101 Zellen, Samen Typ 1 in der Mitte, Entfernung in Bildpunkten des Originals", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.zustand[50 * N + 50], 1); assert.equal(z.verlauf.gesamt[0], 1);
  assert.equal(z.dist[50 * N + 75], 100); assert.equal(z.dist[53 * N + 54], 20);
});

test("Typregel: innen mit q Typ 1, außen mit q Typ 2", () => {
  assert.equal(M.typ(true, 0.5, 0.6), 1); assert.equal(M.typ(true, 0.7, 0.6), 2);
  assert.equal(M.typ(false, 0.5, 0.6), 2); assert.equal(M.typ(false, 0.6, 0.6), 2); assert.equal(M.typ(false, 0.61, 0.6), 1);
});

test("Abstimmung: mehr als 4 weiße Nachbarn → weiß, sonst mehr als 4 graue → grau, unentwickelt bleibt 0", () => {
  assert.equal(M.abstimmung(1, 0, 5), 2); assert.equal(M.abstimmung(2, 5, 3), 1); assert.equal(M.abstimmung(2, 4, 4), 2);
  assert.equal(M.abstimmung(0, 8, 0), 0); assert.equal(M.abstimmung(1, 5, 5), 2);
});

test("Nachbarn: Zustandssumme und Zahl je Typ, ohne die Zelle, Torus", () => {
  const s = new Uint8Array(25); s[0] = 2; s[1] = 1; s[24] = 1;
  assert.deepEqual(M.nachbarn(s, 5, 0, 0), [2, 2, 0]); assert.deepEqual(M.nachbarn(s, 5, 4, 4), [2, 0, 1]);
});

test("p = 100 %: das Wachstum füllt in 50 Schritten das ganze Feld", () => {
  const z = lauf({}, 50);
  assert.equal(z.verlauf.gesamt[50], N * N);
  for (let t = 1; t < 50; t++) assert.equal(z.verlauf.gesamt[t], Math.min(N * N, (2 * t + 1) ** 2));
});

test("Beschreibung: innerhalb r überwiegt Typ 1 (grau), außerhalb Typ 2 (weiß); mit q < 50 % umgekehrt", () => {
  const a = M.trennung(lauf({}, 120), 25);
  assert.ok(a.innenGrau > 0.8 && a.aussenWeiss > 0.75);
  const b = M.trennung(lauf({ zustandP: 40 }, 120), 25);
  assert.ok(b.innenGrau < 0.2 && b.aussenWeiss < 0.2);
});

test("Umstülpung: mit Altern und q unter 50 % wechseln die Bereiche allmählich die Farbe", () => {
  const p = Object.assign({}, P, { altern: true }), z = M.erzeuge(p, zufall(2));
  for (let i = 0; i < 120; i++) M.schritt(z, p);
  const vor = M.trennung(z, 25);
  assert.ok(vor.innenGrau > 0.7);
  p.zustandP = 40;
  for (let i = 0; i < 400; i++) M.schritt(z, p);
  const nach = M.trennung(z, 25);
  assert.ok(nach.innenGrau < vor.innenGrau - 0.25 && nach.aussenWeiss < vor.aussenWeiss - 0.15);
});

test("Altern: ohne Altern bleiben entwickelte Zellen, mit Altern sterben sie nach der Lebensdauer", () => {
  const p = Object.assign({}, P, { altern: true, lebensdauer: 3 }), z = M.erzeuge(p, zufall(1));
  for (let i = 0; i < 4; i++) M.schritt(z, p);
  assert.equal(z.zustand[50 * N + 50] > 0, true);
  M.schritt(z, p);                                           // Alter 4 > 3: stirbt, alle Nachbarn sind entwickelt → wird neu geboren
  assert.equal(z.geburt[50 * N + 50], 4);
});

test("Grauwert Typ · (127 − 2 · Alter)", () => {
  assert.equal(M.grau(1, 0), 127); assert.equal(M.grau(2, 0), 254); assert.equal(M.grau(2, 30), 134); assert.equal(M.grau(1, 70), 0);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => Array.from(lauf({}, 30, s).zustand).join("");
  assert.equal(f(7), f(7)); assert.notEqual(f(7), f(8));
});
