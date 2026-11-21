/* Konkurrenz um zentrale Orte · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const MODELL = { de: "Modell", en: "Model" };
  const DARST = { de: "Darstellung", en: "Display" };

  // Farben wie im Original: Zellen grau 180 mit grauem Rand, Zentren rot (cell_P.Paint), Agenten 255 · State (schwarz, weiß)
  const BODEN = "#b4b4b4", RASTER = "#a0a0a0", ROT = "#e5484d", ZENTRUM = "#d0302f";
  const gruen = F => F.dunkel ? "#4cc764" : "#2b8a3e";
  const UNTEN = 13, RECHTS = 30, LUECKE = 2;
  const quer = () => window.innerWidth > 900;
  const pz = v => v.toFixed(1).replace(".", ",") + " %";
  const zahl = (v, n = 1) => v.toFixed(n).replace(".", ",");

  const modell = Object.assign({}, Modell, {
    aendere(z, p, id) { Modell.aendere(z, p, id); if (id === "verlauf") window.dispatchEvent(new Event("resize")); }
  });

  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, b = x0 + w, o = y0 + fs * 1.6, u = y0 + h - fs * 1.4, hh = u - o;
    const X = Math.max(100, z.t), sx = t => l + w * t / X, sy = v => u - hh * v;
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(b, o); ctx.stroke(); ctx.setLineDash([]);
    const linie = (farbe, wert, strich) => {
      ctx.strokeStyle = farbe; ctx.lineWidth = 1.5 * F.px; ctx.setLineDash(strich || []); ctx.beginPath();
      z.verlauf.forEach((v, t) => { const x = sx(t), y = sy(wert(v)); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke(); ctx.setLineDash([]);
    };
    const n = Math.max(1, z.n), d0 = Math.max(1, z.verlauf[0][3]);
    linie(F.gedaempft, v => v[3] / d0, [1 * F.px, 2 * F.px]);
    linie(F.tinte2, v => v[2] / 100, [3 * F.px, 2 * F.px]);
    linie(gruen(F), v => v[1] / n);
    linie(ROT, v => v[0] / n);
    const en = document.documentElement.lang === "en";
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText(`${z.n} · 100 %`, l + 3 * F.px, o - 4 * F.px);
    ctx.fillText("0", l + 3 * F.px, u + fs * 1.15);
    ctx.textAlign = "right"; ctx.fillText(String(X), b, u + fs * 1.15);
    ctx.fillText(en ? "dashed: like neighbours · dotted: distance" : "gestrichelt: gleiche Nachbarn · punktiert: Abstand", b, o - 4 * F.px);
    ctx.restore();
  }

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "schwelle", gruppe: MODELL, name: { de: "Schwellenwert (gleiche von 8)", en: "Threshold (like out of 8)" }, min: 0, max: 8, schritt: 1, wert: S.schwelle,
        format: v => `${v}/8 = ${Sim.fmt(v * 12.5, 0.1)} %` },
      { id: "anzahl", gruppe: MODELL, name: { de: "Anzahl Agenten für Setup", en: "Number of agents for setup" }, min: 100, max: 1500, schritt: 10, wert: S.anzahl, neustart: true },
      { id: "zentren", gruppe: MODELL, name: { de: "Zentren", en: "Centres" }, art: "auswahl", wert: S.zentren, neustart: true,
        optionen: [{ wert: "zehn", name: { de: "zehn verteilte Zentren", en: "ten spread centres" } }, { wert: "eins", name: { de: "ein Zentrum in der Mitte", en: "one centre in the middle" } }] },
      { id: "verlauf", gruppe: DARST, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf }
    ],
    groesse: (z, p) => !p.verlauf ? { b: z.breite, h: z.hoehe } : quer() ? { b: z.breite + LUECKE + RECHTS, h: z.hoehe } : { b: z.breite, h: z.hoehe + UNTEN },
    ende: z => z.t > 0 && z.suchend === 0,
    zeichne(ctx, z, p, F) {
      ctx.fillStyle = BODEN; ctx.fillRect(0, 0, z.breite, z.hoehe);
      ctx.fillStyle = ZENTRUM;
      for (const [x, y] of z.zentren) ctx.fillRect(x, y, 1, 1);
      ctx.strokeStyle = RASTER; ctx.lineWidth = F.px; ctx.beginPath();
      for (let k = 1; k < z.spalten; k++) { ctx.moveTo(k, 0); ctx.lineTo(k, z.hoehe); }
      for (let i = 1; i < z.zeilen; i++) { ctx.moveTo(0, i); ctx.lineTo(z.breite, i); }
      ctx.stroke();
      const r = 0.32;                                          // AgSize 3 bei cellScal 10
      ["#000000", "#ffffff"].forEach((farbe, g) => {
        ctx.fillStyle = farbe; ctx.beginPath();
        for (let i = 0; i < z.n; i++) {
          if (z.typ[i] !== g) continue;
          const cx = z.x[i] + 0.5, cy = z.y[i] + 0.5;
          ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        }
        ctx.fill();
      });
      if (p.verlauf) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, z.breite + LUECKE, 0, RECHTS, z.hoehe);
        else diagramm(ctx, z, F, 0, z.hoehe, z.breite, UNTEN);
      }
    },
    legende(F, p) {
      const L = [["#000000", { de: "schwarz", en: "black" }], ["#ffffff", { de: "weiß", en: "white" }], [ZENTRUM, { de: "Zentrum", en: "centre" }], [BODEN, { de: "frei", en: "empty" }]];
      if (p.verlauf) L.push([ROT, { de: "angelagert", en: "settled" }], [gruen(F), { de: "suchend", en: "searching" }]);
      return L;
    },
    kennzahlen(z) {
      const n = Math.max(1, z.n), a = z.n - z.suchend;
      return [
        [{ de: "angelagert", en: "settled" }, `${a} · ${pz(100 * a / n)}`],
        [{ de: "suchend (unzufrieden)", en: "searching (unhappy)" }, `${z.suchend} · ${pz(100 * z.suchend / n)}`],
        [{ de: "näher ans Zentrum gezogen", en: "moved closer to a centre" }, String(z.naeher)],
        [{ de: "gleiche Nachbarn (Mittel)", en: "like neighbours (mean)" }, pz(Modell.gleicheNachbarn(z))],
        [{ de: "Abstand zum Zentrum (Mittel)", en: "distance to centre (mean)" }, zahl(z.verlauf[z.verlauf.length - 1][3]) + " " + (document.documentElement.lang === "en" ? "cells" : "Zellen")],
        [{ de: "Sorte je Zentrum (r = 5)", en: "one type per centre (r = 5)" }, pz(100 * Modell.reinheit(z))],
        [{ de: "Ruhe nach Schritt", en: "At rest after step" }, z.fertig != null ? String(z.fertig) : "–"]
      ];
    }
  });
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
