/* Wachstum mit räumlicher Umorganisation · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, N = Modell.N, ROT = "#e5484d", BLAU = "#4f7cff", GRUEN = "#2fa84f";   // RChart1: rot gesamt, blau grau, grün weiß
  const G1 = { de: "Wachstum", en: "Growth" }, G2 = { de: "Umorganisation", en: "Reorganisation" }, G3 = { de: "Setup", en: "Setup" }, G4 = { de: "Darstellung", en: "Display" };
  const pz = v => (100 * v).toFixed(1).replace(".", ",") + " %";
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
      { id: "altern", gruppe: G1, name: { de: "Altern aktivieren (activate aging)", en: "Activate aging" }, art: "schalter", wert: S.altern },
      { id: "lebensdauer", gruppe: G1, name: { de: "Lebensdauer (die with age)", en: "Lifetime (die with age)" }, min: 1, max: 100, schritt: 1, wert: S.lebensdauer },
      { id: "zustandP", gruppe: G2, name: { de: "Zustand-1/2-Wahrscheinlichkeit q", en: "State 1/2 probability q" }, min: 0, max: 100, schritt: 1, wert: S.zustandP, format: v => v + " %" },
      { id: "radius", gruppe: G2, name: { de: "Radius r (Zellen)", en: "Radius r (cells)" }, min: 0, max: 72, schritt: 1, wert: S.radius },
      { id: "samen", gruppe: G3, name: { de: "zufällig verteilte Zellen", en: "Random distributed cells" }, art: "schalter", wert: S.samen, neustart: true },
      { id: "kreis", gruppe: G4, name: { de: "Radius zeigen", en: "Show radius" }, art: "schalter", wert: true },
      { id: "verlauf", gruppe: G4, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf, groesseNeu: true }
    ],
    groesse: flaeche,
    ende: z => z.t === Modell.STOPP,                           // „stop condition“: anhalten bei Schritt 300 (Start läuft weiter)
    zeichne(ctx, z, p, F) {
      const a = F.rgb.flaeche, b = F.rgb.tinte, s = z.zustand, al = z.alter;
      Sim.raster(ctx, N, N, d => {
        for (let i = 0; i < s.length; i++) {
          const c = s[i] ? Sim.mische(a, b, Modell.grau(s[i], al[i]) / 255) : a;
          d[4 * i] = c[0]; d[4 * i + 1] = c[1]; d[4 * i + 2] = c[2]; d[4 * i + 3] = 255;
        }
      }, 0, 0, z.breite, z.hoehe);
      if (p.kreis && p.radius > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, z.breite, z.hoehe); ctx.clip();
        ctx.strokeStyle = F.akzentText; ctx.lineWidth = 1.5 * F.px; ctx.setLineDash([4 * F.px, 4 * F.px]);
        ctx.beginPath(); ctx.arc(Modell.MITTE + 0.5, Modell.MITTE + 0.5, p.radius, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
      }
      if (p.verlauf) zeichneVerlauf(ctx, z, F, { reihen: [{ werte: z.verlauf.gesamt, farbe: ROT }, { werte: z.verlauf.grau, farbe: BLAU }, { werte: z.verlauf.weiss, farbe: GRUEN }],
        ymin: 0, ymax: N * N, xmin: Modell.STOPP, oben: String(N * N), rechts: { de: "Zellen: rot gesamt · blau grau · grün weiß", en: "cells: red total · blue grey · green white" } });
    },
    legende(F, p) {
      const L = [[F.tinte, { de: "Typ 2 (weiß)", en: "type 2 (white)" }], [Sim.css(Sim.mische(F.rgb.flaeche, F.rgb.tinte, 0.5)), { de: "Typ 1 (grau)", en: "type 1 (grey)" }],
                 [F.flaeche, { de: "nicht entwickelt", en: "undeveloped" }]];
      if (p.kreis) L.push([F.akzentText, { de: "Radius r", en: "radius r" }]);
      if (p.verlauf) L.push([ROT, { de: "gesamt", en: "total" }], [BLAU, { de: "grau", en: "grey" }], [GRUEN, { de: "weiß", en: "white" }]);
      return L;
    },
    kennzahlen(z, p) {
      const v = z.verlauf, k = v.gesamt.length - 1, tr = Modell.trennung(z, p.radius);
      return [[{ de: "entwickelte Zellen", en: "developed cells" }, String(v.gesamt[k])],
              [{ de: "Typ 1 (grau)", en: "type 1 (grey)" }, String(v.grau[k])], [{ de: "Typ 2 (weiß)", en: "type 2 (white)" }, String(v.weiss[k])],
              [{ de: "grau innerhalb r", en: "grey inside r" }, pz(tr.innenGrau)], [{ de: "weiß außerhalb r", en: "white outside r" }, pz(tr.aussenWeiss)]];
    }
  });
})();
