// Tests der Modellregeln (node --test) · Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");

const P = extra => Object.assign({}, M.STANDARD, extra);
const leer = extra => M.erzeuge(P(Object.assign({ startknoten: false }, extra)), zufall(1));
const lauf = (saat, extra, n = 500) => { const p = P(extra), z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) { M.schritt(z, p); if (z.fertig) break; } return z; };
const zelle = (z, K, I) => I * z.sp + K;
const fein = (z, k, i) => i * z.sb + k;
const strassen = z => { const L = []; for (let s = 0; s < z.cState.length; s++) if (z.cState[s] === 1) L.push([s % z.sb, Math.floor(s / z.sb)]); return L; };

test("Delphi-Rundung: ,5 zur geraden Zahl; RoundTo(x, −2)", () => {
  assert.deepEqual([12.5, 13.5, 2.5, -0.5, 1.4999, 1.5001].map(M.rundeD), [12, 14, 2, 0, 1, 2]);
  assert.equal(M.roundTo2(2 / 3), 0.67);
  assert.equal(M.abstand(12, 12, 60, 36), 54);                       // √2880 = 53,67
});

test("Feld aus cell scale wie in Setup (611 × 689 px), erster Knoten auf round(spalt/2), round(reih/2)", () => {
  assert.deepEqual(M.feld(24), { spalt: 25, reih: 28 });
  assert.deepEqual(M.feld(6), { spalt: 101, reih: 114 });
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.sb, 75); assert.equal(z.sh, 84);
  assert.deepEqual([z.nk[0], z.ni[0], z.nx[0], z.ny[0]], [12, 14, 300, 348]); // round(12,5) = 12 (Math.round gäbe 13)
});

test("testNeighState: Nachbarn des Knotens gesperrt, deren Nachbarn Kandidaten; zwei Durchläufe mit Doppeleinträgen", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(Array.from(z.state).filter(s => s === 2).length, 8);
  assert.equal(new Set(z.devList).size, 16);                          // Ring im Abstand 2
  assert.equal(z.devList.length, 26);                                  // 10 schon im ersten Durchlauf, alle 16 im zweiten
  for (const c of z.devList) {
    const K = c % z.sp, I = (c - K) / z.sp;
    assert.equal(Math.max(Math.abs(K - 12), Math.abs(I - 14)), 2);
  }
});

test("lookForOtherNodes: Knoten im 5 × 5-Umkreis, Spalte vor Reihe", () => {
  const z = leer();
  for (const [K, I] of [[5, 5], [7, 3], [3, 7], [7, 7], [8, 5]]) M.agentsCreate(z, zelle(z, K, I));
  assert.deepEqual(M.lookForOtherNodes(z, zelle(z, 5, 5)), [2, 1, 3]);  // (3,7), dann (7,3), (7,7); (8,5) liegt außerhalb
});

test("Delphi-QuickSort: Gleichstände in der Reihenfolge des Originals (nicht stabil)", () => {
  assert.deepEqual(M.sortiereDelphi(["a", "b", "c"], () => 0), ["c", "b", "a"]);
  const F = { a: 5, b: 9, c: 1, d: 7 };
  assert.deepEqual(M.sortiereDelphi(["a", "b", "c", "d"], (x, y) => F[x] < F[y] ? 1 : F[x] === F[y] ? 0 : -1), ["b", "d", "a", "c"]);
});

test("transLine: Straße Zelle für Zelle zum Ziel, Eigenheit ohne Winkelumbruch bei ±π", () => {
  const weg = (a, b) => { const z = leer(); M.transLine(z, a[0], a[1], b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0])); return { z, L: strassen(z) }; };
  let r = weg([10, 10], [4, 9]);                                       // Ziel links oben: erst waagerecht, der Schritt nach oben ganz am Ende
  assert.equal(r.L.length, 8);
  assert.ok(r.L.some(([k, i]) => k === 4 && i === 10));
  r = weg([10, 10], [4, 11]);                                          // Ziel links unten: Schritt nach unten schon bei x = 7
  assert.ok(r.L.some(([k, i]) => k === 7 && i === 11) && r.L.some(([k, i]) => k === 7 && i === 10));
  r = weg([10, 10], [13, 13]);                                         // Diagonale: Gleichstand → erster Nachbar (unten)
  assert.deepEqual(r.L.map(([k, i]) => k + "," + i).sort(), ["10,10", "10,11", "11,11", "11,12", "12,12", "12,13", "13,13"]);
  assert.equal(r.z.strassen, 7);
  assert.equal(r.z.streetDense[zelle(r.z, 3, 3)], 3);                  // (10,10), (10,11), (11,11) gehören zur Zelle (3,3)
});

