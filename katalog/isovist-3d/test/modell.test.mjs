// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const nah = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
/** kleine Szene aus Prismen: [[poly, H], …] → {objekte, prismen} wie baue() */
function szene(liste) {
  const prismen = liste.map(([poly, H], i) => ({ poly, H, obj: i, bb: bboxv(poly) }));
  return { prismen, objekte: liste.map((_, i) => ({ name: "#" + (i + 1), prismen: [i], huelle: 100 })) };
}
function bboxv(P) { const xs = P.map(q => q[0]), ys = P.map(q => q[1]); return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }; }
const kasten = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

test("Voreinstellungen wie in der .gh-Datei", () => {
  assert.equal(P.reichweite, 100); assert.equal(P.praezision, 90); assert.equal(P.hwinkel, 120); assert.equal(P.vwinkel, 60);
  assert.equal(P.versatz, 0); assert.equal(P.richtung, 58); assert.equal(P.geometrie, false); assert.equal(P.boden, true);
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.E.n, 8100, "Horizontal und Vertical Precision hängen am selben Regler: 90 × 90");
  assert.ok(!M.imGebaeude(z, z.o)); assert.equal(z.blick, 58);
});

test("Blickrichtung: Unit X um Unit Z gedreht (0 = Osten, 90 = Norden); richtungZu ist die Umkehrung", () => {
  const o = M.grundrichtung(0), n = M.grundrichtung(90), w = M.grundrichtung(58);
  assert.ok(nah(o[0], 1) && nah(o[1], 0)); assert.ok(nah(n[0], 0) && nah(n[1], -1), "Norden = −y im Plan");
  assert.ok(nah(w[0], Math.cos(58 * Math.PI / 180)) && nah(w[1], -Math.sin(58 * Math.PI / 180)));
  assert.ok(nah(M.richtungZu([0, 0], [0, -5]), 90)); assert.ok(nah(M.richtungZu([0, 0], [-5, 0]), 180)); assert.ok(nah(M.richtungZu([0, 0], [0, 5]), 270));
});

test("Strahlenbündel: Zellmitten über beide Blickwinkel, Versatz, Raumwinkel", () => {
  const B = M.buendel(Object.assign({}, P, { praezision: 4, hwinkel: 120, vwinkel: 60, versatz: 10 }), 58);
  assert.deepEqual(Array.from(B.azimut), [13, 43, 73, 103], "58 − 60 + 120·(i + ½)/4");
  assert.deepEqual(Array.from(B.neigung).map(a => Math.round(a * 1e9) / 1e9), [-12.5, 2.5, 17.5, 32.5]);
  const summe = B.raum.reduce((a, b) => a + b, 0) * B.nh;
  assert.ok(nah(summe, (120 * Math.PI / 180) * (Math.sin(40 * Math.PI / 180) - Math.sin(-20 * Math.PI / 180)), 1e-12), "Raumwinkel des Bündels");
  // ganze Kugel: Raumwinkel 4π, Neigungen auf ±90° begrenzt
  const K = M.buendel(Object.assign({}, P, { praezision: 30, hwinkel: 360, vwinkel: 180 }), 0);
  assert.ok(nah(K.raum.reduce((a, b) => a + b, 0) * K.nh, 4 * Math.PI, 1e-9));
  const V = M.buendel(Object.assign({}, P, { praezision: 3, vwinkel: 60, versatz: 90 }), 0);
  assert.ok(Math.max(...V.neigung) <= 90 && Math.min(...V.neigung) >= 60);
});

test("Abschnitte eines Grundriss-Strahls in einem Polygon", () => {
  assert.deepEqual(M.abschnitte([0, 0], [1, 0], kasten(10, -5, 20, 5)), [10, 20]);
  assert.deepEqual(M.abschnitte([0, 0], [-1, 0], kasten(10, -5, 20, 5)), []);
  assert.deepEqual(M.abschnitte([15, 0], [1, 0], kasten(10, -5, 20, 5)), [0, 5], "Standpunkt im Grundriss");
  // L-Form: der Strahl tritt zweimal ein
  const L = [[10, -5], [30, -5], [30, 5], [25, 5], [25, -2], [15, -2], [15, 5], [10, 5]];
  assert.deepEqual(M.abschnitte([0, 0], [1, 0], L), [10, 15, 25, 30]);
});

