/* Diffusion Connect Model · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, N = Modell.N;
  const G1 = { de: "Modell", en: "Model" }, G2 = { de: "Darstellung", en: "Display" };
  // Farben wie im Original: Zellen RGB(0, colr, 0) – schwarz, entwickelt hellgrün –, Agenten clRed (agenten.pas), Diagramm clRed
  const ROT = "#ff0000";
  const gruen = F => F.dunkel ? [0, 255, 0] : [0, 150, 40];
  const boden = F => F.dunkel ? [0, 0, 0] : F.rgb.flaeche;
  // Diagramm wie RChart1 „freie Agenten“: auf breiten Bildschirmen rechts neben dem Feld, sonst darunter (in Zellen)
  const UNTEN = 40, RECHTS = 70, LUECKE = 5;
  const quer = () => window.innerWidth > 900;

  function diagramm(ctx, z, p, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, b = x0 + w, o = y0 + fs * 1.8, u = y0 + h - fs * 1.6, hh = u - o;
    const X = Math.max(1000, z.t), Y = z.n + 50;               // x bis 1000 Schritte wie RChart1, y bis Anzahl + 50
    const sx = t => l + w * t / X, sy = v => u - hh * v / Y;
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.strokeStyle = ROT; ctx.lineWidth = 1.5 * F.px; ctx.beginPath();
    const schrittweite = Math.max(1, Math.floor(z.verlauf.length / 1500));
    for (let t = 0; t < z.verlauf.length; t += schrittweite) { const xx = sx(t), yy = sy(z.verlauf[t]); t ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.stroke();
    const en = document.documentElement.lang === "en";
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText(String(Y), l + 3 * F.px, o - 5 * F.px);
    ctx.fillText("0", l + 3 * F.px, u + fs * 1.2);
    ctx.textAlign = "right"; ctx.fillText(String(X), b, u + fs * 1.2);
    ctx.fillText(en ? "free agents" : "freie Agenten", b, o - 5 * F.px);
    ctx.restore();
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 50, wert: 2 },
    parameter: [
      { id: "schwelle", gruppe: G1, name: { de: "Schwellenwert für Anlagerung", en: "Threshold for attachment" }, min: 0, max: 20, wert: S.schwelle },
      { id: "anzahl", gruppe: G1, name: { de: "Anzahl Agenten für Setup", en: "Number of agents for setup" }, min: 100, max: 6000, schritt: 100, wert: S.anzahl, neustart: true },
      { id: "korrigiert", gruppe: G1, name: { de: "Richtung in Grad (korrigiert)", en: "Heading in degrees (corrected)" }, art: "schalter", wert: S.korrigiert, neustart: true },
      { id: "agenten", gruppe: G2, name: { de: "Agenten zeigen", en: "Show agents" }, art: "schalter", wert: S.agenten },
      { id: "verlauf", gruppe: G2, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf, groesseNeu: true }
    ],
    groesse: (z, p) => !p.verlauf ? { b: N, h: N } : quer() ? { b: N + LUECKE + RECHTS, h: N } : { b: N, h: N + UNTEN },
    ende: z => z.anzahlFrei === 0,                              // Timer1.enabled := false, wenn alle Agenten angelagert sind
    zeichne(ctx, z, p, F) {
      const a = boden(F), g = gruen(F);
      Sim.raster(ctx, N, N, d => {
        for (let c = 0; c < N * N; c++) { const f = z.entw[c] ? g : a; d[4 * c] = f[0]; d[4 * c + 1] = f[1]; d[4 * c + 2] = f[2]; d[4 * c + 3] = 255; }
      });
      if (p.agenten) {                                          // AgSize 1: Ellipse 2 × 2 px in der 3-px-Zelle
        ctx.fillStyle = ROT; ctx.beginPath();
        for (let i = 0; i < z.n; i++) ctx.rect(z.x[i] + 1 / 6, z.y[i] + 1 / 6, 2 / 3, 2 / 3);
        ctx.fill();
      }
      ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.strokeRect(0, 0, N, N);
      if (p.verlauf) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, p, F, N + LUECKE, 0, RECHTS, N);
        else diagramm(ctx, z, p, F, 0, N + 4, N, UNTEN - 4);
      }
    },
    legende: (F, p) => {
      const L = [[Sim.css(gruen(F)), { de: "entwickelte Zelle", en: "developed cell" }], [Sim.css(boden(F)), { de: "unentwickelt", en: "undeveloped" }]];
      if (p.agenten) L.push([ROT, { de: "Agent", en: "agent" }]);
      return L;
    },
    kennzahlen(z) {
      const [zahl, groesst] = Modell.cluster(z), e = Modell.entwickelt(z);
      return [
        [{ de: "freie Agenten", en: "free agents" }, String(z.anzahlFrei)],
        [{ de: "angelagert", en: "attached" }, String(z.n - z.anzahlFrei)],
        [{ de: "entwickelte Zellen", en: "developed cells" }, `${e} · ${(100 * e / (N * N)).toFixed(1).replace(".", ",")} %`],
        [{ de: "Cluster", en: "clusters" }, String(zahl)],
        [{ de: "größter Cluster (Zellen)", en: "largest cluster (cells)" }, String(groesst)],
        [{ de: "alle angelagert nach Schritt", en: "all attached after step" }, z.fertig != null ? String(z.fertig) : "–"]
      ];
    }
  });
})();
