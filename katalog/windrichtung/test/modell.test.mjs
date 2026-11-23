// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const nah = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);
const fertig = (p, saat = 1) => { const z = M.erzeuge(p, zufall(saat)); while (!M.fertig(z, p)) M.schritt(z, p); return z; };

test("Windrose lesen wie das GhPython-Skript: values, angles = center − 180, kleinste center_degrees", () => {
  const R = M.roseAusJSON('[{"center_degrees":30,"value":2},{"center_degrees":150,"value":5},{"center_degrees":270,"value":3}]');
  assert.deepEqual(R.werte, [2, 5, 3]); assert.deepEqual(R.angles, [-150, -30, 90]);
  assert.equal(R.kleinster, 30); assert.equal(R.n, 3); assert.equal(R.breite, 120);
  assert.throws(() => M.roseAusJSON("[]")); assert.throws(() => M.roseAusJSON('[{"value":1}]'));
});

test("Beispielrosen: Summe 100 %, Weimar-Beispiel mit Hauptwind aus West/Südwest", () => {
  for (const k of Object.keys(M.ROSEN)) nah(M.ROSEN[k].reduce((s, e) => s + e.value, 0), 100, 1e-9);
  const R = M.rose({ rose: "weimar" }), i = R.werte.indexOf(Math.max(...R.werte));
  assert.equal(R.mitten[i], 240);
  assert.equal(M.rose({ rose: "eigen" }).n, 12);                        // ohne eingefügte Datei: Beispiel
  assert.equal(M.rose({ rose: "eigen", eigeneRose: JSON.stringify(M.ROSEN.nordost) }).n, 16);
});

test("Remap Numbers: Häufigkeit bezogen auf den größten Sektor", () => {
  assert.deepEqual(M.normiere([2, 4, 8]), [0.25, 0.5, 1]);
  assert.deepEqual(M.normiere([0, 0]), [0, 0]);
});

test("Peilung: 0 = Nord (oben), 90 = Ost; Winkel 0…180°, NaN für den Nullvektor", () => {
  const n = M.peilungZuVektor(0), o = M.peilungZuVektor(90);
  nah(n[0], 0); nah(n[1], -1); nah(o[0], 1); nah(o[1], 0);
  nah(M.vektorZuPeilung([-1, 0]), 270);
  nah(M.winkelGrad([1, 0], [0, 1]), 90); nah(M.winkelGrad([1, 0], [-1, 0]), 180);
  assert.ok(Number.isNaN(M.winkelGrad([0, 0], [1, 0])));
  assert.deepEqual(M.wirkrichtungen({ mitten: [0, 270] }, 180), [180, 90]);   // Westwind weht nach Osten
});

test("Smaller Than: Sektor trifft bis Sektorbreite·Faktor/2; zwischen zwei Sektoren zählen beide", () => {
  const dirs = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330], g = 30 * 1.25 / 2;   // 18,75°
  assert.deepEqual(M.sektorTreffer(M.peilungZuVektor(0), dirs, g), [0]);
  assert.deepEqual(M.sektorTreffer(M.peilungZuVektor(15), dirs, g), [0, 1]);
  assert.deepEqual(M.sektorTreffer(M.peilungZuVektor(15), dirs, 15), [0, 1]);    // „or Equal to“
  assert.deepEqual(M.sektorTreffer(M.peilungZuVektor(15), dirs, 14.9), []);
  assert.deepEqual(M.sektorTreffer(M.peilungZuVektor(15), dirs, g, 1), [0]);     // erst ein Sektor aktiv
  assert.deepEqual(M.sektorTreffer([0, 0], dirs, g), []);
});

test("Weighted Average und Abfall: Σ f² / Σ f, Exp(−k·x)", () => {
  nah(M.gewichtetesMittel([0.5, 1], [0.5, 1]), 1.25 / 1.5);
  assert.equal(M.gewichtetesMittel([], []), null); assert.equal(M.gewichtetesMittel([0], [0]), null);
  nah(M.abfall(432, 0.02), Math.exp(-8.64)); nah(M.abfall(0, 0.02), 1);
  nah(M.obergrenze({ modus: "wind", radius: 432, abfallK: 0.02 }), 1);
  nah(M.obergrenze({ modus: "belastung", radius: 432, abfallK: 0.02 }), Math.exp(-8.64));
  const f = [0.5, 1];
  nah(M.parzellenWert({ modus: "wind" }, f, [0, 1], 300), 1.25 / 1.5);
  nah(M.parzellenWert({ modus: "belastung", abfallK: 0.02 }, f, [0, 1], 300), Math.exp(-6) * 1.25 / 1.5);
  assert.equal(M.parzellenWert({ modus: "wind" }, f, [], 10), null);
});

