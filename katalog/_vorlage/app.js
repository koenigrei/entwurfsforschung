/* {{TITEL_DE}} · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "dichte", gruppe: { de: "Parameter", en: "Parameters" }, name: { de: "Dichte", en: "Density" }, min: 0, max: 1, schritt: 0.01, wert: S.dichte }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    zeichne(ctx, z, p, F) {
      for (const g of z.szene.gebaeude) Karte.poly(ctx, g, F.dunkel ? "#3a3a40" : "#c9c9ce", null);
    },
    legende: (F, p) => [[F.dunkel ? "#3a3a40" : "#c9c9ce", { de: "Gebäude", en: "Buildings" }]],
    kennzahlen: (z, p) => [[{ de: "Schritt", en: "Step" }, String(z.t)]]
  });
})();
