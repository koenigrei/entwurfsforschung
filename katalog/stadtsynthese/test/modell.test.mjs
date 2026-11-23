// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");

const P = (x = {}) => Object.assign({}, M.STANDARD, x);
const nahe = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const lauf = (saat = 1, x = {}) => { const p = P(x), z = M.erzeuge(p, zufall(saat)); M.rechneAlles(z, p); return { z, p, K: M.kennzahlen(z, p) }; };
const netzAus = S => Geo.netz(S, 1e-6);

/* ---------------------------------------------------------------- 1 Street Network Synthesis */
test("Zufall der Straßensaat ist wiederholbar und unabhängig", () => {
  const a = M.prng(3), b = M.prng(3), c = M.prng(4);
  const A = [a(), a(), a()], B = [b(), b(), b()], C = [c(), c(), c()];
  assert.deepEqual(A, B); assert.notDeepEqual(A, C);
  assert.ok(A.every(x => x >= 0 && x < 1));
});

test("Gene: Länge ∈ [MinLength, MinLength + MaxLength), Winkel ∈ [−RA/2, RA/2), Grad ∈ [2, MaxArms]", () => {
  const r = M.prng(1), p = P();
  for (let i = 0; i < 500; i++) {
    const g = M.gene(r, p);
    assert.ok(g.laenge >= 30 && g.laenge < 130 && Number.isInteger(g.laenge));
    assert.ok(g.winkel >= -10 && g.winkel < 10);
    assert.ok(g.maxArme >= 2 && g.maxArme <= 4);
  }
});

test("Instruktionsbaum: drei Arm-Plätze je Wurzel, TreeDepth 0 ohne Knoten, Größe begrenzt", () => {
  const b1 = M.baum(M.prng(1), 5, P({ baumtiefe: 1 }));
  assert.equal(b1.anzahl, 15);                                  // Ebene 1: ein Kind je Platz, 5 Wurzeln × 3 Plätze
  assert.ok(b1.wurzeln.every(w => w.kinder.length === 3));
  assert.equal(M.baum(M.prng(1), 5, P({ baumtiefe: 0 })).anzahl, 0);
  assert.ok(M.baum(M.prng(1), 20, P({ baumtiefe: 20 })).anzahl <= M.INTERN.maxKnoten);
});

test("Armrichtung: geradeaus, Winkelhalbierende der größten Lücke", () => {
  const Pk = [[0, 0], [-10, 0], [0, -10], [10, 0], [0, 10], [7, -7.2]];
  assert.equal(M.armRichtung(Pk, 0, 1, [1], 0.5), 180);                     // ein Nachbar: geradeaus
  assert.equal(M.armRichtung(Pk, 0, 1, [1, 3], 0.5), 90);                   // zwei Lücken à 180°: senkrecht
  assert.equal(M.armRichtung(Pk, 0, 1, [1, 2, 3, 4], 0.5), 45);             // vier Lücken à 90° (≥ 80°): Mitte der ersten
});

test("Armrichtung: Lücken unter 80° schließen den Knoten", () => {
  const Pk = [[0, 0]]; for (let i = 0; i < 5; i++) Pk.push([Math.cos(i * 72 * Math.PI / 180) * 10, Math.sin(i * 72 * Math.PI / 180) * 10]);
  assert.equal(M.armRichtung(Pk, 0, 1, [1, 2, 3, 4, 5], 0.5), null);        // fünf Lücken à 72°
});

test("Wachstum: neue Straßen liegen im Gebiet, das Netz ist eben (keine echten Kreuzungen ohne Knoten)", () => {
  const p = P(), z = M.erzeuge(p, zufall(2)), W = M.wachstumStart(z.S, p);
  let n = 0; for (let i = 0; i < p.baumtiefe; i++) n += M.wachstumEbene(W, z.S, p);
  assert.ok(n > 20, "Arme gesetzt: " + n);
  const S = M.segmenteVon(W.G), aussen = Geo.versetze(z.S.rand, -1.5);
  for (const s of S) for (const q of s) assert.ok(Geo.punktInPoly(q, aussen));
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const c = Geo.segmentSchnitt(S[i][0], S[i][1], S[j][0], S[j][1]);
    if (c) assert.ok(c.t < 1e-6 || c.t > 1 - 1e-6, "Kreuzung ohne Knoten");
  }
});

/* ---------------------------------------------------------------- 2 Cul de sac removal */
test("Sackgassen: je Durchgang fällt das letzte Stück jeder Sackgasse weg", () => {
  const Q = [[[0, 0], [10, 0]], [[10, 0], [10, 10]], [[10, 10], [0, 10]], [[0, 10], [0, 0]], [[10, 0], [20, 0]], [[20, 0], [30, 0]]];
  const N = netzAus(Q);
  assert.equal(M.sackgassenEntfernen(N, 1).N.kanten.length, 5);
  const r2 = M.sackgassenEntfernen(N, 2);
  assert.equal(r2.N.kanten.length, 4); assert.equal(r2.weg.length, 2);
  assert.equal(M.sackgassenEntfernen(N, 0).N.kanten.length, 6);
});

