// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const fass = (m, extra = {}) => Object.assign({}, M.STANDARD, M.FASSUNGEN[m], { modell: m }, extra);
const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
const summe = a => a.reduce((s, v) => s + v, 0);
const lauf = (p, saat, n) => { const z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };

/* ---------------------------------------------------------------- Bausteine */
test("Wahrnehmung p = (1 − d)^a mit Schwelle; „meidet“ zählt 1 − p", () => {
  nah(M.wahrnehmung(0.1, 7, 0.4), Math.pow(0.9, 7));           // 0,478 ≥ 0,4 bleibt
  assert.equal(M.wahrnehmung(0.2, 7, 0.4), 0);                  // 0,8^7 = 0,21 < 0,4 → 0
  nah(M.wahrnehmung(0.5, 2, 0), 0.25);
  assert.equal(M.wahrnehmung(0, 7, 0.5), 1);
  nah(M.summand(0.3, "meidet"), 0.7); nah(M.summand(0.3, "sucht"), 0.3);
  assert.equal(M.summand(0, "meidet"), 1);                      // jenseits der Schwelle: volle Attraktivität beim Meiden
});

test("Normierung wie im Original: (v − min) / max, nicht / (max − min); max = 0 → 0", () => {
  const n = M.normiere([2, 4, 6]);
  nah(n[0], 0); nah(n[1], 2 / 6); nah(n[2], 4 / 6);
  assert.deepEqual([...M.normiere([0, 0, 0])], [0, 0, 0]);
});

test("Roulette-Rad: erster Ort, dessen laufende Summe den Zufallswert übersteigt", () => {
  const a = [0, 1, 3];
  assert.equal(M.roulette(a, 4, 0), 1);          // 0 > 0 nein, 1 > 0 ja
  assert.equal(M.roulette(a, 4, 0.2499), 1);     // Ziel 0,9996
  assert.equal(M.roulette(a, 4, 0.25), 2);       // Ziel 1: 1 > 1 nein
  assert.equal(M.roulette(a, 4, 0.999), 2);
  assert.equal(M.roulette([0, 0], 0, 0.5), -1);  // Summe 0 → kein Ort (Original: „SOMETHING WENT WRONG“)
});

test("Verkehrsschätzung Σ_i Σ_k d_ik · P_i · W_k / ΣW", () => {
  // zwei Orte im Abstand 5: P = [2, 0], W = [1, 3] → 2 · (0·1 + 5·3) / 4 = 7,5
  nah(M.verkehr(new Float64Array([0, 5, 5, 0]), 2, [2, 0], [1, 3]), 7.5);
  assert.equal(M.verkehr(new Float64Array([0, 5, 5, 0]), 2, [2, 0], [0, 0]), 0);
});

test("Rasterstadt: 12 × 8 Zellen in Grasshopper-Reihenfolge, Manhattan-Distanz, RefPoint → Zelle 26", () => {
  const O = M.rasterOrte(), D = M.manhattan(O), n = O.length;
  assert.equal(n, 96);
  assert.deepEqual(O[1].gh, [0.5, 1.5]);                        // Index 1 = Spalte 0, Zeile 1 (Arbeitsplatz am Anfang)
  assert.deepEqual(O[8].gh, [1.5, 0.5]);
  assert.equal(D[0 * n + 95], 18);                              // Diagonale erster → letzter Ort = d_max
  assert.equal(Math.max(...D), 18);
  assert.equal(D[26 * n + 27], 1); assert.equal(D[26 * n + 34], 1);
  assert.equal(M.rasterRef(O, M.RASTER_REF), 26);               // (3,62 | 2,47) → Zellmitte (3,5 | 2,5)
  // Zeichnung: Norden oben, also Zeile 7 oben (kleines y)
  assert.ok(O[7].mitte[1] < O[0].mitte[1]);
});

