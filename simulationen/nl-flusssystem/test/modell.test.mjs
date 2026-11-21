// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const nah = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);
const lauf = (p, saat, n) => { const z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };
/** Zustand mit gesetzten turtles */
function mit(punkte, extra = {}) {
  const z = M.erzeuge(Object.assign({}, P, { density: punkte.length }, extra), zufall(1));
  punkte.forEach(([x, y], k) => { z.x[k] = x; z.y[k] = y; });
  return z;
}

test("Welt wie im GRAPHICS-WINDOW: 201 × 201 Patches, Torus für Abstand und Richtung", () => {
  assert.equal(M.N, 201);
  nah(M.wickle(100.6), -100.4);
  nah(M.abstand(-100, 0, 100, 0), 1);                       // über den Rand
  nah(M.abstand(0, 0, 3, 4), 5);
  assert.equal(M.patchKoord(100.6), -100);
  assert.equal(M.index(-100, 100), 0);
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.n, 146); assert.equal(z.t, 0);
  assert.ok(Array.from(z.x).every(x => Number.isInteger(x) && x >= -100 && x <= 100));   // setxy random-int-or-float 201
});

test("goto-turtle: nächste andere turtle, die näher am Ziel ist; die vorderste hat keine (nobody)", () => {
  const z = mit([[0, 10], [0, 20], [5, 18], [0, 30]]);
  for (let k = 0; k < 4; k++) z.dist[k] = M.abstand(z.x[k], z.y[k], 0, 0);
  assert.equal(M.naechsteNaeher(z, 0), -1);
  assert.equal(M.naechsteNaeher(z, 1), 2);                 // (5, 18) ist näher am Ziel und am nächsten
  assert.equal(M.naechsteNaeher(z, 3), 1);                 // (0, 20) liegt näher als (5, 18)
});

test("attract: Schritt fd 1 zum Gegenüber, nur wenn es weiter als point-dist entfernt ist; stamp orange", () => {
  const z = mit([[0, 10], [0, 12]]);
  M.attract(z, P);
  nah(z.y[0], 9); nah(z.x[0], 0);                          // vorderste turtle: zum Ziel (0, 0)
  nah(z.y[1], 12);                                         // Abstand zur vorderen 2 (nach deren Schritt 3) ≤ point-dist → steht
  assert.equal(z.pfad[M.index(0, 9)], 1);
  assert.equal(z.pfad[M.index(0, 12)], 0);
  const w = mit([[0, 2]]);
  M.attract(w, P); nah(w.y[0], 2);                          // am Ziel (≤ point-dist) bleibt sie stehen
  const o = mit([[0, 10]], { leavePath: false });
  M.attract(o, Object.assign({}, P, { leavePath: false })); assert.equal(o.pfad.reduce((s, v) => s + v, 0), 0);
});

test("attract über den Rand: der kürzere Weg", () => {
  const z = mit([[-99, 0]]);
  M.setzeZiel(z, 200.5 - 10, 100.5);                         // Ziel (90, 0): über den Rand 12 Patches entfernt
  nah(z.hx, 90); nah(z.hy, 0);
  M.attract(z, P);
  nah(z.x[0], -100);
});

test("repel: bk repel-strength von der nächsten turtle", () => {
  const z = mit([[0, 0], [2, 0]]);
  M.repel(z, P);
  nah(z.x[0], -0.2); nah(z.x[1], 2.2);
});

test("deletePath löscht die Spuren; gleiche Position ohne Richtung führt nicht zu NaN", () => {
  const z = lauf(P, 1, 20);
  assert.ok(z.pfad.some(v => v));
  M.loesche(z); assert.ok(z.pfad.every(v => !v));
  const g = mit([[5, 5], [5, 5], [0, 40]], { "point-dist": 0 });
  for (let i = 0; i < 50; i++) M.schritt(g, Object.assign({}, P, { "point-dist": 0, repel: true }));
  assert.ok(Array.from(g.x).concat(Array.from(g.y)).every(Number.isFinite));
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => { const z = lauf(P, s, 60); return Array.from(z.x).join(",") + Array.from(z.pfad).join(""); };
  assert.equal(f(7), f(7));
  assert.notEqual(f(7), f(8));
});

test("erwartetes Verhalten: die Spuren bündeln sich wie ein Flusslauf – je mehr Quellen, desto stärker", () => {
  const b = d => { let s = 0; for (const saat of [1, 2, 3]) { const p = Object.assign({}, P, { density: d }), z = lauf(p, saat, 300), a = M.auswertung(z, p); assert.equal(a.ruhe, 1); s += a.buendelung; } return s / 3; };
  const wenig = b(20), viel = b(146), sehrViel = b(400);
  assert.ok(viel > 0.6, `Bündelung ${viel}`);              // 146 Quellen: ein Drittel der Einzelwege genügt
  assert.ok(wenig < viel && viel < sehrViel, `${wenig} < ${viel} < ${sehrViel}`);
});

test("erwartetes Verhalten: ein neuer Zielpunkt lässt einen neuen Strang entstehen", () => {
  const z = lauf(P, 1, 150), vorher = M.auswertung(z, P).pfad;
  M.setzeZiel(z, 160, 40);
  for (let i = 0; i < 300; i++) M.schritt(z, P);
  const a = M.auswertung(z, P);
  assert.ok(a.pfad > vorher, `${vorher} → ${a.pfad}`);
  assert.ok(a.ruhe > 0.95, `angekommen ${a.ruhe}`);
});

test("t zählt die ticks", () => {
  assert.equal(lauf(P, 1, 25).t, 25);
});
