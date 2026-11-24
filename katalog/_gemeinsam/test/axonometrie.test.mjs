// Tests der Axonometrie: Projektion, Malerverfahren, sichtbare Wände, Ziehen (node --test im Ordner katalog/_gemeinsam) · CC BY 4.0
// Gezeichnet wird im Browser; hier läuft prisma gegen eine Zeichenfläche, die nur die Aufrufe mitschreibt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Axo = require("../axonometrie.js");
const nah = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const Q = [[0, 0], [10, 0], [10, 10], [0, 10]];         // positive Fläche (Geo.flaecheS > 0)

test("ansicht: Plan bei Neigung 90°, Höhe hebt nach oben, Drehung um die Mitte", () => {
  const A = Axo.ansicht({ drehung: 0, neigung: 90, mitte: [5, 5], k: 2, ox: 100, oy: 50 });
  assert.deepEqual(A.p(5, 5), [100, 50]);
  const q = A.p(10, 0); nah(q[0], 110); nah(q[1], 40);
  nah(A.p(5, 5, 7)[1], 50);                                   // senkrecht von oben: Höhe unsichtbar
  const B = Axo.ansicht({ drehung: 0, neigung: 0, mitte: [0, 0], k: 1, ox: 0, oy: 0 });
  nah(B.p(0, 0, 3)[1], -3);                                   // waagrechter Blick: Höhe geht nach oben (y kleiner)
  const C = Axo.ansicht({ drehung: 90, neigung: 90, mitte: [0, 0], k: 1, ox: 0, oy: 0 });
  const c = C.p(1, 0); nah(c[0], 0); nah(c[1], 1);            // 90° gedreht: Osten zeigt nach unten
  // Bogenmaß statt Grad und Bildhöhe mz
  const D = Axo.ansicht({ th: Math.PI / 2, ph: Math.PI / 2, mitte: [0, 0], k: 1, ox: 0, oy: 0, mz: 10 });
  nah(D.p(1, 0)[1], 1);
  const E = Axo.ansicht({ drehung: 30, neigung: 40, mitte: [3, 4], mz: 10, k: 2, ox: 7, oy: 9 });
  nah(E.p(3, 4, 10)[0], 7); nah(E.p(3, 4, 10)[1], 9);
});

test("ansicht: Nähe v und Tiefe passen zusammen (näher = kleinere Tiefe)", () => {
  const A = Axo.ansicht({ drehung: 25, neigung: 42, mitte: [0, 0], k: 1, ox: 0, oy: 0 });
  assert.ok(A.v(0, 10) > A.v(0, -10));                       // Süden (y groß) ist bei kleiner Drehung vorn
  assert.ok(A.tiefe(0, 10, 0) < A.tiefe(0, -10, 0));
  assert.ok(A.tiefe(0, 0, 20) < A.tiefe(0, 0, 0));           // höher = näher am Betrachter (von oben)
  assert.equal(A.vorn(0, 1), true); assert.equal(A.vorn(0, -1), false);
  nah(A.blick(1, 0), Math.sin(25 * Math.PI / 180));
});

test("schraeg: Bildpunkt und Umkehrung", () => {
  const S = Axo.schraeg({ ox: 8, oy: 70, k: 0.6, sch: 0.35, tiefe: 300 });
  const p = S.p(100, 200, 0), r = S.rueck(p[0], p[1]);
  nah(r[0], 100); nah(r[1], 200);
  assert.deepEqual(S.pq([100, 200], 5), S.p(100, 200, 5));
  nah(S.p(100, 200, 5)[1], p[1] - 5);
  assert.equal(S.vorn(0, 1), true); assert.equal(S.vorn(1, 0), false);
});

test("maler: stabil, aufsteigend oder absteigend", () => {
  const L = [{ n: "a", t: 2 }, { n: "b", t: 1 }, { n: "c", t: 2 }, { n: "d", t: 0 }];
  assert.deepEqual(Axo.maler(L, x => x.t).map(x => x.n), ["d", "b", "a", "c"]);
  assert.deepEqual(Axo.maler(L, x => x.t, true).map(x => x.n), ["a", "c", "b", "d"]);
  assert.deepEqual(L.map(x => x.n), ["a", "b", "c", "d"]);    // Eingabe bleibt
});

