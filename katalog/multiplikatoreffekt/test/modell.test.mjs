// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");

const nah = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);
const winkelGraph = (segmente, norm = "dcs2020") => { const N = Geo.netz(segmente, 0.01); return { N, G: Geo.richtungsGraph(N, { kL: 0, kW: 1, norm }) }; };
/** Index des Segments mit den Endpunkten a–b */
const seg = (N, a, b) => N.kanten.findIndex(e => { const p = N.knoten[e.a], q = N.knoten[e.b];
  return (Geo.abstand(p, a) < 1e-9 && Geo.abstand(q, b) < 1e-9) || (Geo.abstand(p, b) < 1e-9 && Geo.abstand(q, a) < 1e-9); });
/** kleiner Lauf mit Parametern */
const lauf = (param, n = 29, saat = 1, ohneDisruptoren = false) => {
  const p = Object.assign({}, M.STANDARD, param), z = M.erzeuge(p, zufall(saat));
  if (ohneDisruptoren) { z.disruptoren = []; M.leere(z, p); }
  for (let i = 0; i < n; i++) M.schritt(z, p);
  return { z, p };
};

// ---------------------------------------------------------------- Netzmaße
test("Winkelkosten: geradeaus 0, rechtwinklig 0,5 (Legacy θ/180°) bzw. 1 (Standard θ/90°)", () => {
  const S = [[[0, 0], [100, 0]], [[100, 0], [200, 0]], [[100, 0], [100, 100]]];
  for (const [norm, erwartet] of [["dcs2020", 0.5], ["standard", 1]]) {
    const { N, G } = winkelGraph(S, norm), a = seg(N, [0, 0], [100, 0]), b = seg(N, [100, 0], [200, 0]), c = seg(N, [100, 0], [100, 100]);
    const A = Geo.segmentAbstaende(G, M.suche(G, a)).kosten;
    nah(A[b], 0); nah(A[c], erwartet, 1e-6);
  }
});

test("Closeness nach Gl. 4: Σw / Σ d·w, nachgerechnet am T-Stoß", () => {
  const { N, G } = winkelGraph([[[0, 0], [100, 0]], [[100, 0], [200, 0]], [[100, 0], [100, 100]]]);
  const a = seg(N, [0, 0], [100, 0]), b = seg(N, [100, 0], [200, 0]), c = seg(N, [100, 0], [100, 100]);
  const w = new Float64Array(3).fill(1);
  nah(M.closenessVon(G, M.suche(G, a), w), 2 / 0.5, 1e-6);            // (1 + 1) / (0 · 1 + 0,5 · 1)
  w[c] = 3; w[b] = 1;
  nah(M.closenessVon(G, M.suche(G, a), w), 4 / 1.5, 1e-6);            // (1 + 3) / (0 · 1 + 0,5 · 3)
  // nur geradeaus erreichbar (Σ d·w = 0) → 0 statt unendlich
  const L = winkelGraph([[[0, 0], [100, 0]], [[100, 0], [200, 0]]]);
  assert.equal(M.closenessVon(L.G, M.suche(L.G, 0), null), 0);
});

test("Radius: die Suche geht nur bis zur metrischen Länge r (Mitte zu Mitte)", () => {
  const S = [0, 1, 2, 3].map(i => [[i * 100, 0], [(i + 1) * 100, 0]]);
  const { N, G } = winkelGraph(S), s0 = seg(N, [0, 0], [100, 0]);
  const A = Geo.segmentAbstaende(G, M.suche(G, s0, 250));
  const m = S.map(([a, b]) => A.meter[seg(N, a, b)]);
  assert.deepEqual(m.slice(0, 3), [0, 100, 200]);
  assert.equal(m[3], Infinity);                                         // 300 m > 250 m
  const B = Geo.segmentAbstaende(G, M.suche(G, s0));                    // Rn: alles erreicht
  assert.equal(B.meter[seg(N, S[3][0], S[3][1])], 300);
});

