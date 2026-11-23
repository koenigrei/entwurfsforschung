// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Szenen = require("../../_gemeinsam/szenen.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const mit = o => Object.assign({}, P, o);
const nah = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const deg = g => g * Math.PI / 180;
/** Rampe: Gelände steigt nach Norden (−y) mit Steigung s, also fällt es nach Süden (+y) */
function rampe(s, n = 21, groesse = 200) {
  const z = groesse / (n - 1), h = new Float64Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = (groesse - j * z) * s;
  return { n, groesse, zelle: z, h, min: 0, max: groesse * s };
}

test("erzeuge: t = 0, nichts bewertet, Straßennetz ohne rechteckigen Rahmen auf dem Gelände", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.k, 0); assert.ok(z.strassen.length > 150);
  for (const [p, q] of z.strassen) for (const r of [p, q]) assert.ok(r[0] >= 0 && r[1] >= 0 && r[0] <= z.G.groesse && r[1] <= z.G.groesse);
  assert.equal(M.bewertet(z).length, 0);
});

test("Winkel und Evaluate if(x>0.5*PI,PI-x,x)", () => {
  assert.ok(nah(M.winkel([1, 0], [0, 1]), Math.PI / 2)); assert.ok(nah(M.winkel([1, 0], [-1, 0]), Math.PI)); assert.equal(M.winkel([0, 0], [1, 0]), 0);
  assert.ok(nah(M.umkehren(Math.PI * 0.75), Math.PI * 0.25)); assert.equal(M.umkehren(0.3), 0.3);
});

test("Normale: Neigung = Angle(Normale, Z), waagerechte Komponente zeigt hangabwärts mit Länge sin(Neigung)", () => {
  const n = M.normale([0, -0.5]);                       // h steigt nach −y → Wasser fließt nach +y
  assert.ok(nah(Math.acos(n[2]), Math.atan(0.5))); assert.ok(n[1] > 0 && nah(n[0], 0)); assert.ok(nah(Math.hypot(n[0], n[1]), Math.sin(Math.atan(0.5))));
});

test("Segment quer zum Hang: Abweichung 90°, Risiko = 1 × Neigung/Max Degrees; längs zum Hang: Risiko 0", () => {
  const s = Math.tan(deg(10)), G = rampe(s);
  const quer = M.bewerteSegment(G, [50, 100], [150, 100], P);
  assert.ok(nah(quer.abweichung, Math.PI / 2, 1e-9)); assert.ok(nah(quer.steil, deg(10), 1e-9));
  assert.ok(nah(quer.nAbw, 1)); assert.ok(nah(quer.nSteil, 10 / 15, 1e-9)); assert.ok(nah(quer.risiko, 10 / 15, 1e-9));
  const laengs = M.bewerteSegment(G, [100, 50], [100, 150], P), gegen = M.bewerteSegment(G, [100, 150], [100, 50], P);
  assert.ok(nah(laengs.abweichung, 0, 1e-9) && nah(gegen.abweichung, 0, 1e-9));   // Richtung der Straße egal (umkehren)
  assert.ok(nah(laengs.risiko, 0, 1e-9));
  const schraeg = M.bewerteSegment(G, [50, 50], [150, 150], P);                   // 45° zum Fluss → halbe Abweichung
  assert.ok(nah(schraeg.nAbw, 0.5, 1e-9));
});

test("Remap der Neigung ist nicht gekappt; Farbwert kappt bei der Gradient-Obergrenze", () => {
  const G = rampe(Math.tan(deg(30))), q = M.bewerteSegment(G, [50, 100], [150, 100], P);
  assert.ok(nah(q.nSteil, 2, 1e-9)); assert.equal(M.farbwert(q.risiko, 1), 1);
  assert.equal(M.farbwert(0.25, 0.5), 0.5); assert.equal(M.farbwert(-1, 1), 0);
});

test("Flaches Gelände: Risiko 0 (keine Fließrichtung)", () => {
  const G = rampe(0), q = M.bewerteSegment(G, [0, 0], [100, 30], P);
  assert.equal(q.steil, 0); assert.equal(q.risiko, 0);
});

test("Teilen: gleich lange Segmente von höchstens L Metern, lückenlos", () => {
  const T = M.teile([[0, 0], [100, 0]], 30);
  assert.equal(T.length, 4); assert.deepEqual(T[0], [[0, 0], [25, 0]]); assert.deepEqual(T[3][1], [100, 0]);
  assert.equal(M.teile([[0, 0], [10, 0]], 25).length, 1); assert.equal(M.teile([[0, 0], [50, 0]], 25).length, 2);
});

test("Schritt: eine Straße mehr, von oben nach unten; Ende nach der letzten", () => {
  const z = M.erzeuge(P, zufall(2)), h = i => { const s = z.strassen[z.folge[i]]; return Szenen.hoehe(z.G, (s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2); };
  for (let i = 1; i < z.folge.length; i++) assert.ok(h(i - 1) >= h(i));
  M.schritt(z, P); assert.equal(z.k, 1); assert.equal(z.t, 1); assert.equal(M.bewertet(z).length, z.seg[z.folge[0]].length);
  let n = 0; while (!M.fertig(z) && n++ < 10000) M.schritt(z, P);
  assert.equal(z.k, z.strassen.length); M.schritt(z, P); assert.equal(z.k, z.strassen.length);
});

test("Katalog: kleineres Max Degrees → mehr stark betroffene Straßen", () => {
  const z = M.erzeuge(P, zufall(3));
  M.aendere(z, mit({ maxGrad: 5 }), "maxGrad"); const a5 = M.auswertung(z, mit({ maxGrad: 5 }));
  M.aendere(z, mit({ maxGrad: 30 }), "maxGrad"); const a30 = M.auswertung(z, mit({ maxGrad: 30 }));
  assert.ok(a5.stark > a30.stark && a5.kaum < a30.kaum); assert.ok(nah(a5.laenge, a30.laenge, 1e-6));
});

test("Auswahl eines Segments per Klick; Abspielen setzt zurück", () => {
  const z = M.erzeuge(P, zufall(4)), s = z.seg[0][0];
  assert.ok(M.waehle(z, s.m) >= 0); assert.equal(M.segmentNr(z, z.wahl), s);
  assert.equal(M.waehle(z, [-500, -500]), -1);
  M.aendere(z, P, "segment"); assert.ok(M.fertig(z)); M.abspielen(z); assert.equal(z.k, 0); assert.equal(z.t, 0);
});

test("Wiederholbarkeit: gleiche Saat → gleiches Netz und gleiche Werte, andere Saat → anderes", () => {
  const a = M.erzeuge(P, zufall(7)), b = M.erzeuge(P, zufall(7)), c = M.erzeuge(P, zufall(8));
  assert.deepEqual(a.seg, b.seg); assert.notDeepEqual(a.strassen, c.strassen);
});
