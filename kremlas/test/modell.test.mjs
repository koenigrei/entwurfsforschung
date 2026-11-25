// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../simulationen/_gemeinsam/zufall.js");

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

/* ---------------- Ergänzungen 22.11.2026: Federrichtung, Belegung, Grundriss-Generator ---------------- */

test("Federn ziehen zum Nachbarn hin, auch wenn er links/oben liegt (Original: Zuschlag immer positiv)", () => {
  const I = ind([[0, 300, 110, 50, 50], [1, 100, 100, 50, 50]]);         // Spiegelbild des Falls oben: Nachbar links
  assert.deepEqual(M.federVektor(I.g[0], I.g[1], 50), { x: -150, y: -10 });
  const D = ind([[0, 300, 300, 50, 50], [1, 100, 100, 50, 50]]);
  assert.deepEqual(M.federVektor(D.g[0], D.g[1], 50), { x: -200, y: -200 });
  // nur in x überdeckt (40 < 50): der Zuschlag schiebt die Räume so, dass die Überdeckung wächst, nicht schrumpft
  const S = ind([[0, 100, 100, 50, 50], [1, 90, 200, 50, 50]]);
  const v = M.federVektor(S.g[0], S.g[1], 50);
  assert.ok(v.x < 0, "A muss nach links, zum Nachbarn");
});

test("Federn wirken auch bei sich berührenden Räumen, deren gemeinsame Kante kürzer als die Durchgangsbreite ist", () => {
  // Nach der Kollisionserkennung liegen Räume oft genau aneinander (Abstand 0). Früher war die Feder dann tot.
  const T = ind([[0, 100, 100, 50, 50], [1, 150, 140, 50, 50]]);          // rechts anliegend, gemeinsame Kante 10 < 50
  assert.deepEqual(M.federVektor(T.g[0], T.g[1], 50), { x: 0, y: 40 });
  const L = ind([[0, 150, 140, 50, 50], [1, 100, 100, 50, 50]]);          // Spiegelbild: Nachbar links oben
  assert.deepEqual(M.federVektor(L.g[0], L.g[1], 50), { x: 0, y: -40 });
  const U = ind([[0, 100, 100, 50, 50], [1, 120, 150, 50, 50]]);          // unten anliegend, gemeinsame Kante 30
  assert.deepEqual(M.federVektor(U.g[0], U.g[1], 50), { x: 20, y: 0 });
  const E = ind([[0, 100, 100, 50, 50], [1, 150, 150, 50, 50]]);          // nur Ecke an Ecke
  assert.deepEqual(M.federVektor(E.g[0], E.g[1], 50), { x: 50, y: 50 });
  const G = ind([[0, 100, 100, 50, 50], [1, 150, 100, 50, 50]]);          // ganze Kante gemeinsam: erfüllt, kein Zug
  assert.deepEqual(M.federVektor(G.g[0], G.g[1], 50), { x: 0, y: 0 });
  // hauchdünne Überlappung (0,25 px) statt Berühren, wie sie nach dem Abstoßen oft stehen bleibt: Zug längs der Kante
  const H = ind([[0, 100, 100, 50, 50], [1, 120, 149.75, 50, 50]]);
  assert.deepEqual(M.federVektor(H.g[0], H.g[1], 50), { x: 20, y: 0 });
});

test("Belegung: Summe der Raumflächen = Anteil des Umgebungsrechtecks; mit Raumprogramm m² · 2500 px²", () => {
  for (const b of [0.3, 0.75, 1]) {
    const E = M.startPopulation(1, 12, zufall(2), b)[0];
    assert.ok(nah(E.g.reduce((s, g) => s + g.a, 0), b * 499 * 429, 1e-6));
  }
  for (const [prog, n] of [["sechs", 6], ["acht", 8], ["zehn", 10]]) {
    const R = M.PROGRAMME[prog].raeume;
    assert.equal(R.length, n);
    assert.equal(R.reduce((s, r) => s + r[2], 0), 86);                    // REvo.GrowPolys: total = 86
    const A = M.flaechen(n, 1, prog);
    assert.ok(nah(A.reduce((s, a) => s + a, 0), M.BREITE * M.HOEHE, 1e-6)); // 100 % füllen das Feld 10 × 8,6 m genau
  }
  const BUCH = { mindest: false, belegung: 1, grundrissTopo: "stern" };   // Stand wie im Buch (ohne die neuen Mindestmaße, Stern um den Flur)
  const z = M.erzeuge(fassung("grundriss8", BUCH), zufall(1));            // wie im Buch: Stern um den Flur, 100 %, kürzeste Seite 0,4 · √Fläche
  assert.equal(z.n, 8); assert.equal(z.programm, "acht"); assert.equal(z.belegung, 1);
  assert.deepEqual(z.paare, [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7]]);
  assert.ok(z.eltern[0].g.every(g => g.ms === 0.4));
  const w = M.erzeuge(fassung("grundriss8", { ...BUCH, grundrissTopo: "wohnung" }), zufall(1));
  assert.ok(w.paare.some(([a, b]) => a === 0 && b === -1), "Wohnung: Flur braucht einen Eingang");
  const g = M.gen(0, 0, 0, 100, 100, null, 0.4); M.setzeBreite(g, 10);
  assert.ok(nah(g.w, 40) && nah(g.h, 250));                                // kürzeste Seite 0,4 · √10000 = 40
});

