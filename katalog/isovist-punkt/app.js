/* Isovist von einem Punkt · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const ORANGE = "#f5a300";
  const zahl = (v, n = 1) => v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  const EINHEIT = { area: " m²", areaDist: " m³", perimeter: " m", occlusivity: " m", minRadial: " m", maxRadial: " m", meanRadial: " m", stdDev: " m", variance: " m²", driftMagnitude: " m", driftAngle: "°" };
  const wert = (k, v) => zahl(v, ["area", "areaDist", "variance"].includes(k) ? 0 : ["compactness", "circularity", "convexDeficiency", "skewness", "dispersion", "elongation"].includes(k) ? 3 : 1) + (EINHEIT[k] || "");

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "winkel", gruppe: { de: "Isovist", en: "Isovist" }, name: { de: "Blickwinkel (Viewing Angle) °", en: "Viewing angle °" }, min: 0, max: 360, schritt: 1, wert: S.winkel },
      { id: "richtung", name: { de: "Blickrichtung (Angle Direction) rad", en: "Angle direction (rad)" }, min: 0, max: 6.28, schritt: 0.01, wert: S.richtung },
      { id: "reichweite", name: { de: "Reichweite (Viewing Range) m", en: "Viewing range (m)" }, min: 1, max: 200, schritt: 1, wert: S.reichweite },
      { id: "strahlen", name: { de: "Strahlen (Isovist Rays)", en: "Isovist rays" }, min: 1, max: 720, schritt: 1, wert: S.strahlen },
      { id: "kenngroesse", art: "auswahl", name: { de: "Kenngröße", en: "Property" }, wert: S.kenngroesse,
        optionen: Geo.ISOVIST_MASSE.map(([k, en, de]) => ({ wert: k, name: { de: `${de} (${en})`, en } })) },
      { id: "drehung", gruppe: { de: "Abspielen", en: "Playback" }, name: { de: "Drehung je Schritt °", en: "Rotation per step °" }, min: 0, max: 10, schritt: 0.5, wert: S.drehung },
      { id: "zeigeStrahlen", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "Strahlen zeigen", en: "Show rays" }, wert: true },
      { id: "zeigePolygon", art: "schalter", name: { de: "Isovist-Polygon zeigen", en: "Show isovist polygon" }, wert: true }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste) {
      if (taste === "rechts") Modell.blickeZu(z, p, [x, y]);
      else Modell.setzeStandpunkt(z, p, [x, y]);
    },
    zeichne(ctx, z, p, F) {
      const px = F.px, iso = z.iso;
      for (const g of z.szene.gebaeude) Karte.poly(ctx, g, F.dunkel ? "#2c2c31" : "#d9d9de", F.dunkel ? "#55555d" : "#a9a9b1", px * 0.6);
      Karte.punkt(ctx, z.o, p.reichweite, null, F.gedaempft, px * 0.7);
      if (p.zeigeStrahlen) {
        ctx.beginPath();
        for (const q of iso.punkte) { ctx.moveTo(z.o[0], z.o[1]); ctx.lineTo(q[0], q[1]); }
        ctx.strokeStyle = "rgba(245,163,0,0.45)"; ctx.lineWidth = px * 0.6; ctx.stroke();
      }
      if (p.zeigePolygon) Karte.poly(ctx, Geo.isovistPolygon(iso), "rgba(245,163,0,0.28)", ORANGE, px * 1.4);
      const r = Modell.richtung(z, p);
      if (p.winkel < 360) Karte.pfeil(ctx, z.o, [Math.cos(r), Math.sin(r)], 14 * px * 2, F.tinte, px * 1.5);
      Karte.punkt(ctx, z.o, 4 * px, F.akzent, F.tinte, px * 1.2);
      const k = p.kenngroesse, e = Geo.ISOVIST_MASSE.find(m => m[0] === k), de = document.documentElement.lang !== "en";
      Karte.text(ctx, `${de ? e[2] : e[1]}: ${wert(k, z.masse[k])}`, [z.o[0] + 9 * px, z.o[1] - 10 * px], F.tinte, px, 12);
    },
    legende: (F) => [[F.dunkel ? "#2c2c31" : "#d9d9de", { de: "Gebäude (Hindernisse)", en: "Buildings (obstacles)" }], ["rgba(245,163,0,0.6)", { de: "Isovist", en: "Isovist" }], [F.akzent, { de: "Standpunkt", en: "Viewpoint" }]],
    kennzahlen: (z, p) => Geo.ISOVIST_MASSE.map(([k, en, de]) => [{ de, en }, (k === p.kenngroesse ? "▸ " : "") + wert(k, z.masse[k])])
      .concat([[{ de: "Blickrichtung", en: "View direction" }, zahl(((Modell.winkelGH(z, p) * 180 / Math.PI) % 360 + 360) % 360, 0) + "° " + (document.documentElement.lang === "en" ? "(0 = north, counter-clockwise)" : "(0 = Nord, gegen Uhrzeiger)")]])
  });
})();
