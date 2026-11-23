// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const mit = o => Object.assign({}, P, o);
const nah = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
function gelaende(n, groesse, f) {
  const z = groesse / (n - 1), h = new Float64Array(n * n);
  let mx = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { h[j * n + i] = f(i * z, j * z); mx = Math.max(mx, h[j * n + i]); }
  return { n, groesse, zelle: z, h, min: 0, max: mx };
}

test("erzeuge: t = 0, keine Zelle gewählt, 50 × 50 Zellen, zwei Ziele", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.n, 0); assert.equal(z.Z.n, 2500); assert.equal(z.ziele.length, 2); assert.equal(z.strassen.length, 3);
});

test("Zellen: Fläche auf einer schiefen Ebene = waagerechte Fläche / cos(Neigung); Mitte und Breite", () => {
  const G = gelaende(11, 100, x => x * 0.5), Z = M.zellen(G, 5);     // h = 0,5·x
  assert.equal(Z.c, 20); assert.ok(nah(Z.x[0], 10) && nah(Z.y[0], 10) && nah(Z.z[0], 5));
  assert.ok(nah(Z.flaeche[7], 400 * Math.hypot(1, 0.5), 1e-6)); assert.ok(nah(Z.breite[7], Math.hypot(20, 10), 1e-6));
});

test("Neigung der geglätteten Fläche: Ebene bleibt Ebene (atan 0,5), Rand eingeschlossen", () => {
  const G = gelaende(11, 100, x => x * 0.5), Z = M.zellen(G, 5), ng = M.neigungen(Z);
  assert.ok(nah(ng[12], Math.atan(0.5), 1e-9));                     // Mitte
  const flach = M.neigungen(M.zellen(gelaende(11, 100, () => 7), 5)); assert.ok([...flach].every(v => v === 0));
});

test("Abstand zur Straße (3D, kleinster über alle Kurven)", () => {
  const S = [[[0, 0, 0], [100, 0, 0]], [[0, 50, 0], [0, 100, 0]]];
  assert.equal(M.abstandStrassen([50, 10, 0], S), 10); assert.equal(M.abstandStrassen([-3, 60, 4], S), 5); assert.equal(M.abstandStrassen([150, 0, 0], S), 50);
});

test("Score: Remap je Wert und gewichtetes Mittel mit [wT, wT, wR, wC]", () => {
  const W = [[0, 1], [0, 2], [10, 0], [5, 5]].map(a => Float64Array.from(a));  // Remap → [0,1], [0,1], [1,0], [0,0]
  const s = M.bewerte(W, mit({ gewTerrain: 0.5, gewStrasse: 1, gewZentrum: 1 }));
  assert.ok(nah(s[0], (0 + 0 + 1 + 0) / 3)); assert.ok(nah(s[1], (0.5 + 0.5 + 0 + 0) / 3));
  const s0 = M.bewerte(W, mit({ gewTerrain: 0, gewStrasse: 0, gewZentrum: 0 }));   // alle Gewichte 0 → einfaches Mittel
  assert.ok(nah(s0[0], 0.25) && nah(s0[1], 0.5));
  assert.deepEqual([...M.rangfolge(Float64Array.from([0.3, 0.1, 0.3, 0.2]))], [1, 3, 0, 2]);
});

test("Mass Addition + Smaller Than: Zellen, solange die Teilsumme kleiner als die Fläche ist", () => {
  const reihe = Int32Array.from([2, 0, 1]), fl = Float64Array.from([10, 10, 10]);
  assert.equal(M.anzahlBis(reihe, fl, 25), 2); assert.equal(M.anzahlBis(reihe, fl, 20), 1); assert.equal(M.anzahlBis(reihe, fl, 0), 0); assert.equal(M.anzahlBis(reihe, fl, 1e9), 3);
});

test("Alpha-Hülle: ein Block gewählter Zellen ergibt einen geschlossenen Umriss um alle Mitten, ein Loch von 1 Zelle wird geschlossen", () => {
  const G = gelaende(11, 100, () => 0), Z = M.zellen(G, 10), sel = [];
  for (let j = 2; j < 7; j++) for (let i = 2; i < 7; i++) if (!(i === 4 && j === 4)) sel.push(j * 10 + i);
  const Mk = M.alphaMaske(Z, sel, 2 * Z.c), L = M.umrisse(Mk);
  assert.equal(L.length, 1);
  for (const k of sel.concat([44])) assert.ok(Geo.punktInPoly([Z.x[k], Z.y[k]], L[0]));
  assert.ok(!Geo.punktInPoly([Z.x[0], Z.y[0]], L[0]));
  const A = Math.abs(Geo.flaecheS(L[0])); assert.ok(A > 40 * 40 && A < 60 * 60, `Fläche ${A}`);   // zwischen Mittenquadrat und Zellquadrat
});

