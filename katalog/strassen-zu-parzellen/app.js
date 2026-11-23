/* Vom Straßennetz zu Grundstücken · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });
  const grad = v => isFinite(v) ? zahl(v, 1) + "°" : "–";
  const LUECKE = "#ff8a1f";

  /** Gelände einmal je Größe, Darstellung und Höhenlinienabstand in ein Bild rechnen und danach nur noch einsetzen */
  const cache = { schluessel: "", c: null };
  function gelaende(ctx, G, F, dz) {
    const a = ctx.getTransform().a, W = Math.max(1, Math.round(G.groesse * a)), k = [W, F.dunkel, dz, G.h.length, G.h[7], G.max].join("|");
    if (cache.schluessel !== k) {
      const c = cache.c || document.createElement("canvas"); c.width = W; c.height = W;
      const x = c.getContext("2d"); x.setTransform(a, 0, 0, a, 0, 0);
      Karte.gelaende(x, G, F, { hoehenlinien: dz > 0 ? dz : 0 });
      cache.c = c; cache.schluessel = k;
    }
    ctx.drawImage(cache.c, 0, 0, G.groesse, G.groesse);
  }
  /** Bake: behaltene Plots als GeoJSON-Datei speichern */
  function bake(z) {
    const blob = new Blob([JSON.stringify(Modell.geojson(z))], { type: "application/geo+json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "plots.geojson";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /** aussortierter Plot: schräg schraffiert, gestrichelt umrandet */
  function schraffur(ctx, poly, F, px) {
    const bb = Geo.bbox(poly), d = 7 * px;
    ctx.save(); Karte.pfad(ctx, poly, true); ctx.clip();
    ctx.fillStyle = F.dunkel ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.5)"; ctx.fill();
    ctx.beginPath();
    for (let s = bb.x0 - bb.h; s < bb.x1; s += d) { ctx.moveTo(s, bb.y1); ctx.lineTo(s + bb.h, bb.y0); }
    ctx.strokeStyle = F.tinte2; ctx.lineWidth = px * 0.7; ctx.stroke(); ctx.restore();
    ctx.setLineDash([4 * px, 3 * px]); Karte.poly(ctx, poly, null, F.tinte2, px); ctx.setLineDash([]);
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 2 },
    parameter: [
      { id: "methode", gruppe: { de: "3. Plot Division", en: "3. Plot division" }, art: "auswahl", name: { de: "Verfahren (Plot Division)", en: "Method (plot division)" }, wert: S.methode,
        optionen: [{ wert: "dcs", name: { de: "DeCodingSpaces", en: "DeCodingSpaces" } },
                   { wert: "split", name: { de: "GH Split Surface", en: "GH Split Surface" } }] },
      { id: "toleranz", name: { de: "Toleranz Split Surface m", en: "Split surface tolerance (m)" }, min: 0, max: 5, schritt: 0.1, wert: S.toleranz },
      { id: "weightSlope", gruppe: { de: "4. Neigung", en: "4. Slope" }, name: { de: "Schwelle Neigung (WeightSlope)", en: "Slope threshold (WeightSlope)" }, min: 0, max: 1, schritt: 0.01, wert: S.weightSlope },
      { id: "luecken", gruppe: { de: "Szene", en: "Scene" }, name: { de: "Anteil ungenauer Anschlüsse", en: "Share of imprecise junctions" }, min: 0, max: 0.2, schritt: 0.01, wert: S.luecken, neustart: true },
      { id: "faerbung", gruppe: { de: "Darstellung", en: "Display" }, art: "auswahl", name: { de: "Färbung der Plots", en: "Plot colouring" }, wert: S.faerbung,
        optionen: [{ wert: "neigung", name: { de: "Neigung", en: "Slope" } },
                   { wert: "reihenfolge", name: { de: "Reihenfolge", en: "Order" } }] },
      { id: "hoehenlinien", name: { de: "Höhenlinien m", en: "Contour lines (m)" }, min: 0, max: 50, schritt: 1, wert: S.hoehenlinien },
      { id: "zeigeLuecken", art: "schalter", name: { de: "Offene Anschlüsse markieren", en: "Mark open junctions" }, wert: S.zeigeLuecken }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste, phase) { if (phase === "unten") { const i = Modell.plotBei(z, [x, y]); z.wahl = i === z.wahl ? -1 : i; } },
    aktionen: [
      { name: { de: "Alle Plots", en: "All plots" }, tue: (z, p) => Modell.rechneAlles(z, p) },
      { name: { de: "5. Bake (GeoJSON)", en: "5. Bake (GeoJSON)" }, tue: (z, p) => { if (!Modell.fertig(z)) Modell.rechneAlles(z, p); bake(z); } }
    ],
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px, n = z.plots.length;
      gelaende(ctx, z.G, F, p.hoehenlinien);
      // Plots: noch ohne Neigung nur umrandet, behalten farbig, aussortiert gestrichelt
      z.plots.forEach((P, i) => {
        if (i >= z.k) { Karte.poly(ctx, P.poly, F.dunkel ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", null); return; }
        if (z.F.behalten[i]) {
          const t = p.faerbung === "reihenfolge" ? i / Math.max(1, n - 1) : z.F.wert[i];
          Karte.poly(ctx, P.poly, Karte.farbe(t, p.faerbung === "reihenfolge" ? "kaltwarm" : "spektral", 0.82), null);
        } else schraffur(ctx, P.poly, F, px);
      });
      // Straßen
      const N = z.N, Sg = N.kanten.map(e => [N.knoten[e.a], N.knoten[e.b]]);
      Karte.segmente(ctx, Sg, F.dunkel ? "rgba(235,235,240,0.85)" : "rgba(20,20,26,0.85)", px * 1.3);
      // offene Anschlüsse: Ring; mit Split Surface überbrückt: Punkt
      if (p.zeigeLuecken) for (const q of z.offen) p.methode === "split" ? Karte.punkt(ctx, q, px * 3.5, LUECKE, null) : Karte.punkt(ctx, q, px * 6, null, LUECKE, px * 2);
      if (z.k > 0 && !Modell.fertig(z)) { const c = Modell.mittelpunkt(z.plots[z.k - 1].poly); Karte.poly(ctx, z.plots[z.k - 1].poly, null, F.tinte, px * 2.2); Karte.punkt(ctx, c, px * 3, F.tinte, null); }
      if (z.wahl >= 0 && z.plots[z.wahl]) { Karte.poly(ctx, z.plots[z.wahl].poly, null, F.akzent, px * 2.8); Karte.punkt(ctx, Modell.mittelpunkt(z.plots[z.wahl].poly), px * 3.5, F.akzent, null); }
      if (z.t === 0) {
        const lang = de() ? "Start bestimmt die Neigung je Plot · Klick auf einen Plot zeigt seine Werte" : "Start computes the slope of each plot · click a plot to show its values";
        const kurz = de() ? "Start: ein Plot je Schritt" : "Start: one plot per step";
        Karte.text(ctx, lang.length * 7.4 < z.b / px - 24 ? lang : kurz, [z.b / 2, z.h - 16 * px], F.tinte, px, 12, "center");
      }
    },
    legende: (F, p) => (p.faerbung === "reihenfolge"
      ? [[Karte.farbe(0, "kaltwarm"), { de: "erster Plot", en: "first plot" }], [Karte.farbe(0.5, "kaltwarm"), ""], [Karte.farbe(1, "kaltwarm"), { de: "letzter", en: "last" }]]
      : Karte.skalenLegende("spektral", { de: "flach", en: "flat" }, { de: "steil", en: "steep" }))
      .concat([[F.tinte2, { de: "aussortiert (schraffiert)", en: "culled (hatched)" }], [LUECKE, p.methode === "split" ? { de: "Anschluss überbrückt", en: "junction bridged" } : { de: "offener Anschluss", en: "open junction" }]]),
    kennzahlen(z, p) {
      const b = Modell.bilanz(z), ha = v => zahl(v / 1e4, 1) + " ha";
      const k = [
        [{ de: "Straßensegmente", en: "Street segments" }, zahl(z.segmente.length)],
        [{ de: "Plots (Plot Division)", en: "Plots (plot division)" }, zahl(b.plots)],
        [{ de: "Offene Anschlüsse", en: "Open junctions" }, zahl(z.offen.length) + (p.methode === "split" && z.offen.length ? (de() ? " (überbrückt)" : " (bridged)") : "")],
        [{ de: "Neigung bestimmt", en: "Slope computed" }, zahl(b.fertig) + " / " + zahl(b.plots)],
        [{ de: "Behalten", en: "Kept" }, zahl(b.behalten) + " · " + ha(b.flaecheBehalten)],
        [{ de: "Aussortiert (zu steil)", en: "Culled (too steep)" }, zahl(b.aussortiert) + " · " + ha(b.flaecheAussortiert)],
        [{ de: "Neigung min … max (Bounds)", en: "Slope min … max (bounds)" }, b.fertig ? grad(b.lo) + " … " + grad(b.hi) : "–"],
        [{ de: "Schwelle als Neigung", en: "Threshold as slope" }, b.fertig ? grad(b.lo + p.weightSlope * (b.hi - b.lo)) : "–"]
      ];
      if (z.wahl >= 0 && z.plots[z.wahl]) {
        const i = z.wahl, P = z.plots[i];
        k.push([{ de: "▸ Plot: Fläche", en: "▸ Plot: area" }, zahl(Geo.flaeche(P.poly)) + " m²"]);
        k.push([{ de: "▸ Neigung (CellSlope)", en: "▸ Slope (CellSlope)" }, i < z.k ? grad(z.neigung[i]) + " · " + zahl(z.F.wert[i], 2) : "–"]);
        k.push([{ de: "▸ Ergebnis", en: "▸ Result" }, i < z.k ? (z.F.behalten[i] ? { de: "behalten", en: "kept" } : { de: "aussortiert", en: "culled" }) : "–"]);
      }
      return k;
    }
  });
})();
