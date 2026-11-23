// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const nah = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);
/** kleiner Zustand für die lokalen Bedingungen */
const leer = (p = P) => ({ C: M.konfiguration(p), idx: M.index(60), segmente: [], nr: 0 });
const neu = (a, b, q = {}) => M.seg(a, b, 0, q);
/** geneigte Ebene h = 0,1 · x auf 1 km × 1 km */
const EBENE = M.raster(101, 1000, x => 0.1 * x);

/* ---------------------------------------------------------------- Konfiguration */
test("WSGConfig: Segmentlänge = StreetBlockSize / SegmentsPerBlockEdge, Fang 0,9 · L, Ähnlichkeit 0,66 · L · Schritte", () => {
  const C = M.konfiguration(P);
  nah(C.L, 60); assert.equal(C.BS, 2); assert.equal(C.A, 10); assert.equal(C.GA, 1);
  nah(C.SNAP, 54); nah(C.SIM, 79.2, 1e-9); assert.equal(C.MID, 10); assert.equal(C.SIMA, 30);
  assert.deepEqual([C.BSL, C.BSR, C.init], [0, 0, 0]);
  const tl = M.konfiguration(Object.assign({}, P, { kreuzung: "t_links", segmenteKante: 3 })), tr = M.konfiguration(Object.assign({}, P, { kreuzung: "t_rechts" }));
  assert.deepEqual([tl.BSL, tl.BSR], [0, 2]); assert.deepEqual([tr.BSL, tr.BSR], [1, 0]);
  const null0 = M.konfiguration(Object.assign({}, P, { segmenteKante: 0, richtung: "links" }));   // 0 → 1 (im Skript Division durch 0)
  assert.equal(null0.BS, 1); nah(null0.L, 120); assert.equal(null0.init, 1);
});

test("Python-Rundung und -Modulo wie im Skript", () => {
  assert.equal(M.rundePy(2.5), 2); assert.equal(M.rundePy(3.5), 4); assert.equal(M.rundePy(2.6), 3); assert.ok(M.rundePy(-0.5) === 0);
  assert.equal(M.pyMod(-1, 2), 1); assert.equal(M.pyMod(-190, 180), 170);
});

/* ---------------------------------------------------------------- Richtungen */
test("Segment.dir: Grad von +y nach +x, sign(0) = +1 (gerade nach −y = −180°)", () => {
  nah(M.richtung(neu([0, 0], [0, 1])), 0); nah(M.richtung(neu([0, 0], [1, 0])), 90);
  nah(M.richtung(neu([0, 0], [-1, 0])), -90); nah(M.richtung(neu([0, 0], [0, -1])), -180);
  nah(M.richtung(neu([0, 0], [1, 1])), 45);
  for (const d of [-170, -45, 0, 33, 120]) nah(M.richtung(neu([5, 5], M.inRichtung([5, 5], d, 10))), d, 1e-9);
});

test("minDegreeDifference: ohne Sinn, 0…90°", () => {
  nah(M.winkelDiff(10, 190), 0); nah(M.winkelDiff(0, 100), 80); nah(M.winkelDiff(-85, 85), 10);
});

/* ---------------------------------------------------------------- Graustufenbild */
test("Heatmap.valueAt: Gewichte 1 − Anteil der Gegenecke (nachgerechnet), auf Knoten der Knotenwert", () => {
  const K = { m: 3, groesse: 2, d: 1, H: new Float64Array(9) };
  K.H[0 * 3 + 0] = 0; K.H[1 * 3 + 0] = 4; K.H[1 * 3 + 1] = 8; K.H[0 * 3 + 1] = 2; K.H[2 * 3 + 0] = 6;
  // (0,25 | 0,5): w = 0,875 · 0 + 0,625 · 4 + 0,625 · 8 + 0,875 · 2, geteilt durch 3
  nah(M.wertAn(K, 0.25, 0.5), (0.625 * 4 + 0.625 * 8 + 0.875 * 2) / 3, 1e-12);
  nah(M.wertAn(K, 1, 1), 8, 1e-12);
  // valueAtClosest: Python-Rundung (0,5 → 0, 1,5 → 2)
  assert.equal(M.wertNaechst(K, 0.5, 0.5), 0); assert.equal(M.wertNaechst(K, 1.5, 0.4), 6);
  assert.equal(M.wertNaechst(K, -5, -5), 0);    // geklemmt
});

