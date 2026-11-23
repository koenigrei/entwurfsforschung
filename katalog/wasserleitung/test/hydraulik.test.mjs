// Tests des Rohrnetzlösers hydraulik.js (node --test im App-Ordner) · CC BY 4.0
// Gleiche Datei in katalog/wasserleitung/test/ und katalog/wassernetz/test/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const H = require("../hydraulik.js");
const nah = (a, b, tol, was) => assert.ok(Math.abs(a - b) <= tol, `${was || ""}: ${a} ≠ ${b} (±${tol})`);

const behaelter = (z, f) => ({ z, behaelter: true, kopf: z + f });
const rohr = (a, b, L, d, C = 120) => ({ a, b, art: "rohr", L, d, C });

test("Hazen-Williams: Beiwert in SI ≈ 10.67 (aus EPANETs 4.727 in ft/cfs) und Verlust nachgerechnet", () => {
  nah(H.K_HW, 10.67, 0.01, "K");
  // 1 km Rohr, d = 0.3 m, C = 100, Q = 0.1 m³/s: h = 10.67 · 1000 · 0.1^1.852 / (100^1.852 · 0.3^4.871)
  const h = H.verlustHW(H.widerstand(1000, 0.3, 100), 0.1);
  nah(h, 10.67 * 1000 * Math.pow(0.1, 1.852) / (Math.pow(100, 1.852) * Math.pow(0.3, 4.871)), 0.01, "h");
  nah(h, 10.45, 0.02, "von Hand: 10.67 · 1000 · 0.01406 / (5047 · 0.002835)");
  assert.ok(H.verlustHW(1, -0.1) < 0, "Vorzeichen folgt dem Durchfluss");
});

test("Ein Rohr: Durchfluss = Bedarf, Höhe = Wasserspiegel − Verlust", () => {
  const netz = { knoten: [behaelter(50, 5), { z: 10, bedarf: 0.05 }], leitungen: [rohr(0, 1, 500, 0.2)] };
  const S = H.loese(netz), E = H.ergebnisse(netz, S);
  assert.ok(S.fehler <= H.GENAUIGKEIT && S.iter < 15, "Iterationen: " + S.iter);
  nah(S.Q[0], 0.05, 1e-6, "Q");
  const r = H.widerstand(500, 0.2, 120);
  nah(S.Hk[1], 55 - r * Math.pow(0.05, 1.852), 1e-4, "H");
  nah(E.knoten[1].druck, S.Hk[1] - 10, 1e-9, "Druck");
  nah(E.leitungen[0].v, 0.05 / (Math.PI * 0.01), 1e-6, "v");
  nah(E.leitungen[0].verlust, 1000 * r * Math.pow(0.05, 1.852) / 500, 1e-4, "m/km");
  nah(E.knoten[0].bedarf, -50, 1e-3, "Behälter gibt 50 L/s ab");
});

test("Zwei parallele Rohre: Aufteilung nach r1 · Q1^1.852 = r2 · Q2^1.852", () => {
  const netz = { knoten: [behaelter(0, 30), { z: 0, bedarf: 0.1 }], leitungen: [rohr(0, 1, 300, 0.25), rohr(0, 1, 600, 0.15)] };
  const S = H.loese(netz);
  const r1 = H.widerstand(300, 0.25, 120), r2 = H.widerstand(600, 0.15, 120);
  const q1 = 0.1 / (1 + Math.pow(r1 / r2, 1 / 1.852));
  nah(S.Q[0], q1, 1e-5, "Q1"); nah(S.Q[0] + S.Q[1], 0.1, 1e-9, "Summe");
  nah(H.verlustHW(r1, S.Q[0]), H.verlustHW(r2, S.Q[1]), 1e-3, "gleicher Verlust");
});

