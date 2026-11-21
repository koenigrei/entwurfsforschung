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

test("Welt wie im GRAPHICS-WINDOW: 101 × 101 Patches, Torus", () => {
  assert.equal(M.N, 101);
  assert.equal(M.erzeuge({}, zufall(1)).mark.length, 101 * 101);
  nah(M.wickle(50.6), -50.4);
  nah(M.wickle(-50.6), 50.4);
  assert.equal(M.patchKoord(50.4), 50);
  assert.equal(M.patchKoord(50.6), -50);           // über den Rand → gegenüber
  assert.equal(M.patchKoord(-0.4), 0);
  assert.equal(M.index(-50, 50), 0);               // oben links
  assert.equal(M.index(50, -50), 101 * 101 - 1);   // unten rechts
});

test("patch-left-and-ahead: schräg links, geradeaus, schräg rechts (heading 0 = Norden)", () => {
  assert.equal(M.patchVorne(0, 0, 0, 45), M.index(-1, 1));
  assert.equal(M.patchVorne(0, 0, 0, 0), M.index(0, 1));
  assert.equal(M.patchVorne(0, 0, 0, -45), M.index(1, 1));
  assert.equal(M.patchVorne(0, 0, 90, 0), M.index(1, 0));     // Osten
  assert.equal(M.patchVorne(50, 0, 90, 0), M.index(-50, 0));  // Torus
});

test("Wahrscheinlichkeitsbereiche mV wie im Original", () => {
  // ohne Markierung: [33, 66, 99] · 100 / 100
  assert.deepEqual(M.bereiche(0, 0, 0, 50), [33, 66, 99]);
  // mark 1 geradeaus, path-attract 50: markTemp 50, markEnt 50 → [33, 33 + 50 + 33, 33 + 116] · 100 / 150
  const mV = M.bereiche(0, 1, 0, 50);
  nah(mV[0], 22); nah(mV[1], 116 * 100 / 150); nah(mV[2], 149 * 100 / 150);
  // geradeaus jetzt (116 − 33 + 1) / 150 = 56 % statt 34 %
});

test("Richtungswahl: links, geradeaus, rechts, Rest bleibt geradeaus", () => {
  const mV = [33, 66, 99];
  assert.equal(M.wahl(mV, 10), -45);
  assert.equal(M.wahl(mV, 50), 0);
  assert.equal(M.wahl(mV, 80), 45);
  assert.equal(M.wahl(mV, 99.5), 0);   // 1 % Rest
  assert.equal(M.wahl(mV, 0), 0);      // randV > 0 verlangt
  assert.equal(M.wahl(mV, 33), 0);     // genau auf der Grenze: keine Bedingung trifft
});

test("Markierung auf patch-here vor dem Schritt, gedeckelt durch max-mark, danach fd 1", () => {
  const z = M.erzeuge({ "num-turtles": 1 }, zufall(1));
  z.x[0] = 0; z.y[0] = 0; z.h[0] = 0;
  const p = Object.assign({}, P, { "path-attract": 0 });
  M.bewegeTurtle(z, p, 0);
  nah(z.mark[M.index(0, 0)], 10.8);
  nah(Math.hypot(z.x[0], z.y[0]), 1);                  // genau ein Schritt
  assert.ok([0, 45, 315].includes(z.h[0]));             // nur ±45° oder geradeaus
  z.mark[M.index(0, 0)] = 99.9; z.x[0] = 0; z.y[0] = 0;
  M.bewegeTurtle(z, p, 0); nah(z.mark[M.index(0, 0)], 110.7);   // < max-mark → + mark-strenght
  z.x[0] = 0; z.y[0] = 0;
  M.bewegeTurtle(z, p, 0); nah(z.mark[M.index(0, 0)], 110.7);   // ≥ max-mark → unverändert
});

