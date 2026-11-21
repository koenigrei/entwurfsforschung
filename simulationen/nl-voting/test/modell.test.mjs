// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);
const lauf = (q, s = 1, n = 300) => { const p = mit(q), z = M.erzeuge(p, zufall(s)); for (let i = 0; i < n && z.fertig == null; i++) M.schritt(z, p); return z; };

test("Voreinstellungen aus den SLIDER-Blöcken, Welt 161 × 161", () => {
  assert.deepEqual([P.dichte, P.genYellow, P.genBlue, P.genGreen, P.genRed], [0.5, 12, 12, 19, 4]);
  assert.equal(M.SEITE, 161);
});

test("Regel: Bedingungen der Reihe nach, spätere überschreiben, sonst bleibt der Zustand", () => {
  assert.equal(M.regel(13, M.BLAU, P), M.GELB);     // 12 < 13 < 19
  assert.equal(M.regel(11, M.GELB, P), M.BLAU);     // 4 < 11 < 12
  assert.equal(M.regel(12, M.GELB, P), M.GELB);     // genau 12: keine Bedingung
  assert.equal(M.regel(12, M.BLAU, P), M.BLAU);
  assert.equal(M.regel(20, M.BLAU, P), M.GRUEN);    // > 19
  assert.equal(M.regel(19, M.ROT, P), M.ROT);       // genau 19: weder gelb (< 19) noch grün
  assert.equal(M.regel(3, M.GELB, P), M.ROT);       // < 4
  // Überschneidung: genBlue 20 → bei 15 erst gelb, dann blau (die spätere Bedingung gewinnt)
  assert.equal(M.regel(15, M.ROT, mit({ genBlue: 20 })), M.BLAU);
});

test("Nachbarsumme über acht Nachbarn mit Torus", () => {
  const z = M.erzeuge(mit({ setup: "leer" }), zufall(1));
  z.feld.fill(M.ROT);
  z.feld[M.index(80, 80)] = M.GRUEN;                 // Ecke oben rechts
  M.zaehle(z);
  assert.equal(z.summe[M.index(-80, -80)], 3);      // gegenüberliegende Ecke ist Nachbar
  assert.equal(z.summe[M.index(80, 80)], 0);        // die Zelle selbst zählt nicht
  assert.equal(z.summe[M.index(79, 80)], 3);
});

test("setup-blank: alles blau, Patch 0 0 gelb; der einzelne gelbe Patch verschwindet", () => {
  const z = M.erzeuge(mit({ setup: "leer" }), zufall(1));
  assert.equal(z.feld[M.index(0, 0)], M.GELB);
  assert.equal(z.feld.filter(v => v === M.GELB).length, 1);
  M.schritt(z, P);
  assert.equal(z.feld.filter(v => v === M.GELB).length, 0);
});

test("setup-random: Anteil gelb nach initial-density", () => {
  const z = M.erzeuge(mit({ dichte: 0.3 }), zufall(2));
  assert.ok(Math.abs(M.anteile(z)[M.GELB] - 0.3) < 0.01);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => Array.from(lauf({}, s, 10).feld).join("");
  assert.equal(f(7), f(7));
  assert.notEqual(f(7), f(8));
});

test("Voreinstellung (12/12): Mehrheitsregel, das System wird stabil, gelb und blau bleiben etwa gleich", () => {
  for (const s of [1, 2, 3]) {
    const z = lauf({}, s);
    assert.ok(z.fertig != null && z.fertig < 100, `Saat ${s}: ${z.fertig}`);
    const a = M.anteile(z);
    assert.ok(a[M.GELB] > 0.4 && a[M.BLAU] > 0.4);
    assert.equal(a[M.ROT] + a[M.GRUEN], 0);
  }
});

test("Gelb oder Blau verschieben kippt das Gleichgewicht", () => {
  assert.equal(M.anteile(lauf({ genYellow: 10 }))[M.GELB], 1);
  assert.equal(M.anteile(lauf({ genBlue: 14 }))[M.BLAU], 1);
});

test("genGreen herunter: grüne Patches erscheinen", () => {
  const z = lauf({ genGreen: 15 });
  assert.ok(M.anteile(z)[M.GRUEN] > 0.5);
});

test("Ruhe mit Periode 2 wird erkannt, ein Regler setzt die Prüfung zurück", () => {
  const z = lauf({}, 1);
  assert.ok(z.periode === 1 || z.periode === 2);
  M.aendere(z, mit({ genBlue: 14 }), "genBlue");
  assert.equal(z.fertig, null);
});