test("Masche (Dreieck): Massenbilanz und Energiesatz stimmen mit einer Hardy-Cross-Rechnung überein", () => {
  // Behälter 0 → A (1) und → B (2), dazu A–B; Bedarf in A und B
  const netz = { knoten: [behaelter(100, 0), { z: 60, bedarf: 0.03 }, { z: 50, bedarf: 0.05 }],
                 leitungen: [rohr(0, 1, 400, 0.2), rohr(0, 2, 900, 0.2), rohr(1, 2, 300, 0.15)] };
  const S = H.loese(netz);
  assert.ok(H.bilanzfehler(netz, S) < 1e-9, "Massenbilanz");
  const r = netz.leitungen.map(l => H.widerstand(l.L, l.d, l.C));
  // Masche 0→1→2←0: h01 + h12 − h02 = 0
  nah(H.verlustHW(r[0], S.Q[0]) + H.verlustHW(r[2], S.Q[2]) - H.verlustHW(r[1], S.Q[1]), 0, 2e-3, "Energiesatz");
  // Hardy Cross unabhängig: Q01 = x, Q12 = x − 0.03, Q02 = 0.08 − x
  let x = 0.04;
  for (let i = 0; i < 200; i++) {
    const f = H.verlustHW(r[0], x) + H.verlustHW(r[2], x - 0.03) - H.verlustHW(r[1], 0.08 - x);
    const df = 1.852 * (r[0] * Math.pow(Math.abs(x), 0.852) + r[2] * Math.pow(Math.abs(x - 0.03), 0.852) + r[1] * Math.pow(Math.abs(0.08 - x), 0.852));
    x -= f / df;
  }
  nah(S.Q[0], x, 2e-5, "Q01"); nah(S.Q[2], x - 0.03, 2e-5, "Q12"); nah(S.Q[1], 0.08 - x, 2e-5, "Q02");
});

test("Pumpe konstanter Leistung: Förderhöhe = P / (ρ g Q)", () => {
  const netz = { knoten: [behaelter(0, 5), { z: 0, bedarf: 0 }, { z: 0, bedarf: 0.1 }],
                 leitungen: [rohr(0, 1, 10, 0.9), { a: 1, b: 2, art: "pumpe", P: 20 }] };
  const S = H.loese(netz), E = H.ergebnisse(netz, S);
  nah(S.Q[1], 0.1, 1e-6, "Pumpendurchfluss");
  nah(E.leitungen[1].foerderhoehe, 20 / (9.80 * 0.1), 0.05, "Förderhöhe ≈ 20.4 m");
  nah(S.Hk[2] - S.Hk[1], H.foerderhoehe(20, 0.1), 1e-3, "Höhengewinn");
  nah(E.leitungen[1].energie, 20 / H.WIRKUNGSGRAD, 0.01, "Energie = P / Wirkungsgrad");
  assert.equal(E.leitungen[1].v, 0);
});

test("Grenzfälle: Bedarf 0 → Durchfluss 0 und hydrostatischer Druck; Totstrang ohne Bedarf; Verlauf der Iterationen", () => {
  const netz = { knoten: [behaelter(20, 2), { z: 0, bedarf: 0 }, { z: -5, bedarf: 0 }], leitungen: [rohr(0, 1, 100, 0.1), rohr(1, 2, 50, 0.1)] };
  const S = H.loese(netz), E = H.ergebnisse(netz, S);
  nah(S.Q[0], 0, 1e-9); nah(E.knoten[1].druck, 22, 1e-6); nah(E.knoten[2].druck, 27, 1e-6);
  assert.equal(S.verlauf.length, S.iter);
  assert.ok(!S.singulaer);
  // Länge und Durchmesser 0 werden abgefangen (kein NaN)
  const n2 = { knoten: [behaelter(0, 1), { z: 0, bedarf: 0.001 }], leitungen: [rohr(0, 1, 0, 0)] };
  const S2 = H.loese(n2);
  assert.ok(Number.isFinite(S2.Hk[1]));
});

/** Testnet.inp aus dem Katalog (WaterNetworkAnalysis): 10 Verbraucher je 100 L/s, Leitung d = 900 mm, Pumpe 20 kW an Leitung 9.
    Die .rpt-Datei enthält keine Ergebnisse – geprüft wird Plausibilität: Durchflüsse 1000, 900, …, 100 L/s, Druck = Höhe − Lage. */
