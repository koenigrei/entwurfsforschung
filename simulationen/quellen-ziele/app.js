/* Quellen und Ziele der Bewegungen (Path System 02) · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const G1 = { de: "Setup", en: "Setup settings" }, G2 = { de: "Bewegung", en: "Movement" }, G3 = { de: "Markierung", en: "Marks" }, G4 = { de: "Darstellung", en: "Display" };
  const ROT = "#ff0000", GRUEN = "#008000", AGENT = "#e5484d", RAND = "#808080";   // cent clRed, source clGreen, Agent clRed/clGray
  const quer = () => window.innerWidth > 900;
  const zahl = (v, n) => v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  const grad = v => v + "°";
  // Diagramm wie RChart1 („sum of marked cells [mark-value > visibility threshold]“): breit rechts, schmal darunter
  const RECHTS = z => Math.round(z.N * 0.75), UNTEN = z => Math.round(z.N * 0.3), LUECKE = z => Math.max(2, Math.round(z.N * 0.03));

  const modell = Object.assign({}, Modell, {
    aendere(z, p, id) { Modell.aendere(z, p, id); if (id === "verlauf") window.dispatchEvent(new Event("resize")); }
  });

  function diagramm(ctx, z, F, x0, y0, w, h) {
    const font = 10 * F.px, l = x0, b = x0 + w, o = y0 + font * 1.8, u = y0 + h - font * 1.5, hh = u - o;
    const sx = t => l + w * t / 1000, sy = v => u - hh * Math.min(1, v / z.hoch);
    ctx.save();
    ctx.font = `${font}px "Geist Mono", ui-monospace, monospace`;
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.strokeStyle = ROT; ctx.lineWidth = 1.5 * F.px; ctx.beginPath();
    z.verlauf.forEach((v, i) => { const x = sx(i), y = sy(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(String(z.hoch), l + 3 * F.px, o - 4 * F.px);
    ctx.fillText(String(z.fenster), l + 3 * F.px, u + font * 1.2);
    ctx.textAlign = "right"; ctx.fillText(String(z.fenster + 1000), b, u + font * 1.2);
    const en = document.documentElement.lang === "en";
    ctx.fillText(en ? "marked cells (mark > visibility threshold)" : "markierte Zellen (mark > visibility threshold)", b, o - 4 * F.px);
    ctx.restore();
  }

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 100, wert: 5 },
    parameter: [
      { id: "anzahl", gruppe: G1, name: { de: "Anzahl Agenten", en: "number of agents for setup" }, min: 10, max: 1000, schritt: 10, wert: S.anzahl, neustart: true },
      { id: "zellgroesse", gruppe: G1, name: { de: "Zellgröße → Anzahl Zellen", en: "cell size → number of cells" }, min: 1, max: 10, wert: S.zellgroesse,
        neustart: true, groesseNeu: true, format: v => `${v} px · ${Modell.zellen(v)}²` },
      { id: "zentrumBekannt", gruppe: G1, name: { de: "Agenten kennen das Zentrum", en: "agents know the center position" }, art: "schalter", wert: S.zentrumBekannt, neustart: true },
      { id: "horizon", gruppe: G2, name: { de: "Sichtwinkel (angle threshold)", en: "angle threshold" }, min: 0, max: 180, wert: S.horizon, format: grad },
      { id: "wiggle", gruppe: G2, name: { de: "Zufallswinkel (wiggle threshold)", en: "wiggle threshold" }, min: 0, max: 180, wert: S.wiggle, format: grad },
      { id: "methode", gruppe: G2, name: { de: "Markierung folgen mit", en: "sniff chemicals with" }, art: "auswahl", wert: S.methode,
        optionen: [{ wert: "hill", name: { de: "hill climbing (stärkste)", en: "hill climbing" } }, { wert: "roulette", name: { de: "roulette wheel (gewichtet)", en: "roulette wheel" } }] },
      { id: "sniff", gruppe: G2, name: { de: "Riechschwelle (sniff threshold)", en: "sniff threshold" }, min: 0, max: 100, wert: S.sniff },
      { id: "markStr", gruppe: G3, name: { de: "Markierungsstärke (mark strenght)", en: "mark strenght" }, min: 0, max: 100, wert: S.markStr },
      { id: "evapo", gruppe: G3, name: { de: "Verdunstung (evaporate rate)", en: "evaporate rate" }, min: 0, max: 1, schritt: 0.01, wert: S.evapo },
      { id: "diffusion", gruppe: G3, name: { de: "Markierungen diffundieren", en: "diffuse chemicals" }, art: "schalter", wert: S.diffusion },
      { id: "sichtbar", gruppe: G4, name: { de: "Sichtbarkeit (visibility threshold)", en: "visibility threshold" }, min: 0, max: 255, wert: S.sichtbar },
      { id: "verlauf", gruppe: G4, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf }
    ],
    groesse: (z, p) => !p.verlauf ? { b: z.N, h: z.N } : quer() ? { b: z.N + LUECKE(z) + RECHTS(z), h: z.N } : { b: z.N, h: z.N + UNTEN(z) },
    // markCell: linke Maustaste mark 255, rechte (oder Umschalt) mark 1
    klick(z, p, x, y, taste, phase) { if (x < z.N && y < z.N) Modell.markiere(z, x, y, taste === "rechts" ? 1 : 255, phase === "unten"); },
    zeichne(ctx, z, p, F) {
      const N = z.N, a = F.rgb.flaeche, b = F.rgb.tinte, m = z.mark, vis = Math.round(p.sichtbar);
      const rot = Sim.rgb(ROT), gr = Sim.rgb(GRUEN);
      Sim.raster(ctx, N, N, d => {
        for (let n = 0; n < m.length; n++) {
          const o = 4 * n;
          if (z.heimZelle[n] || z.quelle[n]) { const c = z.heimZelle[n] ? rot : gr; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; continue; }
          const t = Modell.grau(m[n], vis);
          d[o] = a[0] + (b[0] - a[0]) * t; d[o + 1] = a[1] + (b[1] - a[1]) * t; d[o + 2] = a[2] + (b[2] - a[2]) * t; d[o + 3] = 255;
        }
      });
      // Agenten: Kreis Radius 2 px mit grauem Rand, grüner Richtungsstrich 4 px (TAgent.Paint); mindestens 2,5 Bildschirmpixel
      const r = Math.max(2 / z.zg, 2.5 * F.px), l = Math.max(4 / z.zg, 5 * F.px);
      ctx.lineWidth = F.px; ctx.strokeStyle = "#2b9a3e"; ctx.beginPath();
      for (let k = 0; k < z.n; k++) {
        const cx = z.x[k] + 0.5, cy = z.y[k] + 0.5, h = z.h[k] * Math.PI / 180;
        ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.round(Math.cos(h)) * l, cy + Math.round(Math.sin(h)) * l);
      }
      ctx.stroke();
      ctx.fillStyle = AGENT; ctx.strokeStyle = RAND; ctx.beginPath();
      for (let k = 0; k < z.n; k++) { const cx = z.x[k] + 0.5, cy = z.y[k] + 0.5; ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 2 * Math.PI); }
      ctx.fill(); ctx.stroke();
      if (p.verlauf) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, N + LUECKE(z), N * 0.1, RECHTS(z), N * 0.8);
        else diagramm(ctx, z, F, 0, N, N, UNTEN(z));
      }
    },
    legende: F => [[ROT, { de: "Home Cells (Quellen)", en: "home cells (sources)" }], [GRUEN, { de: "Center Cell (Ziel)", en: "center cell (destination)" }],
                   [F.tinte, { de: "Markierung über visibility threshold", en: "mark above visibility threshold" }], [AGENT, { de: "Agent", en: "agent" }]],
    kennzahlen(z) {
      const a = Modell.auswertung(z);
      return [[{ de: "Zeitschritte", en: "timesteps" }, z.t.toLocaleString("de-DE")],
              [{ de: "markierte Zellen (> visibility)", en: "marked cells (> visibility)" }, String(a.summe)],
              [{ de: "Agenten auf dem Heimweg", en: "agents on their way home" }, `${a.rueck} · ${zahl(100 * a.rueck / z.n, 0)} %`],
              [{ de: "Heimkehrer gesamt", en: "returns home in total" }, a.heim.toLocaleString("de-DE")],
              [{ de: "Heimkehrer in 1000 Schritten", en: "returns home per 1000 steps" }, String(a.heimLetzte)]];
    }
  });
  // Beschriftung im Diagramm folgt der Sprache
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
