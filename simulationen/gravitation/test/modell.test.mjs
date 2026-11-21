// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");

/** Graph von Hand: Knoten [[x, y, P], …], Verbindungen [[a, b], …] */
function graph(knoten, kanten) {
  const z = M.erzeuge({ knoten: 0 }, zufall(1));
  z.nodes = knoten.map(([x, y, P]) => ({ x, y, P: P || 20 }));
  for (const [a, b] of kanten) M.verbinde(z, a, b);
  z.analyse = M.neueAnalyse(z);
  return z;
}

test("Zeichenfläche 500 × 400, Knotengröße 20 (15 … 200) wie im Original", () => {
  assert.equal(M.BREITE, 500); assert.equal(M.HOEHE, 400);
  assert.equal(M.P_START, 20); assert.equal(M.P_MIN, 15); assert.equal(M.P_MAX, 200);
  assert.equal(M.dist({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.equal(M.dist({ x: 0, y: 0 }, { x: 1, y: 1 }), 1);       // round(1,414)
});

test("Startgraph: gewünschte Knotenzahl, zusammenhängend, keine doppelten Verbindungen", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.nodes.length, 9);
  assert.ok(M.komponenten(z).every(k => k === 0));
  const s = new Set(z.kanten.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b)));
  assert.equal(s.size, z.kanten.length);
  assert.equal(M.verbinde(z, z.kanten[0][1], z.kanten[0][0]), false);
});

test("A* im Graphen: Zahl der Kanten des kürzesten Weges (pfadList.Count), ohne Weg 0", () => {
  // Kette 0 – 1 – 2 – 3 und Abkürzung 0 – 3 über einen Umweg-Knoten 4, getrennter Knoten 5
  const z = graph([[0, 0], [100, 0], [200, 0], [300, 0], [150, 300], [400, 300]], [[0, 1], [1, 2], [2, 3], [0, 4], [4, 3]]);
  assert.deepEqual(M.findePfad(z, 0, 3), [3, 2, 1]);   // vom Ziel zurück, ohne Start
  assert.equal(M.findePfad(z, 0, 4).length, 1);
  assert.equal(M.findePfad(z, 0, 5).length, 0);        // kein Weg
});

test("A* nimmt den geometrisch kürzesten Weg, auch wenn er mehr Kanten hat", () => {
  // direkt über den hohen Knoten 2 (2 Kanten, lang) oder flach über 3 und 4 (3 Kanten, kurz)
  const z = graph([[0, 200], [300, 200], [150, 0], [100, 210], [200, 210]], [[0, 2], [2, 1], [0, 3], [3, 4], [4, 1]]);
  assert.equal(M.findePfad(z, 0, 1).length, 3);
});

test("Erreichbarkeit: Matrix, Zeilensummen, dLänge, Streuwert und mittlere Länge wie in der Tabelle", () => {
  const z = graph([[0, 0], [100, 0], [200, 0], [300, 0]], [[0, 1], [1, 2], [2, 3]]);
  M.analyseGanz(z);
  assert.deepEqual(z.analyse.k, [[0, 1, 2, 3], [1, 0, 1, 2], [2, 1, 0, 1], [3, 2, 1, 0]]);
  const w = M.auswertung(z);
  assert.deepEqual(w.zeilen.map(r => r.summe), [6, 4, 4, 6]);     // Mitte besser erreichbar
  assert.deepEqual(w.zeilen.map(r => r.dLaenge), [2, 1.33, 1.33, 2]);
  assert.equal(w.streuwert, 20);
  assert.equal(w.mittel, 1.67);                                   // 20 / 12, auf zwei Stellen
});

test("Ohne Weg zählt der Wert nicht als positiv (counter)", () => {
  const z = graph([[0, 0], [100, 0], [300, 300]], [[0, 1]]);
  M.analyseGanz(z);
  const w = M.auswertung(z);
  assert.deepEqual(w.zeilen.map(r => [r.summe, r.positiv, r.dLaenge]), [[1, 1, 1], [1, 1, 1], [0, 0, 0]]);
  assert.equal(w.mittel, 1);
});

test("Paare in der Reihenfolge der Schleifen I außen, J innen; ein Schritt = ein Paar", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(q => M.paar(3, q)), [[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]]);
  const z = M.erzeuge({}, zufall(1));
  for (let i = 0; i < 72; i++) M.schritt(z, M.STANDARD);
  assert.ok(M.fertig(z)); assert.equal(z.t, 72);
  M.schritt(z, M.STANDARD);
  assert.equal(z.analyse.paar, 72); assert.equal(z.t, 73);
  const w = M.auswertung(z);
  assert.equal(w.streuwert, 170); assert.equal(w.mittel, 2.36);
});

test("Gravitationsmodell: F = P_i · P_j / d (Programm) bzw. / d² (Formel), Linienstärke 1 + round(F)", () => {
  const a = { x: 0, y: 0, P: 20 }, b = { x: 100, y: 0, P: 40 };
  assert.equal(M.strom(a, b, 1), 8);
  assert.equal(M.strom(a, b, 2), 0.08);
  assert.equal(M.linie(8, 1), 9);
  assert.equal(M.linie(0.08, 1), 1);
  assert.equal(M.linie(0.08, 100), 9);
  assert.equal(M.strom(a, { x: 0, y: 0, P: 20 }, 1), 0);   // d = 0: kein Strom (Original: Division übersprungen)
  // doppelte Größe → doppelter Strom; doppelte Entfernung → halber (d) bzw. viertel Strom (d²)
  assert.equal(M.strom({ ...a, P: 40 }, b, 1), 16);
  assert.equal(M.strom(a, { ...b, x: 200 }, 1), 4);
  assert.equal(M.strom(a, { ...b, x: 200 }, 2), 0.02);
});

test("Größe einstellen: unterhalb der Mitte + 1, oberhalb − 1, Grenzen 15 und 200", () => {
  const z = graph([[100, 100, 199], [200, 100, 16]], []);
  assert.equal(M.groesse(z, 0, 120), true); assert.equal(z.nodes[0].P, 200);
  assert.equal(M.groesse(z, 0, 120), false); assert.equal(z.nodes[0].P, 200);
  M.groesse(z, 1, 80); assert.equal(z.nodes[1].P, 15);
  assert.equal(M.groesse(z, 1, 80), false);
});

test("Knoten setzen, finden, löschen (Verbindungen werden umnummeriert)", () => {
  const z = graph([[0, 0], [100, 0], [200, 0]], [[0, 1], [1, 2]]);
  assert.equal(M.knotenBei(z, 103, 4), 1);
  assert.equal(M.knotenBei(z, 50, 50), -1);
  assert.equal(M.neuerKnoten(z, 300, 300), 3);
  assert.equal(z.nodes[3].P, 20);
  M.loescheKnoten(z, 1);
  assert.equal(z.nodes.length, 3);
  assert.deepEqual(z.kanten, []);
  M.verbinde(z, 1, 2); M.loescheKnoten(z, 0);
  assert.deepEqual(z.kanten, [[0, 1]]);
});

test("Änderung am Graphen setzt die Analyse zurück, „sofort“ rechnet sie ganz", () => {
  const z = M.erzeuge({}, zufall(1));
  M.geaendert(z, { sofort: false });
  assert.equal(z.analyse.paar, 0);
  M.geaendert(z, { sofort: true });
  assert.ok(M.fertig(z));
});

test("gleiche Saat, gleicher Graph; andere Saat, anderer Graph", () => {
  const g = s => JSON.stringify(M.erzeuge({}, zufall(s)).nodes);
  assert.equal(g(7), g(7));
  assert.notEqual(g(7), g(8));
});
