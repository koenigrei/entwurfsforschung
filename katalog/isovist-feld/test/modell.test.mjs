// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);

test("Voreinstellungen wie in der .gh-Datei", () => {
  assert.deepEqual(M.STANDARD, { zelle: 2, winkel: 360, reichweite: 100, strahlen: 360, kenngroesse: "area" });
  assert.equal(M.KENNGROESSEN.length, 17);
  assert.ok(Math.abs(M.RICHTUNG + Math.PI / 2) < 1e-15, "Unit Y = Norden = −90° in Bildschirmkoordinaten");
});

test("isovistRaster liefert dasselbe wie Geo.isovist (Längen und getroffene Segmente)", () => {
  const z = M.erzeuge(P, zufall(3)), R = z.segRaster, r = zufall(99);
  const optionen = [{ winkel: 360, reichweite: 100, strahlen: 360 }, { winkel: 73, reichweite: 150, strahlen: 101, richtung: 1.3 },
                    { winkel: 360, reichweite: 200, strahlen: 720 }, { winkel: 0, reichweite: 50, strahlen: 5 }, { winkel: 360, reichweite: 1, strahlen: 1 }];
  for (let n = 0; n < 60; n++) {
    const q = [r() * z.b, r() * z.h];
    for (const o of optionen) {
      const a = Geo.isovist(q, z.hindernisse, o), b = M.isovistRaster(q, z.hindernisse, R, o);
      assert.deepEqual(Array.from(b.laengen), Array.from(a.laengen));
      assert.deepEqual(Array.from(b.treffer), Array.from(a.treffer));
    }
  }
  // Punkt außerhalb des Segmentrasters: fällt auf Geo.isovist zurück
  const weit = M.isovistRaster([-500, -500], z.hindernisse, R, { reichweite: 100, strahlen: 8 });
  assert.equal(weit.punkte.length, 8);
});

test("segmentRechteck: schneiden, berühren, verfehlen", () => {
  assert.equal(M.segmentRechteck([-1, 0.5], [2, 0.5], 0, 0, 1, 1), true);
  assert.equal(M.segmentRechteck([2, 2], [3, 3], 0, 0, 1, 1), false);
  assert.equal(M.segmentRechteck([0, -1], [0, 2], 0, 0, 1, 1), true, "Kante berührt das Rechteck");
  assert.equal(M.segmentRechteck([0, -1], [0, 2], 0, 0, 1, 1, -1e-6), false, "mit Rand nach innen zählt Berühren nicht");
});

test("Analysis Grid wie docs/visibility.md §3: Gitter durch den Füllpunkt, Schritt gesperrt, wenn er ein Hindernis berührt", () => {
  // Rahmen 10 × 4 (als Hindernisse), Zellgröße 1, Füllpunkt (1, 1); senkrechte Wand bei x = 5,5 über die ganze Höhe
  const rahmen = Geo.kanten([[0, 0], [10, 0], [10, 4], [0, 4]]), wand = [[[5.5, 0], [5.5, 4]]];
  const G = M.analyseRaster(rahmen.concat(wand), 1, [1, 1]);
  // Zellmitten x = 0…10, y = 0…4 (im Rechteck der Hindernisse); Mitten auf dem Rahmen liegen auf einem Hindernis und fallen weg
  assert.equal(G.nx, 11); assert.equal(G.ny, 5);
  assert.deepEqual(M.zellMitte(G, G.start), [1, 1]);
  // erreichbar: x = 1…5, y = 1…3 → 15 Zellen; die Wand trennt x = 5 von x = 6
  assert.equal(G.anzahl, 15); assert.equal(G.zeilen.length, 3);
  // Zeilen von unten (größtes y = Süden) nach oben, wie „row by row from the lowest“
  assert.deepEqual(G.zeilen[0].map(k => M.zellMitte(G, k)), [[1, 3], [2, 3], [3, 3], [4, 3], [5, 3]]);
  // Wand mit Lücke: rechts wird erreichbar (x = 6…9, y = 1…3 → 12 weitere)
  assert.equal(M.analyseRaster(rahmen.concat([[[5.5, 0], [5.5, 2.5]]]), 1, [1, 1]).anzahl, 27);
  // Zellgröße 2: Gitter durch den Füllpunkt (1, 1) → Mitten x = 1, 3, 5 (links der Wand), y = 1, 3
  const G2 = M.analyseRaster(rahmen.concat(wand), 2, [1, 1]);
  assert.equal(G2.anzahl, 6); assert.equal(M.zelleBei(G2, [3.2, 2.9]), G2.zeilen[0][1]);
  // Füllpunkt außerhalb des Rechtecks der Hindernisse → kein Feld
  assert.equal(M.analyseRaster(rahmen, 1, [20, 1]).anzahl, 0);
  // blockiert: Berühren zählt
  const R = M.segmentRaster(wand, 5);
  assert.equal(M.blockiert([5, 1], [6, 1], wand, R), true); assert.equal(M.blockiert([4, 1], [5.5 - 2e-6, 1], wand, R), false);
  assert.equal(M.blockiert([4, 1], [5.5 - 1e-7, 1], wand, R), true);
});

