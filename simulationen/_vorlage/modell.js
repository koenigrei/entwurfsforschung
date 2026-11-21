/* {{TITEL_DE}} · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von {{ORIGINAL}} ({{HERKUNFT}}, Reinhard König).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   TODO: Regeln des Originals hier in zwei, drei Sätzen nennen, mit Verweis auf die Stelle im Quelltext (Unit/Prozedur). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** Voreinstellungen wie im Original (Werte aus .dfm, .nlogo oder Quelltext) */
  const STANDARD = { breite: 100, hoehe: 70, dichte: 0.3 };

  /** Neuer Zustand. zufall: Funktion () => [0, 1) mit .ganz(n), .zwischen(a, b), .dreh() – nie Math.random() benutzen. */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, zufall, breite: p.breite, hoehe: p.hoehe, feld: new Uint8Array(p.breite * p.hoehe) };
    for (let n = 0; n < z.feld.length; n++) z.feld[n] = zufall() < p.dichte ? 1 : 0;
    return z;
  }

  /** Ein Zeitschritt; erhöht z.t. TODO: Regel des Originals. */
  function schritt(z, param) {
    const n = z.zufall.ganz(z.feld.length);
    z.feld[n] = 1 - z.feld[n];
    z.t++;
    return z;
  }

  /** optional: Parameter ohne Neustart übernehmen (sonst im Bedienfeld neustart: true setzen) */
  function aendere(z, param, id) {}

  return { STANDARD, erzeuge, schritt, aendere };
});