test("Fließrichtung: steilste der 15 Richtungen liegt quer zur Segmentrichtung; Fortsetzung dreht um höchstens MaxGrowthAngle", () => {
  const C = M.konfiguration(P), s = neu([500, 500], [500, 560]);   // Segment nach +y, Hang steigt nach +x
  const f = M.fliessrichtung(EBENE, s, 16, 60);
  assert.ok(Math.abs(Math.abs(f) - 90) < 7, `Fließrichtung ${f}`);
  assert.ok([-85.18, 83.57].some(w => Math.abs(w - f) < 0.01));      // Raster −157,5° + k · 337,5°/14 wie im Skript
  nah(Math.abs(M.nahWasser(EBENE, s, -10, 10, C, 60)), 10);          // geklemmt: dreht 10° zur Fließrichtung
  const quer = Object.assign({}, s, { perp: true }), w = M.nahWasser(EBENE, quer, -10, 10, C, 60);
  assert.ok(Math.abs(w) <= 7 && Number.isInteger(w));                // quer zum Wasser: fast geradeaus, auf 1° gerastert
  // Abzweig rechts: Bereich 80…100°
  const r = M.nahWasser(EBENE, s, 80, 100, C, 60); assert.ok(r >= 80 && r <= 100);
});

test("GrowthAngle rastet den Winkel auf die geprüften Stufen (Notiz der .gh-Datei)", () => {
  assert.equal(M.raste(4.6, -10, 10, 1), 5); assert.equal(M.raste(7, -10, 10, 5), 5); assert.equal(M.raste(8, -10, 10, 5), 10);
  assert.equal(M.raste(-9.9, -10, 10, 3), -10); assert.equal(M.raste(92.2, 80, 100, 1), 92);
});

/* ---------------------------------------------------------------- Geometrie */
test("lineSegementsIntersect (Enden ausgenommen) und distanceToLine", () => {
  const x = M.schnitt([0, 0], [10, 0], [5, -5], [5, 5]); assert.deepEqual(x.punkt, [5, 0]); nah(x.t, 0.5);
  assert.equal(M.schnitt([0, 0], [10, 0], [10, -5], [10, 5]), null);   // nur das Ende berührt
  assert.equal(M.schnitt([0, 0], [10, 0], [0, 1], [10, 1]), null);     // parallel
  const D = M.abstandZuLinie([5, 3], [0, 0], [10, 0]);
  assert.deepEqual(D.fuss, [5, 0]); nah(D.abstand2, 9); nah(D.proj2, 25); nah(D.laenge2, 100);
});

test("Curve To Polyline + Explode: gleich lange Stücke ≤ StreetBlockSize", () => {
  const S = M.stuecke([[0, 0], [250, 0]], 120);
  assert.equal(S.length, 3); for (const [a, b] of S) nah(b[0] - a[0], 250 / 3, 1e-9);
});

/* ---------------------------------------------------------------- lokale Bedingungen */
test("localConstraints: Schnitt → Vorschlag endet an der Straße, die Straße wird geteilt", () => {
  const z = leer(); M.fuegeEin(z, neu([0, 100], [200, 100]));
  const s = neu([100, 50], [100, 160]);
  assert.equal(M.lokal(z, s), true); assert.deepEqual(s.b, [100, 100]); assert.equal(s.severed, true);
  assert.equal(z.segmente.length, 2);
  const enden = z.segmente.map(o => [o.a, o.b]).sort((p, q) => p[0][0] - q[0][0]);
  assert.deepEqual(enden, [[[0, 100], [100, 100]], [[100, 100], [200, 100]]]);
});

test("localConstraints: Fang an einem Straßenende (≤ 0,9 · L) und an einer Straße im Radius", () => {
  let z = leer(); M.fuegeEin(z, neu([0, 0], [100, 0]));
  const s = neu([150, -60], [140, -10]);
  assert.equal(M.lokal(z, s), true); assert.deepEqual(s.b, [100, 0]); assert.equal(s.severed, true); assert.equal(z.segmente.length, 1);
  z = leer(); M.fuegeEin(z, neu([0, 0], [200, 0]));
  const r = neu([100, -100], [100, -30]);                        // Ende 30 m neben der Straße
  assert.equal(M.lokal(z, r), true); assert.deepEqual(r.b, [100, 0]); assert.equal(z.segmente.length, 2);
  const weit = neu([100, -150], [100, -90]);                     // 90 m entfernt: nichts
  assert.equal(M.lokal(z, weit), true); assert.deepEqual(weit.b, [100, -90]); assert.equal(weit.severed, false);
});

test("localConstraints: spitzer Schnitt (< 10°) wird verworfen; doppelte Straße auch", () => {
  const z = leer(); M.fuegeEin(z, neu([0, 0], [200, 0]));
  assert.equal(M.lokal(z, neu([50, -3], [150, 3])), false);
  const z2 = leer(); M.fuegeEin(z2, neu([0, 0], [60, 0]));
  assert.equal(M.lokal(z2, neu([0, 0], [55, 5])), false);      // fängt am Ende (60, 0): gleiche Straße noch einmal
});

