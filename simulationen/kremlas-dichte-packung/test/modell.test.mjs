// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");

/** Parameter einer Fassung mit Änderungen */
const fassung = (f, q) => Object.assign({}, M.STANDARD, M.FASSUNGEN[f], { fassung: f }, q);
/** Individuum aus Rechtecken [id, x, y, w, h] (Mittelpunkt, Breite, Höhe) */
const ind = rs => ({ g: rs.map(r => M.gen(r[0], r[1], r[2], r[3], r[4])), fo: 0, fd: 0 });
const nah = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
function lauf(f, q, schritte, saat) {
  const p = fassung(f, q), z = M.erzeuge(p, zufall(saat));
  for (let t = 0; t < schritte; t++) M.schritt(z, p);
  return { z, p };
}

test("Math.Round wie in C#: .5 zur geraden Zahl", () => {
  assert.deepEqual([0.5, 1.5, 2.5, 37.2, 116.25, 1194.44, 4.5].map(M.rundeBank), [0, 2, 2, 37, 116, 1194, 4]);
});

test("Kollision (SAT): getrennt → null, Berühren → Vektor 0, sonst kleinste Eindringtiefe weg von B", () => {
  const [A, B, C, D] = ind([[0, 100, 100, 40, 40], [1, 150, 100, 40, 40], [2, 140, 100, 40, 40], [3, 130, 110, 40, 40]]).g;
  assert.equal(M.kollision(A, B), null);                                  // 10 px Lücke
  const t = M.kollision(A, C);                                            // berühren sich (x 120 = 120)
  assert.ok(t && t.x === 0 && t.y === 0);
  const r = M.kollision(A, D);                                            // x: 10 überlappt, y: 30 → x, A nach links
  assert.deepEqual(r, { x: -10, y: 0 });
  assert.deepEqual(M.kollision(D, A), { x: 10, y: 0 });
  const [E, F] = ind([[0, 100, 100, 40, 40], [1, 120, 120, 40, 40]]).g;  // gleiche Tiefe 20/20 → y gewinnt
  assert.deepEqual(M.kollision(E, F), { x: 0, y: -20 });
  const [G, H] = ind([[0, 100, 100, 100, 100], [1, 110, 100, 20, 20]]).g; // H liegt in G: kürzester Weg nach rechts
  assert.deepEqual(M.kollision(H, G), { x: 50, y: 0 });                   // H von x 100…120 bis hinter 150
});

test("Abstoßen: Kraft 0,5 trennt zwei Räume genau, jeder weicht um die Hälfte aus", () => {
  const I = ind([[0, 100, 100, 40, 40], [1, 130, 110, 40, 40]]);
  M.abstossen(I, 0.5, 1, zufall(1), -1);
  assert.equal(I.g[0].x, 95); assert.equal(I.g[1].x, 135);
  assert.equal(M.ueberlappung(I), 0);
  const J = ind([[0, 100, 100, 40, 40], [1, 130, 110, 40, 40]]);
  M.abstossen(J, 0.5, 1, zufall(1), 0);                                  // gesperrter Raum 0 bleibt
  assert.equal(J.g[0].x, 100); assert.equal(J.g[1].x, 135);
  const K = ind([[0, 100, 100, 40, 40], [1, 130, 110, 40, 40]]);
  M.abstossen(K, 0.5, 0, zufall(1), -1);                                 // Rate 0: nichts
  assert.equal(K.g[1].x, 130);
});

