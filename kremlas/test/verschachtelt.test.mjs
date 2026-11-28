// Tests der verschachtelten dichten Packung (Versuch 6, 28.11.2026; node --test) und der Anschlüsse im Modell
// Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0
// Prüfprogramme bewusst keine Wohnung (allgemeingültig): zwei Praxiseinheiten an einem Flur, dazu ein symmetrisches Programm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const V = require("../verschachtelt.js");
const { zufall } = require("../../simulationen/_gemeinsam/zufall.js");

// zwei Einheiten (je Warten + zwei Behandlungsräume + WC) an einem gemeinsamen Flur
const PRAXEN = {
  titel: "Zwei Praxen (Prüfprogramm)",
  feld: { b: 16, h: 9, tuer: 0.9, tuerRand: 0, wand: 0.12, umriss: [[0, 0], [16, 0], [16, 9], [0, 9]], kanten: ["fassade", "innen", "fassade", "innen"], eingang: [7.4, 9, 8.6, 9.6] },
  raeume: [["Flur", "Corridor", 14, 1.4, { erschliessung: true }],
           ["Warten A", "Waiting A", 14, 2.6, { fassade: true }], ["Behandlung A1", "Treatment A1", 13, 2.8, { fassade: true }], ["Behandlung A2", "Treatment A2", 13, 2.8, { fassade: true }], ["WC A", "WC A", 4, 1.4, null],
           ["Warten B", "Waiting B", 14, 2.6, { fassade: true }], ["Behandlung B1", "Treatment B1", 13, 2.8, { fassade: true }], ["Behandlung B2", "Treatment B2", 13, 2.8, { fassade: true }], ["WC B", "WC B", 4, 1.4, null]],
  paare: [[0, -1], [0, 1], [0, 5], [1, 2], [1, 3], [1, 4], [5, 6], [5, 7], [5, 8]]
};
M.registriere({ programme: { pruef_praxen: PRAXEN }, fassungen: { pruef_praxen: { programm: "pruef_praxen", naehe: 0, starr: false } } });
const param = (f, q) => Object.assign({}, M.STANDARD, ...M.REGLER.map(k => ({ [k]: M.FASSUNGEN[f][k] })), { fassung: f, naehe: 0 }, q || {});

test("Modell: Anschlüsse (feld.anschluesse) sind Nachbarn −2, −3, … – Tür am Vorraum außen an der Kante", () => {
  const P = { titel: "Anschluss", feld: { b: 6, h: 4, tuer: 0.9, tuerRand: 0, umriss: [[0, 0], [6, 0], [6, 4], [0, 4]], kanten: ["innen", "innen", "innen", "innen"], anschluesse: [[6, 0, 6.6, 4], [0, -0.6, 3, 0]] },
              raeume: [["A", "A", 12, 2, null], ["B", "B", 12, 2, null]], paare: [[0, 1], [1, -2], [0, -3]] };
  M.registriere({ programme: { pruef_anschluss: P }, fassungen: { pruef_anschluss: { programm: "pruef_anschluss", naehe: 0, starr: false } } });
  M.erzeuge(param("pruef_anschluss"), zufall(1));
  const k = M.PX_M, g = (id, x0, y0, x1, y1) => M.gen(id, (x0 + x1) / 2 * k, (y0 + y1) / 2 * k, (x1 - x0) * k, (y1 - y0) * k);
  const gut = { g: [g(0, 0, 0, 3, 4), g(1, 3, 0, 6, 4)], fo: 0, fd: 0 };          // A oben am Anschluss −3, B rechts am Anschluss −2
  const w = M.planPruefung(gut, P.paare, "pruef_anschluss");
  assert.equal(w.fehlt, 0, "alle Türen, auch an den Anschlüssen");
  const schlecht = { g: [g(0, 3, 0, 6, 4), g(1, 0, 0, 3, 4)], fo: 0, fd: 0 };    // vertauscht: keiner liegt an seinem Anschluss
  assert.equal(M.planPruefung(schlecht, P.paare, "pruef_anschluss").fehlt, 2);
  assert.equal(M.ANSCHLUSS.length, 2);
  M.erzeuge(param("pruef_praxen"), zufall(1));
  assert.equal(M.ANSCHLUSS.length, 0, "ohne Angabe keine Anschlüsse");
});

