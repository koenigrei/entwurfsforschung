// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);

test("Delphis Round: bei genau ,5 zur geraden Zahl", () => {
  assert.equal(M.rund(2.5), 2); assert.equal(M.rund(3.5), 4); assert.equal(M.rund(-2.5), -2);
  assert.equal(M.rund(2.4), 2); assert.equal(M.rund(2.6), 3);
});

test("Umsatz, Produktionskosten, Bid-Price, Bodenpreis nach cell.pas (nachgerechnet bei d = 20)", () => {
  // V = round(60 − 20·0,2 + 10) = 66; C = round(6,6 + 6 + 20·0,5) = 23; B = 66 − 23 − 10 = 33; P = round(500 / (0,01 + 20·0,6)) = 42
  assert.deepEqual(M.werte(P, 20), { V: 66, C: 23, B: 33, P: 42 });
  assert.equal(M.werte(P, 0).P, 50000);                          // mp / 0,01 im Zentrum
});

test("mögliche Standorte: Ring, auf dem der Bid-Price den Bodenpreis trifft", () => {
  assert.deepEqual(M.standortRinge(P, 300), [32, 34, 36]);
  for (const d of [32, 34, 36]) { const w = M.werte(P, d); assert.equal(w.B, w.P); }
});

test("größere Betriebe finden ihren Standort weiter draußen (Bid-Price-Kurve flacher)", () => {
  const klein = M.standortRinge(mit({ betriebsgroesse: 60 }), 400), gross = M.standortRinge(mit({ betriebsgroesse: 100 }), 400);
  assert.ok(gross[0] > klein[klein.length - 1]);
});

test("höhere Kundensensibilität zieht die Standorte zum Zentrum, bis keiner mehr möglich ist", () => {
  assert.ok(M.standortRinge(mit({ kundensens: 5 }), 400)[0] > M.standortRinge(P, 400)[0]);
  assert.deepEqual(M.standortRinge(mit({ kundensens: 100 }), 400), []);
});

test("Feld wie im Original, Markt in der Mitte, gelbe Zellen im Ring um den Markt", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.spalten * z.zeilen, 138 * 88);
  assert.ok(z.anzahl > 15);
  for (let n = 0; n < z.standort.length; n++) if (z.standort[n]) assert.ok([32, 34, 36].includes(z.distanz[n]));
});

test("ohne Markt: Entfernung 1000, keine möglichen Standorte", () => {
  const z = M.erzeuge({ maerkte: 0 }, zufall(1));
  assert.ok(z.distanz.every(d => d === 1000));
  assert.equal(z.anzahl, 0);
});

test("Märkte setzen, entfernen; Parameter wirken sofort", () => {
  const z = M.erzeuge({ maerkte: 0 }, zufall(1));
  M.setzeMarkt(z, 200, 200); M.berechne(z, P);
  assert.ok(z.anzahl > 0);
  M.aendere(z, mit({ kundensens: 100 }));
  assert.equal(z.anzahl, 0);
  M.entferneMarkt(z, 205, 195); M.berechne(z, P);
  assert.equal(z.maerkte.length, 0);
});

test("wandernde Märkte: gleiche Saat, gleicher Lauf; im Feld und begrenzt", () => {
  const lauf = s => { const z = M.erzeuge({ maerkte: 3 }, zufall(s)); for (let i = 0; i < 100; i++) M.schritt(z, P); return z; };
  assert.equal(JSON.stringify(lauf(7).maerkte), JSON.stringify(lauf(7).maerkte));
  assert.notEqual(JSON.stringify(lauf(7).maerkte), JSON.stringify(lauf(8).maerkte));
  const z = lauf(3);
  assert.ok(z.maerkte.every(m => m.x >= 0 && m.x < z.breite && m.y >= 0 && m.y < z.hoehe && Math.abs(m.vx) <= M.VMAX));
  assert.equal(z.t, 100);
});
