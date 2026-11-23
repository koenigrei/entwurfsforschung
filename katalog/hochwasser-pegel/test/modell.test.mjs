// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const R = Object.assign({}, P, { modus: "regen" });
const nah = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

/** kleines Gelände 5 × 5 (1 m): Fluss in Spalte 0, Wall (3 m) in Spalte 2, dahinter eine Mulde (1 m) */
function kleinesTal() {
  const n = 5, h = new Float64Array(n * n), fluss = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i; h[k] = i === 0 ? -1 : i === 1 ? 0.5 : i === 2 ? 3 : 1; if (i === 0) fluss[k] = 1; }
  return { n, groesse: n - 1, zelle: 1, h, fluss, min: -1, max: 3 };
}

test("erzeuge: t = 0, Pegel am Start, 100 Pegelschritte von 0 bis 8 m, Stadt mit Gebäuden und Straßen", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.k, 0); assert.equal(M.pegel(z), 0);
  assert.equal(z.stufen.N, 100); assert.ok(nah(M.pegelBei(z.stufen, 100), 8));
  assert.ok(z.gebaeude.length > 150 && z.strassen.length > 30);
  assert.ok(z.gebaeude.every(g => g.grund > 0), "alle Gebäude über dem Normalwasser");
});

test("Überlaufhöhe (Priority-Flood): hinter dem Wall steht erst Wasser, wenn der Pegel den Wall übersteigt", () => {
  const G = kleinesTal(), W = M.ueberlauf(G);
  for (let j = 0; j < 5; j++) {
    assert.equal(W[j * 5], -1); assert.equal(W[j * 5 + 1], 0.5); assert.equal(W[j * 5 + 2], 3);
    assert.equal(W[j * 5 + 3], 3); assert.equal(W[j * 5 + 4], 3);    // Mulde (1 m) erst bei mehr als 3 m
  }
  // Graben durch den Wall in Zeile 2: jetzt läuft die Mulde schon ab 1 m voll
  G.h[2 * 5 + 2] = 0.8;
  const W2 = M.ueberlauf(G);
  assert.equal(W2[2 * 5 + 3], 1); assert.equal(W2[0 * 5 + 4], 1);
});

test("Pegelschritte nachgerechnet: erster Schritt mit L ≥ Sockeloberkante, Geländepunkte bei L > W", () => {
  const S = M.pegelStufen(P);
  assert.ok(nah(S.dz, 0.08)); assert.equal(S.N, 100);
  assert.equal(M.ersterSchritt(S, 0.24), 3); assert.equal(M.ersterSchritt(S, 0.25), 4); assert.equal(M.ersterSchritt(S, -2), 0);
  assert.equal(M.ersterSchritt(S, Infinity), Infinity);
  assert.equal(M.ersterSchrittZelle(S, 0.24), 4); assert.equal(M.ersterSchrittZelle(S, 0.2), 3); assert.equal(M.ersterSchrittZelle(S, -1), 0);
  assert.equal(M.pegelStufen(Object.assign({}, P, { startpegel: 1, maxpegel: 3, schrittweite: 10 })).N, 20);
});

test("Tiefenstufen wie im Paper: je Schritt 8 cm tiefer, ab 24 cm gleich; mittleres Risiko = Anteil der Pegelstände", () => {
  assert.equal(M.tiefenStufe(5, 4, P), 0);
  assert.deepEqual([5, 6, 7, 8, 9, 40].map(k => M.tiefenStufe(5, k, P)), [1, 2, 3, 4, 4, 4]);
  assert.equal(M.tiefenStufe(Infinity, 100, P), 0);
  assert.deepEqual([5, 6, 7].map(k => M.tiefenStufe(5, k, Object.assign({}, P, { tiefenschwelle: 8 }))), [1, 2, 2]);
  assert.equal(M.mittleresRisiko(0, 100), 1); assert.ok(nah(M.mittleresRisiko(50, 100), 51 / 101)); assert.equal(M.mittleresRisiko(101, 100), 0);
});

