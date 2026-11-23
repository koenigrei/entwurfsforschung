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
const nah = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);

/** feste „Zufalls“funktion für Tests: liefert die Werte der Liste der Reihe nach (dann wieder von vorn) */
function folge(werte) { let i = 0; const f = () => werte[i++ % werte.length]; f.ganz = n => Math.floor(f() * n); return f; }
/** kleine Szene: Quadrat 100 × 100, eine Startstraße von außen bis zur Mitte */
const QUADRAT = { b: 100, h: 100, rand: [[0, 0], [100, 0], [100, 100], [0, 100]], start: [[[-20, 50], [50, 50]]], umgebung: [] };
const kopie = S => JSON.parse(JSON.stringify(S));

test("erzeuge: t = 0, Generation 0 mit Nr Parents Zufallsnetzen, Archiv und gezeigte Variante", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.gen, 0);
  assert.equal(z.alle.length, 10); assert.ok(z.archiv.length >= 1 && z.archiv.length <= 10);
  assert.equal(z.wahl, M.sortiert(z)[0].id);
  for (const x of z.alle) { assert.ok(x.n > 20, "zu kleines Netz: " + x.n); assert.ok(x.f1 > 0 && x.f2 > 0); }
});

test("Armrichtung: geradeaus, Winkelhalbierende der größten Lücke, Lücke < 80° → kein Arm, Lücke ≥ 260° → Versatz", () => {
  const pol = w => [Math.cos(w * Math.PI / 180) * 10, Math.sin(w * Math.PI / 180) * 10];
  const Pk = (...w) => [[0, 0], ...w.map(pol)];                   // Knoten 0 in der Mitte, Nachbarn 1, 2, …
  assert.equal(M.armRichtung(Pk(0), 0, 1, [1], 0), 180);
  nah(M.armRichtung(Pk(0, 180), 0, 1, [1, 2], 0), 90);              // zwei gleich große Lücken → die erste
  nah(M.armRichtung(Pk(0, 90, 180), 0, 1, [1, 2, 3], 0), 270);      // T-Kreuzung → in die freie Hälfte
  nah(M.armRichtung(Pk(0, 70, 140, 210, 280), 0, 1, [1, 2, 3, 4, 5], 0), 320); // Lücke genau 80° reicht
  assert.equal(M.armRichtung(Pk(0, 60, 120, 180, 240, 300), 0, 1, [1, 2, 3, 4, 5, 6], 0), null);
  // Lücke 320° ≥ 260°: Lücke' = 90 + 90 · ⌊teiler · ⌈320 / 90⌉⌋ → Richtung = 40 + Lücke' / 2
  nah(M.armRichtung(Pk(0, 40), 0, 1, [1, 2], 0), 85);
  nah(M.armRichtung(Pk(0, 40), 0, 1, [1, 2], 0.99), 220);
});

test("Gene: ganze Grad in [−RandomAngle/2, RandomAngle/2), ganze Meter in [MinLength, MinLength + MaxLength), Grad 2…MaxArms", () => {
  const r = zufall(4);
  for (let i = 0; i < 2000; i++) {
    const g = M.gene(r, P);
    assert.ok(Number.isInteger(g.winkel) && g.winkel >= -5 && g.winkel <= 4);
    assert.ok(Number.isInteger(g.laenge) && g.laenge >= 30 && g.laenge <= 129);
    assert.ok(g.maxArme >= 2 && g.maxArme <= 4);
  }
  assert.deepEqual(M.gene(folge([0]), P), { winkel: -5, laenge: 30, maxArme: 2, teiler: 0 });
});

