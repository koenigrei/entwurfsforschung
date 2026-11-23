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
const nah = (a, b, e = 1e-9) => Math.abs(a - b) <= e * (1 + Math.abs(b));

/** Quadrat 10 × 10 m mit Diagonale: Segmente 0 unten, 1 rechts, 2 oben, 3 links, 4 Diagonale */
function quadrat(kL, kW) {
  const N = Geo.netz([[[0, 0], [10, 0]], [[10, 0], [10, 10]], [[10, 10], [0, 10]], [[0, 10], [0, 0]], [[0, 0], [10, 10]]]);
  return { N, G: M.graph(N, kL, kW) };
}

test("erzeuge: t = 0, Suche nicht begonnen, Ursprung und Ziel auf verschiedenen Segmenten", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.suche.fertig, false); assert.deepEqual(z.suche.weg, []);
  assert.ok(z.G.n > 100); assert.notEqual(z.so, z.sd);
});

test("Graph (nachgerechnet): Kosten wie BuildGraph, Meter von Segmentmitte zu Segmentmitte, Winkel der Richtungsänderung", () => {
  const { G } = quadrat(1, 1), lm = (40 + Math.SQRT2 * 10) / 5;
  const e01 = G.nb[0].find(x => x[0] === 1);               // unten → rechts: 90° Knick bei (10, 0)
  assert.ok(nah(e01[2], 10)); assert.ok(nah(e01[3], 90));
  assert.ok(nah(e01[1], 10 / lm + 1 + M.GLEICHSTAND * 10 / lm));
  const e04 = G.nb[0].find(x => x[0] === 4);               // unten (nach links fahrend) → Diagonale bei (0, 0): 135°
  assert.ok(nah(e04[3], 135)); assert.ok(nah(e04[2], (10 + 10 * Math.SQRT2) / 2));
});

test("winkelbasiert: von unten auf die Diagonale direkt (135°) statt über rechts (90° + 135°)", () => {
  const { G } = quadrat(0, 1);
  for (const art of M.VERFAHREN) assert.deepEqual(M.kuerzesterWeg(G, art, 0, 4), [0, 4], art);
  const K = M.wegKosten(G, [0, 4], 0, 1), K2 = M.wegKosten(G, [0, 1, 4], 0, 1);
  assert.ok(nah(K.kosten, 1.5)); assert.ok(nah(K.grad, 135)); assert.ok(nah(K2.grad, 225));
});

test("exakter Gleichstand (zwei gleich lange Wege mit je 2 × 90°): jedes Verfahren findet einen davon, gleich teuer", () => {
  const { G } = quadrat(0, 1);
  for (const art of M.VERFAHREN) {
    const w = M.kuerzesterWeg(G, art, 0, 2);
    assert.ok([[0, 1, 2], [0, 3, 2]].some(x => x.join() === w.join()), art + ": " + w);
    assert.ok(nah(M.wegKosten(G, w, 0, 1).grad, 180));
  }
});

test("metrisch: von unten nach links direkt (Knick bei (0, 0)) – Länge 10 m", () => {
  const { G } = quadrat(1, 0);
  for (const art of M.VERFAHREN) assert.deepEqual(M.kuerzesterWeg(G, art, 0, 3), [0, 3], art);
  assert.ok(nah(M.wegKosten(G, [0, 3], 1, 0).meter, 10));
});

test("alle drei Verfahren liefern dieselben Wege und Kosten (viele Paare, alle Kostenarten, mehrere Saaten)", () => {
  for (const s of [1, 2, 3]) {
    const z = M.erzeuge(P, zufall(s)), r = zufall(100 + s);
    for (const [kL, kW] of [[0, 1], [1, 0], [0.5, 0.5], [0.2, 0.9]]) {
      const G = M.graph(z.N, kL, kW), fw = M.neueMatrix(G);
      M.loese(G, M.neueSuche(G, "floyd", 0, 1, fw));
      for (let i = 0; i < 25; i++) {
        const a = r.ganz(G.n), b = r.ganz(G.n);
        const w1 = M.kuerzesterWeg(G, "einfach", a, b), w2 = M.kuerzesterWeg(G, "dijkstra", a, b), w3 = M.kuerzesterWeg(G, "floyd", a, b, fw);
        assert.deepEqual(w1, w2, `Saat ${s}, ${kL}/${kW}, ${a}→${b}`); assert.deepEqual(w2, w3, `Saat ${s}, ${kL}/${kW}, ${a}→${b}`);
        assert.ok(nah(M.wegKosten(G, w1, kL, kW).kosten, M.wegKosten(G, w3, kL, kW).kosten));
      }
    }
  }
});

test("Dijkstra-Kosten = Floyd–Warshall-Abstand (bis auf den Gleichstandsanteil)", () => {
  const z = M.erzeuge(P, zufall(4)), G = z.G, fw = M.neueMatrix(G);
  M.loese(G, M.neueSuche(G, "floyd", z.so, z.sd, fw));
  const S = M.loese(G, M.neueSuche(G, "dijkstra", z.so, z.sd));
  assert.ok(nah(S.dist[z.sd], fw.D[z.so * G.n + z.sd]));
});

