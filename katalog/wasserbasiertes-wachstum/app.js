/* Straßenwachstum nach dem Wasserabfluss · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const en = () => document.documentElement.lang === "en";
  const zahl = (v, n = 0) => v.toLocaleString(en() ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  const km2 = v => zahl(v / 1e6, 2) + " km²";
  const wasser = (F, a = 0.24) => F.dunkel ? `rgba(120,190,240,${a})` : `rgba(24,94,170,${a})`;
  /** Farbe der Wachstumsgrenze [r, g, b, Deckkraft 0…255] */
  const grenzeFarbe = F => F.dunkel ? [158, 160, 243, 64] : [70, 73, 225, 46];
  /** Straßenfarbe nach der Zeit t (Reihenfolge des Wachstums) wie im Katalogbild: früh blaugrün, spät gelb und rot */
  const strassenFarbe = (t, F) => { const c = Karte.farbeRGB(0.1 + 0.9 * t, "spektral"); return F.dunkel ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgb(${c.map(v => Math.round(v * 0.74)).join(",")})`; };

  /** Gelände einmal je Größe, Darstellung und Glättung in ein Bild rechnen und danach nur noch einsetzen */
  const cache = { schluessel: "", c: null };
  function gelaende(ctx, G, F) {
    const a = ctx.getTransform().a, W = Math.max(1, Math.round(G.groesse * a)), k = [W, F.dunkel, G.h[5050], G.h[777], G.max].join("|");
    if (cache.schluessel !== k) {
      const c = cache.c || document.createElement("canvas"); c.width = W; c.height = W;
      const x = c.getContext("2d"); x.setTransform(a, 0, 0, a, 0, 0);
      Karte.gelaende(x, G, Object.assign({}, F, { px: 1 / a }), { hoehenlinien: 20 });
      cache.c = c; cache.schluessel = k;
    }
    ctx.drawImage(cache.c, 0, 0, G.groesse, G.groesse);
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 60, wert: 4 },
    parameter: [
      { id: "grenze", gruppe: { de: "Wachstumsgrenze (Growth Boundary)", en: "Growth boundary" }, art: "auswahl", name: { de: "Grenze", en: "Boundary" }, wert: S.grenze,
        optionen: [{ wert: "schwellen", name: { de: "Gewichte als Schwellen (wie .gh)", en: "Weights as thresholds (as in .gh)" } },
                   { wert: "flaeche", name: { de: "Fläche aus Einwohnerzahl (Ergänzung)", en: "Area from population (addition)" } }] },
      { id: "gewNeigung", name: { de: "Neigung (WeightSlope)", en: "Slope (WeightSlope)" }, min: 0, max: 1, schritt: 0.01, wert: S.gewNeigung },
      { id: "gewHoehe", name: { de: "Höhe zum Zentrum (WeightHeight)", en: "Height to center (WeightHeight)" }, min: 0, max: 1, schritt: 0.01, wert: S.gewHoehe },
      { id: "gewZentrum", name: { de: "Abstand zum Zentrum (WeightCenter)", en: "Distance to center (WeightCenter)" }, min: 0, max: 1, schritt: 0.01, wert: S.gewZentrum },
      { id: "einwohner", name: { de: "Einwohner (Number People)", en: "Number of people" }, min: 0, max: 10000, schritt: 100, wert: S.einwohner },
      { id: "personen", name: { de: "Personen je Haushalt (PersonPerHousehold)", en: "Persons per household" }, min: 1, max: 10, schritt: 1, wert: S.personen },
      { id: "flaecheHaushalt", name: { de: "Fläche je Haushalt (AreaPerHousehold) m²", en: "Area per household (m²)" }, min: 50, max: 1000, schritt: 10, wert: S.flaecheHaushalt },
      { id: "blockgroesse", gruppe: { de: "Straßennetz (Configuration)", en: "Street network (configuration)" }, name: { de: "Blockgröße (StreetBlockSize) m", en: "Street block size (m)" }, min: 20, max: 150, schritt: 1, wert: S.blockgroesse },
      { id: "segmenteKante", name: { de: "Segmente je Blockkante (SegmentsPerBlockEdge)", en: "Segments per block edge" }, min: 1, max: 10, schritt: 1, wert: S.segmenteKante },
      { id: "maxWinkel", name: { de: "Größte Drehung (MaxGrowthAngle) °", en: "Max growth angle °" }, min: 0, max: 90, schritt: 1, wert: S.maxWinkel },
      { id: "winkelSchritt", name: { de: "Winkelschritt (GrowthAngle) °", en: "Growth angle step °" }, min: 1, max: 5, schritt: 1, wert: S.winkelSchritt },
      { id: "wasserVersatz", name: { de: "Versatz zur Fließrichtung (WaterAngleShift) °", en: "Water angle shift °" }, min: 0, max: 45, schritt: 1, wert: S.wasserVersatz },
      { id: "kreuzung", art: "auswahl", name: { de: "Kreuzungsart (Junction Type)", en: "Junction type" }, wert: S.kreuzung,
        optionen: [{ wert: "kreuzung", name: { de: "Kreuzung (Crossing)", en: "Crossing" } }, { wert: "t_links", name: { de: "T-Kreuzung, links zuerst", en: "T-junction, start left" } },
                   { wert: "t_rechts", name: { de: "T-Kreuzung, rechts zuerst", en: "T-junction, start right" } }] },
      { id: "richtung", art: "auswahl", name: { de: "Anfangsrichtung (InitialDirection)", en: "Initial direction" }, wert: S.richtung,
        optionen: [{ wert: "beide", name: { de: "beide Seiten", en: "Both directions" } }, { wert: "links", name: { de: "linke Seite", en: "Left side" } }, { wert: "rechts", name: { de: "rechte Seite", en: "Right side" } }] },
      { id: "schwelle", name: { de: "Schwelle Population (PopulationThreshold)", en: "Population threshold" }, min: 0, max: 1, schritt: 0.01, wert: S.schwelle },
      { id: "maxSegmente", name: { de: "Schleifenrunden höchstens (Street Segments)", en: "Max loop rounds (Street Segments)" }, min: 0, max: 10000, schritt: 100, wert: S.maxSegmente },
      { id: "bestand", gruppe: { de: "Gelände und Bestand", en: "Terrain and existing streets" }, art: "schalter", name: { de: "Bestandsstraße (Existing Streets)", en: "Existing street" }, wert: S.bestand },
      { id: "glaettung", name: { de: "Glättung (Smooth) · 0 = glatt, 1 = genau", en: "Smooth · 0 = smooth, 1 = precise" }, min: 0, max: 1, schritt: 0.1, wert: S.glaettung },
      { id: "aufloesung", name: { de: "Rasterpunkte je Seite (Divide Surface)", en: "Grid points per side (Divide Surface)" }, min: 20, max: 400, schritt: 10, wert: S.aufloesung },
      { id: "zeigeGrenze", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "Wachstumsgrenze zeigen", en: "Show growth boundary" }, wert: true },
      { id: "zeigeFluss", art: "schalter", name: { de: "Fließlinien zeigen (Flowlines)", en: "Show flow lines" }, wert: true }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste, phase) { if (phase === "unten") Modell.setzeZentrum(z, p, [x, y]); },
    ende: (z, p) => Modell.fertig(z, p),
    zeichne(ctx, z, p, F) {
      const px = F.px, K = z.K, m = K.m, d = K.d;
      gelaende(ctx, z.G, F);
      if (p.zeigeGrenze) {
        const c = grenzeFarbe(F), fr = z.grenze.frei;
        Sim.raster(ctx, m, m, D => { for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) { const o = 4 * (j * m + i); if (fr[i * m + j]) { D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = c[3]; } else D[o + 3] = 0; } },
          -d / 2, -d / 2, m * d, m * d);
      }
      if (p.zeigeFluss) { ctx.beginPath(); for (const L of z.fluss) { ctx.moveTo(L[0][0], L[0][1]); for (const q of L) ctx.lineTo(q[0], q[1]); } ctx.strokeStyle = wasser(F); ctx.lineWidth = px * 1; ctx.stroke(); }
      // Bestandsstraße
      ctx.lineCap = "round";
      ctx.beginPath(); for (const s of z.bestand) { ctx.moveTo(s.a[0], s.a[1]); ctx.lineTo(s.b[0], s.b[1]); }
      ctx.strokeStyle = F.dunkel ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)"; ctx.lineWidth = px * 6; ctx.stroke();
      ctx.strokeStyle = F.tinte; ctx.lineWidth = px * 3; ctx.stroke();
      // gewachsene Straßen: Unterlage, dann nach der Zeit gefärbt (Stufen, damit wenige Pfade genügen)
      const neu = z.segmente.filter(s => s.art === "neu"), T = Math.max(1, z.tMax), stufen = 24;
      ctx.beginPath(); for (const s of neu) { ctx.moveTo(s.a[0], s.a[1]); ctx.lineTo(s.b[0], s.b[1]); }
      ctx.strokeStyle = F.dunkel ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.6)"; ctx.lineWidth = px * 4; ctx.stroke();
      for (let k = 0; k < stufen; k++) {
        ctx.beginPath(); let da = false;
        for (const s of neu) if (Math.min(stufen - 1, Math.floor(s.t / T * stufen)) === k) { ctx.moveTo(s.a[0], s.a[1]); ctx.lineTo(s.b[0], s.b[1]); da = true; }
        if (da) { ctx.strokeStyle = strassenFarbe((k + 0.5) / stufen, F); ctx.lineWidth = px * 2.2; ctx.stroke(); }
      }
      // zuletzt geprüfter Vorschlag (verworfen: gestrichelt)
      const l = z.letzter;
      if (l && !l.ok && !Modell.fertig(z, p)) Karte.linie(ctx, [l.a, l.b], F.gedaempft, px * 1.6, [px * 4, px * 3]);
      ctx.lineCap = "butt";
      Karte.punkt(ctx, z.zentrum, px * 7, F.akzent, F.tinte, px * 1.5);
      Karte.text(ctx, en() ? "Center" : "Zentrum", [z.zentrum[0] + px * 11, z.zentrum[1] - px * 11], F.tinte, px, 12);
    },
    legende: F => [[F.tinte, { de: "Bestandsstraße", en: "Existing street" }], [strassenFarbe(0.05, F), { de: "früh gewachsen", en: "grown early" }],
      [strassenFarbe(0.6, F), { de: "später", en: "later" }], [strassenFarbe(1, F), { de: "zuletzt", en: "last" }],
      [`rgba(${grenzeFarbe(F).slice(0, 3).join(",")},0.5)`, { de: "Wachstumsgrenze", en: "Growth boundary" }], [wasser(F, 0.9),{ de: "Fließlinien", en: "Flow lines" }], [F.akzent, { de: "Zentrum", en: "Center" }]],
    kennzahlen(z, p) {
      const g = z.grenze, abw = Modell.mittlereAbweichung(z);
      return [
        [{ de: "Gewachsene Segmente", en: "Grown segments" }, zahl(z.neu)],
        [{ de: "Verworfene Vorschläge", en: "Rejected proposals" }, zahl(z.abgelehnt)],
        [{ de: "Vorschläge in der Warteschlange", en: "Proposals in queue" }, zahl(Modell.offen(z))],
        [{ de: "Generation (Zeit t)", en: "Generation (time t)" }, zahl(z.tMax)],
        [{ de: "Straßenlänge neu", en: "New street length" }, zahl(z.laengeNeu / 1000, 1) + " km"],
        [{ de: "Segmentlänge (Block / Segmente)", en: "Segment length (block / segments)" }, zahl(z.C.L, 1) + " m"],
        [{ de: "Abweichung von der Fließrichtung", en: "Deviation from flow direction" }, abw === null ? "–" : zahl(abw, 1) + "° " + (en() ? "(0 = along or across, 45 = diagonal)" : "(0 = längs oder quer, 45 = schräg)")],
        [{ de: "Mögliche Fläche (Growth Boundary)", en: "Possible area (growth boundary)" }, km2(g.moeglich)],
        [{ de: "Benötigte Fläche (Einwohner)", en: "Needed area (population)" }, km2(g.benoetigt)],
        [{ de: "Flächenfaktor (> 1: genug Fläche)", en: "Area factor (> 1: enough area)" }, isFinite(g.faktor) ? zahl(g.faktor, 2) : "–"],
        [{ de: "Rasterpunkte", en: "Grid points" }, `${z.K.m} × ${z.K.m} · ${zahl(z.K.d, 1)} m`]
      ];
    }
  });
})();