test("diagonal (heading 45) verlässt den Patch nicht bei jedem Schritt – stetige Koordinaten wie in NetLogo", () => {
  const z = M.erzeuge({ "num-turtles": 1 }, zufall(1));
  z.x[0] = 0; z.y[0] = 0; z.h[0] = 45;
  const p = Object.assign({}, P, { "path-attract": 0 });
  z.zufall = Object.assign(() => 0.5, { ganz: () => 0 });                          // randV 50 → geradeaus
  M.bewegeTurtle(z, p, 0); assert.equal(M.patchKoord(z.x[0]), 1); assert.equal(M.patchKoord(z.y[0]), 1);   // (0,71 | 0,71)
  M.bewegeTurtle(z, p, 0); assert.equal(M.patchKoord(z.x[0]), 1); assert.equal(M.patchKoord(z.y[0]), 1);   // (1,41 | 1,41): noch Patch (1, 1)
});

test("Verfall: mark − decrease-per-tick, nicht unter 0; Grauwert wie pcolor", () => {
  const m = Float64Array.from([5, 0.1, 0]);
  M.verfall(m, 0.2);
  nah(m[0], 4.8); assert.equal(m[1], 0); assert.equal(m[2], 0);
  nah(M.grau(0, P), 0);
  nah(M.grau(55.4, P), 0.5);                                      // 55,4 / (100 + 10,8)
  nah(M.grau(10, Object.assign({}, P, { "show-mark-over": 20 })), 0);   // update 1: erst über show-mark-over sichtbar
});

test("setup: turtles auf einem Ring 20–29 um die Mitte, update 1 alle in der Mitte nach Norden", () => {
  const z = M.erzeuge({}, zufall(3));
  assert.equal(z.n, 100); assert.equal(z.t, 0);
  for (let k = 0; k < z.n; k++) { const r = Math.hypot(z.x[k], z.y[k]); assert.ok(r > 19.99 && r < 29.01, String(r)); }
  const u = M.erzeuge({ fassung: "update1" }, zufall(3));
  assert.ok(Array.from(u.h).every(h => h === 0) && Array.from(u.x).every(x => x === 0));
});

test("Wege einzeichnen (update 1): mark 100 entlang der Linie ohne Lücken", () => {
  const z = M.erzeuge({}, zufall(1));
  M.zeichneWeg(z, 10.5, 20.5, true); M.zeichneWeg(z, 20.5, 20.5, false);
  for (let c = 10; c <= 20; c++) assert.equal(z.mark[20 * M.N + c], 100);
  M.zeichneWeg(z, 30, 30, true); M.zeichneWeg(z, 33, 33, false);
  for (let k = 0; k <= 3; k++) assert.equal(z.mark[(30 + k) * M.N + 30 + k], 100);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => { const z = lauf(P, s, 300); return Array.from(z.mark).join(",") + Array.from(z.x).join(","); };
  assert.equal(f(7), f(7));
  assert.notEqual(f(7), f(8));
});

test("erwartetes Verhalten: nach einigen tausend Schritten ein gebündeltes, relativ orthogonales Wegesystem", () => {
  for (const s of [1, 2, 3]) {
    const z = M.erzeuge(P, zufall(s));
    for (let i = 0; i < 1000; i++) M.schritt(z, P);
    const a1 = M.auswertung(z, P);
    for (let i = 0; i < 1000; i++) M.schritt(z, P);
    const a2 = M.auswertung(z, P);
    for (let i = 0; i < 2000; i++) M.schritt(z, P);
    const a4 = M.auswertung(z, P);
    assert.ok(a4.stark > 0.1 && a4.stark < 0.35, `Wegeanteil ${a4.stark}`);           // Wege nehmen einen Teil der Fläche ein …
    assert.ok(Math.abs(a4.stark - a2.stark) < 0.04, `stabil ${a2.stark} → ${a4.stark}`);  // … und pendeln sich ein
    assert.ok(a4.aufWeg > 2 * a4.stark, `gebündelt ${a4.aufWeg} vs ${a4.stark}`);     // turtles laufen gebündelt auf den Wegen
    assert.ok(a4.orthogonal > 0.68, `orthogonal ${a4.orthogonal}`);                     // waagerecht/senkrecht überwiegt (zufällig ≈ 0,5)
    assert.ok(a4.orthogonal > a1.orthogonal, `wird orthogonaler ${a1.orthogonal} → ${a4.orthogonal}`);
  }
});

