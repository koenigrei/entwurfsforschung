// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);

/** Leerer Zustand mit Agenten an festen Orten: [[x, y, typ], …] */
function feld(agenten, q = {}) {
  const z = M.erzeuge(mit({ anzahl: 0, ...q }), zufall(1));
  z.n = agenten.length;
  z.x = Int16Array.from(agenten, a => a[0]); z.y = Int16Array.from(agenten, a => a[1]); z.typ = Uint8Array.from(agenten, a => a[2]);
  z.sucht = new Uint8Array(z.n).fill(1); z.anteil = new Float32Array(z.n); z.nachbarn = new Uint16Array(z.n);
  agenten.forEach((a, i) => { z.zelle[a[1] * z.spalten + a[0]] = i; });
  return z;
}

test("Voreinstellungen aus CellForm.dfm und CellForm.pas", () => {
  assert.equal(P.schwelle, 74);
  assert.equal(P.anzahl, 1000);
  assert.equal(P.radius, 1);
  assert.equal(P.weite, 10);
  assert.equal(M.SPALTEN * M.ZEILEN, 1600);   // 404 px / 10 px → 40 × 40 Zellen
});

test("Torus klappt einen Überlauf auf die andere Seite (TForm1.torus)", () => {
  assert.equal(M.torus(-1, 40), 39);
  assert.equal(M.torus(-10, 40), 30);
  assert.equal(M.torus(40, 40), 0);
  assert.equal(M.torus(50, 40), 10);
  assert.equal(M.torus(17, 40), 17);
});

test("rndN(−10, 10) liefert −10 … 11 wie im Original", () => {
  const r = zufall(5), seen = new Set();
  for (let i = 0; i < 20000; i++) seen.add(M.rndN(r, -10, 10));
  assert.deepEqual([...seen].sort((a, b) => a - b), Array.from({ length: 22 }, (_, i) => i - 10));
  assert.equal(M.rndN(() => 0, -10, 10), -10);
  assert.equal(M.rndN(() => 0.5, -10, 10), 1);   // round(21 · 0,5 − 10) = round(0,5)
});

test("Anteil gleicher Nachbarn und Schwellenwert (calcCells)", () => {
  assert.equal(M.aehnlich(6, 2), 75);
  assert.equal(M.aehnlich(0, 0), 0);             // ohne Nachbarn: similar := 0
  assert.equal(M.zufrieden(75, 74), true);       // 6 von 8 reichen bei 74 %
  assert.equal(M.zufrieden(M.aehnlich(5, 2), 74), false);   // 71,4 %
  assert.equal(M.zufrieden(74, 74), false);      // nur „größer als“ hält an
});

test("Moore-Nachbarschaft zählt Gleiche und Andere, nicht sich selbst und keine freien Zellen", () => {
  const z = feld([[5, 5, 0], [4, 4, 0], [6, 5, 0], [5, 6, 1], [7, 7, 1]]);
  assert.deepEqual(M.zaehle(z, 5, 5, 0, 1), [2, 1]);
  assert.deepEqual(M.zaehle(z, 5, 5, 0, 2), [2, 2]);   // Radius 2 erreicht (7, 7)
  assert.deepEqual(M.zaehle(z, 5, 5, 0, 1, 4 * z.spalten + 4), [1, 1]);   // alte Zelle gilt als frei
});

test("Nachbarschaft über den Rand (Torus)", () => {
  const z = feld([[0, 0, 1], [39, 39, 1], [39, 0, 0], [1, 39, 1]]);
  assert.deepEqual(M.zaehle(z, 0, 0, 1, 1), [2, 1]);
});

test("Bewertung: Anhalten über dem Schwellenwert, sonst suchen", () => {
  const z = feld([[5, 5, 0], [4, 5, 0], [6, 5, 0], [5, 6, 1], [20, 20, 1]]);
  M.bewerte(z, P);
  assert.deepEqual(Array.from(z.sucht), [1, 1, 1, 1, 1]);   // 2/3 = 66,7 % ≤ 74; (4,5): 1/2 = 50 %; (20,20) allein
  M.bewerte(z, mit({ schwelle: 60 }));
  assert.equal(z.sucht[0], 0);
  assert.equal(z.suchend, 4);
});

