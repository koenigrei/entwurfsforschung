/* Schneeflocken-Wachstum · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, N = Modell.S, ROT = "#e5484d";   // RChart1: DataColor clRed
  const G1 = { de: "Potential", en: "Potential" }, G2 = { de: "Darstellung", en: "Display" };
  // Diagramm wie RChart1 „number of developed cells“: breit rechts neben dem Feld (wie im Fenster des Originals), schmal darunter
  const RECHTS = 62, UNTEN = 36, LUECKE = 3;
  const quer = () => window.innerWidth > 900;
  const zahl = v => v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { maximumFractionDigits: 2 });

  /** Linienzug über der Zeit: werte[t], x bis xMax, y bis yMax; Achsen in F.linie, Beschriftung in Geist Mono */
  function diagramm(ctx, F, x0, y0, w, h, werte, xMax, yMax, farbe, titel) {
    const fs = 10 * F.px, l = x0 + 1, b = x0 + w - 1, o = y0 + fs * 2.2, u = y0 + h - fs * 1.8, hh = u - o;
    const sx = t => l + (b - l) * t / xMax, sy = v => u - hh * Math.min(1, v / yMax);
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.strokeStyle = farbe; ctx.lineWidth = 1.5 * F.px; ctx.beginPath();
    const schritt = Math.max(1, Math.floor(werte.length / 600));
    for (let t = 0; t < werte.length; t += schritt) { const x = sx(t), y = sy(werte[t]); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText(String(yMax), l + 1, o - fs * 0.5);
    ctx.fillText("0", l + 1, u + fs * 1.3);
    ctx.textAlign = "right"; ctx.fillText(String(xMax), b, u + fs * 1.3);
    ctx.fillText(titel[document.documentElement.lang === "en" ? "en" : "de"], b, o - fs * 0.5);
    ctx.restore();
  }
  /** Grauwert des Originals (weißer Kristall auf dunklem Grund) → Farbe: weiß = Tinte, schwarz = Fläche.
      Dunkel wie im Original, hell umgekehrt (dunkler Kristall auf hellem Grund). */
  const tabelle = F => Array.from({ length: 256 }, (_, g) => Sim.mische(F.rgb.flaeche, F.rgb.tinte, g / 255));

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 50, wert: 3 },
    parameter: [
      { id: "beta", gruppe: G1, name: { de: "beta (Grundpotential β)", en: "beta (background potential β)" }, min: 0, max: 1, schritt: 0.01, wert: S.beta, neustart: true },
      { id: "gamma", gruppe: G1, name: { de: "gamma (Zuwachs γ)", en: "gamma (addition γ)" }, min: 0, max: 0.02, schritt: 0.0001, wert: S.gamma },
      { id: "gewichte", gruppe: G1, name: { de: "Gewichte w_k", en: "Weights w_k" }, art: "auswahl", wert: S.gewichte,
        optionen: [{ wert: "programm", name: { de: "wie Programm: diagonal 1/6", en: "as programmed: diagonal 1/6" } },
                   { wert: "beschreibung", name: { de: "wie Beschreibung: orthogonal 1/6", en: "as described: orthogonal 1/6" } }] },
      { id: "verlauf", gruppe: G2, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf, groesseNeu: true }
    ],
    groesse: (z, p) => !p.verlauf ? { b: N, h: N } : quer() ? { b: N + LUECKE + RECHTS, h: N } : { b: N, h: N + UNTEN },
    ende: z => z.t === Modell.HALT,                              // If steps = 500 Then Timer1.enabled := false
    zeichne(ctx, z, p, F) {
      const T = tabelle(F);
      Sim.raster(ctx, N, N, d => {
        for (let n = 0; n < N * N; n++) { const c = T[Modell.grau(z, n)]; d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255; }
      });
      if (!p.verlauf) return;
      const xMax = Math.max(Modell.HALT, z.t), yMax = Math.max(600, Math.ceil(z.anzahl / 500) * 500);
      const titel = { de: "number of developed cells", en: "number of developed cells" };
      if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, F, N + LUECKE, 0, RECHTS, N, z.verlauf, xMax, yMax, ROT, titel);
      else diagramm(ctx, F, 0, N + 1, N, UNTEN - 1, z.verlauf, xMax, yMax, ROT, titel);
    },
    legende(F, p) {
      const T = tabelle(F);
      const L = [[Sim.css(T[230]), { de: "entwickelt", en: "developed" }], [Sim.css(T[125]), { de: "Potential 1", en: "potential 1" }],
                 [Sim.css(T[Math.round(125 * p.beta)]), { de: "Grundpotential beta", en: "background beta" }]];
      if (p.verlauf) L.push([ROT, { de: "Zellen", en: "cells" }]);
      return L;
    },
    kennzahlen(z) {
      const a = Modell.auswertung(z);
      return [[{ de: "Timesteps", en: "Timesteps" }, String(z.t)],
              [{ de: "entwickelte Zellen", en: "developed cells" }, String(z.anzahl)],
              [{ de: "Arm diagonal (Zellen)", en: "diagonal arm (cells)" }, String(a.diagonale)],
              [{ de: "Arm längs der Achse (Zellen)", en: "arm along the axis (cells)" }, String(a.achse)],
              [{ de: "Symmetrie", en: "symmetry" }, zahl(100 * a.symmetrie) + " %"]];
    }
  });
})();
