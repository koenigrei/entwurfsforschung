// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const mit = o => Object.assign({}, P, o);
const nahe = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);

/** Anzahl echter Kreuzungen (nicht an gemeinsamen Endpunkten) zwischen Kanten eines Netzes */
function kreuzungen(N) {
  let c = 0;
  for (let i = 0; i < N.kanten.length; i++) for (let j = i + 1; j < N.kanten.length; j++) {
    const e = N.kanten[i], f = N.kanten[j];
    if (e.a === f.a || e.a === f.b || e.b === f.a || e.b === f.b) continue;
    const s = Geo.segmentSchnitt(N.knoten[e.a], N.knoten[e.b], N.knoten[f.a], N.knoten[f.b]);
    if (s && s.t > 1e-6 && s.t < 1 - 1e-6 && s.u > 1e-6 && s.u < 1 - 1e-6) c++;
  }
  return c;
}

test("erzeuge: t = 0, ebenes Wegenetz, mindestens 15 Plots, noch nichts versetzt", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.k, 0);
  assert.ok(z.plots.length >= 15, "Plots: " + z.plots.length);
  assert.equal(kreuzungen(z.N), 0);
  assert.ok(z.plots.every(Q => Geo.flaecheS(Q.poly) > 0 && Q.kanten.length === Q.poly.length));
});

test("Network to Segments: Umwandlungswinkel und ConvertCurves", () => {
  const L = [[0, 0], [5, 0], [10, 0], [10, 5], [10, 10]];                   // gerade, dann 90°-Knick
  assert.deepEqual(M.vereinfache(L, 0.517), [[0, 0], [10, 0], [10, 10]]);
  assert.deepEqual(M.vereinfache(L, 2), [[0, 0], [10, 10]]);              // Knick kleiner als der Winkel → eine Strecke
  assert.deepEqual(M.vereinfache(L, 0.5, false), [[0, 0], [10, 10]]);     // nicht umwandeln: Sehne
  const B = M.bezier([0, 0], [50, 30], [100, 0]);                         // Bogen dreht insgesamt 2·atan(0,6) ≈ 1,08 rad
  assert.equal(M.vereinfache(B, 0.517).length, 3);
  assert.equal(M.vereinfache(B, 0).length, B.length);
});

test("Split: Kreuzung und T-Stoß werden geteilt, Parallelen nicht", () => {
  assert.equal(M.teileAnSchnitten([[[0, 0], [10, 0]], [[5, -5], [5, 5]]]).length, 4);
  assert.equal(M.teileAnSchnitten([[[0, 0], [10, 0]], [[5, 0], [5, 5]]]).length, 3);
  assert.equal(M.teileAnSchnitten([[[0, 0], [10, 0]], [[0, 1], [10, 1]]]).length, 2);
  assert.equal(M.teileAnSchnitten([[[0, 0], [10, 0]], [[5, 0.2], [5, 5]]]).length, 2);  // knapp daneben: kein Stoß
});

test("Network Smooth: Knoten im Fangabstand werden eins", () => {
  const S = [[[0, 0], [20, 0]], [[25, 0], [45, 0]]];
  assert.equal(M.glaette(S, 2).knoten.length, 4);
  assert.equal(M.glaette(S, 10).knoten.length, 3);
  assert.equal(M.glaette(S, 0).knoten.length, 4);                        // 0 wirkt nicht
});

test("Betweenness (nachgerechnet): Kette mit Abzweig, Start- und Zielsegment zählen nicht", () => {
  const N = Geo.netz([[[0, 0], [10, 0]], [[10, 0], [20, 0]], [[20, 0], [30, 0]], [[10, 0], [10, 10]]]);
  // nur Segment 1 liegt dazwischen: auf 0→2, 2→0, 3→2, 2→3
  assert.deepEqual([...M.betweenness(N)], [0, 4, 0, 0]);
});

