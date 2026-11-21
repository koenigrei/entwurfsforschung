/* 05 voting with four colors · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von vote4col.nlogo (NetLogo 2.1, Reinhard König, 18.01.2005).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (aus „to go“):
     Zustände: rot 0 (cell-fill), blau 1 (cell-death), gelb 2 (cell-birth), grün 3 (cell-free).
     1. Jeder Patch summiert die Zustände seiner acht Nachbarn: counter = sum values-from neighbors [state] (0 … 24).
     2. Danach prüft jeder Patch der Reihe nach – eine spätere Bedingung überschreibt eine frühere:
          genYellow < counter < genGreen → gelb
          genRed < counter < genBlue     → blau
          counter > genGreen             → grün
          counter < genRed               → rot
        Sonst bleibt der Zustand. Weil alle zuerst zählen, ist die Aktualisierung synchron.
   setup-random: Patch gelb mit Wahrscheinlichkeit initial-density, sonst blau; setup-blank: alles blau, Patch 0 0 gelb.
   Welt wie im GRAPHICS-WINDOW: screen-edge 80 → Patches −80 … 80 (161 × 161), Rand als Torus (NetLogo 2.x). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const KANTE = 80, SEITE = 2 * KANTE + 1;
  const ROT = 0, BLAU = 1, GELB = 2, GRUEN = 3;

  /** Voreinstellungen aus den SLIDER-Blöcken */
  const STANDARD = { setup: "zufall", dichte: 0.5, genYellow: 12, genBlue: 12, genGreen: 19, genRed: 4, verlauf: true };
  const mitStandard = p => Object.assign({}, STANDARD, p);

  /** Neuer Zustand eines Patches aus der Nachbarsumme und dem alten Zustand (Reihenfolge der ifs wie im Original) */
  function regel(counter, alt, p) {
    let s = alt;
    if (counter > p.genYellow && counter < p.genGreen) s = GELB;
    if (counter < p.genBlue && counter > p.genRed) s = BLAU;
    if (counter > p.genGreen) s = GRUEN;
    if (counter < p.genRed) s = ROT;
    return s;
  }

  /** Index des Patches (px, py) mit px, py in −80 … 80; Zeile 0 ist oben (py = 80) */
  function index(px, py) { return (KANTE - py) * SEITE + (px + KANTE); }

  function erzeuge(param, zufall) {
    const p = mitStandard(param), N = SEITE * SEITE;
    const z = { t: 0, zufall, seite: SEITE, breite: SEITE, hoehe: SEITE, feld: new Uint8Array(N), neu: new Uint8Array(N), vorvor: new Uint8Array(N),
                summe: new Uint8Array(N), geaendert: 0, periode: null, fertig: null, verlauf: [] };
    if (p.setup === "leer") { z.feld.fill(BLAU); z.feld[index(0, 0)] = GELB; }
    else for (let i = 0; i < N; i++) z.feld[i] = zufall() < p.dichte ? GELB : BLAU;   // random-float 1.0 < initial-density
    z.verlauf.push(anteile(z));
    return z;
  }

  /** counter jedes Patches: Summe der Zustände der acht Nachbarn (Torus) */
  function zaehle(z) {
    const S = z.seite, f = z.feld, c = z.summe;
    for (let y = 0; y < S; y++) {
      const o = ((y + S - 1) % S) * S, m = y * S, u = ((y + 1) % S) * S;
      for (let x = 0; x < S; x++) {
        const l = (x + S - 1) % S, r = (x + 1) % S;
        c[m + x] = f[o + l] + f[o + x] + f[o + r] + f[m + l] + f[m + r] + f[u + l] + f[u + x] + f[u + r];
      }
    }
  }

  /** Ein Zeitschritt (to go) */
  function schritt(z, param) {
    const p = mitStandard(param), f = z.feld, g = z.neu, N = f.length;
    zaehle(z);
    let k = 0, gleichVorvor = true;
    for (let i = 0; i < N; i++) {
      const s = regel(z.summe[i], f[i], p);
      g[i] = s; if (s !== f[i]) k++;
      if (s !== z.vorvor[i]) gleichVorvor = false;
    }
    z.vorvor.set(f); z.feld = g; z.neu = f;
    z.geaendert = k; z.t++;
    z.verlauf.push(anteile(z));
    if (z.fertig == null && (k === 0 || (gleichVorvor && z.t > 1))) { z.fertig = z.t; z.periode = k === 0 ? 1 : 2; }
    return z;
  }

  /** Regler wirken ohne Neustart; danach ist die Ruhe neu zu prüfen */
  function aendere(z, p, id) { if (id !== "verlauf") { z.fertig = null; z.periode = null; z.vorvor.fill(255); } }

  /** Anteile der vier Zustände [rot, blau, gelb, grün] */
  function anteile(z) {
    const h = [0, 0, 0, 0];
    for (let i = 0; i < z.feld.length; i++) h[z.feld[i]]++;
    return h.map(v => v / z.feld.length);
  }

  return { STANDARD, KANTE, SEITE, ROT, BLAU, GELB, GRUEN, regel, index, erzeuge, zaehle, schritt, aendere, anteile };
});
