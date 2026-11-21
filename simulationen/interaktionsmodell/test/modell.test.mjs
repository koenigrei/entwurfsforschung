// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const lauf = (p, saat, n) => { const z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };
const fest = (...w) => { let i = 0; const f = () => w[i++ % w.length]; f.ganz = n => Math.floor(f() * n); return f; };
/** ein Agent auf (x, y) mit heading h, ohne Zielorte */
function einzeln(x, y, h, modus = 0) {
  const z = M.erzeuge(Object.assign({}, P, { anzahl: 1 }), zufall(1));
  z.zustand.fill(0); z.x[0] = x; z.y[0] = y; z.h[0] = h; z.modus[0] = modus;
  return z;
}

test("Setup: 202 × 202 Zellen, Ursprung 3 × 3 in der Mitte, alle Agenten dort; drei Zielanordnungen", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.equal(z.N, 202); assert.equal(z.mitte, 101); assert.equal(z.n, 800);
  assert.equal(z.zustand.reduce((s, v) => s + (v === 1), 0), 9);
  assert.ok(Array.from(z.x).every(x => x === 101));
  assert.equal(z.ziele.length, 10);
  const r = M.erzeuge({ ziele: "raster" }, zufall(1));
  assert.equal(r.ziele.length, 25);
  assert.deepEqual(r.ziele[0], [20, 20]);                                    // round(0,5 · 40,4) = 20
  assert.equal(r.zustand[101 * 202 + 101], 1);                               // mittlerer Rasterort liegt unter dem Ursprung
  const k = M.erzeuge({ ziele: "kreis" }, zufall(1));
  assert.equal(k.zustand[0], 2); assert.equal(k.zustand[101 * 202 + 101 + 80], 0);   // 160 px: innen; Ecke: Ziel
  assert.ok(k.ziele.length > 10000);
});

test("Erkunden: Markierung markB im Sichtfeld → hill climbing; Rauschen (minM + 1) · (random − 0,5)", () => {
  const z = einzeln(50, 50, 0), N = z.N;
  z.markB[50 * N + 51] = 30;                                                 // Osten; Sichtfeld bei heading 0 und 30°: −52,5 → 307,5 → 308 (Sektor 7) … 7,5 → 8 (Sektor 1)
  assert.deepEqual(M.sichtfeld(0, 30), [7, 8, 1]);
  z.zufall = fest(0.5);                                                       // noise 0, wiggle 10 · (+1)
  M.bewegeAgent(z, P, 0);
  assert.equal(z.x[0], 51); assert.equal(z.y[0], 50); assert.equal(z.h[0], 10);
  assert.equal(z.markA[50 * N + 50], 10); assert.equal(z.markB[50 * N + 50], 0);    // markA immer, markB nur auf dem Rückweg
});

test("Erkunden ohne Markierung: Summe ≤ 0 → random walk um ± angle threshold", () => {
  const z = einzeln(50, 50, 90);
  z.zufall = fest(0.2, 0.2, 0.2, 0.1);                                       // drei Zellen, noise −0,3 je Zelle → Summe < 0; random(31) = 3, random(2) = 0 → −3
  M.bewegeAgent(z, P, 0);
  assert.equal(z.h[0], 87); assert.equal(z.x[0], 50); assert.equal(z.y[0], 51);
});

test("Rückweg: Richtung zum Ursprung ± return noise, markB; am Ursprung erfolgreich", () => {
  const z = M.erzeuge(Object.assign({}, P, { anzahl: 1 }), zufall(1)), N = z.N;
  z.x[0] = 101; z.y[0] = 110; z.modus[0] = 1; z.ziel[0] = 3;
  z.zufall = fest(0, 0);                                                     // return noise 0 · (−1)
  M.bewegeAgent(z, P, 0);
  assert.equal(z.h[0], 270); assert.equal(z.y[0], 109);
  assert.equal(z.markB[110 * N + 101], 10);
  z.y[0] = 103;
  M.bewegeAgent(z, P, 0);                                                    // tritt auf den Ursprung (102)
  assert.equal(z.modus[0], 0); assert.equal(z.erfolg[0], 1); assert.equal(z.zahl[3], 1); assert.equal(z.rueckkehr, 1);
});

test("Zielort erreicht → Rückweg mit dessen Nummer", () => {
  const z = einzeln(50, 50, 0), N = z.N;
  z.zustand[50 * N + 51] = 2; z.zielNr[50 * N + 51] = 7; z.markB[50 * N + 51] = 30;
  z.zufall = fest(0.5);
  M.bewegeAgent(z, P, 0);
  assert.equal(z.modus[0], 1); assert.equal(z.ziel[0], 7);
});

test("Verfall (decay rate) und Grauwert wie TCell.rePaint", () => {
  const p = Object.assign({}, P, { decay: true });
  const z = lauf(p, 1, 5), s = z.markA.reduce((a, b) => a + b, 0);
  assert.ok(s < 5 * 800 * 10);                                               // ohne Verfall genau 40 000
  const o = lauf(P, 1, 5); assert.equal(o.markA.reduce((a, b) => a + b, 0), 40000);
  const g = { maxM: 100, minM: 0 };
  assert.equal(M.grau(g, 0), 0); assert.equal(M.grau(g, 100), 1); assert.equal(M.grau(g, 50), (117.5 + 20) / 255);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const f = s => { const z = lauf(P, s, 150); return Array.from(z.x).join(",") + z.markB.join(","); };
  assert.equal(f(7), f(7));
  assert.notEqual(f(7), f(8));
});

test("erwartetes Verhalten: die Agenten „lernen“ die Pfade – immer mehr kehren in kürzerer Zeit zurück", () => {
  for (const [ziele, s] of [["zufall", 1], ["zufall", 2], ["raster", 1]]) {
    const p = Object.assign({}, P, { ziele, noise: M.NOISE[ziele] }), z = M.erzeuge(p, zufall(s));
    for (let i = 0; i < 1000; i++) M.schritt(z, p);
    const frueh = z.rueckkehr;
    for (let i = 0; i < 2000; i++) M.schritt(z, p);
    const r0 = z.rueckkehr;
    for (let i = 0; i < 1000; i++) M.schritt(z, p);
    const spaet = z.rueckkehr - r0;
    assert.ok(spaet > 1.3 * frueh, `${ziele}/${s}: ${frueh} → ${spaet} Rückkehrer je 1000 Schritte`);
    assert.equal(M.auswertung(z).erfolgreich, 100);
  }
});

test("Anhalten bei stop at time; t zählt die Zeitschritte", () => {
  const z = lauf(P, 1, 25);
  assert.equal(z.t, 25); assert.equal(z.verlauf.length, 25);
});