test("Instruktionsbaum: drei Arm-Plätze je Wurzel, Ebenen nach TreeDepth (nachgerechnet mit MaxArms 1)", () => {
  // MaxArms = 1 → k = 1: jeder Knoten hat genau einen Platz → je Ebene 3 Knoten je Wurzel
  const b = M.baum(zufall(1), 4, mit({ maxArme: 1, baumtiefe: 5 }));
  assert.equal(b.anzahl, 4 * 3 * 5); assert.equal(M.zaehle(b), 60);
  assert.equal(b.wurzeln.length, 4); assert.ok(b.wurzeln.every(w => w.kinder.length === 3));
  assert.equal(M.baum(zufall(1), 4, mit({ baumtiefe: 0 })).anzahl, 0);
  // bis Ebene 3 werden alle k − 1 Zusatzplätze vergeben: mit k = MaxArms − 1 = 3 (Zufall knapp unter 1) verdreifacht sich jede Ebene
  const b3 = M.baum(folge([0.999]), 1, mit({ baumtiefe: 3 }));
  assert.equal(b3.anzahl, 3 + 9 + 27);
  // Obergrenze
  assert.ok(M.baum(zufall(2), 15, mit({ baumtiefe: 20 })).anzahl <= M.INTERN.maxKnoten);
});

test("Kreuzung und Mutation: Teilbäume je Arm-Platz von einem Elternteil; Mutation zieht Gene neu", () => {
  const p = mit({ baumtiefe: 3 }), a = M.baum(zufall(1), 3, p), b = M.baum(zufall(2), 3, p);
  const nurA = M.kreuze(a, b, folge([0.1])), nurB = M.kreuze(a, b, folge([0.9]));
  assert.deepEqual(nurA.wurzeln, a.wurzeln); assert.deepEqual(nurB.wurzeln, b.wurzeln);
  const mix = M.kreuze(a, b, folge([0.1, 0.9]));
  mix.wurzeln.forEach((w, i) => w.kinder.forEach((k, j) => assert.deepEqual(k, (i * 3 + j) % 2 === 0 ? a.wurzeln[i].kinder[j] : b.wurzeln[i].kinder[j])));
  assert.equal(mix.anzahl, M.zaehle(mix));
  const c = M.kopiereBaum(a);
  M.mutiere(c, zufall(3), p, 0); assert.deepEqual(c.wurzeln, a.wurzeln);
  M.mutiere(c, zufall(3), p, 1); assert.notDeepEqual(c.wurzeln, a.wurzeln); assert.equal(M.zaehle(c), M.zaehle(a));
});

test("Grundnetz: Rand und Startstraße werden an der Kreuzung geteilt, Wurzeln an den Stützpunkten", () => {
  const { G, wurzeln } = M.grundnetz(QUADRAT);
  const E = G.E.filter(e => e.lebt);
  assert.equal(E.filter(e => e.art === M.ART.RAND).length, 5);     // linke Seite bei (0, 50) geteilt
  assert.equal(E.filter(e => e.art === M.ART.START).length, 2);    // (−20, 50)–(0, 50) und (0, 50)–(50, 50)
  assert.deepEqual(wurzeln.map(v => G.P[v]), [[-20, 50], [50, 50]]);
  const k = G.P.findIndex(q => q[0] === 0 && q[1] === 50); assert.equal(G.adj[k].length, 4);                               // zwei Randhälften, Straße außen und innen
});

test("Arm: endet am Rand (geschlossen), fängt an Knoten, teilt gekreuzte Straßen, verwirft Ziele außerhalb", () => {
  const { G } = M.grundnetz(QUADRAT), mitte = G.P.findIndex(q => q[0] === 50 && q[1] === 50);
  const a = M.arm(G, QUADRAT, mitte, [150, 50], 20, 4);           // über den rechten Rand hinaus
  assert.deepEqual(G.P[a.v], [100, 50]); assert.equal(a.zu, true);
  const b = M.arm(G, QUADRAT, mitte, [50, 92], 20, 4);            // 8 m vor dem Rand → Fußpunkt auf dem Rand
  assert.deepEqual(G.P[b.v], [50, 100]); assert.equal(b.zu, true);
  assert.equal(M.arm(G, QUADRAT, b.v, [12, 100], 20, 4), null);   // fängt an (0, 100), das schon mit (50, 100) verbunden ist
  const c = M.arm(G, QUADRAT, mitte, [88, 12], 20, 4);              // nahe an der Ecke (100, 0) → Knoten gefangen
  assert.deepEqual(G.P[c.v], [100, 0]); assert.equal(c.zu, true);
  // ein Arm von (25, 80) nach (25, 20) kreuzt die Startstraße bei (25, 50): Kreuzung wird geteilt, Arm bleibt offen
  const v = M.knotenNeu(G, [25, 80]); M.kanteNeu(G, c.v, v, M.ART.NEU);
  const d = M.arm(G, QUADRAT, v, [25, 20], 5, 4);
  assert.deepEqual(G.P[d.v], [25, 50]); assert.equal(d.zu, false); assert.equal(G.adj[d.v].length, 3);
  assert.equal(M.arm(G, QUADRAT, mitte, [50, -60], 5, 4).v >= 0, true); // trifft oben den Rand
  const w = M.knotenNeu(G, [-30, 70]);                              // Knoten außerhalb: Ziel außerhalb → verworfen
  assert.equal(M.arm(G, QUADRAT, w, [-60, 70], 5, 4), null);
});

