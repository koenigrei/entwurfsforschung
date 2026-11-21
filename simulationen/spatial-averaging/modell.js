/* Spatial Averaging · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 21_Spatial_Averaging (Delphi, 14.12.2005, Reinhard König) mit den Fassungen
   21_Averaging_Noise („Modell mit weißem Rauschen“, nur als .exe erhalten) und 22_Vicsek-Szalay (15.12.2005).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (CellForm.pas, TForm1.Timer1Timer und checkNei), nach M. Batty: Cities and Complexity, Kapitel 1:
     Anfang:          P_i(0) = −1 oder 1 (random(2) · 2 − 1)
     Mittelung (21):  P_i(t+1) = Σ_{j∈Ω_i} P_j(t) / 5            von-Neumann-Nachbarschaft einschließlich der Zelle, Torus, synchron
     Rauschen (22):   P_i(t+1) = Σ_{j∈Ω_i} P_j(t) / 5 + ε_i(t)   ε = −1 oder 1, je Zelle und Schritt neu
     Entwicklung (22): |P_i| > Schwellenwert (4,5) → Zelle gilt dauerhaft als entwickelt (weiß), auch wenn P_i wieder fällt. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  /** Fassungen: Feldgröße aus ZeichenPanel 404 px / cellScal (21: 6 px → 67 × 67, 22: 3 px → 135 × 135) */
  const FASSUNGEN = {
    mittelung: { n: 67, zelle: 6, rauschen: false, anzeige: "werte" },
    rauschen:  { n: 67, zelle: 6, rauschen: true,  anzeige: "werte" },
    vicsek:    { n: 135, zelle: 3, rauschen: true, anzeige: "entwickelt" }
  };
  /** Voreinstellungen wie im Original (21: ohne Rauschen; 22: Edit_thresh „4,5“) */
  const STANDARD = { fassung: "mittelung", rauschen: false, schwelle: 4.5, anzeige: "werte", verlauf: true };

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param), f = FASSUNGEN[p.fassung] || FASSUNGEN.mittelung;
    const n = f.n, z = { t: 0, zufall, n, zelle: f.zelle, breite: n * f.zelle, hoehe: n * f.zelle,
      wert: new Float64Array(n * n), neu: new Float64Array(n * n), entwickelt: new Uint8Array(n * n),
      maxIndex: -1, leer: false, verlauf: [], hoch: [], tief: [] };
    for (let i = 0; i < z.wert.length; i++) z.wert[i] = zufall.ganz(2) * 2 - 1;   // nur −1 und 1
    merke(z, hoechstwert(z.wert));
    return z;
  }

  /** Verlauf: maxP (größter Betrag mit Vorzeichen), dazu größter und kleinster Wert fürs Diagramm */
  function merke(z, h) {
    let hi = -Infinity, lo = Infinity; const w = z.wert;
    for (let j = 0; j < w.length; j++) { if (w[j] > hi) hi = w[j]; if (w[j] < lo) lo = w[j]; }
    z.verlauf.push(h.wert); z.hoch.push(hi); z.tief.push(lo);
  }

  /** Summe über Zelle, links, rechts, oben, unten (checkNei: neighb[0..4]), Rand als Torus */
  function neumannSumme(w, n, k, i) {
    const l = k > 0 ? k - 1 : n - 1, r = k < n - 1 ? k + 1 : 0, o = i < n - 1 ? i + 1 : 0, u = i > 0 ? i - 1 : n - 1;
    return w[i * n + k] + w[i * n + l] + w[i * n + r] + w[o * n + k] + w[u * n + k];
  }

  /** Wert mit dem größten Betrag (mit Vorzeichen) und seine Zelle – wie maxP im Original */
  function hoechstwert(w) {
    let m = 0, k = -1;
    for (let j = 0; j < w.length; j++) if (Math.abs(w[j]) > Math.abs(m)) { m = w[j]; k = j; }
    return { wert: m, index: k };
  }

  function schritt(z, p) {
    const w = z.wert, neu = z.neu, n = z.n, zu = z.zufall;
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
      let v = neumannSumme(w, n, k, i) / 5;
      if (p.rauschen) v += zu.ganz(2) * 2 - 1;                       // weißes Rauschen ε = ±1 (22: random(2) · 2 − 1)
      neu[i * n + k] = v;
    }
    w.set(neu);
    entwickle(z, p.schwelle);
    const h = hoechstwert(w);
    z.maxIndex = h.index; merke(z, h);
    z.leer = h.wert === 0;                                           // „Stop wenn alles 0“
    z.t++;
    return z;
  }

  /** Entwicklung: |P| > Schwellenwert markiert die Zelle dauerhaft (22: colr := 255, wenn colr = 0) */
  function entwickle(z, schwelle) {
    const w = z.wert, e = z.entwickelt;
    for (let j = 0; j < w.length; j++) if (!e[j] && Math.abs(w[j]) > schwelle) e[j] = 1;
  }

  /** Grauwert 0 … 255 wie im Original: 255 / (2 |max|) · (|max| + P) */
  function grau(v, max) {
    const a = Math.abs(max);
    return a > 0 ? Math.max(0, Math.min(255, Math.round(255 / (2 * a) * (a + v)))) : 128;
  }

  function auswertung(z) {
    const w = z.wert; let s = 0, q = 0, e = 0;
    for (let j = 0; j < w.length; j++) { s += w[j]; q += w[j] * w[j]; e += z.entwickelt[j]; }
    const m = s / w.length;
    const L = z.verlauf.length - 1;
    return { mittel: m, streuung: Math.sqrt(Math.max(0, q / w.length - m * m)), max: z.verlauf[L], hoch: z.hoch[L], tief: z.tief[L], entwickelt: e / w.length };
  }

  return { STANDARD, FASSUNGEN, erzeuge, schritt, neumannSumme, hoechstwert, entwickle, grau, auswertung };
});