test("branchConstraints: neuer Ast neben einem fast parallelen Ast entfällt", () => {
  const z = leer(); M.fuegeEin(z, neu([0, 0], [0, 60]));
  assert.equal(M.aehnlich(z, neu([50, 0], [50, 60])), true);
  assert.equal(M.aehnlich(z, neu([50, 0], [110, 0])), false);  // quer
  assert.equal(M.aehnlich(z, neu([0, 0], [10, 59])), false);   // gleicher Anfang zählt nicht
});

/* ---------------------------------------------------------------- globale Ziele */
test("globalGoals: geradeaus immer, Abzweige nach SegmentsPerBlockEdge (Crossing beidseitig, T abwechselnd)", () => {
  const z = Object.assign(leer(), { K: EBENE }), prev = q => M.seg([500, 500], [500, 560], 3, q);
  assert.equal(M.ziele(z, prev({ step: 1 })).length, 1);
  const k = M.ziele(z, prev({ step: 2 }));
  assert.equal(k.length, 3);
  assert.equal(k[0].step, 3); nah(M.laenge(k[0]), 60); assert.ok(Math.abs(M.richtung(k[0])) <= 10 + 1e-9);
  for (const b of k.slice(1)) { assert.equal(b.step, 0); assert.equal(b.perp, true); nah(M.laenge(b), 60); assert.ok(Math.abs(Math.abs(M.richtung(b)) - 90) <= 10 + 1e-9); }
  assert.equal(M.ziele(z, prev({ step: 4, severed: true })).length, 0);  // gekappte Straße wächst nicht weiter
  const zt = Object.assign(leer(Object.assign({}, P, { kreuzung: "t_links" })), { K: EBENE });
  const a = M.ziele(zt, prev({ step: 2 })), b = M.ziele(zt, prev({ step: 3 }));
  assert.equal(a.length, 2); assert.equal(b.length, 2);
  assert.ok(M.richtung(a[1]) < 0 && M.richtung(b[1]) > 0, "links, dann rechts");
});

/* ---------------------------------------------------------------- Wachstumsgrenze */
test("Wachstumsgrenze: alle drei normierten Werte unter ihrem Gewicht (Mulde → Scheibe um das Zentrum)", () => {
  const K = M.raster(101, 1000, (x, y) => ((x - 500) ** 2 + (y - 500) ** 2) / 1000), c = [500, 500];
  const g = M.grenze(K, c, P), k = (i, j) => i * 101 + j;
  assert.equal(g.frei[k(50, 50)], 1); assert.equal(g.frei[k(0, 0)], 0); assert.equal(g.pop.H[k(0, 0)], 1); assert.equal(g.pop.H[k(50, 50)], 0);
  // bindend ist WeightCenter 0,3: Radius 0,3 · größter Abstand
  const W = M.zellwerte(K, c), rmax = Math.max(...W[2]), soll = Math.PI * (0.3 * rmax) ** 2;
  assert.ok(Math.abs(g.moeglich - soll) / soll < 0.12, `${g.moeglich} vs ${soll}`);
  nah(g.benoetigt, 10000 / 3 * 1000, 1e-6); nah(g.faktor, g.moeglich / g.benoetigt, 1e-12);
  const alle = M.grenze(K, c, Object.assign({}, P, { gewNeigung: 1, gewHoehe: 1, gewZentrum: 1 }));
  assert.ok(alle.anzahl > 101 * 101 - 10);
  const keine = M.grenze(K, c, Object.assign({}, P, { gewZentrum: 0 }));
  assert.equal(keine.anzahl, 0);
});

test("Ergänzung „Fläche aus Einwohnerzahl“: Zellen nach Bewertung bis zur benötigten Fläche", () => {
  const K = M.raster(101, 1000, (x, y) => ((x - 500) ** 2 + (y - 500) ** 2) / 1000);
  const p = Object.assign({}, P, { grenze: "flaeche", einwohner: 300, personen: 3, flaecheHaushalt: 1000 });
  const g = M.grenze(K, [500, 500], p);
  assert.ok(Math.abs(g.moeglich - 100000) <= g.flaecheZelle / 2 + 1e-6); assert.equal(g.frei[50 * 101 + 50], 1);
});

