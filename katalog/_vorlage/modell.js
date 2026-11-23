/* {{TITEL_DE}} · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „{{ORIGINAL}}“ aus dem Parametric Planning Catalogue ({{AUTOREN}}).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   TODO: Verfahren in zwei, drei Sätzen nennen, mit Verweis auf die Komponenten der .gh-Datei. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen wie in der .gh-Datei (Schieberegler: Wert, Bereich) */
  const STANDARD = { dichte: 0.3 };

  /** Neuer Zustand. zufall: Funktion () => [0, 1) mit .ganz(n), .zwischen(a, b) – nie Math.random() benutzen. */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = Szenen.stadt(zufall);
    return { t: 0, zufall, szene, b: szene.b, h: szene.h, p };
  }

  /** Ein Schritt; erhöht z.t. TODO: Verfahren. */
  function schritt(z, param) {
    z.t++;
    return z;
  }

  /** optional: Parameter ohne Neustart übernehmen */
  function aendere(z, param, id) {}

  return { STANDARD, erzeuge, schritt, aendere };
});
