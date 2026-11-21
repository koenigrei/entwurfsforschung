// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const P37 = Object.assign({}, P, { fassung: "37" }, M.SLIME);
const mit = q => Object.assign({}, P, q);
/** Zufall mit festen Werten für ganz(n): Liste der Rückgaben der Reihe nach */
const fest = werte => { let i = 0; const f = () => 0; f.ganz = () => werte[i++ % werte.length]; return f; };

test("Voreinstellungen aus CellForm.dfm: 36 path system 01 und 37 slime mold", () => {
  assert.deepEqual([P.anzahl, P.zelle, P.angle, P.wiggle, P.methode, P.mark, P.sniff], [100, 4, 25, 0, "roulette", 20, 3]);
  assert.deepEqual([P37.anzahl, P37.zelle, P37.angle, P37.wiggle, P37.methode, P37.mark, P37.evapo, P37.sniff, P37.visible, P37.diffus],
                   [175, 7, 45, 40, "hill", 20, 0.13, 10, 3, true]);
  assert.equal(M.erzeuge(P, zufall(1)).n, 101);      // round(404 / 4)
  assert.equal(M.erzeuge(P37, zufall(1)).n, 58);     // round(404 / 7)
});

test("Delphi-Round (,5 zur geraden Zahl) und Torus", () => {
  assert.deepEqual([22.5, 23.5, 292.5, -0.5, 0.7].map(M.rundeD), [22, 24, 292, 0, 1]);
  assert.deepEqual([M.torus(-1, 10), M.torus(10, 10), M.torus(5, 10)], [9, 0, 5]);
});

test("Sichtbereich (checkArea): je ±angle threshold um heading, Sprünge bei 22,5 · 67,5 · 112,5 · 157,5°", () => {
  assert.deepEqual(M.sichtbereich(0, 0), [8]);             // geradeaus (1, 0)
  assert.deepEqual(M.sichtbereich(0, 22), [8]);
  assert.deepEqual(M.sichtbereich(0, 25), [7, 8, 1]);
  assert.deepEqual(M.sichtbereich(0, 66), [7, 8, 1]);
  assert.deepEqual(M.sichtbereich(0, 67), [6, 7, 8, 1]);   // Rundung: die linke Seite kommt 1° früher dazu
  assert.deepEqual(M.sichtbereich(0, 70), [6, 7, 8, 1, 2]);
  assert.deepEqual(M.sichtbereich(90, 45), [1, 2, 3]);     // nach unten (0, 1) mit den Diagonalen
  assert.deepEqual(M.sichtbereich(0, 135), [5, 6, 7, 8, 1, 2, 3]);
  assert.deepEqual(M.sichtbereich(0, 180), [4]);           // Eigenheit: bei 180° fallen Anfang und Ende zusammen
  assert.deepEqual(M.NB[1], [1, 1]); assert.deepEqual(M.NB[8], [1, 0]);
});

test("Random Walk ohne Spur: heading ± random(angle + 1), Schritt (round(cos), round(sin))", () => {
  const z = M.erzeuge(mit({ anzahl: 1 }), zufall(1));
  z.x[0] = 50; z.y[0] = 50; z.h[0] = 0;
  z.zufall = fest([10, 1]);                                // random(26) = 10, random(2) = 1 → +10
  M.richtung(z, 0, P);
  assert.equal(z.h[0], 10); assert.deepEqual([z.sx[0], z.sy[0]], [1, 0]);
  z.h[0] = 40; z.zufall = fest([0, 0]); M.richtung(z, 0, P);
  assert.deepEqual([z.sx[0], z.sy[0]], [1, 1]);            // diagonal nur zwischen 30° und 60°
  z.h[0] = 5; z.zufall = fest([20, 0]); M.richtung(z, 0, P);
  assert.equal(z.h[0], 345);                               // < 0 → + 360
  assert.equal(z.spur[0], 0);                              // Summe 3 (drei unmarkierte Zellen) ist nicht > 3
});

test("Hill Climbing folgt der stärksten Markierung, Roulette Wheel gewichtet", () => {
  const z = M.erzeuge(mit({ anzahl: 1 }), zufall(1)), n = z.n;
  z.x[0] = 50; z.y[0] = 50; z.h[0] = 0;
  z.mark[51 * n + 51] = 41;                                // Zelle 1 = (1, 1)
  z.zufall = fest([0, 0]);
  M.richtung(z, 0, mit({ methode: "hill" }));
  assert.deepEqual([z.sx[0], z.sy[0]], [1, 1]); assert.equal(z.h[0], 45); assert.equal(z.spur[0], 1);
  // Roulette: Gewichte 1, 1, 41 von 43 → 2,3 % · 2,3 % · 95,3 %; rnd = 1 → erste Zelle (7 = (1, −1)), rnd = 50 → Zelle 1
  z.h[0] = 0; z.zufall = fest([1, 0, 0]); M.richtung(z, 0, P);
  assert.deepEqual([z.sx[0], z.sy[0]], [1, -1]);
  z.h[0] = 0; z.zufall = fest([50, 0, 0]); M.richtung(z, 0, P);
  assert.deepEqual([z.sx[0], z.sy[0]], [1, 1]);
  // wiggle: heading = Richtung der Zelle ± random(wiggle + 1)
  z.h[0] = 0; z.zufall = fest([7, 0]); M.richtung(z, 0, mit({ methode: "hill", wiggle: 10 }));   // random(11) = 7, Vorzeichen −
  assert.equal(z.h[0], 38);
});