test("Wachstum: ebenes Netz (keine echten Kreuzungen ohne Knoten), alle neuen Punkte im äußeren Rand, wiederholbar", () => {
  const S = M.szene(), b = M.baum(zufall(7), 15, P), ph = M.wachse(b, S, P);
  assert.ok(ph.gesetzt > 20);
  const s = ph.segmente;
  for (let i = 0; i < s.length; i++) {
    if (ph.art[i] === M.ART.NEU) for (const q of s[i]) assert.ok(M.imAussenrand(S, q) || S.start.flat().some(x => Geo.abstand(x, q) < 1e-9), "außerhalb: " + q);
    for (let j = i + 1; j < s.length; j++) {
      const x = Geo.segmentSchnitt(s[i][0], s[i][1], s[j][0], s[j][1]);
      if (x) assert.ok(x.t < 1e-6 || x.t > 1 - 1e-6, `Segmente ${i} und ${j} kreuzen sich ohne Knoten`);
    }
  }
  assert.deepEqual(M.wachse(b, S, P).segmente, s);
});

test("Closeness n / Σd (nachgerechnet) und gleich Geo.segmentClosenessVon(…).dcs2020; Fitness f1 und f2", () => {
  // drei Segmente je 10 m in einer Linie, kL = 1, kW = 0: Schrittkosten = 1 · 10 / 10 = 1
  const segs = [[[0, 0], [10, 0]], [[10, 0], [20, 0]], [[20, 0], [30, 0]]];
  const G = Geo.richtungsGraph(Geo.netz(segs), { kL: 1, kW: 0, norm: "dcs2020" });
  const cc = M.naehe(G);
  nah(cc[0], 2 / 3); nah(cc[1], 1); nah(cc[2], 2 / 3);
  const B = M.bewerte(segs, mit({ kL: 1, kW: 0 }));
  nah(B.L, 30); nah(B.f1, 10000 / (30 + 0.000001)); nah(B.f2, 1);
  // Vergleich mit Geo an einem erzeugten Netz (Winkel und Längen gemischt)
  const ph = M.wachse(M.baum(zufall(3), 15, P), M.szene(), P);
  const N = Geo.netz(ph.segmente, 1), H = Geo.richtungsGraph(N, { kL: P.kL, kW: P.kW, norm: "dcs2020" }), c2 = M.naehe(H);
  for (let s = 0; s < H.n; s += 7) nah(c2[s], Geo.segmentClosenessVon(H, s).dcs2020, 1e-6);
});

test("Dominanz, Pareto-Front und SPEA2 (nachgerechnet)", () => {
  const I = (id, f1, f2) => ({ id, f1, f2 });
  const pop = [I(0, 1, 3), I(1, 2, 2), I(2, 3, 1), I(3, 3, 3), I(4, 4, 4)];
  assert.ok(M.dominiert(pop[1], pop[3])); assert.ok(!M.dominiert(pop[0], pop[2])); assert.ok(!M.dominiert(pop[3], pop[3]));
  assert.deepEqual(M.front(pop).map(x => x.id), [0, 1, 2]);
  assert.deepEqual(M.spea2(pop, 3).archiv.map(x => x.id).sort(), [0, 1, 2]);
  // zu viele Nichtdominierte: die Mitte hat zwei nahe Nachbarn und wird ausgedünnt
  assert.deepEqual(M.spea2(pop, 2).archiv.map(x => x.id).sort(), [0, 2]);
  // zu wenige: R(3,3) = 2 + 2 + 2 = 6 < R(4,4) = 7 → (3,3) füllt auf
  const A4 = M.spea2(pop, 4);
  assert.deepEqual(A4.archiv.map(x => x.id).sort(), [0, 1, 2, 3]);
  assert.ok(A4.F.get(3) > 6 && A4.F.get(3) < 7 && A4.F.get(4) > 7);
});

