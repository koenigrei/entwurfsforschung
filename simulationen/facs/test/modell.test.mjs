// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const fassung = (f, q = {}) => Object.assign({}, M.STANDARD, M.VOR[f], { fassung: f }, q);

/** Zustand mit Agenten an festen Orten: [[x, y, sx, sy], …] */
function feld(agenten, s = 1) {
  const z = M.erzeuge(fassung("03", { anzahl: 0 }), zufall(s));
  agenten.forEach(([x, y, sx, sy], i) => { z.x[i] = x; z.y[i] = y; z.sx[i] = sx; z.sy[i] = sy; });
  z.n = agenten.length;
  return z;
}

test("Voreinstellungen aus facsSteer.pas/.dfm der drei Fassungen", () => {
  assert.equal(M.SPALTEN * M.ZEILEN, 80 * 60);                     // ImagePaint 800 × 600, cellScal 10
  assert.deepEqual([M.VOR["01"].anzahl, M.VOR["02"].anzahl, M.VOR["03"].anzahl], [500, 100, 100]);   // NUM_BALLS
  assert.equal(M.STANDARD.mausRadius, 50);
  assert.equal(M.STANDARD.radius, 40);
  assert.equal(M.STANDARD.sicht, 140);
  assert.deepEqual([M.VOR["02"].mindest, M.VOR["03"].mindest], [5, 8]);
  assert.deepEqual([M.FASSUNGEN["01"].zufall, M.FASSUNGEN["02"].zufall, M.FASSUNGEN["03"].zufall], [0.11, 0.1, 0.28]);
});

test("rund wie Delphis Round (zur geraden Zahl bei x,5)", () => {
  assert.deepEqual([0.5, 1.5, 2.5, 3.5, -0.5, -1.5, 0.51, 1.49].map(M.rund), [0, 2, 2, 4, 0, -2, 1, 1]);
  assert.equal(M.rund(15 * 0.1), 2);                                // 1,5000000000000002 in Gleitkomma
  assert.equal(M.abstand(0, 0, 3, 4), 5);
});

test("Create Pts: Band y 250–299, x 0–799, Vektor je Achse −1, 0 oder 1; Delete 100 Pts nicht unter 0", () => {
  const z = M.erzeuge(fassung("01"), zufall(3));
  assert.equal(z.n, 500);
  for (let i = 0; i < z.n; i++) {
    assert.ok(z.x[i] >= 0 && z.x[i] < 800 && z.y[i] >= 250 && z.y[i] < 300);
    assert.ok([-1, 0, 1].includes(z.sx[i]) && [-1, 0, 1].includes(z.sy[i]));
  }
  M.erzeugeAgenten(z, 100); assert.equal(z.n, 600);
  M.loescheAgenten(z); assert.equal(z.n, 500);
  for (let k = 0; k < 7; k++) M.loescheAgenten(z);
  assert.equal(z.n, 0);
  M.erzeugeAgenten(z, 5000); assert.equal(z.n, M.MAX_AGENTEN);
});

test("Maus: abstoßen bzw. anziehen mit Dir · round((Position − Maus) · 0,1) innerhalb des Mausradius", () => {
  const p = fassung("01");
  const z = feld([[100, 100, 0, 0], [300, 300, 0, 0]]);
  M.setzeMaus(z, 130, 100, true);
  M.bewege(z, 0, p, M.FASSUNGEN["01"]);
  assert.deepEqual([z.sx[0], z.sy[0], z.x[0], z.y[0]], [-3, 0, 97, 100]);
  const a = feld([[100, 100, 0, 0]]); M.setzeMaus(a, 115, 100, true);
  M.bewege(a, 0, fassung("01", { mausModus: "anziehen" }), M.FASSUNGEN["01"]);
  assert.equal(a.sx[0], 2);                                         // −1 · round(−1,5) = 2
  const b = feld([[100, 100, 0, 0]]); M.setzeMaus(b, 100, 100, false);
  M.bewege(b, 0, p, M.FASSUNGEN["01"]);
  assert.ok(Math.abs(b.sx[0]) <= 0.11 + 1e-12 && Math.abs(b.sy[0]) <= 0.11 + 1e-12);   // ohne Maus: Zufallsänderung um ±0,11
});

test("01: Rand prallt ab; 02/03: Torus – erst umsetzen, dann bewegen", () => {
  const z = feld([[3, 300, -2, 0]]);
  M.bewege(z, 0, fassung("01", { vmax: 99 }), { ...M.FASSUNGEN["01"], zufall: 0 });
  assert.equal(z.sx[0], 2); assert.equal(z.x[0], 5);
  const t = feld([[3, 300, -2, 0]]);
  M.bewege(t, 0, fassung("02", { schwarm: false, vmax: 99 }), { ...M.FASSUNGEN["02"], zufall: 0 });
  assert.equal(t.x[0], 795 - 2);
  const u = feld([[400, 597, 0, 1]]);
  M.bewege(u, 0, fassung("03", { schwarm: false, vmax: 99 }), { ...M.FASSUNGEN["03"], zufall: 0 });
  assert.equal(u.y[0], 5 + 1);
});

