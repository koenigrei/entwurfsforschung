/* Parzellen mit eigenem Kantenversatz · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });
  const PLOT = F => F.dunkel ? "#8c8c94" : "#b4b4bb";           // Plots grau wie im Katalogbild
  const HINTERGRUND = F => F.dunkel ? "#1d1d22" : "#e6e6ea";

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "umwandeln", gruppe: { de: "Wege (Network to Segments, Network Smooth)", en: "Paths (Network to Segments, Network Smooth)" }, art: "schalter",
        name: { de: "Kurven umwandeln (ConvertCurves)", en: "Convert curves" }, wert: S.umwandeln },
      { id: "winkel", name: { de: "Umwandlungswinkel (ConversionAngle) rad", en: "Conversion angle (rad)" }, min: 0, max: 1, schritt: 0.001, wert: S.winkel },
      { id: "fang", name: { de: "Fangabstand (Snap threshold) m", en: "Snap threshold (m)" }, min: 0, max: 100, schritt: 1, wert: S.fang },
      { id: "versatzMin", gruppe: { de: "Versatz (Remap → Custom offset)", en: "Offset (remap → custom offset)" }, name: { de: "Kleinster Versatz (Offset Min) m", en: "Offset min (m)" }, min: 0, max: 100, schritt: 1, wert: S.versatzMin },
      { id: "versatzMax", name: { de: "Größter Versatz (Offset Max) m", en: "Offset max (m)" }, min: 0, max: 100, schritt: 1, wert: S.versatzMax },
      { id: "staerke", gruppe: { de: "Darstellung", en: "Display" }, name: { de: "Linienstärke Wege (Thickness)", en: "Path line weight (thickness)" }, min: 0, max: 10, schritt: 0.5, wert: S.staerke },
      { id: "original", art: "schalter", name: { de: "Plots vor dem Versatz zeigen", en: "Show plots before offset" }, wert: S.original },
      { id: "gebaeude", art: "schalter", name: { de: "Gebäude und andere Straßen", en: "Buildings and other streets" }, wert: S.gebaeude }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste, phase) { if (phase === "unten") { const i = Modell.plotBei(z, [x, y]); z.wahl = i === z.wahl ? -1 : i; } },
    aktionen: [
      { name: { de: "Alle", en: "All" }, tue: (z, p) => Modell.rechneAlles(z, p) },
      { name: { de: "Leeren", en: "Clear" }, tue: z => Modell.leere(z) }
    ],
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px;
      if (p.gebaeude) {
        const c = HINTERGRUND(F);
        for (const g of z.S.stadt.gebaeude) Karte.poly(ctx, g, c, null);
        Karte.segmente(ctx, z.S.stadt.strassen, F.dunkel ? "#3a3a42" : "#c4c4ca", px * 1);
      }
      // Plots: vor dem Versatz zart, nach dem Versatz grau gefüllt
      z.plots.forEach((P, i) => {
        if (i < z.k) { if (z.erg[i]) Karte.poly(ctx, z.erg[i], PLOT(F), F.dunkel ? "#b9b9c0" : "#6f6f78", px * 0.8); }
        else if (p.original) Karte.poly(ctx, P.poly, F.dunkel ? "rgba(140,140,150,0.16)" : "rgba(120,120,130,0.12)", null);
      });
      // Wege (Paths): Farbe nach log(Betweenness), wie Gradient → Custom Preview Lineweights
      const N = z.N; ctx.lineCap = "round";
      const ord = [...N.kanten.keys()].sort((a, b) => z.farbwert[a] - z.farbwert[b]);
      const lw = px * Math.max(0.6, p.staerke);
      if (!F.dunkel) for (const k of ord) { const e = N.kanten[k]; Karte.linie(ctx, [N.knoten[e.a], N.knoten[e.b]], "rgba(40,40,48,0.75)", lw + px * 1.6); }   // Kontur in Hell
      for (const k of ord) {
        const e = N.kanten[k];
        Karte.linie(ctx, [N.knoten[e.a], N.knoten[e.b]], Karte.farbe(z.farbwert[k], "spektral"), lw);
      }
      // gerade bearbeiteter und gewählter Plot
      const markiere = (i, farbe, lw) => { if (i >= 0 && z.plots[i]) Karte.poly(ctx, z.plots[i].poly, null, farbe, px * lw); };
      if (z.k > 0 && !Modell.fertig(z)) markiere(z.k - 1, F.tinte, 2.2);
      if (z.wahl >= 0) {
        markiere(z.wahl, F.akzent, 2.6);
        const P = z.plots[z.wahl], w = z.werte[z.wahl] || Modell.plotWerte(z, p, P);
        P.poly.forEach((q, j) => {
          const r = P.poly[(j + 1) % P.poly.length], m = Geo.lerp(q, r, 0.5), d = Geo.norm(Geo.sub(r, q)), o = [d[1], -d[0]];
          const t = Geo.add(m, Geo.mul(o, -w[j] / 2));
          Karte.text(ctx, zahl(Math.abs(w[j]), 1), t, F.tinte, px, 10, "center");
        });
      }
      if (z.t === 0) {
        const lang = de() ? "Start versetzt einen Plot je Schritt · Klick auf einen Plot zeigt die Kantenwerte" : "Start offsets one plot per step · click a plot to show its edge values";
        const kurz = de() ? "Start: ein Plot je Schritt" : "Start: one plot per step";
        Karte.text(ctx, lang.length * 7.4 < z.b / px - 24 ? lang : kurz, [z.b / 2, z.h - 14 * px], F.tinte2, px, 12, "center");
      }
    },
    legende: F => Karte.skalenLegende("spektral", { de: "Betweenness gering (log)", en: "low betweenness (log)" }, { de: "hoch", en: "high" })
      .concat([[PLOT(F), { de: "Plot mit Versatz", en: "Plot with offset" }]]),
    kennzahlen(z, p) {
      const b = Modell.bilanz(z), [lo, hi] = Modell.zielbereich(p), ha = v => zahl(v / 1e4, 2) + " ha";
      const k = [
        [{ de: "Wegesegmente", en: "Path segments" }, zahl(z.N.kanten.length)],
        [{ de: "Plots versetzt", en: "Plots offset" }, zahl(b.fertig) + " / " + zahl(b.plots)],
        [{ de: "Versatz je Kante (nach innen)", en: "Offset per edge (inwards)" }, zahl(lo) + " … " + zahl(hi) + " m"],
        [{ de: "Fläche vorher → nachher", en: "Area before → after" }, ha(b.vor) + " → " + ha(b.nach)],
        [{ de: "Anteil Straßenraum (zusätzlich)", en: "Share of street space (added)" }, b.vor > 0 ? zahl(100 * (b.vor - b.nach) / b.vor) + " %" : "–"],
        [{ de: "Plots verschwunden", en: "Plots vanished" }, zahl(b.weg)]
      ];
      if (z.wahl >= 0 && z.plots[z.wahl]) {
        const P = z.plots[z.wahl], w = Modell.plotWerte(z, p, P), e = z.wahl < z.k ? z.erg[z.wahl] : null;
        k.push([{ de: "▸ Plot: Kanten", en: "▸ Plot: edges" }, zahl(P.poly.length)]);
        k.push([{ de: "▸ Versatz min … max", en: "▸ Offset min … max" }, zahl(Math.min(...w.map(Math.abs)), 1) + " … " + zahl(Math.max(...w.map(Math.abs)), 1) + " m"]);
        k.push([{ de: "▸ Fläche", en: "▸ Area" }, zahl(Geo.flaeche(P.poly)) + " m² → " + (z.wahl < z.k ? (e ? zahl(Geo.flaeche(e)) + " m²" : "0") : "–")]);
      }
      return k;
    }
  });
})();
