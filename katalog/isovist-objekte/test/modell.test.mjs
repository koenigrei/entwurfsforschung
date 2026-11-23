// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const Szenen = require("../../_gemeinsam/szenen.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);

test("Voreinstellungen wie in der .gh-Datei", () => {
  assert.equal(P.richtung, 0); assert.equal(P.reichweite, 100); assert.equal(P.winkel, 360); assert.equal(P.strahlen, 360); assert.equal(P.bezug, "flaeche");
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.iso.punkte.length, 360); assert.ok(!M.imGebaeude(z, z.o));
});

test("Blickrichtung: Unit Y (Norden) gegen den Uhrzeigersinn gedreht; richtungZu ist die Umkehrung", () => {
  const n = M.blick(0); assert.ok(Math.abs(Math.cos(n)) < 1e-12 && Math.abs(Math.sin(n) + 1) < 1e-12, "0 → Norden (y nach oben = −y)");
  const w = M.blick(Math.PI / 2); assert.ok(Math.abs(Math.cos(w) + 1) < 1e-12, "π/2 → Westen");
  assert.ok(Math.abs(M.richtungZu([0, 0], [-5, 0]) - Math.PI / 2) < 1e-12);
  assert.ok(Math.abs(M.richtungZu([0, 0], [0, -5])) < 1e-12);
  assert.ok(Math.abs(M.richtungZu([0, 0], [5, 0]) - 3 * Math.PI / 2) < 1e-12, "Osten = 3π/2");
});

test("Obstacle Visibility nachgerechnet: zwei Gebäude, Treffer je Kante und je Gebäude", () => {
  // Quadrat A (10 × 10) östlich, Rechteck B (10 × 20) westlich des Standpunkts (0, 0); acht Strahlen in 45°-Schritten
  const A = [[10, -5], [20, -5], [20, 5], [10, 5]], B = [[-30, -10], [-20, -10], [-20, 10], [-30, 10]];
  const O = M.objekte([A, B]);
  assert.deepEqual(Array.from(O.segGeb), [0, 0, 0, 0, 1, 1, 1, 1]);
  assert.deepEqual(Array.from(O.flaeche), [100, 200]); assert.deepEqual(Array.from(O.umfang), [40, 60]);
  const iso = Geo.isovist([0, 0], O.segmente, { winkel: 360, reichweite: 100, strahlen: 8 });
  // Strahl 0 (Osten) trifft die Westkante von A (Segment 3), Strahl 4 (Westen) die Ostkante von B (Segment 5), die anderen gehen ins Freie
  assert.equal(iso.treffer[0], 3); assert.equal(iso.treffer[4], 5);
  const s = M.sichtbarkeit(iso, O, "flaeche");
  assert.deepEqual(Array.from(s.kante), [0, 0, 0, 1, 0, 1, 0, 0]); assert.deepEqual(Array.from(s.geb), [1, 1]); assert.equal(s.frei, 6);
  assert.ok(Math.abs(s.kanteN[3] - 1 / 10) < 1e-12 && Math.abs(s.kanteN[5] - 1 / 20) < 1e-12, "Treffer ÷ Länge");
  assert.ok(Math.abs(s.gebN[0] - 1 / 100) < 1e-12 && Math.abs(s.gebN[1] - 1 / 200) < 1e-12, "Summe ÷ Fläche");
  const u = M.sichtbarkeit(iso, O, "umfang");
  assert.ok(Math.abs(u.gebN[0] - 1 / 40) < 1e-12 && Math.abs(u.gebN[1] - 1 / 60) < 1e-12, "Summe ÷ Umfang");
  assert.equal(s.maxG, s.gebN[0]); assert.equal(s.maxK, s.kanteN[3]);
});

test("Stadt: Summe der Treffer = Strahlen, die ein Gebäude treffen; Kanten = Gebäudekanten der Szene", () => {
  const z = M.erzeuge(P, zufall(2));
  assert.equal(z.O.segmente.length, z.szene.hindernisse.length);
  const a = M.auswertung(z);
  assert.equal(a.treffer + a.frei, 360);
  assert.equal(a.treffer, Array.from(z.iso.treffer).filter(k => k >= 0).length);
  assert.ok(a.sichtbar > 0 && a.sichtbar < a.gebaeude, "einige, nicht alle Gebäude gesehen");
});

test("verdeckte Gebäude bekommen keine Treffer", () => {
  // Hinter Gebäude A (vom Standpunkt aus) liegt Gebäude C vollständig im Schatten
  const A = [[10, -10], [14, -10], [14, 10], [10, 10]], C = [[30, -3], [34, -3], [34, 3], [30, 3]];
  const O = M.objekte([A, C]), iso = Geo.isovist([0, 0], O.segmente, { winkel: 360, reichweite: 200, strahlen: 720 });
  const s = M.sichtbarkeit(iso, O);
  assert.ok(s.geb[0] > 0); assert.equal(s.geb[1], 0);
});

