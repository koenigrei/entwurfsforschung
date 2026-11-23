// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const mit = o => Object.assign({}, P, o);
const nahe = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
const nahL = (A, B, eps = 1e-9) => { assert.equal(A.length, B.length); for (let i = 0; i < A.length; i++) nahe(A[i], B[i], eps); };
const lauf = (p, saat, n) => { const z = M.erzeuge(p, zufall(saat)); for (let k = 0; k < n; k++) M.schritt(z, p); return z; };

test("erzeuge: t = 0, Parzellen mit Segment, erste Verteilung = je Profil 1 auf der besten Parzelle", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.iter, 0);
  assert.ok(z.parz.length > 80, "zu wenige Parzellen: " + z.parz.length);
  assert.ok(z.seg.every(s => s >= 0 && s < z.netz.G.n));
  for (let i = 0; i < 3; i++) {
    const mx = Math.max(...z.W[i]);
    z.D[i].forEach((d, j) => assert.equal(d, z.W[i][j] === mx ? 1 : 0));
    assert.ok(z.D[i].reduce((s, v) => s + v, 0) >= 1);
  }
  assert.deepEqual(z.add, [333, 167, 167]);                        // 10000/30, 5000/30 als Integer
});

test("Netz: jedes Parzellensegment erreicht jedes andere; Hauptstraßen (Hierarchie 1) vorhanden", () => {
  const z = M.erzeuge(P, zufall(2));
  for (const [, dist] of z.K.kosten) for (const s of z.seg) assert.ok(Number.isFinite(dist[s]));
  const h1 = [...z.netz.hier].filter(h => h === 1).length;
  assert.ok(h1 > 20 && h1 < z.netz.G.n / 2, "Hauptstraßen: " + h1);
});

test("Hierarchiegewicht: Kosten eines Übergangs + kH · (h_i + h_j) / 2", () => {
  const S = [[[0, 0], [10, 0]], [[10, 0], [20, 0]]];
  const a = M.netzGraph(S, [1, 2], mit({ kL: 1, kW: 0, kH: 0 })), b = M.netzGraph(S, [1, 2], mit({ kL: 1, kW: 0, kH: 0.5 }));
  nahe(b.adj[0][0][1] - a.adj[0][0][1], 0.5 * 1.5);
});

test("Netzkennwerte (nachgerechnet): Kette aus drei Segmenten, zwei Parzellen an Segment 0, eine an Segment 2", () => {
  // Segmente 0–1–2 in einer Linie, je 10 m, Kosten je Übergang 1 (kL = 1, kW = 0, kH = 0)
  const S = [[[0, 0], [10, 0]], [[10, 0], [20, 0]], [[20, 0], [30, 0]]];
  const g = M.netzGraph(S, [2, 2, 2], mit({ kL: 1, kW: 0, kH: 0 }));
  const K = M.netzKennwerte(g.G.n, g.adj, [0, 0, 2]);
  // Closeness n/Σd: von 0: 2·0 + 1·2 = 2 → 3/2; von 2: 2·2 = 4 → 3/4; Segment 1 ist kein Ursprung
  nahL(K.cc, [1.5, 0, 0.75]);
  // Betweenness mit Gewichten = Anzahl Parzellen (2, 0, 1), Start- und Zielsegment zählen mit: je Richtung 2 · 1
  nahL(K.bc, [4, 4, 4]);
});

test("Kriterien: Closeness und log(Betweenness) auf 0…1, flache Lage = 1 − Neigung", () => {
  const V = M.kriterien({ cc: [1, 2, 3], bc: [1, Math.E, Math.E * Math.E] }, [0, 1, 2], [0, 5, 10]);
  nahL(V[0], [0, 0.5, 1]); nahL(V[1], [0, 0.5, 1]); nahL(V[2], [1, 0.5, 0]);
  nahL(M.remap([4, 4]), [0, 0]);                                    // keine Spannweite
});