test("Außenraum (−1): Distanz 0, wenn der Raum mit Durchgangsbreite an der Feldkante liegt", () => {
  const I = ind([[0, 25, 200, 50, 100], [1, 250, 200, 50, 100]]);
  assert.equal(M.distanzen(I, [[0, -1]], 50), 0);
  assert.ok(M.distanzen(I, [[1, -1]], 50) > 100);
  M.federn(I, [[1, -1]], 0, 50, -1);                                      // Feder zieht Raum 1 zur nächsten Kante (oben, 150 px)
  assert.equal(I.g[1].y, 125); assert.equal(I.g[1].x, 250);
});

test("Grundriss ableiten: Räume wachsen in die Lücken, gegenüberliegende treffen sich in der Mitte, Überlappung blockiert", () => {
  const I = ind([[0, 100, 215, 100, 430], [1, 400, 215, 100, 430]]);     // zwei Streifen mit 250 px Lücke
  const R = M.grundriss(I);
  const a = R.find(r => r.id === 0), b = R.find(r => r.id === 1);
  assert.ok(nah(a.x1, 0, 0.5) && nah(b.x2, 500, 0.5));
  assert.ok(Math.abs(a.x2 - b.x1) < 1 && nah(a.x2, 250, 15), `Treffpunkt ${a.x2}`);
  const U = ind([[0, 100, 100, 100, 100], [1, 140, 100, 100, 100]]);     // überlappen: keiner wächst durch den anderen
  const Q = M.grundriss(U);
  assert.ok(Q.find(r => r.id === 0).x2 <= 150 + 1e-9 && Q.find(r => r.id === 1).x1 >= 90 - 1e-9);
});

test("Türen nur an gemeinsamen Kanten geforderter Nachbarn, mittig, Eingang an der Außenwand", () => {
  const R = [{ id: 0, x1: 0, y1: 0, x2: 200, y2: 430 }, { id: 1, x1: 200, y1: 0, x2: 500, y2: 200 }, { id: 2, x1: 200, y1: 200, x2: 500, y2: 430 }];
  const T = M.tueren(R, [[0, 1], [0, 2], [1, 2], [0, -1]], 45);
  assert.equal(T.length, 4);
  assert.deepEqual(T[0], { a: 0, b: 1, senkrecht: true, x: 200, y: 100, l: 45 });
  assert.deepEqual(T[2], { a: 1, b: 2, senkrecht: false, x: 350, y: 200, l: 45 });
  assert.equal(T[3].b, -1); assert.equal(T[3].x, 0);
  assert.equal(M.tueren([{ id: 0, x1: 0, y1: 0, x2: 100, y2: 100 }, { id: 1, x1: 100, y1: 70, x2: 200, y2: 170 }], [[0, 1]], 45).length, 0); // nur 30 px gemeinsam
});

test("Topologie: Stern mit 8 Räumen wird mit korrigierten Federn gelöst (alle Nachbarschaften, kaum Überlappung)", () => {
  let ok = 0;
  for (const s of [1, 2, 3, 4]) {
    const { z, p } = lauf("topologie", {}, 1200, s), b = M.beste(z), A = b.g.reduce((q, g) => q + g.a, 0);
    if (M.erfuellt(b, z.paare, p.rlap) === z.paare.length && b.fo < 0.01 * A) ok++;
  }
  assert.ok(ok >= 2, `nur ${ok} von 4 Läufen gelöst`);
});