test("Gebäude gilt als überflutet, sobald der Pegel die Oberkante des Sockels erreicht", () => {
  const z = M.erzeuge(P, zufall(2));
  const i = z.kGeb.findIndex(k => k > 0 && k <= 100), g = z.gebaeude[i], kE = z.kGeb[i];
  assert.ok(M.pegelBei(z.stufen, kE) >= M.gebaeudeHoehe(z, g, P) - 1e-9);
  assert.ok(M.pegelBei(z.stufen, kE - 1) < M.gebaeudeHoehe(z, g, P));
  assert.ok(M.gebaeudeHoehe(z, g, P) >= g.grund + P.sockel);
  z.k = kE - 1; assert.equal(M.tiefenStufe(z.kGeb[i], z.k, P), 0);
  M.schritt(z, P); assert.equal(z.k, kE); assert.equal(M.tiefenStufe(z.kGeb[i], z.k, P), 1);
});

test("Straße nach ihrem tiefsten Punkt; Kurve der überfluteten Gebäude steigt mit dem Pegel", () => {
  const z = M.erzeuge(P, zufall(3)), s = z.strassen[0];
  assert.equal(M.strassenHoehe(z, s), Math.min(...s.proben.map(k => z.W[k])));
  for (let k = 1; k <= 100; k++) assert.ok(z.kurve[k] >= z.kurve[k - 1]);
  assert.ok(z.kurve[100] > 0 && z.kurve[100] < z.gebaeude.length, "bei 8 m ist ein Teil der Stadt überflutet, nicht alles");
  z.k = 60; assert.equal(M.auswertung(z, P).geb, z.kurve[60]);
});

test("Maßnahme Anheben: +0,5 m je Klick, später überflutet; Rechtsklick nimmt zurück; höherer Sockel → weniger überflutet", () => {
  const z = M.erzeuge(P, zufall(4));
  const i = z.kGeb.findIndex(k => k > 0 && k < 80 && Number.isFinite(k)), g = z.gebaeude[i], k0 = z.kGeb[i];
  assert.ok(M.hebeAn(z, P, g.c)); assert.equal(g.extra, 0.5);
  assert.ok(z.kGeb[i] >= k0 + 6, `${z.kGeb[i]} vs ${k0}`);
  M.hebeAn(z, P, g.c, true); assert.equal(g.extra, 0); assert.equal(z.kGeb[i], k0);
  assert.equal(M.hebeAn(z, P, [-5, -5]), false);
  const hoch = Object.assign({}, P, { sockel: 1.5 }); const vorher = z.kurve[60];
  M.aendere(z, hoch, "sockel"); assert.ok(z.kurve[60] < vorher);
});

test("Maßnahme Graben senkt Gelände und Überlaufhöhe; „Maßnahmen zurücksetzen“ stellt alles wieder her", () => {
  const z = M.erzeuge(P, zufall(5)), W0 = z.W.slice();
  M.graben(z, P, [200, 250], true); M.graben(z, P, [200, 300], false); M.graben(z, P, [200, 302], false);
  assert.equal(z.graeben.length, 1); assert.equal(z.graeben[0].length, 2, "Punkte unter 3 m Abstand werden nicht angehängt");
  let tiefer = 0; for (let k = 0; k < W0.length; k++) { assert.ok(z.W[k] <= W0[k] + 1e-12); if (z.W[k] < W0[k] - 1e-9) tiefer++; }
  assert.ok(tiefer > 0);
  M.forste(z, [100, 100]); assert.ok(z.wald.some(v => v)); assert.ok(z.baeume.length > 0);
  M.massnahmenWeg(z, P);
  assert.deepEqual(Array.from(z.W), Array.from(W0)); assert.ok(!z.wald.some(v => v)); assert.equal(z.graeben.length, 0);
});

