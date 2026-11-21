// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);
const leer = () => M.erzeuge(mit({ punkte: 0, zusatzBlau: 0, zusatzGelb: 0 }), zufall(1));

test("Create Pts: von 100 Punkten 24 rot, 25 blau, 51 gelb (I < n/4, I < n/2)", () => {
  const z = M.erzeuge(mit({ zusatzBlau: 0, zusatzGelb: 0 }), zufall(1));
  assert.deepEqual(M.auswertung(z).n, [24, 25, 51]);
  assert.deepEqual(M.auswertung(M.erzeuge({}, zufall(1))).n, [24, 225, 251]);
});

test("Zellstatus erlaubt: Rot immer, Blau ≤ 0, Gelb ≥ 0", () => {
  assert.ok(M.erlaubt(M.ROT, 500) && M.erlaubt(M.ROT, -500));
  assert.ok(M.erlaubt(M.BLAU, 0) && M.erlaubt(M.BLAU, -55) && !M.erlaubt(M.BLAU, 50));
  assert.ok(M.erlaubt(M.GELB, 0) && M.erlaubt(M.GELB, 100) && !M.erlaubt(M.GELB, -5));
});

test("Zellen markieren: −55 je Blau, +50 je Gelb in der Moore-Nachbarschaft, Rand 0", () => {
  const z = leer();
  M.neuerAgent(z, 105, 105, M.BLAU, false); M.neuerAgent(z, 115, 105, M.GELB, false); M.neuerAgent(z, 125, 115, M.GELB, false);
  M.neuerAgent(z, 5, 5, M.GELB, false);
  M.zellenMarkieren(z);
  assert.equal(z.zellen[10 * M.SPALTEN + 11], -55 + 50 + 50);
  assert.equal(z.zellen[11 * M.SPALTEN + 9], -55);
  assert.equal(z.zellen[0], 0);
});

test("an einen roten Knoten anlagern: Bewegung übernehmen; Rot an Rot anhalten", () => {
  const z = leer();
  M.neuerAgent(z, 200, 200, M.ROT, false); M.neuerAgent(z, 220, 200, M.GELB, true); M.neuerAgent(z, 270, 200, M.ROT, true);
  z.ag[1].vx = 1; z.ag[1].vy = -1;
  M.nachbarschaft(z, P, 1);
  assert.equal(z.ag[1].connect, 1); assert.equal(z.ag[1].vx, 0); assert.equal(z.ag[1].vy, 0);
  z.ag[2].vx = 1;
  M.nachbarschaft(z, P, 2);
  assert.equal(z.ag[2].connect, 2); assert.equal(z.ag[2].vx, 0);
  assert.deepEqual(z.ag[2].bind, [0]);
});

test("auf fremd markierter Zelle wird ein Agent vertrieben (SetRndDir 1,5), höchstens VMAX", () => {
  const z = leer();
  M.neuerAgent(z, 205, 205, M.BLAU, false);
  for (let i = 0; i < 3; i++) M.neuerAgent(z, 215 + 2 * i, 215, M.GELB, false);
  M.zellenMarkieren(z);
  M.schritt(z, P);
  assert.ok(z.abgewiesen >= 1);
  for (let i = 0; i < 50; i++) M.schritt(z, P);
  assert.ok(z.ag.every(a => Math.abs(a.vx) <= M.VMAX && Math.abs(a.vy) <= M.VMAX));
});

test("Separation: mit Zellmarkierung trennen sich Gewerbe und Wohnen, ohne nicht", () => {
  const lauf = zellen => { const p = mit({ zellen }); const z = M.erzeuge(p, zufall(1)); for (let i = 0; i < 1500; i++) M.schritt(z, p); return M.auswertung(z); };
  const mit_ = lauf(true), ohne = lauf(false);
  assert.ok(mit_.gleich > 75 && ohne.gleich < 60, `${mit_.gleich} / ${ohne.gleich}`);
  assert.ok(mit_.an[1] + mit_.an[2] > 300);                  // die meisten haben sich an Knoten angelagert
});

test("rote Knoten bilden einen Erschließungsgraphen", () => {
  const z = M.erzeuge({}, zufall(2));
  for (let i = 0; i < 500; i++) M.schritt(z, P);
  assert.ok(M.auswertung(z).links >= 24);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge({}, zufall(s)); for (let i = 0; i < 100; i++) M.schritt(z, P); return z.ag.map(a => a.x + "," + a.y).join(";"); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});