test("Beispielstadt: keine aktive Zellmitte in einem Gebäude, jede Zelle einmal", () => {
  const z = M.erzeuge(P, zufall(1)), G = z.raster;
  assert.ok(G.anzahl > 2000, "genug Freiraum");
  for (let k = 0; k < G.nx * G.ny; k++) if (G.aktiv[k]) assert.ok(!M.imGebaeude(z, M.zellMitte(G, k)));
  const alle = G.zeilen.flat(); assert.equal(new Set(alle).size, G.anzahl);
  assert.deepEqual(M.zellMitte(G, G.start), z.fuell, "Füllpunkt ist eine Zellmitte");
});

test("Schritt rechnet genau eine Zeile; Zellwerte = Isovist der Zellmitte", () => {
  const z = M.erzeuge(P, zufall(2)), Z = z.raster.zeilen[0];
  M.schritt(z, P);
  assert.equal(z.t, 1); assert.equal(z.zeile, 1); assert.equal(z.berechnet, Z.length);
  const k = Z[Math.floor(Z.length / 2)], q = M.zellMitte(z.raster, k);
  const m = Geo.isovistMasse(Geo.isovist(q, z.hindernisse, { winkel: 360, reichweite: 100, strahlen: 360, richtung: M.RICHTUNG }));
  for (const key of M.KENNGROESSEN) assert.ok(Math.abs(z.werte[key][k] - m[key]) < 1e-9, key);
  // nicht berechnete Zelle hat keinen Wert
  assert.ok(Number.isNaN(z.werte.area[z.raster.zeilen[1][0]]));
});

test("Ende nach allen Zeilen; Min ≤ Mittel ≤ Max; Fläche höchstens Kreis der Reichweite", () => {
  const p = Object.assign({}, P, { zelle: 6 }), z = M.erzeuge(p, zufall(4));
  let n = 0; while (!M.fertig(z)) { M.schritt(z, p); n++; }
  assert.equal(n, z.raster.zeilen.length); assert.equal(z.berechnet, z.raster.anzahl);
  for (const key of M.KENNGROESSEN) assert.ok(z.min[key] <= M.mittel(z, key) + 1e-9 && M.mittel(z, key) <= z.max[key] + 1e-9, key);
  assert.ok(z.max.area <= Math.PI * 100 * 100 && z.min.area > 0);
  // Schritt nach dem Ende zählt weiter, rechnet aber nichts mehr
  const b = z.berechnet; M.schritt(z, p); assert.equal(z.berechnet, b); assert.equal(z.t, n + 1);
});