test("Polygons from lines: kleinste Zyklen, Außenrand, Sackgassen und Brücken entfallen", () => {
  const Q = (x, y) => [[[x, y], [x + 10, y]], [[x + 10, y], [x + 10, y + 10]], [[x + 10, y + 10], [x, y + 10]], [[x, y + 10], [x, y]]];
  // Quadrat mit Diagonale → zwei Dreiecke
  let F = M.flaechenAusLinien(Geo.netz(Q(0, 0).concat([[[0, 0], [10, 10]]])));
  assert.equal(F.length, 2); F.forEach(f => { nahe(Geo.flaeche(f.poly), 50); assert.equal(f.kanten.length, 3); });
  // 2 × 2 Quadrate (gemeinsame Kanten) und ein Stichweg
  F = M.flaechenAusLinien(Geo.netz(M.teileAnSchnitten([].concat(Q(0, 0), Q(10, 0), Q(0, 10), Q(10, 10), [[[20, 20], [30, 30]]]))));
  assert.equal(F.length, 4); F.forEach(f => nahe(Geo.flaeche(f.poly), 100));
  // zwei Quadrate, durch eine Brücke verbunden → zwei Flächen, die Brücke gehört zu keiner
  const N2 = Geo.netz(M.teileAnSchnitten(Q(0, 0).concat(Q(30, 0), [[[10, 5], [30, 5]]])));
  F = M.flaechenAusLinien(N2);
  assert.equal(F.length, 2); F.forEach(f => { nahe(Geo.flaeche(f.poly), 100); assert.ok(f.poly.length === 5); });
  // Werte gehören zu den Netzkanten (Synchronized values): jede Kante eines Plots liegt auf ihrer Netzkante
  F.forEach(f => f.kanten.forEach((k, i) => { const e = N2.kanten[k], a = f.poly[i], b = f.poly[(i + 1) % f.poly.length];
    const ka = N2.knoten[e.a], kb = N2.knoten[e.b];
    assert.ok((Geo.abstand(a, ka) < 1e-9 && Geo.abstand(b, kb) < 1e-9) || (Geo.abstand(a, kb) < 1e-9 && Geo.abstand(b, ka) < 1e-9)); }));
});

test("Custom offset (nachgerechnet): gleich, je Kante verschieden, nach außen, Stufe", () => {
  const Q = [[0, 0], [10, 0], [10, 10], [0, 10]];
  nahe(Geo.flaeche(M.versetzeKanten(Q, [-1, -1, -1, -1])), 64);
  nahe(Geo.flaeche(M.versetzeKanten(Q, [-1, -2, -1, -2])), 6 * 8);
  nahe(Geo.flaeche(M.versetzeKanten(Q, [1, 1, 1, 1])), 144);
  const R = M.versetzeKanten(Q, [-1, -2, -3, -4]);                      // unten 1, rechts 2, oben 3, links 4
  assert.deepEqual(R.map(p => p.map(v => Math.round(v * 1e6) / 1e6)), [[4, 1], [8, 1], [8, 7], [4, 7]]);
  // gerade Kante aus zwei Plotkanten mit verschiedenen Werten → Stufe
  const S = M.versetzeKanten([[0, 0], [5, 0], [10, 0], [10, 10], [0, 10]], [-1, -3, -1, -1, -1]);
  nahe(Geo.flaeche(S), 64 - 8); assert.equal(S.length, 6);
});

test("Custom offset: kurze Kante verschwindet, zu großer Versatz lässt den Plot verschwinden", () => {
  const F = [[0, 0], [20, 0], [20, 9], [19, 10], [0, 10]];                 // Fase 1 m an einer Ecke
  const R = M.versetzeKanten(F, [-3, -3, -3, -3, -3]);
  assert.equal(R.length, 4); nahe(Geo.flaeche(R), 14 * 4);
  assert.equal(M.versetzeKanten([[0, 0], [10, 0], [10, 4], [0, 4]], [-3, -3, -3, -3]), null);
});

test("Remap: Betweenness → Offset Min … Max, Abstände nach innen", () => {
  nahe(M.remap(5, 0, 10, -7, -18), -12.5);
  nahe(M.remap(3, 3, 3, -7, -18), -7);
  assert.deepEqual(M.zielbereich(mit({})), [7, 18]);
  assert.deepEqual(M.zielbereich(mit({ versatzMin: 2, versatzMax: 9 })), [2, 9]);
});

