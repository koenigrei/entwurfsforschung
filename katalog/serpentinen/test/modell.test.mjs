// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const mit = o => Object.assign({}, P, o);
const nah = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

/** kleines künstliches Gelände: Höhe h(x, y) auf n × n Punkten über groesse Meter */
function gelaende(n, groesse, f) {
  const z = groesse / (n - 1), h = new Float64Array(n * n);
  let mx = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { h[j * n + i] = f(i * z, j * z); mx = Math.max(mx, h[j * n + i]); }
  return { n, groesse, zelle: z, h, min: 0, max: mx };
}

test("erzeuge: t = 0, Gitter 51 × 51, Suche noch ohne Weg", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.N.m, 51); assert.equal(z.weg, null); assert.equal(z.Q.besucht, 0);
});

test("C#-Skript: 8er-Nachbarschaft – (m−1)·m·2 gerade + 2·(m−1)² diagonale Kanten", () => {
  const G = gelaende(5, 40, () => 0), N = M.gitter(G, 4), E = M.kanten(N);
  assert.equal(E.n, 2 * 4 * 5 + 2 * 16);
  const NB = M.nachbarn(25, E), grad = k => NB.start[k + 1] - NB.start[k];
  assert.equal(grad(0), 3); assert.equal(grad(12), 8); assert.equal(grad(2), 5);   // Ecke, Mitte, Rand
});

test("Steigungswinkel: Rampe 10 m auf 10 m waagerecht → 45°, Diagonale → atan(10/14,14)", () => {
  const G = gelaende(3, 20, x => x), N = M.gitter(G, 2), E = M.kanten(N);   // h = x: je Masche (10 m) +10 m
  const e = [...Array(E.n).keys()].find(k => E.a[k] === 0 && E.b[k] === 1);  // (0,0) → (1,0) in x-Richtung
  assert.ok(nah(E.alpha[e], Math.PI / 4)); assert.ok(nah(E.laenge[e], Math.hypot(10, 10)));
  const d = [...Array(E.n).keys()].find(k => E.a[k] === 0 && E.b[k] === 4);  // Diagonale (0,0) → (1,1)
  assert.ok(nah(E.alpha[d], Math.atan(10 / Math.hypot(10, 10))));
  const q = [...Array(E.n).keys()].find(k => E.a[k] === 0 && E.b[k] === 3);  // (0,0) → (0,1) quer zur Rampe: flach
  assert.ok(nah(E.alpha[q], 0));
});

test("Evaluate if(x>y, PI*0.5, x) und Remap auf 0…1", () => {
  assert.equal(M.steilheit(0.3, 0.2), Math.PI / 2); assert.equal(M.steilheit(0.1, 0.2), 0.1); assert.equal(M.steilheit(0.2, 0.2), 0.2);
  assert.deepEqual([...M.remap([2, 4, 6])], [0, 0.5, 1]); assert.deepEqual([...M.remap([3, 3])], [0, 0]);
});

test("Kosten = Remap(Steilheit)·(1 − w) + Remap(Länge)·w; Degree Steepness wird gerundet (Integer)", () => {
  const E = { n: 3, laenge: Float64Array.from([10, 20, 30]), alpha: Float64Array.from([0, 5, 30].map(g => g * Math.PI / 180)) };
  const k0 = M.kosten(E, mit({ grad: 10, gewicht: 0 }));
  assert.deepEqual([...k0.ueber], [0, 0, 1]);
  assert.ok(nah(k0.c[0], 0) && nah(k0.c[1], (5 * Math.PI / 180) / (Math.PI / 2)) && nah(k0.c[2], 1));
  const k1 = M.kosten(E, mit({ grad: 10, gewicht: 1 }));
  assert.deepEqual([...k1.c], [0, 0.5, 1]);
  const kh = M.kosten(E, mit({ grad: 10, gewicht: 0.25 }));
  assert.ok(nah(kh.c[1], 0.75 * k0.c[1] + 0.25 * 0.5));
  assert.deepEqual([...M.kosten(E, mit({ grad: 4.6 })).ueber], [0, 0, 1]);   // 4,6 → 5°: 5° ist nicht steiler als 5°
});

test("Dijkstra schrittweise: k Knoten je Aufruf, gleicher Weg wie in einem Zug", () => {
  const z = M.erzeuge(P, zufall(2)), p = mit({ expansionen: 7 });
  M.schritt(z, p); assert.equal(z.Q.besucht, 7); assert.equal(z.t, 1);
  let n = 0; while (!M.fertig(z) && n++ < 10000) M.schritt(z, p);
  const kn = z.Q.knoten.slice(), kosten = z.Q.dist[z.Q.g];
  M.loese(z, p); assert.deepEqual(z.Q.knoten, kn); assert.ok(nah(z.Q.dist[z.Q.g], kosten));
  assert.equal(kn[0], z.Q.s); assert.equal(kn[kn.length - 1], z.Q.g);
});