/* ---------------------------------------------------------------- 3 CityGraph */
test("Betweenness (metrisch, Start und Ziel zählen): Kette aus drei Segmenten → 4, 6, 4", () => {
  const bc = M.betweenness(netzAus([[[0, 0], [10, 0]], [[10, 0], [20, 0]], [[20, 0], [30, 0]]]));
  assert.deepEqual(Array.from(bc), [4, 6, 4]);
});

/* ---------------------------------------------------------------- 4 Blöcke */
test("Custom offset: Quadrat 100 m, alle Kanten 10 m nach innen → 80 × 80 m", () => {
  const Q = M.versetzeKanten([[0, 0], [100, 0], [100, 100], [0, 100]], [-10, -10, -10, -10]);
  assert.ok(nahe(Geo.flaeche(Q), 6400, 1e-6));
});

test("Straßenbreite aus der Zentralität: Versatz je Kante = BC^ExpScaling × LinearScaling", () => {
  const S = [];
  for (let i = 0; i <= 3; i++) { S.push([[i * 100, 0], [i * 100, 100]]); }
  for (let i = 0; i < 3; i++) { S.push([[i * 100, 0], [(i + 1) * 100, 0]]); S.push([[i * 100, 100], [(i + 1) * 100, 100]]); }
  const N = netzAus(S), bc = M.betweenness(N), p = P({ vereinfachen: 0, minBlock: 0 });
  const { bloecke } = M.bloeckeAusNetz(N, bc, p);
  assert.equal(bloecke.length, 3);
  for (const b of bloecke) b.kanten.forEach((k, i) => assert.ok(nahe(b.versatz[i], Math.sqrt(bc[k]) * 0.12)));
  // Zentralität je Block: größte √BC, auf 0…1 umgerechnet; der mittlere Block liegt an den meistbenutzten Segmenten
  const mitte = bloecke.find(b => nahe(Geo.schwerpunkt(b.roh)[0], 150, 1));
  assert.equal(mitte.z, 1);
});

test("MinBlockSize: kleinere Flächen werden Plätze statt Blöcke", () => {
  const S = [[[0, 0], [40, 0]], [[40, 0], [40, 40]], [[40, 40], [0, 40]], [[0, 40], [0, 0]]];
  const N = netzAus(S), r = M.bloeckeAusNetz(N, M.betweenness(N), P());
  assert.equal(r.bloecke.length, 0); assert.equal(r.plaetze.length, 1);
});

test("Polyline Collapse und Simplify: kurze Kante und fast gerade Ecke verschwinden", () => {
  const Q = M.vereinfache([[0, 0], [50, 0], [52, 0.5], [100, 0], [100, 100], [0, 100]], 12);
  assert.equal(Q.length, 4);
  assert.ok(nahe(Geo.flaeche(Q), 10000, 60));
});

/* ---------------------------------------------------------------- 5 Parzellen */
test("Slicing Tree: Block 100 × 40 m, parcelWidth 20 → vier Parzellen 25 × 40 m", () => {
  const T = M.parzelliere([[0, 0], [100, 0], [100, 40], [0, 40]], 20);
  assert.equal(T.length, 4);
  for (const q of T) { assert.ok(nahe(Geo.flaeche(q), 1000, 1e-6)); assert.ok(Geo.flaecheS(q) > 0); }
});

test("parcelWidth: aus der Zentralität (√BC / Teiler) oder fest, nie unter 4 m", () => {
  assert.equal(M.parzellenBreite({ c: 60 }, P()), 20);
  assert.equal(M.parzellenBreite({ c: 60 }, P({ parzellenModus: "fest" })), 35);
  assert.equal(M.parzellenBreite({ c: 3 }, P()), 4);
});

/* ---------------------------------------------------------------- 6 Buildable Area */
const BLOCK = [[0, 0], [100, 0], [100, 80], [0, 80]];
test("Kantenrollen: Mittelparzelle front/side/back, Eckparzelle zwei Fronten und Seiten", () => {
  assert.deepEqual(M.kantenRollen([[25, 0], [50, 0], [50, 40], [25, 40]], BLOCK), ["front", "side", "back", "side"]);
  assert.deepEqual(M.kantenRollen([[0, 0], [25, 0], [25, 40], [0, 40]], BLOCK), ["front", "side", "side", "front"]);
  assert.deepEqual(M.kantenRollen([[30, 30], [60, 30], [60, 50], [30, 50]], BLOCK), ["back", "back", "back", "back"]);   // ohne Straße
});

