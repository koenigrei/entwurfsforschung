/* Isovistenfeld · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 1) => isFinite(v) ? v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n }) : "–";
  const EINHEIT = { area: " m²", areaDist: " m³", perimeter: " m", occlusivity: " m", minRadial: " m", maxRadial: " m", meanRadial: " m", stdDev: " m", variance: " m²", driftMagnitude: " m", driftAngle: "°" };
  const wert = (k, v) => zahl(v, ["area", "areaDist", "variance"].includes(k) ? 0 : ["compactness", "circularity", "convexDeficiency", "skewness", "dispersion", "elongation"].includes(k) ? 3 : 1) + (isFinite(v) ? EINHEIT[k] || "" : "");
  const name = k => { const e = Geo.ISOVIST_MASSE.find(m => m[0] === k); return { de: e[2], en: e[1] }; };
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  const gebFarbe = F => F.dunkel ? "#2c2c31" : "#d9d9de", gebStrich = F => F.dunkel ? "#55555d" : "#a9a9b1";
  /** noch nicht berechnete Zellen: leicht in der Akzentfarbe getönt, damit sie sich von Gebäuden abheben */
  const OFFEN = F => F.dunkel ? [34, 35, 66] : [229, 230, 251];

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "zelle", gruppe: { de: "Analyseraster", en: "Analysis grid" }, name: { de: "Zellgröße (Cell Size) m", en: "Cell size (m)" }, min: 1, max: 10, schritt: 0.5, wert: S.zelle },
      { id: "winkel", gruppe: { de: "Isovist", en: "Isovist" }, name: { de: "Blickwinkel (Viewing Angle) °", en: "Viewing angle °" }, min: 0, max: 360, schritt: 1, wert: S.winkel },
      { id: "reichweite", name: { de: "Reichweite (Viewing Range) m", en: "Viewing range (m)" }, min: 1, max: 200, schritt: 1, wert: S.reichweite },
      { id: "strahlen", name: { de: "Strahlen (Isovist Rays)", en: "Isovist rays" }, min: 1, max: 720, schritt: 1, wert: S.strahlen },
      { id: "kenngroesse", art: "auswahl", name: { de: "Kenngröße (Isovist Properties)", en: "Isovist property" }, wert: S.kenngroesse,
        optionen: Geo.ISOVIST_MASSE.map(([k, en, d]) => ({ wert: k, name: { de: `${d} (${en})`, en } })) },
      { id: "umrandung", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "Zellen umranden", en: "Outline cells" }, wert: true },
      { id: "zeigeIsovist", art: "schalter", name: { de: "Isovist der gewählten Zelle", en: "Isovist of selected cell" }, wert: true }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste, phase) {
      if (taste === "rechts") { if (phase === "unten") Modell.setzeFuellpunkt(z, p, [x, y]); return; }
      Modell.waehle(z, p, Modell.zelleBei(z.raster, [x, y]));
    },
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px, G = z.raster, k = p.kenngroesse, W = z.werte[k];
      const leer = OFFEN(F);
      Sim.raster(ctx, G.nx, G.ny, d => {
        for (let c = 0; c < G.nx * G.ny; c++) {
          const i = 4 * c;
          if (!G.aktiv[c]) { d[i + 3] = 0; continue; }
          const v = W[c], f = isFinite(v) ? Modell.verlauf(Modell.anteil(z, k, v)) : leer;
          d[i] = f[0]; d[i + 1] = f[1]; d[i + 2] = f[2]; d[i + 3] = 255;
        }
      }, G.x0, G.y0, G.nx * G.cs, G.ny * G.cs);
      // Zellränder (wie die Grid Cells der .gh-Datei), nur wenn die Zellen groß genug sind
      if (p.umrandung && G.cs / px >= 4) {
        ctx.beginPath();
        for (const Z of G.zeilen) for (const c of Z) { const i = c % G.nx, j = (c - i) / G.nx; ctx.rect(G.x0 + i * G.cs, G.y0 + j * G.cs, G.cs, G.cs); }
        ctx.strokeStyle = F.dunkel ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.45)"; ctx.lineWidth = px * 0.6; ctx.stroke();
      }
      // Zeile, die als nächste gerechnet wird
      if (!Modell.fertig(z)) {
        const Z = G.zeilen[z.zeile], j = Math.floor(Z[0] / G.nx);
        ctx.fillStyle = F.akzent; ctx.globalAlpha = 0.85;
        for (const c of Z) { const i = c % G.nx; ctx.fillRect(G.x0 + i * G.cs, G.y0 + j * G.cs, G.cs, G.cs); }
        ctx.globalAlpha = 1;
      }
      for (const g of z.szene.gebaeude) Karte.poly(ctx, g, gebFarbe(F), gebStrich(F), px * 0.6);
      Karte.poly(ctx, z.ecken, null, F.gedaempft, px * 1);
      // gewählte Zelle: Isovist und Wert
      if (z.auswahl >= 0 && z.auswahlIso) {
        const q = Modell.zellMitte(G, z.auswahl);
        if (p.zeigeIsovist) Karte.poly(ctx, Geo.isovistPolygon(z.auswahlIso), F.dunkel ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)", F.tinte, px * 1.4);
        ctx.strokeStyle = F.tinte; ctx.lineWidth = px * 1.5; ctx.strokeRect(q[0] - G.cs / 2, q[1] - G.cs / 2, G.cs, G.cs);
        Karte.punkt(ctx, q, 3 * px, F.tinte);
        const nm = name(k);
        Karte.text(ctx, `${de() ? nm.de : nm.en}: ${wert(k, z.auswahlMasse[k])}`, [q[0] + 8 * px, q[1] - 10 * px], F.tinte, px, 12);
      }
      // Füllpunkt (Fill Point der Komponente „Analysis Grid“)
      Karte.punkt(ctx, z.fuell, 5 * px, F.akzent, F.tinte, px * 1.2);
    },
    legende: (F, p, z) => {
      const k = p.kenngroesse, V = Modell.VERLAUF.farben;
      return V.map((c, i) => [css(c), i === 0 ? wert(k, z.min[k]) : i === V.length - 1 ? wert(k, z.max[k]) : ""])
        .concat([[gebFarbe(F), { de: "Gebäude", en: "Buildings" }], [css(OFFEN(F)), { de: "noch offen", en: "pending" }], [F.akzent, { de: "Füllpunkt", en: "Fill point" }]]);
    },
    kennzahlen: (z, p) => {
      const k = p.kenngroesse, G = z.raster, nm = name(k);
      const L = [
        [{ de: "Zellen (Analysis Points)", en: "Cells (analysis points)" }, zahl(G.anzahl, 0)],
        [{ de: "berechnet", en: "computed" }, `${zahl(z.berechnet, 0)} · ${zahl(G.anzahl ? 100 * z.berechnet / G.anzahl : 0, 0)} %`],
        [{ de: "Kenngröße", en: "Property" }, nm],
        [{ de: "Minimum", en: "Minimum" }, wert(k, z.berechnet ? z.min[k] : NaN)],
        [{ de: "Maximum", en: "Maximum" }, wert(k, z.berechnet ? z.max[k] : NaN)],
        [{ de: "Mittel", en: "Mean" }, wert(k, Modell.mittel(z, k))]
      ];
      if (z.auswahl >= 0 && z.auswahlMasse) {
        L.push([{ de: "gewählte Zelle", en: "Selected cell" }, wert(k, z.auswahlMasse[k])]);
        if (k !== "area") L.push([{ de: "… Fläche", en: "… area" }, wert("area", z.auswahlMasse.area)]);
        L.push([{ de: "… Kompaktheit", en: "… compactness" }, wert("compactness", z.auswahlMasse.compactness)]);
      }
      return L;
    }
  });
})();
