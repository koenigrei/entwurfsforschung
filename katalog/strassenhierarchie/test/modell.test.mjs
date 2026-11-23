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

/** kleines Netz: Kette A–B–C–D (drei Segmente in einer Linie) und ein Abzweig an B */
function kleinesNetz() {
  const N = Geo.netz([[[0, 0], [10, 0]], [[10, 0], [20, 0]], [[20, 0], [30, 0]], [[10, 0], [10, 10]]]);
  return { N, G: Geo.richtungsGraph(N, { kL: 1, kW: 0 }) };
}

test("erzeuge: t = 0, nichts klassifiziert, zwei Stadteingänge und ein PoI", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.fertig, 0);
  assert.ok(z.G.n > 100, "zu wenige Segmente: " + z.G.n);
  assert.ok([...z.K.klasse].every(k => k === -1));
  assert.equal(z.eingang.length, 2); assert.equal(z.poi.length, 1);
});

test("Netz: jedes Segment ist mit allen anderen verbunden (Zufahrten hängen am Raster)", () => {
  const z = M.erzeuge(P, zufall(2));
  const A = Geo.segmentAbstaende(z.G, Geo.zustandsSuche(z.G, 0));
  assert.ok([...A.kosten].every(Number.isFinite));
});

test("Gewichte wie das C#-Skript im Cluster: Gewicht × Anzahl Segmente ersetzt das Grundgewicht am nächsten Segment, beide Listen addiert", () => {
  const { N } = kleinesNetz(), m = N.kanten.length;
  const w = M.gewichte(N, [[25, 1]], [[0.5, 0.2]], mit({ grund: 1, wEingang: 1, wPoi: 0.5 }));
  assert.equal(M.naechstesSegment(N, [25, 1]), 2); assert.equal(M.naechstesSegment(N, [0.5, 0.2]), 0);
  assert.deepEqual([...w], [1 * m + 1, 2, 1 + 0.5 * m, 2]);
  // zwei Punkte am selben Segment: ersetzt, nicht summiert; Eingang und PoI am selben Segment: beide Zusatzgewichte
  assert.deepEqual([...M.clusterListe(N, [[1, 0], [2, 0]], 7, 1)], [7, 1, 1, 1]);
  assert.deepEqual([...M.gewichte(N, [[1, 0]], [[2, 0]], mit({ grund: 1, wEingang: 1, wPoi: 0.5 }))], [1.5 * m, 2, 2, 2]);
  const w0 = M.gewichte(N, [], [], mit({ grund: 0 }));
  assert.deepEqual([...w0], [0, 0, 0, 0]);
});

test("Betweenness (nachgerechnet): Kette mit Abzweig, Gewichte 1, Start- und Zielsegment zählen mit", () => {
  const { G } = kleinesNetz(), g = new Float64Array(4).fill(1), bc = new Float64Array(4);
  for (let s = 0; s < 4; s++) M.betweennessVon(G, s, g, g, bc, true);
  // Segmente 0 (A–B), 1 (B–C), 2 (C–D), 3 (B–Abzweig). Geordnete Paare: 12, jedes Segment ist Endpunkt in 6 Paaren.
  // Dazwischen: Segment 1 liegt auf 0↔2 und 3↔2 (4 geordnete Paare); die übrigen liegen nie dazwischen.
  assert.deepEqual([...bc], [6, 10, 6, 6]);
});

test("Betweenness: Ursprungsgewicht 0 trägt nichts bei", () => {
  const { G } = kleinesNetz(), bc = new Float64Array(4);
  const gQ = new Float64Array([0, 0, 0, 0]);
  for (let s = 0; s < 4; s++) M.betweennessVon(G, s, gQ, gQ, bc);
  assert.deepEqual([...bc], [0, 0, 0, 0]);
});

test("Bereiche: Merge(0, T, S, P) / Summe × Faktor, additiv; Find Domain nicht strikt", () => {
  const B = M.bereiche(mit({ wTertiaer: 1, wSekundaer: 1, wPrimaer: 2, faktor: 1 }));
  assert.deepEqual(B, [[0, 0.25], [0.25, 0.5], [0.5, 1]]);
  assert.equal(M.findeBereich(B, 0), 0); assert.equal(M.findeBereich(B, 0.25), 0); assert.equal(M.findeBereich(B, 0.3), 1); assert.equal(M.findeBereich(B, 1), 2);
  assert.equal(M.findeBereich(B, 1.2), -1);
  assert.equal(M.bereiche(mit({ wTertiaer: 0, wSekundaer: 0, wPrimaer: 0 })), null);
  // Faktor 1.001: der größte Wert 1 liegt sicher im letzten Bereich
  const B2 = M.bereiche(P); assert.ok(Math.abs(B2[2][1] - 1.001) < 1e-12); assert.equal(M.findeBereich(B2, 1), 2);
});

test("Klassifizierung: Logarithmus, Remap auf 0…1, Drittel bei gleichen Gewichten", () => {
  const bc = new Float64Array([1, Math.E, Math.E ** 2, Math.E ** 3, 0]);
  const K = M.klassifiziere(bc, P);
  assert.deepEqual([...K.wert].map(v => +v.toFixed(6)), [0, 0.333333, 0.666667, 1, 0]);
  assert.deepEqual([...K.klasse], [0, 0, 1, 2, 0]);
  assert.ok([...M.klassifiziere(new Float64Array(3), P).klasse].every(k => k === -1));
});

