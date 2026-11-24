// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const H = require("../../_gemeinsam/hydraulik.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const mit = o => Object.assign({}, P, o);
const nah = (a, b, tol, was) => assert.ok(Math.abs(a - b) <= tol, `${was || ""}: ${a} ≠ ${b} (±${tol})`);
const gerechnet = (p, saat = 1) => { const z = M.erzeuge(p, zufall(saat)); M.rechneAlles(z, p); return z; };
const Z1 = gerechnet(P);

test("erzeuge: t = 0, Phase „wege“, Blöcke als Verbraucher, Hochbehälter am höchsten Straßenknoten, drei Straßenklassen", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.phase, "wege"); assert.equal(z.erg, null);
  assert.ok(z.verbraucher.length > 50);
  assert.equal(z.Sz.zK[z.tankKnoten], Math.max(...z.Sz.zK));
  for (const c of [0, 1, 2]) assert.ok(z.Sz.klasse.some(k => k === c), "Klasse " + c);
});

test("Bedarf je Block: DemandPerHousehold [L/Tag] × Fläche / AreaPerHousehold / 86 400 × Spitzenfaktor (von Hand)", () => {
  nah(M.bedarfBlock(10000, P), 20 * 10 / 86400 * 5, 1e-15);
  nah(M.bedarfBlock(10000, mit({ flaecheHaushalt: 100 })), 20 * 100 / 86400 * 5, 1e-15);
  nah(M.bedarfBlock(10000, mit({ spitzenfaktor: 1 })), 20 * 10 / 86400, 1e-15);
  nah(M.bedarfBlock(10000, mit({ spitzenfaktor: 10 })) / M.bedarfBlock(10000, mit({ spitzenfaktor: 2 })), 5, 1e-12);
  assert.equal(M.bedarfBlock(5000, mit({ bedarfHaushalt: 0 })), 0);
  assert.equal(M.kantenGewicht(2, P), 1); assert.equal(M.kantenGewicht(1, P), 2); assert.equal(M.kantenGewicht(0, P), 3); assert.equal(M.kantenGewicht(-1, P), 3);
});

test("Spitzenfaktor 5 (Voreinstellung) ergibt den festen Faktor 0.00005787 der .gh-Datei", () => {
  assert.equal(P.spitzenfaktor, 5);
  const alt = 20 * (10000 / 1000) * M.UMRECHNUNG, neu = M.bedarfBlock(10000, P);
  assert.ok(Math.abs(neu - alt) / alt < 1e-5, `${neu} ≠ ${alt}`);
  // ganzes Netz: Gesamtbedarf mit Spitzenfaktor 5 wie mit dem alten Faktor, doppelter Spitzenfaktor → doppelter Bedarf
  const b5 = M.bilanz(Z1, P).bedarf, altGesamt = Z1.verbraucher.reduce((s, v) => s + 20 * v.A / 1000 * M.UMRECHNUNG, 0);
  assert.ok(Math.abs(b5 - altGesamt) / altGesamt < 1e-5);
  const z10 = M.erzeuge(mit({ spitzenfaktor: 10 }), zufall(1));
  nah(M.bilanz(z10, mit({ spitzenfaktor: 10 })).bedarf, 2 * b5, 1e-9);
});

test("Kombinieren (nachgerechnet): Hierarchiewege ganz, Zusatzkanten der Längenwege nur bis zur Schwelle", () => {
  const L = [10, 10, 10, 10, 10, 30];
  const wegeH = [[0, 1], [0, 2]], wegeL = [[0, 3], [0, 4, 5]];
  // Zusatz: Verbraucher 0 → {3} = 10 m, Verbraucher 1 → {4, 5} = 40 m; Remap: 0 und 1
  let K = M.kombiniere(wegeL, wegeH, L, 0.8);
  assert.deepEqual(K.zusatz, [10, 40]); assert.deepEqual(K.behalten, [true, false]);
  assert.deepEqual([...K.kanten].sort(), [0, 1, 2, 3]);
  K = M.kombiniere(wegeL, wegeH, L, 1);
  assert.deepEqual([...K.kanten].sort(), [0, 1, 2, 3, 4, 5]);
  // alle Zusatzlängen gleich (Remap ohne Spanne) → alle behalten
  K = M.kombiniere([[0], [0]], [[0], [0]], L, 0);
  assert.deepEqual(K.behalten, [true, true]);
});

test("Kürzeste Wege: Hierarchieweg ist nie kürzer als der Längenweg, aber nach gewichteten Kosten nie teurer", () => {
  const z = Z1, Sz = z.Sz, len = w => w.reduce((s, k) => s + Sz.L3[k], 0), gew = w => w.reduce((s, k) => s + Sz.L3[k] * M.kantenGewicht(Sz.klasse[k], P), 0);
  z.wegeL.forEach((wl, c) => {
    const wh = z.wegeH[c]; if (!wl) return;
    assert.ok(len(wh) >= len(wl) - 1e-6); assert.ok(gew(wh) <= gew(wl) + 1e-6);
    // Weg endet am Knoten des Verbrauchers
    if (wl.length) { const e = Sz.N.kanten[wl[wl.length - 1]]; assert.ok(e.a === z.verbraucher[c].knoten || e.b === z.verbraucher[c].knoten); }
  });
});

