// Tests der Grammatik (Versuch 4, 27.11.2026; node --test) · Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0
// Prüfprogramm bewusst keine Wohnung (allgemeingültig): ein kleines Büro mit Flur, vier Einzelbüros an der Fassade und innen liegendem Kern.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const G = require("../grammatik.js");
const { zufall } = require("../../simulationen/_gemeinsam/zufall.js");

const BUERO = {
  titel: "Büro (Prüfprogramm)",
  feld: { b: 12, h: 8, tuer: 0.9, tuerRand: 0, wand: 0.12, umriss: [[0, 0], [12, 0], [12, 8], [0, 8]], kanten: ["fassade", "innen", "fassade", "innen"], eingang: [-0.6, 3.4, 0, 4.6] },
  raeume: [["Flur", "Corridor", 12, 1.2, { erschliessung: true }], ["Büro 1", "Office 1", 13, 2.6, { fassade: true }], ["Büro 2", "Office 2", 13, 2.6, { fassade: true }],
           ["Büro 3", "Office 3", 13, 2.6, { fassade: true }], ["Büro 4", "Office 4", 13, 2.6, { fassade: true }], ["WC", "WC", 4, 1.5, null], ["Teeküche", "Kitchenette", 5, 1.8, null]],
  paare: [[0, -1], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]]
};
M.registriere({ programme: { pruef_buero: BUERO }, fassungen: { pruef_buero: { programm: "pruef_buero", naehe: 0, starr: false } } });
const param = q => Object.assign({}, M.STANDARD, ...M.REGLER.map(k => ({ [k]: M.FASSUNGEN.pruef_buero[k] })), { fassung: "pruef_buero", naehe: 0 }, q);

test("Grammatik: Eigenschaften nur aus dem Programm; ohne Angabe erschließt der Raum mit den meisten Nachbarschaften am Eingang", () => {
  const E = G.eigenschaften(BUERO);
  assert.deepEqual(E.map(e => e.erschliessung), [true, false, false, false, false, false, false]);
  assert.deepEqual(E.map(e => e.dienend), [false, false, false, false, false, true, true]);
  const ohne = JSON.parse(JSON.stringify(BUERO)); delete ohne.raeume[0][4];
  assert.equal(G.eigenschaften(ohne)[0].erschliessung, true, "Grad 7 am Eingang");
});

test("Grammatik: Zonierung saatgetreu, Band am Eingang, jeder Raum genau einmal, Räume mit Fassade in Zonen mit Fassade", () => {
  const A = G.zonierungen(BUERO, { saat: 3 }), B = G.zonierungen(BUERO, { saat: 3 });
  assert.ok(A.length > 0);
  assert.deepEqual(JSON.stringify(A), JSON.stringify(B));
  for (const zon of A) {
    const r = zon.band.rect, ov = Math.min(r[3], 4.6) - Math.max(r[1], 3.4);
    assert.ok(r[0] <= 0.01 && ov >= 0.9, "Band berührt den Vorraum");
    const alle = zon.zonen.flatMap(z => z.raeume).sort();
    assert.deepEqual(alle, [1, 2, 3, 4, 5, 6]);
  }
  const z0 = A[0];
  for (const z of z0.zonen) if (z.raeume.some(k => k >= 1 && k <= 4)) assert.ok(z.fassade >= 1.1);
});

