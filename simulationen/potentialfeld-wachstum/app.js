/* Growth in a Potential-Field · Bedienung und Darstellung (Modelllogik in modell.js)
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
      { id: "schwelle", gruppe: G1, name: { de: "Entwicklungsschwelle ψ (Develop-Threshold)", en: "Develop threshold ψ" }, min: 1, max: 100, schritt: 1, wert: S.schwelle, format: v => v + " %" },
      { id: "rauschen", gruppe: G1, name: { de: "Rauschen (Noise)", en: "Noise" }, min: 0, max: 100, schritt: 1, wert: S.rauschen, format: v => v + " %" },
      { id: "altern", gruppe: G1, name: { de: "Altern aktivieren (activate aging)", en: "Activate aging" }, art: "schalter", wert: S.altern },
      { id: "lebensdauer", gruppe: G1, name: { de: "Lebensdauer (die with age)", en: "Lifetime (die with age)" }, min: 5, max: 200, schritt: 1, wert: S.lebensdauer },
      { id: "samen", gruppe: G2, name: { de: "zufällig verteilte Zellen", en: "Random distributed cells" }, art: "schalter", wert: S.samen, neustart: true },
      { id: "anzeige", gruppe: G3, name: { de: "Anzeige", en: "Show" }, art: "auswahl", wert: S.anzeige,
        optionen: [{ wert: "alter", name: { de: "Entwicklung und Alter", en: "Development and age" } }, { wert: "potential", name: { de: "Potentialfeld", en: "Potential field" } }] },
      { id: "verlauf", gruppe: G3, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf, groesseNeu: true }
    ],
    groesse: flaeche,
    ende: (z, p) => z.t === p.lebensdauer,                     // „stop condition“: steps = die with age (Start läuft weiter)
    zeichne(ctx, z, p, F) {
      const a = F.rgb.flaeche, b = F.rgb.tinte, s = z.zustand, al = z.alter, P = z.pot, pot = p.anzeige === "potential";
      Sim.raster(ctx, N, N, d => {
        for (let i = 0; i < s.length; i++) {
          const v = pot ? Math.min(1, P[i] * 4) : Modell.grau(s[i], al[i], p.lebensdauer) / 255;
          const c = Sim.mische(a, b, v);
          d[4 * i] = c[0]; d[4 * i + 1] = c[1]; d[4 * i + 2] = c[2]; d[4 * i + 3] = 255;
        }
      }, 0, 0, z.breite, z.hoehe);
      if (p.verlauf) {
        let m = 0; for (const c of z.verlauf) m = Math.max(m, c);
        const ymax = Math.min(N * N, Math.max(1000, Math.ceil(m * 1.1 / 1000) * 1000));
        zeichneVerlauf(ctx, z, F, { reihen: [{ werte: z.verlauf, farbe: ROT }], ymin: 0, ymax, xmin: p.lebensdauer,
          oben: String(ymax), rechts: { de: "Zahl der entwickelten Zellen", en: "number of developed cells" } });
      }
    },
    legende(F, p) {
      const L = p.anzeige === "potential" ? [[F.tinte, { de: "Potential ≥ 0,25", en: "potential ≥ 0.25" }], [F.flaeche, { de: "Potential 0", en: "potential 0" }]]
        : [[F.tinte, { de: "neu entwickelt", en: "newly developed" }], [Sim.css(Sim.mische(F.rgb.flaeche, F.rgb.tinte, 0.45)), { de: "älter", en: "older" }], [F.flaeche, { de: "nicht entwickelt", en: "undeveloped" }]];
      if (p.verlauf) L.push([ROT, { de: "Zellen (Verlauf)", en: "cells (chart)" }]);
      return L;
    },
    kennzahlen(z) {
      const c = z.verlauf[z.verlauf.length - 1];
      let w = 0; for (let j = 0; j < z.pot.length; j++) if (z.pot[j] > 0) w++;
      return [[{ de: "entwickelte Zellen", en: "developed cells" }, `${c} · ${(100 * c / (N * N)).toFixed(1).replace(".", ",")} %`],
              [{ de: "Zellen mit Potential > 0", en: "cells with potential > 0" }, String(w)]];
    }
  });

  // E_probabChange im Original: eine neue Entwicklungsschwelle setzt das Rauschen auf Schwelle + 7
  const regler = document.getElementById("p-schwelle");
  if (regler) regler.addEventListener("input", () => window.SIM.setze("rauschen", Math.min(100, Number(regler.value) + 7)));
})();
