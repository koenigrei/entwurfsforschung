// Tests der generativen Bausteine: Instruktionsbaum, Straßenwachstum, Slicing Tree (node --test im Ordner katalog/_gemeinsam) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Gen = require("../generierung.js");
const Geo = require("../geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const nah = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
/** feste „Zufalls“funktion: liefert die Werte der Liste der Reihe nach (dann wieder von vorn) */
function folge(werte) { let i = 0; const f = () => werte[i++ % werte.length]; f.ganz = n => Math.floor(f() * n); return f; }
const P = { baumtiefe: 7, minLaenge: 30, maxLaenge: 100, minAbstand: 20, zufallsWinkel: 10, maxArme: 4 };
const mit = o => Object.assign({}, P, o);
const QUADRAT = { rand: [[0, 0], [100, 0], [100, 100], [0, 100]], start: [[[-20, 50], [50, 50]]] };
/** Baufeld wie in netzoptimierung (Fünfeck, drei Startstraßen) */
const FELD = { rand: [[120, 408], [258, 62], [445, 42], [652, 175], [420, 500]],
  start: [[[30, 232], [188, 238], [290, 247], [395, 256], [490, 262], [584, 270]], [[170, 106], [236.5, 116], [330, 129], [430, 142], [540, 157], [652, 175]], [[610, 60], [572, 112], [548, 128]]] };
const nW = S => S.start.reduce((s, pl) => s + pl.length, 0);

/* ---------------------------------------------------------------- Instruktionsbaum */
test("Gene: ganze Grad in [−RA/2, RA/2), ganze Meter in [MinLength, MinLength + MaxLength), Grad 2…MaxArms", () => {
  const r = zufall(3);
  for (let i = 0; i < 300; i++) {
    const g = Gen.gene(r, P);
    assert.ok(Number.isInteger(g.winkel + 5) && g.winkel >= -5 && g.winkel < 5);
    assert.ok(Number.isInteger(g.laenge) && g.laenge >= 30 && g.laenge < 130);
    assert.ok(g.maxArme >= 2 && g.maxArme <= 4 && g.teiler >= 0 && g.teiler < 1);
  }
  assert.deepEqual(Gen.gene(folge([0]), P), { winkel: -5, laenge: 30, maxArme: 2, teiler: 0 });
});

test("Instruktionsbaum: drei Arm-Plätze je Wurzel, Ebenen nach TreeDepth (nachgerechnet), Ebene auf Wunsch, Obergrenze", () => {
  const b = Gen.baum(zufall(1), 4, mit({ maxArme: 1, baumtiefe: 5 }));             // k = 1: genau ein Platz je Knoten
  assert.equal(b.anzahl, 60); assert.ok(b.wurzeln.every(w => w.kinder.length === 3));
  assert.equal(Gen.baum(zufall(1), 4, mit({ baumtiefe: 0 })).anzahl, 0);
  assert.equal(Gen.baum(folge([0.999]), 1, mit({ baumtiefe: 3 })).anzahl, 3 + 9 + 27);
  assert.ok(Gen.baum(zufall(2), 15, mit({ baumtiefe: 20 })).anzahl <= Gen.INTERN.maxKnoten);
  // gleiche Saat: mit und ohne Ebene dieselben Gene; die Ebene steht nur mit opt.ebene am Knoten
  const a = Gen.baum(zufall(5), 2, mit({ baumtiefe: 3 })), e = Gen.baum(zufall(5), 2, mit({ baumtiefe: 3 }), { ebene: true });
  assert.equal(a.wurzeln[0].kinder[0].ebene, undefined); assert.equal(e.wurzeln[0].kinder[0].ebene, 1);
  assert.equal(e.wurzeln[0].kinder[0].kinder[0].ebene, 2);
  const ohne = k => ({ winkel: k.winkel, laenge: k.laenge, maxArme: k.maxArme, teiler: k.teiler, kinder: k.kinder.map(ohne) });
  assert.deepEqual(e.wurzeln.map(w => w.kinder.map(ohne)), a.wurzeln.map(w => w.kinder.map(ohne)));
});

test("Armrichtung: geradeaus, Winkelhalbierende der größten Lücke, Lücke < 80° → kein Arm, Lücke ≥ 260° → Versatz", () => {
  const pol = w => [Math.cos(w * Math.PI / 180) * 10, Math.sin(w * Math.PI / 180) * 10];
  const Pk = (...w) => [[0, 0], ...w.map(pol)];
  assert.equal(Gen.armRichtung(Pk(0), 0, 1, [1], 0), 180);
  nah(Gen.armRichtung(Pk(0, 180), 0, 1, [1, 2], 0), 90);
  nah(Gen.armRichtung(Pk(0, 90, 180), 0, 1, [1, 2, 3], 0), 270);
  nah(Gen.armRichtung(Pk(0, 70, 140, 210, 280), 0, 1, [1, 2, 3, 4, 5], 0), 320);
  assert.equal(Gen.armRichtung(Pk(0, 60, 120, 180, 240, 300), 0, 1, [1, 2, 3, 4, 5, 6], 0), null);
  nah(Gen.armRichtung(Pk(0, 40), 0, 1, [1, 2], 0), 85);
  nah(Gen.armRichtung(Pk(0, 40), 0, 1, [1, 2], 0.99), 220);
});

test("Grundnetz und Arm: Rand und Startstraße an der Kreuzung geteilt; Arm endet am Rand, fängt an Knoten, verwirft Ziele außerhalb", () => {
  const { G, wurzeln } = Gen.grundnetz(QUADRAT);
  const E = G.E.filter(e => e.lebt);
  assert.equal(E.filter(e => e.art === Gen.ART.RAND).length, 5);
  assert.equal(E.filter(e => e.art === Gen.ART.START).length, 2);
  assert.deepEqual(wurzeln.map(v => G.P[v]), [[-20, 50], [50, 50]]);
  const mitte = G.P.findIndex(q => q[0] === 50 && q[1] === 50);
  const a = Gen.arm(G, QUADRAT, mitte, [150, 50], 20, 4);
  assert.deepEqual(G.P[a.v], [100, 50]); assert.equal(a.zu, true);
  const b = Gen.arm(G, QUADRAT, mitte, [50, 92], 20, 4);
  assert.deepEqual(G.P[b.v], [50, 100]); assert.equal(b.zu, true);
  assert.equal(Gen.arm(G, QUADRAT, b.v, [12, 100], 20, 4), null);
  const c = Gen.arm(G, QUADRAT, mitte, [88, 12], 20, 4);
  assert.deepEqual(G.P[c.v], [100, 0]);
  const w = Gen.knotenNeu(G, [-30, 70]);
  assert.equal(Gen.arm(G, QUADRAT, w, [-60, 70], 5, 4), null);
  assert.equal(Gen.imAussenrand(QUADRAT, [100.5, 50]), true); assert.equal(Gen.imAussenrand(QUADRAT, [102, 50]), false);
});

test("Wachstum: ebenes Netz, neue Punkte im äußeren Rand, wiederholbar; Ebene für Ebene = alles auf einmal", () => {
  const b = Gen.baum(zufall(7), nW(FELD), mit({ baumtiefe: 7 }), { ebene: true });
  const stat = {}, ph = Gen.wachse(b, FELD, P, { stat, arme: true });
  assert.ok(ph.gesetzt > 20); assert.equal(ph.arme.length, ph.gesetzt);
  assert.ok(stat.abgelehnt > 0 || stat.luecke > 0 || stat.grad > 0);
  // Arme in Setzreihenfolge: Ebenen steigen nie ab
  for (let i = 1; i < ph.arme.length; i++) assert.ok(ph.arme[i].ebene >= ph.arme[i - 1].ebene);
  const s = ph.segmente;
  for (let i = 0; i < s.length; i++) {
    if (ph.art[i] === Gen.ART.NEU) for (const q of s[i]) assert.ok(Gen.imAussenrand(FELD, q) || FELD.start.flat().some(x => Geo.abstand(x, q) < 1e-9));
    for (let j = i + 1; j < s.length; j++) { const x = Geo.segmentSchnitt(s[i][0], s[i][1], s[j][0], s[j][1]); if (x) assert.ok(x.t < 1e-6 || x.t > 1 - 1e-6); }
  }
  assert.deepEqual(Gen.wachse(b, FELD, P).segmente, s);
  assert.equal(Gen.wachse(b, FELD, P).arme, null);
  // schrittweise (wie stadtsynthese): gleiches Netz, Zahl der Arme je Ebene addiert sich
  const { G, wurzeln } = Gen.grundnetz(FELD), W = Gen.wachstumBeginn(G, wurzeln, b);
  let n = 0; while (W.ebene.length) n += Gen.wachstumEbene(W, FELD, P);
  assert.equal(n, ph.gesetzt); assert.equal(W.gesetzt, n); assert.deepEqual(Gen.segmenteVon(W.G), s);
  assert.equal(W.nr, 8);                                                           // 7 Ebenen + eine leere
});

test("Wachstum: TreeDepth 0 → nur Rand und Startstraßen", () => {
  const ph = Gen.wachse(Gen.baum(zufall(1), nW(FELD), mit({ baumtiefe: 0 })), FELD, P);
  assert.equal(ph.gesetzt, 0); assert.equal(ph.art.filter(a => a === Gen.ART.NEU).length, 0);
});

/* ---------------------------------------------------------------- Slicing Tree */
const BLOCK = [[0, 0], [120, 0], [120, 90], [0, 90]];
const STX = { breite: 31, teilung: 0.5, skalierung: 1, minAbstand: 1 };
const W = Gen.kantenVon(BLOCK);

test("Drehung ins Rechteck der kleinsten Fläche und Straßenkanten", () => {
  const w = 0.6, R = BLOCK.map(p => Gen.dreh(p, [0, 0], w));
  const d = Gen.rechteckWinkel(R), bb = Geo.bbox(R.map(p => Gen.dreh(p, [0, 0], d)));
  nah(bb.b, 120); nah(bb.h, 90);
  const { strasse, innen } = Gen.teileKanten([[0, 0], [60, 0], [60, 90], [0, 90]], W, 1);
  assert.deepEqual(strasse.map(k => k.l), [90, 60, 60]); assert.equal(innen.length, 1);
  assert.equal(Gen.istStrasse({ a: [0, 0.5], b: [50, 0.5] }, W, 1), true);
  assert.equal(Gen.istStrasse({ a: [0, 2], b: [50, 2] }, W, 1), false);
  assert.equal(Gen.istStrasse({ a: [0, 2], b: [50, 2] }, W, 3), true);              // scalingFactor 3
  assert.deepEqual(W.map(k => k.i), [0, 1, 2, 3]);
  nah(Gen.parallelAbstand(W[0], W[2]), 90); assert.equal(Gen.parallelAbstand(W[0], W[1]), -1);
});

test("Regel STX: Schnitt senkrecht zur längsten Straßenkante bei bbox.min + splitRate · Größe; Blätter", () => {
  const r = Gen.sliceRegel(BLOCK, W, STX); assert.equal(r.op, "V"); nah(r.x, 60);
  const r2 = Gen.sliceRegel([[0, 0], [60, 0], [60, 90], [0, 90]], W, STX); assert.equal(r2.op, "H"); nah(r2.y, 45);
  nah(Gen.sliceRegel(BLOCK, W, Object.assign({}, STX, { teilung: 0.3 })).x, 36);
  assert.equal(Gen.sliceRegel([[0, 0], [60, 0], [60, 45], [0, 45]], W, STX), null);          // 0,5 · 60 = 30 < 31
  assert.equal(Gen.sliceRegel([[20, 20], [100, 20], [100, 70], [20, 70]], W, STX), null);    // ohne Straße
  // Rücken an Rücken: Streifen 40 × 120 mit Straße nur an den kurzen Enden
  const Wurzel = Gen.kantenVon([[0, 0], [40, 0], [40, 120], [0, 120]]).filter(k => k.a[1] === k.b[1]);
  const rr = Gen.sliceRegel([[0, 0], [40, 0], [40, 120], [0, 120]], Wurzel, STX);
  assert.ok(rr && rr.ruecken); assert.equal(rr.op, "H"); nah(rr.y, 60);
});

test("Regel PG (Parcels): Grenze ≥ PlotWidthThreshold, Schnitt auf der Mitte", () => {
  const PG = { breite: 30, teilung: 0.5, skalierung: 1, variante: "pg" };
  assert.equal(Gen.sliceRegel([[0, 0], [60, 0], [60, 45], [0, 45]], W, PG).op, "V");       // 0,5 · 60 = 30 ≥ 30 (STX: nicht > 30)
  assert.equal(Gen.sliceRegel([[0, 0], [60, 0], [60, 45], [0, 45]], W, Object.assign({}, STX, { breite: 30 })), null);
  const K = Gen.sliceBaum([[0, 0], [200, 0], [200, 50], [0, 50]], { breite: 40, variante: "pg", maxEbene: 30 });
  const B = Gen.sliceBlaetter(K);
  assert.equal(B.length, 4); B.forEach(k => nah(Geo.flaeche(k.poly), 2500));
});

test("Slicing Tree: Rechteckblock 120 × 90 → 4 Parzellen 60 × 45, binärer Baum, lückenlos, deterministisch", () => {
  const K = Gen.sliceBaum(BLOCK, STX), B = Gen.sliceBlaetter(K);
  assert.equal(B.length, 4); assert.equal(K.filter(k => k.kinder).length, 3);
  B.forEach(k => nah(Geo.flaeche(k.poly), 2700));
  K.filter(k => k.kinder).forEach(k => { assert.equal(k.kinder.length, 2); assert.equal(k.linie.length, 2); });
  assert.equal(K[0].eltern, -1); assert.ok(K.slice(1).every(k => k.eltern >= 0 && K[k.eltern].kinder.includes(k.id)));
  nah(B.reduce((s, k) => s + Geo.flaeche(k.poly), 0), 10800);
  assert.deepEqual(Gen.sliceBaum(BLOCK, STX), K);
  const S = Gen.sliceBlaetter(Gen.sliceBaum([[0, 0], [200, 0], [200, 30], [0, 30]], STX));
  S.forEach(k => { const w = Geo.bbox(k.poly).b; assert.ok(w >= 31 && w < 62); });
  // Tiefe begrenzt: maxEbene 1 → höchstens ein Schnitt
  assert.equal(Gen.sliceBlaetter(Gen.sliceBaum(BLOCK, Object.assign({}, STX, { maxEbene: 1 }))).length, 2);
});
