// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");

const P0 = Object.assign({}, M.STANDARD);
const nah = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const quadrat = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/* ---------------------------------------------------------------- Ablauf */
test("erzeuge: t = 0, Stufe 1 (Straßen), Grenzen steigen", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.t, 0);
  assert.equal(M.stand(z).stufe, 0);
  for (let i = 1; i < 5; i++) assert.ok(z.grenzen[i] >= z.grenzen[i - 1]);
  assert.equal(z.T, z.grenzen[4]);
  assert.ok(z.K.strassen.arme.length > 20 && z.K.behalten.length > 5);
});
test("Schritt: ein Element je Schritt, Stufen nacheinander, fertig nach T Schritten", () => {
  const z = M.erzeuge({}, zufall(1));
  M.schritt(z); assert.equal(z.t, 1); assert.equal(M.sichtbar(z, 0), 1);
  const folge = [];
  while (!M.fertig(z)) { const s = M.stand(z).stufe; if (folge[folge.length - 1] !== s) folge.push(s); M.schritt(z); }
  assert.deepEqual(folge, [0, 1, 2, 3, 4]);
  assert.equal(z.t, z.T); assert.equal(M.stand(z).stufe, 5);
});
test("Nächste Stufe springt an das Ende der laufenden Stufe", () => {
  const z = M.erzeuge({}, zufall(2));
  M.naechsteStufe(z); assert.equal(z.t, z.grenzen[0]); assert.equal(M.stand(z).stufe, 1);
  M.naechsteStufe(z); assert.equal(z.t, z.grenzen[1]);
});
test("Wiederholbarkeit: gleiche Saat → gleiches Netz, andere Saat → anderes", () => {
  const a = M.erzeuge({}, zufall(5)), b = M.erzeuge({}, zufall(5)), c = M.erzeuge({}, zufall(6));
  assert.deepEqual(a.K.strassen.arme, b.K.strassen.arme);
  assert.notDeepEqual(a.K.strassen.arme, c.K.strassen.arme);
});

/* ---------------------------------------------------------------- 1. Street Network Generator */
test("Gene: Länge ∈ [MinLength, MinLength + MaxLength), Winkel ∈ [−RA/2, RA/2), maxArme ∈ [2, MaxArms]", () => {
  const z = zufall(3);
  for (let i = 0; i < 2000; i++) {
    const g = M.gene(z, P0);
    assert.ok(g.laenge >= 30 && g.laenge < 130 && Number.isInteger(g.laenge));
    assert.ok(g.winkel >= -5 && g.winkel < 5);
    assert.ok(g.maxArme >= 2 && g.maxArme <= 4);
  }
});
test("Instruktionsbaum: drei Arm-Plätze je Wurzel, TreeDepth Ebenen", () => {
  const b = M.baum(zufall(1), 2, Object.assign({}, P0, { baumtiefe: 1 }));
  assert.equal(b.anzahl, 6); b.wurzeln.forEach(w => assert.equal(w.kinder.length, 3));
  const b0 = M.baum(zufall(1), 2, Object.assign({}, P0, { baumtiefe: 0 }));
  assert.equal(b0.anzahl, 0);
});
test("Armrichtung: ein Nachbar → geradeaus (180°), zwei gegenüberliegende → senkrecht (90°), kleine Lücke → kein Arm", () => {
  const P = [[0, 0], [-10, 0], [10, 0], [0, 10], [7, 7]];
  assert.equal(M.armRichtung(P, 0, 1, [1], 0), 180);
  nah(M.armRichtung(P, 0, 1, [1, 2], 0), 90);
  // Nachbarn bei 0°, 90°, 135°, 180°, 270° (relativ zu ref) lassen höchstens 90° frei – bei vier Nachbarn bleiben Lücken < 80° nicht
  const Q = [[0, 0], [10, 0], [0, 10], [-10, 0], [0, -10], [7, 7], [7, -7], [-7, 7], [-7, -7]];
  assert.equal(M.armRichtung(Q, 0, 1, [1, 2, 3, 4, 5, 6, 7, 8], 0), null);
});
test("Wachstum: alle Arme liegen im Baufeld (Rand + 1 m), Blöcke füllen das Baufeld", () => {
  const z = M.erzeuge({}, zufall(1)), S = z.S;
  for (const a of z.K.strassen.arme) assert.ok(M.imAussenrand(S, a.b) && M.imAussenrand(S, Geo.lerp(a.a, a.b, 0.5)));
  const roh = z.K.bloecke.reduce((s, b) => s + Geo.flaeche(b.roh), 0);
  nah(roh, Geo.flaeche(S.rand), 1e-3 * Geo.flaeche(S.rand));
});
test("TreeDepth 0: keine neuen Straßen, nur Rand und Startstraßen", () => {
  const z = M.erzeuge({ baumtiefe: 0 }, zufall(1));
  assert.equal(z.K.strassen.arme.length, 0); assert.equal(z.grenzen[0], 0);
  assert.equal(z.K.strassen.art.filter(a => a === M.ART.NEU).length, 0);
});

