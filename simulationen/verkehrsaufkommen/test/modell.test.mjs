// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const Z1 = M.erzeuge(P, zufall(1));                     // einmal erzeugt, für mehrere Tests

test("Feld und Daten wie BmpInfoRead: 21 × 22 Zellen à 30 px, Summen wie im Bild des Originals", () => {
  assert.equal(M.SPALTEN, 21); assert.equal(M.ZEILEN, 22);
  for (const k of ["arbeiter", "arbeitsplaetze", "einzelhandel"]) assert.equal(M.DATEN[k].length, 462);
  assert.deepEqual(M.summen(), { arbeiter: 52664, plaetze: 49203, handel: 52575 });   // Lbl_worker, Lbl_workPl, Lbl_retail
  assert.deepEqual([M.zx(0), M.zy(0), M.zx(22), M.zy(22)], [15, 15, 45, 45]);
});

test("Voreinstellungen aus Main.dfm", () => {
  assert.deepEqual([P.knoten, P.conDist, P.repDist, P.std, P.morgens, P.abends, P.timeScale, P.tScale], [41, 130, 40, 1, 8, 17, 6, 10]);
  assert.equal(Z1.n, 42);                                // For I := 0 To 41
});

test("AssignWorkers: jeder Arbeitsplatz genau einmal vergeben, Arbeiter ohne Platz bleiben übrig", () => {
  const v = M.verteile(zufall(3));
  assert.equal(v.heim.length, 52664);
  const belegt = new Int32Array(462); let ohne = 0;
  for (let w = 0; w < v.heim.length; w++) { if (v.arbeit[w] < 0) ohne++; else belegt[v.arbeit[w]]++; }
  assert.equal(ohne, 52664 - 49203);
  for (let k = 0; k < 462; k++) assert.equal(belegt[k], M.DATEN.arbeitsplaetze[k]);
  for (let w = 0; w < v.heim.length; w++) assert.ok(M.DATEN.arbeiter[v.heim[w]] > 0);
});

test("Graph: Knoten im Feld, Kanten nur zwischen Knoten etwa näher als connect distance", () => {
  const z = Z1;
  for (let i = 0; i < z.n; i++) {
    assert.ok(z.x[i] >= 0 && z.x[i] <= M.RECHTS && z.y[i] >= 0 && z.y[i] <= M.UNTEN);
    for (const k of z.nb[i]) {
      assert.ok(M.dist(z.ox[i], z.oy[i], z.ox[k], z.oy[k]) < P.conDist + 6);   // Kanten nach den Positionen des letzten Durchlaufs
    }
  }
  const kanten = z.nb.reduce((s, l) => s + l.length, 0) / 2;
  assert.ok(kanten > z.n);                                // zusammenhängendes Netz, kein Baum
});

test("A*: Weg von Knoten zu Knoten über Kanten, Start und Ziel eingeschlossen", () => {
  const z = Z1, p = M.findePfad(z, 0, 5);
  assert.equal(p[0], 0); assert.equal(p[p.length - 1], 5);
  for (let j = 1; j < p.length; j++) assert.ok(z.nb[p[j - 1]].includes(p[j]));
});

test("Uhrzeit und Abfahrtsintervalle: Schritt = 1/6 h, Intervall (vorige Zeit + 0,01 … Zeit]", () => {
  assert.equal(M.uhrzeit(1, 6), 0.17);
  assert.equal(M.uhrzeit(48, 6), 8);
  assert.equal(M.uhrzeit(144, 6), 0);
  assert.equal(M.abfahrtsSchritt(8.0, 6), 48);
  assert.equal(M.abfahrtsSchritt(7.9, 6), 48);
  assert.equal(M.abfahrtsSchritt(7.8, 6), 47);
  // jede Zehntelstunde des Tages gehört zu genau einem Schritt
  for (let i = 1; i < 239; i++) assert.ok(M.abfahrtsSchritt(i / 10, 6) > 0, String(i / 10));
});

test("Abfahrtszeiten normalverteilt um 8 und 17 Uhr mit STD 1", () => {
  const z = Z1, mittel = a => a.reduce((s, v) => s + v, 0) / a.length;
  const m = Array.from(z.morgenZeit), e = Array.from(z.abendZeit);
  assert.ok(Math.abs(mittel(m) - 8) < 0.02); assert.ok(Math.abs(mittel(e) - 17) < 0.02);
  const sd = Math.sqrt(mittel(m.map(v => (v - 8) ** 2)));
  assert.ok(Math.abs(sd - 1) < 0.02);
  assert.ok(m.every(v => Math.abs(v * 10 - Math.round(v * 10)) < 1e-4));   // auf 0,1 h gerundet
});

test("travel: ein Knoten je Schritt, Belastung = Reisende auf der Kante, nach der Ankunft frei", () => {
  const z = M.erzeuge(P, zufall(1));
  z.reisende = [{ p: [0, 1, 2], i: 0 }, { p: [0, 1], i: 0 }];
  z.belastung.fill(0);
  M.reise(z);
  const n = z.n;
  assert.equal(z.belastung[1 * n + 0], 1);               // erster Reisender auf 0 → 1; der zweite ist schon angekommen
  assert.equal(z.reisende.length, 1);
  M.reise(z);
  assert.equal(z.belastung[1 * n + 0], 0);
  assert.equal(z.belastung[2 * n + 1], 0);               // Ankunft: letzte Kante sofort wieder frei
  assert.equal(z.reisende.length, 0);
});

test("Tagesrhythmus: zwei Spitzen um 8 und 17 Uhr, nachts kein Verkehr; nach einem Tag sind alle Kanten frei", () => {
  const z = M.erzeuge(P, zufall(2)), unterwegs = [];
  for (let i = 1; i <= 144; i++) { M.schritt(z, P); unterwegs[i] = z.unterwegs; }
  const spitze = (a, b) => { let m = a; for (let i = a; i <= b; i++) if (unterwegs[i] > unterwegs[m]) m = i; return m; };
  const s1 = spitze(30, 70), s2 = spitze(85, 125);
  assert.ok(M.uhrzeit(s1, 6) >= 7.5 && M.uhrzeit(s1, 6) <= 9, String(M.uhrzeit(s1, 6)));
  assert.ok(M.uhrzeit(s2, 6) >= 16.5 && M.uhrzeit(s2, 6) <= 18, String(M.uhrzeit(s2, 6)));
  assert.ok(unterwegs[s1] > 5000 && unterwegs[s2] > 5000);
  assert.ok(unterwegs[12] === 0 && unterwegs[72] < 200);  // 2 Uhr nachts, 12 Uhr mittags
  assert.equal(z.reisende.length, 0);
  assert.ok(z.belastung.every(v => v === 0));
});

test("timeScale ändern: Abfahrten neu auf die Schritte verteilt (12 → 5 min)", () => {
  const z = M.erzeuge(P, zufall(4)), p = Object.assign({}, P, { timeScale: 12 });
  M.aendere(z, p, "timeScale");
  assert.equal(z.tag, 288);
  let n = 0; for (const l of z.fahrplan) n += l.length;
  assert.ok(n > 2 * z.pendler * 0.99);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); for (let i = 0; i < 50; i++) M.schritt(z, P); return z.x.join(",") + "|" + Array.from(z.belastung).join(","); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});
