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

test("Voreinstellungen aus Main.dfm: 12 Straßen, 12 Häuser, 12 Wohnungen, 5 % frei → 1642 Agenten", () => {
  assert.deepEqual([P.strassen, P.haeuser, P.wohnungen, P.verbindungen, P.gruppen, P.frei], [12, 12, 12, 6, 3, 5]);
  assert.deepEqual([P.gewichtStrasse, P.gewichtHaus, P.wegziehen, P.ansiedeln], [0.5, 1, 0.33, 0.33]);
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.geo.wohnungen.length, 1728);
  assert.equal(z.agenten.length, 1642);              // E_anzAg 1642 = round(1728 · 0,95)
  assert.equal(z.frei.length, 86);
});

test("Geometrie: Straßen auf dem Kreis mit Radius 240 um (383, 383), Wohnungen im Abstand 13 um ihr Haus", () => {
  const g = M.geometrie(12, 12, 12);
  assert.deepEqual(g.strassen[0], [383, 623]);       // sin 0, cos 0 → unterhalb der Mitte
  assert.deepEqual(g.strassen[3], [623, 383]);
  assert.deepEqual(g.haeuser[1].pos, [383, 663]);    // Haus k = 1 liegt mittig im ersten Ring (r = 240 + 40)
  for (const w of g.wohnungen.slice(0, 24)) assert.ok(Math.abs(M.abstand(w.pos, g.haeuser[w.haus].pos) - 13) <= 1);
});

test("Straßennetz: Ring mit drei Nachbarn beiderseits, kürzeste Wege in Straßenknoten", () => {
  const k = M.kanten(12, 6);
  assert.equal(k.length, 36);
  const n = M.wege(M.geometrie(12, 1, 1).strassen, k);
  assert.deepEqual(n[0], [1, 2, 2, 2, 3, 3, 3, 3, 3, 2, 2, 2]);
});

test("Gewichte (SetWeights): eigenes Haus wH, eigene Straße wH² · wS, andere Straßen wS^n · wH²", () => {
  assert.equal(M.gewicht(1, 1, 0.5), 0.5);
  assert.equal(M.gewicht(2, 1, 0.5), 0.25);
  assert.equal(M.gewicht(3, 2, 0.5), 0.5);
});

test("Anteil gleicher (CalcFraction) an einem nachgerechneten Beispiel", () => {
  const p = mit({ strassen: 5, haeuser: 1, wohnungen: 2, verbindungen: 2, frei: 100 });
  const z = M.erzeuge(p, zufall(1));
  assert.equal(z.agenten.length, 0);
  // Straße 0 hat ein Haus mit zwei Wohnungen (0, 1); Straße 1 Wohnungen 2, 3
  z.zustand[1] = 0; z.zustand[2] = 1; z.zustand[3] = 1;
  z.zaehlung = M.zaehle(z, p);
  // Wohnung 0, Gruppe 0: Haus 1 · (1 gleich) + eigene Straße 0,5 · (1 gleich) + Straße 1 mit n = 2: 0,25 · (2 andere)
  assert.ok(Math.abs(M.anteil(z, p, 0, 0) - 1.5 / 2) < 1e-12);
  // ohne Nachbarn: 1
  const leer = M.erzeuge(p, zufall(1)); leer.zaehlung = M.zaehle(leer, p);
  assert.equal(M.anteil(leer, p, 0, 0), 1);
});

test("Umzug nur in eine freie Wohnung über settleDown und besser als bisher; alte Wohnung wird frei", () => {
  const z = M.erzeuge(P, zufall(2));
  M.schritt(z, P);
  const belegt = new Set(z.agenten.map(a => a.wohnung));
  assert.equal(belegt.size, z.agenten.length);
  for (const f of z.frei) assert.ok(!belegt.has(f));
  for (const a of z.agenten) assert.equal(z.zustand[a.wohnung], a.gruppe);
  assert.equal(z.frei.length + z.agenten.length, z.geo.wohnungen.length);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => Array.from(lauf({}, s, 5).zustand).join("");
  assert.equal(f(7), f(7));
  assert.notEqual(f(7), f(8));
});

test("Voreinstellung: Segregation nach Straßen entsteht, der Lauf kommt zur Ruhe", () => {
  for (const s of [1, 2, 3]) {
    const z0 = M.erzeuge(P, zufall(s)), s0 = M.segregationsindex(z0), a0 = M.mittlererAnteil(z0, P);
    const z = lauf({}, s);
    assert.ok(z.fertig != null && z.fertig < 100, `Saat ${s}: Ruhe ${z.fertig}`);
    assert.ok(M.segregationsindex(z) > s0 + 40, `Index ${s0} → ${M.segregationsindex(z)}`);
    assert.ok(M.mittlererAnteil(z, P) > a0 + 0.05);
  }
});

test("zu hohe Schwelle zum Einziehen: niemand findet eine bessere Wohnung (Phasenübergang)", () => {
  const z = lauf({ wegziehen: 0.5, ansiedeln: 0.5 });
  assert.equal(z.fertig, 1);
  assert.equal(z.umzuege, 0);
});

test("Verbindungen löschen hält das Netz zusammenhängend und verlängert die Wege", () => {
  const z = M.erzeuge(P, zufall(3)), w0 = M.mittlereWeglaenge(z);
  const k = M.loesche(z, mit({ loeschen: 20 }));
  assert.ok(k > 0);
  assert.equal(z.kanten.length, 36 - k);
  assert.ok(z.n.every(r => r.every(v => v < Infinity)));
  assert.ok(M.mittlereWeglaenge(z) >= w0);
});
