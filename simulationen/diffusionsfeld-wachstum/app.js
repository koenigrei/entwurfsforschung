/* Wachstum im Diffusionsfeld · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, N = Modell.S, ROT = "#e5484d";   // RChart1: DataColor clRed
  const G1 = { de: "Wachstum", en: "Growth" }, G2 = { de: "Altern", en: "Aging" }, G3 = { de: "Darstellung", en: "Display" };
  // Diagramm wie RChart1 „number of developed cells“: breit rechts neben dem Feld (wie im Fenster des Originals), schmal darunter
  const RECHTS = 62, UNTEN = 36, LUECKE = 3;
  const quer = () => window.innerWidth > 900;
  const zahl = v => v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { maximumFractionDigits: 2 });

  /** Grauwert des Originals (0…255) → Farbe. Hell wie im Original: schwarzer Cluster, Feld von dunkelgrau (P = 0) bis weiß (P = 1).
      Dunkel: weißer Cluster (ältere Zellen gedämpft), Feld von schwarz (P = 0) bis mittelgrau (P = 1) – so bleibt der Kontrast. */
  function tabellen(F) {
    const zelle = [], feld = [], ti = F.rgb.tinte, fl = F.rgb.flaeche;
    for (let g = 0; g < 256; g++) {
      if (!F.dunkel) { zelle.push(Sim.mische(ti, fl, g / 255)); feld.push(Sim.mische(ti, fl, g / 255)); continue; }
      zelle.push(Sim.mische(ti, fl, 0.7 * g / 255));
      feld.push(Sim.mische(fl, ti, Math.max(0, 0.6 * (g - 85) / 170)));
    }
    return { zelle, feld };
  }

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

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 50, wert: 5 },
    parameter: [
      { id: "R", gruppe: G1, name: { de: "Sphere of Influence R (Zellen)", en: "Sphere of influence R (cells)" }, min: 1, max: 60, wert: S.R },
      { id: "noise", gruppe: G1, name: { de: "Noise", en: "Noise" }, min: 0, max: 50, schritt: 0.1, wert: S.noise },
      { id: "aging", gruppe: G2, name: { de: "activate aging", en: "activate aging" }, art: "schalter", wert: S.aging },
      { id: "death", gruppe: G2, name: { de: "Die with age (Schritte)", en: "Die with age (steps)" }, min: 10, max: 1000, schritt: 10, wert: S.death },
      { id: "verlauf", gruppe: G3, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf, groesseNeu: true }
    ],
    groesse: (z, p) => !p.verlauf ? { b: N, h: N } : quer() ? { b: N + LUECKE + RECHTS, h: N } : { b: N, h: N + UNTEN },
    // Halt wie im Original bei Schritt = „die with age“ (dort Abbruchbedingung); mit aging läuft es weiter, damit das Altern wirkt
    ende: (z, p) => !p.aging && z.t === p.death,
    zeichne(ctx, z, p, F) {
      const T = tabellen(F);
      Sim.raster(ctx, N, N, d => {
        for (let n = 0; n < N * N; n++) {
          const c = (z.state[n] ? T.zelle : T.feld)[Modell.grau(z, n)];
          d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255;
        }
      });
      if (!p.verlauf) return;
      const xMax = Math.max(p.death, z.t), yMax = Math.max(600, ...z.verlauf.slice(-1));
      const titel = { de: "number of developed cells", en: "number of developed cells" };
      if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, F, N + LUECKE, 0, RECHTS, N, z.verlauf, xMax, yMax, ROT, titel);
      else diagramm(ctx, F, 0, N + 1, N, UNTEN - 1, z.verlauf, xMax, yMax, ROT, titel);
    },
    legende(F, p) {
      const T = tabellen(F);
      const L = [[F.tinte, { de: "entwickelt", en: "developed" }], [Sim.css(T.feld[85]), { de: "Potential 0", en: "potential 0" }],
                 [Sim.css(T.feld[255]), { de: "Potential 1", en: "potential 1" }]];
      if (p.verlauf) L.push([ROT, { de: "Zellen", en: "cells" }]);
      return L;
    },
    kennzahlen(z, p) {
      const a = Modell.auswertung(z);
      return [[{ de: "Timesteps", en: "Timesteps" }, String(z.t)],
              [{ de: "entwickelte Zellen", en: "developed cells" }, String(z.anzahl)],
              [{ de: "Clusterradius (Zellen)", en: "cluster radius (cells)" }, zahl(a.radius)],
              [{ de: "Rand der Sphere of Influence", en: "edge of sphere of influence" }, zahl(a.radius + p.R)],
              [{ de: "Dichte (Zellen / Kreisfläche)", en: "density (cells / disc area)" }, zahl(a.dichte)]];
    }
  });
})();
