// Tests der Straßenhierarchie (node --test im Ordner katalog/_gemeinsam) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Geo = require("../geo.js");
const H = require("../hierarchie.js");
const S = require("../szenen.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, H.STANDARD);
const mit = o => Object.assign({}, P, o);

/** Kette A–B–C–D (drei Segmente in einer Linie) und ein Abzweig an B */
function kleinesNetz() {
  const N = Geo.netz([[[0, 0], [10, 0]], [[10, 0], [20, 0]], [[20, 0], [30, 0]], [[10, 0], [10, 10]]]);
  return { N, G: Geo.richtungsGraph(N, { kL: 1, kW: 0 }) };
}

test("Gewichte: Gewicht × Anzahl Segmente ersetzt das Grundgewicht am nächsten Segment, beide Listen addiert", () => {
  const { N } = kleinesNetz(), m = N.kanten.length;
  assert.deepEqual([...H.gewichte(N, [[25, 1]], [[0.5, 0.2]], mit({ grund: 1, wEingang: 1, wPoi: 0.5 }))], [1 * m + 1, 2, 1 + 0.5 * m, 2]);
  assert.deepEqual([...H.clusterListe(N, [[1, 0], [2, 0]], 7, 1)], [7, 1, 1, 1]);
  assert.deepEqual([...H.gewichte(N, [[1, 0]], [[2, 0]], mit({ grund: 1 }))], [1.5 * m, 2, 2, 2]);
  assert.deepEqual([...H.gewichte(N, [], [], mit({ grund: 0 }))], [0, 0, 0, 0]);
  assert.deepEqual([...H.clusterListe({ knoten: [], kanten: [] }, [[0, 0]], 5, 1)], []);
});

test("vereinfachte Gewichte (wassernetz): 2 · grund, Zusatzgewichte je Punkt summiert", () => {
  const { N } = kleinesNetz(), m = N.kanten.length;
  assert.deepEqual([...H.gewichteSumme(N, [[1, 0]], [[2, 0], [3, 0]], mit({ grund: 1 }))], [2 + 2 * m + 0.5 * m, 2, 2, 2]);
});

test("Betweenness (nachgerechnet): Kette mit Abzweig, Start- und Zielsegment zählen mit oder nicht", () => {
  const { G } = kleinesNetz(), g = new Float64Array(4).fill(1);
  assert.deepEqual([...H.betweenness(G, g, true)], [6, 10, 6, 6]);
  assert.deepEqual([...H.betweenness(G, g, false)], [0, 4, 0, 0]);
  const bc = new Float64Array(4);
  assert.equal(H.betweennessVon(G, 0, new Float64Array(4), g, bc), null);
  assert.deepEqual([...bc], [0, 0, 0, 0]);
});

test("vereinfachte Betweenness: Enden zählen je erreichbarem Paar g_s · g_t", () => {
  const { N } = kleinesNetz(), G = Geo.segmentGraph(N, 1, 0), g = new Float64Array(4).fill(1);
  const bc = H.betweennessEinfach(G, g);
  // jedes Segment ist Endpunkt in 6 geordneten Paaren; im ungerichteten Graphen liegt nur Segment 1 dazwischen (0↔2, 3↔2)
  assert.deepEqual([...bc], [6, 10, 6, 6]);
  assert.deepEqual([...H.betweennessEinfach(G, new Float64Array(4))], [0, 0, 0, 0]);
});

test("Bereiche und Find Domain", () => {
  const B = H.bereiche(mit({ wTertiaer: 1, wSekundaer: 1, wPrimaer: 2, faktor: 1 }));
  assert.deepEqual(B, [[0, 0.25], [0.25, 0.5], [0.5, 1]]);
  assert.equal(H.findeBereich(B, 0.25), 0); assert.equal(H.findeBereich(B, 0.3), 1); assert.equal(H.findeBereich(B, 1), 2);
  assert.equal(H.findeBereich(B, 1.2), -1); assert.equal(H.findeBereich(null, 0.5), -1);
  assert.equal(H.bereiche(mit({ wTertiaer: 0, wSekundaer: 0, wPrimaer: 0 })), null);
  assert.equal(H.findeBereich(H.bereiche(P), 1), 2);
});

test("Klassifizierung: Logarithmus, Remap auf 0…1, Drittel bei gleichen Gewichten; alles 0 → keine Klasse", () => {
  const K = H.klassifiziere(new Float64Array([1, Math.E, Math.E ** 2, Math.E ** 3, 0]), P);
  assert.deepEqual([...K.wert].map(v => +v.toFixed(6)), [0, 0.333333, 0.666667, 1, 0]);
  assert.deepEqual([...K.klasse], [0, 0, 1, 2, 0]);
  assert.ok([...H.klassifiziere(new Float64Array(3), P).klasse].every(k => k === -1));
  assert.ok([...H.klassifiziere(new Float64Array([1, 4]), mit({ wTertiaer: 0, wSekundaer: 0, wPrimaer: 0 })).klasse].every(k => k === -1));
});

test("Analyse einer Beispielstadt: Segment am PoI und an den Eingängen wird Hauptstraße, alle drei Klassen kommen vor", () => {
  const st = S.stadt(zufall(4), { b: 400, h: 300, nx: 7, ny: 5, gebaeude: false, kirche: false });
  const N = Geo.netz(st.strassen, 0.5), poi = [[200, 150]], ein = [[0, 150], [400, 150]];
  const A = H.analyse(N, poi, ein, {});
  assert.equal(A.bc.length, N.kanten.length);
  assert.equal(A.klasse[Geo.naechstesSegment(N, poi[0])], 2);
  for (let c = 0; c < 3; c++) assert.ok([...A.klasse].includes(c), "Klasse fehlt: " + c);
  const E = H.analyseEinfach(N, poi, ein, {});
  assert.equal(E.klasse.length, N.kanten.length);
  assert.ok([...E.klasse].every(c => c >= 0 && c <= 2));
  // wiederholbar
  assert.deepEqual([...H.analyse(N, poi, ein, {}).bc], [...A.bc]);
});