test("Betweenness nach Gl. 5: Paar (j, k) zählt w_j · w_k, mit Legacy zählen auch die Enden", () => {
  const S = [[[0, 0], [100, 0]], [[100, 0], [200, 0]], [[200, 0], [300, 0]]];
  const { N, G } = winkelGraph(S), a = seg(N, ...S[0]), b = seg(N, ...S[1]), c = seg(N, ...S[2]);
  const w = new Float64Array(3); w[a] = 2; w[b] = 1; w[c] = 3;
  const ohne = new Float64Array(3), mit = new Float64Array(3);
  for (let s = 0; s < 3; s++) { M.betweennessVon(G, M.suche(G, s), w, w, ohne, false); M.betweennessVon(G, M.suche(G, s), w, w, mit, true); }
  nah(ohne[b], 2 * 2 * 3);                                              // a → c und c → a
  nah(ohne[a], 0); nah(ohne[c], 0);
  // Legacy: jedes geordnete Paar zählt zusätzlich für Start und Ziel – a als Start: 2·(1 + 3), als Ziel: 1·2 + 3·2
  nah(mit[a], 2 * (1 + 3) + 1 * 2 + 3 * 2);
  nah(mit[b], ohne[b] + 2 * (1 * 2 + 1 * 3));
});

test("Ohne Radius stimmt die eigene Suche mit Geo.zustandsSuche/segmentBetweennessVon überein", () => {
  const z = M.erzeuge(M.STANDARD, zufall(3)), G = z.G, w = Float64Array.from({ length: G.n }, (_, i) => 1 + (i % 5));
  const eig = new Float64Array(G.n), geo = new Float64Array(G.n);
  for (let s = 0; s < G.n; s += 7) {
    const A = Geo.segmentAbstaende(G, M.suche(G, s)).kosten, B = Geo.segmentAbstaende(G, Geo.zustandsSuche(G, s)).kosten;
    for (let t = 0; t < G.n; t++) nah(A[t], B[t], 1e-9);
    M.betweennessVon(G, M.suche(G, s), w, w, eig, false);
    Geo.segmentBetweennessVon(G, s, w, w, geo, { enden: false });
  }
  for (let t = 0; t < G.n; t++) nah(eig[t], geo[t], 1e-9);
});

// ---------------------------------------------------------------- Nutzungen (Cluster)
test("Custom OD weights: k überall, d an den Disruptorsegmenten", () => {
  assert.deepEqual(Array.from(M.anfangsGewichte(5, [1, 3], 1, 300)), [1, 300, 1, 300, 1]);
  assert.deepEqual(Array.from(M.anfangsGewichte(3, [], 2, 300)), [2, 2, 2]);
});

test("Normalize (temp disruption): w_neu = MPC · Σw / ΣMPC, Summe bleibt", () => {
  assert.deepEqual(Array.from(M.normiereTemporaer(Float64Array.from([1, 3]), Float64Array.from([5, 3]))), [2, 6]);
  // ΣMPC = 0 (nichts erreichbar): Nutzungen bleiben
  assert.deepEqual(Array.from(M.normiereTemporaer(new Float64Array(2), Float64Array.from([4, 1]))), [4, 1]);
});

test("Normalize (permanent disruption): Disruptoren behalten d, der Rest folgt der Zentralität", () => {
  const out = M.normiereDauerhaft(Float64Array.from([1, 1, 2]), Float64Array.from([10, 1, 1]), [0], 10);
  nah(out[0], 10); nah(out[1], 2 / 3); nah(out[2], 4 / 3);             // (12 − 10) / (1 + 2) · MPC
  nah(M.summe(out), 12);
});

test("Darstellung: ln(x + 3) − ln 3 und Bestimmtheitsmaß R²", () => {
  assert.equal(M.logWert(0), 0); nah(M.logWert(3), Math.log(2));
  nah(M.r2([1, 2, 3, 4], [3, 5, 7, 9]), 1);
  nah(M.r2([1, 2, 3], [1, 3, 2]), 0.25);                                 // r = 0,5
  assert.ok(Number.isNaN(M.r2([1, 1, 1], [1, 2, 3])));
});

// ---------------------------------------------------------------- Ablauf
test("Ein Schritt = eine Rückkopplungsrunde; Ende nach den Iterationen; Σ Nutzungen bleibt gleich", () => {
  const p = Object.assign({}, M.STANDARD, { iterationen: 3 }), z = M.erzeuge(p, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.iter, 0);
  const s0 = M.summe(z.gew[0]);
  for (let i = 0; i < 5; i++) M.schritt(z, p);
  assert.equal(z.t, 5); assert.equal(z.iter, 3); assert.ok(M.fertig(z, p));
  assert.equal(z.mpc.length, 3); assert.equal(z.gew.length, 4);
  for (const w of z.gew) nah(M.summe(w), s0, 1e-9);
  nah(z.me[0], 1);                                                       // R²(MPC₁, MPC₁)
  assert.ok(Number.isNaN(z.ch[0]));
  M.leere(z, p); assert.equal(z.t, 0); assert.equal(z.iter, 0);
});

