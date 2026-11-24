/* Ringstraßen · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });
  const ha = v => zahl(v / 1e4, 1) + " ha";
  /** Farben der beiden Ringe (Zellen, Linie) je Darstellung */
  const RING = F => F.dunkel
    ? [{ zelle: "rgba(154,205,50,0.55)", linie: "#c6f06a" }, { zelle: "rgba(214,40,100,0.5)", linie: "#ff5c95" }]
    : [{ zelle: "rgba(154,205,50,0.6)", linie: "#3f6d0a" }, { zelle: "rgba(194,24,91,0.45)", linie: "#9c0f3f" }];

  /** Gelände einmal je Größe und Darstellung in ein Bild rechnen und danach nur noch einsetzen (Karte.gelaendeGespeichert) */
  const gelaende = (ctx, G, F) => Karte.gelaendeGespeichert(ctx, G, F, { hoehenlinien: 20 });
  const ringLinie = (ctx, R, farbe, F, lw, strich) => { for (const L of R.linien) { Karte.poly(ctx, L, null, F.dunkel ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)", lw * 1.9); ctx.setLineDash(strich || []); Karte.poly(ctx, L, null, farbe, lw); ctx.setLineDash([]); } };

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 50, wert: 6 },
    parameter: [
      { id: "flaeche1", gruppe: { de: "Ringe", en: "Rings" }, name: { de: "Benötigte Fläche 1 (Needed Area) m²", en: "Needed area 1 (m²)" }, min: 0, max: 10000000, schritt: 1, wert: S.flaeche1 },
      { id: "flaeche2", name: { de: "Benötigte Fläche 2 (Needed Area) m²", en: "Needed area 2 (m²)" }, min: 0, max: 10000000, schritt: 1, wert: S.flaeche2 },
      { id: "gewTerrain", gruppe: { de: "Gewichte", en: "Weights" }, name: { de: "Gelände: Neigung und Höhe (WeightTerrain)", en: "Terrain: slope and height (WeightTerrain)" }, min: 0, max: 1, schritt: 0.01, wert: S.gewTerrain },
      { id: "gewStrasse", name: { de: "Abstand zur Straße (WeightRoad)", en: "Distance to road (WeightRoad)" }, min: 0, max: 1, schritt: 0.01, wert: S.gewStrasse },
      { id: "gewZentrum", name: { de: "Abstand zum Zentrum (WeightCenter)", en: "Distance to center (WeightCenter)" }, min: 0, max: 1, schritt: 0.01, wert: S.gewZentrum },
      { id: "aufloesung", gruppe: { de: "Raster und Umriss", en: "Grid and outline" }, name: { de: "Rasterauflösung (Grid Resolution)", en: "Grid resolution" }, min: 5, max: 100, schritt: 1, wert: S.aufloesung },
      { id: "alpha", name: { de: "Alpha-Radius × Zellbreite (Alpha Shape)", en: "Alpha radius × cell width (Alpha Shape)" }, min: 0, max: 10, schritt: 0.1, wert: S.alpha },
      { id: "staerke", name: { de: "Glättung (Smooth Polyline Strength)", en: "Smoothing (Smooth Polyline strength)" }, min: 0, max: 1, schritt: 0.01, wert: S.staerke },
      { id: "zeigeZellen", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "Gewählte Zellen zeigen", en: "Show picked cells" }, wert: true },
      { id: "zeigeScore", art: "schalter", name: { de: "Bewertung (Score) aller Zellen zeigen", en: "Show score of all cells" }, wert: false }
    ],
    aktionen: [{ name: { de: "Wachstum abspielen", en: "Replay growth" }, tue: z => Modell.abspielen(z) }],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y) { Modell.setzeZentrum(z, p, [x, y]); },
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px, Z = z.Z, c = Z.c, farben = RING(F);
      gelaende(ctx, z.G, F);
      if (p.zeigeScore) {
        let mn = Infinity, mx = -Infinity; for (const s of z.score) { if (s < mn) mn = s; if (s > mx) mx = s; }
        for (let k = 0; k < Z.n; k++) { ctx.fillStyle = Karte.farbe(mx > mn ? (z.score[k] - mn) / (mx - mn) : 0, "spektral", 0.42); ctx.fillRect(Z.x[k] - c / 2, Z.y[k] - c / 2, c, c); }
      }
      if (p.zeigeZellen) {
        const n1 = Math.min(...z.ziele.map(q => q.n));
        for (let r = 0; r < z.n; r++) { const k = z.reihe[r]; ctx.fillStyle = r < n1 ? farben[0].zelle : farben[1].zelle; ctx.fillRect(Z.x[k] - c / 2, Z.y[k] - c / 2, c, c); }
      }
      for (const S of z.strassen) { Karte.linie(ctx, S, F.dunkel ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)", px * 5); Karte.linie(ctx, S, F.tinte, px * 2.4); }
      const sortiert = z.ziele.slice().sort((a, b) => a.n - b.n);
      sortiert.forEach((q, i) => { if (z.n >= q.n && q.n > 0) ringLinie(ctx, z.ringe[q.i], farben[i].linie, F, px * 3); });
      if (z.n > 0 && !Modell.fertig(z)) ringLinie(ctx, Modell.aktuellerUmriss(z, p), F.tinte, F, px * 1.4, [px * 5, px * 4]);
      Karte.punkt(ctx, z.zentrum, px * 7, F.akzent, F.tinte, px * 1.5);
      Karte.text(ctx, de() ? "Zentrum" : "Center", [z.zentrum[0] + px * 11, z.zentrum[1] - px * 11], F.tinte, px, 12);
    },
    legende: F => { const f = RING(F); return [[f[0].zelle, { de: "Zellen Ring 1", en: "Cells ring 1" }], [f[1].zelle, { de: "Zellen Ring 2", en: "Cells ring 2" }],
      [f[1].linie, { de: "Ringstraße", en: "Ring road" }], [F.tinte, { de: "Straßen", en: "Roads" }], [F.akzent, { de: "Zentrum", en: "Center" }]]; },
    kennzahlen(z, p) {
      const k = [], A = Modell.flaecheBis(z, z.n);
      k.push([{ de: "Zellen gewählt", en: "Cells picked" }, `${zahl(z.n)} / ${zahl(z.nMax)}`]);
      k.push([{ de: "Gewählte Fläche", en: "Picked area" }, ha(A)]);
      z.ziele.slice().sort((a, b) => a.n - b.n).forEach((q, i) => {
        const R = z.ringe[q.i], ok = z.n >= q.n;
        k.push([{ de: `Ring ${i + 1}: Ziel`, en: `Ring ${i + 1}: target` }, ha(q.flaeche)]);
        k.push([{ de: `Ring ${i + 1}: Straßenlänge`, en: `Ring ${i + 1}: road length` }, ok ? zahl(R.laenge) + " m" : { de: "noch nicht erreicht", en: "not reached yet" }]);
      });
      k.push([{ de: "Zellgröße", en: "Cell size" }, `${zahl(z.Z.c, 0)} m · ${zahl(z.zellbreite, 1)} m (3D)`]);
      let ng = 0; for (let r = 0; r < z.n; r++) ng += z.W[0][z.reihe[r]];
      k.push([{ de: "Mittlere Neigung gewählt", en: "Mean slope picked" }, z.n ? zahl(ng / z.n * 180 / Math.PI, 1) + "°" : "–"]);
      k.push([{ de: "Höhe Zentrum", en: "Center height" }, zahl(z.zentrum[2]) + " m"]);
      return k;
    }
  });
})();