test("Kein negativer Versatz: Werte unter 0 (auch aus der Adresse) werden 0, Plots wachsen nie", () => {
  assert.deepEqual(M.zielbereich(mit({ versatzMin: -5, versatzMax: "-12" })), [0, 0]);
  assert.deepEqual(M.zielbereich(mit({ versatzMin: "abc", versatzMax: "4" })), [0, 4]);
  assert.equal(M.abstandM(-0.1), 0); assert.equal(M.abstandM(NaN), 0); assert.equal(M.abstandM(3), 3);
  assert.equal(M.STANDARD.negativ, undefined);
  for (const o of [{ versatzMin: -10, versatzMax: -20 }, { versatzMin: -3, versatzMax: 12 }, { negativ: false }]) {
    const p = mit(o), z = M.erzeuge(p, zufall(3)); M.rechneAlles(z, p);
    z.werte.forEach(w => w.forEach(d => assert.ok(d >= 0, "Versatz " + d)));
    z.plots.forEach((Q, i) => { if (z.erg[i]) assert.ok(Geo.flaeche(z.erg[i]) <= Geo.flaeche(Q.poly) + 1e-6); });
  }
  const Q = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.ok(Geo.flaeche(M.versetzeNachInnen(Q, [-1, -1, -1, -1])) === 100);          // negativer Wert → 0, nicht nach außen
});

test("Schritt: ein Plot je Schritt, danach Ende; t läuft weiter", () => {
  const z = M.erzeuge(P, zufall(2)), n = z.plots.length;
  M.schritt(z, P); assert.equal(z.k, 1); assert.equal(z.t, 1); assert.ok(z.erg[0]);
  for (let i = 0; i < n + 3; i++) M.schritt(z, P);
  assert.equal(z.k, n); assert.ok(M.fertig(z)); assert.equal(z.t, n + 4);
  M.leere(z); assert.equal(z.t, 0); assert.equal(z.k, 0);
});

test("Wiederholbarkeit: gleiche Saat gleiche Plots, andere Saat andere", () => {
  const a = M.erzeuge(P, zufall(5)), b = M.erzeuge(P, zufall(5)), c = M.erzeuge(P, zufall(6));
  assert.deepEqual(a.plots.map(q => q.poly), b.plots.map(q => q.poly));
  assert.notDeepEqual(a.plots.map(q => q.poly), c.plots.map(q => q.poly));
});

test("Katalog: Werte der Netzanalyse bestimmen den Versatz – wichtige Wege rücken weiter ab", () => {
  for (const s of [1, 3, 7]) {
    const z = M.erzeuge(P, zufall(s)); M.rechneAlles(z, P);
    const pkt = [];
    z.plots.forEach((Q, i) => { const R = z.erg[i]; if (!R) return;
      Q.poly.forEach((a, j) => {
        const b = Q.poly[(j + 1) % Q.poly.length]; if (Geo.abstand(a, b) < 30) return;   // kurze Kanten: Ecken stören die Messung
        const m = Geo.lerp(a, b, 0.5); let d = Infinity;
        for (let r = 0; r < R.length; r++) d = Math.min(d, Geo.abstandSegment(m, R[r], R[(r + 1) % R.length]).d);
        pkt.push([z.bc[Q.kanten[j]], d, z.werte[i][j]]);
      }); });
    pkt.sort((x, y) => x[0] - y[0]);
    const q = Math.floor(pkt.length / 4), mittel = L => L.reduce((s, x) => s + x[1], 0) / L.length;
    assert.ok(mittel(pkt.slice(-q)) > mittel(pkt.slice(0, q)) + 3, `Saat ${s}: wichtige Wege nicht breiter`);
    // gemessener Abstand der Kantenmitte = eigener Versatz (gerade, lange Kanten)
    const genau = pkt.filter(x => Math.abs(x[1] - x[2]) < 0.05).length / pkt.length;
    assert.ok(genau > 0.7, `Saat ${s}: nur ${genau} der Kanten exakt versetzt`);
    assert.ok(Math.min(...pkt.map(x => x[2])) >= 7 - 1e-9 && Math.max(...pkt.map(x => x[2])) <= 18 + 1e-9);
  }
});

test("aendere: Versatzwerte und Richtung wirken auf schon versetzte Plots", () => {
  const z = M.erzeuge(P, zufall(1)); M.rechneAlles(z, P);
  const vor = M.bilanz(z).nach;
  const p2 = mit({ versatzMax: 30 }); M.aendere(z, p2, "versatzMax");
  assert.ok(M.bilanz(z).nach < vor);
  const p3 = mit({ versatzMin: 0, versatzMax: 0 }); M.aendere(z, p3, "versatzMax");
  const b = M.bilanz(z); assert.ok(Math.abs(b.nach - b.vor) < 1e-6);
  const p4 = mit({ fang: 40 }); M.aendere(z, p4, "fang");
  assert.ok(M.fertig(z)); assert.equal(kreuzungen(z.N), 0);
});