/* ---------------------------------------------------------------- 2. Blocks */
test("Blocks: Flächen aus Linien – zwei Quadrate nebeneinander", () => {
  const N = { knoten: [[0, 0], [100, 0], [200, 0], [200, 100], [100, 100], [0, 100]], kanten: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 4]].map(([a, b]) => ({ a, b })) };
  const F = M.flaechenAusLinien(N);
  assert.equal(F.length, 2); F.forEach(f => nah(Geo.flaeche(f.poly), 10000));
});
test("Blocks: Versatz −10 m verkleinert ein 100-m-Quadrat auf 80 × 80; minBlockArea filtert", () => {
  const G = M.netzNeu(); [[0, 0], [100, 0], [100, 100], [0, 100]].forEach(q => M.knotenNeu(G, q));
  [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([a, b]) => M.kanteNeu(G, a, b, M.ART.RAND));
  let B = M.bloeckeAus(G, Object.assign({}, P0, { blockVersatz: 10, minBlockFlaeche: 1920 }));
  assert.equal(B.length, 1); assert.ok(B[0].behalten); nah(B[0].A, 6400, 1e-6);
  B = M.bloeckeAus(G, Object.assign({}, P0, { blockVersatz: 10, minBlockFlaeche: 7000 }));
  assert.ok(!B[0].behalten); assert.equal(B[0].grund, "flaeche");
});

/* ---------------------------------------------------------------- 3. Parcels */
test("Parcels: Rechteckblock 200 × 50 bei PlotWidthThreshold 40 → vier Parzellen 50 × 50, Front ∈ [40, 80)", () => {
  const P = M.parzellen(quadrat(0, 0, 200, 50), Object.assign({}, P0, { parzellenBreite: 40 }));
  assert.equal(P.length, 4);
  P.forEach(q => { nah(q.A, 2500, 1e-6); const f = Geo.abstand(q.poly[0], q.poly[1]); assert.ok(f >= 40 && f < 80); assert.ok(q.front[0]); });
  nah(P.reduce((s, q) => s + q.A, 0), 10000, 1e-6);
});
test("Parcels: Kante 0 einer Parzelle ist ihre längste Frontkante", () => {
  const par = M.parzelle([[0, 0], [30, 0], [30, 60], [0, 60]], [[-100, 60], [100, 60], [100, 200], [-100, 200]].reverse());
  // Block liegt unterhalb (y ≥ 60): nur die Kante y = 60 ist Front
  assert.equal(par.front.filter(Boolean).length, 1); assert.ok(par.front[0]);
  nah(par.poly[0][1], 60); nah(par.poly[1][1], 60);
});

/* ---------------------------------------------------------------- 4. Buildable Area */
test("Buildable Area: Rollen – gegenüber der Front hinten, quer dazu seitlich; Eckparzelle ohne hinten", () => {
  const Q = quadrat(0, 0, 50, 50);
  assert.deepEqual(M.kantenRollen(Q, [true, false, false, false], 45), ["front", "seite", "hinten", "seite"]);
  assert.deepEqual(M.kantenRollen(Q, [true, true, false, false], 45), ["front", "front", "seite", "seite"]);
  assert.deepEqual(M.kantenRollen(Q, [false, false, false, false], 45), ["hinten", "hinten", "hinten", "hinten"]);
});
test("Buildable Area: 50 × 50 mit Road 5, Side 3, Back 3 → 44 × 42", () => {
  const par = { poly: quadrat(0, 0, 50, 50), front: [true, false, false, false], A: 2500 };
  const B = M.baufenster(par, Object.assign({}, P0, { strassenAbstand: 5, seitenAbstand: 3, rueckAbstand: 3 }));
  nah(Geo.flaeche(B.poly), 44 * 42, 1e-6);
  const bb = Geo.bbox(B.poly); nah(bb.y0, 5); nah(bb.y1, 47); nah(bb.x0, 3); nah(bb.x1, 47);
  const C = M.baufenster({ poly: quadrat(0, 0, 12, 12), front: [true, false, false, false], A: 144 }, P0);
  assert.equal(C.poly, null);                                    // 8 + 8 m Abstand lassen auf 12 m nichts übrig
});

