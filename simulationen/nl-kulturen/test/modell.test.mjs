// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);

/** leeres Feld mit lebenden Patches [[px, py, kult], …] */
function feld(lebend, q = {}) {
  const z = M.erzeuge(mit({ anzahl: 0, ...q }), zufall(1));
  for (const [x, y, k] of lebend) { const c = M.index(x, y); z.state[c] = 1; z.kult[c] = k; }
  return z;
}

test("Voreinstellungen aus den SLIDER-Blöcken, Welt 61 × 61, sechs Kulturen mit neun 8-Bit-Codes", () => {
  assert.deepEqual([P.anzahl, P.mutation, P.tod], [344, 1, 3]);
  assert.equal(M.SEITE, 61);
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.kgen.length, 6);
  for (const g of z.kgen) { assert.equal(g.length, 9); for (const c of g) assert.ok(c >= 0 && c < 256); }
  assert.equal(M.alsText(5), "00000101");
});

test("enviro: Zustände der acht Nachbarn in der Reihenfolge des Originals, höchstes Bit zuerst", () => {
  const z = feld([[1, 1, 0]]);                      // Nachbar oben rechts von (0, 0)
  M.umgebung(z);
  assert.equal(M.alsText(z.enviro[M.index(0, 0)]), "10000000");
  const w = feld([[0, 1, 0], [-1, 0, 2]]);           // oben und links
  M.umgebung(w);
  assert.equal(M.alsText(w.enviro[M.index(0, 0)]), "00000101");
  const t = feld([[30, 30, 0]]);                     // Torus: Ecke ist Nachbar der gegenüberliegenden Ecke
  M.umgebung(t);
  assert.equal(M.alsText(t.enviro[M.index(-30, -30)]), "00001000");   // von (−30,−30) aus liegt (30,30) bei (−1,−1)
});

test("check-state: lebendig, wenn ein Gencode einer Nachbarkultur zum Muster passt; der eigene Zustand zählt nicht", () => {
  const z = feld([[0, 1, 3]]);                       // ein Patch der Kultur 3 über (0, 0)
  z.kgen = Array.from({ length: 6 }, () => new Array(9).fill(255));
  z.kgen[3][4] = 0b00000001;                        // Muster „nur oben lebt“
  M.umgebung(z); M.pruefeZustand(z);
  const c = M.index(0, 0);
  assert.equal(z.sollState[c], 1); assert.equal(z.sollKult[c], 3);
  assert.equal(z.sollState[M.index(0, 1)], 0);       // der Keim selbst hat keine lebenden Nachbarn → stirbt
  z.kgen[3][4] = 255; M.pruefeZustand(z);
  assert.equal(z.sollState[c], 0);
  // gleiches Muster, aber die Kultur mit dem Code ist kein Nachbar → bleibt tot
  z.kgen[1][0] = 0b00000001; M.pruefeZustand(z);
  assert.equal(z.sollState[c], 0);
});

test("check-border: der Rand bleibt tot", () => {
  const z = M.erzeuge(P, zufall(1));
  z.sollState.fill(1); M.rand(z);
  assert.equal(z.sollState[M.index(30, 0)], 0); assert.equal(z.sollState[M.index(0, -30)], 0);
  assert.equal(z.sollState[M.index(29, 29)], 1);
});

test("weakest-die nur, wenn alle Kulturen leben; new-culture setzt Keime für ausgestorbene", () => {
  const z = feld([[0, 0, 0]]);
  z.countKul = [5, 0, 3, 3, 3, 3]; M.minMax(z);
  assert.equal(z.minPol, 0); assert.equal(z.maxKult, 0);
  M.schwaechsteStirbt(z, mit({ tod: 100 }));
  assert.equal(z.ausgeloescht, null);
  z.countKul = [5, 2, 3, 3, 3, 3]; M.minMax(z);
  z.sollState.fill(0); z.sollState[M.index(0, 0)] = 1; z.sollKult[M.index(0, 0)] = 1;
  M.schwaechsteStirbt(z, mit({ tod: 100 }));
  assert.equal(z.ausgeloescht, 1); assert.equal(z.sollState[M.index(0, 0)], 0);
  z.countKul = [0, 4, 0, 1, 1, 1]; z.allDead = 7;
  const vor = z.state.reduce((s, v) => s + v, 0);
  M.neueKultur(z);
  assert.deepEqual(z.neu, [0, 2]);
  assert.ok(z.state.reduce((s, v) => s + v, 0) <= vor + 2);
});

test("mutate: bei 100 % ändert sich genau ein Gencode (oder bleibt zufällig gleich)", () => {
  const z = M.erzeuge(P, zufall(2)), vor = JSON.stringify(z.kgen);
  M.mutiere(z, mit({ mutation: 100 }));
  const [i, j] = z.mutiert, nach = z.kgen;
  const alt = JSON.parse(vor);
  let diff = 0; for (let a = 0; a < 6; a++) for (let b = 0; b < 9; b++) if (alt[a][b] !== nach[a][b]) { diff++; assert.deepEqual([a, b], [i, j]); }
  assert.ok(diff <= 1);
  M.mutiere(z, mit({ mutation: 0 })); assert.equal(z.mutiert, null);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); for (let i = 0; i < 200; i++) M.schritt(z, P); return Array.from(z.kult).join() + JSON.stringify(z.kgen); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});

test("Kulturen sterben aus, werden neu gegründet, und einzelne breiten sich weit aus", () => {
  let gross = 0, neu = 0;
  for (const s of [1, 2, 3]) {
    const z = M.erzeuge(P, zufall(s));
    for (let i = 0; i < 1500; i++) { M.schritt(z, P); neu += z.neu.length; gross = Math.max(gross, ...z.verlauf[z.t]); }
    for (const c of [M.index(30, 5), M.index(-30, 0), M.index(3, 30)]) assert.equal(z.state[c], 0);   // Rand tot
  }
  assert.ok(neu > 100, `Neugründungen ${neu}`);
  assert.ok(gross > 150, `größte Population ${gross}`);
});