test("Proportion: Fläche bleibt, waagerecht versetzte Räume werden schmaler, Seiten ≥ 0,75·√Fläche", () => {
  const I = ind([[0, 100, 100, 40, 40], [1, 130, 105, 40, 40]]);
  M.proportion(I, 0.5, 1, zufall(1), -1);                                // Abprallvektor 10 → Breite − 5
  for (const g of I.g) { assert.ok(nah(g.w * g.h, 1600, 1e-6)); assert.ok(nah(g.w, 35)); }
  const g = M.gen(0, 0, 0, 40, 40);
  M.setzeBreite(g, 5); assert.ok(nah(g.w, 30) && nah(g.h, 1600 / 30));
  M.setzeBreite(g, 500); assert.ok(nah(g.h, 30) && nah(g.w, 1600 / 30));
  const V = ind([[0, 100, 100, 40, 40], [1, 105, 130, 40, 40]]);         // senkrecht versetzt → breiter
  M.proportion(V, 0.5, 1, zufall(1), -1);
  assert.ok(V.g[0].w > 40 && nah(V.g[0].w * V.g[0].h, 1600, 1e-6));
});

test("Sg: paarweise Schnittflächen plus Fläche außerhalb des Umgebungsrechtecks 500 × 430", () => {
  const I = ind([[0, 100, 100, 40, 40], [1, 130, 110, 40, 40], [2, 10, 200, 40, 40], [3, 400, 300, 20, 20]]);
  // Paar 0/1: 10 × 30 = 300; Raum 2 ragt 10 × 40 = 400 links hinaus
  assert.equal(M.ueberlappung(I), 700);
});

test("Rand: hinausragende Räume werden genau an die Kante geschoben, gesperrte nicht", () => {
  const I = ind([[0, 10, 420, 40, 40], [1, 495, 5, 40, 40], [2, -50, 100, 40, 40]]);
  M.pruefeRand(I, 2);
  assert.deepEqual([I.g[0].x, I.g[0].y], [20, 410]);
  assert.deepEqual([I.g[1].x, I.g[1].y], [480, 20]);
  assert.deepEqual([I.g[2].x, I.g[2].y], [-50, 100]);
});

test("Distanzen: Umrissabstand, fehlende Durchgangsbreite und tiefe Überlappung", () => {
  const [A, B, C, D, E] = ind([[0, 100, 100, 100, 100], [1, 200, 110, 100, 100], [2, 200, 190, 100, 100], [3, 300, 100, 100, 100], [4, 100, 100, 20, 20]]).g;
  assert.equal(M.ringAbstand(A, B), 0);                                  // berühren sich bei x = 150
  assert.equal(M.zusatzAbstand(A, B, 50), 0);                            // Berührlänge 90 ≥ 50
  assert.equal(M.paarDistanz(A, B, 50), 0);
  assert.equal(M.zusatzAbstand(A, C, 50), 40);                           // Berührlänge nur 10 → 40 fehlen
  assert.equal(M.ringAbstand(A, D), 100);
  assert.equal(M.paarDistanz(A, D, 50), 100);                            // 100 Lücke; Projektionen decken sich 100 ≥ 50
  assert.equal(M.paarDistanz(A, ind([[5, 300, 300, 100, 100]]).g[0], 50), Math.hypot(100, 100) + 50);   // diagonal: + 50
  assert.equal(M.ringAbstand(A, E), 40);                                 // E liegt innen: Abstand der Kanten
  assert.equal(M.zusatzUeberlappung(A, E, 10), 10);                       // Schnitt 20 × 20 → 20 − 10
  const I = { g: [A, B, D], fo: 0, fd: 0 }, P = [[0, 1], [0, 3]];
  assert.equal(M.distanzen(I, P, 50), 100);
  assert.equal(M.erfuellt(I, P, 50), 1);
});

test("Topologien: Stern um Raum 0 und Gang mit drei Wohnungen (SetSzenario)", () => {
  assert.deepEqual(M.nachbarn(4, "stern"), [[0, 1], [0, 2], [0, 3]]);
  const G = M.nachbarn(16, "gang");
  assert.equal(G.length, 15);
  assert.deepEqual(G.slice(0, 3), [[0, 1], [0, 2], [0, 3]]);
  assert.deepEqual(G.filter(p => p[0] === 2).map(p => p[1]), [8, 9, 10, 11]);
  assert.equal(M.nachbarn(10, "gang").length, 9);                        // nur vorhandene Räume
});