test("Regenrisiko nachgerechnet: Partikel im Umkreis / Grundfläche bzw. / Fläche des Umkreises um das Segment", () => {
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const z = { gebaeude: [{ poly: sq, flaeche: 100, bb: { x0: 0, y0: 0, x1: 10, y1: 10 } }], strassen: [{ a: [0, 20], b: [10, 20], laenge: 10 }],
              regen: [{ x: 5, y: 5, aktiv: true }, { x: 11, y: 5, aktiv: true }, { x: 13, y: 5, aktiv: true }, { x: 5, y: 21, aktiv: true }, { x: 5, y: 11.5, aktiv: false }] };
  const r = M.regenRisiko(z, 2);
  assert.ok(nah(r.gebaeude[0], 2 / 100));                          // innen und 1 m daneben; 3 m zu weit, abgeflossene zählen nicht
  assert.ok(nah(r.strassen[0], 1 / (2 * 2 * 10 + Math.PI * 4)));
  assert.equal(M.abstandPoly([5, 5], sq), 0); assert.ok(nah(M.abstandPoly([13, 5], sq), 3));
});

test("Regen: Partikel laufen bergab, nie in Gebäude; Wald bremst; schnelle Abschnitte → Erosion", () => {
  const z = M.erzeuge(R, zufall(6));
  const hoehe = () => z.regen.reduce((s, q) => s + require("../../_gemeinsam/szenen.js").hoehe(z.G, q.x, q.y), 0) / z.regen.length;
  const h0 = hoehe();
  for (let i = 0; i < 100; i++) M.schritt(z, R);
  assert.equal(z.t, 100); assert.ok(hoehe() < h0 - 0.5);
  assert.ok(z.regen.every(q => !z.maske[M.punktIndex(z.G, q.x, q.y)]), "kein Partikel in einem Gebäude");
  assert.ok(z.regen.every(q => q.weg.length <= 11));
  const lauf = wald => {
    const a = M.erzeuge(R, zufall(7));
    if (wald) for (let x = 0; x <= 400; x += 10) for (let y = 0; y <= 400; y += 10) M.forste(a, [x, y]);
    M.neuLauf(a, R); const s = a.regen.map(q => [q.x, q.y]);
    for (let i = 0; i < 40; i++) M.schritt(a, R);
    return { weg: a.regen.reduce((t, q, i) => t + Math.hypot(q.x - s[i][0], q.y - s[i][1]), 0), erosion: a.erosionsPunkte };
  };
  const ohne = lauf(false), mit = lauf(true);
  assert.ok(mit.weg < 0.6 * ohne.weg, `${mit.weg} vs ${ohne.weg}`); assert.ok(mit.erosion < ohne.erosion);
  const e = { G: z.G, erosion: new Uint8Array(z.G.n * z.G.n), erosionsPunkte: 0 };
  assert.equal(M.markiereErosion(e, [10, 10], [13, 10], 6), false); assert.equal(e.erosionsPunkte, 0);
  assert.equal(M.markiereErosion(e, [10, 10], [20, 10], 6), true); assert.equal(e.erosionsPunkte, 6);
});

test("Ablauf: Schritt = ein Pegelschritt, Ende beim Höchstpegel; Modus wechseln beginnt neu, Maßnahmen bleiben", () => {
  const z = M.erzeuge(P, zufall(8));
  for (let i = 0; i < 100; i++) M.schritt(z, P);
  assert.ok(M.fertig(z, P)); assert.ok(nah(M.pegel(z), 8));
  M.schritt(z, P); assert.equal(z.k, 100); assert.equal(z.t, 101);
  M.hebeAn(z, P, z.gebaeude[0].c);
  M.aendere(z, R, "modus"); assert.equal(z.t, 0); assert.equal(z.gebaeude[0].extra, 0.5); assert.ok(!M.fertig(z, R));
  assert.equal(z.regen.length, R.partikel);
});

test("gleiche Saat → gleiches Tal, gleiche Stadt, gleicher Regen; andere Saat → anders", () => {
  const lauf = s => { const z = M.erzeuge(R, zufall(s)); for (let i = 0; i < 20; i++) M.schritt(z, R); return [Array.from(z.kGeb), z.regen.slice(0, 50).map(q => [q.x, q.y])]; };
  assert.deepEqual(lauf(9), lauf(9));
  assert.notDeepEqual(lauf(9), lauf(10));
});