test("Gewichtete Werte (nachgerechnet): Mittel von Gewicht × Kriterium, gemeinsam auf 0…1; erste Verteilung", () => {
  const V = [Float64Array.from([0, 1]), Float64Array.from([1, 0])];
  const W = M.gewichteteWerte(V, [[1, 0], [0.5, -0.5], [-1, 1]]);
  // Mittel: R [0, 0.5], C [−0.25, 0.25], I [0.5, −0.5] → Bounds über alle −0.5…0.5
  nahL(W[0], [0.5, 1]); nahL(W[1], [0.25, 0.75]); nahL(W[2], [1, 0]);
  assert.deepEqual(M.ersteVerteilung(W).map(a => [...a]), [[0, 1], [0, 1], [1, 0]]);
  assert.deepEqual(M.ersteVerteilung([Float64Array.from([0.3, 0.3])]).map(a => [...a]), [[1, 1]]);   // Gleichstand: beide
});

test("Wahrgenommene Entfernung: Formel wie „Assemble Perceived Distance Formular“ und ihre Werte", () => {
  assert.equal(M.formel(P), "If(dist > 1, 0, Pow(1-dist, 2))");
  nahe(M.wahrnehmung(0, P), 1); nahe(M.wahrnehmung(0.5, P), 0.25); nahe(M.wahrnehmung(1, P), 0);
  const fern = mit({ wichtig: "far", funktion: "linear", falloff: 0.5 });
  assert.equal(M.formel(fern), "If(dist > 0.5, 1, dist)");
  nahe(M.wahrnehmung(0.3, fern), 0.3); nahe(M.wahrnehmung(0.6, fern), 1);
  const e6 = mit({ exponent: 6, falloff: 0.5 });
  assert.equal(M.formel(e6), "If(dist > 0.5, 0, Pow(1-dist, 6))");
  nahe(M.wahrnehmung(0.5, e6), Math.pow(0.5, 6)); nahe(M.wahrnehmung(0.51, e6), 0);
});

test("Abstände: Luftlinie zwischen Segmentmitten, normiert; gleiches Segment = 0; Netzdistanz ebenso in 0…1", () => {
  const mitten = [[0, 0], [30, 40], [60, 80]];
  const D = M.distanzen([0, 1, 2, 0], mitten, new Map(), "direkt");
  nahe(D[0 * 4 + 1], 0.5); nahe(D[0 * 4 + 2], 1); nahe(D[0 * 4 + 3], 0); nahe(D[1 * 4 + 0], 0.5);
  const z = M.erzeuge(mit({ variante: "netz" }), zufall(3)), n = z.parz.length;
  let mx = 0; for (let a = 0; a < n; a++) { nahe(z.dn[a * n + a], 0); for (let b = 0; b < n; b++) { const d = z.dn[a * n + b]; assert.ok(d >= 0 && d <= 1); mx = Math.max(mx, d); nahe(d, z.dn[b * n + a], 1e-9); } }
  nahe(mx, 1);
});

test("Attraktivität (nachgerechnet) und Abgleich mit der Vierfachschleife des C#-Skripts", () => {
  const W = [Float64Array.from([1, 0.5]), Float64Array.from([0, 1])], Pw = Float64Array.from([1, 0.5, 0.5, 1]);
  const D = [Int32Array.from([1, 0]), Int32Array.from([0, 2])], rel = [[1, -1], [0.5, 0.5]];
  const att = M.attraktivitaet(D, W, Pw, rel);
  // roh: Profil 0 [1, −1.75] → (x − min)/max = [2.75, 0]; Profil 1 [0.5, 1.125] → [0, 0.625/1.125]
  nahL(att[0], [2.75, 0]); nahL(att[1], [0, 0.625 / 1.125]);
  // wörtlich wie die Skripte: Baum {j, m, i, n} = attract · weights · distance, Summe über m, n mit D_n[m] > 0
  const r = zufall(9), K = 3, nP = 7;
  const W2 = [0, 1, 2].map(() => Float64Array.from({ length: nP }, () => r()));
  const P2 = Float64Array.from({ length: nP * nP }, () => r());
  const D2 = [0, 1, 2].map(() => Int32Array.from({ length: nP }, () => r() < 0.5 ? 0 : Math.floor(r() * 5)));
  const rel2 = [0, 1, 2].map(() => [0, 1, 2].map(() => 2 * r() - 1));
  const att2 = M.attraktivitaet(D2, W2, P2, rel2);
  for (let i = 0; i < K; i++) {
    const roh = [];
    for (let j = 0; j < nP; j++) { let s = 0; for (let m = 0; m < nP; m++) for (let n = 0; n < K; n++) if (D2[n][m] > 0) s += rel2[i][n] * W2[n][j] * P2[j * nP + m] * D2[n][m]; roh.push(s); }
    const mn = Math.min(...roh), mx = Math.max(...roh);
    nahL(att2[i], roh.map(v => mx > 0 ? (v - mn) / mx : (mx > mn ? (v - mn) / (mx - mn) : 0)), 1e-9);
  }
});