test("Zustand: Werte je Parzelle nachgerechnet; gewählte Parzelle ohne Wert", () => {
  const p = Object.assign({}, P, { takt: 1 }), z = fertig(p, 3);
  const R = z.rose, f = M.normiere(R.werte), dirs = M.wirkrichtungen(R, p.drehung), s = z.sz.schwerpunkte[z.auswahl];
  assert.equal(z.werte[z.auswahl], null);
  for (const j of [0, 7, 20, z.sz.parzellen.length - 1]) {
    if (j === z.auswahl) continue;
    const q = z.sz.schwerpunkte[j], v = [q[0] - s[0], q[1] - s[1]];
    const T = M.sektorTreffer(v, dirs, R.breite * p.faktor / 2);
    nah(z.werte[j], M.gewichtetesMittel(T.map(i => f[i]), T.map(i => f[i])));
  }
  // Faktor 1,25 deckt alle Richtungen ab: jede andere Parzelle hat einen Wert
  assert.equal(z.mitWert, z.sz.parzellen.length - 1);
  // Faktor 0: nur Parzellen genau auf einer Sektorrichtung – praktisch keine
  M.rechne(z, Object.assign({}, p, { faktor: 0 })); assert.ok(z.mitWert <= 2);
});

test("Schritt: nach je „takt“ Schritten ein Sektor mehr; fertig nach n · takt; t = 0 ohne Werte", () => {
  const p = Object.assign({}, P, { takt: 3 }), z = M.erzeuge(p, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.aktiv, 0); assert.equal(z.mitWert, 0);
  M.schritt(z, p); M.schritt(z, p); assert.equal(z.aktiv, 0); assert.equal(M.laufend(z, p).i, 0);
  M.schritt(z, p); assert.equal(z.t, 3); assert.equal(z.aktiv, 1); assert.ok(z.mitWert > 0);
  while (!M.fertig(z, p)) M.schritt(z, p);
  assert.equal(z.t, 36); assert.equal(z.aktiv, 12); assert.equal(M.laufend(z, p), null);
  M.schritt(z, p); assert.equal(z.t, 37); assert.equal(z.aktiv, 12);             // weiter zählen schadet nicht
});

test("Parzelle wählen: Parcel Index mit Wrap wie List Item; Klick wählt die Parzelle am Punkt", () => {
  const z = M.erzeuge(P, zufall(1)), n = z.sz.parzellen.length;
  assert.equal(z.auswahl, 61 % n);
  M.aendere(z, Object.assign({}, P, { parzelle: n + 2 }), "parzelle"); assert.equal(z.auswahl, 2);
  const q = z.sz.schwerpunkte[5]; assert.equal(M.parzelleAn(z, q), 5);
  assert.equal(M.waehle(z, P, 5), true); assert.equal(z.auswahl, 5); assert.equal(M.parzelleAn(z, [-10, -10]), -1);
});

test("Katalog: Windwirkung im Lee größer als im Luv, Belastung nimmt mit der Entfernung ab; Tauschen kehrt um", () => {
  for (const saat of [1, 2, 4]) {
    const p = Object.assign({}, P, { takt: 1 }), z = fertig(p, saat);
    const a = M.leeLuv(z);
    if (a.lee != null && a.luv != null) assert.ok(a.lee > a.luv, `Saat ${saat}: Lee ${a.lee} ≤ Luv ${a.luv}`);
    const q = Object.assign({}, p, { modus: "belastung" }); M.rechne(z, q);
    // gleiche getroffene Sektoren → weiter weg heißt weniger Belastung
    const S = z.werte.map((w, j) => ({ w, d: z.abstaende[j], k: z.treffer[j].join(",") })).filter(e => e.w != null);
    for (const e of S) for (const g of S) if (e.k === g.k && e.d < g.d - 1e-6) assert.ok(e.w > g.w);
    const r = Object.assign({}, p, { tauschen: true }); M.rechne(z, r);
    const b = M.leeLuv(z);
    if (b.lee != null && b.luv != null) assert.ok(b.luv > b.lee, `Saat ${saat}: getauscht Luv ${b.luv} ≤ Lee ${b.lee}`);
  }
});

test("gleiche Saat → gleiche Szene und Werte, andere Saat → andere", () => {
  const p = Object.assign({}, P, { takt: 1 });
  assert.deepEqual(fertig(p, 7).werte, fertig(p, 7).werte);
  assert.notDeepEqual(fertig(p, 7).sz.schwerpunkte, fertig(p, 8).sz.schwerpunkte);
});

test("Farbskala: Max wie .gh oder bis zum größten Wert", () => {
  const p = Object.assign({}, P, { takt: 1, modus: "belastung" }), z = fertig(p, 1);
  nah(z.max, Math.exp(-0.02 * 432));
  M.rechne(z, Object.assign({}, p, { skala: "groesster" })); nah(z.max, z.groesster); assert.ok(z.max > Math.exp(-0.02 * 432));
});