test("Umzug nur auf freie Zellen, höchstens weite + 1 Zellen je Achse; Angelagerte bleiben", () => {
  const z = M.erzeuge(mit({ anzahl: 1200 }), zufall(3));
  M.bewerte(z, P);
  const vor = { x: Int16Array.from(z.x), y: Int16Array.from(z.y), sucht: Uint8Array.from(z.sucht) };
  M.ziehe(z, P);
  const belegt = new Set();
  for (let i = 0; i < z.n; i++) {
    const c = z.y[i] * z.spalten + z.x[i];
    assert.ok(!belegt.has(c)); belegt.add(c);
    assert.equal(z.zelle[c], i);
    const d = (a, b) => Math.min(Math.abs(a - b), 40 - Math.abs(a - b));
    assert.ok(d(z.x[i], vor.x[i]) <= 11 && d(z.y[i], vor.y[i]) <= 11);
    if (!vor.sucht[i]) assert.ok(z.x[i] === vor.x[i] && z.y[i] === vor.y[i]);
  }
  assert.equal(z.zelle.filter(v => v !== M.FREI).length, z.n);
});

test("zu Beginn suchen alle Agenten, der Verlauf beginnt bei 0 angelagert", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0);
  assert.equal(z.suchend, 1000);
  assert.deepEqual(z.verlauf[0].slice(0, 2), [0, 1000]);
  const typen = Array.from(z.typ).reduce((s, v) => s + v, 0);
  assert.ok(typen > 400 && typen < 600);       // random(2): etwa halb schwarz, halb weiß
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); for (let i = 0; i < 40; i++) M.schritt(z, P); return Array.from(z.x).join() + Array.from(z.y).join() + z.verlauf.join(); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});

test("Voreinstellung: der Anteil gleicher Nachbarn steigt deutlich, alle Agenten lagern sich an", () => {
  for (const s of [1, 2, 3]) {
    const z = M.erzeuge(P, zufall(s));
    const anfang = M.gleicheNachbarn(z);
    assert.ok(anfang > 45 && anfang < 55, `Anfang ${anfang}`);   // Zufallsverteilung: etwa die Hälfte gleich
    for (let i = 0; i < 300 && z.suchend > 0; i++) M.schritt(z, P);
    assert.equal(z.suchend, 0, `Saat ${s}: noch ${z.suchend} suchend`);
    assert.ok(z.fertig > 20 && z.fertig < 200, `Ruhe nach ${z.fertig}`);
    assert.ok(M.gleicheNachbarn(z) > 85, `Ende ${M.gleicheNachbarn(z)}`);
    assert.ok(z.verlauf[20][0] > z.verlauf[1][0]);              // angelagert steigt, wie im Diagramm des Originals
  }
});

test("niedriger Schwellenwert kommt schneller zur Ruhe, sehr hoher gar nicht", () => {
  const ruhe = q => { const p = mit(q), z = M.erzeuge(p, zufall(1)); for (let i = 0; i < 300 && z.suchend > 0; i++) M.schritt(z, p); return z.fertig; };
  assert.ok(ruhe({ schwelle: 30 }) < ruhe({ schwelle: 74 }));
  assert.equal(ruhe({ schwelle: 90 }), null);
});

test("Option der erweiterten Fassung: nur in bessere Lage umziehen", () => {
  const p = mit({ nurBesser: true }), z = M.erzeuge(p, zufall(2));
  M.schritt(z, p);
  // jeder Umzug muss den Anteil gleicher Nachbarn erhöht haben → nach einem Schritt deutlich über dem Grundmodell
  const g = M.erzeuge(P, zufall(2)); M.schritt(g, P);
  assert.ok(M.gleicheNachbarn(z) > M.gleicheNachbarn(g) + 10);
});

test("mehr Gruppen: Typen 0 … gruppen − 1, Segregation steigt auch dann", () => {
  const p = mit({ gruppen: 4, schwelle: 50 }), z = M.erzeuge(p, zufall(1));
  assert.equal(Math.max(...z.typ), 3);
  const anfang = M.gleicheNachbarn(z);
  for (let i = 0; i < 150; i++) M.schritt(z, p);
  assert.ok(M.gleicheNachbarn(z) > anfang + 40);
});

test("Schwellenwert ändern wirkt sofort auf Suchen/Anhalten", () => {
  const z = M.erzeuge(P, zufall(1));
  for (let i = 0; i < 5; i++) M.schritt(z, P);
  const vorher = z.suchend;
  const p = mit({ schwelle: 10 }); M.aendere(z, p, "schwelle");
  assert.ok(z.suchend < vorher);
});