test("Attraktivität: nur negative Werte (max ≤ 0) bleiben in 0…1", () => {
  const att = M.attraktivitaet([Int32Array.from([1, 1])], [Float64Array.from([1, 0.5])], Float64Array.from([1, 1, 1, 1]), [[-1]]);
  nahL(att[0], [0, 1]);
});

test("Verteilung: Glücksrad nach Attraktivität, volle Parzellen erhalten 0, Einheiten verfallen bei voller Parzelle", () => {
  // Glücksrad: att [1, 1, 2], Summe 4; Zufall 0.5 → r = 2 → erste Teilsumme > 2 ist bei Parzelle 2
  let D = [Int32Array.from([0, 0, 0])];
  M.verteile(D, [Float64Array.from([1, 1, 2])], [1], Float64Array.from([9, 9, 9]), () => 0.5, false);
  assert.deepEqual([...D[0]], [0, 0, 1]);
  D = [Int32Array.from([0, 0, 0])];
  M.verteile(D, [Float64Array.from([1, 1, 2])], [1], Float64Array.from([9, 9, 9]), () => 0.1, false);
  assert.deepEqual([...D[0]], [1, 0, 0]);
  // volle Parzelle (Summe aller Profile ≥ maxDensity) wird nie gewählt
  D = [Int32Array.from([0, 3, 0]), Int32Array.from([0, 0, 0])];
  const r = M.verteile(D, [Float64Array.from([0, 1, 0]), Float64Array.from([1, 1, 0])], [2, 4], Float64Array.from([9, 3, 9]), zufall(1), false);
  assert.equal(r.voll, 1); assert.deepEqual([...D[1]], [4, 0, 0]);
  assert.deepEqual(r.verfallen, [2, 0]);                           // Profil 0 hat nur noch Attraktivität 0 → Glücksrad leer
  // deterministisch: alles auf die attraktivste Parzelle, bis sie voll ist; der Rest verfällt (density control)
  D = [Int32Array.from([0, 0, 0])];
  const d = M.verteile(D, [Float64Array.from([0.2, 1, 0.5])], [5], Float64Array.from([10, 3, 10]), () => 0, true);
  assert.deepEqual([...D[0]], [0, 3, 0]); assert.deepEqual(d.platziert, [3]); assert.deepEqual(d.verfallen, [2]);
});

test("Kapazität und Einheiten je Iteration: maxDensity = Fläche/Gesamtfläche · Σ Max Population / (1 − frei)", () => {
  nahL(M.maxDichte([1, 3], [10000, 5000, 5000], 0.3), [20000 * 0.25 / 0.7, 20000 * 0.75 / 0.7], 1e-6);
  assert.deepEqual(M.jeIteration([10000, 5000, 5000], 30), [333, 167, 167]);
  assert.deepEqual(M.jeIteration([10000, 5000, 5000], 0), [0, 0, 0]);
});

