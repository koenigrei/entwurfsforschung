// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const P14 = Object.assign({}, P, { fassung: "14" }, M.FASSUNG14);
const mit = q => Object.assign({}, P, q);

/** Zustand mit Knoten an festen Orten [[x, y], …], alle in Ruhe */
function feld(pkte, q = {}) {
  const z = M.erzeuge(mit({ anzahl: 0, ...q }), zufall(1));
  for (const [x, y] of pkte) M.neuerKnoten(z, x, y);
  for (let i = 0; i < z.n; i++) { z.sx[i] = 0; z.sy[i] = 0; }
  return z;
}
const nachbarn = (z, p) => { for (let i = 0; i < z.n; i++) M.nachbarCheck(z, i, p, false); };

test("Voreinstellungen aus facsSteer.dfm (15) und 14_graphPath; Zeichenfläche 770 × 451", () => {
  assert.deepEqual([P.anzahl, P.anlDist, P.repelDist, P.mark, P.decr], [50, 90, 20, 3, 1]);
  assert.deepEqual([P14.anzahl, P14.anlDist, P14.repelDist], [40, 115, 30]);
  assert.deepEqual([M.BREITE, M.HOEHE, M.LINKS, M.OBEN, M.RECHTS, M.UNTEN], [770, 451, 2, 6, 765, 446]);
});

test("Delphi-Round: ,5 zur geraden Zahl", () => {
  assert.deepEqual([0.5, 1.5, 2.5, -0.5, -1.5, 0.49, 0.51, -0.51].map(M.rundeD), [0, 2, 2, 0, -2, 0, 1, -1]);
});

test("Create Nodes: Anzahl, Schritt random(3) − 1, Start = erster, Ziel = letzter Knoten", () => {
  const z = M.erzeuge(P, zufall(3));
  assert.equal(z.n, 50);
  assert.ok(z.sx.every(v => v === -1 || v === 0 || v === 1));
  assert.equal(z.start, 0); assert.equal(z.ziel, 49);
  assert.equal(z.nutzung.length, 2500);
});

test("Nachbarn: alle Knoten näher als Anlager Dist. (Abstand gerundet, strikt kleiner)", () => {
  const z = feld([[100, 100], [189, 100], [190, 100], [400, 400]]);
  nachbarn(z, P);
  assert.deepEqual(z.nb[0], [1]);          // 89 < 90, 90 nicht
  assert.deepEqual(z.nb[1], [0, 2]);
  assert.deepEqual(z.nb[3], []);
});

test("Anlagern: anhalten im Anlagerungsradius, ausweichen unter Anlager Dist. − RepelDist.", () => {
  const z = feld([[100, 100], [180, 100], [300, 300], [700, 50]]);
  z.sx = [1, 1, 1, 1]; z.sy = [1, 1, 1, 1];
  nachbarn(z, P);
  assert.deepEqual([z.sx[0], z.sy[0]], [0, 0]);   // 80: zwischen 70 und 90 → Halt
  assert.deepEqual([z.sx[3], z.sy[3]], [1, 1]);   // allein → wandert weiter
  const w = feld([[100, 100], [140, 100]]);
  nachbarn(w, P);                                 // 40 < 70 → weg vom nächsten: −(140 − 100) / 20 = −2 (± 1)
  assert.ok(w.sx[0] >= -3 && w.sx[0] <= -1);
  assert.ok(w.sx[1] >= 1 && w.sx[1] <= 3);
  assert.ok(Math.abs(w.sy[0]) <= 1);
});

test("Torus vor der Bewegung und Position += round(Schritt)", () => {
  const z = feld([[1, 200], [766, 447], [300, 300]]);
  z.sx = [0, 0, 1.5]; z.sy = [0, 0, -0.5];
  for (let i = 0; i < 3; i++) M.bewege(z, i, P);
  assert.deepEqual([z.x[0], z.y[0]], [765, 200]);
  assert.deepEqual([z.x[1], z.y[1]], [2, 6]);
  assert.deepEqual([z.x[2], z.y[2]], [302, 300]);  // round(1,5) = 2, round(−0,5) = 0
});