test("Baufenster: Rücksprünge 5 (Straße), 3 (Seite), 3 (hinten) → 19 × 32 m", () => {
  const q = [[25, 0], [50, 0], [50, 40], [25, 40]], ba = M.baufenster(q, M.kantenRollen(q, BLOCK), P());
  assert.ok(nahe(Geo.flaeche(ba), 19 * 32, 1e-6));
});

/* ---------------------------------------------------------------- 7 Building Generation */
test("Gebäudetyp = Round(Zentralität · 3); 3 gilt wie jeder andere Wert als freistehend", () => {
  assert.deepEqual([0, 0.2, 0.5, 0.7, 0.9, 1].map(M.gebaeudeTyp), [0, 1, 2, 2, 0, 0]);
});

test("Geschosse: ⌈FAR · Parzelle / Grundfläche⌉, FAR 0 → 1, gedeckelt durch BHMax", () => {
  assert.equal(M.geschosse(0, 1000, 300, P()), 1);
  assert.equal(M.geschosse(1, 1000, 300, P()), 4);
  assert.equal(M.geschosse(5, 1000, 300, P()), 9);                // 27 m / 3 m
  assert.equal(M.geschosse(5, 1000, 300, P({ maxHoehe: 10 })), 3);
});

test("Grundrisse im Baufenster 44 × 32 m: freistehend 30 × 10, Zeile und Blockrand 44 × 10", () => {
  const q = [[0, 0], [50, 0], [50, 40], [0, 40]], blk = [[-50, 0], [100, 0], [100, 80], [-50, 80]];
  const r = M.kantenRollen(q, blk), p = P(), ba = M.baufenster(q, r, p);
  assert.ok(nahe(Geo.flaeche(ba), 44 * 32, 1e-6));
  const A = t => M.grundriss(t, q, r, ba, p).reduce((s, x) => s + Geo.flaeche(x), 0);
  assert.ok(nahe(A(0), 300, 1e-6)); assert.ok(nahe(A(1), 440, 1e-6)); assert.ok(nahe(A(2), 440, 1e-6));
  // freistehend sitzt an der Baulinie (5 m hinter der Straße)
  const g = M.grundriss(0, q, r, ba, p)[0];
  assert.ok(nahe(Math.min(...g.map(x => x[1])), 5, 1e-6));
});

test("Blockrand an einer Ecke: zwei Fronten ergeben einen Winkel", () => {
  const q = [[0, 0], [40, 0], [40, 40], [0, 40]], blk = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const r = M.kantenRollen(q, blk), p = P(), ba = M.baufenster(q, r, p);
  const T = M.grundriss(2, q, r, ba, p), A = T.reduce((s, x) => s + Geo.flaeche(x), 0);
  // Baufenster x 5…37, y 5…37 (32 × 32), Hof x 15…37, y 15…37 → 1024 − 484 = 540 m²
  assert.ok(nahe(A, 540, 1e-6));
});

/* ---------------------------------------------------------------- 8 Kennzahlen */
test("Kreuzungen und Konnektivität eines Rasters 3 × 3 Knoten", () => {
  const S = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { S.push([[i * 10, j * 10], [i * 10, (j + 1) * 10]]); S.push([[j * 10, i * 10], [(j + 1) * 10, i * 10]]); }
  const k = M.kreuzungen(netzAus(S));
  assert.equal(k.t, 4); assert.equal(k.x, 1); assert.ok(nahe(k.konnektivitaet, 12 / 9));
});

test("mittlerer Weg: zwei Segmente einer Geraden zum Ziel am Anfang → 5 und 15 m, im Mittel 10 m", () => {
  const S = [[[0, 0], [10, 0]], [[10, 0], [20, 0]]], N = netzAus(S);
  assert.ok(nahe(M.mittlererWeg(N, S, [[0, 0]]), 10));
});

/* ---------------------------------------------------------------- Ablauf */
test("erzeuge liefert t = 0 und Stufe 0; Schritte zählen um 1, das Wachstum braucht je Ebene einen Schritt", () => {
  const p = P(), z = M.erzeuge(p, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.stufe, 0);
  M.schritt(z, p); assert.equal(z.t, 1); assert.equal(z.stufe, 1); assert.equal(z.W.nr, 1);
  M.schritt(z, p); assert.equal(z.stufe, 1); assert.equal(z.W.nr, 2);
  let n = 2; while (!M.fertig(z)) { M.schritt(z, p); n++; }
  assert.ok(n <= p.baumtiefe + 7, "Schritte bis zum Ende: " + n);
  M.schritt(z, p); assert.equal(z.t, n + 1); assert.equal(z.stufe, 8);
});

