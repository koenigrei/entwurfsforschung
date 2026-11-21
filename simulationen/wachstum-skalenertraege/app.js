/* Wachstum und räumliche Umverteilung durch Skalenerträge · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, ROT = "#e5484d", GRUEN = "#2fa84f";   // clRed, clGreen des Originals
  const G1 = { de: "Modell", en: "Model" }, G2 = { de: "Ablauf", en: "Run" };
  const zahl = (v, n = 3) => !isFinite(v) ? "–" : Math.abs(v) >= 1e5 || (v !== 0 && Math.abs(v) < 1e-3) ? v.toExponential(2).replace(".", ",") : v.toFixed(n).replace(".", ",");

  // Timer1.Interval = 500 ms im Original: Beim Abspielen wartet die App zwischen zwei Schritten „takt“ Millisekunden.
  // „Schritt“, SIM.schritt(n) und Prüfungen rechnen ohne Wartezeit (nur wenn der Lauf gestartet ist, wird gebremst).
  let zuletzt = -Infinity;
  const modell = Object.assign({}, Modell, {
    schritt(z, p) {
      if (p.takt > 0 && window.SIM && window.SIM.laeuft) {
        const jetzt = performance.now();
        if (jetzt - zuletzt < p.takt) return z;
        zuletzt = jetzt;
      }
      return Modell.schritt(z, p);
    }
  });

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "fassung", gruppe: G1, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true,
        optionen: [{ wert: "global", name: { de: "19 Skalenerträge (Gesamtmittel)", en: "19 increasing returns (global mean)" } },
                   { wert: "moore", name: { de: "20 Moore-Nachbarschaft", en: "20 Moore neighbourhood" } }] },
      { id: "alpha", gruppe: G1, name: { de: "Exponent α (alpha scale)", en: "Exponent α (alpha scale)" }, min: 0.1, max: 3, schritt: 0.1, wert: S.alpha },
      { id: "takt", gruppe: G2, name: { de: "Pause je Schritt (ms)", en: "Pause per step (ms)" }, min: 0, max: 1000, schritt: 50, wert: S.takt }
    ],
    groesse: z => ({ b: z.breite, h: z.hoehe }),
    ende: z => z.ruhe,
    zeichne(ctx, z, p, F) {
      const n = z.n, w = z.wert, a = F.rgb.flaeche, b = F.rgb.tinte, rot = Sim.rgb(ROT), gr = Sim.rgb(GRUEN);
      let m = 0; for (let i = 0; i < w.length; i++) if (w[i] > m) m = w[i];
      const global = z.fassung !== "moore";
      Sim.raster(ctx, n, n, d => {
        for (let i = 0; i < w.length; i++) {
          const c = global && w[i] > Modell.ROT_AB ? rot : !global && z.t > 0 && i === z.maxIndex && m > 0 ? gr : Sim.mische(a, b, Modell.grauMit(w[i], m) / 255);
          d[4 * i] = c[0]; d[4 * i + 1] = c[1]; d[4 * i + 2] = c[2]; d[4 * i + 3] = 255;
        }
      }, 0, 0, z.breite, z.hoehe);
      if (global) {                                   // cell_P.Paint: Zellen mit grünem Rand (Pen clGreen)
        ctx.strokeStyle = GRUEN; ctx.lineWidth = F.px; ctx.beginPath();
        for (let k = 0; k <= n; k++) { ctx.moveTo(k * z.zelle, 0); ctx.lineTo(k * z.zelle, z.hoehe); ctx.moveTo(0, k * z.zelle); ctx.lineTo(z.breite, k * z.zelle); }
        ctx.stroke();
      }
    },
    legende(F, p) {
      const L = [[F.tinte, { de: "hoher Wert", en: "high value" }], [F.flaeche, { de: "niedriger Wert", en: "low value" }]];
      L.push(p.fassung === "moore" ? [GRUEN, { de: "Höchstwert", en: "maximum" }] : [ROT, { de: "Wert > 255", en: "value > 255" }]);
      return L;
    },
    kennzahlen(z, p) {
      const a = Modell.auswertung(z);
      const L = [[{ de: "Höchstwert", en: "Maximum" }, zahl(a.max)], [{ de: "Mittelwert", en: "Mean" }, zahl(a.mittel)],
                 [{ de: "Anteil der größten Zelle", en: "Share of the largest cell" }, (100 * a.anteil).toFixed(1).replace(".", ",") + " %"],
                 [{ de: "Zellen > 0", en: "Cells > 0" }, String(a.positiv)]];
      if (z.fassung !== "moore") L.push([{ de: "Zellen > 255 (rot)", en: "Cells > 255 (red)" }, String(a.rot)]);
      L.push([{ de: "Ruhe nach Schritt", en: "At rest after step" }, z.ruhe ? String(z.t) : "–"]);
      return L;
    }
  });
})();
