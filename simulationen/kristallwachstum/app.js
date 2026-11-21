/* Kristallwachstum · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, N = Modell.S;
  const gruen = F => F.dunkel ? "#4cc764" : "#2b8a3e";       // RChart1: DataColor clGreen (Layer 3), im Dunkeln heller
  const G1 = { de: "Kristallisation", en: "Crystallisation" }, G2 = { de: "Diffusion (beim Setup gelesen)", en: "Diffusion (read at setup)" },
        G3 = { de: "Setup und Altern", en: "Setup and aging" }, G4 = { de: "Darstellung", en: "Display" };
  // Diagramm wie RChart1 (entwickelte Zellen): breit rechts neben dem Feld (wie im Fenster des Originals), schmal darunter
  const RECHTS = 62, UNTEN = 36, LUECKE = 3;
  const quer = () => window.innerWidth > 900;
  const zahl = (v, n = 2) => v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });

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
  /** Grauwert des Originals (weißer Kristall auf schwarzem Grund) → Farbe: weiß = Tinte, schwarz = Fläche.
      Dunkel wie im Original, hell umgekehrt (dunkler Kristall auf hellem Grund). */
  /** Legende: das Potential, das mit „pot. multi.“ als mittleres Grau erscheint (über 255 beginnt die Skala wieder bei schwarz) */
  const halb = p => { const v = p.multi > 0 ? 0.5 / p.multi : 0, f = l => v.toLocaleString(l, { maximumFractionDigits: 3 });
    return { de: "Potential " + f("de"), en: "potential " + f("en") }; };
  const tabelle = F => Array.from({ length: 256 }, (_, g) => Sim.mische(F.rgb.flaeche, F.rgb.tinte, g / 255));

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 50, wert: 3 },
    parameter: [
      { id: "U", gruppe: G1, name: { de: "undercooling threshold U", en: "undercooling threshold U" }, min: 0, max: 0.3, schritt: 0.001, wert: S.U },
      { id: "theta", gruppe: G1, name: { de: "interface size θ", en: "interface size θ" }, min: 0, max: 0.1, schritt: 0.001, wert: S.theta },
      { id: "delta", gruppe: G1, name: { de: "noise amplitude δ", en: "noise amplitude δ" }, min: 0, max: 1, schritt: 0.01, wert: S.delta },
      { id: "T", gruppe: G2, name: { de: "iteration steps T", en: "iteration steps T" }, min: 2, max: 20, wert: S.T, neustart: true },
      { id: "xi", gruppe: G2, name: { de: "diffusion const. ξ", en: "diffusion const. ξ" }, min: 0, max: 1.5, schritt: 0.05, wert: S.xi, neustart: true },
      { id: "zeta", gruppe: G2, name: { de: "interface const. ς", en: "interface const. ς" }, min: 0, max: 3, schritt: 0.05, wert: S.zeta, neustart: true },
      { id: "zufallsSaat", gruppe: G3, name: { de: "random seed (vier Saaten)", en: "random seed (four seeds)" }, art: "schalter", wert: S.zufallsSaat, neustart: true },
      { id: "aging", gruppe: G3, name: { de: "activate aging", en: "activate aging" }, art: "schalter", wert: S.aging },
      { id: "death", gruppe: G3, name: { de: "die at age (Schritte)", en: "die at age (steps)" }, min: 10, max: 999, wert: S.death },
      { id: "multi", gruppe: G4, name: { de: "pot. multi.", en: "pot. multi." }, min: 0, max: 20, schritt: 0.1, wert: S.multi },
      { id: "nurFeld", gruppe: G4, name: { de: "just the field", en: "just the field" }, art: "schalter", wert: S.nurFeld },
      { id: "verlauf", gruppe: G4, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf, groesseNeu: true }
    ],
    groesse: (z, p) => !p.verlauf ? { b: N, h: N } : quer() ? { b: N + LUECKE + RECHTS, h: N } : { b: N, h: N + UNTEN },
    ende: z => z.t === Modell.HALT,
    zeichne(ctx, z, p, F) {
      const T = tabelle(F);
      Sim.raster(ctx, N, N, d => {
        for (let n = 0; n < N * N; n++) { const c = T[Modell.grau(z, n, p)]; d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255; }
      });
      if (!p.verlauf) return;
      const xMax = Math.max(Modell.HALT, z.t), yMax = Math.max(3000, Math.ceil(z.anzahl / 1000) * 1000);
      const titel = { de: "entwickelte Zellen", en: "developed cells" };
      if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, F, N + LUECKE, 0, RECHTS, N, z.verlauf, xMax, yMax, gruen(F), titel);
      else diagramm(ctx, F, 0, N + 1, N, UNTEN - 1, z.verlauf, xMax, yMax, gruen(F), titel);
    },
    legende(F, p) {
      const T = tabelle(F);
      const L = [[F.tinte, { de: "Kristall", en: "crystal" }], [Sim.css(T[128]), halb(p)], [F.flaeche, { de: "Potential 0", en: "potential 0" }]];
      if (p.verlauf) L.push([gruen(F), { de: "Zellen", en: "cells" }]);
      return L;
    },
    kennzahlen(z) {
      const s = Modell.gesamtpotential(z);
      return [[{ de: "Timesteps", en: "Timesteps" }, String(z.t)],
              [{ de: "entwickelte Zellen", en: "developed cells" }, String(z.anzahl)],
              [{ de: "entire potential", en: "entire potential" }, zahl(s, 1)],
              [{ de: "mittleres Potential", en: "mean potential" }, zahl(s / (N * N), 3)]];
    }
  });
})();