test("Kenngröße wechseln färbt nur um; Reichweite oder Zellgröße beginnen neu (t = 0)", () => {
  const z = M.erzeuge(P, zufall(5));
  M.schritt(z, P); M.schritt(z, P);
  const b = z.berechnet;
  M.aendere(z, Object.assign({}, P, { kenngroesse: "compactness" }), "kenngroesse");
  assert.equal(z.berechnet, b); assert.equal(z.t, 2);
  const p2 = Object.assign({}, P, { reichweite: 40 });
  M.aendere(z, p2, "reichweite"); assert.equal(z.t, 0); assert.equal(z.berechnet, 0);
  M.rechneAlle(z, p2); assert.ok(z.max.area <= Math.PI * 40 * 40 + 1e-6);
  const n2 = z.raster.anzahl, p3 = Object.assign({}, p2, { zelle: 4 });
  M.aendere(z, p3, "zelle"); assert.equal(z.t, 0); assert.ok(z.raster.anzahl < n2 / 2, "größere Zellen → weniger Zellen");
});

test("Katalog: hohe Werte auf dem Platz, niedrige in engen Lagen – große Zellen bewahren das Gefälle", () => {
  // „Change the grid size and observe how the high and low values for each measure are distributed throughout the space.“
  for (const zelle of [2, 4]) {
    const p = Object.assign({}, P, { zelle }), z = M.erzeuge(p, zufall(1));
    M.rechneAlle(z, p);
    const k = z.raster.start;                      // Startzelle am Füllpunkt auf dem Platz
    assert.ok(z.werte.area[k] > M.mittel(z, "area"), `Platz über dem Mittel bei Zellgröße ${zelle}`);
    assert.ok(z.max.area > 3 * z.min.area);
  }
});

test("grobe Zellen: das Gitter durch den Füllpunkt erreicht weiter denselben Freiraum", () => {
  const n = zelle => M.erzeuge(Object.assign({}, P, { zelle }), zufall(1)).raster.anzahl * zelle * zelle;
  assert.ok(Math.abs(n(2) / n(1) - 1) < 0.1, "2 m deckt dieselbe Fläche wie 1 m");
  assert.ok(n(8) > 0.7 * n(2), "auch 8-m-Zellen kommen durch die 10 m breiten Straßen");
});

test("Auswahl und Füllpunkt", () => {
  const z = M.erzeuge(P, zufall(6)), k = z.raster.zeilen[3][0];
  assert.equal(M.waehle(z, P, k), true); assert.ok(z.auswahlMasse.area > 0);
  assert.equal(M.waehle(z, P, -1), false); assert.equal(z.auswahl, -1);
  const innen = Geo.schwerpunkt(z.szene.gebaeude[0]), alt = z.fuell.slice();
  assert.equal(M.setzeFuellpunkt(z, P, innen), false); assert.deepEqual(z.fuell, alt);
  assert.equal(M.setzeFuellpunkt(z, P, M.zellMitte(z.raster, k)), true); assert.ok(z.raster.anzahl > 0);
});

test("Farbverlauf der .gh-Datei: dunkelblau – rot", () => {
  assert.deepEqual(M.verlauf(0), [0, 0, 139]); assert.deepEqual(M.verlauf(1), [255, 0, 0]);
  assert.deepEqual(M.verlauf(0.5009), [87, 166, 31]); assert.deepEqual(M.verlauf(-3), [0, 0, 139]); assert.deepEqual(M.verlauf(NaN), [0, 0, 139]);
});

test("gleiche Saat → gleiches Feld, andere Saat → anderes", () => {
  const a = M.rechneAlle(M.erzeuge(Object.assign({}, P, { zelle: 8 }), zufall(7)), Object.assign({}, P, { zelle: 8 }));
  const b = M.rechneAlle(M.erzeuge(Object.assign({}, P, { zelle: 8 }), zufall(7)), Object.assign({}, P, { zelle: 8 }));
  const c = M.rechneAlle(M.erzeuge(Object.assign({}, P, { zelle: 8 }), zufall(8)), Object.assign({}, P, { zelle: 8 }));
  assert.deepEqual(Array.from(a.werte.area), Array.from(b.werte.area));
  assert.notDeepEqual(Array.from(a.werte.area), Array.from(c.werte.area));
});
