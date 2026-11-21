/* Krugmans Modell · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, N = Modell.N;
  const POT = { de: "Potentiale", en: "Potentials" };
  const FELD = 404, LUECKE = 24, UNTEN = 280;                                  // ZeichenPanel 404 × 404; Diagramm daneben (breit) oder darunter (schmal)
  const YLO = -30, YHI = 5;                                       // Achse des Originals: RangeLow −30, RangeHigh 5
  const quer = () => window.innerWidth > 900;
  const en = () => document.documentElement.lang === "en";
  const zahl = (v, n) => v.toLocaleString(en() ? "en" : "de", { maximumFractionDigits: n, minimumFractionDigits: n });

  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 11 * F.px, l = x0 + 3.2 * fs, r = x0 + w - 4, o = y0 + 1.8 * fs, u = y0 + h - 2.4 * fs;
    const sx = i => l + (r - l) * i / N, sy = v => u - (u - o) * (Math.min(YHI, Math.max(YLO, v)) - YLO) / (YHI - YLO);
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.beginPath();
    ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(r, u); ctx.stroke();
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let v = YLO; v <= YHI; v += 5) { ctx.fillText(String(v), l - 5 * F.px, sy(v)); ctx.beginPath(); ctx.moveTo(l - 3 * F.px, sy(v)); ctx.lineTo(l, sy(v)); ctx.stroke(); }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let i = 0; i <= N; i += 4) ctx.fillText(String(i), sx(i), u + 5 * F.px);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(en() ? "y = log(100 · population)" : "y = log(100 · Bevölkerung)", l, o - 0.7 * fs);
    ctx.textAlign = "right"; ctx.fillText(en() ? "x = place no." : "x = Nr. des Ortes", r, u + 2.2 * fs);
    // Profil wie RChart1: MoveTo(0, Ort 24), DrawTo(M + 1, Ort M) – der letzte Ort steht also auch bei x = 0
    const kurve = P => { ctx.beginPath(); ctx.moveTo(sx(0), sy(Math.log10(100 * P[N - 1]))); for (let m = 0; m < N; m++) ctx.lineTo(sx(m + 1), sy(Math.log10(100 * P[m]))); ctx.stroke(); };
    ctx.save(); ctx.beginPath(); ctx.rect(l, o, r - l, u - o); ctx.clip();
    ctx.strokeStyle = F.tinte2; ctx.globalAlpha = 0.45; ctx.lineWidth = F.px;
    z.kurven.forEach(kurve);                                      // alle 1000 Schritte ein Profil, wie im Original übereinander
    ctx.globalAlpha = 1; ctx.strokeStyle = F.akzentText; ctx.lineWidth = 2 * F.px;
    kurve(z.P);                                                   // neu: das aktuelle Profil
    ctx.restore(); ctx.restore();
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 500, wert: 20 },
    parameter: [
      { id: "k1", gruppe: POT, name: { de: "Größenparameter K1 (zentripetal)", en: "Size parameter K1 (centripetal)" }, min: 0, max: 2, schritt: 0.01, wert: S.k1 },
      { id: "k2", gruppe: POT, name: { de: "Größenparameter K2 (zentrifugal)", en: "Size parameter K2 (centrifugal)" }, min: 0, max: 2, schritt: 0.01, wert: S.k2 },
      { id: "alpha", gruppe: POT, name: { de: "Skalierungsparameter α", en: "Scaling parameter α" }, min: 0, max: 2, schritt: 0.01, wert: S.alpha },
      { id: "beta", gruppe: POT, name: { de: "Skalierungsparameter β", en: "Scaling parameter β" }, min: 0, max: 1, schritt: 0.01, wert: S.beta },
      { id: "wachstum", gruppe: POT, name: { de: "Wachstumsrate", en: "Growth rate" }, min: 0.5, max: 4, schritt: 0.1, wert: S.wachstum }
    ],
    groesse: () => quer() ? { b: 2 * FELD + LUECKE, h: FELD } : { b: FELD, h: FELD + LUECKE + UNTEN },
    zeichne(ctx, z, p, F) {
      let max = 0; for (let i = 0; i < N; i++) if (z.P[i] > max) max = z.P[i];
      const k = max > 0 ? Math.round(255 / max) : 0;            // colr := round(Popul · round(255 / maxP)) wie im Original
      const fs = 11 * F.px;
      ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.beginPath(); ctx.arc(Modell.MITTE, Modell.MITTE, Modell.RADIUS, 0, 2 * Math.PI); ctx.stroke();
      Modell.ORTE.forEach((o, i) => {
        const g = Math.min(255, Math.round(z.P[i] * k)) / 255;
        ctx.fillStyle = Sim.css(Sim.mische(F.rgb.flaeche, F.rgb.tinte, g)); ctx.strokeStyle = F.gedaempft; ctx.lineWidth = F.px;
        ctx.beginPath(); ctx.arc(o.x, o.y, 11, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        const a = i * 2 * Math.PI / N;
        ctx.fillStyle = F.gedaempft; ctx.fillText(String(i + 1), Modell.MITTE + Math.sin(a) * (Modell.RADIUS + 26), Modell.MITTE + Math.cos(a) * (Modell.RADIUS + 26));
      });
      if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, FELD + LUECKE, 0, FELD, FELD);
      else diagramm(ctx, z, F, 0, FELD, FELD, LUECKE + UNTEN);
    },
    legende: F => [[F.tinte, { de: "hohe Bevölkerung", en: "high population" }], [F.flaeche, { de: "niedrig", en: "low" }],
                   [F.akzentText, { de: "aktuelles Profil", en: "current profile" }], [F.tinte2, { de: "alle 1000 Schritte", en: "every 1000 steps" }]],
    kennzahlen(z) {
      const Z = Modell.zentren(z.P), ges = Modell.summe(z.P);
      return [
        [{ de: "Zentren (lokale Maxima)", en: "Centres (local maxima)" }, String(Z.length)],
        [{ de: "Orte der Zentren", en: "Places of the centres" }, Z.map(i => i + 1).join(" · ") || "–"],
        [{ de: "Anteil der Zentren", en: "Share of the centres" }, ges > 0 ? zahl(100 * Z.reduce((s, i) => s + z.P[i], 0) / ges, 1) + " %" : "–"],
        [{ de: "Gesamtbevölkerung", en: "Total population" }, zahl(ges, 3)],
        [{ de: "mittleres Potential V̄", en: "mean potential V̄" }, zahl(z.mittel, 4)]
      ];
    }
  });
})();
