/* Active Walker · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, MU = Modell.MULTI;
  const G1 = { de: "Setup", en: "Setup settings" }, G2 = { de: "Interaktion", en: "Interaction parameters" }, G3 = { de: "Darstellung", en: "Display" };
  const ROT = "#e5484d", RAND = "#808080";                     // Walker: clRed mit grauem Rand (TAgent.Paint)
  const gruen = z => z.fassung === "1.0" ? "#008000" : "#00ff00";   // walked: clGreen (1.0), clLime (1.1)
  const zahl = (v, n) => v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  const grad = v => v + "°";
  const gross = v => v < 1e6 ? zahl(v, 1) : v.toExponential(2).replace("e+", " · 10^");

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 50, wert: 2 },
    parameter: [
      { id: "fassung", gruppe: G1, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true,
        optionen: [{ wert: "1.0", name: { de: "40 Active Walker (1.0)", en: "40 Active walker (1.0)" } },
                   { wert: "1.1", name: { de: "41 Multi Walker (1.1)", en: "41 Multi walker (1.1)" } }],
        folgen: { "1.0": { anzahl: S.anzahl, diffusion: S.diffusion, noise: S.noise, dScale: S.dScale },
                  "1.1": { anzahl: MU.anzahl, diffusion: MU.diffusion, noise: MU.noise, dScale: MU.dScale } } },
      { id: "anzahl", gruppe: G1, name: { de: "Anzahl Walker", en: "number of agents for setup" }, min: 1, max: 50, wert: S.anzahl, neustart: true },
      { id: "zellgroesse", gruppe: G1, name: { de: "Zellgröße → Anzahl Zellen", en: "cell size → number of cells" }, min: 1, max: 10, wert: S.zellgroesse,
        neustart: true, groesseNeu: true, format: v => `${v} px · ${Modell.zellen(v)}²` },
      { id: "horizon", gruppe: G2, name: { de: "Sichtwinkel (angle threshold)", en: "angle threshold" }, min: 0, max: 180, wert: S.horizon, format: grad },
      { id: "wiggle", gruppe: G2, name: { de: "Zufallswinkel (wiggle threshold)", en: "wiggle threshold" }, min: 0, max: 180, wert: S.wiggle, format: grad },
      { id: "methode", gruppe: G2, name: { de: "Wahl der Nachbarzelle", en: "sniff chemicals with" }, art: "auswahl", wert: S.methode,
        optionen: [{ wert: "hill", name: { de: "hill climbing (Höchstwert)", en: "hill climbing" } },
                   { wert: "roulette", name: { de: "roulette wheel (gewichtet)", en: "roulette wheel" } }] },
      { id: "diffusion", gruppe: G2, name: { de: "Diffusionsstärke (diffusion strength)", en: "diffusion strength" }, min: 0, max: 0.5, schritt: 0.01, wert: S.diffusion },
      { id: "noise", gruppe: G2, name: { de: "Störwert (noise strength)", en: "noise strength" }, min: 0, max: 20, schritt: 0.5, wert: S.noise },
      { id: "dScale", gruppe: G2, name: { de: "Distanzskalierung (distance scaling)", en: "distance scaling" }, min: 0, max: 1, schritt: 0.01, wert: S.dScale },
      { id: "spur", gruppe: G3, name: { de: "Spur zeigen (walked)", en: "Show trail (walked)" }, art: "schalter", wert: S.spur }
    ],
    groesse: z => ({ b: z.N, h: z.N }),
    zeichne(ctx, z, p, F) {
      const a = F.rgb.flaeche, b = F.rgb.tinte, m = z.mark, w = z.begangen, sp = p.spur;
      const g = Sim.rgb(gruen(z));
      Sim.raster(ctx, z.N, z.N, d => {
        for (let n = 0; n < m.length; n++) {
          const o = 4 * n;
          if (sp && w[n]) { d[o] = g[0]; d[o + 1] = g[1]; d[o + 2] = g[2]; d[o + 3] = 255; continue; }
          const t = Modell.dunkel(z, m[n]) / 255;            // weiß = gut erreichbar, schwarz = schlecht (dunkel umgekehrt)
          d[o] = a[0] + (b[0] - a[0]) * t; d[o + 1] = a[1] + (b[1] - a[1]) * t; d[o + 2] = a[2] + (b[2] - a[2]) * t; d[o + 3] = 255;
        }
      });
      // Walker: Kreis mit Radius AgSize = 2 px, Richtungsstrich 6 px (TAgent.Paint), mindestens 3 Bildschirmpixel
      const r = Math.max(2 / z.zg, 3 * F.px), l = Math.max(6 / z.zg, 8 * F.px);
      ctx.lineWidth = 1.5 * F.px; ctx.strokeStyle = "#2b9a3e"; ctx.beginPath();
      for (let k = 0; k < z.n; k++) {
        const cx = z.x[k] + 0.5, cy = z.y[k] + 0.5, h = z.h[k] * Math.PI / 180;
        ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.round(Math.cos(h)) * l, cy + Math.round(Math.sin(h)) * l);
      }
      ctx.stroke();
      ctx.fillStyle = ROT; ctx.strokeStyle = RAND; ctx.lineWidth = F.px; ctx.beginPath();
      for (let k = 0; k < z.n; k++) { const cx = z.x[k] + 0.5, cy = z.y[k] + 0.5; ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 2 * Math.PI); }
      ctx.fill(); ctx.stroke();
    },
    legende: (F, p, z) => {
      const L = [[F.flaeche, { de: "gut erreichbar (niedriges mark)", en: "well accessible (low mark)" }],
                 [F.tinte, { de: "schlecht erreichbar", en: "poorly accessible" }]];
      if (p.spur) L.push([gruen(z || { fassung: p.fassung }), { de: "begangen", en: "walked" }]);
      L.push([ROT, { de: "Walker", en: "walker" }]);
      return L;
    },
    kennzahlen(z) {
      const a = Modell.auswertung(z);
      const K = [[{ de: "Zeitschritte", en: "timesteps" }, z.t.toLocaleString("de-DE")],
                 [{ de: "begangene Zellen", en: "walked cells" }, zahl(100 * a.begangen, 1) + " %"],
                 [{ de: "Abstand Walker 1 → höchstes mark", en: "distance walker 1 → highest mark" }, zahl(a.ziel, 1)]];
      if (a.naechster != null) K.push([{ de: "Abstand zum nächsten Walker (Mittel)", en: "distance to nearest walker (mean)" }, zahl(a.naechster, 1)]);
      K.push([{ de: "Spanne mark (max − min)", en: "mark range (max − min)" }, gross(a.spanne)]);
      return K;
    }
  });
})();