test("Verschachtelt: Gruppierungen saatfrei und gleich bei gleicher Eingabe, jeder Raum genau einmal, keine Raumnamen nötig", () => {
  const A = V.gruppierungen(PRAXEN), B = V.gruppierungen(PRAXEN);
  assert.ok(A.length >= 2);
  assert.equal(JSON.stringify(A), JSON.stringify(B));
  for (const g of A) assert.deepEqual(g.gruppen.flatMap(q => q.raeume).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const graph = A.find(g => g.verfahren === "graph" && g.erschliessung === "eigen");
  const s = graph.gruppen.map(q => q.raeume.join(",")).sort();
  assert.ok(s.includes("0"), "Erschließung als eigene Gruppe");
  assert.ok(s.includes("1,2,3,4") && s.includes("5,6,7,8"), "die beiden Einheiten werden je eine Gruppe: " + s.join(" | "));
  const umbenannt = JSON.parse(JSON.stringify(PRAXEN)); umbenannt.raeume.forEach((r, i) => { r[0] = "R" + i; r[1] = "R" + i; });
  assert.equal(JSON.stringify(V.gruppierungen(umbenannt).map(g => g.gruppen)), JSON.stringify(A.map(g => g.gruppen)), "Namen ändern nichts");
});

test("Verschachtelt: Programm der Gruppen – Flächen mit Wand, Nachbarschaften zwischen Gruppen, Eingang, Fassadenbedarf", () => {
  const grp = V.gruppierungen(PRAXEN).find(g => g.verfahren === "graph" && g.erschliessung === "eigen");
  const P = V.gruppenprogramm(PRAXEN, grp), i0 = grp.gruppen.findIndex(q => q.raeume.join() === "0");
  const summe = P.raeume.reduce((s, r) => s + r[2], 0);
  assert.ok(summe > 102 && summe < 116, "Summe der Gruppenflächen mit Innenwänden: " + summe);
  assert.ok(P.paare.some(([a, b]) => b === -1 && a === i0), "Flurgruppe am Eingang");
  assert.equal(P.paare.filter(([a, b]) => b >= 0).length, 2, "zwei Einheiten je am Flur");
  for (const [i, q] of grp.gruppen.entries()) if (q.raeume.some(k => PRAXEN.raeume[k][4] && PRAXEN.raeume[k][4].fassade)) assert.ok(P.raeume[i][4].fassade);
});

test("Verschachtelt: Symmetrie – gespiegelte Gruppenpaare und Achsgruppe, Zone der rechten Gruppe ist das Spiegelbild der linken", () => {
  const SYM = { titel: "Symmetrisch (Prüfprogramm)", feld: { b: 12, h: 8 },
    raeume: [["Mitte", "Middle", 30, 3, null], ["L1", "L1", 15, 2.5, null], ["R1", "R1", 15, 2.5, null], ["L2", "L2", 9, 2, null], ["R2", "R2", 9, 2, null]],
    paare: [[0, -1], [0, 1], [0, 2], [1, 3], [2, 4]], symmetrie: { achse: [0], paare: [[1, 2], [3, 4]] } };
  const grp = V.gruppierungen(SYM, { groessen: [3], erschliessung: ["mit"], verfahren: ["graph"] })[0];
  const rechts = grp.gruppen.findIndex(q => q.spiegelVon != null), links = rechts >= 0 ? grp.gruppen[rechts].spiegelVon : -1;
  assert.ok(rechts >= 0 && grp.gruppen.some(q => q.achse), JSON.stringify(grp.gruppen));
  const partner = { 1: 2, 2: 1, 3: 4, 4: 3 };
  assert.deepEqual(grp.gruppen[rechts].raeume, grp.gruppen[links].raeume.map(k => partner[k]).sort((a, b) => a - b), "rechts = Spiegelbild von links");
  const P = V.gruppenprogramm(SYM, grp);
  assert.deepEqual(P.symmetrie.paare, [[links, rechts]]);
  const rects = []; rects[links] = [0, 0, 4, 8]; rects[rechts] = [8.5, 0, 12, 7]; rects[grp.gruppen.findIndex(q => q.achse)] = [4, 0, 8, 8];
  const zon = V.zonen(SYM, grp, rects), zr = zon.zonen.find(z => z.gi === rechts);
  assert.deepEqual(zr.rect, [8, 0, 12, 8]);
  assert.equal(zon.zonen[zr.spiegelVon].gi, links);
});

test("Verschachtelt: Teilfeld mit Anschlüssen an der Grenze zur Nachbargruppe, Eingang nur, wo der Vorraum die Gruppe berührt", () => {
  const grp = V.gruppierungen(PRAXEN).find(g => g.verfahren === "graph" && g.erschliessung === "eigen");
  const iF = grp.gruppen.findIndex(q => q.raeume.join() === "0"), iA = grp.gruppen.findIndex(q => q.raeume.join() === "1,2,3,4"), iB = grp.gruppen.findIndex(q => q.raeume.join() === "5,6,7,8");
  const rects = []; rects[iA] = [0, 0, 7, 9]; rects[iF] = [7, 0, 9, 9]; rects[iB] = [9, 0, 16, 9];
  const zon = V.zonen(PRAXEN, grp, rects), jA = zon.zonen.findIndex(z => z.gi === iA), jF = zon.zonen.findIndex(z => z.gi === iF);
  const tA = V.teilprogramm(PRAXEN, zon, jA);
  assert.deepEqual(tA.prog.feld.anschluesse, [[7, 0, 7.6, 9]], "Vorraum außen an der Kante zum Flur");
  assert.ok(tA.prog.paare.some(([a, b]) => b === -2 && tA.abbild[a] === 1), "Warten A an den Flur");
  assert.equal(tA.prog.feld.eingang, undefined, "der Eingang berührt die Gruppe A nicht");
  const tF = V.teilprogramm(PRAXEN, zon, jF);
  assert.deepEqual(tF.prog.feld.eingang, [0.4, 9, 1.6, 9.6]);
  assert.equal(tF.prog.feld.anschluesse.length, 2);
  // gepackte Nachbargruppe: der Anschluss sitzt nur dort, wo der Nachbarraum an der Grenze liegt
  const tF2 = V.teilprogramm(PRAXEN, zon, jF, { geloest: new Map([[1, [[3, 0, 7, 4]]]]) });
  assert.deepEqual(tF2.prog.feld.anschluesse[0], [-0.6, 0, 0, 4]);
});

test("Verschachtelt: Lösen findet einen gültigen Plan des ganzen Programms; gleiche Saat → gleiche Gruppierungen und Zonen", () => {
  const o = { budget: 25000, saat: 2, param, zufall, naehe: 0, verfeinern: 0, ziel: 1 };
  const r = V.loese(M, "pruef_praxen", o);
  assert.ok(r.treffer.length >= 1, JSON.stringify(r.stat));
  const T = r.treffer[0];
  M.erzeuge(param("pruef_praxen"), zufall(1));
  assert.ok(M.planPruefung(T.ind, PRAXEN.paare, "pruef_praxen").gueltig);
  assert.ok(T.gplan.length >= 2 && T.quelle === "direkt");
});