test("Wegeschätzung (nachgerechnet): getrennte Nutzungen erzeugen längere Wege als die gleichmäßige Verteilung", () => {
  const dn = Float64Array.from([0, 1, 1, 0]), D = [Int32Array.from([1, 0]), Int32Array.from([0, 1])];
  nahe(M.wegeSchaetzung(D, dn), 2);
  nahe(M.wegeGleich(D, dn), 1);
  nahe(M.wegeSchaetzung([Int32Array.from([1, 0]), Int32Array.from([1, 0])], dn), 0);   // alles auf einer Parzelle
});

test("Schritt: eine Iteration je Schritt, Summen wachsen um die Einheiten je Iteration, Ende nach „Iterations“", () => {
  const p = mit({ iterationen: 4 }), z = M.erzeuge(p, zufall(4));
  const s0 = z.D.map(a => a.reduce((s, v) => s + v, 0));
  M.schritt(z, p);
  assert.equal(z.t, 1); assert.equal(z.iter, 1);
  const s1 = z.D.map(a => a.reduce((s, v) => s + v, 0));
  for (let i = 0; i < 3; i++) assert.equal(s1[i] - s0[i] + z.verfallen[i], z.add[i]);
  for (let k = 0; k < 5; k++) M.schritt(z, p);
  assert.equal(z.iter, 4); assert.equal(z.t, 6); assert.ok(M.fertig(z, p));
  assert.equal(z.verlauf.length, 5);
  const b = M.bilanz(z);
  for (let i = 0; i < 3; i++) assert.equal(b.summe[i], s0[i] + 4 * z.add[i] - z.verfallen[i]);
  // Belegung überschreitet nie die Kapazität
  z.parz.forEach((_, j) => assert.ok(z.D[0][j] + z.D[1][j] + z.D[2][j] <= Math.ceil(z.dichte[j])));
});

test("Grenzfälle: 0 Iterationen, alle Gewichte 0, 90 % frei", () => {
  const p0 = mit({ iterationen: 0 }), z0 = M.erzeuge(p0, zufall(1));
  assert.ok(M.fertig(z0, p0)); M.schritt(z0, p0); assert.equal(z0.iter, 0); assert.equal(z0.t, 1);
  const leer = {}; for (const a of M.PROFILE) for (const c of [0, 1, 2]) leer["w" + a + c] = 0;
  const pz = mit(leer), z = lauf(pz, 1, 3);
  assert.ok(z.att.every(a => [...a].every(Number.isFinite)));
  const p9 = mit({ leer: 0.9 }), z9 = lauf(p9, 1, 30);
  assert.equal(M.bilanz(z9).voll, 0);
});

test("Wiederholbarkeit: gleiche Saat → gleiche Verteilung, andere Saat → andere", () => {
  const a = lauf(P, 5, 10), b = lauf(P, 5, 10), c = lauf(P, 6, 10);
  assert.deepEqual(a.D.map(x => [...x]), b.D.map(x => [...x]));
  assert.notDeepEqual(a.D.map(x => [...x]).slice(0, 1), c.D.map(x => [...x]).slice(0, 1));
});

test("aendere: Parameter nach Lauf → neu bis zur selben Iteration, wie ein frischer Lauf; Darstellung ändert nichts", () => {
  const z = lauf(P, 7, 6), vorher = z.D.map(x => [...x]);
  M.aendere(z, mit({ radius: 1 }), "radius");
  assert.deepEqual(z.D.map(x => [...x]), vorher);
  const p2 = mit({ exponent: 4 });
  M.aendere(z, p2, "exponent");
  assert.equal(z.iter, 6);
  assert.deepEqual(z.D.map(x => [...x]), lauf(p2, 7, 6).D.map(x => [...x]));
  const p3 = mit({ kH: 0, iterationen: 3 });
  M.aendere(z, p3, "kH");
  assert.equal(z.iter, 3);
});

test("Katalog: die Profile bestimmen die Lage – Industrie (Zentralität −1) liegt weniger zentral als Wohnen und Gewerbe", () => {
  for (const saat of [1, 2, 3]) {
    const b = M.bilanz(lauf(P, saat, 30));
    assert.ok(b.zentral[2] < b.zentral[0] - 0.05 && b.zentral[2] < b.zentral[1] - 0.05, JSON.stringify(b.zentral));
  }
});

