/* 07 wegesystem B · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, N = Modell.N, ROT = "#e5484d";   // turtles: color 15 (Rot) wie im Original
  const G1 = { de: "Setup", en: "Setup" }, G2 = { de: "Markierung", en: "Marks" }, G3 = { de: "Darstellung", en: "Display" };
  const prozent = v => (100 * v).toFixed(1).replace(".", ",") + " %";

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 200, wert: 10 },
    parameter: [
      { id: "fassung", gruppe: G1, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true,
        optionen: [{ wert: "b", name: { de: "07 wegesystem B", en: "07 path system B" } }, { wert: "update1", name: { de: "09 B update 1", en: "09 B update 1" } }] },
      { id: "num-turtles", gruppe: G1, name: "num-turtles", min: 0, max: 500, wert: S["num-turtles"], neustart: true },
      { id: "path-attract", gruppe: G2, name: "path-attract", min: 0, max: 50, schritt: 0.1, wert: S["path-attract"] },
      { id: "mark-strenght", gruppe: G2, name: "mark-strenght", min: 0, max: 50, schritt: 0.2, wert: S["mark-strenght"] },
      { id: "max-mark", gruppe: G2, name: "max-mark", min: 0, max: 100, wert: S["max-mark"] },
      { id: "decrease-per-tick", gruppe: G2, name: "decrease-per-tick", min: 0, max: 0.5, schritt: 0.01, wert: S["decrease-per-tick"] },
      { id: "show-mark-over", gruppe: G3, name: "show-mark-over", min: 0, max: 100, wert: S["show-mark-over"] },
      { id: "turtles", gruppe: G3, name: { de: "turtles zeigen", en: "Show turtles" }, art: "schalter", wert: S.turtles }
    ],
    groesse: () => ({ b: N, h: N }),
    // wegesystem04 (update 1): mit gedrückter Maus Wege einzeichnen (mark 100)
    klick(z, p, x, y, taste, phase) { Modell.zeichneWeg(z, x, y, phase === "unten"); },
    zeichne(ctx, z, p, F) {
      const a = F.rgb.flaeche, b = F.rgb.tinte, m = z.mark;
      Sim.raster(ctx, N, N, d => {
        for (let n = 0; n < m.length; n++) {
          const g = Modell.grau(m[n], p);
          d[4 * n] = a[0] + (b[0] - a[0]) * g; d[4 * n + 1] = a[1] + (b[1] - a[1]) * g; d[4 * n + 2] = a[2] + (b[2] - a[2]) * g; d[4 * n + 3] = 255;
        }
      });
      if (!p.turtles) return;
      ctx.fillStyle = ROT; ctx.beginPath();
      for (let k = 0; k < z.n; k++) {                         // Pfeil (Form „default“) in Richtung heading; Patchmitte = ganze Koordinate
        const cx = z.x[k] + Modell.RAND + 0.5, cy = Modell.RAND + 0.5 - z.y[k], s = Modell.SIN[z.h[k]], c = Modell.COS[z.h[k]];
        ctx.moveTo(cx + 0.7 * s, cy - 0.7 * c);
        ctx.lineTo(cx - 0.5 * s - 0.45 * c, cy + 0.5 * c - 0.45 * s);
        ctx.lineTo(cx - 0.5 * s + 0.45 * c, cy + 0.5 * c + 0.45 * s);
        ctx.closePath();
      }
      ctx.fill();
    },
    legende: F => [[F.tinte, { de: "starke Markierung (mark)", en: "strong mark" }], [F.flaeche, { de: "keine Markierung", en: "no mark" }], [ROT, { de: "turtle", en: "turtle" }]],
    kennzahlen(z, p) {
      const a = Modell.auswertung(z, p);
      return [[{ de: "Clock (ticks)", en: "Clock (ticks)" }, z.t.toLocaleString("de-DE")],
              [{ de: "markierte Patches", en: "marked patches" }, prozent(a.markiert)],
              [{ de: "Wege (mark ≥ max-mark/2)", en: "paths (mark ≥ max-mark/2)" }, prozent(a.stark)],
              [{ de: "turtles auf Wegen", en: "turtles on paths" }, prozent(a.aufWeg)],
              [{ de: "Orthogonalität der Wege", en: "orthogonality of paths" }, a.stark ? a.orthogonal.toFixed(2).replace(".", ",") : "–"]];
    }
  });

  // Fassung wählen setzt auch deren Voreinstellungen (B: wegesystem02direction.nlogo, update 1: wegesystem04.nlogo).
  // Über das input-Ereignis der Regler, damit Anzeige, Adresse und Modell wie bei Handbedienung nachziehen.
  const wahl = document.getElementById("p-fassung");
  if (wahl) wahl.addEventListener("change", () => {
    const werte = wahl.value === "update1" ? Modell.UPDATE1 : S;
    for (const id of ["path-attract", "mark-strenght", "max-mark", "decrease-per-tick", "show-mark-over"]) {
      const el = document.getElementById("p-" + id);
      if (el) { el.value = werte[id]; el.dispatchEvent(new Event("input")); }
    }
  });
})();