test("Wiederholbarkeit: gleiche Saat gleich, andere Saat anders", () => {
  const a = lauf({}, 2, 5).z, b = lauf({}, 2, 5).z, c = lauf({}, 2, 6).z;
  assert.deepEqual(Array.from(a.mpc[1]), Array.from(b.mpc[1]));
  assert.notDeepEqual(a.S.segmente.map(s => s[0]), c.S.segmente.map(s => s[0]));
});

test("Beispielnetz: Diagonalen kreuzen keine anderen Straßen", () => {
  const S = M.strassennetz(zufall(2)).segmente;
  let kreuz = 0;
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const x = Geo.segmentSchnitt(S[i][0], S[i][1], S[j][0], S[j][1]);
    if (x && x.t > 1e-6 && x.t < 1 - 1e-6 && x.u > 1e-6 && x.u < 1 - 1e-6) kreuz++;
  }
  assert.equal(kreuz, 0);
});

test("Klick setzt und entfernt Disruptoren und startet die Rückkopplung neu; Parameteränderung behält sie", () => {
  const { z, p } = lauf({}, 2);
  assert.equal(z.disruptoren.length, 2);
  const q = [z.b * 0.5, z.h * 0.5];
  assert.equal(M.schalteDisruptor(z, p, q, 30), true);
  assert.equal(z.disruptoren.length, 3); assert.equal(z.t, 0); assert.equal(z.dSeg.length, 3);
  assert.equal(z.gew[0][z.dSeg[2]], p.d);
  assert.equal(M.schalteDisruptor(z, p, [q[0] + 5, q[1]], 30), false);
  assert.equal(z.disruptoren.length, 2);
  M.schritt(z, p); p.radius = "rn"; M.aendere(z, p, "radius");
  assert.equal(z.iter, 0); assert.equal(z.disruptoren.length, 2);
});

test("„update destinations“ wirkt nur auf die Betweenness (Closeness nach Gl. 4 gewichtet nur die Ziele)", () => {
  const c1 = lauf({ modus: "beide" }, 2).z, c2 = lauf({ modus: "ziele" }, 2).z;
  assert.deepEqual(Array.from(c1.mpc[1]), Array.from(c2.mpc[1]));
  const b1 = lauf({ mass: "betweenness", modus: "beide" }, 2).z, b2 = lauf({ mass: "betweenness", modus: "ziele" }, 2).z;
  assert.notDeepEqual(Array.from(b1.mpc[1]), Array.from(b2.mpc[1]));
});

// ---------------------------------------------------------------- erwartetes Verhalten (Paper, Experimente E.1, E.2, Ne)
test("E.1: gleich belastet und global (Rn) gilt der Multiplikatoreffekt (Me hoch), bei R600-Betweenness nicht", () => {
  const cn = lauf({ radius: "rn" }, 29, 1, true).z, b6 = lauf({ mass: "betweenness" }, 29, 1, true).z;
  const meCn = M.kennwerte(cn).me, meB6 = M.kennwerte(b6).me;
  assert.ok(meCn > 0.9, "Closeness Rn: Me = " + meCn);
  assert.ok(meB6 < 0.5 && meB6 < meCn, "Betweenness R600: Me = " + meB6);
  // „the winner takes it all“: die Nutzungen ziehen sich auf wenige Segmente zusammen
  assert.ok(M.kennwerte(b6).top10 > 0.5);
  // Gleichgewicht nach 29 Iterationen: kaum noch Systemänderung
  assert.ok(M.kennwerte(cn).ch < 0.01 && M.kennwerte(b6).ch < 0.05);
});

test("E.2 und Ne: temporäre Störung wird ausgeglichen (global Closeness: Ne hoch), dauerhafte bleibt", () => {
  const t = lauf({ radius: "rn" }).z, d = lauf({ radius: "rn", stoerung: "dauerhaft" }).z;
  const k0 = M.kennwerte(t, 0), kt = M.kennwerte(t), kd = M.kennwerte(d);
  assert.ok(kt.disruptorAnteil < 0.1 * k0.disruptorAnteil, "Anteil an Disruptoren " + k0.disruptorAnteil + " → " + kt.disruptorAnteil);
  assert.ok(kt.ne > 0.9, "Ne = " + kt.ne);
  assert.ok(kt.me < kt.ne, "Me im gestörten Netz kleiner als Ne");
  nah(kd.disruptorAnteil, d.dSeg.length * 300 / M.summe(d.gew[0]), 1e-9);
});