test("Katalog: die Nutzungen beeinflussen sich – Anziehung statt Abstoßung zwischen Wohnen und Industrie mischt sie stärker", () => {
  // Überlagerung: Σ_j R_j · I_j / (Σ R · Σ I) · Parzellen (1 = unabhängig, > 1 = gemeinsam, < 1 = getrennt)
  const ueber = z => { const n = z.parz.length, R = z.D[0], I = z.D[2], sR = R.reduce((s, v) => s + v, 0), sI = I.reduce((s, v) => s + v, 0);
    let s = 0; for (let j = 0; j < n; j++) s += R[j] * I[j]; return s / (sR * sI) * n; };
  let mehr = 0;
  for (const saat of [1, 2, 3]) {
    const a = ueber(lauf(P, saat, 30)), b = ueber(lauf(mit({ m: M.setzeMatrix(M.setzeMatrix(P.m, 0, 2, 1), 2, 0, 1) }), saat, 30));
    if (b > a) mehr++;
  }
  assert.ok(mehr >= 3);
});

test("Gewichtsmatrix ↔ Modell: Voreinstellung = Relations des Originals, Zeile = Nutzung, Spalte = Bezug", () => {
  assert.deepEqual(M.profile(P).rel, [[1, 0.5, -0.75], [0.5, 0.5, 0.25], [-0.5, 0, 1]]);
  const m = M.setzeMatrix(P.m, 0, 2, 0.4);                         // Wohnen → Industrie
  assert.deepEqual(M.profile(mit({ m })).rel[0], [1, 0.5, 0.4]);
  // der Eintrag wirkt als Relation(i → n) in der Attraktivität: z.pr.rel nach aendere gleich der Matrix
  const z = lauf(P, 1, 3); M.aendere(z, mit({ m }), "m");
  assert.deepEqual(z.pr.rel, M.matrixAusText(m)); assert.equal(z.iter, 3);
  assert.deepEqual(z.D.map(x => [...x]), lauf(mit({ m }), 1, 3).D.map(x => [...x]));
  assert.notDeepEqual(z.D.map(x => [...x]), lauf(P, 1, 3).D.map(x => [...x]));
});

test("Gewichtsmatrix: Grenzen −1…1, Raster 0.05, ungültige Einträge = Original", () => {
  assert.deepEqual(M.matrixAusText("2,-3,0.333,,x"), [[1, -1, 0.35], [0.5, 0.5, 0.25], [-0.5, 0, 1]]);
  assert.deepEqual(M.matrixAusText(undefined), M.profile(P).rel);
  assert.equal(M.setzeMatrix(P.m, 1, 1, -0.02), "1,0.5,-0.75,0.5,0,0.25,-0.5,0,1");
});

test("Gewichtsmatrix in der Adresse: hin und zurück (URLSearchParams wie sim.js), kompakt", () => {
  const m = M.setzeMatrix(M.setzeMatrix(P.m, 2, 0, 0.85), 1, 2, -1);
  const q = new URLSearchParams(); q.set("saat", 3); q.set("m", m);
  const h = new URLSearchParams(q.toString());
  assert.equal(h.get("m"), m);
  assert.deepEqual(M.matrixAusText(h.get("m")), M.matrixAusText(m));
  assert.equal(M.matrixAlsText(M.matrixAusText(m)), m);
  assert.ok(q.toString().length < 70, q.toString());
});

test("Gewichtsmatrix zurücksetzen: Originalwerte ergeben wieder den Lauf des Originals", () => {
  const z = lauf(mit({ m: "0,0,0,0,0,0,0,0,0" }), 2, 5);
  M.aendere(z, P, "m");
  assert.equal(z.iter, 5);
  assert.deepEqual(z.pr.rel, [[1, 0.5, -0.75], [0.5, 0.5, 0.25], [-0.5, 0, 1]]);
  assert.deepEqual(z.D.map(x => [...x]), lauf(P, 2, 5).D.map(x => [...x]));
});