test("Sichtfeld-Winkel wie im Original: |ArcSin(cos φ)|, wahlweise ArcCos", () => {
  assert.equal(Math.round(M.sichtWinkel(1, 0, 2, 0)), 90);          // gleiche Richtung → 90°
  assert.equal(Math.round(M.sichtWinkel(1, 0, 0, 1)), 0);           // senkrecht → 0°
  assert.equal(Math.round(M.sichtWinkel(1, 0, -1, 0)), 90);         // entgegen → 90°
  assert.equal(Math.round(M.sichtWinkel(1, 0, 1, 1)), 45);
  assert.equal(M.sichtWinkel(0, 0, 1, 0), 0);                       // ohne Bewegung (nenner 0)
  assert.equal(Math.round(M.sichtWinkel(1, 0, 2, 0, true)), 0);
  assert.equal(Math.round(M.sichtWinkel(1, 0, 0, 1, true)), 90);
  assert.ok(Number.isFinite(M.sichtWinkel(0.1, 0.2, 0.1 * 3, 0.2 * 3)));   // geklemmt, kein NaN
});

test("02: Nachbarn nur mit höherer Listennummer, Mittelwert der Vektoren, 0,5 · (Step + limbo)", () => {
  const p = fassung("02"), f = M.FASSUNGEN["02"];
  const z = feld([[100, 100, 1, 0], [120, 100, 0, 1], [100, 125, -1, 1], [300, 300, 1, 1]]);
  assert.equal(M.nachbarn(z, 0, p, f), 2);                          // 1 (20 px) und 2 (25 px), nicht 3
  assert.deepEqual([z.lx[0], z.ly[0], z.nb[0], z.sd[0]], [-0.5, 1, 1, 20]);
  assert.equal(M.nachbarn(z, 1, p, f), 1);                          // sieht 0 nicht, nur 2 (32 px)
  assert.equal(M.nachbarn(z, 3, p, f), 0);
  assert.deepEqual([z.lx[3], z.ly[3]], [1, 1]);                     // ohne Nachbarn bleibt limbo = eigener Vektor
  const q = feld([[100, 100, 1, 0], [103, 100, 0, 1]]);             // näher als Mindestabstand 5 → SetRndDir(0,5)
  M.nachbarn(q, 0, p, f);
  assert.deepEqual([q.lx[0], q.ly[0]], [1, 0]);
  assert.ok([0.5, 1, 1.5].includes(q.sx[0]) && [-0.5, 0, 0.5].includes(q.sy[0]));
  const r = feld([[100, 100, 1, 0]]); r.lx[0] = -0.5; r.ly[0] = 1;
  M.bewege(r, 0, fassung("02", { vmax: 99 }), { ...f, zufall: 0 });
  assert.deepEqual([r.sx[0], r.sy[0]], [0.25, 0.5]);
});

test("03: alle Nachbarn, nur im Sichtfeld (ArcSin-Regel), Mischung 1,0035 · (0,9 · Step + 0,1 · limbo)", () => {
  const p = fassung("03"), f = M.FASSUNGEN["03"];
  // 1: gleiche Richtung (Winkel 90 ≥ 70 → nicht im Sichtfeld), 2: 45° gedreht (Winkel 45 < 70 → gezählt)
  const z = feld([[100, 100, 1, 0], [90, 100, 2, 0], [100, 120, 1, 1]]);
  assert.equal(M.nachbarn(z, 0, p, f), 1);
  assert.deepEqual([z.lx[0], z.ly[0], z.nb[0]], [1, 1, 1]);         // nächster Nachbar ist 1, gemittelt wird nur 2
  assert.equal(M.nachbarn(z, 0, fassung("03", { arccos: true }), f), 2);   // mit ArcCos: Winkel 0° und 45° < 70°
  const r = feld([[100, 100, 1, 0]]); r.lx[0] = 0; r.ly[0] = 1;
  M.bewege(r, 0, fassung("03", { vmax: 99 }), { ...f, zufall: 0 });
  assert.ok(Math.abs(r.sx[0] - 1.0035 * 0.9) < 1e-12 && Math.abs(r.sy[0] - 1.0035 * 0.1) < 1e-12);
});