test("Attraktivität am Anfang der Rasterstadt nachgerechnet (nur 1 Einwohner am Startort)", () => {
  const p = fass("raster"), z = M.erzeuge(p, zufall(1)), n = z.n, ref = 26;
  assert.equal(z.ref, ref);
  // Wohnen: 1 − p7 mit p7 = (1 − d/18)^7, < 0,4 → 0; am Startort 0, Nachbar (d = 1): 1 − (17/18)^7; Normierung: min 0, max 1
  nah(z.attP[ref], 0);
  nah(z.attP[27], 1 - Math.pow(17 / 18, 7));
  nah(z.attP[95], 1);
  // Arbeit: (1 − d/18)^2; min am entferntesten Ort (11|7), d = 13 → (5/18)^2; normiert (v − min) / max mit max = 1
  const mn = Math.pow(5 / 18, 2);
  nah(z.attW[ref], 1 - mn);
  nah(z.attW[95], 0);
  nah(z.attW[27], Math.pow(17 / 18, 2) - mn);
  assert.equal(z.D[ref * n + 95], 13);
});

test("Netzstadt-Formeln: W wird wie im Original durch maxP geteilt, Gewichte 0,1 und 0,5", () => {
  // zwei Orte, Distanz 0 und 1 (normiert): P = [2, 0], W = [0, 4], maxP = 2
  const p = fass("netz"), Dn = new Float64Array([0, 1, 1, 0]), Wm = M.wahrnehmungsMatrizen(Dn, 2, p);
  const a = M.attraktivitaet(Wm, 2, [2, 0], [0, 4], { pp: 1, pw: 0.1, wp: 1, ww: 0.5 });
  // Wohnen_0 = p7(0)·1 + 0,1·p3(1)·2 = 1 + 0 = 1;  Wohnen_1 = p7(1)·1 + 0,1·p3(0)·2 = 0,2
  nah(a.roh.P[0], 1); nah(a.roh.P[1], 0.2);
  // Arbeit_0 = (1 − p3(0))·1 + 0,5·p7(1)·2 = 0;  Arbeit_1 = (1 − p3(1))·1 + 0,5·p7(0)·2 = 1 + 1 = 2
  nah(a.roh.W[0], 0); nah(a.roh.W[1], 2);
  nah(a.P[1], (0.2 - 0.2) / 1); nah(a.W[1], 1);
});

/* ---------------------------------------------------------------- Ablauf der Standortmodelle */
test("erzeuge: t = 0, 1 Einwohner am Startort, Arbeitsplatz an Ort 1 (Raster) bzw. 3 an Ort n/2 − 3 (Netz)", () => {
  const z = M.erzeuge(fass("raster"), zufall(1));
  assert.equal(z.t, 0); assert.equal(summe([...z.P]), 1); assert.equal(z.P[26], 1); assert.equal(z.W[1], 1); assert.equal(summe([...z.W]), 1);
  assert.equal(z.verlauf.length, 1);
  const zn = M.erzeuge(fass("netz"), zufall(1));
  assert.equal(zn.W[Math.floor(zn.n / 2) - 3], 3); assert.equal(summe([...zn.P]), 1); assert.equal(zn.t, 0);
});

test("Schritt: 10 + 10 (Raster) bzw. 50 + 50 (Netz) neue Einheiten, t + 1, Zeitreihe wächst", () => {
  const p = fass("raster"), z = M.erzeuge(p, zufall(2));
  M.schritt(z, p);
  assert.equal(z.t, 1); assert.equal(summe([...z.P]), 11); assert.equal(summe([...z.W]), 11); assert.equal(z.verlauf.length, 2);
  nah(z.verlauf[1][2], M.verkehr(z.D, z.n, z.P, z.W));
  const pn = fass("netz"), zn = M.erzeuge(pn, zufall(2));
  M.schritt(zn, pn);
  assert.equal(summe([...zn.P]), 51); assert.equal(summe([...zn.W]), 53);
});

