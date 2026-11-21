/* Kristallwachstum · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 33_crystalGrowth (Delphi 2005, Reinhard König, Projekt ZA03_crystalGrowth, Unit CellForm.pas, 11.03.2006),
   Erweiterung des Schneeflocken-Modells; nach M. Batty, Cities and Complexity, Kap. 3.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (TForm1.Timer1Timer):
     1. ageCheck – nur mit „activate aging“: entwickelte Zellen älter als „die at age“ sterben (D = 0, P = 0).
     2. equiPot  – (T − 1)-mal: P_i += ξ / (T − 1) · Σ w_k (P_k − P_i), w = 1/6 orthogonal, 1/12 diagonal, alle Zellen
                   gleichzeitig, Torus. Die Gewichte summieren sich zu 1, das Gesamtpotential bleibt erhalten.
     3. dev_Cell – jede unentwickelte Zelle mit entwickelter Moore-Nachbarschaft (gewichtete Summe Σ w_k D_k > 0, w = 2 orthogonal,
                   1 diagonal) kristallisiert, wenn P_i ≤ U · (1 + δ · ε) + θ · (Σ w_k D_k − ς · Σ D_k), ε zufällig in [−1, 1).
                   Alle Entscheidungen gleichzeitig; neue Zellen: D = 1, P = P + 1 (freiwerdende Wärme).
   P lässt sich als Temperatur lesen: Unterschreitet sie den Unterkühlungswert U („undercooling threshold“), kristallisiert die Zelle.
   Feld: ZeichenPanel 404 × 404 px, cellScal 4 → 101 × 101 Zellen, Torus, eine Saat in (50, 50) oder vier zufällige Saaten. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const S = 101, MITTE = 50, HALT = 999;     // If steps = 999 Then Timer1.enabled := false

  /** Voreinstellungen wie im Original (CellForm.dfm): E_thresh 0,09, E_interf 0,02, E_noise 0,4, E_iterate 5, E_multi 2,
      E_interEff 1,5, E_diffEff 1,0, E_death 500, Cb_aging/Cb_rand/Cb_Field aus */
  const STANDARD = { U: 0.09, theta: 0.02, delta: 0.4, T: 5, xi: 1.0, zeta: 1.5, multi: 2, aging: false, death: 500,
                     zufallsSaat: false, nurFeld: false, verlauf: true };

  /** Moore-Nachbarn in der Reihenfolge von checkPot/checkNei: 4 orthogonale, dann 4 diagonale, Torus */
  const NB = new Int32Array(8 * S * S);
  const D8 = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, -1], [-1, 1]];   // [dK, dI]
  for (let i = 0; i < S; i++) for (let k = 0; k < S; k++)
    D8.forEach(([dk, di], v) => { NB[8 * (i * S + k) + v] = ((i + di + S) % S) * S + (k + dk + S) % S; });

  /** setupCells: P = 0, D = 0; eine Saat in der Mitte (P = 1, D = 1) oder vier zufällige (random seed) */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param), N = S * S;
    const z = { t: 0, zufall, S, breite: S, hoehe: S, state: new Uint8Array(N), pot: new Float64Array(N), limbo: new Float64Array(N),
                neu: new Uint8Array(N), birth: new Int32Array(N), age: new Int32Array(N), anzahl: 0, verlauf: [],
                T: Math.max(2, Math.round(p.T)), xi: p.xi, zeta: p.zeta };       // wie im Original nur beim Setup gelesen
    const saat = n => { z.state[n] = 1; z.pot[n] = 1; };
    if (p.zufallsSaat) for (let j = 0; j < 4; j++) { const k = zufall.ganz(S), i = zufall.ganz(S); saat(i * S + k); }
    else saat(MITTE * S + MITTE);
    z.anzahl = zaehle(z); z.verlauf.push(z.anzahl);
    return z;
  }
  const zaehle = z => { let a = 0; for (let n = 0; n < z.state.length; n++) a += z.state[n]; return a; };

  /** 1. ageCheck: nur mit aging; nur entwickelte Zellen altern (siehe QUELLE.md) */
  function altern(z, p) {
    if (!p.aging) return;
    const s = z.state;
    for (let n = 0; n < s.length; n++) {
      if (!s[n]) continue;
      z.age[n] = z.t - z.birth[n];
      if (z.age[n] > p.death) { z.age[n] = 0; z.pot[n] = 0; s[n] = 0; }
    }
  }

  /** 2. equiPot (ein Durchgang): P += ξ / (T − 1) · Σ w (P_k − P_i), gleichzeitig */
  function ausgleich(z) {
    const pot = z.pot, L = z.limbo, N = pot.length, f = z.xi / (z.T - 1);
    for (let n = 0; n < N; n++) {
      const a = pot[n], b = 8 * n; let l = 0;
      for (let v = 0; v < 4; v++) l += (1 / 6) * (pot[NB[b + v]] - a);
      for (let v = 4; v < 8; v++) l += (1 / 12) * (pot[NB[b + v]] - a);
      L[n] = l;
    }
    for (let n = 0; n < N; n++) pot[n] += f * L[n];
  }

  /** checkNei: gewichtete Summe der entwickelten Nachbarn (orthogonal 2, diagonal 1) und ihre Zahl nrD */
  function nachbarn(z, n) {
    const s = z.state, b = 8 * n; let summe = 0, nrD = 0;
    for (let v = 0; v < 8; v++) if (s[NB[b + v]] === 1) { nrD++; summe += v < 4 ? 2 : 1; }
    return { summe, nrD };
  }

  /** Schwelle der Kristallisation: U · (1 + δ · ε) + θ · (Σ w_k D_k − ς · nrD), ε = 2 · random − 1 */
  const schwelle = (p, zeta, summe, nrD, eps) => p.U * (1 + p.delta * eps) + p.theta * (summe - nrD * zeta);

  /** 3. dev_Cell: alle Randzellen prüfen (eine Zufallszahl je Randzelle, zeilenweise), dann gleichzeitig entwickeln */
  function entwickle(z, p) {
    const s = z.state, pot = z.pot, neu = z.neu; let k = 0;
    for (let n = 0; n < s.length; n++) {
      if (s[n]) continue;
      const { summe, nrD } = nachbarn(z, n);
      if (summe > 0 && pot[n] <= schwelle(p, z.zeta, summe, nrD, z.zufall() * 2 - 1)) { neu[n] = 1; k++; }
    }
    if (k) for (let n = 0; n < s.length; n++) if (neu[n]) { s[n] = 1; pot[n] += 1; z.birth[n] = z.t; z.age[n] = 0; neu[n] = 0; }
    return k;
  }

  /** Ein Schritt (Timer1Timer): ageCheck, (T − 1) × equiPot, dev_Cell, Zählen */
  function schritt(z, p) {
    altern(z, p);
    for (let i = 0; i < z.T - 1; i++) ausgleich(z);
    entwickle(z, p);
    z.anzahl = zaehle(z); z.verlauf.push(z.anzahl);
    z.t++;
    return z;
  }

  /** Grauwert des Originals (paint_Field): entwickelt 255 − 0,5 · Alter, sonst 255 · multi · P. Werte über 255 laufen wie in
      Delphis RGB(Byte) über (mod 256) – so markiert „pot. multi“ das Potentialfeld mit Höhenlinien. */
  function grau(z, n, p) {
    let g = z.state[n] && !p.nurFeld ? 255 - Math.round(0.5 * z.age[n]) : Math.round(255 * p.multi * z.pot[n]);
    g %= 256; return g < 0 ? g + 256 : g;
  }

  /** Gesamtpotential (entire potential) */
  function gesamtpotential(z) { let s = 0; for (let n = 0; n < z.pot.length; n++) s += z.pot[n]; return s; }

  /** U, θ, δ, pot. multi, aging, die at age, just the field wirken im nächsten Schritt (das Original liest sie in jedem Schritt);
      iteration steps T, diffusion const. ξ und interface const. ς liest es nur beim Setup – sie setzen zurück. */
  function aendere() {}

  return { STANDARD, HALT, S, MITTE, NB, erzeuge, altern, ausgleich, nachbarn, schwelle, entwickle, schritt, grau, gesamtpotential, aendere };
});