test("Alpha-Hülle: zwei weit getrennte Gruppen → zwei Umrisse", () => {
  const G = gelaende(11, 100, () => 0), Z = M.zellen(G, 10);
  assert.equal(M.umrisse(M.alphaMaske(Z, [11, 12, 21, 22, 77, 78, 87, 88], 2 * Z.c)).length, 2);
});

test("Smooth Polyline geschlossen: Strength 1 setzt jeden Punkt auf die Mitte seiner Nachbarn", () => {
  const Q = M.glaetteZu([[0, 0], [2, 0], [2, 2], [0, 2]], 1, 1);
  assert.deepEqual(Q, [[1, 1], [1, 1], [1, 1], [1, 1]]);
  assert.deepEqual(M.glaetteZu([[0, 0], [2, 0], [2, 2]], 0, 3), [[0, 0], [2, 0], [2, 2]]);
});

test("Schritt: eine Zelle mehr nach Rang; Ende, wenn die größere Fläche erreicht ist", () => {
  const z = M.erzeuge(P, zufall(2));
  M.schritt(z, P); assert.equal(z.n, 1); assert.equal(z.t, 1);
  let k = 0; while (!M.fertig(z) && k++ < 10000) M.schritt(z, P);
  assert.equal(z.n, z.nMax); const A = M.flaecheBis(z, z.n);
  assert.ok(A < P.flaeche2 && A + z.Z.flaeche[z.reihe[z.n]] >= P.flaeche2);
  M.schritt(z, P); assert.equal(z.n, z.nMax);                        // bleibt stehen, t zählt weiter
});

test("Katalog: Gewicht Zentrum allein → Zellen nach Abstand zum Zentrum (Ring um das Zentrum)", () => {
  const z = M.erzeuge(P, zufall(3));
  M.aendere(z, mit({ gewTerrain: 0, gewStrasse: 0, gewZentrum: 1 }), "gewStrasse");
  const d = k => z.W[3][k], n1 = z.ziele[0].n;
  let maxIn = 0, minAus = Infinity;
  for (let r = 0; r < n1; r++) maxIn = Math.max(maxIn, d(z.reihe[r]));
  for (let r = n1; r < z.Z.n; r++) minAus = Math.min(minAus, d(z.reihe[r]));
  assert.ok(maxIn <= minAus);
  assert.ok(Geo.punktInPoly(z.zentrum, z.ringe[0].linien[0]));
});

test("Katalog: Gewicht Straße zieht die Fläche an die Straßen; Gewicht Gelände senkt die mittlere Neigung", () => {
  const z = M.erzeuge(P, zufall(4)), mittel = (w) => { let s = 0; for (let r = 0; r < z.ziele[1].n; r++) s += z.W[w][z.reihe[r]]; return s / z.ziele[1].n; };
  M.aendere(z, mit({ gewStrasse: 0 }), "gewStrasse"); const ohne = mittel(2), neigOhne = mittel(0);
  M.aendere(z, mit({ gewStrasse: 1 }), "gewStrasse"); assert.ok(mittel(2) < ohne);
  M.aendere(z, mit({ gewStrasse: 0, gewTerrain: 1 }), "gewTerrain"); assert.ok(mittel(0) < neigOhne);
});

test("Größere Fläche → längere Ringstraße; Zentrum setzen und Auflösung ändern rechnen sofort zu Ende", () => {
  const z = M.erzeuge(P, zufall(5));
  assert.ok(z.ringe[1].laenge > z.ringe[0].laenge);
  M.setzeZentrum(z, P, [300, 300]); assert.deepEqual(z.zentrum.slice(0, 2), [300, 300]); assert.ok(M.fertig(z));
  M.aendere(z, mit({ aufloesung: 20 }), "aufloesung"); assert.equal(z.Z.n, 400); assert.ok(M.fertig(z));
  M.abspielen(z); assert.equal(z.n, 0); assert.equal(z.t, 0);
});

test("Grenzfälle: Fläche 0 → kein Ring; Fläche größer als das Gelände → alle Zellen", () => {
  const z = M.erzeuge(mit({ flaeche1: 0, flaeche2: 1e8, aufloesung: 10 }), zufall(6));
  assert.equal(z.ziele[0].n, 0); assert.equal(z.ringe[0].linien.length, 0); assert.equal(z.ziele[1].n, 100);
});

test("Wiederholbarkeit: gleiche Saat → gleiche Ringe, andere Saat → anderes Gelände", () => {
  const a = M.erzeuge(P, zufall(7)), b = M.erzeuge(P, zufall(7)), c = M.erzeuge(P, zufall(8));
  assert.deepEqual(a.ringe, b.ringe); assert.notDeepEqual(a.G.h, c.G.h);
});