test("volle Orte (P + W ≥ maxDensity) bekommen nichts; ist alles voll, schlagen die Ziehungen fehl", () => {
  const p = fass("raster", { maxDichte: 1 }), z = M.erzeuge(p, zufall(3));
  M.schritt(z, p);
  assert.equal(z.P[26], 1); assert.equal(z.W[1], 1);            // Startort und Arbeitsort sind mit 1 schon voll
  assert.equal(z.voll, 2);
  const q = fass("raster", { maxDichte: 15 }), y = lauf(q, 1, 150), b = M.bilanz(y, 15);
  assert.equal(b.voll, 96);
  assert.ok(y.fehl > 0);
  assert.ok(Math.max(...[...y.P].map((v, i) => v + y.W[i])) < 15 + 20);   // Überschreitung höchstens um die Einheiten eines Schritts
});

test("Wiederholbarkeit: gleiche Saat → gleicher Lauf, andere Saat → anderer", () => {
  const p = fass("raster");
  assert.deepEqual([...lauf(p, 7, 30).P], [...lauf(p, 7, 30).P]);
  assert.notDeepEqual([...lauf(p, 7, 30).P], [...lauf(p, 8, 30).P]);
  const pn = fass("netz");
  assert.deepEqual([...lauf(pn, 4, 5).W], [...lauf(pn, 4, 5).W]);
});

test("Katalogverhalten Rasterstadt: Einwohner meiden Dichte und verteilen sich, Arbeitsplätze sammeln sich zentral bei den Einwohnern", () => {
  const p = fass("raster"), z = lauf(p, 1, 100), b = M.bilanz(z, p.maxDichte);
  assert.equal(b.einwohner, 1001); assert.equal(b.arbeit, 1001);
  assert.ok(b.zentralW < b.zentralP, "Arbeit liegt zentraler als Wohnen");
  assert.equal(b.besetzt, 96);
  // „sucht Nähe“ statt „meidet“ → dichter Kern: höhere Spitzendichte
  const q = fass("raster", { ppArt: "sucht" }), y = lauf(q, 1, 100);
  assert.ok(M.bilanz(y).max > b.max + 10);
});

test("Netzstadt: Parzellen am nächsten Segment, Distanzen symmetrisch, nie kürzer als die Luftlinie der Segmentmitten", () => {
  const p = fass("netz"), z = M.erzeuge(p, zufall(1)), n = z.n, N = z.N;
  assert.ok(n > 100, "genug Parzellen: " + n);
  const mitte = s => Geo.lerp(N.knoten[N.kanten[s].a], N.knoten[N.kanten[s].b], 0.5);
  for (let i = 0; i < n; i += 7) {
    assert.equal(z.orte[i].seg, Geo.naechstesSegment(N, z.orte[i].mitte));
    assert.equal(z.D[i * n + i], 0);
    for (let k = 0; k < n; k += 11) {
      nah(z.D[i * n + k], z.D[k * n + i], 1e-6);
      assert.ok(z.D[i * n + k] >= Geo.abstand(mitte(z.orte[i].seg), mitte(z.orte[k].seg)) - 1e-6);
      if (z.orte[i].seg === z.orte[k].seg) assert.equal(z.D[i * n + k], 0);
    }
  }
  assert.ok(z.dmax > 300 && z.dmax < 2000);
});

test("Netzstadt: Einwohner sammeln sich, Arbeitsplätze meiden sie (liegen weiter außen); mehr Winkelgewicht → längere Wege", () => {
  const p = fass("netz"), b = M.bilanz(lauf(p, 1, 60), p.maxDichte);
  assert.ok(b.zentralW > b.zentralP);
  const kurz = M.bilanz(lauf(fass("netz", { laengeKoeff: 1, winkelKoeff: 0 }), 1, 30)).weg;
  const winkel = M.bilanz(lauf(fass("netz", { laengeKoeff: 0, winkelKoeff: 1 }), 1, 30)).weg;
  assert.ok(winkel > kurz, `${winkel} > ${kurz}`);
});

test("Parzellieren: halbieren, bis beide Seiten ≤ Parzellenbreite; Fläche bleibt", () => {
  const Q = [[0, 0], [60, 0], [60, 60], [0, 60]];
  const a = M.parzelliere(Q, 25), b = M.parzelliere(Q, 30);
  assert.equal(a.length, 16); assert.equal(b.length, 4);
  nah(summe(a.map(Geo.flaeche)), 3600, 1e-6);
  for (const t of a) { const bb = Geo.bbox(t); assert.ok(bb.b <= 25 && bb.h <= 25); }
});

