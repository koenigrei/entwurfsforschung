// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);

test("Start: 202 × 202 Zellen, 10 Ziele zu je 3 × 3 Zellen mit Potential im Industriefeld", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.zustand.length, 202 * 202);
  assert.ok(z.anzahl[M.ZIEL] <= 90 && z.anzahl[M.ZIEL] >= 80);    // Überlappungen möglich
  for (let c = 0; c < z.zustand.length; c++) if (z.zustand[c] === M.ZIEL) assert.ok(z.pot[2][c] >= 1);
});

test("Gewichtstabelle der Dissertation (Abb. 33)", () => {
  assert.equal(M.gewicht(P, 0, 0), 1.0); assert.equal(M.gewicht(P, 0, 1), 0.5); assert.equal(M.gewicht(P, 0, 2), 0);
  assert.equal(M.gewicht(P, 1, 0), 0.5); assert.equal(M.gewicht(P, 2, 0), 0.5); assert.equal(M.gewicht(P, 2, 2), 1.0);
});

test("Diffusion: Mittel der acht Nachbarn mit Torus, ohne Rauschen nachgerechnet", () => {
  const z = M.erzeuge({}, zufall(1));
  z.pot.forEach(P_ => P_.fill(0));
  z.pot[0][0] = 8;                                                  // Ecke: Nachbarn liegen über den Rand
  M.diffundiere(z, mit({ rauschW: 0, rauschD: 0, rauschI: 0 }));
  assert.equal(z.pot[0][0], 8);                                     // eigene Zelle zählt nicht mit
  assert.equal(z.pot[0][201 * 202 + 201], 1);                       // diagonal gegenüber (Torus): 8 / 8
  assert.equal(z.pot[0][1], 1);
  M.skaliere(z);
  assert.equal(Math.max(...z.pot[0]), 10);
});

test("neue Nutzung auf der freien Zelle mit dem höchsten Potential, Felder um die Gewichte erhöht", () => {
  const z = M.erzeuge({}, zufall(1));
  z.pot.forEach(P_ => P_.fill(0));
  z.pot[1][500] = 3; z.pot[1][600] = 5; z.zustand[600] = M.WOHNEN;  // 600 ist belegt
  assert.equal(M.bestePlatz(z, 1), 500);
  M.platziere(z, P, 500, 1);
  assert.equal(z.zustand[500], M.DIENST);
  assert.deepEqual([z.pot[0][500], z.pot[1][500], z.pot[2][500]], [0.5, 4, 0]);
});

test("Blickfeld: Sektoren nach Richtung ± Horizont (checkArea)", () => {
  assert.deepEqual(M.blickfeld(0, 22), [[1, 0]]);
  assert.deepEqual(M.blickfeld(90, 22), [[0, 1]]);
  assert.deepEqual(M.blickfeld(0, 60), [[1, -1], [1, 0], [1, 1]]);
  assert.equal(M.sektor(45), 1); assert.equal(M.sektor(46), 2); assert.equal(M.sektor(360), 8);
});

test("bis 2400 Agenten: je Schritt 3 Wohnstandorte, 1 Dienstleistung, 1 Industrie", () => {
  const z = M.erzeuge({}, zufall(2));
  for (let i = 0; i < 10; i++) M.schritt(z, P);
  assert.equal(z.ag.length, 30);
  assert.equal(z.anzahl[M.WOHNEN], 30); assert.equal(z.anzahl[M.DIENST], 10); assert.equal(z.anzahl[M.INDUSTRIE], 10);
});

test("Heimkehr markiert Spuren, erfolgreiche Agenten nehmen zu", () => {
  const z = M.erzeuge({}, zufall(3));
  for (let i = 0; i < 300; i++) M.schritt(z, P);
  assert.ok(z.markB.some(v => v > 0));
  assert.ok(z.verlauf[299][0] > z.verlauf[100][0]);
});

test("Rang-Größen-Verteilung der Siedlungscluster folgt annähernd Pareto (Steigung um −1)", () => {
  const z = M.erzeuge({}, zufall(1));
  for (let i = 0; i < 800; i++) M.schritt(z, P);
  const rg = z.rangGroesse;
  assert.ok(rg.steigung < -0.7 && rg.steigung > -1.5, String(rg.steigung));
  assert.ok(rg.r2 > 0.6);
  assert.equal(z.ag.length, 2400);
});

test("Stoppzeit: danach ruht das Modell", () => {
  const p = mit({ stopp: 20 });
  const z = M.erzeuge(p, zufall(4));
  for (let i = 0; i < 30; i++) M.schritt(z, p);
  assert.equal(z.ag.length, 60);
  assert.equal(z.verlauf.length, 20);
});

test("Migration verlegt Ausgangsorte (höchstens einmal je Agent)", () => {
  const p = mit({ migration: true, stopp: 400 });
  const z = M.erzeuge(p, zufall(5));
  for (let i = 0; i < 400; i++) M.schritt(z, p);
  const mig = z.ag.filter(a => a.migriert).length;
  assert.ok(mig > 0);
  assert.equal(z.anzahl[M.WOHNEN], z.ag.length);                   // jeder Agent hat genau einen Wohnstandort
});

test("Hindernisse: Agenten betreten sie nicht", () => {
  const z = M.erzeuge({}, zufall(6));
  for (let x = 0; x < 404; x += 6) for (let y = 0; y < 404; y += 6) M.hindernis(z, x, y, true);
  for (let i = 0; i < 30; i++) M.schritt(z, P);
  for (const a of z.ag) assert.notEqual(z.zustand[a.y * 202 + a.x], M.HINDERNIS);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge({}, zufall(s)); for (let i = 0; i < 60; i++) M.schritt(z, P); return z.ag.map(a => a.x + "," + a.y).join(";"); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});