test("Grammatik hierarchisch: Teilprogramme packen, zusammensetzen, das ganze Programm prüfen", () => {
  const zon = G.zonierungen(BUERO, { saat: 1 })[0], teile = [];
  zon.zonen.forEach((z, j) => {
    const tp = G.teilprogramm(BUERO, zon, j), key = "pruef_buero_z" + j;
    assert.ok(tp.prog.paare.every(([a, b]) => b === -1 || b < tp.prog.raeume.length));
    M.registriere({ programme: { [key]: tp.prog }, fassungen: { [key]: { programm: key, naehe: 0, starr: false } } });
    const S = M.sucheNeu(Object.assign({}, M.STANDARD, ...M.REGLER.map(k => ({ [k]: M.FASSUNGEN[key][k] })), { fassung: key, naehe: 0 }), zufall, { anzahl: 1, ziel: 1, saat: 1, laeufe: 6, generationen: 150 });
    let best = null;
    for (let i = 0; i < 200 && !S.fertig; i++) { M.sucheWeiter(S, 25); if (S.lauf && S.lauf.z) for (const e of S.lauf.z.eltern) if (!best || e.f3 < best.f3) best = M.kopie(e); }
    const ind = S.treffer.length ? S.treffer[0].ind : best;
    M.setzeFeld(tp.prog.feld); const k = M.PX_M;
    teile.push({ abbild: tp.abbild, ursprung: tp.ursprung, rechtecke: ind.g.map(g => { const q = M.rechteck(g); return { r: g.r, id: g.id, an: g.an, bd: g.bd, x1: q.x1 / k, y1: q.y1 / k, x2: q.x2 / k, y2: q.y2 / k }; }) });
  });
  M.erzeuge(param({}), zufall(1));
  const I = G.zusammensetzen(M, BUERO, zon, teile);
  assert.deepEqual([...new Set(I.g.map(g => g.r))].sort(), [0, 1, 2, 3, 4, 5, 6]);
  const w = M.planPruefung(I, BUERO.paare, "pruef_buero");
  assert.ok(Number.isFinite(w.f3));
  const k = M.PX_M; assert.ok(I.g.every(g => g.x >= 0 && g.x <= 12 * k + 1 && g.y >= 0 && g.y <= 8 * k + 1), "alle Gene im Feld");
});

test("Grammatik Regeln: eine fehlende Tür über eine Lücke wird hergestellt (Regel T), f3 sinkt", () => {
  M.erzeuge(param({}), zufall(1));
  const k = M.PX_M, R = (id, x0, y0, x1, y1) => M.gen(id, (x0 + x1) / 2 * k, (y0 + y1) / 2 * k, (x1 - x0) * k, (y1 - y0) * k, null, 0.4, 0, id);
  // Flur als Mittelzone, Büros oben/unten, Büro 4 mit 0,4 m Lücke zum Flur (keine Tür)
  const I = { g: [R(0, 0, 3.4, 12, 4.6), R(1, 0, 0, 3, 3.4), R(2, 3, 0, 6, 3.4), R(3, 6, 0, 9, 3.4), R(4, 0, 5.0, 4, 8), R(5, 9, 0, 10.5, 3.4), R(6, 10.5, 0, 12, 3.4)], fo: 0, fd: 0 };
  const w0 = M.planPruefung(I, BUERO.paare, "pruef_buero");
  const r = G.aufraeumen(M, I, BUERO.paare, "pruef_buero", zufall(2), 3000);
  assert.ok(r.wert.f3 <= w0.f3);
  assert.ok(r.wert.fehlt <= w0.fehlt);
});

test("Grammatik als Mutation: ohne Parameter rechnet das Modell exakt wie ohne Modul; mit Parameter saatgetreu", () => {
  const lage = z => JSON.stringify(z.eltern.map(e => e.g.map(g => [g.id, +g.x.toFixed(6), +g.y.toFixed(6), +g.w.toFixed(6)])));
  const lauf = (q, s) => { const p = param(q), z = M.erzeuge(p, zufall(s)); for (let t = 0; t < 8; t++) M.schritt(z, p); return lage(z); };
  M.setzeGrammatik(null); const ohneModul = lauf({}, 4);
  M.setzeGrammatik(G); const mitModulAus = lauf({}, 4), aus0 = lauf({ grammatik: 0 }, 4);
  assert.equal(mitModulAus, ohneModul); assert.equal(aus0, ohneModul);
  const a = lauf({ grammatik: 0.5 }, 4), b = lauf({ grammatik: 0.5 }, 4);
  assert.equal(a, b);
  assert.notEqual(a, ohneModul, "Regeln wirken");
  M.setzeGrammatik(null);
});

