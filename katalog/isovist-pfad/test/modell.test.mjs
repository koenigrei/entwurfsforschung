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
  assert.equal(P.anteil, 0.274); assert.equal(P.winkel, 360); assert.equal(P.reichweite, 100); assert.equal(P.strahlen, 360); assert.equal(P.kenngroesse, "area");
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.anteil, 0.274); assert.equal(z.iso.punkte.length, 360);
});

test("Weg durch die Stadt: liegt für viele Saaten nie in einem Gebäude und quert den Platz", () => {
  for (let s = 1; s <= 12; s++) {
    const z = M.erzeuge(P, zufall(s));
    for (let i = 0; i <= 500; i++) assert.ok(!M.imGebaeude(z, Szenen.aufPolylinie(z.pfad, i / 500).p), `Saat ${s}, Anteil ${i / 500}`);
    assert.ok(z.pfad[0][0] < z.b / 3 && z.pfad[z.pfad.length - 1][0] > z.b * 2 / 3, "von West nach Ost");
    const rand = z.szene.opt.rand;
    assert.ok(z.pfad.every(q => q[0] > rand + 1 && q[0] < z.b - rand - 1 && q[1] > rand + 1 && q[1] < z.h - rand - 1), "nicht auf den Randstraßen");
    assert.ok(z.pfad.some(q => Geo.punktInPoly(q, z.szene.platz)), "über den Platz");
  }
});

test("rundeEcken: rechter Winkel wird im Abstand r abgeschnitten, Endpunkte bleiben", () => {
  const Q = M.rundeEcken([[0, 0], [10, 0], [10, 10]], 3, 2);
  assert.deepEqual(Q[0], [0, 0]); assert.deepEqual(Q[Q.length - 1], [10, 10]);
  assert.deepEqual(Q[1], [7, 0]); assert.deepEqual(Q[3], [10, 3]);
  assert.deepEqual(Q[2], [9.25, 0.75], "Bézier-Mitte = ¼·p0 + ½·Ecke + ¼·p2");
});

test("Evaluate Curve: Standpunkt und Tangente; Isovist wie Geo.isovist", () => {
  const z = M.erzeuge(P, zufall(2)), e = Szenen.aufPolylinie(z.pfad, z.anteil);
  assert.deepEqual(z.o, e.p); assert.equal(z.richtung, e.richtung);
  const g = Geo.isovist(z.o, z.szene.hindernisse, { winkel: 360, reichweite: 100, strahlen: 360, richtung: z.richtung });
  assert.deepEqual(Array.from(z.iso.laengen), Array.from(g.laengen));
  // Blickwinkel < 360°: die Strahlen fächern sich um die Tangente
  const p = Object.assign({}, P, { winkel: 60, strahlen: 61 }); M.aendere(z, p, "winkel");
  assert.ok(Math.abs(z.iso.winkel[30] - z.richtung) < 1e-12);
});

test("isovistRaster = Geo.isovist an Zufallspunkten", () => {
  const z = M.erzeuge(P, zufall(3)), r = zufall(5);
  for (let n = 0; n < 40; n++) {
    const q = [r() * z.b, r() * z.h], o = { winkel: 30 + r() * 330, reichweite: 1 + r() * 199, strahlen: 1 + Math.floor(r() * 720), richtung: r() * 7 };
    const a = Geo.isovist(q, z.szene.hindernisse, o), b = M.isovistRaster(q, z.szene.hindernisse, z.segRaster, o);
    assert.deepEqual(Array.from(b.laengen), Array.from(a.laengen)); assert.deepEqual(Array.from(b.treffer), Array.from(a.treffer));
  }
});

test("Schritt: Standpunkt wandert um die Schrittweite; am Ende anhalten oder von vorn", () => {
  const z = M.erzeuge(P, zufall(4));
  M.schritt(z, P); M.schritt(z, P);
  assert.equal(z.t, 2); assert.ok(Math.abs(z.anteil - (0.274 + 2 * 0.004)) < 1e-12);
  const pa = Object.assign({}, P, { schrittweite: 0.3 });
  M.schritt(z, pa); M.schritt(z, pa); M.schritt(z, pa);
  assert.equal(z.anteil, 1); assert.ok(M.amZiel(z, pa));
  const vorher = z.t; M.schritt(z, pa); assert.equal(z.anteil, 1); assert.equal(z.t, vorher + 1, "Schritt zählt auch am Ziel");
  const pv = Object.assign({}, pa, { amEnde: "vonVorn" });
  assert.ok(!M.amZiel(z, pv)); M.schritt(z, pv); assert.equal(z.anteil, 0);
});

test("Profil: 201 Stellen, Werte = Isovist an der Stelle; Parameteränderung verwirft es", () => {
  const z = M.erzeuge(P, zufall(5)), pr = M.profil(z, P);
  assert.equal(pr.n, M.PROFIL_N); assert.equal(pr.werte.area.length, M.PROFIL_N + 1);
  const i = 57, m = M.isovistBei(z, P, i / M.PROFIL_N).masse;
  for (const k of M.KENNGROESSEN) assert.ok(Math.abs(pr.werte[k][i] - m[k]) < 1e-9, k);
  assert.equal(M.profil(z, P), pr, "zwischengespeichert");
  M.aendere(z, Object.assign({}, P, { kenngroesse: "compactness" }), "kenngroesse"); assert.equal(z.profil, pr, "Kenngröße wechseln rechnet nicht neu");
  const p2 = Object.assign({}, P, { reichweite: 30 }); M.aendere(z, p2, "reichweite");
  assert.equal(z.profil, null); assert.ok(M.profil(z, p2).max.area <= Math.PI * 900 + 1e-6);
});

