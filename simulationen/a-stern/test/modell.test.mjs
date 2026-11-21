// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const I = M.idx;
const leer = () => { const z = M.erzeuge({}, zufall(1)); M.waendeLoeschen(z); M.neueSuche(z); return z; };
const nachbar = (a, b) => Math.abs(a % M.SPALTEN - b % M.SPALTEN) <= 1 && Math.abs(Math.floor(a / M.SPALTEN) - Math.floor(b / M.SPALTEN)) <= 1 && a !== b;

test("Feld und Ausgangslage wie RectanglCreate: 54 × 33 Zellen, Start [20,5], Ziel [20,50], Wand Spalte 30", () => {
  assert.equal(M.SPALTEN, 54);
  assert.equal(M.ZEILEN, 33);
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.start, I(20, 5));
  assert.equal(z.ziel, I(20, 50));
  for (let i = 0; i < 33; i++) assert.equal(z.zelle[I(i, 30)], i >= 10 && i <= 30 ? M.WAND : M.FREI);
  assert.equal(z.t, 0);
  assert.deepEqual(z.offen, [z.start]);
});

test("calcF: G + 10 waagerecht/senkrecht, + 14 diagonal; H = 10 · Manhattan-Distanz; F = G + H", () => {
  const z = leer();
  z.G[I(5, 5)] = 30;
  assert.equal(M.berechneF(z, I(5, 5), I(5, 6)), false);
  assert.equal(z.G[I(5, 6)], 40);
  assert.equal(z.H[I(5, 6)], 10 * (50 - 6) + 10 * (20 - 5));
  assert.equal(z.F[I(5, 6)], z.G[I(5, 6)] + z.H[I(5, 6)]);
  assert.equal(M.berechneF(z, I(5, 5), I(6, 6)), false);
  assert.equal(z.G[I(6, 6)], 44);
  assert.equal(z.H[I(6, 6)], 10 * 44 + 10 * 14);
});

test("Wand wird nicht diagonal geschnitten: Prüfung der vier Nachbarn der neuen Zelle (wie im Original)", () => {
  const z = leer();
  z.zelle[I(5, 6)] = M.WAND;                               // rechts neben (5,5), oberhalb von (6,6)
  assert.equal(M.berechneF(z, I(5, 5), I(6, 6)), true);    // diagonal an der Wandecke vorbei: verboten
  assert.equal(M.berechneF(z, I(5, 5), I(6, 5)), false);   // senkrecht: erlaubt
  z.zelle[I(5, 6)] = M.FREI; z.zelle[I(7, 6)] = M.WAND;     // Wand liegt jenseits der Zielzelle (strenge Eigenheit des Originals)
  assert.equal(M.berechneF(z, I(5, 5), I(6, 6)), true);
  assert.equal(M.wandDaneben(z, 0, 0), false);              // Rand zählt nicht als Wand
});

test("checkNeighbour: Wände und geschlossene Zellen übergangen, neue Zellen mit Vorgänger in die offene Liste", () => {
  const z = leer();
  const k = I(10, 10);
  z.zelle[I(9, 10)] = M.WAND; z.geschlossen[I(11, 11)] = 1; z.geschlossen[k] = 1;   // findPath schließt den Knoten vor checkNeighbour
  M.pruefeNachbarn(z, k);
  const neu = z.offen.filter(i => i !== z.start);
  // 8 Nachbarn − Wand − geschlossene Zelle − 2 Diagonalen neben der Wand (9,9) und (9,11) = 4
  assert.deepEqual(neu.sort((a, b) => a - b), [I(10, 9), I(10, 11), I(11, 9), I(11, 10)]);
  for (const n of neu) assert.equal(z.vorg[n], k);
});

test("schon offene Zelle: Vorgänger wechselt nur, wenn das neue G nicht größer ist", () => {
  const z = leer();
  const ziel = I(10, 11);
  z.offen.push(ziel); z.inOffen[ziel] = 1; z.G[ziel] = 50; z.vorg[ziel] = 7;
  z.G[I(10, 10)] = 45; M.pruefeNachbarn(z, I(10, 10));     // 45 + 10 = 55 > 50 → alter Vorgänger bleibt
  assert.equal(z.vorg[ziel], 7); assert.equal(z.G[ziel], 50);
  z.G[I(9, 10)] = 40; M.pruefeNachbarn(z, I(9, 10));       // 40 + 14 = 54 > 50 → bleibt
  assert.equal(z.vorg[ziel], 7);
  z.G[I(11, 11)] = 40; M.pruefeNachbarn(z, I(11, 11));     // 40 + 10 = 50, gleich → neuer Vorgänger
  assert.equal(z.vorg[ziel], I(11, 11)); assert.equal(z.G[ziel], 50);
});

