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

/** Quadrat 10 × 10 m mit Diagonale: Segmente 0 unten, 1 rechts, 2 oben, 3 links, 4 Diagonale (0,0)–(10,10) */
function quadrat(kL, kW, definition = "dcs2020") {
  const N = Geo.netz([[[0, 0], [10, 0]], [[10, 0], [10, 10]], [[10, 10], [0, 10]], [[0, 10], [0, 0]], [[0, 0], [10, 10]]]);
  return { N, G: M.graph(N, kL, kW, definition) };
}
const loesung = (G, art, a, b, fw) => M.loese(G, M.neueSuche(G, art, a, b, fw));

test("erzeuge: t = 0, Suche nicht begonnen, Ursprung und Ziel auf verschiedenen Segmenten, Graph mit zwei Richtungen je Segment", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.suche.fertig, false); assert.deepEqual(z.suche.weg, []);
  assert.ok(z.G.n > 100); assert.equal(z.G.z, 2 * z.G.n); assert.notEqual(z.so, z.sd); assert.equal(z.G.norm, "dcs2020");
});

test("Graph (nachgerechnet): Kosten wie Legacy-BuildGraph kL·m/l_max + kW·θ/180°, Standard kL·m + kW·θ/90°", () => {
  const { G } = quadrat(1, 1), lmax = 10 * Math.SQRT2;
  const e = G.roh.nb[0].find(x => x[0] === 2);             // Zustand 0 (unten, nach Osten) → Zustand 2 (rechts, nach Norden)
  assert.ok(nah(e[2], 10)); assert.ok(nah(e[3], 90)); assert.ok(nah(e[1], 10 / lmax + 90 / 180));
  const d = G.roh.nb[1].find(x => x[0] === 8);             // Zustand 1 (unten, nach Westen) → Diagonale nach Nordosten: 135°
  assert.ok(nah(d[3], 135)); assert.ok(nah(d[2], (10 + 10 * Math.SQRT2) / 2));
  assert.equal(G.roh.nb[0].some(x => x[0] >> 1 === 0), false, "keine Wende auf demselben Segment");
  const S = quadrat(1, 1, "standard").G;
  assert.ok(nah(S.roh.nb[0].find(x => x[0] === 2)[1], 10 + 1));
});

test("winkelbasiert: von unten auf die Diagonale direkt (135°) statt über rechts (90° + 135°)", () => {
  const { G } = quadrat(0, 1);
  for (const art of M.VERFAHREN) {
    const S = loesung(G, art, 0, 4);
    assert.deepEqual(S.weg, [0, 4], art);
    const K = M.wegKosten(G, S.zustaende);
    assert.ok(nah(K.grad, 135), art); assert.ok(nah(K.kosten, 135 / 180), art);
  }
});

test("exakter Gleichstand (zwei gleich lange Wege mit je 2 × 90°): jedes Verfahren findet einen davon, gleich teuer", () => {
  const { G } = quadrat(0, 1);
  for (const art of M.VERFAHREN) {
    const S = loesung(G, art, 0, 2);
    assert.ok([[0, 1, 2], [0, 3, 2]].some(x => x.join() === S.weg.join()), art + ": " + S.weg);
    assert.ok(nah(M.wegKosten(G, S.zustaende).grad, 180));
  }
});

test("metrisch: von unten nach links direkt (Knick bei (0, 0)) – Länge 10 m Mitte zu Mitte", () => {
  const { G } = quadrat(1, 0);
  for (const art of M.VERFAHREN) { const S = loesung(G, art, 0, 3); assert.deepEqual(S.weg, [0, 3], art); assert.ok(nah(M.wegKosten(G, S.zustaende).meter, 10)); }
});

test("kein Abbiegen „über“ ein Nachbarsegment: der Weg durchfährt jedes Segment von einem Ende zum anderen", () => {
  const r = Math.PI / 18, N = Geo.netz([[[-10, 0], [0, 0]], [[0, 0], [10 * Math.cos(r), 10 * Math.sin(r)]], [[0, 0], [-10 * Math.cos(r), 10 * Math.sin(r)]]]);
  const G = M.graph(N, 0, 1, "standard");
  for (const art of M.VERFAHREN) { const S = loesung(G, art, 0, 2); assert.deepEqual(S.weg, [0, 2], art); assert.ok(nah(M.wegKosten(G, S.zustaende).grad, 170, 1e-6)); }
});

test("alle drei Verfahren liefern dieselben Wege und Kosten (viele Paare, alle Kostenarten, beide Definitionen, mehrere Saaten)", () => {
  for (const s of [1, 2]) {
    const z = M.erzeuge(P, zufall(s)), r = zufall(100 + s);
    for (const def of ["dcs2020", "standard"]) for (const [kL, kW] of [[0, 1], [1, 0], [0.5, 0.5]]) {
      const G = M.graph(z.N, kL, kW, def), fw = M.neueMatrix(G);
      M.loese(G, M.neueSuche(G, "floyd", 0, 1, fw));
      for (let i = 0; i < 20; i++) {
        const a = r.ganz(G.n), b = r.ganz(G.n);
        const w1 = loesung(G, "einfach", a, b), w2 = loesung(G, "dijkstra", a, b), w3 = loesung(G, "floyd", a, b, fw);
        const msg = `Saat ${s}, ${def} ${kL}/${kW}, ${a}→${b}`;
        assert.deepEqual(w1.weg, w2.weg, msg); assert.deepEqual(w2.weg, w3.weg, msg);
        assert.ok(nah(M.wegKosten(G, w1.zustaende).kosten, M.wegKosten(G, w3.zustaende).kosten), msg);
      }
    }
  }
});

