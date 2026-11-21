// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const fertig = z => { while (!z.fertig) M.schritt(z, P); return z; };
const ecken = z => z.kanten.map(k => k.a.join(","));

/** Kontrolle: konvexe Hülle nach Andrew (ohne kollineare Punkte) */
function andrew(pk) {
  const p = [...new Map(pk.map(q => [q.join(","), q])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const kreuz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const unten = [], oben = [];
  for (const q of p) { while (unten.length > 1 && kreuz(unten[unten.length - 2], unten[unten.length - 1], q) <= 0) unten.pop(); unten.push(q); }
  for (const q of p.slice().reverse()) { while (oben.length > 1 && kreuz(oben[oben.length - 2], oben[oben.length - 1], q) <= 0) oben.pop(); oben.push(q); }
  return unten.slice(0, -1).concat(oben.slice(0, -1));
}

test("Punkte: anzahl + 1 Stück, random(0, 1000) × random(0, 800) mit random = Int((upper − lower + 1) · Rnd + lower)", () => {
  assert.deepEqual([0, 0.5, 0.999999].map(r => M.random(r, 0, 1000)), [0, 500, 1000]);
  const z = M.erzeuge({ anzahl: 200 }, zufall(3));
  assert.equal(z.punkte.length, 201);
  assert.ok(z.punkte.every(q => Number.isInteger(q[0]) && q[0] >= 0 && q[0] <= 1000 && Number.isInteger(q[1]) && q[1] >= 0 && q[1] <= 800));
  assert.equal(z.t, 0);
});

test("arkusKos = Arkuskosinus in Bogenmaß; −1 ergibt π (im Original 180)", () => {
  for (let w = -0.999; w < 1; w += 0.037) assert.ok(Math.abs(M.arkusKos(w) - Math.acos(w)) < 1e-12);
  assert.equal(M.arkusKos(1), 0);
  assert.equal(M.arkusKos(-1), Math.PI);
});

test("Winkelwert „ergebnis“: Hinweg 90° + Steigung (nur rechts), Rückweg 90° + Gefälle (nur links)", () => {
  const s = [500, 400], nah = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(nah(M.ergebnis(s, [600, 400], true), 90));     // waagerecht nach rechts
  assert.ok(nah(M.ergebnis(s, [500, 500], true), 180));    // senkrecht nach oben
  assert.ok(nah(M.ergebnis(s, [500, 300], true), 0));      // senkrecht nach unten
  assert.ok(nah(M.ergebnis(s, [600, 500], true), 135));    // 45° Anstieg
  assert.ok(nah(M.ergebnis(s, [600, 300], true), 45));     // 45° Gefälle
  assert.equal(M.ergebnis(s, [400, 500], true), null);     // links: nicht auf dem Hinweg
  assert.ok(nah(M.ergebnis(s, [400, 400], false), 90));    // waagerecht nach links (braucht arkusKos(−1) = π)
  assert.ok(nah(M.ergebnis(s, [500, 300], false), 180));   // senkrecht nach unten
  assert.ok(nah(M.ergebnis(s, [500, 500], false), 0));     // senkrecht nach oben
  assert.ok(nah(M.ergebnis(s, [400, 300], false), 135));
  assert.equal(M.ergebnis(s, [600, 300], false), null);
});

test("Sortieren wie im Original: nach x aufsteigend, eine Umordnung derselben Punkte, gleiche x in der Folge der Tauschschleife", () => {
  const pk = [[5, 1], [3, 9], [9, 2], [3, 4], [1, 7], [9, 0]];
  const s = M.sortiere(pk);
  assert.deepEqual(s.map(q => q[0]), [1, 3, 3, 5, 9, 9]);
  assert.deepEqual(s, [[1, 7], [3, 9], [3, 4], [5, 1], [9, 0], [9, 2]]);   // von Hand nachgerechnet (While u … For f … Swap)
  const r = zufall(5), viele = Array.from({ length: 300 }, () => [r.ganz(50), r.ganz(50)]), t = M.sortiere(viele);
  for (let i = 1; i < t.length; i++) assert.ok(t[i - 1][0] <= t[i][0]);
  assert.deepEqual(t.map(q => q.join()).sort(), viele.map(q => q.join()).sort());
});

test("Die Kette ist die konvexe Hülle: alle Ecken nach Andrew enthalten, kein Punkt außerhalb – 300 Läufe", () => {
  for (let s = 1; s <= 300; s++) {
    const z = fertig(M.erzeuge({ anzahl: 200 }, zufall(s)));
    assert.ok(!z.fehler, "Saat " + s);
    assert.equal(M.ausserhalb(z), 0, "Saat " + s);
    const e = new Set(ecken(z));
    for (const q of andrew(z.punkte)) assert.ok(e.has(q.join(",")), `Saat ${s}: Ecke ${q} fehlt`);
    assert.equal(z.kanten[0].a.join(), z.punkte[0].join());                       // Beginn am Punkt mit dem kleinsten x
    assert.equal(z.kanten[z.kanten.length - 1].b.join(), z.punkte[0].join());     // Loop While Not (startP = koordList(0))
    z.kanten.forEach((k, i) => { assert.equal(k.farbe, i); if (i) assert.deepEqual(k.a, z.kanten[i - 1].b); });
  }
});

test("Ein Schritt = ein geprüfter Punkt: je Kante anzahl + 1 Schritte; Hinweg bis zum größten x, dann Rückweg", () => {
  const z = M.erzeuge({ anzahl: 200 }, zufall(1)), n = z.punkte.length, xmax = z.punkte[n - 1][0];
  let wechsel = -1;
  while (!z.fertig) { M.schritt(z, P); if (!z.richtung && wechsel < 0) wechsel = z.kanten.length; }
  assert.equal(z.t, n * z.kanten.length);
  assert.equal(z.kanten[wechsel - 1].b[0], xmax);                               // die letzte Kante des Hinwegs endet beim größten x
  assert.ok(z.kanten.slice(0, wechsel).every(k => k.b[0] >= k.a[0]));
  assert.ok(z.kanten.slice(wechsel).every(k => k.b[0] <= k.a[0]));
  const t = z.t; M.schritt(z, P); assert.equal(z.t, t);
});

test("Fehler des Originals behoben: waagerechte Kante auf dem Rückweg, kein Pendeln bei mehreren Punkten mit kleinstem x", () => {
  const z = fertig(M.mitPunkten([[0, 500], [100, 0], [600, 0], [700, 500], [350, 300]]));
  assert.ok(z.kanten.some(k => k.a.join() === "600,0" && k.b.join() === "100,0"), ecken(z).join(" "));
  assert.equal(M.ausserhalb(z), 0);
  const y = fertig(M.mitPunkten([[3, 566], [3, 605], [3, 175], [500, 400], [900, 100], [900, 700], [400, 790], [450, 20]]));
  assert.ok(!y.fehler);
  assert.ok(y.kanten.length <= 8, ecken(y).join(" "));
  assert.equal(M.ausserhalb(y), 0);
  const zwei = fertig(M.mitPunkten([[10, 10], [10, 10]]));                       // nur ein Ort: keine Hülle, kein Absturz
  assert.ok(zwei.fehler);
});

test("Punkt setzen und entfernen: die Hülle beginnt von vorn", () => {
  const z = fertig(M.erzeuge({ anzahl: 50 }, zufall(2)));
  M.setzePunkt(z, -50, 2000);                                                  // wird ins Feld geholt: (0, 800)
  assert.equal(z.punkte.length, 52);
  assert.ok(!z.fertig && z.kanten.length === 0);
  M.rechneAlle(z);
  assert.ok(ecken(z).includes("0,800"));
  assert.ok(M.entfernePunkt(z, 3, 797, 14));
  assert.equal(z.punkte.length, 51);
  assert.ok(!M.entfernePunkt(z, -500, -500, 14));
});

test("gleiche Saat → gleiche Punkte und Hülle; andere Saat → andere", () => {
  const bild = s => JSON.stringify(fertig(M.erzeuge({ anzahl: 200 }, zufall(s))).kanten);
  assert.equal(bild(7), bild(7));
  assert.notEqual(bild(7), bild(8));
});