test("waende: von Süden gesehen ist nur die Südwand sichtbar; Umlaufsinn, Hofring, Schwerpunkt, Schwelle", () => {
  const A = Axo.ansicht({ drehung: 0, neigung: 40, mitte: [5, 5], k: 1, ox: 0, oy: 0 });
  // y nach unten: die Kante (10, 10) → (0, 10) liegt im Süden; positive Fläche → Außennormale [0, 1]
  const W = Axo.waende(Q, A);
  assert.equal(W.length, 1); assert.equal(W[0].i, 2); assert.deepEqual(W[0].n, [0, 1]); nah(W[0].vb, 1);
  assert.equal(Axo.waende(Q.slice().reverse(), A, { normale: "auto" }).length, 1);
  assert.equal(Axo.waende(Q.slice().reverse(), A, { normale: "auto" })[0].n[1], 1);
  assert.equal(Axo.waende(Q, A, { normale: "innen" })[0].i, 0);                    // Hof: die Nordkante zeigt nach innen zum Betrachter
  assert.deepEqual(Axo.waende(Q, A, { normale: "schwerpunkt" })[0].n.map(v => v + 0), [0, 10]);   // ungenormt, vom Schwerpunkt weg
  assert.equal(Axo.waende(Q, A, { ohne: (a, b) => a[1] === 10 && b[1] === 10 }).length, 0);
  const B = Axo.ansicht({ drehung: 90, neigung: 40, mitte: [5, 5], k: 1, ox: 0, oy: 0 });
  assert.equal(Axo.waende(Q, B).length, 1);                                         // genau seitlich: Schwelle 1e-9
  assert.equal(Axo.waende(Q, B, { schwelle: -2 }).length, 4);
  assert.equal(Axo.waende([[0, 0], [1e-7, 0], [10, 10]], A, { kurz: 1e-6, schwelle: -2 }).length, 2);
});

/** Zeichenfläche, die die Aufrufe mitschreibt */
function protokoll() {
  const L = [];
  return { L, set fillStyle(v) { L.push(["fill=", v]); }, set strokeStyle(v) { L.push(["stroke=", v]); }, set lineWidth(v) { L.push(["lw=", v]); },
    set lineJoin(v) { L.push(["join=", v]); }, beginPath() { L.push(["begin"]); }, moveTo(x, y) { L.push(["m", x, y]); }, lineTo(x, y) { L.push(["l", x, y]); },
    closePath() { L.push(["close"]); }, fill(r) { L.push(["fill", r]); }, stroke() { L.push(["stroke"]); } };
}

test("prisma: sichtbare Wände (Farbe je Wand), dann das Dach; Hofring, innere Kanten, Malerordnung der Wände", () => {
  const A = Axo.ansicht({ drehung: 30, neigung: 40, mitte: [5, 5], k: 1, ox: 0, oy: 0 });
  const ctx = protokoll(), farben = [];
  Axo.prisma(ctx, A, Q, { h1: 12, seite: w => { farben.push(w.i); return "w" + w.i; }, dach: "d", kante: "k", lw: 0.5, join: "round" });
  assert.deepEqual(farben, [1, 2]);                                                 // Ost- und Südwand
  const f = ctx.L.filter(x => x[0] === "fill=").map(x => x[1]);
  assert.deepEqual(f, ["w1", "w2", "d"]);
  assert.equal(ctx.L.filter(x => x[0] === "stroke").length, 3);
  assert.deepEqual(ctx.L[0], ["join=", "round"]);
  // Malerordnung: "nah" zeichnet die fernere Wand zuerst
  const reihe = [];
  Axo.prisma(protokoll(), A, Q, { h1: 1, sortiere: "nah", seite: w => { reihe.push(w.i); return "x"; } });
  const vMitte = i => { const a = Q[i], b = Q[(i + 1) % 4]; return A.v((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); };
  assert.ok(vMitte(reihe[0]) <= vMitte(reihe[1]));
  // Hofring: Wände des Hofs kommen dazu, Dach mit Loch
  const c2 = protokoll(), H = [[3, 3], [7, 3], [7, 7], [3, 7]];
  Axo.prisma(c2, A, Q, { h1: 5, loch: H, regel: "evenodd", seite: () => "w", dach: "d", kante: "k", lw: 1 });
  assert.equal(c2.L.filter(x => x[0] === "fill=" && x[1] === "w").length, 4);
  assert.deepEqual(c2.L.filter(x => x[0] === "fill").pop(), ["fill", "evenodd"]);
  // innere Kanten: weder Wand noch Dachkante
  const c3 = protokoll();
  Axo.prisma(c3, A, Q, { h1: 5, ohne: (a, b) => a[0] === 10 && b[0] === 10, seite: () => "w", dach: "d", kante: "k", lw: 1 });
  assert.equal(c3.L.filter(x => x[0] === "fill=" && x[1] === "w").length, 1);
  const nachDach = c3.L.slice(c3.L.findIndex(x => x[0] === "fill=" && x[1] === "d"));
  assert.equal(nachDach.filter(x => x[0] === "m").length, 3);                       // drei Dachkanten als Linien
});

test("drehen: waagrecht dreht, senkrecht neigt, Grenzen und Ganzzahlen", () => {
  const z = { x: 100, y: 100, d: 30, n: 40 };
  assert.deepEqual(Axo.drehen(z, 100, 100), { drehung: 30, neigung: 40 });
  assert.deepEqual(Axo.drehen(z, 200, 100), { drehung: 0, neigung: 40 });          // 30 − 100 · 0,3
  assert.deepEqual(Axo.drehen(z, 210, 100), { drehung: 357, neigung: 40 });        // über 0 hinaus → 357
  assert.deepEqual(Axo.drehen(z, 100, 1000), { drehung: 30, neigung: 90 });
  assert.deepEqual(Axo.drehen(z, 100, -1000), { drehung: 30, neigung: 10 });
  assert.deepEqual(Axo.drehen(z, 110, 120, { fd: 0.4, fn: 0.25, nMin: 15 }), { drehung: 26, neigung: 45 });
});