test("aendere: Art und Gewicht wirken ohne Neustart; setzeStart versetzt den Startort und beginnt neu", () => {
  const p = fass("raster"), z = lauf(p, 5, 3), vorher = Array.from(z.attP);
  const q = Object.assign({}, p, { ppArt: "sucht" }); M.aendere(z, q, "ppArt");
  assert.notDeepEqual(Array.from(z.attP), vorher);
  assert.equal(z.t, 3);
  M.setzeStart(z, p, z.orte[90].mitte);
  assert.equal(z.ref, 90); assert.equal(z.t, 0); assert.equal(z.P[90], 1); assert.equal(summe([...z.P]), 1);
});

/* ---------------------------------------------------------------- Systemdynamik */
test("Wolf-Schaf: eine Iteration nachgerechnet (Reihenfolge SheepBirths → WolfBirths → WolfDeaths → SheepDeaths)", () => {
  const p = fass("wolfschaf");
  const [S, W] = M.wolfSchafSchritt(104, 30, p);
  const S1 = 104 * 1.06, W1 = 30 + 30 * 0.0005 * 1.5 * S1, W2 = W1 * (1 - 0.38), S2 = S1 - S1 * 0.0005 * W2;
  nah(W, W2); nah(S, S2);
  nah(W2, 20.137848, 1e-9);
  const z = M.erzeuge(p, zufall(1)); M.schritt(z, p);
  assert.equal(z.t, 1); nah(z.S, S2); assert.equal(z.verlauf.length, 2);
});

test("Wolf-Schaf: Schwingung um das Gleichgewicht Schafe = m/(r·e), Wölfe = b/r; 299 Iterationen", () => {
  const p = fass("wolfschaf"); assert.equal(p.iterationen, 299);
  const z = lauf(p, 1, 299), S = z.verlauf.map(v => v[0]);
  assert.ok(M.fertig(z, p));
  const sStern = p.sterbeWoelfe / (p.rissRate * p.effizienz);
  let wechsel = 0; for (let t = 1; t < S.length; t++) if ((S[t] - sStern) * (S[t - 1] - sStern) < 0) wechsel++;
  assert.ok(wechsel >= 6, "mehrere Durchgänge durch das Gleichgewicht: " + wechsel);
  assert.ok(Math.min(...S) > 0);
});

test("Stadtsystem: eine Iteration nachgerechnet, Mangelfaktor 1/(x + 1)²", () => {
  nah(M.mangel(0), 1); nah(M.mangel(1), 0.25);
  const p = fass("stadtsystem");
  const [P, J, F] = M.stadtSystemSchritt(1000, 30, 100, p);
  const P1 = 1000 + 1000 * 0.51 * (1 - 1000 / 10000);              // 1459
  const J1 = 30 + 30 * (1 - 30 / P1);
  const F2 = 100 + (1 - 1 / P1) * 4900 - P1;
  const J2 = J1 - J1 / Math.pow(2025 / J1 + 1, 2) * 0.5;
  const P2 = P1 - P1 / Math.pow(J2 / P1 + 1, 2) / Math.pow(F2 / P1 + 1, 2);
  nah(P1, 1459); nah(F, F2); nah(J, J2); nah(P, P2);
  // FoodDecline: if((Food − Population) ≤ 0, 0,01, Food − Population)
  assert.equal(M.stadtSystemSchritt(1000, 30, 0, Object.assign({}, p, { agrarGroesse: 1 }))[2], 0.01);
});

test("Stadtsystem: nach 90 Iterationen Gleichgewicht P ≈ 3709, J ≈ 3389, F ≈ 977", () => {
  const p = fass("stadtsystem"); assert.equal(p.iterationen, 90);
  const z = lauf(p, 1, 90);
  nah(z.P, 3709, 1); nah(z.J, 3389, 1); nah(z.F, 976.6, 1);
  assert.ok(M.fertig(z, p));
});
