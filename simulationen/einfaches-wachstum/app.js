/* Einfaches Wachstum · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, N = Modell.N, ROT = "#e5484d";   // RChart1: number of cells in Rot
  const G1 = { de: "Wachstum", en: "Growth" }, G2 = { de: "Setup", en: "Setup" }, G3 = { de: "Darstellung", en: "Display" };
  // ---- Verlaufsdiagramm (wie RChart1 des Originals): auf breiten Bildschirmen rechts neben dem Feld, sonst darunter
  // o: { reihen: [{ werte, farbe, strich? }], ymin, ymax, xmin (Mindestbreite der x-Achse), oben: "Text links oben", rechts: {de, en} }
  function diagramm(ctx, F, x0, y0, w, h, o) {
    const fs = 10 * F.px, l = x0, b = x0 + w, ob = y0 + fs * 1.6, u = y0 + h - fs * 1.4, hh = u - ob;
    const len = Math.max(1, ...o.reihen.map(r => r.werte.length)), X = Math.max(o.xmin || 100, len - 1);
    const sx = t => l + w * t / X, sy = v => u - hh * (Math.max(o.ymin, Math.min(o.ymax, v)) - o.ymin) / (o.ymax - o.ymin || 1);
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, ob); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, ob); ctx.lineTo(b, ob);
    if (o.ymin < 0 && o.ymax > 0) { ctx.moveTo(l, sy(0)); ctx.lineTo(b, sy(0)); }
    ctx.stroke(); ctx.setLineDash([]);
    const schritt = Math.max(1, Math.floor(len / Math.max(50, w / F.px)));   // lange Verläufe ausdünnen
    for (const r of o.reihen) {
      ctx.strokeStyle = r.farbe; ctx.lineWidth = 1.5 * F.px; ctx.setLineDash(r.strich ? [3 * F.px, 2 * F.px] : []); ctx.beginPath();
      for (let t = 0; t < r.werte.length; t += schritt) { const x = sx(t), y = sy(r.werte[t]); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      if (r.werte.length > 1) ctx.lineTo(sx(r.werte.length - 1), sy(r.werte[r.werte.length - 1]));
      ctx.stroke(); ctx.setLineDash([]);
    }
    const en = document.documentElement.lang === "en";
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText(o.oben, l + 3 * F.px, ob - 4 * F.px);
    ctx.fillText(o.unten != null ? o.unten : "0", l + 3 * F.px, u + fs * 1.15);
    ctx.textAlign = "right"; ctx.fillText(String(X), b, u + fs * 1.15);
    if (o.rechts) ctx.fillText(en ? o.rechts.en : o.rechts.de, b, ob - 4 * F.px);
    ctx.restore();
  }
  const UNTEN = 0.32, RECHTS = 0.75, LUECKE = 0.05;           // Anteile der Feldbreite
  const quer = () => window.innerWidth > 900;
  const flaeche = (z, p) => !p.verlauf ? { b: z.breite, h: z.hoehe } : quer() ? { b: z.breite * (1 + LUECKE + RECHTS), h: z.hoehe } : { b: z.breite, h: z.hoehe * (1 + UNTEN) };
  function zeichneVerlauf(ctx, z, F, o) {
    if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, F, z.breite * (1 + LUECKE), 0, z.breite * RECHTS, z.hoehe, o);
    else diagramm(ctx, F, 0, z.hoehe, z.breite, z.hoehe * UNTEN, o);
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "wahrscheinlichkeit", gruppe: G1, name: { de: "Wahrscheinlichkeit p", en: "Probability p" }, min: 0, max: 100, schritt: 1, wert: S.wahrscheinlichkeit, format: v => v + " %", neustart: true },
      { id: "lebensdauer", gruppe: G1, name: { de: "Lebensdauer (die with age)", en: "Lifetime (die with age)" }, min: 1, max: 100, schritt: 1, wert: S.lebensdauer },
      { id: "samen", gruppe: G2, name: { de: "zufällig verteilte Zellen", en: "Random distributed cells" }, art: "schalter", wert: S.samen, neustart: true },
      { id: "verlauf", gruppe: G3, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf, groesseNeu: true }
    ],
    groesse: flaeche,
    zeichne(ctx, z, p, F) {
      const a = F.rgb.flaeche, b = F.rgb.tinte, s = z.zustand, al = z.alter;
      Sim.raster(ctx, N, N, d => {
        for (let i = 0; i < s.length; i++) {
          const c = s[i] ? Sim.mische(a, b, Modell.grau(1, al[i]) / 255) : a;
          d[4 * i] = c[0]; d[4 * i + 1] = c[1]; d[4 * i + 2] = c[2]; d[4 * i + 3] = 255;
        }
      }, 0, 0, z.breite, z.hoehe);
      if (p.verlauf) zeichneVerlauf(ctx, z, F, { reihen: [{ werte: z.verlauf, farbe: ROT }], ymin: 0, ymax: N * N, xmin: 200,
        oben: String(N * N), rechts: { de: "Zahl der entwickelten Zellen", en: "number of developed cells" } });
    },
    legende(F, p) {
      const L = [[F.tinte, { de: "neu entwickelt", en: "newly developed" }], [Sim.css(Sim.mische(F.rgb.flaeche, F.rgb.tinte, 0.45)), { de: "älter", en: "older" }], [F.flaeche, { de: "nicht entwickelt", en: "undeveloped" }]];
      if (p.verlauf) L.push([ROT, { de: "Zellen (Verlauf)", en: "cells (chart)" }]);
      return L;
    },
    kennzahlen(z) {
      const c = z.verlauf[z.verlauf.length - 1];
      let jung = 0; for (let j = 0; j < z.zustand.length; j++) if (z.zustand[j] && z.alter[j] === 0) jung++;
      return [[{ de: "entwickelte Zellen", en: "developed cells" }, `${c} · ${(100 * c / (N * N)).toFixed(1).replace(".", ",")} %`],
              [{ de: "in diesem Schritt neu", en: "new in this step" }, z.t ? String(jung) : "–"]];
    }
  });
})();