test("Höhe: Wand, über das Dach hinweg, Dach von oben", () => {
  // Augenhöhe 1,6 m, Prisma 10 m hoch zwischen t = 10 und 20
  assert.equal(M.trefferHoehe(10, 20, 10, 1.6, 0, 100), 10, "waagerecht → Wand bei 10 m");
  assert.equal(M.trefferHoehe(10, 20, 10, 1.6, 1, 100), -1, "45° → bei t = 10 schon 11,6 m hoch, über das Dach");
  assert.ok(nah(M.trefferHoehe(10, 20, 10, 1.6, 0.84, 100), 10), "genau an der Dachkante");
  assert.ok(nah(M.trefferHoehe(10, 20, 10, 30, -20 / 15, 100), 15), "von 30 m schräg nach unten: Dach bei t = 15");
  assert.equal(M.trefferHoehe(10, 20, 10, 1.6, 0, 8), -1, "Reichweite zu kurz");
});

test("Strahlen nachgerechnet: Himmel, Hindernis, Boden, Reichweite", () => {
  const S = szene([[kasten(10, -5, 20, 5), 10]]);
  const p = Object.assign({}, P, { praezision: 1, hwinkel: 0, vwinkel: 0, augenhoehe: 1.6 });
  const strahl = (neigung, blick = 0, extra = {}) => M.strahlen([0, 0], 1.6, blick, Object.assign({}, p, { versatz: neigung }, extra), S);
  let E = strahl(0);
  assert.equal(E.kat[0], M.HINDERNIS); assert.ok(nah(E.len[0], 10, 1e-5)); assert.equal(E.obj[0], 0); assert.equal(E.treffer[0], 1);
  assert.ok(nah(E.end[0], 10, 1e-5) && nah(E.end[2], 1.6, 1e-5));
  E = strahl(45); assert.equal(E.kat[0], M.HIMMEL); assert.ok(nah(E.len[0], 100, 1e-4)); assert.equal(E.obj[0], -1);
  E = strahl(-30); assert.equal(E.kat[0], M.BODEN); assert.ok(nah(E.len[0], 3.2, 1e-5), "1,6 m ÷ sin 30° = 3,2 m"); assert.ok(nah(E.end[2], 0, 1e-5));
  E = strahl(-30, 0, { boden: false }); assert.equal(E.kat[0], M.HIMMEL, "ohne Boden fliegt der Strahl bis zur Reichweite");
  E = strahl(0, 180); assert.equal(E.kat[0], M.HIMMEL, "nach Westen frei");
  E = strahl(0, 0, { reichweite: 8 }); assert.equal(E.kat[0], M.HIMMEL); assert.ok(nah(E.len[0], 8, 1e-5), "Hindernis jenseits der Reichweite");
  E = strahl(-90); assert.equal(E.kat[0], M.BODEN); assert.ok(nah(E.len[0], 1.6, 1e-5), "senkrecht nach unten");
  E = strahl(90); assert.equal(E.kat[0], M.HIMMEL);
  // Dach: von 30 m Höhe schräg nach unten auf das 10 m hohe Prisma
  const D = M.strahlen([0, 0], 30, 0, Object.assign({}, p, { versatz: -Math.atan(20 / 15) * 180 / Math.PI }), S);
  assert.equal(D.kat[0], M.HINDERNIS); assert.ok(nah(D.len[0], 25, 1e-4), "√(15² + 20²) = 25"); assert.ok(nah(D.end[2], 10, 1e-4));
});