/* ---------------------------------------------------------------- Anfang und Ablauf */
test("Start an der Bestandsstraße: Queräste am Anfang jedes zweiten Stücks, beidseitig bzw. nur links", () => {
  const p = Object.assign({}, P, { schwelle: 1 }), z = M.erzeuge(p, zufall(4)), n = z.bestand.length;
  assert.ok(n > 5); assert.equal(z.warte.length, 2 * Math.ceil(n / 2));
  for (const s of z.warte) {
    const b = z.bestand.find(q => q.a[0] === s.a[0] && q.a[1] === s.a[1]); assert.ok(b, "beginnt am Anfang eines Stücks");
    assert.ok(Math.abs(M.winkelDiff(M.richtung(s), M.richtung(b)) - 90) <= 10 + 1e-6);
  }
  const zl = M.erzeuge(Object.assign({}, p, { richtung: "links" }), zufall(4));
  assert.equal(zl.warte.length, Math.ceil(n / 2));
  const ohne = M.erzeuge(Object.assign({}, p, { bestand: false }), zufall(4));
  assert.equal(ohne.warte.length, 2); assert.deepEqual(ohne.warte[0].a, ohne.zentrum); assert.deepEqual(ohne.warte[1].a, ohne.zentrum);
});

test("Ablauf: t = 0, ein Schritt = ein Vorschlag, Ende bei leerer Warteschlange; alle Straßen innerhalb der Grenze", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.neu, 0); const w = M.offen(z); assert.ok(w > 0);
  M.schritt(z, P); assert.equal(z.t, 1); assert.equal(z.neu + z.abgelehnt, 1);
  while (!M.fertig(z, P)) M.schritt(z, P);
  assert.equal(M.offen(z), 0); assert.ok(z.neu > 150); assert.ok(M.alleInnen(z));
  assert.equal(z.neu + z.abgelehnt, z.t);
  const t = z.t; M.schritt(z, P); assert.equal(z.neu + z.abgelehnt, t);   // nach dem Ende ändert sich nichts mehr
  M.beginne(z, P); assert.equal(z.t, 0); assert.equal(z.neu, 0);
});

test("Street Segments begrenzt die Schleifenrunden", () => {
  const p = Object.assign({}, P, { maxSegmente: 50 }), z = M.erzeuge(p, zufall(1));
  while (!M.fertig(z, p)) M.schritt(z, p);
  assert.equal(z.t, 50);
});

test("Zentrum per Klick: Grenze neu um das Zentrum, Wachstum von vorn", () => {
  const p = Object.assign({}, P, { gewNeigung: 1 }), z = M.erzeuge(p, zufall(1)); for (let i = 0; i < 30; i++) M.schritt(z, p);
  M.setzeZentrum(z, p, [2000, 900]);
  assert.deepEqual(z.zentrum, [2000, 900]); assert.equal(z.t, 0);
  const i = Math.round(2000 / z.K.d), j = Math.round(900 / z.K.d); assert.equal(z.grenze.frei[i * z.K.m + j], 1);
  M.aendere(z, p, "zeigeFluss"); assert.equal(z.t, 0);
});

test("gleiche Saat → gleiches Netz, andere Saat → anderes", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); while (!M.fertig(z, P)) M.schritt(z, P); return z.segmente.map(q => [q.a, q.b]); };
  assert.deepEqual(lauf(5), lauf(5)); assert.notDeepEqual(lauf(5), lauf(6));
});

/* ---------------------------------------------------------------- Verhalten laut Katalog */
test("Katalog: Straßen folgen dem Gefälle bzw. der Fließrichtung – auf einem schiefen Hang längs und quer dazu", () => {
  const p = Object.assign({}, P, { bestand: false, glaettung: 1 }), z = M.erzeuge(p, zufall(1)), n = z.G0.n;
  z.G0 = Object.assign({}, z.G0, { h: Float64Array.from({ length: n * n }, (_, k) => (k % n) * 2 + Math.floor(k / n)), max: 300 });
  M.baueGelaende(z, p); z.zentrum = [1500, 1500]; M.rechneGrenze(z, p); M.beginne(z, p);
  while (!M.fertig(z, p)) M.schritt(z, p);
  assert.ok(z.neu > 100); assert.ok(M.mittlereAbweichung(z) < 10, `Abweichung ${M.mittlereAbweichung(z)}`);   // zufällig wären 22,5°
});

test("Katalog: WaterAngleShift dreht das Netz gegen die Fließrichtung", () => {
  const mittel = shift => { let s = 0; for (const saat of [1, 2, 3]) { const p = Object.assign({}, P, { wasserVersatz: shift }), z = M.erzeuge(p, zufall(saat)); while (!M.fertig(z, p)) M.schritt(z, p); s += M.mittlereAbweichung(z); } return s / 3; };
  const a = mittel(0), b = mittel(45);
  assert.ok(a < 22.5 && b > a + 3, `${a} / ${b}`);
});
