/* Selbstorganisation bei Wegesystemen und Slime Mold · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, SL = Modell.SLIME;
  const G1 = { de: "setup settings", en: "setup settings" }, G2 = { de: "Bewegung", en: "Movement" },
        G3 = { de: "Markierung", en: "Marks" }, G4 = { de: "Darstellung", en: "Display" };
  const ROT = "#e5484d", GRUEN = "#2b8a3e";
  const quer = () => window.innerWidth > 900;
  const k2 = v => (Math.round(v * 100) / 100).toString().replace(".", ",");
  const vor = (f, k) => (f === "37" ? SL : S)[k];
  const folgen = f => { const o = {}; for (const k of ["anzahl", "zelle", "angle", "wiggle", "methode", "mark", "sniff", "diffus"]) o[k] = vor(f, k); return o; };

  // Diagramm „sum of marked cells“ (RChart1); die x-Achse wächst mit (Original: Neubeginn alle 999 Schritte)
  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, b = x0 + w, o = y0 + fs * 1.8, u = y0 + h - fs * 1.5, hh = u - o, V = z.verlauf;
    let max = 100; for (const v of V) if (v > max) max = v;
    max *= 1.1;
    const X = Math.max(1000, V.length), sx = t => l + (b - l) * t / X, sy = v => u - hh * v / max;
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.strokeStyle = ROT; ctx.lineWidth = 1.5 * F.px; ctx.beginPath();
    const d = Math.max(1, Math.floor(V.length / 1500));            // bei langen Läufen ausdünnen
    for (let t = 0; t < V.length; t += d) { const x = sx(t + 1), y = sy(V[t]); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = F.gedaempft; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    const en = document.documentElement.lang === "en";
    ctx.fillText((en ? "sum of marked cells, max " : "markierte Zellen, max ") + Math.round(max), l, o - fs * 0.6);
    ctx.fillText("0", l, u + fs * 1.2);
    ctx.textAlign = "right"; ctx.fillText(String(X), b, u + fs * 1.2);
    ctx.restore();
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 50, wert: 2 },
    parameter: [
      { id: "fassung", gruppe: G1, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true, groesseNeu: true,
        optionen: [{ wert: "36", name: { de: "36 path system", en: "36 path system" } }, { wert: "37", name: { de: "37 slime mold", en: "37 slime mold" } }],
        folgen: { "36": folgen("36"), "37": folgen("37") } },
      { id: "anzahl", gruppe: G1, name: { de: "number of agents", en: "number of agents" }, min: 1, max: 1000, wert: S.anzahl, neustart: true },
      { id: "zelle", gruppe: G1, name: { de: "cell size → number of cells", en: "cell size → number of cells" }, min: 1, max: 10, wert: S.zelle, neustart: true, groesseNeu: true,
        format: v => `${v} → ${Math.round(Modell.PANEL / v)}²` },
      { id: "angle", gruppe: G2, name: { de: "angle threshold", en: "angle threshold" }, min: 0, max: 180, wert: S.angle, format: v => v + "°" },
      { id: "wiggle", gruppe: G2, name: { de: "wiggle threshold", en: "wiggle threshold" }, min: 0, max: 180, wert: S.wiggle, format: v => v + "°" },
      { id: "methode", gruppe: G2, name: { de: "sniff chemicals with", en: "sniff chemicals with" }, art: "auswahl", wert: S.methode,
        optionen: [{ wert: "roulette", name: { de: "rulette wheel", en: "roulette wheel" } }, { wert: "hill", name: { de: "hill climbing", en: "hill climbing" } }] },
      { id: "sniff", gruppe: G2, name: { de: "sniff threshold", en: "sniff threshold" }, min: 0, max: 100, wert: S.sniff },
      { id: "mark", gruppe: G3, name: { de: "mark strenght", en: "mark strength" }, min: 0, max: 100, wert: S.mark },
      { id: "evapo", gruppe: G3, name: { de: "evaporate rate (37)", en: "evaporate rate (37)" }, min: 0, max: 1, schritt: 0.01, wert: S.evapo },
      { id: "diffus", gruppe: G3, name: { de: "diffuse chemicals", en: "diffuse chemicals" }, art: "schalter", wert: S.diffus },
      { id: "visible", gruppe: G4, name: { de: "visibility threshold (37)", en: "visibility threshold (37)" }, min: 0, max: 100, wert: S.visible },
      { id: "verlauf", gruppe: G4, name: { de: "Diagramm zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf, groesseNeu: true }
    ],
    groesse(z, p) {
      const n = z.n;
      if (!p.verlauf) return { b: n, h: n };
      return quer() ? { b: n * 1.75, h: n } : { b: n, h: n * 1.4 };
    },
    klick(z, p, x, y, taste) { Modell.markiere(z, x, y, taste !== "rechts"); },
    zeichne(ctx, z, p, F) {
      const n = z.n, m = z.mark, slime = p.fassung === "37";
      const leer = F.rgb.flaeche, voll = F.rgb.tinte;
      Sim.raster(ctx, n, n, d => {
        for (let k = 0; k < m.length; k++) {
          let r, g, b;
          if (slime) {                                     // grün auf schwarz: (3v, 8v, 3v), v = mark > visibility threshold ? mark : 0
            const v = m[k] > p.visible ? m[k] : 0;
            r = Math.min(255, 3 * v); g = Math.min(255, 8 * v); b = Math.min(255, 3 * v);
            if (!F.dunkel) { const t = g / 255; r = leer[0] + (30 - leer[0]) * t; g = leer[1] + (130 - leer[1]) * t; b = leer[2] + (50 - leer[2]) * t; }
          } else {                                         // grau: 255 − mark (hell wie im Original, dunkel umgekehrt)
            const t = Math.min(255, m[k] <= 1 ? 1 : m[k]) / 255;
            r = leer[0] + (voll[0] - leer[0]) * t; g = leer[1] + (voll[1] - leer[1]) * t; b = leer[2] + (voll[2] - leer[2]) * t;
          }
          d[4 * k] = r; d[4 * k + 1] = g; d[4 * k + 2] = b; d[4 * k + 3] = 255;
        }
      });
      const c = Math.max(0.5, 2 / p.zelle * 1.6), lang = (slime ? 4 : 6) / p.zelle;   // AgSize 2, Richtungsstrich 6 (37: 4) Bildpunkte
      if (p.zelle >= 3) {
        ctx.strokeStyle = GRUEN; ctx.lineWidth = Math.max(F.px, 0.12); ctx.beginPath();
        for (let i = 0; i < z.A; i++) {
          const cx = z.x[i] + 0.5, cy = z.y[i] + 0.5, h = z.h[i] * Math.PI / 180;
          ctx.moveTo(cx, cy); ctx.lineTo(cx + Modell.rundeD(Math.cos(h)) * lang, cy + Modell.rundeD(Math.sin(h)) * lang);
        }
        ctx.stroke();
      }
      ctx.fillStyle = ROT; ctx.beginPath();
      for (let i = 0; i < z.A; i++) { const cx = z.x[i] + 0.5, cy = z.y[i] + 0.5; ctx.moveTo(cx + c / 2, cy); ctx.arc(cx, cy, c / 2, 0, 2 * Math.PI); }
      ctx.fill();
      if (p.verlauf) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, n + n * 0.05, n * 0.1, n * 0.7, n * 0.8);
        else diagramm(ctx, z, F, 0, n + n * 0.03, n, n * 0.37);
      }
    },
    legende(F, p) {
      const slime = p.fassung === "37";
      return [[slime ? (F.dunkel ? "#3cff3c" : "#1e8232") : F.tinte, { de: "Markierung (mark)", en: "mark" }], [ROT, { de: "Agent", en: "agent" }], [GRUEN, { de: "Richtung (heading)", en: "heading" }]];
    },
    kennzahlen(z, p) {
      const c = Modell.cluster(z, p.fassung === "37" ? p.visible : 30);
      return [[{ de: "timesteps", en: "timesteps" }, String(z.t)],
              [{ de: "markierte Zellen", en: "marked cells" }, `${z.summe} · ${k2(100 * z.summe / (z.n * z.n))} %`],
              [{ de: "Agenten auf Spuren", en: "agents on trails" }, Math.round(100 * Modell.aufSpur(z)) + " %"],
              [p.fassung === "37" ? { de: "Cluster (sichtbar, ≥ 4 Zellen)", en: "clusters (visible, ≥ 4 cells)" } : { de: "Wegenetze (mark > 30, ≥ 4 Zellen)", en: "path networks (mark > 30, ≥ 4 cells)" },
               `${c.anzahl} · max ${c.groesste}`]];
    }
  });
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
