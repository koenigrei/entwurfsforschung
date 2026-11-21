/* Optimiertes Wegesystem (Evolutionary Network) · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const G1 = { de: "Setup", en: "Setup settings" }, G2 = { de: "Evolution", en: "Evolution" }, G3 = { de: "Bewegung und Markierung", en: "Movement and marks" }, G4 = { de: "Darstellung", en: "Display" };
  const ROT = "#ff0000", GRUEN = "#008000", AGENT = "#e5484d", RAND = "#808080";
  const quer = () => window.innerWidth > 900;
  const zahl = (v, n) => v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  const RECHTS = z => Math.round(z.N * 0.75), UNTEN = z => Math.round(z.N * 0.3), LUECKE = z => Math.max(2, Math.round(z.N * 0.03));
  const kurveGruen = F => F.dunkel ? "#4cc764" : "#2b8a3e", kurveRot = "#e5484d";

  // Home Cells: mit „Lage der Home Cells“ > 0 aus eigener Saat (wie beim Programmstart des Originals immer gleich), mit 0 aus der Saat des Laufs
  const modell = Object.assign({}, Modell, {
    erzeuge(p, zufall) {
      const q = Object.assign({}, p);
      if (p.ortsSaat > 0) q.orte = Modell.zieheOrte(Zufall.zufall(p.ortsSaat), Modell.zellen(p.zellgroesse));
      return Modell.erzeuge(q, zufall);
    },
    aendere(z, p, id) { Modell.aendere(z, p, id); if (id === "verlauf") window.dispatchEvent(new Event("resize")); }
  });

  // Diagramm wie RChart1 „average angle: red | average wiggle: green“, alle 100 Schritte, x bis 50 000
  function diagramm(ctx, z, F, x0, y0, w, h) {
    const font = 10 * F.px, l = x0, b = x0 + w, o = y0 + font * 1.8, u = y0 + h - font * 1.5, hh = u - o;
    let hoch = 180; for (const v of z.verlauf) hoch = Math.max(hoch, v[1], v[2]);
    const sx = t => l + w * t / 50000, sy = v => u - hh * (v + 5) / (hoch + 5);
    ctx.save();
    ctx.font = `${font}px "Geist Mono", ui-monospace, monospace`;
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    const linie = (farbe, i) => {
      ctx.strokeStyle = farbe; ctx.lineWidth = 1.5 * F.px; ctx.beginPath();
      z.verlauf.forEach((v, j) => { const x = sx(v[0]), y = sy(v[i]); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    };
    linie(kurveGruen(F), 2); linie(kurveRot, 1);
    const en = document.documentElement.lang === "en";
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(hoch + "°", l + 3 * F.px, o - 4 * F.px);
    ctx.fillText("0", l + 3 * F.px, u + font * 1.2);
    ctx.textAlign = "right"; ctx.fillText("50000", b, u + font * 1.2);
    ctx.fillText(en ? "average angle: red | average wiggle: green" : "mittlerer angle: rot | mittlerer wiggle: grün", b, o - 4 * F.px);
    ctx.restore();
  }

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 200, wert: 10 },
    parameter: [
      { id: "anzahl", gruppe: G1, name: { de: "Anzahl Agenten", en: "number of agents for setup" }, min: 10, max: 1000, schritt: 10, wert: S.anzahl, neustart: true },
      { id: "zellgroesse", gruppe: G1, name: { de: "Zellgröße → Anzahl Zellen", en: "cell size → number of cells" }, min: 1, max: 10, wert: S.zellgroesse,
        neustart: true, groesseNeu: true, format: v => `${v} px · ${Modell.zellen(v)}²` },
      { id: "ortsSaat", gruppe: G1, name: { de: "Lage der Home Cells (Saat, 0 = mit dem Lauf)", en: "home cell layout (seed, 0 = with the run)" }, min: 0, max: 50, wert: S.ortsSaat, neustart: true },
      { id: "zentrumBekannt", gruppe: G1, name: { de: "Agenten kennen das Zentrum", en: "agents know the center position" }, art: "schalter", wert: S.zentrumBekannt, neustart: true },
      { id: "mutation", gruppe: G2, name: { de: "Mutationsrate (mutation rate)", en: "mutation rate" }, min: 0, max: 1, schritt: 0.01, wert: S.mutation,
        format: v => zahl(100 * v, 0) + " %" },
      { id: "methode", gruppe: G3, name: { de: "Markierung folgen mit", en: "sniff chemicals with" }, art: "auswahl", wert: S.methode,
        optionen: [{ wert: "hill", name: { de: "hill climbing (stärkste)", en: "hill climbing" } }, { wert: "roulette", name: { de: "roulette wheel (gewichtet)", en: "roulette wheel" } }] },
      { id: "sniff", gruppe: G3, name: { de: "Riechschwelle (sniff threshold)", en: "sniff threshold" }, min: 0, max: 100, wert: S.sniff },
      { id: "markStr", gruppe: G3, name: { de: "Markierungsstärke (mark strenght)", en: "mark strenght" }, min: 0, max: 100, wert: S.markStr },
      { id: "evapo", gruppe: G3, name: { de: "Verdunstung (evaporate rate)", en: "evaporate rate" }, min: 0, max: 1, schritt: 0.01, wert: S.evapo },
      { id: "diffusion", gruppe: G3, name: { de: "Markierungen diffundieren", en: "diffuse chemicals" }, art: "schalter", wert: S.diffusion },
      { id: "sichtbar", gruppe: G3, name: { de: "Straße ab (visibility threshold)", en: "visibility threshold" }, min: 0, max: 500, wert: S.sichtbar },
      { id: "agenten", gruppe: G4, name: { de: "Agenten zeigen", en: "Show agents" }, art: "schalter", wert: S.agenten },
      { id: "verlauf", gruppe: G4, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf }
    ],
    groesse: (z, p) => !p.verlauf ? { b: z.N, h: z.N } : quer() ? { b: z.N + LUECKE(z) + RECHTS(z), h: z.N } : { b: z.N, h: z.N + UNTEN(z) },
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
      if (p.agenten) {                                          // TAgent.Paint: Kreis 2 px, grauer Rand, grüner Richtungsstrich 4 px
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
      }
      if (p.verlauf) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, N + LUECKE(z), N * 0.1, RECHTS(z), N * 0.8);
        else diagramm(ctx, z, F, 0, N, N, UNTEN(z));
      }
    },
    legende: (F, p) => {
      const L = [[ROT, { de: "Home Cells", en: "home cells" }], [GRUEN, { de: "Center Cell", en: "center cell" }],
                 [F.tinte, { de: "Straße (mark > visibility threshold)", en: "road (mark > visibility threshold)" }], [AGENT, { de: "Agent", en: "agent" }]];
      if (p.verlauf) L.push([kurveRot, { de: "Kurve: angle", en: "curve: angle" }], [kurveGruen(F), { de: "Kurve: wiggle", en: "curve: wiggle" }]);
      return L;
    },
    kennzahlen(z, p) {
      const a = Modell.auswertung(z, p);
      return [[{ de: "Zeitschritte", en: "timesteps" }, z.t.toLocaleString("de-DE")],
              [{ de: "mittlerer angle threshold", en: "average angle" }, `${zahl(a.winkel, 0)}° ± ${zahl(a.streuungWinkel, 0)}`],
              [{ de: "mittlerer wiggle threshold", en: "average wiggle" }, `${zahl(a.wackeln, 0)}° ± ${zahl(a.streuungWackeln, 0)}`],
              [{ de: "Heimkehrer in 1000 Schritten", en: "returns home per 1000 steps" }, String(a.heimLetzte)],
              [{ de: "Wiedergeburten", en: "rebirths" }, a.geburten.toLocaleString("de-DE")],
              [{ de: "Straßenzellen", en: "road cells" }, String(a.strasse)]];
    }
  });
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