test("Schritt: ein Ursprungssegment je Schritt, Betweenness wächst; Ende nach allen Segmenten", () => {
  const z = M.erzeuge(P, zufall(3));
  M.schritt(z, P); const s1 = z.bc.reduce((a, b) => a + b, 0);
  M.schritt(z, P); const s2 = z.bc.reduce((a, b) => a + b, 0);
  assert.equal(z.t, 2); assert.equal(z.fertig, 2); assert.ok(s2 > s1 && s1 > 0);
  while (!M.fertig(z)) M.schritt(z, P);
  assert.equal(z.t, z.G.n);
  const ref = Object.assign({}, z); M.rechneAlles(ref, P);
  for (let i = 0; i < z.G.n; i++) assert.ok(Math.abs(z.bc[i] - ref.bc[i]) < 1e-6 * (1 + ref.bc[i]));
  M.schritt(z, P); assert.equal(z.t, z.G.n + 1); assert.equal(z.fertig, z.G.n);
});

test("Katalog: Segmente an Stadteingängen und am PoI werden Primary; alle drei Klassen kommen vor", () => {
  for (const s of [1, 4, 9]) {
    const z = M.erzeuge(P, zufall(s)); M.rechneAlles(z, P);
    for (const k of z.eingangSeg.concat(z.poiSeg)) assert.equal(z.K.klasse[k], 2, `Saat ${s}, Segment ${k}`);
    const b = M.bilanz(z); assert.ok(b.anz.every(a => a > 0), JSON.stringify(b.anz));
  }
});

test("Ohne Grundgewicht zählen nur Wege zwischen Eingängen und PoI: viele Segmente bleiben bei Betweenness 0", () => {
  const p = mit({ grund: 0 }), z = M.erzeuge(p, zufall(5)); M.rechneAlles(z, p);
  const null_ = [...z.bc].filter(v => v === 0).length;
  assert.ok(null_ > z.G.n / 3, "Segmente ohne Durchgang: " + null_);
});

test("höheres Primary-Gewicht → mehr Hauptstraßen", () => {
  const z = M.erzeuge(P, zufall(6)); M.rechneAlles(z, P);
  const a = M.bilanz(z).anz[2];
  M.aendere(z, mit({ wPrimaer: 1, wTertiaer: 0.3, wSekundaer: 0.3 }), "wTertiaer");
  assert.ok(M.bilanz(z).anz[2] > a);
});

test("aendere: vor dem Start nur Eingaben, danach ganze Analyse; Punkte verschieben ändert die Gewichte", () => {
  const z = M.erzeuge(P, zufall(7));
  M.aendere(z, mit({ kW: 0 }), "kW"); assert.equal(z.t, 0); assert.equal(z.fertig, 0);
  M.schritt(z, P); M.aendere(z, mit({ kW: 0 }), "kW"); assert.equal(z.fertig, z.G.n);
  const alt = z.poiSeg[0];
  z.poi[0] = z.eingang[0].slice(); M.punkteGeaendert(z, P);
  assert.equal(z.poiSeg[0], z.eingangSeg[0]); assert.notEqual(z.poiSeg[0], alt);
  assert.equal(z.gQ[z.eingangSeg[0]], (1 + 0.5) * z.G.n);
});

test("punktBei findet den nächsten Punkt im Fangradius", () => {
  const z = M.erzeuge(P, zufall(8));
  assert.deepEqual(M.punktBei(z, [z.poi[0][0] + 3, z.poi[0][1]], 12), { art: "poi", i: 0 });
  assert.deepEqual(M.punktBei(z, z.eingang[1], 12), { art: "eingang", i: 1 });
  assert.equal(M.punktBei(z, [z.poi[0][0] + 50, z.poi[0][1] + 50], 12), null);
});

test("gleiche Saat → gleiches Netz und gleiche Hierarchie; andere Saat → anderes Netz", () => {
  const a = M.erzeuge(P, zufall(11)), b = M.erzeuge(P, zufall(11)), c = M.erzeuge(P, zufall(12));
  M.rechneAlles(a, P); M.rechneAlles(b, P);
  assert.deepEqual([...a.K.klasse], [...b.K.klasse]);
  assert.deepEqual(a.N.knoten, b.N.knoten);
  assert.notDeepEqual(a.N.knoten, c.N.knoten);
});

test("Definition: dcs2020 (Original) mit Legacy-Kosten und Endsegmenten, standard (Toolbox v2) ohne", () => {
  const z = M.erzeuge(P, zufall(13));
  assert.equal(z.G.norm, "dcs2020"); assert.ok(M.mitEnden(P));
  const e = z.G.nb[0][0], l = z.G.laenge;                    // erster Schritt aus Zustand 0 (Segment 0, a → b)
  const s = 0, t = e[0] >> 1;
  assert.ok(Math.abs(e[1] - (0.5 * (l[s] + l[t]) / 2 / z.G.lmax + 0.5 * e[3] / 180)) < 1e-12);
  M.rechneAlles(z, P); const alt = z.bc.slice();
  const p2 = mit({ definition: "standard" }); M.aendere(z, p2, "definition");
  assert.equal(z.G.norm, "standard"); assert.equal(M.mitEnden(p2), false);
  assert.ok(Math.abs(z.G.nb[0][0][1] - (0.5 * (l[s] + l[t]) / 2 + 0.5 * z.G.nb[0][0][3] / 90)) < 1e-12);
  assert.ok(z.bc[z.eingangSeg[0]] < alt[z.eingangSeg[0]], "ohne Endsegmente trägt die Zufahrt weniger");
});