test("Ausgangslage: A* findet den Weg um die Wand, lückenlos und ohne diagonalen Schnitt", () => {
  const z = M.erzeuge({}, zufall(1));
  M.sucheGanz(z);
  assert.equal(z.status, "gefunden");
  assert.equal(z.iter, 569);
  assert.equal(z.kosten, 538);
  assert.equal(z.optimum, 538);
  const kette = [z.ziel, ...z.pfad, z.start];
  for (let j = 1; j < kette.length; j++) {
    assert.ok(nachbar(kette[j - 1], kette[j]));
    assert.equal(z.zelle[kette[j]], M.FREI);
  }
  // der Weg führt über oder unter der Wand (Zeilen 10–30) vorbei
  assert.ok(z.pfad.some(k => Math.floor(k / M.SPALTEN) < 10 || Math.floor(k / M.SPALTEN) > 30));
});

test("ohne Hindernis: gerade Linie, 45 Schritte à 10", () => {
  const z = leer();
  M.sucheGanz(z);
  assert.equal(z.status, "gefunden");
  assert.equal(z.kosten, 450);
  assert.equal(z.pfad.length, 44);
  assert.ok(z.pfad.every(k => Math.floor(k / M.SPALTEN) === 20));
});

test("eingemauertes Ziel: „kein Pfad möglich!“, die Suche endet", () => {
  const z = leer();
  for (let i = 19; i <= 21; i++) for (let k = 49; k <= 51; k++) if (I(i, k) !== z.ziel) z.zelle[I(i, k)] = M.WAND;
  M.neueSuche(z); M.sucheGanz(z);
  assert.equal(z.status, "keinPfad");
  assert.equal(z.pfad.length, 0);
  assert.equal(M.suchSchritt(z), false);
});

test("Start direkt neben dem Ziel: leerer Pfad statt Absturz (Fehler des Originals behoben)", () => {
  const z = leer();
  M.setzeStart(z, I(19, 49));
  M.neueSuche(z); M.sucheGanz(z);
  assert.equal(z.status, "gefunden");
  assert.deepEqual(z.pfad, []);
  assert.equal(z.kosten, 14);
});

test("Manhattan-Heuristik überschätzt diagonale Wege: A* findet nicht immer den kürzesten Pfad", () => {
  let mitUmweg = 0, gefunden = 0;
  for (let s = 1; s <= 40; s++) {
    const r = zufall(s), z = leer();
    for (let i = 0; i < z.zelle.length; i++) if (r() < 0.25 && i !== z.start && i !== z.ziel) z.zelle[i] = M.WAND;
    M.neueSuche(z); M.sucheGanz(z);
    if (z.status !== "gefunden") continue;
    gefunden++;
    assert.ok(z.kosten >= z.optimum);
    if (z.kosten > z.optimum) mitUmweg++;
  }
  assert.ok(gefunden > 20);
  assert.ok(mitUmweg > 5, `nur ${mitUmweg} von ${gefunden} mit Umweg`);
});

test("Schritt = ein expandierter Knoten; t zählt weiter, die Suche bleibt nach dem Ende stehen", () => {
  const z = M.erzeuge({}, zufall(1));
  M.schritt(z, M.STANDARD);
  assert.equal(z.t, 1); assert.equal(z.iter, 1);
  assert.ok(z.geschlossen[z.start]);
  for (let i = 0; i < 700; i++) M.schritt(z, M.STANDARD);
  assert.equal(z.t, 701); assert.equal(z.iter, 569); assert.equal(z.status, "gefunden");
});

test("gleiche Ausgangslage, gleicher Lauf (das Modell enthält keinen Zufall)", () => {
  const lauf = s => { const z = M.erzeuge({}, zufall(s)); M.sucheGanz(z); return z.pfad.join(","); };
  assert.equal(lauf(7), lauf(7));
  assert.equal(lauf(7), lauf(8));
});

test("Maus: Wände nicht auf Start/Ziel, Linien lückenlos; Start/Ziel versetzen entfernt eine Wand", () => {
  const z = leer();
  assert.equal(M.setzeWand(z, z.start, true), false);
  assert.equal(M.wandLinie(z, I(2, 2), I(2, 12), true), true);
  for (let k = 2; k <= 12; k++) assert.equal(z.zelle[I(2, k)], M.WAND);
  M.wandLinie(z, I(2, 5), I(2, 7), false);
  assert.equal(z.zelle[I(2, 6)], M.FREI);
  assert.equal(M.setzeStart(z, I(2, 2)), true);
  assert.equal(z.zelle[I(2, 2)], M.FREI); assert.equal(z.start, I(2, 2));
  assert.equal(M.setzeZiel(z, z.start), false);
  assert.equal(M.zelleBei(53.9, 32.9), I(32, 53));
  assert.equal(M.zelleBei(54, 1), -1);
});