test("Verdecken: das nähere von zwei Prismen gewinnt, auch wenn das fernere höher ist", () => {
  const S = szene([[kasten(30, -5, 40, 5), 40], [kasten(10, -5, 20, 5), 6]]);
  const p = Object.assign({}, P, { praezision: 1, hwinkel: 0, vwinkel: 0 });
  let E = M.strahlen([0, 0], 1.6, 0, Object.assign({}, p, { versatz: 0 }), S);
  assert.equal(E.obj[0], 1); assert.ok(nah(E.len[0], 10, 1e-5));
  // steiler (25°, bei t = 10 schon 6,26 m hoch): über das niedrige hinweg auf das hohe
  E = M.strahlen([0, 0], 1.6, 0, Object.assign({}, p, { versatz: 25 }), S);
  assert.equal(E.obj[0], 0); assert.ok(nah(E.len[0], 30 / Math.cos(25 * Math.PI / 180), 1e-4));
});

test("Anteile (List Length ÷ Mass Addition) und Strahllängenstatistik wie in der .gh-Datei", () => {
  const E = { n: 4, nv: 2, kat: Uint8Array.from([0, 1, 1, 2]), B: { raum: Float64Array.from([1, 3]) } };
  const A = M.anteile(E);
  assert.deepEqual(A.zahl, [1, 2, 1]); assert.deepEqual(A.anteil, [0.25, 0.5, 0.25]);
  assert.deepEqual(A.raum, [1 / 8, 4 / 8, 3 / 8], "nach Raumwinkel gewichtet");
  const L = M.statistik(Float32Array.from([2, 4, 4, 4, 5, 5, 7, 9]));
  assert.equal(L.min, 2); assert.equal(L.max, 9); assert.equal(L.summe, 40); assert.equal(L.mittel, 5); assert.equal(L.median, 4.5);
  assert.equal(L.std, 2, "√(Σ(x − Mittel)² ÷ n) = √(32 ÷ 8)");
  assert.deepEqual(M.statistik([]), { n: 0, min: 0, max: 0, mittel: 0, summe: 0, std: 0, median: 0 });
});

test("Volumen: leere Kugel ohne Boden = 4/3 π R³", () => {
  const p = Object.assign({}, P, { praezision: 40, hwinkel: 360, vwinkel: 180, boden: false, reichweite: 10 });
  const E = M.strahlen([0, 0], 1.6, 0, p, { prismen: [], objekte: [] });
  assert.ok(nah(M.volumen(E), 4 / 3 * Math.PI * 1000, 1e-6));
  assert.equal(M.anteile(E).anteil[0], 1);
});

test("Gebäudewerte: Bounds über alle Gebäude, Treffer 0 → grau (−1)", () => {
  const S = { objekte: [{ huelle: 200 }, { huelle: 100 }, { huelle: 50 }] };
  const W = M.gebaeudeWerte({ treffer: Int32Array.from([10, 5, 0]) }, S);
  assert.deepEqual(Array.from(W.t), [1, 0.5, -1]); assert.equal(W.lo, 0); assert.equal(W.hi, 10);
  const H = M.gebaeudeWerte({ treffer: Int32Array.from([10, 5, 0]) }, S, "huelle");
  assert.deepEqual(Array.from(H.wert), [5, 5, 0]); assert.deepEqual(Array.from(H.t), [1, 1, -1]);
  assert.deepEqual(M.verlauf(0), [0, 0, 139]); assert.deepEqual(M.verlauf(1), [255, 0, 0]);
});

test("Stadt: Höhen 3–7 Geschosse, Kirche mit Turm als ein Objekt; Treffer = Hindernisstrahlen", () => {
  const z = M.erzeuge(P, zufall(2)), S = z.S, k = S.objekte.length - 1;
  assert.equal(S.objekte.length, z.szene.gebaeude.length);
  for (const o of S.objekte.slice(0, -1)) { assert.ok(o.geschosse >= 3 && o.geschosse <= 7); assert.equal(S.prismen[o.prismen[0]].H, o.geschosse * M.GESCHOSS); }
  assert.equal(S.objekte[k].name, "kirche"); assert.deepEqual(S.objekte[k].prismen.map(i => S.prismen[i].H), [M.SCHIFF, M.TURM]);
  const summe = z.E.treffer.reduce((a, b) => a + b, 0);
  assert.equal(summe, z.A.zahl[M.HINDERNIS]);
  assert.equal(z.A.zahl[0] + z.A.zahl[1] + z.A.zahl[2], z.E.n);
  for (let r = 0; r < z.E.n; r++) assert.ok(z.E.len[r] >= 0 && z.E.len[r] <= P.reichweite + 1e-4);
});

