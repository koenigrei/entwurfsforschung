/* Entropiemessung · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 27_entropyMeasure „1D CA with entropy measurement“ (Delphi, Januar/Februar 2006, Reinhard König).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (CellForm.pas):
   - Eindimensionaler zellulärer Automat mit D = 2 Zuständen, Nachbarschaft K = 3 (links, Zelle, rechts), N = 202 Zellen, Rand als Ring.
     Jede Zeile des Bildes ist ein Zeitschritt; die nächste Zeile entsteht aus der vorigen (checkNei, Timer1Timer).
   - Regelcode wie im Feld „Rule Code“: acht Ziffern für die Muster 111, 110, 101, 100, 011, 010, 001, 000
     (gleich der Wolfram-Nummer in Binärschreibweise, z. B. 00011110 = Regel 30).
   - Entropie jeder Zeile (plotEntropy) mit der Korrelationslänge X = 4: Häufigkeiten p der 2^4 = 16 Teilfolgen aus vier
     nebeneinanderliegenden Zellen (ringförmig), topologische Entropie S_top = 1/X · log2(Zahl der vorkommenden Teilfolgen),
     metrische Entropie S_met = −1/X · Σ p · log2 p; es gilt 0 ≤ S_met ≤ S_top ≤ 1 (nach A. W. Hübler 2002). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const N = 202;                    // round(404 / 2): ZeichenPanel 404 × 404 px, cellScal = 2 → 202 × 202 Zellen
  const X = 4;                      // Korrelationslänge
  /** Vordefinierte Regeln (CB_pre im Original) als Wolfram-Nummern */
  const VORLAGEN = ["10001000", "00000100", "01011010", "00010010", "00011110", "01101110", "01101000"].map(c => parseInt(c, 2));
  /** Voreinstellungen wie im Original (E_Rule „00011110“, „New Setup“ mit einer Zelle in der Mitte) */
  const STANDARD = { regel: 30, vorlage: "30", start: "mitte", verlauf: true };

  const code = r => (r >>> 0).toString(2).padStart(8, "0");
  /** neuer Zustand aus links, Zelle, rechts nach der Regelnummer (Muster 111 = Ziffer 1 des Codes = Bit 7) */
  const regelWert = (r, l, m, re) => (r >> (4 * l + 2 * m + re)) & 1;

  /** nächste Zeile aus der vorigen (Ring) */
  function naechsteZeile(alt, neu, r) {
    const n = alt.length;
    for (let k = 0; k < n; k++) neu[k] = regelWert(r, alt[k > 0 ? k - 1 : n - 1], alt[k], alt[k < n - 1 ? k + 1 : 0]);
    return neu;
  }

  /** topologische und metrische Entropie einer Zeile mit Korrelationslänge X (Teilfolgen ringförmig) */
  function entropie(zeile, x = X) {
    const n = zeile.length, zahl = new Array(1 << x).fill(0);
    for (let k = 0; k < n; k++) { let idx = 0; for (let l = 0; l < x; l++) idx = 2 * idx + zeile[(k + l) % n]; zahl[idx]++; }
    let arten = 0, met = 0;
    for (const c of zahl) if (c > 0) { const p = c / n; arten++; met += p * Math.log2(p); }
    return { topologisch: Math.log2(arten) / x, metrisch: met ? -met / x : 0 };
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, zufall, n: N, breite: N, hoehe: N, feld: new Uint8Array(N * N), zeile: 0, topologisch: [], metrisch: [], gerollt: 0 };
    if (p.start === "zufall") for (let k = 0; k < N; k++) z.feld[k] = zufall.ganz(2);   // „Random Setup“: random(2) in der ersten Zeile
    else z.feld[Math.round(N / 2)] = 1;                                                  // D_101(0) = 1
    merke(z);
    return z;
  }

  function merke(z) {
    const e = entropie(z.feld.subarray(z.zeile * N, (z.zeile + 1) * N));
    z.topologisch.push(e.topologisch); z.metrisch.push(e.metrisch);
  }

  /** Ein Zeitschritt = eine neue Zeile; am unteren Rand rollt das Bild um eine Zeile nach oben */
  function schritt(z, p) {
    const f = z.feld;
    if (z.zeile === N - 1) { f.copyWithin(0, N); z.gerollt++; }
    else z.zeile++;
    naechsteZeile(f.subarray((z.zeile - 1) * N, z.zeile * N), f.subarray(z.zeile * N, (z.zeile + 1) * N), p.regel | 0);
    merke(z);
    z.t++;
    return z;
  }

  /** Mittel der metrischen Entropie über alle Zeilen ab der ersten berechneten */
  function mittelMetrisch(z) {
    const m = z.metrisch; if (m.length < 2) return m[0] || 0;
    let s = 0; for (let i = 1; i < m.length; i++) s += m[i]; return s / (m.length - 1);
  }

  return { STANDARD, N, X, VORLAGEN, code, regelWert, naechsteZeile, entropie, erzeuge, schritt, mittelMetrisch };
});
