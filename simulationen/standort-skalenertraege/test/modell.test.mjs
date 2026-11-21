// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);
const lauf = (q, s, n) => { const p = mit(q), z = M.erzeuge(p, zufall(s)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };

test("Voreinstellungen aus CellForm.dfm", () => {
  assert.equal(P.produktionskosten, 100);
  assert.equal(P.fahrtkosten, 1);              // SB_FahrtKost 50 · 2/100
  assert.equal(P.skalen, 1);                   // 1 + 100/1000 − 0,1
  assert.equal(P.schwelle, 3);
  assert.equal(P.anzahl, 800);
  assert.ok(P.segregation && P.zentren);
});

test("Angebotspreis P = K / K^S · Produktionskosten (calcBidPrice)", () => {
  assert.equal(M.angebotspreis(0, 1.2, 100), 100);          // ohne Kunden: Produktionskosten
  assert.equal(M.angebotspreis(50, 1, 100), 100);           // S = 1: keine Skalenerträge
  assert.ok(Math.abs(M.angebotspreis(100, 1.1, 100) - 100 * Math.pow(100, -0.1)) < 1e-9);   // ≈ 63,1
  assert.ok(M.angebotspreis(200, 1.1, 100) < M.angebotspreis(100, 1.1, 100));                // mehr Kunden, billiger
  assert.ok(M.angebotspreis(200, 0.95, 100) > 100);                                          // S < 1: teurer
});

test("Sprung random(20) − 10 liefert −10 … 9", () => {
  const r = zufall(3), seen = new Set();
  for (let i = 0; i < 5000; i++) seen.add(M.sprung(r));
  assert.deepEqual([...seen].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i - 10));
});

test("Ortspreis: günstigster Markt inklusive Fahrtkosten; das Einzugsgebiet folgt dem Preis", () => {
  const z = M.erzeuge(mit({ anzahl: 0 }), zufall(2));
  z.preis.fill(100); z.preis[4] = 50;
  M.ortspreise(z, P);
  for (let c = 0; c < 1600; c += 37) {
    let best = Infinity; for (let m = 0; m < 10; m++) best = Math.min(best, z.preis[m] + z.distM[c * 10 + m] * P.fahrtkosten);
    assert.ok(Math.abs(z.ortspreis[c] - best) < 1e-9);
  }
  const [mx, my] = z.maerkte[4];
  assert.equal(z.gebiet[my * 40 + mx], 4);
  assert.ok(z.gebiet.filter(g => g === 4).length > 160);    // der billige Markt hat das größte Gebiet
});

test("Kunden je Markt = Agenten in seinem Einzugsgebiet, Summe = Agenten", () => {
  const z = lauf({}, 1, 5);
  assert.equal(z.kunden.reduce((s, v) => s + v, 0), z.n);
  for (let m = 0; m < 10; m++) {
    let k = 0; for (let i = 0; i < z.n; i++) if (z.gebiet[z.y[i] * 40 + z.x[i]] === m) k++;
    assert.equal(z.kunden[m], k);
  }
});

test("zu Beginn sind alle Agenten angehalten, höchstens einer je Zelle", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.suchend, 0);
  assert.equal(new Set(Array.from(z.x, (x, i) => z.y[i] * 40 + x)).size, z.n);
  M.schritt(z, P);
  assert.equal(new Set(Array.from(z.x, (x, i) => z.y[i] * 40 + x)).size, z.n);
});

test("Näherrücken: Umzug nur auf einen freien Ort mit kleinerem Ortspreis", () => {
  const z = M.erzeuge(mit({ anzahl: 1 }), zufall(4));
  M.ortspreise(z, P);
  for (let i = 0; i < 30; i++) {
    const vor = z.ortspreis[z.y[0] * 40 + z.x[0]];
    M.vergleiche(z);
    assert.ok(z.ortspreis[z.y[0] * 40 + z.x[0]] <= vor);
  }
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => { const z = lauf({ skalen: 1.1 }, s, 30); return Array.from(z.x).join() + Array.from(z.kunden).join() + JSON.stringify(z.maerkte); };
  assert.equal(f(7), f(7));
  assert.notEqual(f(7), f(8));
});

test("ohne Skalenerträge (S = 1) bleiben alle zehn Märkte im Geschäft; Segregation steigt", () => {
  for (const s of [1, 2]) {
    const z = lauf({}, s, 200);
    assert.equal(M.aktiveMaerkte(z), 10);
    assert.ok(M.gleicheNachbarn(z) > 85);
  }
});

test("positive Skalenerträge führen zu Monopolen", () => {
  for (const s of [1, 2, 3]) {
    const z = lauf({ skalen: 1.2 }, s, 300);
    assert.ok(M.aktiveMaerkte(z) <= 2, `Saat ${s}: ${M.aktiveMaerkte(z)} Märkte`);
    assert.ok(M.groessterAnteil(z) > 0.5);
  }
});

test("die Mobilität der Kunden verstärkt die Monopolbildung", () => {
  let mobil = 0, fest = 0;
  for (const s of [1, 2, 3]) {
    mobil += M.aktiveMaerkte(lauf({ skalen: 1.1 }, s, 300));
    fest += M.aktiveMaerkte(lauf({ skalen: 1.1, zentren: false }, s, 300));
  }
  assert.ok(mobil < fest, `mobil ${mobil}, fest ${fest}`);
});

test("Segregation aus: niemand sucht, die Nachbarschaft bleibt gemischt", () => {
  const z = lauf({ segregation: false }, 1, 100);
  assert.equal(z.suchend, 0);
  assert.ok(M.gleicheNachbarn(z) < 60);
});

test("Parameter ohne Neustart: Schwellenwert bewertet sofort neu", () => {
  const z = lauf({}, 1, 3);
  M.aendere(z, mit({ schwelle: 8 }), "schwelle");
  assert.equal(z.suchend, z.n);
});