test("OffspringGenerator: Anzahl, Random Generation, Kopien ohne Kreuzung und Mutation, Mischen wiederholbar", () => {
  const z = M.erzeuge(P, zufall(2)), n = 15;
  const alle = M.nachkommen(z.archiv, mit({ neuAnteil: 1 }), zufall(1), n);
  assert.equal(alle.length, 30); assert.ok(alle.every(k => k.herkunft === "neu"));
  const kop = M.nachkommen(z.archiv, mit({ neuAnteil: 0, kreuzung: 0, mutation: 0 }), zufall(1), n);
  kop.forEach((k, i) => { assert.equal(k.herkunft, "kopie"); assert.deepEqual(k.baum.wurzeln, z.archiv[i % z.archiv.length].baum.wurzeln); });
  assert.equal(M.nachkommen(z.archiv, mit({ nachkommen: 0 }), zufall(1), n).length, 0);
  const m1 = M.nachkommen(z.archiv, mit({ mischen: true, neuAnteil: 0, kreuzung: 0, mutation: 0 }), zufall(5), n);
  const m2 = M.nachkommen(z.archiv, mit({ mischen: true, neuAnteil: 0, kreuzung: 0, mutation: 0 }), zufall(5), n);
  assert.deepEqual(m1.map(k => k.baum.wurzeln), m2.map(k => k.baum.wurzeln));
});

test("Schritt = eine Generation; Ende nach Iterations/Generations; Archiv bleibt Nr Parents groß", () => {
  const p = mit({ generationen: 2 }), z = M.erzeuge(p, zufall(3));
  M.schritt(z, p); assert.equal(z.gen, 1); assert.equal(z.t, 1); assert.equal(z.alle.length, 40); assert.equal(z.archiv.length, 10);
  assert.ok(z.alle.filter(x => x.g === 1).length === 30);
  M.schritt(z, p); assert.ok(M.fertig(z, p));
  M.schritt(z, p); assert.equal(z.gen, 2); assert.equal(z.t, 3); assert.equal(z.alle.length, 70);
  assert.ok(z.alle.every(x => (x.baum !== null) === z.archiv.includes(x)), "Gene nur im Archiv");
});

test("Wiederholbarkeit: gleiche Saat → gleicher Lauf, andere Saat → anderer", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); M.schritt(z, P); M.schritt(z, P); return z.alle.map(x => [x.f1, x.f2]); };
  assert.deepEqual(lauf(4), lauf(4));
  assert.notDeepEqual(lauf(4), lauf(5));
});

test("Katalog: die Optimierung verbessert Länge und Zentralität – die Front rückt nach links unten", () => {
  const z = M.erzeuge(P, zufall(1)), g0 = z.alle.slice();
  for (let i = 0; i < 12; i++) M.schritt(z, P);
  const best = (L, f) => Math.min(...L.map(x => x[f]));
  assert.ok(best(z.archiv, "f1") < best(g0, "f1"));
  assert.ok(best(z.archiv, "f2") < best(g0, "f2"));
  // jedes Individuum der Generation 0 wird von einem der Front dominiert oder liegt selbst auf ihr
  assert.ok(g0.every(x => z.front.includes(x) || z.front.some(y => M.dominiert(y, x))));
  assert.ok(z.front.length >= 2, "nur ein Punkt auf der Front");
});

