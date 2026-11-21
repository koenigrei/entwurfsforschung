/* Spatial Averaging · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, FA = Modell.FASSUNGEN, ROT = "#e5484d", GRUEN = "#2fa84f";   // RChart1 rot, Höchstwert-Zelle clGreen
  const G1 = { de: "Modell", en: "Model" }, G2 = { de: "Darstellung", en: "Display" };
  const zahl = (v, n = 3) => v.toFixed(n).replace(".", ",");
  // ---- Verlaufsdiagramm (wie RChart1 des Originals): auf breiten Bildschirmen rechts neben dem Feld, sonst darunter
  // o: { reihen: [{ werte, farbe, strich? }], ymin, ymax, xmin (Mindestbreite der x-Achse), oben: "Text links oben", rechts: {de, en} }
  function diagramm(ctx, F, x0, y0, w, h, o) {
    const fs = 10 * F.px, l = x0, b = x0 + w, ob = y0 + fs * 1.6, u = y0 + h - fs * 1.4, hh = u - ob;
    const len = Math.max(1, ...o.reihen.map(r => r.werte.length)), X = Math.max(o.xmin || 100, len - 1);
    const sx = t => l + w * t / X, sy = v => u - hh * (Math.max(o.ymin, Math.min(o.ymax, v)) - o.ymin) / (o.ymax - o.ymin || 1);
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, ob); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, ob); ctx.lineTo(b, ob);
    if (o.ymin < 0 && o.ymax > 0) { ctx.moveTo(l, sy(0)); ctx.lineTo(b, sy(0)); }
    ctx.stroke(); ctx.setLineDash([]);
    const schritt = Math.max(1, Math.floor(len / Math.max(50, w / F.px)));   // lange Verläufe ausdünnen
    for (const r of o.reihen) {
      ctx.strokeStyle = r.farbe; ctx.lineWidth = 1.5 * F.px; ctx.setLineDash(r.strich ? [3 * F.px, 2 * F.px] : []); ctx.beginPath();
      for (let t = 0; t < r.werte.length; t += schritt) { const x = sx(t), y = sy(r.werte[t]); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      if (r.werte.length > 1) ctx.lineTo(sx(r.werte.length - 1), sy(r.werte[r.werte.length - 1]));
      ctx.stroke(); ctx.setLineDash([]);
    }
    const en = document.documentElement.lang === "en";
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText(o.oben, l + 3 * F.px, ob - 4 * F.px);
    ctx.fillText(o.unten != null ? o.unten : "0", l + 3 * F.px, u + fs * 1.15);
    ctx.textAlign = "right"; ctx.fillText(String(X), b, u + fs * 1.15);
    if (o.rechts) ctx.fillText(en ? o.rechts.en : o.rechts.de, b, ob - 4 * F.px);
    ctx.restore();
  }
  const UNTEN = 0.32, RECHTS = 0.75, LUECKE = 0.05;           // Anteile der Feldbreite
  const quer = () => window.innerWidth > 900;
  const flaeche = (z, p) => !p.verlauf ? { b: z.breite, h: z.hoehe } : quer() ? { b: z.breite * (1 + LUECKE + RECHTS), h: z.hoehe } : { b: z.breite, h: z.hoehe * (1 + UNTEN) };
  function zeichneVerlauf(ctx, z, F, o) {
    if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, F, z.breite * (1 + LUECKE), 0, z.breite * RECHTS, z.hoehe, o);
    else diagramm(ctx, F, 0, z.hoehe, z.breite, z.hoehe * UNTEN, o);
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 50, wert: 1 },
    parameter: [
      { id: "fassung", gruppe: G1, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true, groesseNeu: true,
        optionen: [{ wert: "mittelung", name: { de: "21 Spatial Averaging", en: "21 spatial averaging" } },
                   { wert: "rauschen", name: { de: "21 mit weißem Rauschen", en: "21 with white noise" } },
                   { wert: "vicsek", name: { de: "22 Vicsek-Szalay", en: "22 Vicsek–Szalay" } }],
        folgen: { mittelung: { rauschen: false, anzeige: "werte" }, rauschen: { rauschen: true, anzeige: "werte" }, vicsek: { rauschen: true, anzeige: "entwickelt" } } },
      { id: "rauschen", gruppe: G1, name: { de: "weißes Rauschen ε = ±1", en: "white noise ε = ±1" }, art: "schalter", wert: S.rauschen },
      { id: "schwelle", gruppe: G1, name: { de: "Schwellenwert", en: "Threshold" }, min: 0.5, max: 10, schritt: 0.1, wert: S.schwelle },
      { id: "anzeige", gruppe: G2, name: { de: "Anzeige", en: "Show" }, art: "auswahl", wert: S.anzeige,
        optionen: [{ wert: "werte", name: { de: "Zellenwerte (grau)", en: "Cell values (grey)" } }, { wert: "entwickelt", name: { de: "entwickelte Zellen", en: "Developed cells" } }] },
      { id: "verlauf", gruppe: G2, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf, groesseNeu: true }
    ],
    groesse: flaeche,
    ende: (z, p) => z.leer && !p.rauschen,
    zeichne(ctx, z, p, F) {
      const n = z.n, w = z.wert, a = F.rgb.flaeche, b = F.rgb.tinte, gr = Sim.rgb(GRUEN);
      const max = z.verlauf[z.verlauf.length - 1], werte = p.anzeige !== "entwickelt";
      Sim.raster(ctx, n, n, d => {
        for (let i = 0; i < w.length; i++) {
          const c = !werte ? (z.entwickelt[i] ? b : a)
                  : !p.rauschen && z.t > 0 && i === z.maxIndex ? gr : Sim.mische(a, b, Modell.grau(w[i], max) / 255);
          d[4 * i] = c[0]; d[4 * i + 1] = c[1]; d[4 * i + 2] = c[2]; d[4 * i + 3] = 255;
        }
      }, 0, 0, z.breite, z.hoehe);
      if (p.verlauf) {
        let g = 0; for (let t = 0; t < z.hoch.length; t++) g = Math.max(g, z.hoch[t], -z.tief[t]);
        g = g > 1 ? Math.ceil(g) : g > 0 ? Math.ceil(g * 10) / 10 : 1;
        zeichneVerlauf(ctx, z, F, { reihen: [{ werte: z.tief, farbe: F.tinte2, strich: true }, { werte: z.hoch, farbe: ROT }], ymin: -g, ymax: g, xmin: 100,
          oben: "+" + String(g).replace(".", ","), unten: "−" + String(g).replace(".", ","), rechts: { de: "rot: Maximalwert · gestrichelt: Minimalwert", en: "red: maximum · dashed: minimum" } });
      }
    },
    legende(F, p) {
      const L = p.anzeige === "entwickelt" ? [[F.tinte, { de: "entwickelt", en: "developed" }], [F.flaeche, { de: "nicht entwickelt", en: "undeveloped" }]]
                                          : [[F.tinte, { de: "P > 0", en: "P > 0" }], [F.flaeche, { de: "P < 0", en: "P < 0" }]];
      if (p.anzeige !== "entwickelt" && !p.rauschen) L.push([GRUEN, { de: "Höchstwert", en: "maximum" }]);
      if (p.verlauf) L.push([ROT, { de: "Maximalwert (Verlauf)", en: "maximum (chart)" }], [F.tinte2, { de: "Minimalwert (Verlauf)", en: "minimum (chart)" }]);
      return L;
    },
    kennzahlen(z) {
      const a = Modell.auswertung(z);
      return [[{ de: "Feld", en: "Field" }, `${z.n} × ${z.n}`], [{ de: "Maximalwert (maxP)", en: "Maximum value (maxP)" }, zahl(a.max)], [{ de: "größter · kleinster Wert", en: "largest · smallest value" }, zahl(a.hoch, 2) + " · " + zahl(a.tief, 2)],
              [{ de: "Mittelwert", en: "Mean" }, zahl(a.mittel)], [{ de: "Standardabweichung", en: "Standard deviation" }, zahl(a.streuung)],
              [{ de: "entwickelt", en: "developed" }, (100 * a.entwickelt).toFixed(1).replace(".", ",") + " %"]];
    }
  });
})();
