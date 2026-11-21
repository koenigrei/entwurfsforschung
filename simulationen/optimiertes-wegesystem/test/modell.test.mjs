// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const ORTE = M.zieheOrte(zufall(1), 67);
const P = Object.assign({}, M.STANDARD, { orte: ORTE });
const lauf = (p, saat, n) => { const z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };
const fest = (...w) => { let i = 0; const f = () => w[i++ % w.length]; f.ganz = n => Math.floor(f() * n); return f; };

test("Setup wie Path System 02, dazu je Agent angle/wiggle threshold random(180), Chromosom, Energie 100 000, Familien", () => {
  const z = M.erzeuge(P, zufall(3));
  assert.equal(z.N, 67); assert.equal(z.n, 200);
  assert.deepEqual(z.maerkte, ORTE);                                         // feste Home Cells (eigene Saat)
  assert.ok(Array.from(z.winkel).every(v => v >= 0 && v < 180) && Array.from(z.wackeln).every(v => v >= 0 && v < 180));
  assert.equal(z.chroma[5], (z.winkel[5] << 8) | z.wackeln[5]);
  assert.ok(Array.from(z.energie).every(e => e === 100000));
  assert.equal(z.familie.length, 10); assert.equal(z.familie[3].length, 20); assert.equal(z.familie[3][1], 13);
  assert.notDeepEqual(Array.from(M.erzeuge(P, zufall(4)).winkel), Array.from(z.winkel));
});

test("Chromosom: IntToBin je 8 Bit, crossover an Stelle crossP, Mutation kippt eine Stelle 1 … 15", () => {
  const c0 = M.chromosom(170, 15), c1 = M.chromosom(85, 240);
  assert.equal(M.alsText(c0), "1010101000001111");
  assert.equal(M.alsText(M.kreuze(c0, c1, 4)), "1010" + "010111110000");     // Stellen 1–4 von c0, 5–16 von c1
  assert.equal(M.kreuze(c0, c1, 16), c0);
  assert.equal(M.alsText(M.kippe(c0, 1)), "0010101000001111");
  assert.equal(M.alsText(M.kippe(c0, 15)), "1010101000001101");
});

test("roulette wheel (Calcer): kumulierte Gewichte bis ≥ random(100), sonst letzte Stelle", () => {
  assert.equal(M.rad([10, 20, 70], 0), 0);
  assert.equal(M.rad([10, 20, 70], 25), 1);
  assert.equal(M.rad([10, 20, 70], 99), 2);
  assert.equal(M.rad([0, 0, 0], 50), 2);
});

test("Energie (markCells): Straße − mark strenght / 2, freies Feld suchend − 3 ·, heimkehrend − 1 · mark strenght; Heimkehrer markieren", () => {
  const z = M.erzeuge(Object.assign({}, P, { anzahl: 1 }), zufall(1)), N = z.N;
  z.mark.fill(5); z.mark[1] = 150;
  z.sucht[0] = 1; M.energie(z, P, 0, 0, 2); assert.equal(z.energie[0], 100000 - 150);
  M.energie(z, P, 0, 0, 1); assert.equal(z.energie[0], 100000 - 150 - 25);
  z.sucht[0] = 0; M.energie(z, P, 0, 3, 2); assert.equal(z.energie[0], 100000 - 175 - 50); assert.equal(z.mark[3], 55);
  assert.equal(N, 67);
});

test("rebirth: Eltern der Familie nach Erfolg, Kreuzung, volle Energie, sucht wieder; Mutation nur im Chromosom", () => {
  const z = M.erzeuge(P, zufall(2)), fam = z.familie[0];
  fam.forEach(j => { z.erfolg[j] = 0; });
  z.erfolg[fam[3]] = 10;                                                      // nur ein erfolgreicher Elternteil
  const k = fam[0]; z.energie[k] = 0; z.sucht[k] = 0; z.erfolg[k] = 0;
  z.zufall = fest(0.5, 0.5, 0.99, 0.5);                                       // beide Eltern = fam[3], crossP 16, keine Mutation (0,01 < 0,5)
  M.wiedergeburt(z, P, k);
  assert.equal(z.chroma[k], z.chroma[fam[3]]);
  assert.equal(z.winkel[k], z.winkel[fam[3]]); assert.equal(z.wackeln[k], z.wackeln[fam[3]]);
  assert.equal(z.energie[k], 100000); assert.equal(z.sucht[k], 1); assert.equal(z.geburten, 1);
  const w = z.winkel[k];
  z.zufall = fest(0.5, 0.5, 0.99, 0.001, 0);                                  // Mutation an Stelle 1
  M.wiedergeburt(z, Object.assign({}, P, { mutation: 0.5 }), k);
  assert.equal(z.winkel[k], w);                                               // Wert unverändert …
  assert.equal(z.chroma[k], M.kippe(M.chromosom(w, z.wackeln[k]), 1));        // … nur das Chromosom
});

test("Heimkehr zählt als Erfolg; Center Cell → Rückweg", () => {
  const z = M.erzeuge(Object.assign({}, P, { anzahl: 1 }), zufall(1));
  z.mark.fill(5); z.quelle.fill(0); z.sucht[0] = 0; z.x[0] = z.hx[0]; z.y[0] = z.hy[0];
  z.zufall = fest(0, 0);
  assert.equal(M.bewegeAgent(z, P, 0), 1);
  assert.equal(z.erfolg[0], 1); assert.equal(z.sucht[0], 1);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => { const z = lauf(P, s, 500); return Array.from(z.mark).join(",") + Array.from(z.winkel).join(","); };
  assert.equal(f(7), f(7));
  assert.notEqual(f(7), f(8));
});

test("erwartetes Verhalten: der genetische Algorithmus verschiebt und bündelt angle/wiggle threshold, je Lauf anders", () => {
  const ergebnis = [];
  for (const s of [1, 2, 3]) {
    const z = M.erzeuge(P, zufall(s)), a0 = M.auswertung(z, P);
    for (let i = 0; i < 12000; i++) M.schritt(z, P);
    const a = M.auswertung(z, P);
    assert.ok(z.geburten > 1000, `Wiedergeburten ${z.geburten}`);
    assert.ok(a.winkel < a0.winkel - 20, `angle ${a0.winkel} → ${a.winkel}`);            // kleinerer Sichtwinkel setzt sich durch
    assert.ok(a.streuungWinkel < a0.streuungWinkel, `Streuung ${a0.streuungWinkel} → ${a.streuungWinkel}`);
    assert.ok(a.strasse > 50, `Wegesystem ${a.strasse} Zellen`);
    ergebnis.push(Math.round(a.wackeln));
  }
  assert.ok(new Set(ergebnis).size > 1, `je Lauf andere Werte ${ergebnis}`);
});

test("Diagramm alle 100 Schritte; t zählt die Zeitschritte", () => {
  const z = lauf(P, 1, 1001);
  assert.equal(z.t, 1001); assert.equal(z.verlauf.length, 11); assert.equal(z.verlauf[10][0], 1000);
});
