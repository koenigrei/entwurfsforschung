/* 01 repel attract · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, N = Modell.N, R = Modell.RAND;
  const G1 = { de: "Setup", en: "Setup" }, G2 = { de: "Dauerknöpfe", en: "Forever buttons" }, G3 = { de: "Parameter", en: "Parameters" }, G4 = { de: "Darstellung", en: "Display" };
  const zahl = (v, n = 1) => v.toFixed(n).replace(".", document.documentElement.lang === "en" ? "." : ",");

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "density", gruppe: G1, name: "density", min: 0, max: 500, wert: S.density, neustart: true },
      { id: "attract", gruppe: G2, name: "attract", art: "schalter", wert: S.attract },
      { id: "repel", gruppe: G2, name: "repel", art: "schalter", wert: S.repel },
      { id: "radius", gruppe: G3, name: "radius", min: 0, max: 130, wert: S.radius },
      { id: "repel-strength", gruppe: G3, name: "repel-strength", min: 0, max: 5, schritt: 0.2, wert: S["repel-strength"] },
      { id: "kreis", gruppe: G4, name: { de: "Kreis mit radius zeigen", en: "Show circle of radius" }, art: "schalter", wert: S.kreis }
    ],
    groesse: () => ({ b: N, h: N }),
    zeichne(ctx, z, p, F) {
      // Patches weiß, turtles schwarz (set pcolor white, set color black); dunkel umgekehrt. Ursprung (0, 0) in der Mitte, y nach oben.
      const papier = F.dunkel ? "#000000" : "#ffffff", tinte = F.dunkel ? "#ffffff" : "#000000";
      ctx.fillStyle = papier; ctx.fillRect(0, 0, N, N);
      const X = x => x + R + 0.5, Y = y => R + 0.5 - y;
      if (p.kreis && p.attract) {                               // neu: Kreis mit dem radius als Orientierung
        ctx.save(); ctx.setLineDash([3 * F.px, 4 * F.px]); ctx.strokeStyle = F.akzentText; ctx.lineWidth = F.px;
        ctx.beginPath(); ctx.arc(X(0), Y(0), p.radius, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
      }
      // shape "circle": Kreis mit 240/300 des Patches; mindestens etwa 3 Bildpunkte groß
      const r = Math.max(0.4, 2 * F.px);
      ctx.fillStyle = tinte; ctx.beginPath();
      for (let i = 0; i < z.n; i++) { const cx = X(z.x[i]), cy = Y(z.y[i]); ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 2 * Math.PI); }
      ctx.fill();
      ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.strokeRect(0, 0, N, N);
    },
    legende: F => [[F.dunkel ? "#ffffff" : "#000000", { de: "turtle", en: "turtle" }], [F.akzentText, { de: "Kreis mit radius um (0, 0)", en: "circle of radius around (0, 0)" }]],
    kennzahlen(z) {
      const a = Modell.auswertung(z);
      return [
        [{ de: "turtles", en: "turtles" }, String(z.n)],
        [{ de: "Abstand zum Ursprung (Mittel ± Streuung)", en: "distance to origin (mean ± spread)" }, `${zahl(a.mitte)} ± ${zahl(a.streuung)}`],
        [{ de: "Abstand zur nächsten turtle", en: "distance to nearest turtle" }, `${zahl(a.nn, 2)} ± ${zahl(a.nnStreuung, 2)}`],
        [{ de: "kleinster Abstand", en: "smallest distance" }, zahl(a.nnMin, 2)]
      ];
    }
  });
})();