test("Blickwinkel und Reichweite begrenzen die Sichtbarkeit", () => {
  const z = M.erzeuge(P, zufall(3)), alle = M.auswertung(z).sichtbar;
  M.aendere(z, Object.assign({}, P, { winkel: 45 }));
  assert.ok(M.auswertung(z).sichtbar < alle);
  M.aendere(z, Object.assign({}, P, { reichweite: 5 }));
  assert.ok(M.auswertung(z).sichtbar <= alle);
  // Blick nach Norden mit 90°: alle getroffenen Strahlen zeigen nach oben (−y)
  M.aendere(z, Object.assign({}, P, { winkel: 90, strahlen: 91 }));
  for (const w of z.iso.winkel) assert.ok(Math.sin(w) <= Math.sin(-Math.PI / 4) + 1e-9);
});

test("Rundweg: geschlossen, nie in einem Gebäude, um den Platz", () => {
  for (let s = 1; s <= 12; s++) {
    const z = M.erzeuge(P, zufall(s));
    for (let i = 0; i <= 600; i++) assert.ok(!M.imGebaeude(z, Szenen.aufPolylinie(z.pfad, i / 600).p), `Saat ${s}, Anteil ${i / 600}`);
    assert.ok(Geo.abstand(z.pfad[0], z.pfad[z.pfad.length - 1]) < 1e-6, "geschlossen");
    assert.ok(z.pfad.some(q => Geo.punktInPoly(q, z.szene.platz)), "über den Platz");
  }
});

test("Schritt: Standpunkt wandert den Rundweg entlang und beginnt am Ende von vorn", () => {
  const z = M.erzeuge(P, zufall(4)), a0 = z.anteil;
  M.schritt(z, P);
  assert.equal(z.t, 1); assert.ok(Math.abs(z.anteil - (a0 + 0.004) % 1) < 1e-12);
  assert.deepEqual(z.o, Szenen.aufPolylinie(z.pfad, z.anteil).p);
  const p = Object.assign({}, P, { schrittweite: 0.02 });
  for (let i = 0; i < 60; i++) { M.schritt(z, p); assert.ok(z.anteil >= 0 && z.anteil < 1); }
});

test("Katalog: Sichtbarkeit hängt vom Standpunkt ab – auf dem Platz ist die Kirche stark sichtbar", () => {
  // „analyses and visualises the visibility of objects such as buildings … in consideration of viewing angle, direction and range“
  for (const s of [1, 2, 3]) {
    const z = M.erzeuge(P, zufall(s)), kirche = z.szene.gebaeude.length - 1;
    assert.ok(z.s.geb[kirche] >= 20, `Saat ${s}: Kirche vom Platz aus gesehen (${z.s.geb[kirche]} Treffer)`);
    // anderswo auf dem Rundweg gibt es Standpunkte, von denen aus die Kirche nicht zu sehen ist
    let unsichtbar = false;
    for (let i = 0; i < 100 && !unsichtbar; i++) { M.schritt(z, Object.assign({}, P, { schrittweite: 0.01 })); if (z.s.geb[kirche] === 0) unsichtbar = true; }
    assert.ok(unsichtbar, `Saat ${s}: Kirche irgendwo verdeckt`);
  }
});

test("Standpunkt setzen: nicht in Gebäude; Weg geht vom nächsten Wegpunkt weiter", () => {
  const z = M.erzeuge(P, zufall(5)), alt = z.o.slice();
  assert.equal(M.setzeStandpunkt(z, P, Geo.schwerpunkt(z.szene.gebaeude[0])), false); assert.deepEqual(z.o, alt);
  const q = z.pfad[5];
  assert.equal(M.setzeStandpunkt(z, P, q), true); assert.deepEqual(z.o, q);
  assert.ok(Math.abs(z.anteil - M.naechsterAnteil(z.pfad, q)) < 1e-12);
});

test("Farbverlauf der .gh-Datei: gestaucht, ab 0,56 rot", () => {
  assert.deepEqual(M.verlauf(0), [0, 0, 139]); assert.deepEqual(M.verlauf(0.1977), [255, 215, 0]);
  assert.deepEqual(M.verlauf(0.6), [255, 0, 0]); assert.deepEqual(M.verlauf(1), [255, 0, 0]);
  assert.deepEqual(M.rundeEcken([[0, 0], [10, 0], [10, 10]], 3, 2)[2], [9.25, 0.75]);
});

test("gleiche Saat → gleiche Sichtbarkeit, andere Saat → andere", () => {
  const a = M.erzeuge(P, zufall(7)), b = M.erzeuge(P, zufall(7)), c = M.erzeuge(P, zufall(8));
  assert.deepEqual(Array.from(a.s.geb), Array.from(b.s.geb));
  assert.notDeepEqual(Array.from(a.s.geb), Array.from(c.s.geb));
});