test("Maus im Radius: Schritt = ±round((Position − Maus) · 0,1) – abstoßen (links) bzw. anziehen (rechts)", () => {
  const z = feld([[100, 100], [300, 300]]);
  z.maus = { x: 80, y: 100, dir: 1 };
  M.bewege(z, 0, P); M.bewege(z, 1, P);
  assert.deepEqual([z.x[0], z.y[0]], [102, 100]);
  assert.deepEqual([z.x[1], z.y[1]], [300, 300]);
  z.maus.dir = -1; M.bewege(z, 0, P);
  assert.equal(z.x[0], 100);
});

test("A* im Graphen: Pfad über die Nachbarn, geometrisch kürzester Weg; ohne Verbindung kein Pfad", () => {
  const z = feld([[0, 200], [300, 200], [150, 120], [80, 210], [160, 215], [230, 210], [700, 400]], { anlDist: 90 });
  nachbarn(z, mit({ anlDist: 90 }));
  const p = M.findePfad(z, 0, 1);
  assert.deepEqual(p, [1, 5, 4, 3, 0]);            // vom Ziel zum Start
  assert.deepEqual(M.findePfad(z, 0, 6), []);
});

test("Nutzung: + Stärke/10 je Abschnitt (Vorgänger → Knoten), nur solange unter 15; Verfall − Verfallsrate/100", () => {
  const z = feld([[0, 0], [50, 0], [100, 0]]);
  M.markiere(z, [2, 1, 0], P);
  assert.ok(Math.abs(z.nutzung[1 * 3 + 2] - 0.3) < 1e-12);
  assert.ok(Math.abs(z.nutzung[0 * 3 + 1] - 0.3) < 1e-12);
  assert.equal(z.nutzung[2 * 3 + 1], 0);
  z.nutzung[1 * 3 + 2] = 14.9; M.markiere(z, [2, 1], P); assert.ok(Math.abs(z.nutzung[5] - 15.2) < 1e-9);
  M.markiere(z, [2, 1], P); assert.ok(Math.abs(z.nutzung[5] - 15.2) < 1e-9);
  M.nachbarCheck(z, 1, P, true);
  assert.ok(Math.abs(z.nutzung[5] - 15.19) < 1e-9);
});

test("15: zufällige Start- und Zielknoten je Schritt; 14: fester Start/Ziel, keine Nutzung", () => {
  const z = M.erzeuge(P, zufall(4)), paare = new Set();
  for (let i = 0; i < 50; i++) { M.schritt(z, P); paare.add(z.start + "-" + z.ziel); }
  assert.ok(paare.size > 30);
  const w = M.erzeuge(P14, zufall(4));
  for (let i = 0; i < 300; i++) M.schritt(w, P14);
  assert.equal(w.start, 0); assert.equal(w.ziel, 39);
  assert.ok(w.nutzung.every(v => v === 0));
});

test("Graph ordnet sich: nach einigen hundert Schritten ruhen fast alle Knoten", () => {
  const z = M.erzeuge(P, zufall(1));
  for (let i = 0; i < 500; i++) M.schritt(z, P);
  assert.ok(M.auswertung(z).ruhe > 0.9);
});

test("Anlager Dist. ändern setzt alle Knoten wieder in Bewegung (ScrollBar_DistRotChange)", () => {
  const z = M.erzeuge(P, zufall(1));
  for (let i = 0; i < 500; i++) M.schritt(z, P);
  M.aendere(z, mit({ anlDist: 60 }), "anlDist");
  assert.ok(z.sx.some((v, i) => v !== 0 || z.sy[i] !== 0));
});

test("Beschreibung: die Verbindungen in der Mitte werden häufiger genutzt", () => {
  for (const s of [2, 3, 4, 5]) {
    const z = M.erzeuge(P, zufall(s));
    for (let i = 0; i < 1500; i++) M.schritt(z, P);
    const a = M.auswertung(z);
    assert.ok(a.mitte < 0.95, `Saat ${s}: ${a.mitte}`);
  }
});

test("Delete 10 Pts und einzelner Knoten", () => {
  const z = M.erzeuge(P, zufall(1));
  M.schritt(z, P);
  assert.equal(M.loesche10(z), true); assert.equal(z.n, 40);
  assert.ok(z.nb.every(l => l.every(k => k < 40)));
  assert.equal(z.nutzung.length, 1600);
  assert.equal(M.neuerKnoten(z, 10, 10), 40);
  M.schritt(z, P);
  const w = feld([[1, 1]]); assert.equal(M.loesche10(w), false);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); for (let i = 0; i < 200; i++) M.schritt(z, P); return z.x.join(",") + Array.from(z.nutzung).join(","); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});