test("Schritt Dijkstra: je Schritt wird genau ein Knoten fest, in nicht fallender Entfernung; Ende, wenn das Ziel fest ist", () => {
  const z = M.erzeuge(P, zufall(5)), Su = z.suche;
  let vor = -1, n = 0;
  while (!M.fertig(z)) {
    M.schritt(z, P); n++;
    assert.equal(Su.fest.reduce((a, b) => a + b, 0), Su.schritte);
    assert.ok(Su.dist[Su.zuletzt] >= vor - 1e-12); vor = Su.dist[Su.zuletzt];
  }
  assert.equal(z.t, n); assert.equal(Su.zuletzt, z.sd); assert.equal(Su.weg[0], z.so); assert.equal(Su.weg.at(-1), z.sd);
  assert.ok(Su.schritte < z.G.n, "Dijkstra bricht am Ziel ab");
  M.schritt(z, P); assert.equal(z.t, n + 1);
});

test("Schritt Floyd–Warshall: eine Runde k je Schritt, der Weg steht nach n Runden; danach ist jede Abfrage sofort fertig", () => {
  const p = mit({ verfahren: "floyd" }), z = M.erzeuge(p, zufall(6));
  M.schritt(z, p); assert.equal(z.suche.fw.k, 1); assert.equal(z.suche.fertig, false);
  let erreichbar = [...M.bekannt(z)].filter(Number.isFinite).length;
  while (!M.fertig(z)) {
    M.schritt(z, p);
    const e = [...M.bekannt(z)].filter(Number.isFinite).length; assert.ok(e >= erreichbar); erreichbar = e;
  }
  assert.equal(z.t, z.G.n); assert.equal(erreichbar, z.G.n);
  const ref = M.kuerzesterWeg(z.G, "dijkstra", z.so, z.sd); assert.deepEqual(z.suche.weg, ref);
  const S = M.setzePunkt(z, p, "o", [z.b / 2, z.h / 2]);
  assert.equal(S.schritte, 0, "Matrix ist schon fertig – keine neue Vorbereitung"); assert.equal(z.vorbereitet, false);
  assert.deepEqual(S.weg, M.kuerzesterWeg(z.G, "dijkstra", z.so, z.sd));
});

test("Schritt einfach: gleiche Reihenfolge der festen Knoten wie Dijkstra", () => {
  const z = M.erzeuge(P, zufall(7)), a = M.neueSuche(z.G, "einfach", z.so, z.sd), b = M.neueSuche(z.G, "dijkstra", z.so, z.sd);
  const ra = [], rb = [];
  while (!M.sucheSchritt(z.G, a)) ra.push(a.zuletzt);
  while (!M.sucheSchritt(z.G, b)) rb.push(b.zuletzt);
  assert.deepEqual(ra, rb);
});

test("Grenzfälle: Ursprung = Ziel → Weg aus einem Segment, Kosten 0; nicht erreichbares Ziel → leerer Weg", () => {
  const { G } = quadrat(0, 1);
  for (const art of M.VERFAHREN) assert.deepEqual(M.kuerzesterWeg(G, art, 2, 2), [2]);
  assert.equal(M.wegKosten(G, [2], 0, 1).kosten, 0);
  const N = Geo.netz([[[0, 0], [10, 0]], [[50, 0], [60, 0]]]), G2 = M.graph(N, 1, 0);
  for (const art of M.VERFAHREN) assert.deepEqual(M.kuerzesterWeg(G2, art, 0, 1), [], art);
});

test("setzePunkt rechnet den Weg sofort; Verfahren wechseln behält den Weg", () => {
  const z = M.erzeuge(P, zufall(8));
  const S = M.setzePunkt(z, P, "d", [z.b * 0.5, z.h * 0.9]);
  assert.ok(S.fertig && S.weg.length > 1); assert.equal(z.t, S.schritte);
  const w = S.weg.slice();
  for (const v of ["einfach", "floyd", "dijkstra"]) { const p = mit({ verfahren: v }); M.aendere(z, p, "verfahren"); assert.deepEqual(z.suche.weg, w, v); }
});

test("Kostenart: winkelbasierter Weg hat weniger Richtungsänderung, metrischer ist kürzer", () => {
  for (const s of [1, 2, 3]) {
    const z = M.erzeuge(P, zufall(s));
    const Gw = M.graph(z.N, 0, 1), Gm = M.graph(z.N, 1, 0);
    const ww = M.kuerzesterWeg(Gw, "dijkstra", z.so, z.sd), wm = M.kuerzesterWeg(Gm, "dijkstra", z.so, z.sd);
    const Kw = M.wegKosten(Gw, ww, 0, 1), Km = M.wegKosten(Gm, wm, 1, 0);
    assert.ok(Kw.grad <= Km.grad + 1e-9); assert.ok(Km.meter <= Kw.meter + 1e-9);
  }
});

test("Betweenness (Run Calculation): Kettenmitte trägt alle Durchgänge", () => {
  const N = Geo.netz([[[0, 0], [10, 0]], [[10, 0], [20, 0]], [[20, 0], [30, 0]]]), G = M.graph(N, 1, 0);
  assert.deepEqual([...M.betweenness(G)], [0, 2, 0]);           // geordnete Paare 0→2 und 2→0
  const z = M.erzeuge(mit({ betweenness: true }), zufall(9));
  assert.ok(z.bc && z.bc.length === z.G.n && Math.max(...z.bc) > 0);
});

test("gleiche Saat → gleiches Netz und gleicher Weg; andere Saat → anderes Netz", () => {
  const a = M.erzeuge(P, zufall(11)), b = M.erzeuge(P, zufall(11)), c = M.erzeuge(P, zufall(12));
  M.sofort(a, P); M.sofort(b, P);
  assert.deepEqual(a.suche.weg, b.suche.weg); assert.deepEqual(a.N.knoten, b.N.knoten);
  assert.notDeepEqual(a.N.knoten, c.N.knoten);
});