test("Smooth Polyline: Strength 1 setzt innere Punkte auf die Mitte der Nachbarn, Enden bleiben", () => {
  const Q = M.glaette([[0, 0, 0], [10, 10, 4], [20, 0, 0]], 1, 1);
  assert.deepEqual(Q, [[0, 0, 0], [10, 0, 0], [20, 0, 0]]);
  const R = M.glaette([[0, 0], [1, 2], [2, 0], [3, 2]], 0.5, 1);
  assert.deepEqual(R[1], [1, 1]);   // [1 + 0,5·(1 − 1), 2 + 0,5·(0 − 2)]
});

test("Profil: Länge, Höhenunterschied und größte Steigung", () => {
  const pr = M.profil([[0, 0, 0], [100, 0, 10], [200, 0, 10]]);
  assert.ok(nah(pr.maxSteigung, 0.1)); assert.ok(nah(pr.hoehe, 10)); assert.ok(nah(pr.laenge, Math.hypot(100, 10) + 100)); assert.ok(nah(pr.mittel, 0.05));
});

test("Katalog: höhere Schwelle (Degree Steepness) → Weg ohne zu steile Kanten, länger als die Luftlinie (Serpentine)", () => {
  const z = M.erzeuge(P, zufall(1));
  M.aendere(z, mit({ grad: 12 }), "grad");
  assert.equal(z.ueber, 0);
  assert.ok(z.profGitter.maxSteigung <= Math.tan(12 * Math.PI / 180) + 1e-9);
  const luft = Math.hypot(z.ziel[0] - z.start[0], z.ziel[1] - z.start[1]);
  assert.ok(z.prof.laenge > 1.2 * luft, `Länge ${z.prof.laenge} vs. Luftlinie ${luft}`);
  M.aendere(z, mit({ grad: 1 }), "grad");                 // fast alle Kanten „zu steil“: möglichst wenige Kanten, kürzer
  assert.ok(z.ueber > 0); assert.ok(z.kantenWeg < 60);
});

test("Gewicht 1 (nur Länge): Weg minimiert die Summe der auf 0…1 abgebildeten Kantenlängen (kürzeste Kante kostet 0)", () => {
  const z = M.erzeuge(P, zufall(3)), summe = (kn, c) => { let s = 0; for (let i = 1; i < kn.length; i++) { let best = Infinity; for (let r = z.NB.start[kn[i - 1]]; r < z.NB.start[kn[i - 1] + 1]; r++) if (z.NB.nb[r] === kn[i]) best = Math.min(best, c[z.NB.ke[r]]); s += best; } return s; };
  const p1 = mit({ grad: 12, gewicht: 1 }), c1 = M.kosten(z.E, p1).c;
  let emin = 0; for (let e = 1; e < z.E.n; e++) if (z.E.laenge[e] < z.E.laenge[emin]) emin = e;
  assert.equal(c1[emin], 0);
  M.aendere(z, mit({ grad: 12, gewicht: 0 }), "gewicht"); const w0 = z.Q.knoten.slice();
  M.aendere(z, p1, "gewicht"); const w1 = z.Q.knoten.slice();
  assert.ok(summe(w1, c1) <= summe(w0, c1) + 1e-9);
  assert.ok(nah(summe(w1, c1), z.Q.dist[z.Q.g], 1e-9));
});

test("Ziehen versetzt den näheren Punkt und rechnet sofort; Teilung ändert das Gitter", () => {
  const z = M.erzeuge(P, zufall(4)), alt = z.ziel.slice();
  M.ziehe(z, P, [z.start[0] + 30, z.start[1] + 5], "unten");
  assert.deepEqual(z.ziel, alt); assert.ok(M.fertig(z));
  M.ziehe(z, P, [-50, 2000], "ziehen"); assert.deepEqual(z.start, [0, 1000]);   // in den Rand geklemmt
  M.aendere(z, mit({ teilung: 20 }), "teilung"); assert.equal(z.N.m, 21); assert.ok(M.fertig(z));
  M.abspielen(z, P); assert.equal(z.t, 0); assert.equal(z.weg, null);
});

test("Grenzfälle: Start = Ziel, Teilung 2", () => {
  const z = M.erzeuge(mit({ teilung: 2 }), zufall(5));
  assert.equal(z.N.m, 3);
  z.ziel = z.start.slice(); M.loese(z, P);
  assert.deepEqual(z.Q.knoten, [z.Q.s]); assert.ok(z.prof.laenge >= 0);
});

test("Wiederholbarkeit: gleiche Saat → gleicher Weg, andere Saat → anderes Gelände", () => {
  const a = M.erzeuge(P, zufall(7)), b = M.erzeuge(P, zufall(7)), c = M.erzeuge(P, zufall(8));
  M.loese(a, P); M.loese(b, P); M.loese(c, P);
  assert.deepEqual(a.weg, b.weg); assert.notDeepEqual(a.G.h, c.G.h);
});