function liesInp(text) {
  const abschnitt = name => { const m = text.split("[" + name + "]")[1]; return m ? m.split("[")[0].split("\n").map(z => z.split(";")[0].trim()).filter(Boolean) : []; };
  const id = new Map(), knoten = [];
  for (const z of abschnitt("JUNCTIONS")) { const [i, e, d] = z.split(/\s+/); id.set(i, knoten.length); knoten.push({ z: +e, bedarf: +d / 1000 }); }
  for (const z of abschnitt("TANKS")) { const [i, e, lvl] = z.split(/\s+/); id.set(i, knoten.length); knoten.push(behaelter(+e, +lvl)); }
  const leitungen = [];
  for (const z of abschnitt("PIPES")) { const [, a, b, L, d, C] = z.split(/\s+/); leitungen.push(rohr(id.get(a), id.get(b), +L, +d / 1000, +C)); }
  for (const z of abschnitt("PUMPS")) { const [, a, b, , P] = z.split(/\s+/); leitungen.push({ a: id.get(a), b: id.get(b), art: "pumpe", P: +P }); }
  return { knoten, leitungen };
}
const SP = join(dirname(fileURLToPath(import.meta.url)), "Testnet.inp");
test("Testnet.inp (Katalog): Durchflüsse, Druck und Pumpe plausibel", { skip: !existsSync(SP) && "Testnet.inp nicht im Testordner" }, () => {
  const netz = liesInp(readFileSync(SP, "utf8"));
  assert.equal(netz.knoten.length, 11); assert.equal(netz.leitungen.length, 10);
  const S = H.loese(netz), E = H.ergebnisse(netz, S);
  assert.ok(S.iter <= 40 && S.fehler <= 0.001);
  for (let k = 0; k < 9; k++) nah(E.leitungen[k].q, 1000 - 100 * k, 1e-6, "Rohr " + k);
  nah(E.leitungen[9].q, 100, 1e-6, "Pumpe");
  nah(E.leitungen[9].foerderhoehe, 20.4, 0.1, "Förderhöhe 20 kW bei 100 L/s");
  // Rohre mit 900 mm und ≤ 1 m³/s verlieren kaum Höhe: Druck ≈ 5 m − Lage
  E.knoten.slice(0, 9).forEach((k, i) => nah(k.druck, 5 - netz.knoten[i].z, 0.6, "Knoten " + (i + 1)));
  nah(E.knoten[9].kopf - E.knoten[8].kopf, 20.4, 0.1, "hinter der Pumpe steigt die Höhe um die Förderhöhe");
});

/** hydroanalysis1.inp aus dem Katalog (WaterNetworkGenerationAndAnalysis): Netz nach der automatischen Dimensionierung
    (Durchmesser 30/60/90 mm, Rauheit 140, Max. Velocity 1.5 m/s). Die .rpt-Datei enthält keine Ergebnisse; geprüft wird,
    dass die gespeicherten Durchmesser wirklich zu Geschwindigkeiten ≤ 1.5 m/s führen und die Drücke im Bereich 1 … 16 bar liegen. */
const SH = join(dirname(fileURLToPath(import.meta.url)), "hydroanalysis1.inp");
test("hydroanalysis1.inp (Katalog): v ≤ Max. Velocity nach der Dimensionierung, Druck 1 … 16 bar", { skip: !existsSync(SH) && "hydroanalysis1.inp nur im Testordner von wassernetz" }, () => {
  const netz = liesInp(readFileSync(SH, "utf8"));
  assert.ok(netz.knoten.length > 700 && netz.leitungen.length > 770);
  const S = H.loese(netz), E = H.ergebnisse(netz, S);
  assert.ok(S.fehler <= 0.001 && !S.singulaer, "konvergiert");
  assert.ok(H.bilanzfehler(netz, S) < 1e-7, "Massenbilanz (m³/s)");
  const vMax = Math.max(...E.leitungen.map(l => l.v));
  assert.ok(vMax <= 1.5 && vMax > 1.3, "größte Geschwindigkeit " + vMax);
  const p = E.knoten.filter((k, i) => !netz.knoten[i].behaelter).map(k => k.druck / 10);
  assert.ok(Math.min(...p) >= 1 && Math.max(...p) <= 16, `Druck ${Math.min(...p)} … ${Math.max(...p)} bar`);
});