test("Connect: Kante in beiden Nachbarlisten, gerundete Länge, Straße auf dem feinen Raster, überbaute Zelle wird Straße", () => {
  const z = leer();
  const a = M.agentsCreate(z, zelle(z, 12, 14)), b = M.agentsCreate(z, zelle(z, 14, 15));
  z.cState[fein(z, 38, 44)] = 2; z.buildDense[zelle(z, 12, 14)] = 1; z.bebaut = 1;   // Haus auf dem Weg
  M.connect(z, a, b);
  assert.deepEqual([z.nb[a], z.nb[b], z.nd[a], z.conns, z.netz], [[b], [a], [54], 1, 54]);
  const L = strassen(z);
  assert.equal(L.length, 10);                                          // |dx| + |dy| + 1 auf dem feinen Raster (43,46) → (37,43)
  assert.equal(z.cState[fein(z, 38, 44)], 1); assert.equal(z.bebaut, 0); assert.equal(z.buildDense[zelle(z, 12, 14)], 0);
});

test("A* (findPath): Zahl der Kanten des gefundenen Weges, 0 ohne Weg", () => {
  const z = leer(), n = [];
  for (const [K, I] of [[2, 2], [4, 2], [6, 2], [8, 2], [8, 4], [20, 20]]) n.push(M.agentsCreate(z, zelle(z, K, I)));
  for (let q = 0; q < 4; q++) M.connect(z, n[q], n[q + 1]);
  assert.equal(M.findPath(z, n[0], n[4]), 4);
  assert.equal(M.findPath(z, n[4], n[1]), 3);
  assert.equal(M.findPath(z, n[0], n[5]), 0);
  M.connect(z, n[0], n[4]);
  assert.equal(M.findPath(z, n[0], n[4]), 1);                          // Ziel ist direkter Nachbar
});

test("Interlink: Verbindung nur, wenn A* keinen Weg mit höchstens min Distance Kanten findet", () => {
  const bau = () => { const z = leer(), n = []; for (const [K, I] of [[2, 2], [4, 2], [6, 2], [6, 4], [4, 4]]) n.push(M.agentsCreate(z, zelle(z, K, I))); for (let q = 0; q < 4; q++) M.connect(z, n[q], n[q + 1]); return { z, n }; };
  let { z, n } = bau(); M.interlink(z, n[0], [n[4]], 4); assert.equal(z.conns, 4);   // Weg 4 Kanten ≤ 4 → nein
  ({ z, n } = bau()); M.interlink(z, n[0], [n[4]], 3); assert.equal(z.conns, 5);     // 4 > 3 → verbinden
  assert.equal(M.findPath(z, n[0], n[4]), 1);
});

test("subdivideEdge: Zwischenknoten alle cell scale · max street step, Anzahl mit Delphi-Rundung", () => {
  const z = leer();
  M.subdivideEdge(z, zelle(z, 5, 5), zelle(z, 10, 5), P({ strStep: 2 }));  // 120 px / 48 px = 2,5 → round = 2 → ein Zwischenknoten
  assert.deepEqual(z.nk.map((k, i) => [k, z.ni[i]]), [[5, 5], [7, 5], [10, 5]]);
  assert.equal(z.conns, 2);
  const y = leer();                                                    // vorhandener Knoten auf dem Weg wird benutzt
  M.agentsCreate(y, zelle(y, 8, 5));
  M.subdivideEdge(y, zelle(y, 5, 5), zelle(y, 14, 5), P({ strStep: 3 }));   // 216 px / 72 px = 3 → Zwischenknoten bei 8 und 11
  assert.equal(y.nk.length, 4); assert.equal(y.conns, 3);
});

test("buildStreet: allein liegende Bebauung bekommt Knoten und eine Straße mit Zwischenknoten zum nächsten Knoten", () => {
  const z = M.erzeuge({}, zufall(1));                                  // Knoten auf (12, 14)
  const s = fein(z, 37, 7);                                            // feine Zelle in der Zelle (12, 2)
  z.cState[s] = 2; z.buildDense[zelle(z, 12, 2)] = 1;
  M.buildStreet(z, s, M.STANDARD);                                     // 288 px / 72 px = 4 → drei Zwischenknoten
  assert.equal(z.nk.length, 5); assert.equal(z.conns, 4);
  assert.deepEqual([z.nk[1], z.ni[1]], [12, 2]);
  assert.ok(M.auswertung(z).zusammenhaengend);
});

test("equiPot: Pot = ((bebaut/9)^(1 − Pot) + Σ Pot der vier Nachbarn) / 5, auf Single gerundet", () => {
  const z = leer(), c = zelle(z, 5, 5);
  z.buildDense[c] = 9;
  M.equiPot(z);
  assert.equal(z.pot[c], Math.fround(0.2)); assert.equal(z.pot[c + 1], 0);
  M.equiPot(z);
  assert.equal(z.pot[c + 1], Math.fround(Math.fround(0.2) / 5));
  assert.equal(z.pot[c], Math.fround(1 / 5));                          // 1^(0,8) = 1, Nachbarn noch 0
  z.buildDense[c] = 0; for (let i = 0; i < 200; i++) M.equiPot(z);
  assert.ok(z.pot[c] < 1e-6);                                          // ohne Bebauung klingt das Feld ab
});