/* ---------------------------------------------------------------- 5. Building Generation */
const PAR = { poly: quadrat(0, 0, 50, 50), front: [true, false, false, false], A: 2500 };
const BA = quadrat(8, 8, 42, 42);                                // Baufenster bei 8/8/8 m
test("Building Generation, Typ 2 Blockrand: Hof = Front um BuildingDepth versetzt, Grundfläche = Baufenster − Hof", () => {
  const g = M.grundflaeche(BA, PAR, Object.assign({}, P0, { typ: "2", tiefe: 14 }));
  assert.ok(g.loch); nah(Geo.flaeche(g.loch), 34 * 20, 1e-6);
  nah(Geo.flaeche(g.aussen) - Geo.flaeche(g.loch), 34 * 14, 1e-6);
  const voll = M.grundflaeche(BA, PAR, Object.assign({}, P0, { typ: "2", tiefe: 40 }));
  assert.equal(voll.loch, null);                                 // kein Hof gefunden → ganzes Baufenster
});
test("Building Generation, Typ 0 freistehend: Länge × Tiefe mittig an der Frontlinie, sonst absolut gedreht und beschnitten", () => {
  const g = M.grundflaeche(BA, PAR, Object.assign({}, P0, { typ: "0", laenge: 20, tiefe: 14, orientierungAn: false }));
  nah(Geo.flaeche(g.aussen), 280, 1e-6);
  const bb = Geo.bbox(g.aussen); nah(bb.x0, 15); nah(bb.x1, 35); nah(bb.y0, 8); nah(bb.y1, 22);
  const h = M.grundflaeche(BA, PAR, Object.assign({}, P0, { typ: "0", laenge: 20, tiefe: 14, orientierungAn: true, orientierung: 1 }));
  assert.ok(Geo.flaeche(h.aussen) <= 280 + 1e-6 && M.liegtIn(h.aussen, BA));
  const typ7 = M.grundflaeche(BA, PAR, Object.assign({}, P0, { typ: "7", laenge: 20, tiefe: 14, orientierungAn: false }));
  nah(Geo.flaeche(typ7.aussen), 280, 1e-6);                     // andere Werte wie 0
});
test("Building Generation, Typ 1 Zeile: Streifen der Tiefe durch das ganze Baufenster", () => {
  const g = M.grundflaeche(BA, PAR, Object.assign({}, P0, { typ: "1", laenge: 20, tiefe: 14, orientierungAn: false }));
  nah(Geo.flaeche(g.aussen), 34 * 14, 1e-6);
});
test("Geschosse: ceil(FAR · A_Parzelle / A_Grundfläche), FAR 0 → 1 Geschoss", () => {
  const g = M.geschosse(0.5, 2500, 476, 4);
  assert.equal(g.n, 3); nah(g.gfa, 1428); nah(g.far, 0.5712); nah(g.hoehe, 12);
  assert.equal(M.geschosse(0, 2500, 476, 4).n, 1);
  assert.equal(M.geschosse(0.5, 1000, 500, 4).n, 1);
});
test("Parzelle ohne Straßenfront bekommt kein Gebäude (wie im Original)", () => {
  const g = M.grundflaeche(BA, { poly: PAR.poly, front: [false, false, false, false], A: 2500 }, P0);
  assert.equal(g.aussen, null); assert.equal(g.grund, "front");
});

