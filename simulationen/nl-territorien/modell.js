/* 10 territory fight 01 · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 07_territoryFight_3.nlogo (NetLogo 2.1, Reinhard König, 11.03.2005).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln:
     setup: alle Patches weiß mit mark 150 (keine Farbe); cct num-turtles: heading random 360, Heimat an einer zufälligen
       ganzzahligen Stelle (setxy random screen-size-x random screen-size-y, über den Torus gefaltet), Farbe des Territoriums
       tMark = wrap-color (start-with-color + random num-turtles · 140 / number-of-colors).
     go, je turtle:
       ifelse mark-of patch-here = tMark  →  forward 1
       sonst  →  mark-of patch-here = tMark, Patch in dieser Farbe, zurück zur Heimat (homeX, homeY), rt random-float 360
     Jede turtle läuft also von ihrer Heimat geradeaus durch das eigene Gebiet und färbt die erste fremde Zelle;
     turtles gleicher Farbe bilden gemeinsame Territorien, an den Grenzen wird gekämpft.
   Welt wie im GRAPHICS-WINDOW: screen-edge 100 → Patches −100 … 100 (201 × 201), Torus; Patch eines Punkts = gerundete Koordinate. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const KANTE = 100, SEITE = 2 * KANTE + 1;
  const LEER = 150;                       // set mark 150

  /** Voreinstellungen aus den SLIDER-Blöcken */
  const STANDARD = { anzahl: 132, farben: 14, startfarbe: 5, turtlesZeigen: true, verlauf: true };
  const mitStandard = p => Object.assign({}, STANDARD, p);

  /** wrap-color: Farbzahl in 0 … 140 */
  function wrapColor(c) { c %= 140; return c < 0 ? c + 140 : c; }
  /** Farbe eines Territoriums (setup) */
  function territoriumsfarbe(start, k, farben) { return wrapColor(start + k * (140 / farben)); }
  /** Koordinate über den Torus falten: −100,5 ≤ v < 100,5 */
  function falte(v) { v = (v + KANTE + 0.5) % SEITE; if (v < 0) v += SEITE; return v - KANTE - 0.5; }
  /** Patch (Index) eines Punkts: gerundete Koordinate, Zeile 0 = pycor 100 */
  function patch(x, y) {
    let px = Math.round(x), py = Math.round(y);
    if (px > KANTE) px -= SEITE; if (px < -KANTE) px += SEITE; if (py > KANTE) py -= SEITE; if (py < -KANTE) py += SEITE;
    return (KANTE - py) * SEITE + (px + KANTE);
  }

  function erzeuge(param, zufall) {
    const p = mitStandard(param), n = Math.max(0, Math.round(p.anzahl)), F = Math.max(1, p.farben);
    const z = { t: 0, zufall, seite: SEITE, breite: SEITE, hoehe: SEITE, n, mark: new Float32Array(SEITE * SEITE).fill(LEER),
                x: new Float64Array(n), y: new Float64Array(n), h: new Float64Array(n), hx: new Float64Array(n), hy: new Float64Array(n),
                tMark: new Float32Array(n), ordnung: new Uint16Array(n), farben: [], gefaerbt: 0, verlauf: [] };
    for (let i = 0; i < n; i++) {
      z.h[i] = zufall.ganz(360);                                      // set heading random 360
      z.x[i] = z.hx[i] = falte(zufall.ganz(SEITE));                   // setxy random(screen-size-x) random(screen-size-y)
      z.y[i] = z.hy[i] = falte(zufall.ganz(SEITE));
      z.tMark[i] = territoriumsfarbe(p.startfarbe, zufall.ganz(n), F);   // random num-turtles
      z.ordnung[i] = i;
    }
    z.farben = [...new Set(Array.from(z.tMark))].sort((a, b) => a - b);
    z.verlauf.push(flaechen(z));
    return z;
  }

  /** Ein Schritt einer turtle (Rumpf von „ask turtles“ in to go) */
  function bewege(z, i) {
    const c = patch(z.x[i], z.y[i]);
    if (z.mark[c] === z.tMark[i]) {                                   // forward 1
      const r = z.h[i] * Math.PI / 180;
      z.x[i] = falte(z.x[i] + Math.sin(r)); z.y[i] = falte(z.y[i] + Math.cos(r));
    } else {
      if (z.mark[c] === LEER) z.gefaerbt++;
      z.mark[c] = z.tMark[i];                                         // set mark-of patch-here tMark, pcolor = mark
      z.x[i] = z.hx[i]; z.y[i] = z.hy[i];                             // zurück zur Heimat
      z.h[i] = (z.h[i] + z.zufall() * 360) % 360;                     // rt random-float 360
    }
  }

  /** Ein Zeitschritt (to go): alle turtles in zufälliger Reihenfolge, dann ticks + 1 */
  function schritt(z, param) {
    const o = z.ordnung;
    for (let i = o.length - 1; i > 0; i--) { const j = z.zufall.ganz(i + 1), t = o[i]; o[i] = o[j]; o[j] = t; }
    for (let k = 0; k < o.length; k++) bewege(z, o[k]);
    z.t++;
    z.verlauf.push(flaechen(z));
    return z;
  }

  function aendere() {}

  /** Flächenanteile der Territoriumsfarben (in der Reihenfolge z.farben) */
  function flaechen(z) {
    const a = new Array(z.farben.length).fill(0), idx = new Map(z.farben.map((f, k) => [f, k]));
    for (let c = 0; c < z.mark.length; c++) { const k = idx.get(z.mark[c]); if (k !== undefined) a[k]++; }
    return a.map(v => v / z.mark.length);
  }

  return { STANDARD, KANTE, SEITE, LEER, wrapColor, territoriumsfarbe, falte, patch, erzeuge, bewege, schritt, aendere, flaechen };
});
