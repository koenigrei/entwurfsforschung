/* 11 Krieg der Kulturen · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 08_culturesFight09.nlogo (NetLogo 2.1, Reinhard König, 06.04.2005),
   nach dem Experiment „Krieg der Kulturen“ von Peter Jossen und Daniel Eyer (Wachstumssimulationen, fraktalwelt.de).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (aus „to go“ und den Prozeduren):
     Sechs Kulturen, jede mit neun Gencodes aus je 8 Bit (Kgen). Ein Patch ist lebendig (state 1) und gehört zu einer Kultur (kult).
     1. enviro = Zustände der acht Nachbarn als 8-Bit-Muster in der Reihenfolge (1,1) (1,0) (1,−1) (0,−1) (−1,−1) (−1,0) (−1,1) (0,1).
     2. check-state: Für jede Kultur i und jeden ihrer Gencodes j: hat der Patch einen Nachbarn der Kultur i und ist
        Kgen[i][j] = enviro ≠ 00000000, wird er lebendig mit Kultur i – trifft das für mehrere zu, übernimmt jede weitere
        mit 50 % die Zuordnung. Der eigene Zustand zählt nicht: wer kein passendes Muster hat, stirbt.
     3. check-border: Patches am Rand bleiben tot.
     4. weakest-die: mit death-rate % wird die kleinste Kultur ausgelöscht, sofern alle Kulturen leben.
     5. count-culture: neue Zustände übernehmen, Population je Kultur zählen.
     6. new-culture: jede ausgestorbene Kultur erhält einen Keim an zufälliger Stelle und neue Gencodes – mit 2/5 einen Code
        der stärksten Kultur, mit 2/5 einen Code irgendeiner Kultur, mit 1/5 einen neuen Zufallscode.
     7. mutate: mit mutate-rate % erhält ein zufälliger Gencode einer zufälligen Kultur einen neuen Zufallscode.
   Welt wie im GRAPHICS-WINDOW: screen-edge 30 → Patches −30 … 30 (61 × 61), Torus (der tote Rand trennt die Seiten). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const KANTE = 30, SEITE = 2 * KANTE + 1;
  const KULTUREN = 6, GENE = 9;          // anzKult, anzGen
  /** Reihenfolge der Nachbarn in enviro (dx, dy mit dy nach oben), höchstes Bit zuerst */
  const NACHBARN = [[1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];

  /** Nachbarindizes je Patch in der Reihenfolge NACHBARN (einmal berechnet) */
  let NB = null;
  function nachbarTabelle() {
    if (NB) return NB;
    NB = new Int32Array(SEITE * SEITE * 8);
    for (let py = -KANTE; py <= KANTE; py++) for (let px = -KANTE; px <= KANTE; px++) {
      const c = index(px, py); NACHBARN.forEach(([dx, dy], k) => { NB[c * 8 + k] = index(px + dx, py + dy); });
    }
    return NB;
  }

  /** Voreinstellungen aus den SLIDER-Blöcken */
  const STANDARD = { anzahl: 344, mutation: 1, tod: 3, verlauf: true };
  const mitStandard = p => Object.assign({}, STANDARD, p);

  /** Index des Patches (px, py) mit Torus; Zeile 0 = pycor 30 */
  function index(px, py) {
    px = ((px + KANTE) % SEITE + SEITE) % SEITE; py = ((py + KANTE) % SEITE + SEITE) % SEITE;
    return (SEITE - 1 - py) * SEITE + px;
  }
  /** Gencode: 8 zufällige Bits wie „random 2“ und siebenmal „word … random 2“, als Zahl 0 … 255 (erstes Bit = höchstes) */
  function zufallscode(zufall) { let c = 0; for (let b = 0; b < 8; b++) c = c * 2 + zufall.ganz(2); return c; }
  /** Gencode als Zeichenkette wie im Original („01101001“) */
  function alsText(c) { return c.toString(2).padStart(8, "0"); }

  function erzeuge(param, zufall) {
    const p = mitStandard(param), N = SEITE * SEITE;
    const z = { t: 0, zufall, seite: SEITE, breite: SEITE, hoehe: SEITE,
                state: new Uint8Array(N), kult: new Int8Array(N).fill(-1), enviro: new Uint8Array(N),
                sollState: new Uint8Array(N), sollKult: new Int8Array(N),
                kgen: [], countKul: new Array(KULTUREN).fill(0), maxKult: 0, minKult: 0, maxPol: 0, minPol: 0,
                allDead: 0, neu: [], ausgeloescht: null, mutiert: null, verlauf: [] };
    // setup: num-turtles an zufälligen Stellen setzen je eine Kultur random 6 und sterben
    for (let k = 0; k < Math.round(p.anzahl); k++) {
      const c = index(zufall.ganz(SEITE), zufall.ganz(SEITE));
      z.kult[c] = zufall.ganz(KULTUREN); z.state[c] = 1;
    }
    // setup-kultures: neun Zufallscodes je Kultur
    for (let i = 0; i < KULTUREN; i++) { const g = []; for (let j = 0; j < GENE; j++) g.push(zufallscode(zufall)); z.kgen.push(g); }
    z.verlauf.push(population(z));
    return z;
  }

  /** enviro aller Patches (Torus) */
  function umgebung(z) {
    const nb = nachbarTabelle();
    for (let c = 0; c < z.state.length; c++) {
      let e = 0;
      for (let k = 0; k < 8; k++) e = e * 2 + z.state[nb[c * 8 + k]];
      z.enviro[c] = e;
    }
  }

  /** Hat der Patch c einen Nachbarn der Kultur i? */
  function nachbarKultur(z, c, i) {
    const nb = nachbarTabelle();
    for (let k = 0; k < 8; k++) if (z.kult[nb[c * 8 + k]] === i) return true;
    return false;
  }

  /** check-state */
  function pruefeZustand(z) {
    z.sollState.fill(0); z.sollKult.fill(0);
    for (let i = 0; i < KULTUREN; i++) for (let j = 0; j < GENE; j++) {
      const code = z.kgen[i][j];
      if (code === 0) continue;                              // enviro ≠ "00000000"
      for (let py = -KANTE; py <= KANTE; py++) for (let px = -KANTE; px <= KANTE; px++) {   // Reihenfolge der Patches wie ask patches (zeilenweise)
        const c = index(px, py);
        if (z.enviro[c] !== code || !nachbarKultur(z, c, i)) continue;
        if (z.sollState[c] === 0) { z.sollState[c] = 1; z.sollKult[c] = i; }
        else if (z.zufall() * 100 < 50) z.sollKult[c] = i;
      }
    }
  }

  /** check-border: Randpatches bleiben tot */
  function rand(z) {
    for (let k = 0; k < SEITE; k++) { z.sollState[k] = 0; z.sollState[(SEITE - 1) * SEITE + k] = 0; z.sollState[k * SEITE] = 0; z.sollState[k * SEITE + SEITE - 1] = 0; }
  }

  /** min-max über countKul (bei Gleichstand gewinnt die erste Kultur) */
  function minMax(z) {
    z.maxPol = 0; z.minPol = 999999999;
    z.countKul.forEach((v, k) => { if (v > z.maxPol) { z.maxPol = v; z.maxKult = k; } if (v < z.minPol) { z.minPol = v; z.minKult = k; } });
  }

  /** weakest-die */
  function schwaechsteStirbt(z, p) {
    z.ausgeloescht = null;
    if (!(p.tod > z.zufall.ganz(100)) || !(z.minPol > 0)) return;
    for (let c = 0; c < z.state.length; c++) if (z.kult[c] === z.minKult || z.sollKult[c] === z.minKult) z.sollState[c] = 0;
    z.ausgeloescht = z.minKult;
  }

  /** count-culture */
  function zaehleKulturen(z) {
    z.countKul.fill(0); z.allDead = 0;
    for (let c = 0; c < z.state.length; c++) {
      if (z.sollState[c] === 1) { z.countKul[z.sollKult[c]]++; z.state[c] = 1; z.kult[c] = z.sollKult[c]; z.allDead++; }
      else { z.state[c] = 0; z.kult[c] = -1; }
    }
  }

  /** new-culture: Keim und neue Gencodes für ausgestorbene Kulturen. Wie im Original rückt der Zähler der Gencodes nur
      bei einem neuen Zufallscode weiter; kopierte Codes überschreiben dieselbe Stelle. */
  function neueKultur(z) {
    z.neu = [];
    for (let i = 0; i < KULTUREN; i++) {
      if (z.countKul[i] !== 0) continue;
      const c = index(z.zufall.ganz(SEITE), z.zufall.ganz(SEITE));
      z.state[c] = 1; z.kult[c] = i; z.neu.push(i);
      let k = 0;
      for (let n = 0; n < GENE; n++) {
        const r = z.zufall.ganz(5), g = z.kgen[i];
        if (r < 2 && z.allDead > 0) g[k] = z.kgen[z.maxKult][z.zufall.ganz(GENE)];
        else if (r < 4 && z.allDead > 0) g[k] = z.kgen[z.zufall.ganz(KULTUREN)][z.zufall.ganz(GENE)];
        else { g[k] = zufallscode(z.zufall); k++; }
      }
    }
  }

  /** mutate */
  function mutiere(z, p) {
    z.mutiert = null;
    if (!(p.mutation > z.zufall.ganz(100))) return;
    const i = z.zufall.ganz(KULTUREN), j = z.zufall.ganz(GENE);
    z.kgen[i][j] = zufallscode(z.zufall); z.mutiert = [i, j];
  }

  /** Ein Zeitschritt (to go) */
  function schritt(z, param) {
    const p = mitStandard(param);
    umgebung(z);
    pruefeZustand(z);
    rand(z);
    minMax(z);
    schwaechsteStirbt(z, p);
    zaehleKulturen(z);
    neueKultur(z);
    minMax(z);
    mutiere(z, p);
    z.t++;
    z.verlauf.push(population(z));
    return z;
  }

  function aendere() {}

  /** Population je Kultur (lebende Patches, wie gezeichnet) */
  function population(z) {
    const a = new Array(KULTUREN).fill(0);
    for (let c = 0; c < z.state.length; c++) if (z.state[c]) a[z.kult[c]]++;
    return a;
  }

  return { STANDARD, KANTE, SEITE, KULTUREN, GENE, NACHBARN, index, zufallscode, alsText, erzeuge, umgebung, nachbarKultur,
           pruefeZustand, rand, minMax, schwaechsteStirbt, zaehleKulturen, neueKultur, mutiere, schritt, aendere, population };
});
