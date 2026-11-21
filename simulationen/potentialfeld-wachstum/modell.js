/* Growth in a Potential-Field · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 30_potDevProb (Delphi, 22.–24.01.2006, Reinhard König).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (CellForm.pas, Timer1Timer, checkNei, checkPot), nach M. Batty: Cities and Complexity, Kapitel 3:
   - Anfang: alle Zellen D = 0 und P = 0, das Potential der mittleren Zelle P_c(0) = 1 (wahlweise 11 weitere Samen).
   - Entwicklung: if P_i > ψ then D_i = 1 (ψ = „Develop-Threshold“).
   - Potentialfeld: für Zellen mit P = 0 und mindestens einem entwickelten Moore-Nachbarn
       P_i(t+1) = Σ_{k∈Ω_i, k≠i} P_k(t) / 9 + Rauschen,   Rauschen = random(10 · Noise %) / 1000, P höchstens 1;
     entwickelte Zellen haben P = 0. Ein einmal gesetztes Potential unter ψ bleibt stehen – so verästelt sich die Struktur.
   - „activate aging“: Zellen älter als die Lebensdauer sterben (D = 0, P = 0). Farbe D · (255 − ⌊255 / Lebensdauer⌋ · Alter).
   - Stopp, wenn die Schrittzahl die Lebensdauer erreicht. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const N = 101, MITTE = 50;        // 404 / 4 Zellen; round(101 / 2) = 50 (Delphi rundet auf die gerade Zahl)
  /** Voreinstellungen wie im Original (CellForm.dfm: Develop-Threshold 20 %, Noise 27 %, die with age 50, activate aging an) */
  const STANDARD = { schwelle: 20, rauschen: 27, lebensdauer: 50, altern: true, samen: false, anzeige: "alter", verlauf: true };

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param), nn = N * N;
    const z = { t: 0, zufall, n: N, breite: N, hoehe: N, zustand: new Uint8Array(nn), pot: new Float64Array(nn),
                geburt: new Int32Array(nn), alter: new Int32Array(nn), limbo: new Float64Array(nn), verlauf: [0] };
    if (p.samen) for (let s = 0; s <= 10; s++) { const x = zufall.ganz(N), y = zufall.ganz(N); z.pot[y * N + x] = 1; }
    z.pot[MITTE * N + MITTE] = 1;                                   // one seed: P_c(0) = 1
    return z;
  }

  /** Summe der entwickelten Moore-Nachbarn und Summe ihrer Potentiale / 9 (ohne die Zelle selbst), Torus */
  function nachbarn(z, k, i) {
    const n = z.n; let d = 0, p = 0;
    for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) {
      if (!u && !v) continue;
      const j = ((i + v + n) % n) * n + (k + u + n) % n;
      d += z.zustand[j]; p += z.pot[j] / 9;
    }
    return { entwickelt: d, potential: p };
  }

  /** neues Potential aus Nachbarmittel und Rauschen, begrenzt auf 1 */
  const potential = (mittel, rauschZahl) => Math.min(1, mittel + rauschZahl / 1000);

  function schritt(z, param) {
    const n = z.n, s = z.zustand, P = z.pot, g = z.geburt, al = z.alter, li = z.limbo, zu = z.zufall, t = z.t;
    const psi = param.schwelle / 100, rausch = Math.round(param.rauschen) * 10, tod = param.lebensdauer;
    if (param.altern) for (let j = 0; j < s.length; j++) {          // ageCheck
      al[j] = t - g[j];
      if (al[j] > tod) { al[j] = 0; P[j] = 0; s[j] = 0; }
    }
    let summe = 0;
    for (let j = 0; j < s.length; j++) {                             // Zellenstatus verändern
      if (s[j] === 0) {
        g[j] = t; al[j] = 0;                                         // Geburtszeit – auch für unentwickelte Zellen
        if (P[j] > psi) s[j] = 1;
      }
      summe += s[j];
    }
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {        // potential and state check
      const j = i * n + k; li[j] = 0;
      if (P[j] === 0) { const nb = nachbarn(z, k, i); if (nb.entwickelt >= 1) li[j] = nb.potential; }
    }
    for (let j = 0; j < s.length; j++) {                             // set potential value t+1
      if (li[j] > 0) P[j] = potential(li[j], zu.ganz(rausch));
      if (P[j] > 1) P[j] = 1;
      if (s[j] === 1) P[j] = 0;
    }
    z.verlauf.push(summe);
    z.t++;
    return z;
  }

  /** Grauwert wie im Original: D · (255 − trunc(255 / Lebensdauer) · Alter), begrenzt */
  const grau = (d, alter, lebensdauer) => d ? Math.max(0, Math.min(255, 255 - Math.trunc(255 / lebensdauer) * alter)) : 0;

  /** Dichte der Struktur: entwickelte Zellen im Verhältnis zum Kreis um die Mitte, der sie umschließt */
  function dichte(z) {
    let c = 0, r2 = 0;
    for (let i = 0; i < z.n; i++) for (let k = 0; k < z.n; k++) if (z.zustand[i * z.n + k]) { c++; r2 = Math.max(r2, (k - MITTE) ** 2 + (i - MITTE) ** 2); }
    return { zellen: c, radius: Math.sqrt(r2), dichte: c ? c / (Math.PI * (r2 + 1)) : 0 };
  }

  return { STANDARD, N, MITTE, erzeuge, schritt, nachbarn, potential, grau, dichte };
});