test("Show Variant, Auswahl per Klick und Verschieben eines Randpunkts", () => {
  const z = M.erzeuge(P, zufall(2)); M.schritt(z, P);
  const A = M.sortiert(z);
  for (let i = 1; i < A.length; i++) assert.ok(A[i - 1].f1 + A[i - 1].f2 <= A[i].f1 + A[i].f2);
  M.aendere(z, mit({ variante: 3 }), "variante"); assert.equal(z.wahl, A[3].id);
  M.waehle(z, z.alle[5].id); assert.equal(z.wahl, z.alle[5].id); assert.equal(z.wahlFest, true);
  M.schritt(z, P); assert.equal(z.wahl, z.alle[5].id, "Klick-Auswahl bleibt über den Schritt");
  const g = M.griffBei(z, [121, 409], 5); assert.deepEqual(g, { art: "rand", i: 0 });
  assert.deepEqual(M.griffBei(z, [291, 246], 5), { art: "start", i: 0, j: 2 });
  M.verschiebe(z, P, g, [100, 420]);
  assert.deepEqual(z.S.rand[0], [100, 420]); assert.equal(z.gen, 0); assert.equal(z.alle.length, 10);
});

test("Lesart f₂ „mittlere Weglänge“ Σd / n (nachgerechnet): größter Wert, minimiert", () => {
  const segs = [[[0, 0], [10, 0]], [[10, 0], [20, 0]], [[20, 0], [30, 0]]];
  const G = Geo.richtungsGraph(Geo.netz(segs), { kL: 1, kW: 0, norm: "dcs2020" });
  const md = M.naehe(G, "weglaenge");
  nah(md[0], 1.5); nah(md[1], 1); nah(md[2], 1.5);                  // Enden: (1 + 2) / 2, Mitte: (1 + 1) / 2
  const B = M.bewerte(segs, mit({ kL: 1, kW: 0, ziel2: "weglaenge" }));
  nah(B.f2, 1.5); nah(B.f1, 10000 / (30 + 0.000001));
  assert.ok(Number.isNaN(M.naehe(Geo.richtungsGraph(Geo.netz([[[0, 0], [10, 0]]]), { norm: "dcs2020" }), "weglaenge")[0]), "isoliert → NaN");
  // die gezeigten Werte je Segment folgen der Lesart; Lauf mit der zweiten Lesart: Archiv wird besser als Generation 0
  const p = mit({ ziel2: "weglaenge" }), z = M.erzeuge(p, zufall(1)), g0 = z.alle.slice();
  for (let i = 0; i < 6; i++) M.schritt(z, p);
  assert.ok(z.alle.every(x => x.f2 > 1), "mittlere Weglänge in Kosteneinheiten > 1 erwartet");
  assert.ok(Math.min(...z.archiv.map(x => x.f2)) < Math.min(...g0.map(x => x.f2)));
});

test("Ziele: bei n / Σd ziehen Länge und Zentralität gleich, bei Σd / n stehen sie gegeneinander (Korrelation über Zufallsnetze)", () => {
  const S = M.szene(), r = zufall(5), f1 = [], c = [], w = [];
  for (let i = 0; i < 40; i++) {
    const ph = M.wachse(M.baum(r, 15, P), S, P);
    f1.push(M.bewerte(ph.segmente, P).f1); c.push(M.bewerte(ph.segmente, P).f2); w.push(M.bewerte(ph.segmente, mit({ ziel2: "weglaenge" })).f2);
  }
  const mw = a => a.reduce((s, x) => s + x, 0) / a.length;
  const korr = (a, b) => { const ma = mw(a), mb = mw(b); let s = 0, sa = 0, sb = 0; a.forEach((x, i) => { s += (x - ma) * (b[i] - mb); sa += (x - ma) ** 2; sb += (b[i] - mb) ** 2; }); return s / Math.sqrt(sa * sb); };
  const rc = korr(f1, c), rw = korr(f1, w);
  assert.ok(rc > 0.3, "n/Σd: Korrelation f₁–f₂ = " + rc.toFixed(2));
  // Saat 5, 40 Netze: r(n/Σd) ≈ +0,47, r(Σd/n) ≈ −0,41
  assert.ok(rw < -0.3, "Σd/n: Korrelation f₁–f₂ = " + rw.toFixed(2));
});
