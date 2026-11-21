/* 03 reakt diffuse · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const G1 = { de: "Setup", en: "Setup" }, G2 = { de: "04: turtles vor dem Einprägen", en: "04: turtles before stamping" };
  const pz = v => (100 * v).toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { maximumFractionDigits: 1 }) + " %";

  // NetLogo-Farbnummern → RGB: 14 Grundfarben (x5), Schattierung 0 = schwarz … 5 = Grundfarbe … 9,9 ≈ weiß, Zahlen über 140 laufen um
  const BASIS = [[141, 141, 141], [215, 50, 41], [241, 106, 21], [157, 110, 72], [237, 237, 49], [89, 176, 60], [44, 209, 59],
                 [29, 159, 120], [84, 196, 196], [45, 141, 190], [52, 93, 169], [124, 80, 164], [167, 27, 106], [224, 127, 150]];
  const cache = new Map();
  function netlogo(c) {
    let f = cache.get(c); if (f) return f;
    const v = ((c % 140) + 140) % 140, b = BASIS[Math.floor(v / 10)], s = v - 10 * Math.floor(v / 10);
    f = s <= 5 ? b.map(x => Math.round(x * s / 5)) : b.map(x => Math.round(x + (255 - x) * (s - 5) / 5));
    cache.set(c, f); return f;
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "fassung", gruppe: G1, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true, groesseNeu: true,
        optionen: [{ wert: "rd03", name: { de: "03 reakt diffuse", en: "03 reaction diffusion" } }, { wert: "rd04", name: { de: "04 repel and reakt diffuse", en: "04 repel and reaction diffusion" } }],
        folgen: { rd03: { seed: 50 }, rd04: { seed: 61 } } },
      { id: "seed", gruppe: G1, name: { de: "seed (03) · density (04)", en: "seed (03) · density (04)" }, min: 0, max: 300, wert: S.seed, neustart: true },
      { id: "attract", gruppe: G2, name: "attract", art: "schalter", wert: S.attract },
      { id: "radius", gruppe: G2, name: "radius", min: 0, max: 130, wert: S.radius },
      { id: "repel", gruppe: G2, name: "repel", art: "schalter", wert: S.repel },
      { id: "repel-strength", gruppe: G2, name: "repel-strength", min: 0, max: 5, schritt: 0.2, wert: S["repel-strength"] },
      { id: "stampNach", gruppe: G2, name: { de: "stamp-agents nach Schritt (0: von Hand)", en: "stamp-agents after step (0: by hand)" }, min: 0, max: 500, schritt: 10, wert: S.stampNach }
    ],
    aktionen: [{ name: { de: "stamp-agents", en: "stamp-agents" }, tue: z => { if (z.phase === "bewegen") Modell.stempeln(z); } }],
    groesse: z => ({ b: z.N, h: z.N }),
    ende: z => z.fertig !== null,                                // leak ändert nichts mehr: Fläche geteilt
    zeichne(ctx, z, p, F) {
      const pc = z.pcolor, leer = F.rgb.flaeche, grenze = F.rgb.tinte;
      Sim.raster(ctx, z.N, z.N, d => {
        for (let n = 0; n < pc.length; n++) {
          const v = pc[n], c = v === 0 ? leer : v === Modell.WEISS ? grenze : netlogo(v);
          d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255;
        }
      });
      if (z.phase !== "bewegen") return;
      ctx.fillStyle = F.tinte; ctx.beginPath();                  // turtles: weiße Kreise (shape "circle"), Patchmitte = ganze Koordinate
      for (let k = 0; k < z.n; k++) { const cx = z.x[k] + z.e + 0.5, cy = z.e + 0.5 - z.y[k]; ctx.moveTo(cx + 1.2, cy); ctx.arc(cx, cy, 1.2, 0, 2 * Math.PI); }
      ctx.fill();
    },
    legende: (F, p, z) => [[Sim.css(netlogo(62)), { de: "Regionen (eine Farbe je Keim)", en: "regions (one colour per seed)" }],
                           [F.tinte, z && z.phase === "bewegen" ? { de: "turtle", en: "turtle" } : { de: "boundary", en: "boundary" }],
                           [F.flaeche, { de: "noch nicht erreicht", en: "not reached yet" }]],
    kennzahlen(z) {
      const a = Modell.auswertung(z);
      return [[{ de: "Schritte", en: "Steps" }, String(z.t)],
              [{ de: "Phase", en: "Phase" }, z.phase === "bewegen" ? { de: "turtles bewegen sich", en: "turtles moving" } : { de: "leak", en: "leak" }],
              [{ de: "Keime", en: "Seeds" }, z.phase === "bewegen" ? String(z.n) : String(z.keime)],
              [{ de: "Regionen", en: "Regions" }, pz(a.gefaerbt)],
              [{ de: "boundary", en: "boundary" }, pz(a.grenze)],
              [{ de: "Farben (davon Mischfarben)", en: "colours (mixed)" }, `${a.farben} (${a.misch})`],
              [{ de: "fertig bei Schritt", en: "finished at step" }, z.fertig !== null ? String(z.fertig) : "–"]];
    }
  });
})();
