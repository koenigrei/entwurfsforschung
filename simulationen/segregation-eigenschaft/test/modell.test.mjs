// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);

/** Zustand mit vorgegebenem Feld: liste [[x, y, wert], …] auf einheitlichem Grund */
function feld(grund, liste, q = {}) {
  const z = M.erzeuge(mit(q), zufall(1));
  z.feld.fill(grund);
  for (const [x, y, w] of liste) z.feld[y * z.spalten + x] = w;
  return z;
}

test("Voreinstellungen aus CellForm.dfm und CellForm.pas", () => {
  assert.equal(P.schwelle, 4);
  assert.equal(P.stoerwert, 0.45);
  assert.equal(P.leer, false);
  assert.equal(M.SPALTEN, 101);                 // 404 px / cellScal 4
  assert.equal(M.ZEILEN, 101);
});

test("Regel ohne leere Zellen: weiße Nachbarn gegen den Schwellenwert, Gleichstand bleibt", () => {
  assert.equal(M.regelSchwelle(5, 4, 0), M.WEISS);
  assert.equal(M.regelSchwelle(3, 4, 1), M.SCHWARZ);
  assert.equal(M.regelSchwelle(4, 4, 0), 0);
  assert.equal(M.regelSchwelle(4, 4, 1), 1);
  assert.equal(M.regelSchwelle(0, 0, 0), 0);    // Schwellenwert 0: nur Gleichstand bei 0 weißen Nachbarn
});

test("Regel mit leeren Zellen: Mehrheit, Gleichstand bleibt", () => {
  assert.equal(M.regelMehrheit(3, 2, 0), M.WEISS);
  assert.equal(M.regelMehrheit(2, 3, 1), M.SCHWARZ);
  assert.equal(M.regelMehrheit(2, 2, 1), 1);
});

test("Zählung: ohne leere Zellen ohne die Mitte, mit leeren Zellen samt Mitte; über den Rand (Torus)", () => {
  const z = feld(M.SCHWARZ, [[0, 0, 1], [100, 100, 1], [1, 0, 1], [0, 100, 2]]);
  assert.deepEqual(M.zaehle(z, 0, 0, false), [2, 5]);    // (100,100) und (1,0) weiß; (0,100) leer zählt nicht
  assert.deepEqual(M.zaehle(z, 0, 0, true), [3, 5]);     // die Zelle selbst zählt mit (checkNei)
});

test("ein Schritt ist synchron: alle zählen auf dem alten Feld", () => {
  // waagerechte Linie aus drei weißen Zellen auf Schwarz: kein Nachbar hat mehr als 4 weiße → alles schwarz
  const z = feld(M.SCHWARZ, [[10, 10, 1], [11, 10, 1], [12, 10, 1]]);
  M.schritt(z, P);
  assert.equal(z.feld.reduce((s, v) => s + v, 0), 0);
  assert.equal(z.geaendert, 3);
  // weißer 3 × 3-Block: die Mitte hat 8, die Kanten 5, die Ecken 3 weiße Nachbarn → Ecken werden schwarz
  const b = feld(M.SCHWARZ, [[9, 9, 1], [10, 9, 1], [11, 9, 1], [9, 10, 1], [10, 10, 1], [11, 10, 1], [9, 11, 1], [10, 11, 1], [11, 11, 1]]);
  M.schritt(b, P);
  const w = (x, y) => b.feld[y * b.spalten + x];
  assert.equal(w(10, 10), 1); assert.equal(w(10, 9), 1); assert.equal(w(9, 9), 0); assert.equal(w(11, 11), 0);
});

test("leere Zellen bleiben leer und rechnen nicht mit", () => {
  const p = mit({ leer: true }), z = M.erzeuge(p, zufall(4));
  const leer = Array.from(z.feld, (v, i) => v === M.LEER ? i : -1).filter(i => i >= 0);
  assert.ok(leer.length > 3000 && leer.length < 3800);      // random(3): etwa ein Drittel
  for (let i = 0; i < 10; i++) M.schritt(z, p);
  for (const i of leer) assert.equal(z.feld[i], M.LEER);
  assert.equal(M.zellen(z), z.feld.length - leer.length);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); for (let i = 0; i < 10; i++) M.schritt(z, P); M.stoere(z, P); M.schritt(z, P); return Array.from(z.feld).join(""); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});

test("Voreinstellung: aus der Zufallsverteilung entstehen stabile Gebiete, Anteil gleicher Nachbarn steigt", () => {
  for (const s of [1, 2, 3]) {
    const z = M.erzeuge(P, zufall(s));
    const a = M.gleicheNachbarn(z), w0 = M.anteilWeiss(z);
    assert.ok(a > 0.47 && a < 0.53, `Anfang ${a}`);
    for (let i = 0; i < 200 && z.fertig == null; i++) M.schritt(z, P);
    assert.ok(z.fertig != null && z.fertig < 100, `Saat ${s}: Ruhe nach ${z.fertig}`);
    assert.ok(M.gleicheNachbarn(z) > 0.82, `Ende ${M.gleicheNachbarn(z)}`);
    assert.ok(Math.abs(M.anteilWeiss(z) - w0) < 0.1);       // beide Eigenschaften bleiben etwa gleich häufig
  }
});

test("das Muster ist unempfindlich gegen Störungen: nach der Störung kehrt die Ordnung zurück", () => {
  const z = M.erzeuge(P, zufall(2));
  for (let i = 0; i < 200 && z.fertig == null; i++) M.schritt(z, P);
  const vor = M.gleicheNachbarn(z);
  M.stoere(z, P);
  assert.equal(z.fertig, null);
  assert.ok(M.gleicheNachbarn(z) < vor - 0.15);
  for (let i = 0; i < 200 && z.fertig == null; i++) M.schritt(z, P);
  assert.ok(M.gleicheNachbarn(z) > vor - 0.03);
  assert.deepEqual(z.stoerungen, [z.stoerungen[0]]);
});

test("mit leeren Zellen: Mehrheitsregel trennt ebenfalls", () => {
  const p = mit({ leer: true }), z = M.erzeuge(p, zufall(1));
  for (let i = 0; i < 200 && z.fertig == null; i++) M.schritt(z, p);
  assert.ok(z.fertig != null);
  assert.ok(M.gleicheNachbarn(z) > 0.75);
});

test("Schwellenwert unter 4 oder über 4 lässt eine Eigenschaft gewinnen", () => {
  const ende = q => { const p = mit(q), z = M.erzeuge(p, zufall(1)); for (let i = 0; i < 100 && z.fertig == null; i++) M.schritt(z, p); return M.anteilWeiss(z); };
  assert.equal(ende({ schwelle: 3 }), 1);
  assert.equal(ende({ schwelle: 5 }), 0);
});

test("Maus setzt Zellen im Kreis und lässt leere Zellen leer", () => {
  const z = feld(M.SCHWARZ, [[50, 51, 2]]);
  M.setze(z, 50.5, 50.5, M.WEISS, 2);
  assert.equal(z.feld[50 * 101 + 50], 1);
  assert.equal(z.feld[51 * 101 + 50], 2);
  assert.equal(z.feld[50 * 101 + 53], 0);
});