test("Grundriss-Generator: Lösung erfüllt alle Nachbarschaften, der abgeleitete Grundriss füllt das Feld (Stern und Wohnung mit Eingang)", () => {
  // mehrere Saaten statt einer: ein einzelner Lauf hängt vom Zufall ab
  for (const topo of ["stern", "wohnung"]) {
    let ok = 0;
    for (const s of [1, 2, 3, 4]) {
      const { z, p } = lauf("grundriss8", { grundrissTopo: topo, mindest: false, belegung: 1 }, 1500, s), b = M.beste(z);   // Stand wie im Buch
      if (M.erfuellt(b, z.paare, p.rlap) !== z.paare.length) continue;
      const R = M.grundriss(b);
      const A = R.reduce((q, r) => q + (r.x2 - r.x1) * (r.y2 - r.y1), 0);
      assert.ok(A > 0.97 * M.BREITE * M.HOEHE, `gefüllt nur ${A / (M.BREITE * M.HOEHE)}`);
      if (M.tueren(R, z.paare, 45).length >= z.paare.length - 2) ok++;          // Türen brauchen 1,1 m gemeinsame Wand
    }
    assert.ok(ok >= 2, `${topo}: nur ${ok} von 4 Läufen mit allen Nachbarschaften und Türen`);
  }
});

test("Stern und Wohnung sind verschiedene Topologien; die Wahl wirkt nur mit Raumprogramm", () => {
  const st = M.erzeuge(fassung("grundriss8", { grundrissTopo: "stern" }), zufall(1)).paare;
  const wo = M.erzeuge(fassung("grundriss8", { grundrissTopo: "wohnung" }), zufall(1)).paare;
  assert.deepEqual(st, [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7]]);
  assert.deepEqual(wo, M.PROGRAMME.acht.paare);
  assert.ok(wo.some(q => q[1] === -1) && wo.some(q => q[0] !== 0));     // Eingang und Nachbarn außerhalb des Flurs
  const t1 = M.erzeuge(fassung("topologie", { grundrissTopo: "wohnung" }), zufall(1)).paare;
  assert.deepEqual(t1, M.nachbarn(8, "stern"));
});

test("Federrunden: mit 2 Runden der bisherige Ablauf, mit mehr Runden ziehen die Federn den Stern schneller zusammen", () => {
  const geloest = (runden, t) => {
    let ok = 0;
    for (const s of [1, 2, 3, 4, 5, 6]) {
      const { z, p } = lauf("topologie", { federRunden: runden }, t, s), b = M.beste(z), A = b.g.reduce((q, g) => q + g.a, 0);
      if (M.erfuellt(b, z.paare, p.rlap) === z.paare.length && b.fo < 0.01 * A) ok++;
    }
    return ok;
  };
  const zwei = geloest(2, 150), zehn = geloest(10, 150);
  assert.ok(zehn >= 3 && zehn > zwei, `nach 150 Generationen gelöst: 2 Runden ${zwei}, 10 Runden ${zehn} von 6`);
});

/* ---------------------------------------------------------------- Lösungssuche mit Mindestmaßen (neu, 23.11.2026) */

test("Voreinstellung: Grundriss mit sechs Räumen, abgeleiteter Plan, Mindestmaße an", () => {
  assert.equal(M.STANDARD.fassung, "grundriss6"); assert.equal(M.STANDARD.plan, true); assert.equal(M.STANDARD.mindest, true);
  for (const f of ["grundriss6", "grundriss8", "grundriss10"]) assert.equal(M.FASSUNGEN[f].grundrissTopo, "wohnung", f);   // Wohnung mit Eingang (Reinhard 23.11.2026)
  assert.ok(M.erzeuge(fassung("grundriss6"), zufall(1)).paare.some(([a, b]) => a === 0 && b === -1));
  const z = M.erzeuge(fassung("grundriss6"), zufall(1));
  assert.equal(z.n, 6); assert.equal(z.programm, "sechs"); assert.ok(z.mindest);
  assert.deepEqual(M.PROGRAMME.sechs.raeume.map(r => r[2]), [10, 28, 10, 16, 14, 8]);
  for (const f of ["einpassung", "kollision", "topologie", "gang"]) assert.equal(M.FASSUNGEN[f].mindest, false, f);
});

test("Mindestbreiten im Erbgut: kein Raum wird schmaler als seine Mindestbreite, auch nicht durch VarySize", () => {
  const { z } = lauf("grundriss8", {}, 60, 3), P = M.PROGRAMME.acht.raeume;
  for (const e of z.eltern) for (const g of e.g) assert.ok(Math.min(g.w, g.h) >= P[g.id][3] * M.PX_M - 1e-6, `Raum ${g.id}: ${Math.min(g.w, g.h)}`);
  const g = M.gen(0, 0, 0, 200, 200, null, 0.4, 150); M.setzeBreite(g, 10);   // 16 m², Mindestbreite 3 m
  assert.ok(nah(g.w, 150) && nah(g.h, 40000 / 150));
  const ohne = lauf("grundriss8", { mindest: false }, 1, 3).z;           // ohne Mindestmaße: keine Mindestbreite
  assert.ok(ohne.eltern.every(e => e.g.every(q => q.mb === 0)));
});

