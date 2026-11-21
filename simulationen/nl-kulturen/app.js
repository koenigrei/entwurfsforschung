/* 11 Krieg der Kulturen · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const PAR = { de: "Parameter", en: "Parameters" };
  const DARST = { de: "Darstellung", en: "Display" };
  // pcolor 5 + kult · 20: gray 5, orange 25, yellow 45, lime 65, cyan 85, blue 105 (NetLogo-Grundfarben); tot: black
  const FARBE = [[141, 141, 141], [241, 105, 19], [237, 237, 49], [44, 209, 59], [84, 196, 196], [52, 93, 169]];
  const NAME = [{ de: "grau", en: "grey" }, { de: "orange", en: "orange" }, { de: "gelb", en: "yellow" }, { de: "hellgrün", en: "lime" }, { de: "cyan", en: "cyan" }, { de: "blau", en: "blue" }];
  const UNTEN = 18, RECHTS = 44, LUECKE = 3;
  const quer = () => window.innerWidth > 900;

  const modell = Object.assign({}, Modell, {
    aendere(z, p, id) { Modell.aendere(z, p, id); if (id === "verlauf") window.dispatchEvent(new Event("resize")); }
  });

  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, b = x0 + w, o = y0 + fs * 1.6, u = y0 + h - fs * 1.4, hh = u - o;
    const T = z.verlauf.length, von = Math.max(0, T - 500);   // die letzten 500 Schritte, wie ein mitlaufendes Diagramm
    let max = 20; for (let t = von; t < T; t++) for (const v of z.verlauf[t]) max = Math.max(max, v);
    const X = Math.max(100, T - 1 - von), sx = t => l + w * (t - von) / X, sy = v => u - hh * v / max;
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    for (let k = 0; k < Modell.KULTUREN; k++) {
      ctx.strokeStyle = Sim.css(FARBE[k]); ctx.lineWidth = 1.5 * F.px; ctx.beginPath();
      for (let t = von; t < T; t++) { const x = sx(t), y = sy(z.verlauf[t][k]); t > von ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    const en = document.documentElement.lang === "en";
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText(String(max), l + 3 * F.px, o - 4 * F.px);
    ctx.fillText(String(von), l + 3 * F.px, u + fs * 1.15);
    ctx.textAlign = "right"; ctx.fillText(String(von + X), b, u + fs * 1.15);
    ctx.fillText(en ? "population" : "population", b, o - 4 * F.px);
    ctx.restore();
  }

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "anzahl", gruppe: PAR, name: { de: "num-turtles (Keime)", en: "num-turtles (seeds)" }, min: 0, max: 500, schritt: 1, wert: S.anzahl, neustart: true },
      { id: "mutation", gruppe: PAR, name: { de: "mutate-rate", en: "mutate-rate" }, min: 0, max: 100, schritt: 1, wert: S.mutation, format: v => v + " %" },
      { id: "tod", gruppe: PAR, name: { de: "death-rate", en: "death-rate" }, min: 1, max: 10, schritt: 1, wert: S.tod, format: v => v + " %" },
      { id: "verlauf", gruppe: DARST, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf }
    ],
    groesse: (z, p) => !p.verlauf ? { b: z.breite, h: z.hoehe } : quer() ? { b: z.breite + LUECKE + RECHTS, h: z.hoehe } : { b: z.breite, h: z.hoehe + UNTEN },
    zeichne(ctx, z, p, F) {
      Sim.raster(ctx, z.seite, z.seite, d => {
        for (let n = 0; n < z.state.length; n++) {
          const c = z.state[n] ? FARBE[z.kult[n]] : [0, 0, 0];
          d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255;
        }
      }, 0, 0, z.breite, z.hoehe);
      if (p.verlauf) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, z.breite + LUECKE, 0, RECHTS, z.hoehe);
        else diagramm(ctx, z, F, 0, z.hoehe, z.breite, UNTEN);
      }
    },
    legende: () => FARBE.map((c, k) => [Sim.css(c), { de: `Kultur ${k} · ${NAME[k].de}`, en: `culture ${k} · ${NAME[k].en}` }]).concat([["#000000", { de: "tot", en: "dead" }]]),
    kennzahlen(z) {
      const a = z.verlauf[z.verlauf.length - 1], summe = a.reduce((s, v) => s + v, 0);
      let k = 0; a.forEach((v, i) => { if (v > a[k]) k = i; });
      return [
        [{ de: "Clock (ticks)", en: "Clock (ticks)" }, String(z.t)],
        [{ de: "lebende Patches", en: "living patches" }, String(summe)],
        [{ de: "Population je Kultur", en: "population per culture" }, a.join(" · ")],
        [{ de: "stärkste Kultur", en: "strongest culture" }, { de: `${k} · ${NAME[k].de}`, en: `${k} · ${NAME[k].en}` }],
        [{ de: "ihre Gencodes (hex)", en: "its gene codes (hex)" }, z.kgen[k].map(c => c.toString(16).padStart(2, "0").toUpperCase()).join(" ")],
        [{ de: "zuletzt", en: "last step" }, z.ausgeloescht != null ? { de: `Kultur ${z.ausgeloescht} ausgelöscht`, en: `culture ${z.ausgeloescht} wiped out` }
          : z.neu.length ? { de: `neu: Kultur ${z.neu.join(", ")}`, en: `new: culture ${z.neu.join(", ")}` } : "–"]
      ];
    }
  });
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
