/* 02 Zellulärer Automat · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von celluAutomata03.nlogo („02_cellular Automata“, NetLogo 2.1, Reinhard König, 02.01.2005)
   mit der Fassung CA_buildingStructure.nlogo („12_Buildings Structure“, NetLogo 3.0.2, 06.02.2007).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (aus „to go“, alle Patches gleichzeitig: erst zählen, dann umschalten):
     counter = sum values-from neighbors [state]   (Moore-Nachbarschaft, 8 Patches, Torus)
     state = 1: Tod, wenn genA ≤ counter ≤ genB            (02: „and“)
                Tod, wenn counter ≥ genA oder counter ≤ genB (12: „or“ – überfüllt oder vereinzelt)
     state = 0: Geburt, wenn genC ≤ counter ≤ genD
   setup-random: jeder Patch mit Wahrscheinlichkeit initial-density state 1; setup-blank: nur patch 0 0.
   Welt aus dem GRAPHICS-WINDOW: screen-edge 40 → 81 × 81 Patches (02), screen-edge 20 → 41 × 41 (12). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** Voreinstellungen von „02 cellular automata“ (SLIDER-Blöcke in celluAutomata03.nlogo) */
  const STANDARD = { fassung: "ca02", setup: "random", "initial-density": 0.01, genA: 1, genB: 8, genC: 1, genD: 8, todesregel: "und", "screen-edge": 40 };
  /** Voreinstellungen von „12 Buildings Structure“ (CA_buildingStructure.nlogo) */
  const BAU12 = { setup: "random", "initial-density": 0.5, genA: 7, genB: 0, genC: 1, genD: 3, todesregel: "oder", "screen-edge": 20 };

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const e = Math.max(1, Math.round(p["screen-edge"])), N = 2 * e + 1;
    const z = { t: 0, zufall, N, edge: e, breite: N, hoehe: N, state: new Uint8Array(N * N), counter: new Uint8Array(N * N), geaendert: 0 };
    if (p.setup === "blank") z.state[e * N + e] = 1;                       // ask patch 0 0 [cell-birth]
    else for (let n = 0; n < N * N; n++) z.state[n] = zufall() < p["initial-density"] ? 1 : 0;   // random-float 1.0 < initial-density
    return z;
  }

  /** counter: Summe der Zustände der acht Nachbarn (Torus) für alle Patches */
  function zaehle(z) {
    const N = z.N, s = z.state, c = z.counter;
    for (let r = 0; r < N; r++) {
      const o = ((r - 1 + N) % N) * N, m = r * N, u = ((r + 1) % N) * N;
      for (let k = 0; k < N; k++) {
        const l = (k - 1 + N) % N, q = (k + 1) % N;
        c[m + k] = s[o + l] + s[o + k] + s[o + q] + s[m + l] + s[m + q] + s[u + l] + s[u + k] + s[u + q];
      }
    }
  }

  /** Regel für einen Patch: neuer Zustand aus Zustand und counter */
  function regel(state, counter, p) {
    if (state === 1) {
      const tod = p.todesregel === "oder" ? (counter >= p.genA || counter <= p.genB) : (counter >= p.genA && counter <= p.genB);
      return tod ? 0 : 1;
    }
    return counter >= p.genC && counter <= p.genD ? 1 : 0;
  }

  /** Ein „go“: erst alle counter, dann alle Zustände */
  function schritt(z, p) {
    zaehle(z);
    const s = z.state, c = z.counter; let g = 0;
    for (let n = 0; n < s.length; n++) { const v = regel(s[n], c[n], p); if (v !== s[n]) { s[n] = v; g++; } }
    z.geaendert = g;
    z.t++;
    return z;
  }

  /** calc-ratio (12): greens = Patches mit state 0, blues = state 1, ratio = greens / blues, ratio-blue = blues / alle */
  function auswertung(z) {
    let blues = 0; for (let n = 0; n < z.state.length; n++) blues += z.state[n];
    const greens = z.state.length - blues;
    return { greens, blues, ratio: blues ? greens / blues : Infinity, ratioBlue: blues / z.state.length };
  }

  /** Patch per Maus setzen (1) oder löschen (0) – Spalte/Zeile im Bild */
  function setze(z, spalte, zeile, wert) {
    const k = Math.floor(spalte), r = Math.floor(zeile);
    if (k < 0 || r < 0 || k >= z.N || r >= z.N) return;
    z.state[r * z.N + k] = wert;
  }

  /** genA…genD und Todesregel wirken im nächsten „go“ */
  function aendere() {}

  return { STANDARD, BAU12, erzeuge, zaehle, regel, schritt, auswertung, setze, aendere };
});
