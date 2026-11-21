// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);
const R = (x1, y1, x2, y2) => ({ x1, y1, x2, y2 });
const NULL = () => [[0, 0], [0, 0], [0, 0], [0, 0]];
/** exakte Summe aller paarweisen Schnittflächen (Kontrolle) */
const brutto = rs => { let s = 0; for (let i = 0; i < rs.length; i++) for (let k = i + 1; k < rs.length; k++) { const q = M.intersectRect(rs[i], rs[k]); if (q) s += M.flaeche(q); } return s; };

test("neues Rechteck: Mittelpunkt random(410)/random(394), Seiten 10 + random(50), Reihenfolge links, oben, rechts, unten", () => {
  const folge = [0.5, 0.25, 0, 0.02, 0.999, 0.5];               // ganz(n) = floor(r · n)
  let i = 0; const f = () => folge[i++]; f.ganz = n => Math.floor(f() * n);
  const r = M.neuesRechteck(f);
  assert.deepEqual(r, { px: 205, py: 98, x1: 195, y1: 87, x2: 264, y2: 133 });
  const z = zufall(3);
  for (let k = 0; k < 2000; k++) {
    const q = M.neuesRechteck(z);
    assert.ok(q.px >= 0 && q.px < 410 && q.py >= 0 && q.py < 394);
    assert.ok(q.px - q.x1 >= 10 && q.px - q.x1 <= 59 && q.x2 - q.px >= 10 && q.x2 - q.px <= 59);
    assert.ok(q.py - q.y1 >= 10 && q.py - q.y1 <= 59 && q.y2 - q.py >= 10 && q.y2 - q.py <= 59);
  }
  const null4 = () => 0; null4.ganz = () => 0;                 // Mausklick: Mittelpunkt vorgegeben, nur die Seiten zufällig
  assert.deepEqual(M.neuesRechteck(null4, 100, 50), { px: 100, py: 50, x1: 90, y1: 40, x2: 110, y2: 60 });
});

test("IntersectRect: Schnittrechteck, leer bei Berührung und ohne Überlagerung", () => {
  assert.deepEqual(M.intersectRect(R(0, 0, 10, 10), R(5, 2, 20, 8)), R(5, 2, 10, 8));
  assert.equal(M.intersectRect(R(0, 0, 10, 10), R(10, 2, 20, 8)), null);     // nur Berührung
  assert.equal(M.intersectRect(R(0, 0, 10, 10), R(20, 20, 30, 30)), null);
  assert.equal(M.flaeche(R(5, 2, 10, 8)), 30);
});

test("Clipcodes: Bits unten 8, oben 4, rechts 2, links 1 – Rand zählt als innen", () => {
  const A = R(0, 0, 10, 10);
  assert.equal(M.clipCode(A, 5, 5), 0);
  assert.equal(M.clipCode(A, 10, 0), 0);
  assert.equal(M.clipCode(A, -1, -1), 5);   // '0101' links oben
  assert.equal(M.clipCode(A, 11, -1), 6);   // '0110' rechts oben
  assert.equal(M.clipCode(A, 11, 11), 10);  // '1010' rechts unten
  assert.equal(M.clipCode(A, -1, 11), 9);   // '1001' links unten
  assert.deepEqual([0, 5, 6, 10, 9, 12].map(M.binaer), ["0000", "0101", "0110", "1010", "1001", "1100"]);
});

test("Cohen-Sutherland (04): Ecke, Durchkreuzung, innen, Überdeckung (Fall 0), getrennt, Berührung", () => {
  const A = R(0, 0, 100, 60);
  const fall = b => M.cohenSutherland(A, b, NULL());
  let e = fall(R(70, 40, 150, 90));                         // Ecke rechts unten
  assert.deepEqual(e.codes, [0, 2, 10, 8]);
  assert.equal(e.punkte, 4);
  assert.deepEqual(e.rechtecke, [R(70, 40, 100, 60)]);
  e = fall(R(-20, 20, 130, 30));                            // waagerechter Balken quer durch A
  assert.deepEqual(e.rechtecke, [R(0, 20, 100, 30)]);
  e = fall(R(40, -10, 50, 80));                             // senkrechter Balken
  assert.deepEqual(e.rechtecke, [R(40, 0, 50, 60)]);
  e = fall(R(10, 10, 20, 20));                              // ganz innen: vier Punkte aus Fall a
  assert.deepEqual(e.rechtecke, [R(10, 10, 20, 20)]);
  e = fall(R(-10, -10, 200, 200));                          // B überdeckt A: Fall 0, lapped bleibt falsch
  assert.equal(e.lapped, false);
  assert.deepEqual(e.codes, [5, 6, 10, 9]);
  assert.deepEqual(e.rechtecke, [A]);
  e = fall(R(150, 0, 200, 10));                             // getrennt
  assert.equal(e.lapped, false);
  assert.deepEqual(e.rechtecke, []);
  e = fall(R(100, 10, 120, 20));                            // Berührung: Überlagerungsrechteck der Fläche 0
  assert.equal(e.rechtecke.length, 1);
  assert.equal(M.flaeche(e.rechtecke[0]), 0);
});