test("Highwayman (dev_Cell): bebaut wird nur neben einer Straße; ohne Kandidaten hält der Lauf", () => {
  const z = leer(), p = P();
  assert.equal(M.entwickleZelle(z, p, false), -1); assert.ok(z.fertig);
  z.fertig = false; z.cState[fein(z, 20, 20)] = 1;
  const s = M.entwickleZelle(z, p, false), k = s % z.sb, i = Math.floor(s / z.sb);
  assert.equal(Math.abs(k - 20) + Math.abs(i - 20), 1);
  assert.equal(z.cState[s], 2); assert.equal(z.buildDense[zelle(z, Math.floor(k / 3), Math.floor(i / 3))], 1);
});

test("Wahl der Zelle: zentripetal gegen zentrifugal – ohne Zufall gewinnt das Potential mit dem größten Unterschied", () => {
  const z = leer(), p = P({ rndScale: 0 });
  z.pot[zelle(z, 3, 3)] = 0.5; z.pot[zelle(z, 10, 10)] = 0.05; z.pot[zelle(z, 15, 15)] = 1;   // 1,7(1−e^−1) − 2(1−e^−0,5) = 0,288 ist am größten
  const s = M.entwickleZelle(z, p, true);
  assert.equal(Math.floor((s % z.sb) / 3), 3); assert.equal(Math.floor(Math.floor(s / z.sb) / 3), 3);
});

test("buildings_Calc (Regel 7013): voll umbaute Zelle wird grün, grün mit 1–3 bebauten Nachbarn wieder bebaut", () => {
  const z = leer();
  for (let i = 10; i < 13; i++) for (let k = 10; k < 13; k++) { const s = fein(z, k, i); z.cState[s] = 2; z.subState[s] = 2; z.clustSize[s] = 9; }
  M.buildingsCalc(z, M.STANDARD);
  assert.equal(z.subState[fein(z, 11, 11)], 3);
  assert.equal([...z.subState].filter(v => v === 3).length, 1);
  const g = fein(z, 30, 30); z.cState[g] = 2; z.subState[g] = 3; z.clustSize[g] = 9;
  for (const [k, i] of [[29, 30], [31, 30]]) { const s = fein(z, k, i); z.cState[s] = 2; z.subState[s] = 2; }
  M.buildingsCalc(z, M.STANDARD);
  assert.equal(z.subState[g], 2);
  const klein = fein(z, 50, 50); z.cState[klein] = 2; z.subState[klein] = 2; z.clustSize[klein] = 4;   // Cluster ≤ 4: bleibt
  M.buildingsCalc(z, M.STANDARD); assert.equal(z.subState[klein], 2);
});

test("Clusteranalyse: entwickelte Zellen (bebaut, Straße daneben) als Cluster; erste Zelle behält ihren Wert", () => {
  const z = leer();
  for (const k of [5, 6, 7]) z.cState[fein(z, k, 5)] = 2;
  z.cState[fein(z, 8, 5)] = 1; z.cState[fein(z, 9, 5)] = 1;          // (8,5) neben Bebauung → entwickelt, (9,5) nicht
  z.cState[fein(z, 20, 20)] = 2;
  M.clusterAnalyse(z);
  assert.deepEqual(z.cluster, { anzahl: 2, groesster: 4, ueber10: 0 });
  assert.equal(z.clustSize[fein(z, 6, 5)], 4); assert.equal(z.clustSize[fein(z, 8, 5)], 4);
  assert.equal(z.clustSize[fein(z, 5, 5)], 0);                         // Startzelle (toCluster = −1)
  assert.equal(z.isDev[fein(z, 9, 5)], 0);
});

test("Konnektivität: ML je Knoten, globML und lokales Maß wie ListKonnVals/StandardVal", () => {
  const z = leer(), n = [];
  for (const [K, I] of [[2, 2], [4, 2], [6, 2]]) n.push(M.agentsCreate(z, zelle(z, K, I)));
  M.connect(z, n[0], n[1]); M.connect(z, n[1], n[2]);
  let k = M.konnektivitaet(z, {});
  assert.deepEqual(Array.from(k.ml), [1, 0.67, 1]); assert.equal(k.globML, 0.89);
  assert.deepEqual(Array.from(k.lokal), [9, 10, 9]); assert.deepEqual(Array.from(k.wert), [0, 1, 0]);
  k = M.konnektivitaet(z, { lokal: false });
  assert.deepEqual(Array.from(k.wert), [0, 1, 0]);                    // kleine ML = gut erreichbar
  assert.deepEqual(M.grade(z), [0, 2, 1, 0, 0, 0, 0, 0, 0]);
});

