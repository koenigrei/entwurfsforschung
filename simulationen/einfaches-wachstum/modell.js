/* Einfaches Wachstum · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 28_probabCA „ZA-Growth with Probability“ (Delphi, 20.01.2006, Reinhard König).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (CellForm.pas, checkNei und Timer1Timer), nach M. Batty: Cities and Complexity, Kapitel 2:
   - Anfang: alle Zellen D = 0, die mittlere Zelle D_c(0) = 1 (wahlweise 21 weitere zufällige Samen).
   - Übergang: if D_i(t+1) = 0 and Σ_{k∈Ω_i, k≠i} D_k(t) ≥ 1 and random < p then D_i(t+1) = 1 (Moore-Nachbarschaft, Torus, synchron).
   - Misslingt die Entwicklung, wird die Wahrscheinlichkeit dieser Zelle quadriert (p, p², p⁴ …) und beim ersten Misserfolg
     ihre „Geburtszeit“ gesetzt – das gilt im Original auch für schon entwickelte Zellen, die so verjüngt werden.
   - Alter = Schritt − Geburtszeit; ist es größer als die Lebensdauer, stirbt die Zelle (D = 0) und erhält wieder p.
   - Farbe: D · (255 − 5 · Alter) – junge Zellen hell, alte dunkel. Die Lebensdauer erzeugt Entwicklungswellen. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const N = 101;                    // round(404 / 4): ZeichenPanel 404 × 404 px, cellScal = 4
  const MITTE = 50;                 // round(101 / 2) = 50 (Delphi rundet 50,5 auf die gerade Zahl)
  /** Voreinstellungen wie im Original (CellForm.dfm: E_probab „50“, E_death „30“, Cb_rnd aus) */
  const STANDARD = { wahrscheinlichkeit: 50, lebensdauer: 30, samen: false, verlauf: true };

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param), nn = N * N;
    const z = { t: 0, zufall, n: N, breite: N, hoehe: N, zustand: new Uint8Array(nn), prob: new Float64Array(nn).fill(p.wahrscheinlichkeit / 100),
                geburt: new Int32Array(nn), alter: new Int32Array(nn), limbo: new Uint8Array(nn), verlauf: [] };
    if (p.samen) for (let s = 0; s <= 20; s++) { const x = zufall.ganz(N), y = zufall.ganz(N); z.zustand[y * N + x] = 1; }   // random distributed cells
    z.zustand[MITTE * N + MITTE] = 1;                                                                                       // one seed
    z.verlauf.push(anzahl(z));
    return z;
  }

  /** Zahl entwickelter Nachbarn in der Moore-Nachbarschaft ohne die Zelle selbst, Rand als Torus */
  function nachbarn(s, n, k, i) {
    let c = 0;
    for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) {
      if (!u && !v) continue;
      c += s[((i + v + n) % n) * n + (k + u + n) % n];
    }
    return c;
  }

  function schritt(z, param) {
    const n = z.n, s = z.zustand, pr = z.prob, g = z.geburt, al = z.alter, li = z.limbo, zu = z.zufall;
    const p = param.wahrscheinlichkeit / 100, tod = param.lebensdauer, t = z.t;
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) li[i * n + k] = nachbarn(s, n, k, i) >= 1 ? 1 : 0;   // checkNei
    let summe = 0;
    for (let j = 0; j < s.length; j++) {
      al[j] = t - g[j];                                   // Alter jedes Schritts
      if (al[j] > tod) { al[j] = 0; s[j] = 0; pr[j] = p; } // stirbt bei Überalterung
      if (li[j]) {
        if (zu() < pr[j]) {
          if (s[j] === 0) { g[j] = t; al[j] = 0; }        // „Geburt“
          s[j] = 1;
        } else {
          if (pr[j] === p) g[j] = t;                      // erster Misserfolg: Geburtszeit merken (auch bei entwickelten Zellen)
          pr[j] = pr[j] * pr[j];                          // Wahrscheinlichkeit quadrieren
        }
      }
      summe += s[j];
    }
    z.verlauf.push(summe);
    z.t++;
    return z;
  }

  function anzahl(z) { let c = 0; for (let j = 0; j < z.zustand.length; j++) c += z.zustand[j]; return c; }

  /** Grauwert wie im Original D · (255 − 5 · Alter), hier auf 0 … 255 begrenzt */
  const grau = (d, alter) => d ? Math.max(0, Math.min(255, 255 - 5 * alter)) : 0;

  return { STANDARD, N, MITTE, erzeuge, schritt, nachbarn, anzahl, grau };
});