test("ohne path-attract kein Wegesystem: turtles laufen nicht gebündelt", () => {
  const p = Object.assign({}, P, { "path-attract": 0 }), z = lauf(p, 1, 3000), a = M.auswertung(z, p);
  assert.ok(a.aufWeg < 1.5 * a.stark + 0.05, `${a.aufWeg} vs ${a.stark}`);
});

test("t zählt die ticks", () => {
  assert.equal(lauf(P, 1, 25).t, 25);
});

// ---- Fassung „06 wegesystem A“ (wegesystem01.nlogo)
const PA = Object.assign({}, P, M.FASSUNG_A, { fassung: "a" });

test("A: Bereiche aus acht Nachbarn, je 12,5 Grundgewicht, kumuliert und skaliert", () => {
  assert.deepEqual(M.bereicheA([0, 0, 0, 0, 0, 0, 0, 0], 1), [12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100]);
  // mark 10 im Osten (i = 2), path-attract 1: markEnt 10 → (12,5 · (i+1) + 10 ab i = 2) · 100 / 110
  const mV = M.bereicheA([0, 0, 10, 0, 0, 0, 0, 0], 1);
  nah(mV[1], 25 * 100 / 110); nah(mV[2], 47.5 * 100 / 110); nah(mV[7], 100);
  // Osten jetzt (12,5 + 10) / 110 = 20,5 % statt 12,5 %
  nah(mV[2] - mV[1], 22.5 * 100 / 110);
});

test("A: Richtungswahl in absoluten Richtungen 0°, 45°, …, 315°; Grenze und 0 lassen heading unverändert", () => {
  const mV = M.bereicheA([0, 0, 0, 0, 0, 0, 0, 0], 1);
  assert.equal(M.wahlA(mV, 5), 0);
  assert.equal(M.wahlA(mV, 30), 90);
  assert.equal(M.wahlA(mV, 99), 315);
  assert.equal(M.wahlA(mV, 25), -1);
  assert.equal(M.wahlA(mV, 0), -1);
});

test("A: patch-at-heading-and-distance (i · 45) 1 liest die acht Nachbarn; eine Markierung zieht an", () => {
  const z = M.erzeuge({ "num-turtles": 1, fassung: "a" }, zufall(1));
  z.x[0] = 0; z.y[0] = 0; z.h[0] = 0;
  z.mark[M.index(1, 0)] = 50;                                         // Osten (heading 90)
  let ost = 0;
  for (let n = 0; n < 400; n++) { z.x[0] = 0; z.y[0] = 0; z.mark[M.index(0, 0)] = 0; M.bewegeTurtle(z, PA, 0); if (z.h[0] === 90) ost++; }
  // P(Ost) = (12,5 + 50) / 150 ≈ 42 % statt 12,5 %
  assert.ok(ost > 120 && ost < 220, String(ost));
  assert.ok([0, 45, 90, 135, 180, 225, 270, 315].includes(z.h[0]));
});

test("A: setup auf einem Ring 10–39 um die Mitte", () => {
  const z = M.erzeuge({ fassung: "a" }, zufall(4));
  for (let k = 0; k < z.n; k++) { const r = Math.hypot(z.x[k], z.y[k]); assert.ok(r > 9.99 && r < 39.01, String(r)); }
});

test("A: erwartetes Verhalten – path-attract bestimmt die Dichte der Cluster, die Wege sind nicht orthogonal wie in B", () => {
  const dichte = pa => { const p = Object.assign({}, PA, { "path-attract": pa }); return M.auswertung(lauf(p, 1, 2000), p); };
  const a0 = dichte(0), a1 = dichte(1), a5 = dichte(5);
  assert.ok(a0.markiert > a1.markiert && a1.markiert > a5.markiert, `${a0.markiert} > ${a1.markiert} > ${a5.markiert}`);  // dichter, kleiner
  assert.ok(a5.aufWeg > a1.aufWeg && a1.aufWeg > a0.aufWeg, `${a0.aufWeg} < ${a1.aufWeg} < ${a5.aufWeg}`);                // gebündelter
  assert.ok(a1.orthogonal < 0.6, `orthogonal ${a1.orthogonal}`);
});