// Versuch 5 (28.11.2026): Spiegelachse und feste Räume – allgemeine Prüfprogramme ohne Raumnamen-Regeln
const SYM = {
  titel: "Symmetrisches Prüfprogramm", feld: { b: 20, h: 12 },
  raeume: [["A", "A", 30, 3, null], ["A'", "A'", 30, 3, null], ["B", "B", 24, 3, null], ["B'", "B'", 24, 3, null], ["Halle", "Hall", 70, 4, null]],
  paare: [[0, 4], [1, 4], [2, 4], [3, 4], [0, 2], [1, 3], [4, -1]],
  symmetrie: { achse: [4], paare: [[0, 1], [3, 2]] }
};
test("Grammatik (o.sym): Band auf der Achse, Paare auf beide Seiten, rechte Zone gespiegelt; ohne o.sym unverändert", () => {
  const Z = G.zonierungen(SYM, { sym: true, saat: 1 });
  assert.ok(Z.length > 0);
  for (const zon of Z) {
    const r = zon.band.rect; assert.ok(Math.abs((r[0] + r[2]) / 2 - 10) < 0.06, "Band mittig auf der Achse");
    const li = zon.zonen.find(z => z.spiegelVon == null && z.rect[2] <= r[0] + 1e-6), re = zon.zonen.find(z => z.spiegelVon != null);
    assert.ok(li && re); assert.deepEqual(li.raeume.slice().sort(), [0, 2], "Nachbarn 0–2 auf einer Seite (Paar 3/2 umgedreht)");
    assert.deepEqual(re.raeume.slice().sort(), [1, 3]);
  }
  const ohne = G.zonierungen(SYM, { saat: 1 });
  assert.ok(ohne.every(z => !z.sym));
  // spiegleTeile: Rechteck der linken Zone erscheint gespiegelt beim Partner
  const zon = Z[0], li = zon.zonen.findIndex(z => z.spiegelVon == null && z.raeume.includes(0)), re = zon.zonen.findIndex(z => z.spiegelVon === li);
  const teile = zon.zonen.map(() => null);
  teile[li] = { abbild: zon.zonen[li].raeume.slice(), ursprung: [0, 0], rechtecke: zon.zonen[li].raeume.map((k, i) => ({ r: i, id: i, x1: 1, y1: 2 + 4 * i, x2: 4, y2: 5 + 4 * i })) };
  G.spiegleTeile(SYM, zon, teile);
  const T = teile[re], i0 = T.abbild.indexOf(1);
  assert.ok(i0 >= 0); const q = T.rechtecke.find(x => x.r === i0);
  assert.deepEqual([q.x1, q.x2], [16, 19]);
});
test("Grammatik (o.festEingang, o.festMeiden): ohne Eingang beginnt das Band am festen Raum an der Erschließung und überdeckt keinen festen Raum", () => {
  const P = {
    titel: "Geschoss mit Treppe", feld: { b: 8, h: 12 },
    raeume: [["T", "T", 5, 0, { fest: true }], ["F", "F", 10, 1, { erschliessung: true }], ["R1", "R1", 14, 2.4, null], ["R2", "R2", 14, 2.4, null], ["R3", "R3", 14, 2.4, null], ["L", "L", 12, 0, { fest: true }]],
    paare: [[0, 1], [1, 2], [1, 3], [1, 4]],
    vorbild: [[[5, 0, 7, 3]], [[0, 3, 8, 4.2]], [[0, 0, 5, 3]], [[0, 4.2, 4, 8]], [[4, 4.2, 8, 8]], [[0, 9, 8, 12]]]
  };
  const ein = G.festEingang(P, G.eigenschaften(P));
  assert.deepEqual([ein.innen, ein.rand], ["unten", 3]);
  const Z = G.zonierungen(P, { festEingang: true, festMeiden: true, saat: 1 });
  assert.ok(Z.length > 0);
  const ueber = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  for (const zon of Z) for (const k of [0, 5]) assert.ok(ueber(zon.band.rect, P.vorbild[k][0]) <= 0.05, "Band meidet feste Räume");
  assert.deepEqual(JSON.stringify(G.zonierungen(P, { saat: 1 })), JSON.stringify(G.zonierungen(P, { saat: 1 })), "ohne Schalter saatgetreu");
});
