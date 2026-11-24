// Tests der Zeichenhilfen (node --test im Ordner katalog/_gemeinsam) · CC BY 4.0
// Zeichenfläche, document und Sim.raster werden nachgebildet: geprüft wird, was gezeichnet und wann neu gerechnet wird.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const K = require("../karte.js");
const S = require("../szenen.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");

const V = { farben: K.GRADIENT_GH, faktoren: [0, 0.2536, 0.5009, 0.7482, 1] };
const GESTAUCHT = { farben: K.GRADIENT_GH, faktoren: [0, 0.0341, 0.0977, 0.1977, 0.5614] };

test("verlauf: Griffe treffen ihre Farbe, dazwischen linear, außerhalb begrenzt", () => {
  assert.deepEqual(K.verlauf(0, V), [0, 0, 139]); assert.deepEqual(K.verlauf(1, V), [255, 0, 0]);
  assert.deepEqual(K.verlauf(0.5009, V), [87, 166, 31]);
  assert.deepEqual(K.verlauf(-3, V), [0, 0, 139]); assert.deepEqual(K.verlauf(NaN, V), [0, 0, 139]); assert.deepEqual(K.verlauf(7, V), [255, 0, 0]);
  // Mitte zwischen den ersten beiden Griffen (nachgerechnet): (0 + 50) / 2, (0 + 178) / 2, (139 + 206) / 2 gerundet
  assert.deepEqual(K.verlauf(0.2536 / 2, V), [25, 89, 173]);
});

test("verlauf mit ungleichen Griffen: hinter dem letzten Griff dessen Farbe, Rückgabe ist eine Kopie", () => {
  assert.deepEqual(K.verlauf(0.1977, GESTAUCHT), [255, 215, 0]);
  assert.deepEqual(K.verlauf(0.6, GESTAUCHT), [255, 0, 0]);
  const c = K.verlauf(0, GESTAUCHT); c[0] = 99; assert.equal(K.GRADIENT_GH[0][0], 0);
  // zwei Griffe an derselben Stelle: kein Teilen durch 0
  assert.deepEqual(K.verlauf(0.5, { farben: [[0, 0, 0], [10, 10, 10], [20, 20, 20]], faktoren: [0, 0.5, 0.5] }), [10, 10, 10]);
});

/** nachgebildete Zeichenfläche: zählt Aufrufe */
function nachbildung(a = 2) {
  const log = { raster: 0, leinwand: 0, bild: [] };
  const ctx2d = () => ({ setTransform() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, getTransform: () => ({ a }) });
  globalThis.Sim = { raster(ctx, n, m, f) { log.raster++; f(new Uint8ClampedArray(4 * n * m)); } };
  globalThis.document = { createElement() { log.leinwand++; return { width: 0, height: 0, getContext: () => ctx2d() }; } };
  const ctx = Object.assign(ctx2d(), { drawImage(c, x, y, w, h) { log.bild.push([c.width, w, h]); } });
  return { ctx, log };
}
const F = { dunkel: true, px: 0.5, rgb: { flaeche: [0, 0, 0] } };

test("gelaendeGespeichert: rechnet einmal, setzt danach nur ein; neu bei Größe, Darstellung, Höhenlinien, Höhenraster", () => {
  const { ctx, log } = nachbildung(2), G = S.gelaende(zufall(1), { n: 21, groesse: 200 }), sp = {};
  K.gelaendeGespeichert(ctx, G, F, { hoehenlinien: 10, speicher: sp });
  K.gelaendeGespeichert(ctx, G, F, { hoehenlinien: 10, speicher: sp });
  assert.equal(log.raster, 1); assert.equal(log.leinwand, 1); assert.equal(log.bild.length, 2);
  assert.deepEqual(log.bild[0], [400, 200, 200]);                       // Bild in Bildschirmauflösung (groesse × Maßstab), eingesetzt auf groesse
  K.gelaendeGespeichert(ctx, G, Object.assign({}, F, { dunkel: false }), { hoehenlinien: 10, speicher: sp }); assert.equal(log.raster, 2);
  K.gelaendeGespeichert(ctx, G, Object.assign({}, F, { dunkel: false }), { hoehenlinien: 5, speicher: sp }); assert.equal(log.raster, 3);
  const G2 = Object.assign({}, G, { h: G.h.map(v => v * 1.5), max: G.max * 1.5 });
  K.gelaendeGespeichert(ctx, G2, Object.assign({}, F, { dunkel: false }), { hoehenlinien: 5, speicher: sp }); assert.equal(log.raster, 4);
  assert.equal(log.leinwand, 1);                                         // die Leinwand wird wiederverwendet
});

test("gelaendeGespeichert: feste Bildgröße und eigener Speicher je Gelände", () => {
  const { ctx, log } = nachbildung(3), G = S.gelaende(zufall(2), { n: 21, groesse: 300 });
  K.gelaendeGespeichert(ctx, G, F, { bild: 720, aufloesung: 60, pxBild: true, speicher: {} });
  assert.deepEqual(log.bild[0], [720, 300, 300]);
  const a = {}, b = {};
  K.gelaendeGespeichert(ctx, G, F, { speicher: a }); K.gelaendeGespeichert(ctx, G, F, { speicher: b }); K.gelaendeGespeichert(ctx, G, F, { speicher: a });
  assert.equal(log.raster, 3);
  delete globalThis.Sim; delete globalThis.document;
});
