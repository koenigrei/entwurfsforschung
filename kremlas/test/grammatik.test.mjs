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
