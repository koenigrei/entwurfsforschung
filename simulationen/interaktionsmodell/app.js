/* Agentenbasiertes Interaktionsmodell (Interaction Pattern) · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, NO = Modell.NOISE;
  const G1 = { de: "Setup", en: "Setup settings" }, G2 = { de: "Interaktion", en: "Interaction parameters" }, G3 = { de: "Ablauf", en: "Timesteps" }, G4 = { de: "Darstellung", en: "Graphic" };
  const BLAU = "#0000ff", GRUEN = "#008000", ROT = "#e5484d", LIME = "#00ff00", RAND = "#808080", BRAUN = "#800000";
  const quer = () => window.innerWidth > 900;
  const grad = v => v + "°";
  const RECHTS = z => Math.round(z.N * 0.75), UNTEN = z => Math.round(z.N * 0.3), LUECKE = z => Math.max(2, Math.round(z.N * 0.03));
  const kurve = F => F.dunkel ? "#4cc764" : "#2b8a3e";

  const modell = Object.assign({}, Modell, {
    aendere(z, p, id) { Modell.aendere(z, p, id); if (id === "verlauf") window.dispatchEvent(new Event("resize")); }
  });

  // Diagramm wie Chart1 „average values“: successful Ag's und returning Ag (0–100 %), max mark (gestrichelt, eigene Skala)
  function diagramm(ctx, z, F, x0, y0, w, h) {
    const font = 10 * F.px, l = x0, b = x0 + w, o = y0 + font * 1.8, u = y0 + h - font * 1.5, hh = u - o;
    const V = z.verlauf, n = V.length, X = Math.max(100, n), schritt = Math.max(1, Math.floor(n / 600));
    let mx = 0.1; for (let i = 0; i < n; i += schritt) if (V[i][2] > mx) mx = V[i][2];
    ctx.save();
    ctx.font = `${font}px "Geist Mono", ui-monospace, monospace`;
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    const linie = (farbe, wert, strich, breite) => {
      ctx.strokeStyle = farbe; ctx.lineWidth = breite * F.px; ctx.setLineDash(strich || []); ctx.beginPath();
      for (let i = 0; i < n; i += schritt) { const x = l + w * (i + 1) / X, y = u - hh * Math.min(1, wert(V[i])); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.setLineDash([]);
    };
    linie(F.gedaempft, v => v[2] / mx, [3 * F.px, 2 * F.px], 1);
    linie(kurve(F), v => v[1] / 100, null, 2);
    linie(ROT, v => v[0] / 100, null, 1.5);
    const en = document.documentElement.lang === "en";
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText("100 %", l + 3 * F.px, o - 4 * F.px);
    ctx.fillText("0", l + 3 * F.px, u + font * 1.2);
    ctx.textAlign = "right"; ctx.fillText(String(X), b, u + font * 1.2);
    ctx.fillText(en ? "dashed: max mark" : "gestrichelt: max mark", b, o - 4 * F.px);
    ctx.restore();
  }

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 50, wert: 3 },
    parameter: [
      { id: "ziele", gruppe: G1, name: { de: "Zielorte (SetupMode)", en: "SetupMode" }, art: "auswahl", wert: S.ziele, neustart: true,
        optionen: [{ wert: "zufall", name: { de: "zufällige Zielorte", en: "Random Destinations" } }, { wert: "kreis", name: { de: "Zielorte am Rand (Kreis)", en: "Circle Destinations" } },
                   { wert: "raster", name: { de: "Zielorte im Raster", en: "Raster Destinations" } }],
        folgen: { zufall: { noise: NO.zufall }, kreis: { noise: NO.kreis }, raster: { noise: NO.raster } } },
      { id: "anzahl", gruppe: G1, name: { de: "Anzahl Agenten", en: "number of agents for setup" }, min: 10, max: 2000, schritt: 10, wert: S.anzahl, neustart: true },
      { id: "zellgroesse", gruppe: G1, name: { de: "Zellgröße → Anzahl Zellen", en: "cell size → number of cells" }, min: 1, max: 10, wert: S.zellgroesse,
        neustart: true, groesseNeu: true, format: v => `${v} px · ${Modell.zellen(v)}²` },
      { id: "horizon", gruppe: G2, name: { de: "Sichtwinkel (angle threshold)", en: "angle threshold" }, min: 0, max: 180, wert: S.horizon, format: grad },
      { id: "wiggle", gruppe: G2, name: { de: "Zufallswinkel (wiggle threshold)", en: "wiggle threshold" }, min: 0, max: 180, wert: S.wiggle, format: grad },
      { id: "methode", gruppe: G2, name: { de: "Markierung folgen mit", en: "sniff chemicals with" }, art: "auswahl", wert: S.methode,
        optionen: [{ wert: "hill", name: { de: "hill climbing (stärkste)", en: "hill climbing" } }, { wert: "roulette", name: { de: "roulette wheel (gewichtet)", en: "roulette wheel" } }] },
      { id: "noise", gruppe: G2, name: { de: "Fehler auf dem Rückweg (return noise)", en: "return noise" }, min: 0, max: 180, wert: S.noise, format: grad },
      { id: "decay", gruppe: G2, name: { de: "Markierungen verfallen", en: "decay" }, art: "schalter", wert: S.decay },
      { id: "decayRate", gruppe: G2, name: { de: "Verfallsfaktor (decay rate)", en: "decay rate" }, min: 0.5, max: 1, schritt: 0.01, wert: S.decayRate },
      { id: "stopp", gruppe: G3, name: { de: "Anhalten bei Schritt (stop at time)", en: "stop at time" }, min: 0, max: 50000, schritt: 500, wert: S.stopp,
        format: v => v ? v.toLocaleString("de-DE") : "–" },
      { id: "nurRueck", gruppe: G4, name: { de: "nur Rückwege zeigen", en: "show only return tracks" }, art: "schalter", wert: S.nurRueck },
      { id: "spuren", gruppe: G4, name: { de: "Spuren zeigen", en: "show tracks" }, art: "schalter", wert: S.spuren },
      { id: "linien", gruppe: G4, name: { de: "Gravitationslinien zeigen", en: "show gravity lines" }, art: "schalter", wert: S.linien },
      { id: "gravScale", gruppe: G4, name: { de: "Linienstärke (gravLine scale)", en: "gravLine scale" }, min: 1, max: 20, wert: S.gravScale },
      { id: "agenten", gruppe: G4, name: { de: "Agenten zeigen", en: "show agents" }, art: "schalter", wert: S.agenten },
      { id: "verlauf", gruppe: G4, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf }
    ],
    groesse: (z, p) => !p.verlauf ? { b: z.N, h: z.N } : quer() ? { b: z.N + LUECKE(z) + RECHTS(z), h: z.N } : { b: z.N, h: z.N + UNTEN(z) },
    ende: (z, p) => p.stopp > 0 && z.t === p.stopp,              // If steps = stopTime Then timer1.enabled := false
    zeichne(ctx, z, p, F) {
      const N = z.N, a = F.rgb.flaeche, b = F.rgb.tinte, m = p.nurRueck ? z.markB : z.markA, sp = p.spuren;
      const bl = Sim.rgb(BLAU), gr = Sim.rgb(GRUEN);
      Sim.raster(ctx, N, N, d => {
        for (let n = 0; n < m.length; n++) {
          const o = 4 * n, s = z.zustand[n];
          if (s) { const c = s === 1 ? bl : gr; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; continue; }
          const t = sp ? Modell.grau(z, m[n]) : 0;
          d[o] = a[0] + (b[0] - a[0]) * t; d[o + 1] = a[1] + (b[1] - a[1]) * t; d[o + 2] = a[2] + (b[2] - a[2]) * t; d[o + 3] = 255;
        }
      });
      if (p.linien && z.t > 0) {                                // drawConns: Linie Zielort → Ursprung, Stärke numbers / steps · scale
        ctx.strokeStyle = F.dunkel ? "#c0504d" : BRAUN;
        z.ziele.forEach(([zx, zy], i) => {
          if (z.zahl[i] <= 1) return;
          ctx.lineWidth = Math.max(1, Math.round(z.zahl[i] / z.t * p.gravScale)) / z.zg;
          ctx.beginPath(); ctx.moveTo(zx + 0.5, zy + 0.5); ctx.lineTo(z.mitte + 0.5, z.mitte + 0.5); ctx.stroke();
        });
      }
      if (p.agenten) {                                          // TAgent.Paint: rot erkundend, lime auf dem Rückweg, Radius 2 px
        const r = Math.max(2 / z.zg, 1.5 * F.px);
        for (const modus of [0, 1]) {
          ctx.fillStyle = modus ? LIME : ROT; ctx.beginPath();
          for (let k = 0; k < z.n; k++) {
            if (z.modus[k] !== modus) continue;
            const cx = z.x[k] + 0.5, cy = z.y[k] + 0.5; ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
          }
          ctx.fill();
        }
      }
      if (p.verlauf) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, N + LUECKE(z), N * 0.1, RECHTS(z), N * 0.8);
        else diagramm(ctx, z, F, 0, N, N, UNTEN(z));
      }
    },
    legende: (F, p) => {
      const L = [[BLAU, { de: "Ursprungsort", en: "origin" }], [GRUEN, { de: "Zielorte", en: "destinations" }],
                 [F.tinte, p.nurRueck ? { de: "Rückwege (markB)", en: "return tracks (markB)" } : { de: "alle Wege (markA)", en: "all tracks (markA)" }],
                 [ROT, { de: "Agent erkundet", en: "agent exploring" }], [LIME, { de: "Agent auf dem Rückweg", en: "agent returning" }]];
      if (p.verlauf) L.push([kurve(F), { de: "Kurve: Rückweg %", en: "curve: returning %" }]);
      return L;
    },
    kennzahlen(z) {
      const a = Modell.auswertung(z);
      return [[{ de: "Zeitschritte", en: "timesteps" }, z.t.toLocaleString("de-DE")],
              [{ de: "erfolgreiche Agenten", en: "successful agents" }, a.erfolgreich + " %"],
              [{ de: "Agenten auf dem Rückweg", en: "returning agents" }, a.rueckweg + " %"],
              [{ de: "Rückkehrer gesamt", en: "returns in total" }, a.rueckkehr.toLocaleString("de-DE")],
              [{ de: "gefundene Zielorte", en: "destinations found" }, `${a.gefunden} / ${z.ziele.length}`],
              [{ de: "max mark", en: "max mark" }, Math.round(z.maxM).toLocaleString("de-DE")]];
    }
  });
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
