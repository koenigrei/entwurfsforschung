// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);

test("erzeuge: t = 0, Standpunkt frei, 360 Strahlen", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.ok(!M.imGebaeude(z, z.o)); assert.equal(z.iso.punkte.length, 360);
});

test("Strahlen enden spätestens bei der Reichweite und nie hinter einem Hindernis", () => {
  const z = M.erzeuge(P, zufall(2));
  for (let i = 0; i < z.iso.laengen.length; i++) {
    assert.ok(z.iso.laengen[i] <= P.reichweite + 1e-9);
    const q = z.iso.punkte[i], mitte = Geo.lerp(z.o, q, 0.999);
    assert.ok(!M.imGebaeude(z, mitte), "Strahl läuft durch ein Gebäude");
  }
});

test("kleinere Reichweite → kleinere Fläche; Blickwinkel 90° → höchstens ein Viertelkreis", () => {
  const z = M.erzeuge(P, zufall(3));
  const a100 = z.masse.area;
  M.aendere(z, Object.assign({}, P, { reichweite: 30 })); assert.ok(z.masse.area < a100);
  assert.ok(z.masse.area <= Math.PI * 900 + 1e-6);
  M.aendere(z, Object.assign({}, P, { reichweite: 30, winkel: 90, strahlen: 721 }));
  assert.ok(z.masse.area <= Math.PI * 900 / 4 + 1);
});

test("Schritt dreht die Blickrichtung um „drehung“ Grad", () => {
  const p = Object.assign({}, P, { winkel: 60 }), z = M.erzeuge(p, zufall(4));
  M.schritt(z, p); M.schritt(z, p);
  assert.equal(z.t, 2); assert.ok(Math.abs(M.winkelGH(z, p) - 4 * Math.PI / 180) < 1e-12);
  assert.ok(Math.abs(M.richtung(z, p) - (-Math.PI / 2 - 4 * Math.PI / 180)) < 1e-12);   // Unit Y gegen den Uhrzeigersinn
});

test("Blickrichtung 0 schaut nach Norden (oben), wie Unit Y in der .gh", () => {
  const p = Object.assign({}, P, { winkel: 10, strahlen: 3 }), z = M.erzeuge(p, zufall(6));
  assert.ok(z.iso.punkte[1][1] < z.o[1] && Math.abs(z.iso.punkte[1][0] - z.o[0]) < 1e-9);
});

test("Standpunkt lässt sich nicht in ein Gebäude setzen; Blick zum Punkt", () => {
  const z = M.erzeuge(P, zufall(5)), g = z.szene.gebaeude[0], innen = Geo.schwerpunkt(g), alt = z.o.slice();
  assert.equal(M.setzeStandpunkt(z, P, innen), false); assert.deepEqual(z.o, alt);
  M.blickeZu(z, P, [z.o[0], z.o[1] + 10]); const r = M.richtung(z, P);
  assert.ok(Math.abs(Math.cos(r)) < 1e-12 && Math.abs(Math.sin(r) - 1) < 1e-12);   // Blick nach Süden (Bildschirm unten)
});

test("gleiche Saat, gleiche Szene und gleiche Kenngrößen", () => {
  assert.deepEqual(M.erzeuge(P, zufall(7)).masse, M.erzeuge(P, zufall(7)).masse);
  assert.notDeepEqual(M.erzeuge(P, zufall(7)).masse, M.erzeuge(P, zufall(8)).masse);
});
