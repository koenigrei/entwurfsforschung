// Tests der Flächenbausteine (node --test im Ordner katalog/_gemeinsam) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const F = require("../flaechen.js");
const Geo = require("../geo.js");
const nahe = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} ≉ ${b}`);
const Q = (x, y) => [[[x, y], [x + 10, y]], [[x + 10, y], [x + 10, y + 10]], [[x + 10, y + 10], [x, y + 10]], [[x, y + 10], [x, y]]];

test("teileAnSchnitten: Kreuzung und T-Stoß werden geteilt, Parallelen und knapp daneben nicht", () => {
  assert.equal(F.teileAnSchnitten([[[0, 0], [10, 0]], [[5, -5], [5, 5]]]).length, 4);
  assert.equal(F.teileAnSchnitten([[[0, 0], [10, 0]], [[5, 0], [5, 5]]]).length, 3);
  assert.equal(F.teileAnSchnitten([[[0, 0], [10, 0]], [[0, 1], [10, 1]]]).length, 2);
  assert.equal(F.teileAnSchnitten([[[0, 0], [10, 0]], [[5, 0.2], [5, 5]]]).length, 2);
  // Teilpunkte nachgerechnet: Kreuzung bei (5, 0) und (5, 0) auf der senkrechten Strecke
  const T = F.teileAnSchnitten([[[0, 0], [10, 0]], [[5, -5], [5, 5]]]);
  assert.deepEqual(T, [[[0, 0], [5, 0]], [[5, 0], [10, 0]], [[5, -5], [5, 0]], [[5, 0], [5, 5]]]);
  assert.deepEqual(F.teileAnSchnitten([]), []);
});

test("verlaengere: nur offene Enden wachsen um die Toleranz; Fangabstand der Knoten wählbar", () => {
  assert.deepEqual(F.verlaengere([[[0, 0], [10, 0]], [[10, 0], [10, 10]]], 2), [[[-2, 0], [10, 0]], [[10, 0], [10, 12]]]);
  // Endpunkte 0,005 m auseinander: bei exakt = 0,01 ein Knoten (kein offenes Ende), bei 0,001 zwei offene Enden
  const S = [[[0, 0], [10, 0]], [[10.005, 0], [10.005, 10]]];
  assert.deepEqual(F.verlaengere(S, 1)[0][1], [10, 0]);
  assert.deepEqual(F.verlaengere(S, 1, 0.001)[0][1], [11, 0]);
});

test("flaechenAusLinien: kleinste Zyklen, Außenrand, Sackgassen und Brücken entfallen, Werte je Netzkante", () => {
  let A = F.flaechenAusLinien(Geo.netz(Q(0, 0).concat([[[0, 0], [10, 10]]])));
  assert.equal(A.length, 2); A.forEach(f => { nahe(Geo.flaeche(f.poly), 50); assert.equal(f.kanten.length, 3); assert.ok(Geo.flaecheS(f.poly) > 0); });
  A = F.flaechenAusLinien(Geo.netz(F.teileAnSchnitten([].concat(Q(0, 0), Q(10, 0), Q(0, 10), Q(10, 10), [[[20, 20], [30, 30]]]))));
  assert.equal(A.length, 4); A.forEach(f => nahe(Geo.flaeche(f.poly), 100));
  const N2 = Geo.netz(F.teileAnSchnitten(Q(0, 0).concat(Q(30, 0), [[[10, 5], [30, 5]]])));
  A = F.flaechenAusLinien(N2);
  assert.equal(A.length, 2); A.forEach(f => { nahe(Geo.flaeche(f.poly), 100); assert.equal(f.poly.length, 5); });
  A.forEach(f => f.kanten.forEach((k, i) => { const e = N2.kanten[k], a = f.poly[i], b = f.poly[(i + 1) % f.poly.length];
    const ka = N2.knoten[e.a], kb = N2.knoten[e.b];
    assert.ok((Geo.abstand(a, ka) < 1e-9 && Geo.abstand(b, kb) < 1e-9) || (Geo.abstand(a, kb) < 1e-9 && Geo.abstand(b, ka) < 1e-9)); }));
  // nur eine Linie oder ein Baum: keine Fläche
  assert.equal(F.flaechenAusLinien(Geo.netz([[[0, 0], [10, 0]], [[10, 0], [10, 10]]])).length, 0);
  // zwei Quadrate nebeneinander, Netz von Hand (gebaeude-generierung)
  const N = { knoten: [[0, 0], [100, 0], [200, 0], [200, 100], [100, 100], [0, 100]], kanten: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 4]].map(([a, b]) => ({ a, b })) };
  const B = F.flaechenAusLinien(N);
  assert.equal(B.length, 2); B.forEach(f => nahe(Geo.flaeche(f.poly), 10000));
});

test("versetzeKanten (nachgerechnet): gleich, je Kante verschieden, nach außen, Stufe, verschwindende Kante", () => {
  const R0 = [[0, 0], [10, 0], [10, 10], [0, 10]];
  nahe(Geo.flaeche(F.versetzeKanten(R0, [-1, -1, -1, -1])), 64);
  nahe(Geo.flaeche(F.versetzeKanten(R0, [-1, -2, -1, -2])), 48);
  nahe(Geo.flaeche(F.versetzeKanten(R0, [1, 1, 1, 1])), 144);
  assert.deepEqual(F.versetzeKanten(R0, [-1, -2, -3, -4]).map(p => p.map(v => Math.round(v * 1e6) / 1e6)), [[4, 1], [8, 1], [8, 7], [4, 7]]);
  const S = F.versetzeKanten([[0, 0], [5, 0], [10, 0], [10, 10], [0, 10]], [-1, -3, -1, -1, -1]);
  nahe(Geo.flaeche(S), 56); assert.equal(S.length, 6);
  const R = F.versetzeKanten([[0, 0], [20, 0], [20, 9], [19, 10], [0, 10]], [-3, -3, -3, -3, -3]);
  assert.equal(R.length, 4); nahe(Geo.flaeche(R), 56);
  assert.equal(F.versetzeKanten([[0, 0], [10, 0], [10, 4], [0, 4]], [-3, -3, -3, -3]), null);
  nahe(Geo.flaeche(F.versetzeKanten([[0, 0], [100, 0], [100, 100], [0, 100]], [-10, -10, -10, -10])), 6400);
});

test("einfach, liegtIn, randAbstand", () => {
  assert.equal(F.einfach([[0, 0], [10, 0], [10, 10], [0, 10]]), true);
  assert.equal(F.einfach([[0, 0], [10, 10], [10, 0], [0, 10]]), false);            // Schleife (Achterfigur)
  const P = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(F.liegtIn([[1, 1], [9, 1], [5, 9]], P), true);
  assert.equal(F.liegtIn([[1, 1], [10.04, 5]], P), true);                           // 4 cm außen: innerhalb der Toleranz 5 cm
  assert.equal(F.liegtIn([[1, 1], [10.04, 5]], P, 0.01), false);
  nahe(F.randAbstand([3, 5], P), 3); nahe(F.randAbstand([15, 5], P), 5); nahe(F.randAbstand([10, 4], P), 0);
});

test("konvexe Polygonoperationen: Halbebenen, beschneiden, abziehen, schneiden (nachgerechnet)", () => {
  const A = [[0, 0], [10, 0], [10, 10], [0, 10]], B = [[2, 2], [6, 2], [6, 6], [2, 6]];
  const H = F.halbebenen(B);
  assert.equal(H.length, 4); assert.deepEqual(H[0], { p: [2, 2], n: [0, -1] });       // Außennormale der Unterkante
  assert.deepEqual(F.halbebenen(B.slice().reverse())[0].n, [0, -1]);                  // Umlaufsinn egal: wird umgedreht
  assert.deepEqual(F.halbebenen(B, false)[1], { p: [6, 2], n: [4, -0] });              // ungenormt: gedrehte Kante
  const teile = F.ohne(A, H);
  nahe(teile.reduce((s, q) => s + Geo.flaeche(q), 0), 84); assert.equal(teile.length, 4);
  nahe(Geo.flaeche(F.schnitt(A, B)), 16);
  nahe(Geo.flaeche(F.clip(A, [F.halbebene([3, 0], [1, 0])])), 30);                   // x ≤ 3
  assert.deepEqual(F.clip(A, [F.halbebene([3, 0], [1, 0]), F.halbebene([5, 0], [-1, 0])]), []);   // leer
  assert.deepEqual(F.clip(A, [F.halbebene([0.001, 0], [1, 0])], 0.05), []);          // Rest unter der Mindestfläche
  assert.equal(F.clip(A, [F.halbebene([0.001, 0], [1, 0])]).length, 4);               // ohne Mindestfläche bleibt er
  const g = F.gegen(F.halbebene([3, 0], [1, 0])); assert.deepEqual(g.n, [-1, -0]);
  // ohne mit Mindestfläche: dünne Reste fallen weg
  const C = [[-1, -1], [10.01, -1], [10.01, 11], [-1, 11]];
  assert.equal(F.ohne(A, F.halbebenen(C), 0.05).length, 0);
  assert.ok(F.ohne(A, F.halbebenen([[-1, -1], [9, -1], [9, 11], [-1, 11]]), 0.05).length === 1);
});
