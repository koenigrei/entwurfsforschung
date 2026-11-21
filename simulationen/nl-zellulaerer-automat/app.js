/* 02 Zellulärer Automat · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, B = Modell.BAU12;
  const G1 = { de: "Setup", en: "Setup" }, G2 = { de: "Regeln", en: "Rules" };
  const WERTE = ["setup", "initial-density", "genA", "genB", "genC", "genD", "todesregel", "screen-edge"];
  const nur = o => Object.fromEntries(WERTE.map(k => [k, o[k]]));
  const zahl = (v, n) => Number.isFinite(v) ? v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n }) : "–";

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "fassung", gruppe: G1, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true, groesseNeu: true,
        optionen: [{ wert: "ca02", name: { de: "02 cellular Automata (2005)", en: "02 cellular automata (2005)" } },
                   { wert: "bau12", name: { de: "12 Buildings Structure (2007)", en: "12 buildings structure (2007)" } }],
        folgen: { ca02: nur(S), bau12: nur(B) } },
      { id: "setup", gruppe: G1, name: { de: "Setup", en: "Setup" }, art: "auswahl", wert: S.setup, neustart: true,
        optionen: [{ wert: "random", name: { de: "setup-random", en: "setup-random" } }, { wert: "blank", name: { de: "setup-blank (eine Zelle)", en: "setup-blank (one cell)" } }] },
      { id: "initial-density", gruppe: G1, name: "initial-density", min: 0, max: 1, schritt: 0.01, wert: S["initial-density"], neustart: true },
      { id: "screen-edge", gruppe: G1, name: { de: "screen-edge (Welt 2 · e + 1)", en: "screen-edge (world 2 · e + 1)" }, min: 5, max: 60, wert: S["screen-edge"], neustart: true, groesseNeu: true },
      { id: "genA", gruppe: G2, name: "genA", min: 0, max: 8, wert: S.genA },
      { id: "genB", gruppe: G2, name: "genB", min: 0, max: 8, wert: S.genB },
      { id: "todesregel", gruppe: G2, name: { de: "Tod einer Zelle", en: "Death of a cell" }, art: "auswahl", wert: S.todesregel,
        optionen: [{ wert: "und", name: { de: "genA ≤ n ≤ genB (02)", en: "genA ≤ n ≤ genB (02)" } }, { wert: "oder", name: { de: "n ≥ genA oder n ≤ genB (12)", en: "n ≥ genA or n ≤ genB (12)" } }] },
      { id: "genC", gruppe: G2, name: "genC", min: 0, max: 8, wert: S.genC },
      { id: "genD", gruppe: G2, name: "genD", min: 0, max: 8, wert: S.genD }
    ],
    groesse: z => ({ b: z.N, h: z.N }),
    klick(z, p, x, y, taste) { Modell.setze(z, x, y, taste === "rechts" ? 0 : 1); },
    zeichne(ctx, z, p, F) {                                      // state 1 in Tinte, state 0 in Flächenfarbe (02: weiß auf schwarz, 12: schwarz auf weiß)
      const an = F.rgb.tinte, aus = F.rgb.flaeche, s = z.state;
      Sim.raster(ctx, z.N, z.N, d => {
        for (let n = 0; n < s.length; n++) { const c = s[n] ? an : aus; d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255; }
      });
    },
    legende: F => [[F.tinte, { de: "Zelle (state 1)", en: "cell (state 1)" }], [F.flaeche, { de: "leer (state 0)", en: "empty (state 0)" }]],
    kennzahlen(z) {
      const a = Modell.auswertung(z);
      return [[{ de: "Schritte (go)", en: "Steps (go)" }, String(z.t)],
              [{ de: "blues (state 1)", en: "blues (state 1)" }, String(a.blues)],
              [{ de: "greens (state 0)", en: "greens (state 0)" }, String(a.greens)],
              [{ de: "ratio greens / blues", en: "ratio greens / blues" }, zahl(a.ratio, 3)],
              [{ de: "ratio-blue / all cells", en: "ratio-blue / all cells" }, zahl(a.ratioBlue, 3)],
              [{ de: "geändert im letzten Schritt", en: "changed in last step" }, String(z.geaendert)]];
    }
  });
})();
