/* 08 flusssystem · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, N = Modell.N, R = Modell.RAND;
  const ORANGE = "#f16a15";                                   // stamp orange (NetLogo-Farbe 25)
  const G1 = { de: "Setup", en: "Setup" }, G2 = { de: "Bewegung", en: "Movement" }, G3 = { de: "Knöpfe des Originals", en: "Buttons of the original" };
  const zahl = (v, n) => v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "density", gruppe: G1, name: { de: "density (Anzahl turtles)", en: "density (number of turtles)" }, min: 0, max: 500, wert: S.density, neustart: true },
      { id: "point-dist", gruppe: G2, name: { de: "point-dist (Abstand zum Anhalten)", en: "point-dist (stopping distance)" }, min: 0, max: 10, wert: S["point-dist"] },
      { id: "repel-strength", gruppe: G2, name: { de: "repel-strength (Abstoßung)", en: "repel-strength" }, min: 0, max: 3, schritt: 0.1, wert: S["repel-strength"] },
      { id: "attract", gruppe: G3, name: { de: "attract (zum Ziel streben)", en: "attract (head for the target)" }, art: "schalter", wert: S.attract },
      { id: "repel", gruppe: G3, name: { de: "repel (voneinander abstoßen)", en: "repel (push each other away)" }, art: "schalter", wert: S.repel },
      { id: "leavePath", gruppe: G3, name: { de: "leavePath (Spur legen)", en: "leavePath (leave a trail)" }, art: "schalter", wert: S.leavePath }
    ],
    aktionen: [{ name: { de: "deletePath", en: "deletePath" }, tue: z => Modell.loesche(z) }],
    groesse: () => ({ b: N, h: N }),
    klick(z, p, x, y) { Modell.setzeZiel(z, x, y); },          // mouse-down?: set hx mouse-xcor, set hy mouse-ycor
    zeichne(ctx, z, p, F) {
      const a = F.rgb.flaeche, o = Sim.rgb(ORANGE), pf = z.pfad;
      Sim.raster(ctx, N, N, d => {
        for (let n = 0; n < pf.length; n++) { const c = pf[n] ? o : a; d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255; }
      });
      // Zielpunkt (nicht im Original sichtbar): Ring in der Akzentfarbe
      const hx = z.hx + R + 0.5, hy = R + 0.5 - z.hy;
      ctx.strokeStyle = F.akzentText; ctx.lineWidth = 2 * F.px; ctx.beginPath(); ctx.arc(hx, hy, Math.max(p["point-dist"], 2), 0, 2 * Math.PI); ctx.stroke();
      // turtles: shape "circle", color black (dunkel: hell), Durchmesser 1 Patch, mindestens 3 Bildschirmpixel
      const r = Math.max(0.5, 1.5 * F.px);
      ctx.fillStyle = F.tinte; ctx.beginPath();
      for (let k = 0; k < z.n; k++) { const cx = z.x[k] + R + 0.5, cy = R + 0.5 - z.y[k]; ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 2 * Math.PI); }
      ctx.fill();
    },
    legende: F => [[ORANGE, { de: "Spur (stamp orange)", en: "trail (stamp orange)" }], [F.tinte, { de: "turtle", en: "turtle" }], [F.akzentText, { de: "Zielpunkt", en: "target point" }]],
    kennzahlen(z, p) {
      const a = Modell.auswertung(z, p);
      return [[{ de: "ticks", en: "ticks" }, z.t.toLocaleString("de-DE")],
              [{ de: "turtles angekommen", en: "turtles at rest" }, zahl(100 * a.ruhe, 0) + " %"],
              [{ de: "mittlerer Abstand zum Ziel", en: "mean distance to target" }, zahl(a.mittel, 1)],
              [{ de: "Spur (Anteil der Patches)", en: "trail (share of patches)" }, zahl(100 * a.pfad, 1) + " %"],
              [{ de: "Bündelung", en: "bundling" }, zahl(a.buendelung, 2)]];
    }
  });
})();