test("Katalog: die Kenngrößen ändern sich entlang des Weges – am Platz ist die Fläche groß", () => {
  // „Observe how the isovist measures are changing during the movement along the path“
  for (const s of [1, 2, 3]) {
    const z = M.erzeuge(P, zufall(s)), pr = M.profil(z, P);
    assert.ok(pr.max.area > 2 * pr.min.area, `Saat ${s}: deutlicher Wechsel`);
    // am Platz (Standpunkte höchstens 15 m vom Platzrand) ist die Fläche deutlich größer als im Mittel der Gassen (Median)
    const pl = z.szene.platz, randAbstand = q => Geo.punktInPoly(q, pl) ? 0 : Math.min(...Geo.kanten(pl).map(([a, b]) => Geo.abstandSegment(q, a, b).d));
    let amPlatz = 0;
    for (let i = 0; i <= pr.n; i++) if (randAbstand(Szenen.aufPolylinie(z.pfad, i / pr.n).p) < 15) amPlatz = Math.max(amPlatz, pr.werte.area[i]);
    const median = Array.from(pr.werte.area).sort((x, y) => x - y)[pr.n >> 1];
    assert.ok(amPlatz > 1.3 * median, `Saat ${s}: Platz ${amPlatz.toFixed(0)} m² gegen Median ${median.toFixed(0)} m²`);
  }
});

test("naechsterAnteil, geheZu, eigener Weg", () => {
  assert.equal(M.naechsterAnteil([[0, 0], [10, 0], [10, 10]], [10, 5]), 0.75);
  assert.equal(M.laenge([[0, 0], [3, 4]]), 5);
  const z = M.erzeuge(P, zufall(6));
  M.geheZu(z, P, z.pfad[z.pfad.length - 1]); assert.ok(z.anteil > 0.999);
  assert.equal(M.setzePfad(z, P, [[10, 10]]), false);
  const c = Geo.schwerpunkt(z.szene.platz), y = c[1] + Geo.bbox(z.szene.platz).h * 0.33, bx = Geo.bbox(z.szene.platz).b * 0.35;
  assert.equal(M.setzePfad(z, P, [[c[0] - bx, y], [c[0] + bx, y]]), true);
  assert.equal(z.anteil, 0); assert.equal(z.profil, null); assert.ok(Math.abs(z.richtung) < 1e-12, "Tangente nach Osten");
  // mit der Maus zeichnen: Punkte in Gebäuden werden übersprungen
  M.zeichneBeginn(z, [c[0] - bx, y]); assert.equal(z.zeichnung.length, 1);
  assert.equal(M.zeichneWeiter(z, P, Geo.schwerpunkt(z.szene.gebaeude[0])), false);
  assert.equal(M.zeichneWeiter(z, P, [c[0] - bx, y + 1]), false, "Mindestabstand 3 m");
  assert.equal(M.zeichneWeiter(z, P, [c[0] + bx, y]), true); assert.equal(z.pfad.length, 2);
  M.pfadZurueck(z, P); assert.deepEqual(z.pfad, M.wegDurchStadt(z.szene));
});

test("gleiche Saat → gleiches Profil, andere Saat → anderes", () => {
  const a = M.profil(M.erzeuge(P, zufall(7)), P), b = M.profil(M.erzeuge(P, zufall(7)), P), c = M.profil(M.erzeuge(P, zufall(8)), P);
  assert.deepEqual(Array.from(a.werte.area), Array.from(b.werte.area));
  assert.notDeepEqual(Array.from(a.werte.area), Array.from(c.werte.area));
});

test("fünf Kenngrößen mit eigener Definition (in Toolbox v2 gestrichen) sind mit „*“ gekennzeichnet", () => {
  const G = require("../../_gemeinsam/geo.js");
  assert.deepEqual(M.EIGENE_DEFINITION, ["areaDist", "circularity", "convexDeficiency", "dispersion", "elongation"]);
  for (const k of M.EIGENE_DEFINITION) assert.ok(G.ISOVIST_MASSE.some(m => m[0] === k), k);
  assert.deepEqual(M.kenngroesseName("circularity"), { de: "Kreisähnlichkeit *", en: "Circularity *" });
  assert.deepEqual(M.kenngroesseName("area"), { de: "Fläche", en: "Area" });
  assert.deepEqual(M.kenngroesseOption("elongation").name, { de: "Streckung (Elongation) *", en: "Elongation *" });
  assert.equal(G.ISOVIST_MASSE.filter(([k]) => M.kenngroesseName(k).de.endsWith(" *")).length, 5);
  assert.ok(M.FUSSNOTE.de.startsWith("* eigene Definition"));
});
