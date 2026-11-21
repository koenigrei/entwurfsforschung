/* {{TITEL_DE}} · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 50, wert: 5 },                      // Schritte je Bild
    // Parameter: art "regler" (Voreinstellung), "schalter" (true/false) oder "auswahl" (optionen); neustart: true → Änderung setzt zurück
    parameter: [
      { id: "dichte", gruppe: { de: "Anfang", en: "Start" }, name: { de: "Dichte", en: "Density" }, min: 0, max: 1, schritt: 0.01, wert: S.dichte, neustart: true }
    ],
    aktionen: [],                                              // weitere Knöpfe: { name: {de, en}, tue(z, p) {…} }
    groesse: z => ({ b: z.breite, h: z.hoehe }),               // Zeichenfläche in Modelleinheiten
    // klick(z, p, x, y, taste, phase) { … }                   // optional; x, y in Modelleinheiten, taste "links"|"rechts", phase "unten"|"ziehen"
    // ende: (z, p) => false,                                   // optional; true hält den Lauf an
    zeichne(ctx, z, p, F) {                                     // ctx im Modellmaßstab; F: Farben (papier, flaeche, tinte, linie, akzentText, rgb.*, dunkel, px)
      const an = F.rgb.tinte, aus = F.rgb.flaeche;
      Sim.raster(ctx, z.breite, z.hoehe, d => {
        for (let n = 0; n < z.feld.length; n++) { const c = z.feld[n] ? an : aus; d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255; }
      });
    },
    legende: (F, p) => [[F.tinte, { de: "besetzt", en: "occupied" }], [F.flaeche, { de: "frei", en: "empty" }]],
    kennzahlen: (z, p) => [[{ de: "besetzt", en: "occupied" }, String(z.feld.reduce((s, v) => s + v, 0))]]
  });
})();