test("Wiederholbarkeit: gleiche Saat → gleiche Stadt und Strahlen, andere Saat → andere", () => {
  const a = M.erzeuge(P, zufall(5)), b = M.erzeuge(P, zufall(5)), c = M.erzeuge(P, zufall(6));
  assert.deepEqual(Array.from(a.E.len), Array.from(b.E.len));
  assert.deepEqual(a.S.objekte.map(o => o.geschosse), b.S.objekte.map(o => o.geschosse));
  assert.notDeepEqual(a.S.objekte.map(o => o.geschosse), c.S.objekte.map(o => o.geschosse));
});

test("Schritt: Blickrichtung dreht um drehschritt; Wandern bleibt auf dem Weg und außerhalb der Gebäude", () => {
  const z = M.erzeuge(P, zufall(1));
  M.schritt(z, P); assert.equal(z.t, 1); assert.equal(z.blick, 60);
  for (let i = 0; i < 160; i++) M.schritt(z, P);
  assert.equal(z.blick, (58 + 161 * 2) % 360);
  const q = Object.assign({}, P, { ablauf: "wandern" }), w = M.erzeuge(q, zufall(1)), start = w.o.slice();
  for (let i = 0; i < 260; i++) { M.schritt(w, q); assert.ok(!M.imGebaeude(w, w.o), "Standpunkt im Gebäude bei Schritt " + i); }
  assert.notDeepEqual(w.o, start); assert.equal(w.t, 260);
  // Blick in Gehrichtung: die Richtung zeigt zum nächsten Wegpunkt
  const vor = w.o.slice(); M.schritt(w, q);
  assert.ok(Math.abs(((M.richtungZu(vor, w.o) - w.blick + 540) % 360) - 180) < 1);
});

test("Standpunkt setzen und Regler Blickrichtung ohne Neustart", () => {
  const z = M.erzeuge(P, zufall(1)), g = z.S.prismen[0].poly, innen = [(g[0][0] + g[2][0]) / 2, (g[0][1] + g[2][1]) / 2];
  assert.equal(M.setzeStandpunkt(z, P, innen), false, "nicht in ein Gebäude");
  assert.equal(M.setzeStandpunkt(z, P, [-1, 5]), false, "nicht außerhalb");
  const q = Object.assign({}, P, { richtung: 238 }); M.aendere(z, q, "richtung");
  assert.equal(z.blick, 238); assert.equal(z.t, 0);
});

test("Verhalten laut Katalog: Blickwinkel, Richtung und Reichweite bestimmen, welche Objekte sichtbar sind", () => {
  const z = M.erzeuge(P, zufall(1)), a0 = M.auswertung(z), a0Himmel = z.A.anteil[0];
  assert.ok(a0.kirche > 100, "die Kirche auf dem Platz steht im Blick"); assert.ok(a0.sichtbar < a0.gebaeude);
  // Blick in die Gegenrichtung: die Kirche verschwindet aus dem Blickfeld
  M.aendere(z, Object.assign({}, P, { richtung: 238 }), "richtung"); assert.equal(M.auswertung(z).kirche, 0);
  // Rundumsicht sieht mehr Gebäude als 120°
  const r = M.erzeuge(Object.assign({}, P, { hwinkel: 360 }), zufall(1));
  assert.ok(M.auswertung(r).sichtbar > a0.sichtbar);
  // Bündel nach oben: mehr Himmel, kein Boden
  const o = M.erzeuge(Object.assign({}, P, { versatz: 31 }), zufall(1));
  assert.ok(o.A.anteil[0] > a0Himmel, String(o.A.anteil[0])); assert.equal(o.A.zahl[M.BODEN], 0);
  // aus 30 m Höhe mit 200 m Reichweite: mehr Gebäude gesehen
  const t = M.erzeuge(Object.assign({}, P, { augenhoehe: 30, reichweite: 200 }), zufall(1));
  assert.ok(M.auswertung(t).sichtbar > 2 * a0.sichtbar);
});
