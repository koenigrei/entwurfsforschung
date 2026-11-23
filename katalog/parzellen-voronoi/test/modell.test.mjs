// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const nah = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const QUADRAT = [[0, 0], [100, 0], [100, 100], [0, 100]];
const summe = Z => Z.reduce((s, q) => s + Geo.flaeche(q), 0);

test("erzeuge: t = 0, Blöcke ohne Zellen", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.t, 0);
  assert.ok(z.bloecke.length >= 15 && z.bloecke.every(b => b.phase === 0 && !b.zellen));
});

test("Divide Distance: Abstand 30 im Quadrat 100 – nachgerechnete Punkte", () => {
  const P = M.teileDistanz(QUADRAT, 30);
  assert.equal(P.length, 13);
  assert.deepEqual(P.slice(0, 4), [[0, 0], [30, 0], [60, 0], [90, 0]]);
  nah(P[4][0], 100); nah(P[4][1], Math.sqrt(30 * 30 - 100), 1e-9);    // Kreis um (90, 0) trifft die rechte Kante bei y = √800
  for (let i = 1; i < P.length; i++) nah(Geo.abstand(P[i - 1], P[i]), 30, 1e-9);
  assert.ok(P.every(q => M.randAbstand(q, QUADRAT) < 1e-9));
});

test("Divide Distance: Abstand größer als der Umfang → nur der Anfangspunkt", () => {
  assert.equal(M.teileDistanz(QUADRAT, 500).length, 1);
  assert.deepEqual(M.zellen(M.teileDistanz(QUADRAT, 500), QUADRAT), [QUADRAT]);
});

test("Voronoi: vier Punkte in den Kantenmitten → vier Dreiecke zu je 2500 m²", () => {
  const Z = M.zellen([[50, 0], [100, 50], [50, 100], [0, 50]], QUADRAT);
  assert.equal(Z.length, 4);
  Z.forEach(q => nah(Geo.flaeche(q), 2500, 1e-6));
});

test("Glätten: zwei nahe innere Ecken werden zu einer, Randecken bleiben, Fläche bleibt", () => {
  // Punkte so, dass die Voronoi-Mitte in zwei nahe Ecken zerfällt
  const pk = [[50, 0], [100, 52], [50, 100], [0, 48]], Z = M.zellen(pk, QUADRAT);
  const n0 = M.netzAusZellen(Z, QUADRAT);
  const innen0 = n0.ecken.filter(e => !e.rand).length;
  assert.equal(innen0, 2);
  const g = M.glaette(Z, QUADRAT, 10);
  const n1 = M.netzAusZellen(g.zellen, QUADRAT);
  assert.equal(n1.ecken.filter(e => !e.rand).length, 1);
  assert.equal(g.bewegt, 2);
  nah(summe(g.zellen), 10000, 1e-6);
  for (const e of n0.ecken.filter(e => e.rand)) assert.ok(n1.ecken.some(f => Geo.abstand(e.p, f.p) < 1e-6), "Randecke verschwunden");
});

test("Glätten: innere Ecke nahe einem Anker springt auf den Anker", () => {
  const Z = [[[0, 0], [50, 0], [52, 4], [0, 100]], [[50, 0], [100, 0], [100, 100], [0, 100], [52, 4]]];   // Ecke (52, 4) innen
  const g = M.glaette(Z, QUADRAT, 6);
  assert.ok(g.anker.some(a => a[0] === 50 && a[1] === 0));
  assert.ok(g.zellen.every(q => !q.some(p => p[0] === 52 && p[1] === 4)));
  nah(summe(g.zellen), 10000, 1e-6);
});

test("Ankerpunkte: Blockecken und Randpunkte der Zellen, ohne Dopplung", () => {
  const Z = M.zellen([[50, 0], [100, 50], [50, 100], [0, 50]], QUADRAT), n = M.netzAusZellen(Z, QUADRAT), A = M.anker(QUADRAT, n);
  assert.equal(A.length, 4);                   // die Zellgrenzen treffen den Rand genau in den Blockecken
});

test("Ablauf: drei Phasen je Block, jede Parzelle an der Straße, lückenlos (Katalog: keeps each parcel connected to the street)", () => {
  const p = Object.assign({}, M.STANDARD), z = M.erzeuge(p, zufall(2));
  M.schritt(z, p); assert.equal(z.bloecke[0].phase, 1); assert.ok(z.bloecke[0].punkte.length > 2);
  M.schritt(z, p); assert.equal(z.bloecke[0].phase, 2); assert.equal(z.bloecke[0].zellen.length, z.bloecke[0].punkte.length);
  M.schritt(z, p); assert.equal(z.bloecke[0].phase, 3); assert.equal(z.t, 3);
  let n = 0; while (!M.fertig(z, p)) { M.schritt(z, p); n++; }
  assert.equal(n + 3, 3 * z.bloecke.length);
  for (const b of z.bloecke) {
    nah(summe(b.zellen), b.A, b.A * 1e-9);
    assert.ok(b.zellen.every(q => Geo.flaecheS(q) > 0));
    assert.ok(b.zellen.every(q => M.strassenfront(q, b.poly) > 1), "Parzelle ohne Straßenanschluss");
  }
});

test("Zellabstand: kleinerer Abstand → mehr, kleinere Parzellen", () => {
  const B = M.quartier(zufall(3)).bloecke[0];
  const a = M.parzelliere(B, { abstand: 30 }), b = M.parzelliere(B, { abstand: 80 });
  assert.ok(a.zellen.length > b.zellen.length);
});

test("Snapping ohne Neustart: größere Schwelle verschiebt mindestens so viele Ecken; Glätten aus → rohe Zellen", () => {
  const p = Object.assign({}, M.STANDARD), z = M.erzeuge(p, zufall(4));
  while (!M.fertig(z, p)) M.schritt(z, p);
  const v1 = z.bloecke.reduce((s, b) => s + b.bewegt, 0);
  M.aendere(z, Object.assign({}, p, { snapping: 0.5 }), "snapping");
  const v2 = z.bloecke.reduce((s, b) => s + b.bewegt, 0);
  assert.ok(v2 >= v1 && v2 > 0);
  M.aendere(z, Object.assign({}, p, { glaetten: false }), "glaetten");
  assert.ok(z.bloecke.every(b => b.zellen === b.roh && b.phase === 2));
});

test("Wiederholbarkeit: gleiche Saat gleiches Ergebnis, andere Saat anderes", () => {
  const lauf = s => { const z = M.erzeuge({}, zufall(s)); for (let i = 0; i < 40; i++) M.schritt(z, {}); return z.bloecke.map(b => b.zellen); };
  assert.deepEqual(lauf(5), lauf(5));
  assert.notDeepEqual(lauf(5), lauf(6));
});
