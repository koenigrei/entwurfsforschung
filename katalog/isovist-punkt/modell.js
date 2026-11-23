/* Isovist von einem Punkt · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Isovist Single Point“ aus dem Parametric Planning Catalogue
   (DeCodingSpaces – Martin Bielik, Ekaterina Fuchkina).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie die DeCodingSpaces-Komponente „Isovist“ der .gh-Datei: vom Standpunkt (Viewpoint) gehen Strahlen
   (Isovist Rays, Regler 1…720, Voreinstellung 360) gleichmäßig über den Blickwinkel (Viewing Angle, 0…360°) um die
   Blickrichtung (Angle Direction, 0…6,28 rad) bis zur Reichweite (Viewing Range, 1…200 m). Jeder Strahl endet am ersten
   Hindernis (Gebäudekanten, Obstacles). Die Endpunkte bilden das Isovist-Polygon; daraus folgen die 17 Kenngrößen
   der Liste „Isovist Properties“ (Geo.isovistMasse). */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Viewing Angle 360 (0…360), Viewing Range 100 (1…200), Rays 360 (1…720), Angle Direction 0 (0…6,28);
      drehung: Grad je Schritt, um die die Blickrichtung beim Abspielen weiterdreht (nur in der App) */
  const STANDARD = { winkel: 360, reichweite: 100, strahlen: 360, richtung: 0, drehung: 2, kenngroesse: "area" };

  /** Neuer Zustand: Beispielstadt, Standpunkt auf dem Platz vor der Kirche */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = Szenen.stadt(zufall);
    const c = Geo.schwerpunkt(szene.platz), bb = Geo.bbox(szene.platz);
    const z = { t: 0, szene, b: szene.b, h: szene.h, o: [c[0] - bb.b * 0.25, c[1] + bb.h * 0.33], dreh: 0, iso: null, masse: null };
    rechne(z, p);
    return z;
  }

  /** Blickrichtung wie in der .gh-Datei: Unit Y (Norden, oben) um „Angle Direction“ gegen den Uhrzeigersinn gedreht (Rotate).
      winkelGH = Regler + beim Abspielen aufgelaufene Drehung; richtung() liefert den Winkel auf dem Bildschirm (0 = Osten, y nach unten). */
  const winkelGH = (z, p) => (p.richtung || 0) + z.dreh;
  const richtung = (z, p) => -Math.PI / 2 - winkelGH(z, p);

  /** Isovist und Kenngrößen neu berechnen */
  function rechne(z, p) {
    z.iso = Geo.isovist(z.o, z.szene.hindernisse, { winkel: p.winkel, reichweite: p.reichweite, strahlen: p.strahlen, richtung: richtung(z, p) });
    z.masse = Geo.isovistMasse(z.iso);
    return z;
  }

  /** liegt der Punkt in einem Gebäude? (dort ist kein Standpunkt möglich) */
  function imGebaeude(z, q) { return z.szene.gebaeude.some(g => Geo.punktInPoly(q, g)); }

  /** Standpunkt versetzen (nicht in Gebäude); true, wenn versetzt */
  function setzeStandpunkt(z, p, q) {
    if (q[0] < 0 || q[1] < 0 || q[0] > z.b || q[1] > z.h || imGebaeude(z, q)) return false;
    z.o = [q[0], q[1]]; rechne(z, p); return true;
  }

  /** Blickrichtung zum Punkt q drehen (Regler bleibt, die Differenz geht in z.dreh) */
  function blickeZu(z, p, q) {
    z.dreh = -Math.PI / 2 - Math.atan2(q[1] - z.o[1], q[0] - z.o[0]) - (p.richtung || 0);
    rechne(z, p);
  }

  /** Ein Schritt: Blickrichtung dreht um „drehung“ Grad gegen den Uhrzeigersinn weiter (sichtbar bei Blickwinkel < 360°) */
  function schritt(z, p) {
    z.dreh += (p.drehung == null ? STANDARD.drehung : p.drehung) * Math.PI / 180;
    rechne(z, p);
    z.t++;
    return z;
  }

  function aendere(z, p) { rechne(z, p); }

  return { STANDARD, erzeuge, schritt, aendere, rechne, richtung, winkelGH, imGebaeude, setzeStandpunkt, blickeZu };
});