test("Maus: Knoten nicht doppelt, Straße ziehen, nur freie Zellen bebauen", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(M.setzeKnoten(z, 37.5, 43.5), false);                  // dort liegt schon der Startknoten
  assert.equal(M.setzeKnoten(z, 3.5, 3.5), true); assert.equal(z.nk.length, 2);
  assert.ok(M.zieheStrasse(z, M.STANDARD, 37.5, 43.5, 37.5, 7.5));
  assert.ok(M.auswertung(z).zusammenhaengend === false && z.conns >= 2);   // Knoten (1,1) bleibt allein
  const s = strassen(z)[0];
  assert.equal(M.bebaue(z, s[0], s[1]), false);
  assert.equal(M.bebaue(z, 70, 80), true); assert.equal(z.bebaut, 1);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf (alle Fassungen)", () => {
  const fp = z => z.nk.join(",") + "|" + z.ni.join(",") + "|" + Array.from(z.cState).join("");
  for (const fassung of ["netz", "boom", "interlink", "cluster"]) {
    assert.equal(fp(lauf(7, { fassung }, 60)), fp(lauf(7, { fassung }, 60)), fassung);
    assert.notEqual(fp(lauf(7, { fassung }, 60)), fp(lauf(8, { fassung }, 60)), fassung);
  }
});

test("Erschließungsgraph (3.4.1): wächst bis kein Kandidat mehr bleibt, zusammenhängend, Knoten mindestens 2 Zellen auseinander", () => {
  const z = lauf(1, {});
  const a = M.auswertung(z);
  assert.ok(z.fertig); assert.equal(z.devList.length, 0);
  assert.equal(a.knoten, 145); assert.equal(a.kanten, 194); assert.equal(z.t, 145);
  assert.ok(a.zusammenhaengend); assert.equal(a.naechster, 2);
  for (let q = 0; q < a.knoten; q++) for (const r of z.nb[q]) assert.ok(Math.max(Math.abs(z.nk[q] - z.nk[r]), Math.abs(z.ni[q] - z.ni[r])) <= 2);
  assert.ok(a.anteilStrasse > 0.2 && a.bebaut === 0);
});

test("min Distance steuert die Maschen: groß → Baum, klein → mehr Kanten und kürzere Wege", () => {
  const werte = [1, 3, 10, 1000].map(minDist => { const z = lauf(1, { minDist }); return [z.conns, z.nk.length, M.konnektivitaet(z, {}).globML]; });
  assert.equal(werte[3][0], werte[3][1] - 1);                          // ohne Interlink ein Baum
  for (let i = 1; i < 4; i++) { assert.ok(werte[i][0] < werte[i - 1][0]); assert.ok(werte[i][2] > werte[i - 1][2]); }
});

test("noise weight 0: ohne Potential ist die Wahl fest (erster Kandidat), unabhängig von der Saat", () => {
  const a = lauf(1, { fieldW: 0 }), b = lauf(2, { fieldW: 0 });
  assert.deepEqual([a.nk, a.ni, a.conns], [b.nk, b.ni, b.conns]);
});

test("Fassungen boom, interlink, cluster: Bebauung, Grünflächen, Cluster; boom ohne, interlink mit Maschen", () => {
  const boom = lauf(1, { fassung: "boom" }, 300), inter = lauf(1, { fassung: "interlink" }, 300), clu = lauf(1, { fassung: "cluster" }, 300);
  for (const z of [boom, inter, clu]) {
    const a = M.auswertung(z);
    assert.equal(z.t, 300); assert.ok(a.bebaut > 1000 && a.bebaut <= 1500); assert.ok(a.gruen > 0); assert.ok(a.knoten > 20);
    assert.ok(a.zusammenhaengend); assert.ok(a.cluster && a.cluster.groesster > 500);
  }
  assert.ok(M.auswertung(inter).grad > M.auswertung(boom).grad);
  assert.ok(clu.cluster.anzahl > boom.cluster.anzahl);                 // cluster baut auch abseits der Straßen
  const ohne = lauf(1, { fassung: "cluster", autoBuild: false }, 100);
  assert.equal(M.auswertung(ohne).gruen, 0);
});

test("auto-stop: Halt nach dem Schritt mit time = stopAt", () => {
  const p = P({ fassung: "cluster", stopAt: 20 }), z = M.erzeuge(p, zufall(3));
  let n = 0; while (!z.fertig && n < 100) { M.schritt(z, p); n++; }
  assert.equal(z.t, 21);
  assert.equal(z.verlauf.length, 3);                                   // Analyse bei time 0, 10, 20
});