/* ---------------------------------------------------------------- Placement on Parcel */
test("Vorlagen: jeder Baukörper gehört zur nächsten Kante der Vorlage", () => {
  const Z = M.vorlageZuordnen(M.VORLAGEN.find(v => v.id === "riegel"));
  assert.deepEqual(Z.map(o => o.kante), [0, 2]);
  nah(Z[0].pos, 21); nah(Z[1].pos, 31);                          // Längsposition ab Kantenanfang (Kante 2 läuft von x = 48 nach x = 0)
});
test("Vorlage auf gleich großer Parzelle: Baukörper an derselben Stelle; zu kurze Kante: Baukörper fällt weg", () => {
  const V = M.VORLAGEN.find(v => v.id === "riegel"), Z = M.vorlageZuordnen(V);
  const s = M.setzeVorlage({ poly: quadrat(0, 0, 48, 40) }, Z);
  assert.equal(s.objekte.length, 2);
  s.objekte.forEach((o, i) => nah(Geo.flaeche(o.poly), Geo.flaeche(V.objekte[i][0]), 1e-9));
  const bb = Geo.bbox(s.objekte[0].poly); nah(bb.x0, 5); nah(bb.x1, 37); nah(bb.y0, 4); nah(bb.y1, 16);
  const k = M.setzeVorlage({ poly: quadrat(0, 0, 30, 40) }, Z);
  assert.ok(k.objekte.every(o => !M.raenderSchneiden(o.poly, quadrat(0, 0, 30, 40))) && k.verworfen >= 1);
});
test("Vorlage folgt der Parzelle: gedrehte Parzelle → gedrehte Baukörper, Kante i nimmt Vorlagenkante i mod 4", () => {
  const w = 0.6, c = Math.cos(w), s = Math.sin(w), R = q => [100 + c * q[0] - s * q[1], 50 + s * q[0] + c * q[1]];
  const Z = M.vorlageZuordnen(M.VORLAGEN.find(v => v.id === "punkt"));
  const a = M.setzeVorlage({ poly: quadrat(0, 0, 48, 40) }, Z), b = M.setzeVorlage({ poly: quadrat(0, 0, 48, 40).map(R) }, Z);
  assert.equal(a.objekte.length, b.objekte.length);
  a.objekte.forEach((o, i) => o.poly.forEach((q, j) => { const r = R(q); nah(b.objekte[i].poly[j][0], r[0], 1e-9); nah(b.objekte[i].poly[j][1], r[1], 1e-9); }));
  const fuenf = M.setzeVorlage({ poly: [[0, 0], [60, 0], [70, 30], [35, 60], [0, 40]] }, Z);
  assert.ok(fuenf.objekte.every(o => o.kante < 5));
});

/* ---------------------------------------------------------------- Kette wie im Katalog */
test("Katalog: Kette Straßen → Blöcke → Parzellen → Baufenster → Gebäude; jedes Gebäude im Baufenster seiner Parzelle, erreichte FAR ≥ Ziel", () => {
  const z = M.erzeuge({}, zufall(1)), K = z.K;
  assert.ok(K.summe.gebaeude > 20);
  K.je.forEach((j, bi) => {
    j.parzellen.forEach(par => assert.ok(M.liegtIn(par.poly, K.behalten[bi].poly, 0.05)));
    j.gebaeude.forEach(g => {
      const B = j.baufenster[g.parzelle].poly;
      assert.ok(M.liegtIn(g.aussen, B, 0.05));
      assert.ok(g.far >= M.STANDARD.gfz - 1e-9);
    });
  });
  const bloeckeA = K.behalten.reduce((s, b) => s + b.A, 0);
  nah(K.summe.flaecheParzellen, bloeckeA, 1e-6 * bloeckeA);   // Parzellen füllen die Blöcke lückenlos
});
test("Katalog: kleine Grundflächen (≤ MinBuildingFootprintArea) werden aussortiert", () => {
  const z = M.erzeuge({ typ: "0", laenge: 8, tiefe: 6 }, zufall(1));
  assert.ok(z.K.gebaeude.length > 0 && z.K.gebaeude.every(g => !g.behalten)); assert.equal(z.K.summe.gebaeude, 0);
});
test("Placement: Vorlagen zufällig je Parzelle, alle Baukörper in ihrer Parzelle", () => {
  const z = M.erzeuge({ vorlagen: true }, zufall(1)), K = z.K;
  assert.ok(K.gebaeude.length > 50);
  assert.ok(new Set(K.gebaeude.map(g => g.vorlage)).size >= 3);
  K.gebaeude.forEach(g => { const par = K.je[g.block].parzellen[g.parzelle].poly; assert.ok(M.liegtIn(g.aussen, par, 1e-6) && !M.raenderSchneiden(g.aussen, par)); });
  const nur = M.erzeuge({ vorlagen: true, vorlage: "reihe" }, zufall(1));
  assert.ok(nur.K.gebaeude.every(g => g.vorlage === "reihe"));
});
test("aendere: fertiger Lauf bleibt fertig, Straßen bleiben bei Gebäudeparametern gleich; verschiebe rechnet neu", () => {
  const z = M.erzeuge({}, zufall(1)), p = Object.assign({}, P0);
  z.t = z.T; const arme = z.K.strassen.arme;
  p.tiefe = 10; M.aendere(z, p, "tiefe");
  assert.ok(M.fertig(z)); assert.equal(z.K.strassen.arme, arme);
  const vorher = JSON.stringify(z.K.strassen.segmente);
  M.verschiebe(z, p, { art: "rand", i: 2 }, [z.S.rand[2][0] - 60, z.S.rand[2][1] + 40]);
  assert.notEqual(JSON.stringify(z.K.strassen.segmente), vorher); assert.ok(M.fertig(z));
  assert.deepEqual(M.griffBei(z, z.S.rand[0], 5), { art: "rand", i: 0 });
});
