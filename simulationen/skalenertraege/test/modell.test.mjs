// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);
const bisRuhe = (z, p, n = 2000) => { for (let i = 0; i < n && !z.ruhig; i++) M.schritt(z, p); return z; };

test("Angebotspreis nach SetAngebPreis: Kunden / Kunden^S · Produktionskosten", () => {
  assert.equal(M.angebotspreis(1, 1.02, 100), 100);                  // ein Kunde: Preis = Produktionskosten
  assert.ok(Math.abs(M.angebotspreis(1000, 1.0002, 100) - 100 * Math.pow(1000, -0.0002)) < 1e-9);
  assert.equal(M.angebotspreis(500, 1, 80), 80);                      // S = 1: keine Skalenerträge
  assert.ok(M.angebotspreis(500, 0.996, 100) > 100);                 // S < 1: Größe macht teurer
});

test("relativer Preis = Angebotspreis + Entfernung · Fahrtkosten (Gleichung 36/37)", () => {
  assert.equal(M.relativerPreis(100, 50, 0.01), 100.5);
});

test("Feld und Voreinstellungen wie im Original", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.spalten * z.zeilen, 96 * 56);
  assert.equal(z.maerkte.length, 10);
  assert.ok(z.maerkte.every(m => m.preis === 100 && m.x >= 0 && m.x < 770 && m.y >= 0 && m.y < 450));
});

test("erster Schritt: gleiche Preise → jeder Kunde beim nächsten Markt", () => {
  const z = M.erzeuge({}, zufall(2));
  M.schritt(z, P);
  for (const c of [0, 1234, 5375]) {
    const x = (c % 96) * 8 + 4, y = Math.floor(c / 96) * 8 + 4;
    const d = z.maerkte.map(m => Math.round(Math.hypot(m.x - x, m.y - y)));
    assert.equal(d[z.markt[c]], Math.min(...d));
  }
  assert.equal(z.maerkte.reduce((s, m) => s + m.kunden - 1, 0), 96 * 56);   // jede Zelle ist genau ein Kunde
});

test("größeres Einzugsgebiet → niedrigerer Preis (positive Skalenerträge)", () => {
  const z = M.erzeuge({}, zufall(3));
  M.schritt(z, P);
  const s = [...z.maerkte].sort((a, b) => a.kunden - b.kunden);
  assert.ok(s[0].preis > s[s.length - 1].preis);
});

test("hoher Skalenertrag führt zu lokalen Monopolen, niedriger nicht", () => {
  const klein = bisRuhe(M.erzeuge({}, zufall(1)), P), gross = bisRuhe(M.erzeuge({}, zufall(1)), mit({ skalenertrag: 1.012 }));
  const aktiv = z => M.anteile(z).filter(v => v > 0).length;
  assert.equal(aktiv(klein), 10);
  assert.ok(aktiv(gross) <= 4);
  assert.ok(M.anteile(gross)[0] > 2 * M.anteile(klein)[0]);
});

test("hohe Fahrtkosten bremsen die Monopolbildung", () => {
  const p = mit({ skalenertrag: 1.006 });
  const billig = bisRuhe(M.erzeuge({}, zufall(4)), p), teuer = bisRuhe(M.erzeuge({}, zufall(4)), mit({ skalenertrag: 1.006, fahrtkosten: 0.1 }));
  assert.ok(M.anteile(teuer).filter(v => v > 0).length > M.anteile(billig).filter(v => v > 0).length);
});

test("ein etabliertes Monopol bleibt auch bei sinkenden Skalenerträgen (Abb. 31 rechts unten)", () => {
  const z = bisRuhe(M.erzeuge({}, zufall(1)), mit({ skalenertrag: 1.006 }));
  const vor = M.anteile(z);
  z.ruhig = false; bisRuhe(z, P, 500);
  assert.equal(M.anteile(z).filter(v => v > 0).length, vor.filter(v => v > 0).length);
});

test("Gleichgewicht: ohne Wechsel ändern sich die Preise nicht mehr", () => {
  const z = bisRuhe(M.erzeuge({}, zufall(5)), P);
  assert.ok(z.ruhig);
  const preise = z.maerkte.map(m => m.preis);
  z.ruhig = false; M.schritt(z, P);
  assert.deepEqual(z.maerkte.map(m => m.preis), preise);
});

test("Märkte setzen und entfernen", () => {
  const z = M.erzeuge({}, zufall(6));
  M.setzeMarkt(z, P, 100, 100); M.einzugsgebiete(z, P, true);
  assert.equal(z.maerkte.length, 11);
  assert.ok(z.maerkte[10].kunden > 1);
  M.entferneMarkt(z, 102, 101); M.schritt(z, P);
  assert.equal(z.maerkte.length, 10);
  assert.ok(z.markt.every(u => u >= 0 && u < 10));
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge({}, zufall(s)); for (let i = 0; i < 30; i++) M.schritt(z, mit({ skalenertrag: 1.004, bewegen: true })); return Array.from(z.markt).join(","); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});

test("Anfangsbild: Gebiete nach Entfernung, Preise noch unverändert", () => {
  const z = M.erzeuge({}, zufall(9));
  assert.ok(z.markt.every(u => u >= 0));
  assert.ok(z.maerkte.every(m => m.preis === 100));
  assert.equal(z.maerkte.reduce((s, m) => s + m.kunden - 1, 0), 96 * 56);
});