test("Höchstgeschwindigkeit begrenzt den Vektor (Original: 03 beschleunigt ohne Ende)", () => {
  const z = feld([[100, 100, 6, 8]]);
  M.begrenze(z, 0, 4);
  assert.ok(Math.abs(Math.hypot(z.sx[0], z.sy[0]) - 4) < 1e-12 && Math.abs(z.sx[0] / z.sy[0] - 0.75) < 1e-12);
  const p = fassung("03"), w = M.erzeuge(p, zufall(1));
  for (let i = 0; i < 3000; i++) M.schritt(w, p);
  for (let i = 0; i < w.n; i++) assert.ok(Math.hypot(w.sx[i], w.sy[i]) <= p.vmax + 1e-9);
  const o = fassung("03", { vmax: 1e9 }), u = M.erzeuge(o, zufall(1));
  for (let i = 0; i < 4000; i++) M.schritt(u, o);
  assert.ok(M.tempo(u) > 1000);                                     // ohne Grenze wie im Original: Geschwindigkeit explodiert
});

test("01/02 Zellen markieren: Zelle unter dem Agenten 10, Moore-Nachbarn 1, Randzellen nie", () => {
  const z = feld([[105, 205, 0, 0], [5, 5, 0, 0]]);
  M.markiere(z);
  const c = M.zelleVon(105, 205);
  assert.equal(c, 20 * 80 + 10);                                    // round(100/10) = 10, round(200/10) = 20
  assert.equal(z.marke[c], 10);
  for (const d of [-81, -80, -79, -1, 1, 79, 80, 81]) assert.equal(z.marke[c + d], 1);
  assert.equal(z.marke[c + 2], 0);
  assert.equal(z.marke[0], 0);                                      // Agent in der Eckzelle: cellStates läuft nur über innere Zellen
  assert.equal(M.zelleVon(10, 10), 0);                              // round(0,5) = 0
  assert.equal(M.zelleVon(20, 10), 2);                              // round(1,5) = 2
  assert.equal(M.zelleVon(-6, 10), -1);
});

test("03 Zellen markieren: Begehungen zählen bis 255, Cells Black löscht", () => {
  const z = feld([[105, 205, 0, 0], [106, 204, 0, 0]]);
  for (let i = 0; i < 200; i++) M.begehe(z);
  assert.equal(z.begangen[M.zelleVon(105, 205)], 255);
  M.zellenSchwarz(z);
  assert.equal(z.begangen.reduce((s, v) => s + v, 0), 0);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  for (const f of ["01", "02", "03"]) {
    const p = fassung(f);
    const lauf = s => { const z = M.erzeuge(p, zufall(s)); for (let i = 0; i < 200; i++) M.schritt(z, p); return Array.from(z.x.slice(0, z.n)).join() + Array.from(z.y.slice(0, z.n)).join(); };
    assert.equal(lauf(7), lauf(7));
    assert.notEqual(lauf(7), lauf(8));
  }
});

test("Swarming: die Bewegungsvektoren passen sich an – ohne Swarming bleibt der Schwarm ungeordnet", () => {
  for (const s of [1, 2, 3]) {
    const mit = fassung("02"), ohne = fassung("02", { schwarm: false });
    const a = M.erzeuge(mit, zufall(s)), b = M.erzeuge(ohne, zufall(s));
    for (let i = 0; i < 2000; i++) { M.schritt(a, mit); M.schritt(b, ohne); }
    assert.ok(M.lokaleOrdnung(a, 40) > 0.8, `02 Saat ${s}: ${M.lokaleOrdnung(a, 40)}`);
    assert.ok(M.lokaleOrdnung(b, 40) < 0.4, `ohne Saat ${s}: ${M.lokaleOrdnung(b, 40)}`);
    const p3 = fassung("03"), c = M.erzeuge(p3, zufall(s));
    for (let i = 0; i < 2000; i++) M.schritt(c, p3);
    assert.ok(M.lokaleOrdnung(c, 40) > 0.4, `03 Saat ${s}: ${M.lokaleOrdnung(c, 40)}`);
  }
});

test("03: die Zellen zeichnen die Begehung auf, bis fast das ganze Feld begangen ist", () => {
  const p = fassung("03"), z = M.erzeuge(p, zufall(1));
  for (let i = 0; i < 300; i++) M.schritt(z, p);
  const a = M.zellAnteil(z, "03");
  for (let i = 0; i < 2700; i++) M.schritt(z, p);
  assert.ok(a > 0.05 && a < 0.6, `nach 300: ${a}`);
  assert.ok(M.zellAnteil(z, "03") > 0.9);
});

test("01: Zellen markieren folgt den Agenten, Agenten verteilen sich aus dem Band", () => {
  const p = fassung("01"), z = M.erzeuge(p, zufall(1));
  const anfang = M.zellAnteil(z, "01");
  for (let i = 0; i < 1000; i++) M.schritt(z, p);
  assert.ok(anfang < 0.2 && M.zellAnteil(z, "01") > 0.4);
  let oben = 0; for (let i = 0; i < z.n; i++) if (z.y[i] < 200) oben++;
  assert.ok(oben > 100);
});