test("Federn: Zug längs der größeren Komponente, · 0,5 · (1 − Dämpfung), Zuschlag für Durchgangsbreite", () => {
  const I = ind([[0, 100, 100, 50, 50], [1, 300, 110, 50, 50]]);
  // x: Lücke 150; y: Überdeckung 40 < 50 → Zuschlag (0, 10); x größer → 150 · 0,5 · 0,5 = 37,5
  assert.deepEqual(M.federVektor(I.g[0], I.g[1], 50), { x: 150, y: 10 });
  M.federn(I, [[0, 1]], 0.5, 50, -1);
  assert.equal(I.g[0].x, 137.5); assert.equal(I.g[1].x, 262.5);
  assert.equal(I.g[0].y, 100); assert.equal(I.g[1].y, 110);
  const D = ind([[0, 100, 100, 50, 50], [1, 300, 300, 50, 50]]);         // diagonal: Zuschlag (50, 50)
  assert.deepEqual(M.federVektor(D.g[0], D.g[1], 50), { x: 200, y: 200 });
});

test("Kreuzung: jede Raumnummer genau einmal, Gene stammen von den Eltern", () => {
  const r = zufall(3);
  for (let n = 0; n < 200; n++) {
    const E = M.startPopulation(2, 8, r);
    if (n % 2) M.inversion(E[1], 1, r);                                   // auch bei vertauschter Reihenfolge
    for (const k of M.kreuzung(E, r)) {
      assert.deepEqual(k.g.map(g => g.id).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
      for (const g of k.g) assert.ok(E.some(e => e.g.some(q => q.id === g.id && q.x === g.x && q.y === g.y && q.w === g.w)));
    }
  }
});

test("Inversion kehrt einen Abschnitt der Genreihenfolge um, ohne Geometrie zu ändern", () => {
  const I = M.startPopulation(1, 6, zufall(5))[0], vorher = M.ueberlappung(I);
  M.inversion(I, 1, zufall(9));
  const ids = I.g.map(g => g.id);
  assert.notDeepEqual(ids, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(ids.slice().sort(), [0, 1, 2, 3, 4, 5]);
  assert.equal(M.ueberlappung(I), vorher);
});

test("Start: gleiche Flächen 0,75 · 499 · 429 / n, Summe = 75 % des Feldes", () => {
  const z = M.erzeuge(fassung("einpassung"), zufall(1)), a = 499 * 429 * 0.75 / 25;
  assert.equal(z.t, 0); assert.equal(z.eltern.length, 1); assert.equal(z.eltern[0].g.length, 25);
  for (const g of z.eltern[0].g) assert.ok(nah(g.w * g.h, a, 1e-6) && nah(g.a, a));
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const sig = s => { const { z } = lauf("topologie", {}, 30, s); return JSON.stringify(M.beste(z).g); };
  assert.equal(sig(7), sig(7));
  assert.notEqual(sig(7), sig(8));
});

test("Flächen bleiben in allen Fassungen über den ganzen Lauf erhalten", () => {
  for (const f of Object.keys(M.FASSUNGEN)) {
    const { z } = lauf(f, {}, 60, 2);
    for (const e of z.eltern) for (const g of e.g) assert.ok(nah(g.w * g.h, g.a, 1e-6), `${f}: ${g.w * g.h} statt ${g.a}`);
  }
});

test("Einpassung: Sg fällt, nach Konvergenz keine Überlappungen (Stand des Programms, 25 Räume)", () => {
  for (const s of [1, 4, 5]) {
    const { z } = lauf("einpassung", {}, 1500, s), b = M.beste(z);
    assert.ok(z.verlauf[0] > 10000, "Start ungeordnet");
    assert.ok(b.fo < 0.05, `Saat ${s}: Sg = ${b.fo}`);
    for (let i = 0; i < b.g.length; i++) {
      const g = b.g[i];
      assert.ok(g.x - g.w / 2 > -0.05 && g.x + g.w / 2 < 500.05 && g.y - g.h / 2 > -0.05 && g.y + g.h / 2 < 430.05, "im Feld");
      for (let k = i + 1; k < b.g.length; k++) { const r = M.schnittRechteck(g, b.g[k]); assert.ok(!r || r.w * r.h < 0.05); }
    }
  }
});

test("(μ+λ) mit Elite: Sg der besten Lösung steigt nie", () => {
  const { z } = lauf("einpassung", { mu: 4, druck: 3, elite: true }, 150, 3);
  z.verlauf.forEach((v, i, a) => { if (i) assert.ok(Math.max(1, v) <= Math.max(1, a[i - 1]) + 1e-9, `Generation ${i}: ${v} > ${a[i - 1]}`); });
  assert.ok(z.verlauf[z.verlauf.length - 1] < z.verlauf[0] / 50);
});

test("Kollision allein: keine Selektion, ein Kind je Generation, Sg sinkt im Mittel", () => {
  let start = 0, ende = 0;
  for (let s = 1; s <= 6; s++) {
    const { z } = lauf("kollision", {}, 200, s);
    assert.equal(z.kinder, 1);
    start += z.verlauf[0]; ende += z.verlauf[z.verlauf.length - 1];
  }
  assert.ok(ende < start / 10, `${ende} vs ${start}`);
});

test("Topologie: Distanzen sinken, die geforderten Nachbarschaften (Stern, 5 Räume) werden erfüllt", () => {
  let voll = 0, anteil = 0;
  for (let s = 1; s <= 8; s++) {
    const { z, p } = lauf("topologie", { raeume: 5 }, 200, s), b = M.beste(z);
    assert.ok(z.verlaufD[z.verlaufD.length - 1] < z.verlaufD[0] / 5, `Saat ${s}: f2 ${z.verlaufD[0]} → ${b.fd}`);
    const e = M.erfuellt(b, z.paare, p.rlap);
    anteil += e / z.paare.length;
    if (e === z.paare.length && b.fo < 1) voll++;
  }
  assert.ok(voll >= 5, `alle Nachbarschaften überlappungsfrei erfüllt in ${voll} von 8 Läufen`);
  assert.ok(anteil / 8 >= 0.85);
});

test("Topologie: Aufteilung der Selektion 1 / μ−1, nach Erreichen der Schwelle 60 % / 40 %", () => {
  const p = fassung("topologie"), z = M.erzeuge(p, zufall(1));
  M.schritt(z, p);
  assert.deepEqual(z.aufteilung, [1, 9]);
  const { z: z2 } = lauf("topologie", { raeume: 5 }, 100, 2);
  assert.deepEqual(z2.aufteilung, [6, 4]);
});

test("(μ,λ) ohne genug Kinder bricht nicht ab; Population behält μ", () => {
  const { z } = lauf("einpassung", { mu: 3, druck: 1, plus: false }, 5, 1);   // nur 2 Kinder für 3 Eltern
  assert.equal(z.eltern.length, 3);
  const { z: z0 } = lauf("kollision", { plus: false }, 3, 1);                   // gar kein Kind
  assert.equal(z0.eltern.length, 1);
});

test("Maus: gezogener Raum sitzt an der Mausposition und bleibt dort, solange er gesperrt ist", () => {
  const p = fassung("einpassung"), z = M.erzeuge(p, zufall(1));
  for (let t = 0; t < 50; t++) M.schritt(z, p);
  const g = M.beste(z).g[3];
  assert.ok(M.ziehe(z, g.x, g.y, "unten"));
  const id = z.gesperrt;
  assert.ok(id >= 0 && M.beste(z).g.some(q => q.id === id));
  M.ziehe(z, 250, 215, "ziehen");
  for (let t = 0; t < 20; t++) M.schritt(z, p);
  for (const e of z.eltern) { const q = e.g.find(r => r.id === id); assert.deepEqual([q.x, q.y], [250, 215]); }
  M.loslassen(z);
  assert.equal(z.gesperrt, -1);
  assert.equal(M.ziehe(z, -100, -100, "unten"), false);                     // daneben: nichts
});