test("Schnittpunkt() kennt nur rechte Winkel; Sortieren im Uhrzeigersinn", () => {
  assert.deepEqual(M.schnittpunkt([100, 0], [100, 60], [70, 40], [150, 40]), [100, 40]);
  assert.deepEqual(M.schnittpunkt([100, 60], [0, 60], [70, 90], [70, 40]), [70, 60]);
  assert.equal(M.schnittpunkt([0, 0], [10, 0], [0, 5], [10, 5]), null);
  const lap = [[10, 20], [0, 20], [0, 0], [10, 0]];
  M.sortiere(lap);
  assert.deepEqual(lap, [[0, 0], [10, 0], [10, 20], [0, 20]]);
});

test("04 und 05 ergeben dieselbe Überlagerungsfläche („die gleiche Berechnung“), auch mit fortgeschriebenem lapKoord", () => {
  for (let s = 1; s <= 300; s++) {
    const a = M.erzeuge(mit({ fassung: "04", numbers: 30 }), zufall(s)); M.rechneAlle(a);
    const b = M.erzeuge(mit({ fassung: "05", numbers: 30 }), zufall(s)); M.rechneAlle(b);
    assert.equal(a.summe, b.summe, "Saat " + s);
    assert.equal(a.summe, a.exakt);
    assert.equal(b.summe, brutto(b.rechtecke));
    assert.ok(a.laps.length >= b.laps.length);               // 04 zählt Berührungen als Fläche 0 mit
  }
});

test("Ablauf: ein Schritt = ein Paar in der Reihenfolge der Schleifen I < K; danach neue Rechtecke", () => {
  const p = mit({ numbers: 10 }), z = M.erzeuge(p, zufall(5));
  assert.equal(z.rechtecke.length, 10);
  assert.equal(z.t, 0);
  const folge = [];
  while (z.offen) { M.schritt(z, p); folge.push([z.letztes.a, z.letztes.b]); }
  const soll = []; for (let i = 0; i < 10; i++) for (let k = i + 1; k < 10; k++) soll.push([i, k]);
  assert.deepEqual(folge, soll);
  assert.equal(z.t, 45);
  assert.equal(z.geprueft, M.paare(10));
  M.schritt(z, p);                                           // nächster „Klick“: 10 neue Rechtecke
  assert.equal(z.t, 46);
  assert.equal(z.rechtecke.length, 20);
  let n = 0; while (z.offen) { M.schritt(z, p); assert.ok(z.letztes.b >= 10); n++; }
  assert.equal(n, M.paare(20) - M.paare(10));                // nur Paare mit einem neuen Rechteck
  assert.equal(z.summe, brutto(z.rechtecke));
  assert.equal(z.summe, z.laps.reduce((s, l) => s + M.flaeche(l), 0));
});

test("Fassung wechseln rechnet dieselben Rechtecke neu; löschen; Rechtsklick entfernt das oberste Rechteck", () => {
  const p = mit({ numbers: 20 }), z = M.erzeuge(p, zufall(2));
  M.rechneAlle(z);
  const vorher = JSON.stringify(z.rechtecke), s = z.summe;
  p.fassung = "04"; M.aendere(z, p, "fassung");
  assert.equal(z.fassung, "04");
  assert.equal(z.laps.length, 0);
  assert.ok(z.offen);
  M.rechneAlle(z);
  assert.equal(JSON.stringify(z.rechtecke), vorher);
  assert.equal(z.summe, s);
  const r = z.rechtecke[z.rechtecke.length - 1], t = z.t;
  assert.ok(M.entferne(z, r.px, r.py));
  assert.equal(z.rechtecke.length, 19);
  assert.equal(z.t, t);
  assert.equal(z.summe, brutto(z.rechtecke));
  assert.ok(!M.entferne(z, -500, -500));
  M.loesche(z);
  assert.equal(z.rechtecke.length, 0);
  assert.equal(z.summe, 0);
  assert.ok(!z.offen);
  M.schritt(z, p);                                           // nach dem Löschen erzeugt der nächste Schritt neue Rechtecke
  assert.equal(z.rechtecke.length, 20);
  M.erstelle(z, 1, 200, 200);                                // Mausklick: ein Rechteck um (200, 200)
  assert.equal(z.rechtecke.length, 21);
  assert.equal(z.rechtecke[20].px, 200);
});

test("gleiche Saat → gleiche Rechtecke und Flächen; andere Saat → andere", () => {
  const lauf = s => { const p = mit({ numbers: 25 }), z = M.erzeuge(p, zufall(s)); for (let i = 0; i < 400; i++) M.schritt(z, p); return JSON.stringify([z.rechtecke, z.summe]); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});