test("Bewegung: verlassene Zelle + mark strenght; Verfall 36: mark > 1 → − 1 (höchstens 255)", () => {
  const z = M.erzeuge(mit({ anzahl: 1 }), zufall(2)), n = z.n;
  const x = z.x[0], y = z.y[0];
  M.schritt(z, P);
  assert.equal(z.mark[y * n + x], 21);
  assert.equal(z.summe, 0);                                // Verfall kommt vor der Bewegung
  M.schritt(z, P);
  assert.equal(z.mark[y * n + x] >= 20, true);
  assert.equal(z.summe, 1);
  z.mark.fill(1); z.mark[0] = 300; z.mark[1] = 2;
  assert.equal(M.verfall(z, P), 2);
  assert.equal(z.mark[0], 255); assert.equal(z.mark[1], 1);
});

test("Verfall 37: über evaporate·10 + 2 um round(evaporate·10) – nur ohne Diffusion", () => {
  const z = M.erzeuge(mit({ anzahl: 0 }), zufall(1));
  z.mark[0] = 4; z.mark[1] = 3; z.mark[2] = 50;
  assert.equal(M.verfall(z, mit({ fassung: "37", evapo: 0.13, diffus: false })), 2);
  assert.deepEqual([z.mark[0], z.mark[1], z.mark[2]], [3, 3, 49]);
  assert.equal(M.verfall(z, mit({ fassung: "37", evapo: 0.13, diffus: true })), 1);
  assert.equal(z.mark[2], 49);
});

test("Diffusion: Mittel der acht Nachbarn (ohne die Zelle selbst) · (1 − evaporate rate), gerundet, mindestens 1", () => {
  const z = M.erzeuge(mit({ anzahl: 0, zelle: 10 }), zufall(1)), n = z.n;   // 40 × 40
  z.mark[10 * n + 10] = 801;
  M.diffusion(z, mit({ evapo: 0.13 }));
  assert.equal(z.mark[10 * n + 10], 1);                    // 8 Nachbarn mit 1 → round(8/8) = 1
  assert.equal(z.mark[9 * n + 9], 88);                     // round((801 + 7) / 8) = 101, round(101 · 0,87) = round(87,87) = 88
  assert.equal(z.mark[0], 1);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = (p, s) => { const z = M.erzeuge(p, zufall(s)); for (let i = 0; i < 200; i++) M.schritt(z, p); return Array.from(z.mark).join(",") + z.x.join(","); };
  assert.equal(lauf(P, 7), lauf(P, 7));
  assert.notEqual(lauf(P, 7), lauf(P, 8));
  assert.equal(lauf(P37, 3), lauf(P37, 3));
});

test("Path System: aus vielen Spuren werden wenige große Wegenetze, die meisten Agenten folgen Spuren", () => {
  for (const s of [1, 2, 3]) {
    const z = M.erzeuge(P, zufall(s));
    for (let i = 0; i < 100; i++) M.schritt(z, P);
    const frueh = M.cluster(z, 30).anzahl;
    for (let i = 100; i < 2000; i++) M.schritt(z, P);
    const spaet = M.cluster(z, 30);
    assert.ok(frueh >= 15 && spaet.anzahl <= 6 && spaet.groesste > 450, `Saat ${s}: ${frueh} → ${spaet.anzahl}, max ${spaet.groesste}`);
    assert.ok(M.aufSpur(z) > 0.6);
  }
});

test("Slime Mold: wenige Cluster sammeln fast alle Agenten", () => {
  const z = M.erzeuge(P37, zufall(1));
  for (let i = 0; i < 1500; i++) M.schritt(z, P37);
  const c = M.cluster(z, P37.visible);
  assert.ok(c.anzahl <= 10 && c.groesste > 150, JSON.stringify(c));
  assert.ok(M.aufSpur(z) > 0.9);
  // Cluster binden die Agenten: viele stehen dicht beieinander (Zellen mit mehreren Agenten)
  const belegt = new Set(); for (let i = 0; i < z.A; i++) belegt.add(z.y[i] * z.n + z.x[i]);
  assert.ok(belegt.size < 0.75 * z.A);
});
