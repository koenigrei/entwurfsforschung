/* Wachstum im Diffusionsfeld · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 31_diffusionGrowth (Delphi 2005, Reinhard König, Projekt ZA03_diffusion, Unit CellForm.pas, 01.03.2006).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (TForm1.Timer1Timer, je Schritt in dieser Reihenfolge):
     1. ageCheck   – nur mit „activate aging“: Alter = Schritt − Geburt; älter als „die with age“ → Zelle stirbt (D = 0, P = 0).
     2. infl_Field – Sphere of Influence: Jede Zelle, die weiter als rDist + R · cellScal Bildpunkte von der Mitte entfernt ist,
                     bekommt das Potential P = 1 (rDist = größte Entfernung einer entwickelten Zelle).
     3. equiPot    – zweimal: Jede unentwickelte Zelle erhält den Mittelwert der vier von-Neumann-Nachbarn,
                     P_i(t+1) = Σ P_k(t) / 4 (alle gleichzeitig, Torus); entwickelte Zellen haben P = 0.
     4. dev_Cell   – genau eine Zelle wird entwickelt: unter allen unentwickelten Zellen mit mindestens einem entwickelten
                     von-Neumann-Nachbarn die mit dem größten P + ε, ε = random · noise.
   Feld wie im Original: ZeichenPanel 404 × 404 px, cellScal 4 → 101 × 101 Zellen, Saat in Zelle (50, 50), Rand als Torus.
   Entfernungen in Bildpunkten des Originals (gerundet), damit R und rDist dieselben Zahlen haben wie dort. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const S = 101;            // round(404 / cellScal)
  const ZELLE = 4;          // cellScal (Bildpunkte je Zelle)
  const MITTE = 50;         // round(101 / 2) = 50 (Delphi rundet x,5 zur geraden Zahl); cellList[50,50] ist auch Bezug für dist

  /** Voreinstellungen wie im Original (CellForm.dfm: E_dist 20, E_Noise 5, Cb_aging aus, E_death 500) */
  const STANDARD = { R: 20, noise: 5, aging: false, death: 500, verlauf: false };

  /** Nachbarn je Zelle in der Reihenfolge von checkNei/checkPot: (K, I+1), (K, I−1), (K+1, I), (K−1, I), Torus */
  const NB = new Int32Array(4 * S * S);
  for (let i = 0; i < S; i++) for (let k = 0; k < S; k++) {
    const n = i * S + k, o = (i + 1) % S, u = (i - 1 + S) % S, r = (k + 1) % S, l = (k - 1 + S) % S;
    NB[4 * n] = o * S + k; NB[4 * n + 1] = u * S + k; NB[4 * n + 2] = i * S + r; NB[4 * n + 3] = i * S + l;
  }
  /** Entfernung jeder Zelle zur Mitte in Bildpunkten (CalcDistance: Round(sqrt(dx² + dy²)) der Zellmitten) */
  const DIST = new Int32Array(S * S);
  for (let i = 0; i < S; i++) for (let k = 0; k < S; k++) DIST[i * S + k] = Math.round(ZELLE * Math.hypot(k - MITTE, i - MITTE));

  /** setupCells: alle Zellen D = 0, P = 0; eine Saat in der Mitte; rDist := cellScal */
  function erzeuge(param, zufall) {
    const N = S * S;
    const z = { t: 0, zufall, S, breite: S, hoehe: S, state: new Uint8Array(N), pot: new Float64Array(N), limbo: new Float64Array(N),
                birth: new Int32Array(N), age: new Int32Array(N), rDist: ZELLE, anzahl: 1, verlauf: [1], letzte: -1 };
    z.state[MITTE * S + MITTE] = 1;
    return z;
  }

  /** Zahl der entwickelten von-Neumann-Nachbarn (checkNei: sumState) */
  function nachbarn(z, n) {
    const s = z.state;
    return s[NB[4 * n]] + s[NB[4 * n + 1]] + s[NB[4 * n + 2]] + s[NB[4 * n + 3]];
  }

  /** 1. ageCheck: nur mit aging; nur entwickelte Zellen altern (siehe QUELLE.md) */
  function altern(z, p) {
    if (!p.aging) return;
    const s = z.state, death = p.death;
    for (let n = 0; n < s.length; n++) {
      if (!s[n]) continue;
      z.age[n] = z.t - z.birth[n];
      if (z.age[n] > death) { z.age[n] = 0; z.pot[n] = 0; s[n] = 0; }
    }
  }

  /** 2. infl_Field: P = 1 außerhalb der Sphere of Influence (dist > rDist + R · cellScal) */
  function einfluss(z, p) {
    const g = z.rDist + p.R * ZELLE, pot = z.pot;
    for (let n = 0; n < pot.length; n++) if (DIST[n] > g) pot[n] = 1;
  }

  /** 3. equiPot (ein Durchgang): unentwickelte Zellen ← Mittel der vier Nachbarn, gleichzeitig; entwickelte P = 0 */
  function ausgleich(z) {
    const pot = z.pot, L = z.limbo, s = z.state;
    for (let n = 0; n < pot.length; n++) {
      L[n] = s[n] ? 0 : (pot[NB[4 * n]] + pot[NB[4 * n + 1]] + pot[NB[4 * n + 2]] + pot[NB[4 * n + 3]]) / 4;
    }
    pot.set(L);
  }

  /** 4. dev_Cell: Randzelle mit größtem P + random · noise wird entwickelt (Zeilen von oben, Spalten von links; bei
      Gleichstand gewinnt die erste). Gibt den Index zurück oder −1, wenn es keine Randzelle gibt. */
  function entwickle(z, p) {
    const s = z.state, pot = z.pot;
    let max = -1, best = -1;
    for (let n = 0; n < s.length; n++) {
      if (s[n] || nachbarn(z, n) < 1) continue;
      const w = pot[n] + z.zufall() * p.noise;
      if (w > max) { max = w; best = n; }
    }
    if (best < 0) return -1;
    s[best] = 1; pot[best] = 0; z.limbo[best] = 0; z.birth[best] = z.t; z.age[best] = 0;
    if (DIST[best] > z.rDist) z.rDist = DIST[best];
    return best;
  }

  /** Ein Schritt (Timer1Timer): ageCheck, infl_Field, 2 × equiPot, dev_Cell, Zählen (paint_Field/plot) */
  function schritt(z, p) {
    altern(z, p);
    einfluss(z, p);
    ausgleich(z); ausgleich(z);
    z.letzte = entwickle(z, p);
    let a = 0; for (let n = 0; n < z.state.length; n++) a += z.state[n];
    z.anzahl = a; z.verlauf.push(a);
    z.t++;
    return z;
  }

  /** Grauwert des Originals 0…255 (paint_Field): entwickelt 0,5 · Alter (schwarz), sonst (P + 0,5) · 170 */
  function grau(z, n) {
    const g = z.state[n] ? Math.round(0.5 * z.age[n]) : Math.round((z.pot[n] + 0.5) * 170);
    return g < 0 ? 0 : g > 255 ? 255 : g;
  }

  /** Kennzahlen (neu): Clusterradius in Zellen (rDist / cellScal) und Dichte = entwickelte Zellen / Kreisfläche mit diesem Radius
      (kompakter Haufen ≈ 1, verästelte, lineare Strukturen deutlich kleiner) */
  function auswertung(z) {
    const r = z.rDist / ZELLE;
    return { radius: r, dichte: Math.min(1, z.anzahl / (Math.PI * r * r)) };
  }

  /** Alle Parameter wirken ab dem nächsten Schritt (das Original liest die Eingabefelder in jedem Schritt) */
  function aendere() {}

  return { STANDARD, S, ZELLE, MITTE, NB, DIST, erzeuge, nachbarn, altern, einfluss, ausgleich, entwickle, schritt, grau, auswertung, aendere };
});
