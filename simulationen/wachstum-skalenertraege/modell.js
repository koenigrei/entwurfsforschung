/* Wachstum und räumliche Umverteilung durch Skalenerträge · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 19_Growth_01 „growth with increasing returns“ (Delphi, Dezember 2005, Reinhard König)
   mit der Fassung 20_Growth_02 „growth with moore neighborhood“ (gleicher Rahmen, andere Umverteilung).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (CellForm.pas, TForm1.Timer1Timer), nach M. Batty: Cities and Complexity, Kapitel 1:
     19_Growth_01:  P_i(t+1) = (P_i(t) / P̄(t))^α               P̄ = Mittelwert aller Zellen vor dem Schritt
     20_Growth_02:  P_i(t+1) = (Σ_{k∈Moore(i)} P_k(t) / 9)^α   3 × 3-Nachbarschaft einschließlich der Zelle, Rand als Torus
   Beide Fassungen rechnen synchron (erst alle Mittel, dann alle neuen Werte). Anfangswerte zufällig in [0, 1). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ZELLE = 20;                 // cellScal = 20 Bildpunkte je Zelle
  const N = 20;                     // round(404 / 20): ZeichenPanel 404 × 404 px → 20 × 20 Zellen
  const ROT_AB = 255;               // cell_P.Paint (19_Growth_01): Zustand über 255 → rot

  /** Voreinstellungen wie im Original (CellForm.dfm: Edit_alpha „1,9“, Timer1.Interval 500 ms) */
  const STANDARD = { fassung: "global", alpha: 1.9, takt: 500 };

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, zufall, n: N, zelle: ZELLE, breite: N * ZELLE, hoehe: N * ZELLE, fassung: p.fassung,
                wert: new Float64Array(N * N), neu: new Float64Array(N * N), maxIndex: -1, ruhe: false, leer: false };
    for (let i = 0; i < z.wert.length; i++) z.wert[i] = zufall();      // SetState(random())
    return z;
  }

  /** Mittelwert aller Zellen (Pges / (reih · spalt)) */
  function mittel(w) { let s = 0; for (let i = 0; i < w.length; i++) s += w[i]; return s / w.length; }

  /** Summe der Moore-Nachbarschaft einschließlich der Zelle, Rand als Torus (checkNei in 20_Growth_02) */
  function mooreSumme(w, n, k, i) {
    let s = 0;
    for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) s += w[((i + u + n) % n) * n + (k + v + n) % n];
    return s;
  }

  /** Neuer Wert einer Zelle nach 19_Growth_01: (P_i / P̄)^α */
  const skalenertrag = (P, Pmittel, alpha) => Math.pow(P / Pmittel, alpha);
  /** Neuer Wert einer Zelle nach 20_Growth_02: (Moore-Summe / 9)^α */
  const moore = (summe, alpha) => Math.pow(summe / 9, alpha);

  function schritt(z, p) {
    const w = z.wert, neu = z.neu, n = z.n, a = p.alpha;
    let mi = 0;
    if (z.fassung === "moore") {
      for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) neu[i * n + k] = moore(mooreSumme(w, n, k, i), a);
    } else {
      const m = mittel(w);
      for (let j = 0; j < w.length; j++) neu[j] = m > 0 ? skalenertrag(w[j], m, a) : 0;
    }
    for (let j = 1; j < neu.length; j++) if (neu[j] > neu[mi]) mi = j;     // Zelle mit Maximalwert
    let gleich = true;
    for (let j = 0; j < w.length; j++) if (neu[j] !== w[j]) { gleich = false; break; }
    w.set(neu);
    z.maxIndex = mi;
    z.leer = z.fassung === "moore" && w[mi] === 0;   // „Stop wenn alles 0“ (20_Growth_02)
    z.ruhe = gleich || z.leer;                       // neu: Lauf hält auch an, wenn sich nichts mehr ändert
    z.t++;
    return z;
  }

  /** Grauwert 0 … 255 relativ zum Höchstwert m (Original: round(255 / maxP · State)) */
  const grauMit = (v, m) => m > 0 ? Math.max(0, Math.min(255, Math.round(255 * v / m))) : 0;

  /** Kennzahlen: Summe, Mittel, Höchstwert, Anteil der größten Zelle, Zahl der Zellen > 0 und > 255 */
  function auswertung(z) {
    const w = z.wert; let s = 0, m = 0, pos = 0, rot = 0;
    for (let i = 0; i < w.length; i++) { s += w[i]; if (w[i] > m) m = w[i]; if (w[i] > 0) pos++; if (w[i] > ROT_AB) rot++; }
    return { summe: s, mittel: s / w.length, max: m, anteil: s > 0 ? m / s : 0, positiv: pos, rot };
  }

  return { STANDARD, N, ZELLE, ROT_AB, erzeuge, schritt, mittel, mooreSumme, skalenertrag, moore, grauMit, auswertung };
});