test("Dijkstra-Kosten = Floyd–Warshall-Abstand (Minimum über beide Richtungen von Start und Ziel)", () => {
  const z = M.erzeuge(P, zufall(4)), G = z.G, fw = M.neueMatrix(G);
  M.loese(G, M.neueSuche(G, "floyd", z.so, z.sd, fw));
  const S = loesung(G, "dijkstra", z.so, z.sd), n = G.z;
  let best = Infinity; for (const i of [2 * z.so, 2 * z.so + 1]) for (const j of [2 * z.sd, 2 * z.sd + 1]) best = Math.min(best, fw.D[i * n + j]);
  assert.ok(nah(S.dist[S.zustaende.at(-1)], best));
});

test("Schritt Dijkstra: je Schritt wird genau ein Zustand fest, in nicht fallender Entfernung; Ende, wenn das Ziel fest ist", () => {
  const z = M.erzeuge(P, zufall(5)), Su = z.suche;
  let vor = -1, n = 0;
  while (!M.fertig(z)) {
    M.schritt(z, P); n++;
    assert.equal(Su.fest.reduce((a, b) => a + b, 0), Su.schritte);
    assert.ok(Su.dist[Su.zuletztZustand] >= vor - 1e-12); vor = Su.dist[Su.zuletztZustand];
  }
  assert.equal(z.t, n); assert.equal(Su.zuletzt, z.sd); assert.equal(Su.weg[0], z.so); assert.equal(Su.weg.at(-1), z.sd);
  assert.ok(Su.schritte < z.G.z, "Dijkstra bricht am Ziel ab");
  M.schritt(z, P); assert.equal(z.t, n + 1);
});

test("Schritt Floyd–Warshall: eine Runde k je Schritt, der Weg steht nach allen Runden; danach ist jede Abfrage sofort fertig", () => {
  const p = mit({ verfahren: "floyd" }), z = M.erzeuge(p, zufall(6));
  M.schritt(z, p); assert.equal(z.suche.fw.k, 1); assert.equal(z.suche.fertig, false);
  let erreichbar = [...M.bekannt(z).dist].filter(Number.isFinite).length;
  while (!M.fertig(z)) {
    M.schritt(z, p);
    const e = [...M.bekannt(z).dist].filter(Number.isFinite).length; assert.ok(e >= erreichbar); erreichbar = e;
  }
  assert.equal(z.t, z.G.z); assert.equal(erreichbar, z.G.n);
  assert.deepEqual(z.suche.weg, M.kuerzesterWeg(z.G, "dijkstra", z.so, z.sd));
  const S = M.setzePunkt(z, p, "o", [z.b / 2, z.h / 2]);
  assert.equal(S.schritte, 0, "Matrix ist schon fertig – keine neue Vorbereitung"); assert.equal(z.vorbereitet, false);
  assert.deepEqual(S.weg, M.kuerzesterWeg(z.G, "dijkstra", z.so, z.sd));
});

test("Schritt einfach: gleiche Reihenfolge der festen Zustände wie Dijkstra", () => {
  const z = M.erzeuge(P, zufall(7)), a = M.neueSuche(z.G, "einfach", z.so, z.sd), b = M.neueSuche(z.G, "dijkstra", z.so, z.sd);
  const ra = [], rb = [];
  while (!M.sucheSchritt(z.G, a)) ra.push(a.zuletztZustand);
  while (!M.sucheSchritt(z.G, b)) rb.push(b.zuletztZustand);
  assert.deepEqual(ra, rb);
});

test("Grenzfälle: Ursprung = Ziel → Weg aus einem Segment, Kosten 0; nicht erreichbares Ziel → leerer Weg", () => {
  const { G } = quadrat(0, 1);
  for (const art of M.VERFAHREN) { const S = loesung(G, art, 2, 2); assert.deepEqual(S.weg, [2]); assert.equal(M.wegKosten(G, S.zustaende).kosten, 0); }
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
    const Kw = M.wegKosten(Gw, loesung(Gw, "dijkstra", z.so, z.sd).zustaende), Km = M.wegKosten(Gm, loesung(Gm, "dijkstra", z.so, z.sd).zustaende);
    assert.ok(Kw.grad <= Km.grad + 1e-9); assert.ok(Km.meter <= Kw.meter + 1e-9);
  }
});

test("Betweenness (Run Calculation): Kette – dcs2020 zählt Start- und Zielsegment mit, Standard nicht", () => {
  const N = Geo.netz([[[0, 0], [10, 0]], [[10, 0], [20, 0]], [[20, 0], [30, 0]]]);
  assert.deepEqual([...M.betweenness(M.graph(N, 1, 0))], [4, 6, 4]);
  assert.deepEqual([...M.betweenness(M.graph(N, 1, 0, "standard"))], [0, 2, 0]);
  const z = M.erzeuge(mit({ betweenness: true }), zufall(9));
  assert.ok(z.bc && z.bc.length === z.G.n && Math.max(...z.bc) > 0);
});

test("gleiche Saat → gleiches Netz und gleicher Weg; andere Saat → anderes Netz", () => {
  const a = M.erzeuge(P, zufall(11)), b = M.erzeuge(P, zufall(11)), c = M.erzeuge(P, zufall(12));
  M.sofort(a, P); M.sofort(b, P);
  assert.deepEqual(a.suche.weg, b.suche.weg); assert.deepEqual(a.N.knoten, b.N.knoten);
  assert.notDeepEqual(a.N.knoten, c.N.knoten);
});
