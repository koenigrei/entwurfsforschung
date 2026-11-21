// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const lauf = (p, saat, n) => { const z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };
const fest = (...w) => { let i = 0; const f = () => w[i++ % w.length]; f.ganz = n => Math.floor(f() * n); return f; };
/** ein Agent auf (x, y) mit heading h in einem leeren Feld (mark 5) */
function einzeln(x, y, h, sucht = 1) {
  const z = M.erzeuge(Object.assign({}, P, { anzahl: 1 }), zufall(1));
  z.mark.fill(5); z.quelle.fill(0); z.x[0] = x; z.y[0] = y; z.h[0] = h; z.sucht[0] = sucht;
  return z;
}

test("Setup: 67 × 67 Zellen, zehn Home Cells, Center Cell 5 × 5, alle Zellen mark 10, Agenten auf den Home Cells", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.N, 67); assert.equal(M.zellen(6), 67); assert.equal(z.cx, 34);
  assert.equal(z.quelle.reduce((s, v) => s + v, 0), 25);
  assert.ok(z.heimZelle.reduce((s, v) => s + v, 0) <= 10);
  assert.ok(z.mark.every(v => v === 10));
  for (let k = 0; k < z.n; k++) { const [mx, my] = z.maerkte[k % 10]; assert.equal(z.x[k], mx); assert.equal(z.y[k], my); assert.equal(z.sucht[k], 1); }
});

test("Verdunstung: mark − round(10 · evaporate rate), solange mark > dieser Wert + 2; Zählung über visibility threshold", () => {
  assert.equal(M.verdunstung(0.5), 5); assert.equal(M.verdunstung(0.25), 2); assert.equal(M.verdunstung(0.15), 2);   // round(1,5) = 2, round(2,5) = 2
  const z = einzeln(0, 0, 0);
  z.mark[0] = 60; z.mark[1] = 8; z.mark[2] = 7; z.mark[3] = 56;
  const s = M.verdunste(z, P);
  assert.deepEqual(Array.from(z.mark.slice(0, 4)), [55, 3, 7, 51]);
  assert.equal(s, 2);                                                      // 55 und 51 > 50
});

test("Diffusion: round(Σ8 / 8), dann round(· (1 − rate)), mindestens 1", () => {
  const z = einzeln(0, 0, 0), N = z.N;
  z.mark.fill(0); z.mark[10 * N + 10] = 80;
  M.diffundiere(z, Object.assign({}, P, { diffusion: true }));
  assert.equal(z.mark[10 * N + 11], 5);                                    // round(80 / 8) = 10, · 0,5 = 5
  assert.equal(z.mark[10 * N + 10], 1);                                    // eigene Zelle zählt nicht, Mindestwert 1
});

test("Stepping: Summe ≤ sniff threshold → random walk; darüber hill climbing zur stärksten Markierung", () => {
  const z = einzeln(20, 20, 0), N = z.N;
  z.zufall = fest(0.5, 0.9);                                               // random(46) = 23, random(2) = 1 → heading 23
  M.bewegeAgent(z, P, 0);
  assert.equal(z.h[0], 23); assert.equal(z.x[0], 21); assert.equal(z.y[0], 20);
  const w = einzeln(20, 20, 0);
  w.mark[21 * N + 21] = 30;                                                // Sichtfeld bei heading 0, 45°: Sektoren 7, 8, 1 → (1,−1), (1,0), (1,1)
  w.zufall = fest(0, 0);                                                   // wiggle 0
  M.bewegeAgent(w, P, 0);
  assert.equal(w.x[0], 21); assert.equal(w.y[0], 21); assert.equal(w.h[0], 45);
  assert.deepEqual(M.sichtfeld(0, 45), [7, 8, 1]);
});

test("Rückweg: Ausrichtung auf die Home Cell, Markierung der verlassenen Zelle; an der Home Cell wieder suchen", () => {
  const z = einzeln(20, 20, 0, 0), N = z.N;
  z.hx[0] = 20; z.hy[0] = 10;                                              // Home Cell oberhalb
  z.zufall = fest(0, 0);                                                   // random walk ohne Abweichung
  M.bewegeAgent(z, P, 0);
  assert.equal(z.h[0], 270); assert.equal(z.x[0], 20); assert.equal(z.y[0], 19);
  assert.equal(z.mark[20 * N + 20], 55);                                   // 5 + mark strenght 50
  z.x[0] = 20; z.y[0] = 10; z.h[0] = 270;
  assert.equal(M.bewegeAgent(z, P, 0), 1);                                 // daheim: Heimkehr, sucht wieder
  assert.equal(z.sucht[0], 1);
});

test("Center Cell erreicht → Rückweg", () => {
  const z = einzeln(20, 20, 0);
  z.quelle[20 * z.N + 21] = 1; z.zufall = fest(0, 0);
  M.bewegeAgent(z, P, 0);
  assert.equal(z.x[0], 21); assert.equal(z.sucht[0], 0);
});

test("Maus: links mark 255 entlang der Linie, rechts mark 1", () => {
  const z = einzeln(0, 0, 0), N = z.N;
  M.markiere(z, 5.5, 5.5, 255, true); M.markiere(z, 10.5, 5.5, 255, false);
  for (let c = 5; c <= 10; c++) assert.equal(z.mark[5 * N + c], 255);
  M.markiere(z, 7.5, 5.5, 1, true); assert.equal(z.mark[5 * N + 7], 1);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => Array.from(lauf(P, s, 300).mark).join(",");
  assert.equal(f(7), f(7));
  assert.notEqual(f(7), f(8));
});

test("erwartetes Verhalten: ein relativ stabiles Wegesystem aus ca. 400 Zellen, Agenten pendeln zwischen Quellen und Ziel", () => {
  for (const s of [1, 2, 3]) {
    const z = M.erzeuge(P, zufall(s)), werte = [];
    for (let i = 1; i <= 8000; i++) { M.schritt(z, P); if (i > 4000 && i % 100 === 0) werte.push(z.summe); }
    const mittel = werte.reduce((a, b) => a + b, 0) / werte.length;
    assert.ok(mittel > 250 && mittel < 600, `Wegesystem ${mittel} Zellen`);
    assert.ok(Math.max(...werte) - Math.min(...werte) < 0.5 * mittel, `stabil ${Math.min(...werte)}…${Math.max(...werte)}`);
    assert.ok(z.heim > 100, `Heimkehrer ${z.heim}`);
  }
});

test("ohne Markierung (mark strenght 0) kein Wegesystem", () => {
  const p = Object.assign({}, P, { markStr: 0 }), z = lauf(p, 1, 2000);
  assert.equal(z.summe, 0);
});

test("t zählt die Zeitschritte; Diagrammfenster 1000 Schritte", () => {
  const z = lauf(P, 1, 1200);
  assert.equal(z.t, 1200); assert.equal(z.fenster, 999); assert.equal(z.verlauf.length, 201);
});
