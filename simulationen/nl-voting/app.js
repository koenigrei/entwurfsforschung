/* 05 voting with four colors · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const SETUP = { de: "Setup", en: "Setup" };
  const REGELN = { de: "Regeln (Nachbarsumme 0–24)", en: "Rules (neighbour sum 0–24)" };
  const DARST = { de: "Darstellung", en: "Display" };
  // NetLogo-Farben red 15, blue 105, yellow 45, green 55
  const FARBE = [[215, 50, 41], [52, 93, 169], [237, 237, 49], [89, 176, 60]];
  const NAME = [{ de: "rot", en: "red" }, { de: "blau", en: "blue" }, { de: "gelb", en: "yellow" }, { de: "grün", en: "green" }];
  const UNTEN = 50, RECHTS = 120, LUECKE = 8;
  const quer = () => window.innerWidth > 900;
  const pz = v => (100 * v).toFixed(1).replace(".", ",") + " %";

  const modell = Object.assign({}, Modell, {
    aendere(z, p, id) { Modell.aendere(z, p, id); if (id === "verlauf") window.dispatchEvent(new Event("resize")); }
  });

  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, b = x0 + w, o = y0 + fs * 1.6, u = y0 + h - fs * 1.4, hh = u - o;
    const X = Math.max(50, z.t), sx = t => l + w * t / X, sy = v => u - hh * v;
    const T = z.verlauf.length, sch = Math.max(1, Math.ceil(T / 600));
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(b, o); ctx.stroke(); ctx.setLineDash([]);
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = Sim.css(FARBE[k]); ctx.lineWidth = 1.5 * F.px; ctx.beginPath();
      for (let t = 0; ; t = Math.min(T - 1, t + sch)) { const x = sx(t), y = sy(z.verlauf[t][k]); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); if (t === T - 1) break; }
      ctx.stroke();
    }
    const en = document.documentElement.lang === "en";
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText("100 %", l + 3 * F.px, o - 4 * F.px);
    ctx.fillText("0", l + 3 * F.px, u + fs * 1.15);
    ctx.textAlign = "right"; ctx.fillText(String(X), b, u + fs * 1.15);
    ctx.fillText(en ? "share of patches" : "Anteil der Patches", b, o - 4 * F.px);
    ctx.restore();
  }

  const regler = (id, de, en) => ({ id, gruppe: REGELN, name: { de, en }, min: 0, max: 24, schritt: 1, wert: S[id] });
  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "setup", gruppe: SETUP, name: { de: "Setup", en: "Setup" }, art: "auswahl", wert: S.setup, neustart: true,
        optionen: [{ wert: "zufall", name: { de: "setup-random", en: "setup-random" } }, { wert: "leer", name: { de: "setup-blank", en: "setup-blank" } }] },
      { id: "dichte", gruppe: SETUP, name: { de: "initial-density (gelb)", en: "initial-density (yellow)" }, min: 0, max: 1, schritt: 0.01, wert: S.dichte, neustart: true },
      regler("genYellow", "genYellow", "genYellow"),
      regler("genBlue", "genBlue", "genBlue"),
      regler("genGreen", "genGreen", "genGreen"),
      regler("genRed", "genRed", "genRed"),
      { id: "verlauf", gruppe: DARST, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf }
    ],
    groesse: (z, p) => !p.verlauf ? { b: z.breite, h: z.hoehe } : quer() ? { b: z.breite + LUECKE + RECHTS, h: z.hoehe } : { b: z.breite, h: z.hoehe + UNTEN },
    ende: z => z.fertig != null,
    zeichne(ctx, z, p, F) {
      Sim.raster(ctx, z.seite, z.seite, d => {
        for (let n = 0; n < z.feld.length; n++) { const c = FARBE[z.feld[n]]; d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255; }
      }, 0, 0, z.breite, z.hoehe);
      if (p.verlauf) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, z.breite + LUECKE, 0, RECHTS, z.hoehe);
        else diagramm(ctx, z, F, 0, z.hoehe, z.breite, UNTEN);
      }
    },
    legende: () => FARBE.map((c, k) => [Sim.css(c), NAME[k]]),
    kennzahlen(z) {
      const a = z.verlauf[z.verlauf.length - 1];
      return [
        ...[2, 1, 3, 0].map(k => [{ de: "Anteil " + NAME[k].de, en: "Share " + NAME[k].en }, pz(a[k])]),
        [{ de: "gewechselt im letzten Schritt", en: "changed in last step" }, String(z.geaendert)],
        [{ de: "stabil ab Schritt", en: "stable from step" }, z.fertig == null ? "–" : z.periode === 1 ? String(z.fertig)
          : { de: `${z.fertig} (Wechsel mit Periode 2)`, en: `${z.fertig} (alternating, period 2)` }]
      ];
    }
  });
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