test("Katalogbeschreibung: zwei überlagerte Bäume ergeben ein Netz mit Maschen; gleiche Gewichte → Baum ohne Maschen", () => {
  const b = M.bilanz(Z1, P);
  assert.ok(b.maschen >= 5, "Maschen: " + b.maschen);
  const zg = gerechnet(mit({ gP: 1, gS: 1, gT: 1 }));
  assert.equal(M.bilanz(zg, mit({ gP: 1, gS: 1, gT: 1 })).maschen, 0);
  const z0 = gerechnet(mit({ schwelle: 0 }));
  assert.ok(M.bilanz(z0, mit({ schwelle: 0 })).maschen < b.maschen);
});

test("Ablauf: ein Schritt je Verbraucher, dann Netz, Iterations Dimensionierungsdurchgänge, Analyse", () => {
  const z = M.erzeuge(P, zufall(1)), n = z.verbraucher.length;
  for (let i = 0; i < n; i++) M.schritt(z, P);
  assert.equal(z.phase, "netz"); assert.equal(z.wegeL.length, n);
  M.schritt(z, P); assert.equal(z.phase, "dimension"); assert.ok(z.rohre.length > 0); assert.ok(z.dIdx.every(d => d === 0), "alle Rohre beginnen mit 30 mm");
  for (let j = 0; j < P.iterationen; j++) M.schritt(z, P);
  assert.equal(z.phase, "analyse"); assert.equal(z.vergroessert.length, 4);
  M.schritt(z, P); assert.ok(z.fertig); assert.equal(z.t, n + 1 + 4 + 1);
  M.schritt(z, P); assert.equal(z.t, n + 7);
  const z0 = gerechnet(mit({ iterationen: 0 })); assert.ok(z0.fertig); assert.equal(z0.vergroessert.length, 0);
});

test("Dimensionierung: zu schnelle Rohre werden größer; danach v ≤ Max. Velocity oder größter Durchmesser", () => {
  const p = mit({ flaecheHaushalt: 100, iterationen: 5 }), z = gerechnet(p);
  assert.ok(z.vergroessert[0] > 0, "im ersten Durchgang wird vergrößert");
  assert.ok(z.dIdx.some(d => d > 0));
  z.erg.leitungen.forEach((l, r) => assert.ok(l.v <= p.vMax * 2.5 || z.dIdx[r] === 4));
  assert.ok(Math.max(...z.dIdx) <= 4, "Index bleibt im Gene Pool (kein Umlauf auf 30 mm)");
  // ohne Bedarf: alle 30 mm
  const z0 = gerechnet(mit({ bedarfHaushalt: 0 }));
  assert.ok(z0.dIdx.every(d => d === 0));
});

test("Analyse: Massenbilanz, Zufluss = Bedarf im Netz, Druck = Druckhöhe − Lage, Behälterdruck = Tank Height", () => {
  const z = Z1, b = M.bilanz(z, P);
  assert.ok(H.bilanzfehler(z.netz, z.S) < 1e-9);
  nah(b.zufluss, b.bedarfNetz, 1e-6, "Zufluss");
  z.erg.knoten.forEach((k, i) => nah(k.druck, k.kopf - z.netz.knoten[i].z, 1e-9));
  nah(z.erg.knoten[0].druck, P.tankHoehe, 1e-9);
  // Druck in bar wie in der Datei: Round(m) / 10
  const c = 3, i = z.netz.idx.get(z.verbraucher[c].knoten);
  assert.equal(M.druckBar(z, c), Math.round(z.erg.knoten[i].druck) / 10);
});

test("Hochbehälter versetzen: im Tal werden Drücke negativ (rot), auf dem Berg nicht", () => {
  const p = P, z = gerechnet(p);
  let tief = 0; z.Sz.zK.forEach((h, i) => { if (h < z.Sz.zK[tief]) tief = i; });
  M.setzeTank(z, p, z.Sz.N.knoten[tief]);
  assert.ok(z.fertig, "nach dem Rechnen sofort neu gerechnet");
  assert.equal(z.tankKnoten, tief);
  assert.ok(M.bilanz(z, p).zuWenig > 10, "viele Verbraucher unter 1 bar");
  assert.ok(M.bilanz(Z1, p).zuWenig <= 3);
});

test("aendere: Darstellungswerte rechnen nicht neu; vor dem Start bleibt t = 0", () => {
  const z = M.erzeuge(P, zufall(1));
  M.aendere(z, mit({ tankHoehe: 30 }), "tankHoehe"); assert.equal(z.t, 0); assert.equal(z.phase, "wege");
  const y = gerechnet(P), erg = y.erg; M.aendere(y, mit({ rohrWert: "q" }), "rohrWert"); assert.equal(y.erg, erg);
  M.aendere(y, mit({ tankHoehe: 30 }), "tankHoehe"); assert.ok(y.fertig); nah(y.erg.knoten[0].druck, 30, 1e-9);
});

test("Wiederholbarkeit: gleiche Saat → gleiche Stadt und gleiches Netz, andere Saat → andere", () => {
  const a = gerechnet(P, 4), b = gerechnet(P, 4), c = gerechnet(P, 5);
  assert.deepEqual(a.rohre, b.rohre); assert.deepEqual([...a.dIdx], [...b.dIdx]); assert.deepEqual(a.erg, b.erg);
  assert.notDeepEqual(a.Sz.N.knoten, c.Sz.N.knoten);
});

test("Szene: Straßennetz zusammenhängend, jeder Verbraucher erreichbar", () => {
  const z = Z1, adj = Geo.adjazenz(z.Sz.N);
  const d = Geo.dijkstra(z.Sz.N.knoten.length, i => adj[i].map(({ j }) => [j, 1]), 0).dist;
  assert.ok([...d].every(Number.isFinite));
  assert.ok(z.wegeL.every(w => w !== null));
});