test("Wiederholbarkeit: gleiche Saaten gleich, andere Szene oder Straßensaat anders", () => {
  const a = lauf(1).K, b = lauf(1).K, c = lauf(2).K, d = lauf(1, { saatStrassen: 7 }).K;
  assert.deepEqual(a, b);
  assert.notEqual(a.netzLaenge, c.netzLaenge);
  assert.notEqual(a.netzLaenge, d.netzLaenge);
});

test("Kette: Gebäude im Gebiet, auf ihren Parzellen, Höhe ≤ BHMax, Grundfläche ≥ 60 m², GFZ aus der Zentralität", () => {
  const { z, p, K } = lauf(3);
  assert.ok(K.gebaeude > 50 && K.parzellen > K.gebaeude * 0.5);
  for (const g of z.gebaeude) {
    assert.ok(g.hoehe <= p.maxHoehe && g.A >= p.minGrundflaeche);
    assert.ok(nahe(g.far, g.z * p.gfzFaktor));
    const q = z.parzellen[g.parzelle].poly;
    for (const t of g.teile) assert.ok(Geo.punktInPoly(Geo.schwerpunkt(t), q));
  }
  assert.ok(K.oeffentlichPrivat > 0 && K.oeffentlichPrivat < 2);
  assert.ok(K.grz > 0 && K.grz < 1 && K.gfz > K.grz);
});

test("Katalogbeschreibung: die Zentralität steuert Straßenbreite, Gebäudetyp und Dichte", () => {
  const { z } = lauf(1);
  // die breiteste Straße (größter Versatz) liegt am Segment mit der größten Betweenness
  let kMax = 0; z.bc.forEach((v, k) => { if (v > z.bc[kMax]) kMax = k; });
  let vMax = 0, kV = -1; for (const b of z.bloecke) b.kanten.forEach((k, i) => { if (b.versatz[i] > vMax) { vMax = b.versatz[i]; kV = k; } });
  assert.equal(z.bc[kV], z.bc[kMax]);
  // Blockrand an zentraleren Blöcken als Zeilen; dichtere Bebauung (GFZ) an zentralen Blöcken
  const mittel = typ => { const L = z.gebaeude.filter(g => g.typ === typ); return L.reduce((s, g) => s + g.z, 0) / L.length; };
  assert.ok(mittel(2) > mittel(1));
});

test("Größeres LinearScaling → breitere Straßen, weniger Bauland", () => {
  assert.ok(lauf(1, { linSkalierung: 0.3 }).K.bauland < lauf(1).K.bauland);
});

test("Relative Integration und Wege: das neue Quartier verknüpft die Umgebung", () => {
  const { K } = lauf(1);
  assert.ok(K.relIntegration > 1, "NAIN mit/ohne = " + K.relIntegration);
  assert.ok(K.wegFreiraum < K.wegBildung);
  assert.ok(K.geschaeft > 0 && K.geschaeft < K.netzLaenge);
});

test("Grenzfall TreeDepth 0: keine neuen Straßen, die Kette läuft trotzdem durch", () => {
  const { z, K } = lauf(1, { baumtiefe: 0 });
  assert.equal(z.stufe, 8);
  assert.equal(z.W.gesetzt, 0);
  assert.ok(K.segmente <= z.S.rand.length + 2 * z.S.start.length);          // nur Rand, die Stiche sind Sackgassen
});

test("aendere rechnet bis zum aktuellen Schritt neu; Darstellung ändert nichts", () => {
  const p = P(), z = M.erzeuge(p, zufall(1));
  for (let i = 0; i < 20; i++) M.schritt(z, p);
  const L0 = M.kennzahlen(z, p).bauland;
  p.linSkalierung = 0.3; M.aendere(z, p, "linSkalierung");
  assert.equal(z.t, 20); assert.equal(z.stufe, 8); assert.ok(M.kennzahlen(z, p).bauland < L0);
  const g = z.gebaeude; p.drehung = 90; M.aendere(z, p, "drehung"); assert.equal(z.gebaeude, g);
});

test("Ecke verschieben: Gebiet und Anschlussstraßen neu, Kette bis zum aktuellen Schritt", () => {
  const p = P(), z = M.erzeuge(p, zufall(1));
  for (let i = 0; i < 20; i++) M.schritt(z, p);
  const A0 = Geo.flaeche(z.S.rand), i = M.griffBei(z, z.S.rand[0], 5);
  assert.equal(i, 0);
  M.verschiebe(z, p, 0, [z.S.rand[0][0] - 40, z.S.rand[0][1] - 30]);
  assert.ok(Geo.flaeche(z.S.rand) > A0); assert.equal(z.stufe, 8);
  for (const pl of z.S.start) assert.ok(Geo.punktInPoly(pl[1], z.S.rand));
});