test("Plan-Prüfung: gültiger Plan von Hand, Fehlbeträge bei zu schmalem Raum, fehlender Tür und Überlappung", () => {
  // sechs Räume im Feld 10 × 8,6 m (500 × 430 px): Flur als Streifen in der Mitte, links Wohnen + Küche, rechts Eltern, Zimmer, Bad
  const r = (id, x1, y1, x2, y2) => [id, (x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1];
  const gut = ind([r(1, 0, 0, 220, 320), r(2, 0, 320, 220, 430), r(0, 220, 0, 280, 430), r(3, 280, 0, 500, 180), r(4, 280, 180, 500, 340), r(5, 280, 340, 500, 430)]);
  const P = M.PROGRAMME.sechs.paare, w = M.planPruefung(gut, P, "sechs");
  assert.ok(w.gueltig, JSON.stringify(w)); assert.equal(w.f3, 0);
  const schmal = ind([r(1, 0, 0, 220, 320), r(2, 0, 320, 220, 430), r(0, 220, 0, 270, 430), r(3, 270, 0, 500, 180), r(4, 270, 180, 500, 340), r(5, 270, 340, 500, 430)]);
  const ws = M.planPruefung(schmal, P, "sechs");                           // Flur 1,0 m statt 1,2 m
  assert.ok(!ws.gueltig && nah(ws.breite, 0.2, 1e-6)); assert.ok(ws.raeume.find(q => q.id === 0).zuSchmal);
  const ohneTuer = M.planPruefung(gut, [...P, [2, 3]], "sechs");          // Küche und Eltern grenzen nicht aneinander
  assert.ok(!ohneTuer.gueltig && ohneTuer.fehlt === 1 && ohneTuer.tuer > 0);
});

test("Kleine Überlappungen teilt der Plan (Wand in die Mitte), große bleiben", () => {
  const I = ind([[0, 100, 215, 220, 430], [1, 350, 215, 320, 430]]);     // 20 px Überlappung: x 190 … 210
  const R = M.grundriss(I, 300, M.TEILE_PX), a = R.find(q => q.id === 0), b = R.find(q => q.id === 1);
  assert.ok(nah(a.x2, 200, 1e-6) && nah(b.x1, 200, 1e-6));
  const Q = M.grundriss(I, 300, 0);                                         // ohne Teilen bleibt die Überlappung
  assert.ok(Q.find(q => q.id === 0).x2 > Q.find(q => q.id === 1).x1);
});

test("Suche: drei verschiedene gültige Grundrisse mit sechs Räumen, Stern und Wohnung, jeder Treffer lässt sich laden", () => {
  for (const topo of ["stern", "wohnung"]) {
    const p = fassung("grundriss6", { grundrissTopo: topo }), S = M.sucheNeu(p, zufall, { anzahl: 3, saat: 1, laeufe: 40 });
    while (!S.fertig) M.sucheWeiter(S, 400);
    assert.ok(S.treffer.length >= 3, `${topo}: nur ${S.treffer.length} Treffer in ${S.laeufe} Läufen`);
    const W = M.waehleVerschiedene(S.treffer, 3);
    assert.equal(W.length, 3);
    for (let i = 0; i < 3; i++) for (let k = i + 1; k < 3; k++) assert.ok(M.planAbstand(W[i].plan, W[k].plan) >= 0.3);
    for (const T of W) {
      assert.ok(T.wert.gueltig && M.planPruefung(T.ind, T.paare, T.programm).gueltig);
      const z = M.zustandAusTreffer(p, T, zufall(T.saat));
      assert.equal(z.t, T.t); assert.ok(M.planPruefung(M.beste(z), z.paare, z.programm).gueltig, "geladener Zustand zeigt den Treffer");
      M.schritt(z, p); assert.equal(z.t, T.t + 1);                          // weiterrechnen geht
    }
  }
});

test("Suche: gleiche Saat, gleiche Treffer (wiederholbar)", () => {
  const lauf2 = () => { const S = M.sucheNeu(fassung("grundriss6"), zufall, { anzahl: 2, saat: 5, laeufe: 20 }); while (!S.fertig) M.sucheWeiter(S, 123); return S.treffer.map(t => [t.saat, t.t]); };
  assert.deepEqual(lauf2(), lauf2());
});

/* ---------------------------------------------------------------- L-förmige Räume (neu, 23.11.2026) */

test("L-Räume: nur wo die Fläche für zwei Schenkel mit Mindestbreite reicht; Hauptteil und Schenkel teilen die Fläche", () => {
  assert.deepEqual(M.PROGRAMME.sechs.raeume.map((_, i) => M.lMoeglich("sechs", i)), [true, true, true, false, true, true]);
  assert.deepEqual(M.lRaeume("sechs", 1 + 2 + 8), [0, 1]);                 // Eltern (Bit 3) ist zu klein und fällt weg
  const z = M.erzeuge(fassung("grundriss6", { lform: 3 }), zufall(1));
  assert.equal(z.n, 8); assert.equal(z.nRaeume, 6); assert.deepEqual(z.lraeume, [0, 1]);
  for (const e of z.eltern) {
    for (const raum of [0, 1]) {
      const T = e.g.filter(g => g.r === raum);
      assert.equal(T.length, 2);
      assert.ok(nah(T.reduce((q, g) => q + g.a, 0), M.PROGRAMME.sechs.raeume[raum][2] * 2500 * 0.96, 1e-6));
    }
  }
  assert.equal(M.erzeuge(fassung("grundriss6", { lform: 3, mindest: false }), zufall(1)).n, 6);   // L nur mit Mindestmaßen
  const I = { g: [M.gen(0, 100, 100, 150, 200, null, 0.4, 60, 0), M.gen(6, 300, 100, 100, 100, null, 0.4, 60, 0)] };
  for (let i = 0; i < 50; i++) M.variiereAnteil(I, 1, zufall(i + 1), -1);
  assert.ok(nah(I.g[0].a + I.g[1].a, 40000, 1e-6) && I.g[1].a >= 1.05 * 3600 - 1e-6);
});

test("L-Räume: Plan-Prüfung verlangt bündige Teile mit Kontakt ≥ Mindestbreite, Türen zählen an jedem Teil", () => {
  // 6 Räume, Flur als L: senkrechter Streifen (x 220–280) und waagerechter Schenkel unten links bündig mit dem Feldrand
  const r = (id, x1, y1, x2, y2, raum) => { const g = M.gen(id, (x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1, null, 0.4, 0, raum); return g; };
  const L = { g: [r(1, 0, 0, 220, 330), r(2, 280, 340, 500, 430), r(0, 220, 0, 280, 340, 0), r(6, 0, 340, 280, 430, 0)] };
  // Wohnen oben links, Schenkel des Flurs unten von 0 bis 280 (bündig mit Flur rechts? nein: rechts 280 = Flur rechts → bündig)
  const P = [[0, 1], [0, 2]];
  const W = M.planPruefung(L, P, "sechs");
  assert.equal(W.fehlt, 0, "Türen am Hauptteil oder am Schenkel");
  assert.ok(W.lform < 0.02, `L-Fehlbetrag ${W.lform}`);
  assert.equal(M.tueren(M.grundriss(L, 1), [[0, 2]], 45).length, 1);       // die Küche grenzt nur an den Schenkel: Tür über den Schenkel
  // Feld ganz belegt (kein Wachsen): Schenkel mittig rechts am Flur → T-Form, nicht bündig
  const T = { g: [r(1, 0, 0, 220, 430), r(0, 220, 0, 280, 430, 0), r(2, 280, 0, 500, 150), r(6, 280, 150, 500, 250, 0), r(5, 280, 250, 500, 430)] };
  assert.ok(nah(M.planPruefung(T, P, "sechs").lform, 3, 1e-6));            // kleinster Versatz 150 px = 3 m
});

test("Suche mit L-förmigem Flur und Wohnen: drei gültige Grundrisse, jeder mit bündigem L", () => {
  const p = fassung("grundriss6", { lform: 3, grundrissTopo: "wohnung" }), S = M.sucheNeu(p, zufall, { anzahl: 3, saat: 1, laeufe: 40 });
  while (!S.fertig) M.sucheWeiter(S, 400);
  assert.ok(S.treffer.length >= 3, `nur ${S.treffer.length} Treffer in ${S.laeufe} Läufen`);
  for (const T of M.waehleVerschiedene(S.treffer, 3)) { assert.ok(T.wert.gueltig && T.wert.lform < 0.02); assert.equal(T.ind.g.length, 8); }
});

/* ---------------------------------------------------------------- Palladio-Villen nachgenerieren (neu, 23.11.2026) */
const VB = require("../vorbilder_palladio.js");
M.registriere(VB);
const villa = (v, q) => Object.assign({}, M.STANDARD, ...M.REGLER.map(k => ({ [k]: M.FASSUNGEN["pal_" + v][k] })), { fassung: "pal_" + v }, q);

test("Vorbilder Palladio: acht Villen, Räume füllen das Feld, Symmetrie aus Achse und Spiegelpaaren", () => {
  assert.equal(VB.liste.length, 8);
  for (const pid of VB.liste) {
    const P = M.PROGRAMME[pid], A = P.raeume.reduce((s, r) => s + r[2], 0);
    assert.ok(nah(A, P.feld.b * P.feld.h, 0.05), `${pid}: ${A} m² statt ${P.feld.b * P.feld.h}`);
    const S = P.symmetrie, alle = [...S.achse, ...S.paare.flat()].sort((a, b) => a - b);
    assert.deepEqual(alle, P.raeume.map((_, i) => i), `${pid}: jeder Raum auf der Achse oder in einem Paar`);
    assert.ok(P.paare.some(([a, b]) => b === -1), `${pid}: Eingang`);
  }
  assert.deepEqual(M.PROGRAMME.pal_malcontenta.raeume[8][4].teile.length, 3);   // Kreuzsaal aus drei Teilen
});

test("Feld je Programm: Villa im eigenen Maßstab, danach wieder 500 × 430 px und 50 px = 1 m", () => {
  const z = M.erzeuge(villa("emo"), zufall(1)), F = M.PROGRAMME.pal_emo.feld;
  assert.ok(nah(M.BREITE / M.PX_M, F.b, 1e-9) && nah(M.HOEHE / M.PX_M, F.h, 1e-9) && nah(Math.max(M.BREITE, M.HOEHE), 500, 1e-9));
  assert.ok(nah(M.TUER_PX, 0.9 * M.PX_M, 1e-9));
  M.erzeuge(fassung("grundriss6"), zufall(1));
  assert.equal(M.BREITE, 500); assert.equal(M.HOEHE, 430); assert.equal(M.PX_M, 50);
  M.schritt(z, villa("emo")); assert.ok(nah(M.BREITE / M.PX_M, F.b, 1e-9), "schritt setzt das Feld des Zustands");
});

test("Symmetrie: Spiegelpaare gespiegelt, Achsenräume mittig, auch nach Generationen und Raumtausch", () => {
  const p = villa("emo"), z = M.erzeuge(p, zufall(2));
  for (let t = 0; t < 30; t++) M.schritt(z, p);
  for (const e of z.eltern) {
    for (const [a, b] of z.sym.paare) { const A = e.g.find(g => g.id === a), Bg = e.g.find(g => g.id === b);
      assert.ok(nah(A.x, M.BREITE - Bg.x, 1e-6) && nah(A.y, Bg.y, 1e-6) && nah(A.w, Bg.w, 1e-6), `Paar ${a}/${b}`); }
    for (const id of z.sym.achse) assert.ok(nah(e.g.find(g => g.id === id).x, M.BREITE / 2, 1e-6));
    for (const g of e.g) assert.ok(nah(g.w * g.h, g.a, 1e-6));
  }
});

test("Ähnlichkeit: das Vorbild selbst und seine Spiegelung gelten als deckungsgleich (1)", () => {
  const p = villa("emo"); M.erzeuge(p, zufall(1));
  const V = M.PROGRAMME.pal_emo.vorbild, k = M.PX_M, Bm = M.BREITE / k;
  const ausVorbild = spiegel => ({ g: V.map((teile, raum) => { const t = teile[0], x0 = spiegel ? Bm - t[2] : t[0], x1 = spiegel ? Bm - t[0] : t[2];
    return M.gen(raum, (x0 + x1) / 2 * k, (t[1] + t[3]) / 2 * k, (x1 - x0) * k, (t[3] - t[1]) * k, null, 0.4, 0, raum); }), fo: 0, fd: 0 });
  const A = M.aehnlichkeit(ausVorbild(false), "pal_emo");
  assert.ok(A.mittel > 0.999, `${A.mittel}`); assert.equal(A.gespiegelt.x, false);
  const S = M.aehnlichkeit(ausVorbild(true), "pal_emo");
  assert.ok(S.mittel > 0.999, `${S.mittel}`);
});

test("Rekonstruktion: Villa Emo mit Nähe 1 wiedergefunden (gültig, über 90 % ähnlich)", () => {
  const p = villa("emo", { naehe: 1 }), S = M.sucheNeu(p, zufall, { anzahl: 1, ziel: 1, saat: 1, laeufe: 4, generationen: 400 });
  while (!S.fertig) M.sucheWeiter(S, 400);
  assert.ok(S.treffer.length >= 1, `kein Treffer in ${S.laeufe} Läufen`);
  const T = S.treffer[0];
  assert.ok(T.wert.gueltig && M.aehnlichkeit(T.ind, T.programm).mittel > 0.9, `Ähnlichkeit ${M.aehnlichkeit(T.ind, T.programm).mittel}`);
});

/* ---------------------------------------------------------------- Siza/Duarte nachgenerieren (neu, 24.11.2026) */
const VS = require("../vorbilder_siza.js");
M.registriere(VS);
const haus = (v, q) => Object.assign({}, M.STANDARD, ...M.REGLER.map(k => ({ [k]: M.FASSUNGEN["sz_" + v][k] })), { fassung: "sz_" + v }, q);

test("Vorbilder Siza: sechs Häuser je Erd- und Obergeschoss, Räume füllen das Grundstück 8 × 12 m, Treppe und Luftraum im OG fest", () => {
  assert.equal(VS.liste.length, 6);
  assert.equal(Object.keys(VS.programme).length, 12);
  for (const pid of Object.keys(VS.programme)) {
    const P = M.PROGRAMME[pid], A = P.raeume.reduce((s, r) => s + r[2], 0);
    assert.ok(nah(A, 96, 0.01), `${pid}: ${A} m²`);
    assert.deepEqual([P.feld.b, P.feld.h], [8, 12]);
    if (pid.endsWith("_og")) assert.ok(P.raeume.some(r => r[0] === "Treppe" && r[4] && r[4].fest) && P.raeume.some(r => r[0].startsWith("Luftraum") && r[4] && r[4].fest), pid);
  }
  assert.ok(M.PROGRAMME.sz_ab_eg.paare.some(([a, b]) => b === -1), "Eingang vom Hof zur Straße");
});

test("Haus Siza (25.11.2026): Treppe in beiden Geschossen an derselben Stelle, Luftraum im OG genau über dem Hof des EG", () => {
  for (const h of VS.liste) {
    const E = M.PROGRAMME[h + "_eg"], O = M.PROGRAMME[h + "_og"];
    const stE = E.raeume.findIndex(r => r[4] && r[4].treppe), stO = O.raeume.findIndex(r => r[4] && r[4].treppe);
    assert.ok(stE >= 0 && stO >= 0 && !E.raeume[stE][4].fest && O.raeume[stO][4].fest, h);
    assert.deepEqual(E.vorbild[stE], O.vorbild[stO], h + ": Treppe");
    assert.deepEqual(E.vorbild[E.raeume.findIndex(r => r[1] === "Court")], O.vorbild[O.raeume.findIndex(r => r[1] === "Open to sky")], h + ": Hof = Luftraum");
    assert.ok(E.paare.some(q => q.includes(stE)), h + ": Treppe im EG erschlossen");
  }
  // Kopplung: das OG übernimmt Treppe und Hof aus dem EG-Plan
  const p = haus("t4"), z = M.erzeuge(p, zufall(1));
  for (let t = 0; t < 30; t++) M.schritt(z, p);
  const R = M.grundriss(M.beste(z), 120, M.TEILE_PX), st = R.find(q => q.tr), fo = z.og.fest.find(f => z.og.eltern[0].g.find(g => g.id === f[0]).tr);
  assert.ok(st && fo && nah(fo[1], st.x1 / M.PX_M, 1e-9) && nah(fo[4], st.y2 / M.PX_M, 1e-9), "Treppe im OG an der Stelle des EG");
  const g = z.og.eltern[0].g.find(q => q.id === fo[0]);
  assert.ok(nah(g.x, (fo[1] + fo[3]) / 2 * M.PX_M, 1e-6), "OG-Eltern tragen die feste Treppe");
});

test("Treppe (25.11.2026): Vorbilder erfüllen Antritt und Austritt; verstellt eine Wand das Podest, ist der Plan ungültig", () => {
  const p = haus("t4"), z = M.erzeuge(p, zufall(1)), P = M.PROGRAMME[z.programm], k = M.PX_M;
  const I = { g: z.eltern[0].g.map(g => { const ids = z.eltern[0].g.filter(q => q.r === g.r).map(q => q.id).sort((a, b) => a - b), t = P.vorbild[g.r][ids.indexOf(g.id)];
    return Object.assign({}, g, { x: (t[0] + t[2]) / 2 * k, y: (t[1] + t[3]) / 2 * k, w: (t[2] - t[0]) * k, h: (t[3] - t[1]) * k, a: (t[2] - t[0]) * (t[3] - t[1]) * k * k }); }), fo: 0, fd: 0 };
  const w = M.planPruefung(I, z.paare, z.programm, 300);
  assert.ok(w.gueltig && w.treppe < 0.05, `Vorbild: Treppe ${w.treppe}`);
  const S = I.g.find(g => g.tr); S.y += 1.2 * k;                        // Treppe um 1,2 m verschoben: Zugang verstellt
  assert.ok(M.planPruefung(I, z.paare, z.programm, 300).treppe > 0.05);
  assert.deepEqual(M.treppeVon("sz_t4_eg", P.raeume.findIndex(r => r[4] && r[4].treppe)).kante, "y1");
});

test("Feste Räume bleiben an der Stelle des Vorbilds, Teile in Ketten hängen an ihrem Anker", () => {
  const p = haus("dn_og"), z = M.erzeuge(p, zufall(1));
  for (let t = 0; t < 20; t++) M.schritt(z, p);
  for (const e of z.eltern) for (const [id, x0, y0, x1, y1] of z.fest) {
    const g = e.g.find(q => q.id === id);
    assert.ok(nah(g.x, (x0 + x1) / 2 * M.PX_M, 1e-6) && nah(g.y, (y0 + y1) / 2 * M.PX_M, 1e-6) && nah(g.w, (x1 - x0) * M.PX_M, 1e-6), `fester Raum ${id}`);
  }
  const flur = M.PROGRAMME.sz_dn_og.raeume.find(r => r[0] === "Flur")[4];
  assert.ok(flur.teile.length >= 3 && flur.anker.length === flur.teile.length && flur.anker[0] === -1);
  const kette = z.eltern[0].g.filter(g => g.r !== g.id && M.PROGRAMME.sz_dn_og.raeume[g.r][0] === "Flur");
  assert.ok(kette.every(g => g.an != null), "jeder Teil des Flurs hat einen Anker");
});

test("Haus-Suche Siza: ein Treffer ist ein Haus mit gültigem EG und gültigem OG, Treppe und Hof übereinander", () => {
  const p = haus("bb", { naehe: 1 }), S = M.sucheNeu(p, zufall, { anzahl: 1, ziel: 1, saat: 1, laeufe: 15, generationen: 400 });
  while (!S.fertig) M.sucheWeiter(S, 400);
  assert.ok(S.treffer.length >= 1, `kein Haus in ${S.laeufe} Läufen`);
  const T = S.treffer[0], st = T.plan.find(q => q.tr), so = T.og.plan.find(q => q.tr);
  assert.ok(T.wert.gueltig && T.og.wert.gueltig);
  assert.ok(nah(st.x1, so.x1, 0.5) && nah(st.y1, so.y1, 0.5) && nah(st.x2, so.x2, 0.5), "Treppe übereinander");
});

test("Abgestimmte Voreinstellungen: jede Vorbild-Fassung trägt starr, Federrunden und Belegung aus werkzeuge/abstimmung.json", () => {
  const A = require("../werkzeuge/abstimmung.json");
  for (const [f0, e] of Object.entries(A)) {
    const f = f0.endsWith("_eg") ? f0.slice(0, -3) : f0;                 // Siza: das EG trägt die Werte des Hauses, das OG seine eigenen
    assert.equal(M.FASSUNGEN[f].starr, e.starr, f); assert.equal(M.FASSUNGEN[f].federRunden, e.federRunden, f); assert.equal(M.FASSUNGEN[f].belegung, e.belegung, f);
  }
  assert.equal(Object.keys(A).length, 20);
});

test("Rekonstruktion Saraceno mit abgestimmter Voreinstellung: gültig und über 85 % ähnlich (bester von bis zu drei Treffern)", () => {
  const p = villa("saraceno"), S = M.sucheNeu(p, zufall, { anzahl: 1, ziel: 3, saat: 1, laeufe: 8, generationen: 400 });
  while (!S.fertig) M.sucheWeiter(S, 400);
  assert.ok(S.treffer.length >= 1, `kein Treffer in ${S.laeufe} Läufen`);
  assert.ok(Math.max(...S.treffer.map(t => M.aehnlichkeit(t.ind, t.programm).mittel)) > 0.85);
});

test("Schalter Raumgruppe spiegeln und Wände verschieben: Regler vorhanden, Suche findet mit beiden einen gültigen Plan (25.11.2026)", () => {
  assert.ok(M.REGLER.includes("cluster") && M.REGLER.includes("wand"));
  assert.equal(M.STANDARD.cluster, 0); assert.equal(M.STANDARD.wand, false);
  const S = M.sucheNeu(fassung("grundriss6", { cluster: 0.05, wand: true }), zufall, { anzahl: 1, ziel: 1, saat: 1, laeufe: 6, generationen: 400 });
  while (!S.fertig) M.sucheWeiter(S, 400);
  assert.ok(S.treffer.length >= 1 && S.treffer[0].wert.gueltig);
});

test("Voreinstellungen aus der Abstimmung über zwei Saatgruppen: Malcontenta frei mit Raumgruppe spiegeln (25.11.2026)", () => {
  M.registriere(require("../vorbilder_palladio.js"));
  assert.equal(M.FASSUNGEN.pal_malcontenta.starr, false);
  assert.equal(M.FASSUNGEN.pal_malcontenta.cluster, 0.02);
});
