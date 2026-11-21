// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;

test("Lagerente nach der Thünenschen Gleichung (cell.pas, RechneLagerR)", () => {
  assert.equal(M.lagerente(P, 0, 10), 2500 * 390 - 2500 * 10 * 5);
  assert.equal(M.lagerente(P, 1, 100), 500 * 899 - 500 * 100 * 6);
  assert.equal(M.lagerente(P, 2, 0), 2000 * 394);
});

test("Produktverteilung kumulativ wie RectanglCreate (vert := random(100))", () => {
  assert.equal(M.produktFuer(0, P), 0);
  assert.equal(M.produktFuer(24, P), 0);
  assert.equal(M.produktFuer(25, P), 1);
  assert.equal(M.produktFuer(74, P), 2);
  assert.equal(M.produktFuer(75, P), M.LEER);
  // Summe über 100 %: die letzten Produkte werden gekürzt
  const q = Object.assign({}, P, { anteilA: 80, anteilB: 40, anteilC: 40 });
  assert.equal(M.produktFuer(99, q), 1);
});

test("acht Vergleichszellen liegen im Tauschradius und im Feld", () => {
  const nb = new Int32Array(8), zf = zufall(3);
  for (const [k, i] of [[0, 0], [76, 44], [40, 20]]) {
    M.nachbarn(k, i, 5, zf, nb);
    for (const j of nb) {
      const x = j % M.SPALTEN, y = Math.floor(j / M.SPALTEN);
      assert.ok(x >= 0 && x < M.SPALTEN && y >= 0 && y < M.ZEILEN);
      assert.ok(Math.abs(x - k) <= 4 && Math.abs(y - i) <= 4);
    }
  }
  M.nachbarn(10, 10, 1, zf, nb);                       // random(1) = 0 → nur die Zelle selbst
  assert.ok([...nb].every(j => j === 10 * M.SPALTEN + 10));
});

test("Tausch: wer mehr bietet als der Besitzer, bekommt die Zelle", () => {
  const z = M.erzeuge({ anteilA: 0, anteilB: 0, anteilC: 0 }, zufall(1));   // alles leer, ein Markt bei (400, 300)
  const nah = 30 * M.SPALTEN + 40, fern = 30 * M.SPALTEN + 42;               // Zellmitten 405/305 und 425/305
  z.nutzung[nah] = 1; z.nutzung[fern] = 0;                                   // B nah am Markt, A zwei Zellen weiter
  M.renten(z, P);
  // A bietet an der nahen Zelle mehr als B dort erzielt → A tauscht mit B (T = 3 erreicht die Zelle in Richtung 5 = links)
  let getauscht = false;
  for (let s = 1; s < 200 && !getauscht; s++) {
    const y = M.erzeuge({ anteilA: 0, anteilB: 0, anteilC: 0 }, zufall(s));
    y.nutzung[nah] = 1; y.nutzung[fern] = 0; M.renten(y, P);
    M.verhandle(y, Object.assign({}, P, { tauschradius: 3 }));
    if (y.nutzung[nah] === 0) { getauscht = true; assert.equal(y.nutzung[fern], 1); }
  }
  assert.ok(getauscht);
  assert.ok(M.lagerente(P, 0, z.distanz[nah]) > M.lagerente(P, 1, z.distanz[nah]));
});

test("Tausch erhält die Anteile der Nutzungen", () => {
  const z = M.erzeuge({}, zufall(5)), vor = M.anteile(z);
  for (let i = 0; i < 30; i++) M.schritt(z, P);
  assert.deepEqual(M.anteile(z), vor);
});

test("Verhandlung erhöht die Zahl der Zellen mit positiver Lagerente und kommt zur Ruhe", () => {
  const z = M.erzeuge({}, zufall(1)), pos0 = z.positiv;
  for (let i = 0; i < 300; i++) M.schritt(z, P);
  assert.ok(z.positiv > 1.5 * pos0);
  assert.ok(z.ruhe > 10);
});

test("Ringe um einen Markt: A innen, dann C, dann B (Abb. 28)", () => {
  const z = M.erzeuge({}, zufall(1));
  for (let i = 0; i < 200; i++) M.schritt(z, P);
  const mitte = 30 * M.SPALTEN + 40;
  assert.equal(z.nutzung[mitte], 0);
  // innerhalb der positiven Zonen: mittlere Entfernung der Zellen mit positiver Rente je Produkt
  const s = [0, 0, 0], c = [0, 0, 0];
  for (let n = 0; n < z.nutzung.length; n++) if (z.rente[n] > 0) { s[z.nutzung[n]] += z.distanz[n]; c[z.nutzung[n]]++; }
  const m = s.map((v, j) => v / c[j]);
  assert.ok(m[0] < m[2] && m[2] < m[1], JSON.stringify(m));
});

test("kleiner Tauschradius ordnet schlechter als großer (Abb. 29)", () => {
  const lauf = T => { const p = Object.assign({}, P, { maerkte: 3, tauschradius: T }); const z = M.erzeuge(p, zufall(2)); for (let i = 0; i < 150; i++) M.schritt(z, p); return z.gesamt; };
  assert.ok(lauf(2) < lauf(20));
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge({ maerkte: 3 }, zufall(s)); for (let i = 0; i < 20; i++) M.schritt(z, P); return Array.from(z.nutzung).join(""); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});

test("ohne Markt: keine positive Rente, Märkte setzen und entfernen", () => {
  const z = M.erzeuge({ maerkte: 0 }, zufall(1));
  assert.equal(z.positiv, 0);
  M.setzeMarkt(z, 100, 100); M.aendere(z, P);
  assert.ok(z.positiv > 0);
  M.entferneMarkt(z, 110, 105); M.aendere(z, P);
  assert.equal(z.maerkte.length, 0);
});

test("wandernde Märkte bleiben im Feld und unter der Höchstgeschwindigkeit", () => {
  const p = Object.assign({}, P, { bewegen: true });
  const z = M.erzeuge({ maerkte: 4 }, zufall(3));
  for (let i = 0; i < 300; i++) M.schritt(z, p);
  for (const m of z.maerkte) {
    assert.ok(m.x >= 0 && m.x < z.breite && m.y >= 0 && m.y < z.hoehe);
    assert.ok(Math.abs(m.vx) <= M.VMAX && Math.abs(m.vy) <= M.VMAX);
  }
  assert.equal(z.t, 300);
});
