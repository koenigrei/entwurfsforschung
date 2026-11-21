/* Krugmans Modell · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 26_Krugman_Model (Delphi, Dezember 2005, Reinhard König) aus dem „Laboratorium für räumliche Prozesse“,
   nach P. R. Krugman (1996): The Self-Organizing Economy; vgl. M. Batty: Cities and Complexity, Kapitel 1.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   24 Orte auf einem Kreis (CellForm.pas, CreateRaster). Je Schritt (calcCells):
     Potential   V_i = K1 · Σ_k P_k · e^(−α · d_ki) − K2 · Σ_k P_k · e^(−β · d_ki)   (zentripetal − zentrifugal)
     Mittel      V̄  = Σ_i P_i · V_i / 24
     Bevölkerung P_i ← Wachstum · (P_i + (V_i − V̄) · P_i)
   d_ki = Entfernung der Orte auf dem Einheitskreis. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const N = 24;                       // nCells
  const MITTE = 200, RADIUS = 100;    // Orte bei round(sin · 100 + 200), round(cos · 100 + 200) im 404 × 404 großen ZeichenPanel
  const KURVE_ALLE = 1000;            // Diagramm: ein Profil alle 1000 Schritte (ticks = 1000)
  const KURVEN_MAX = 38;              // graphTick > 970 → Diagramm voll (≈ 38 Profile zu je 25 Punkten)

  /** Voreinstellungen wie im Original (CellForm.dfm: E_K1 0,2; E_K2 1,0; E_alpha 0,3; E_beta 0,05; E_growth 2,0) */
  const STANDARD = { k1: 0.2, k2: 1.0, alpha: 0.3, beta: 0.05, wachstum: 2.0 };

  /** Lage der Orte in Bildpunkten (gerundet wie im Original) */
  const ORTE = Array.from({ length: N }, (_, i) => {
    const w = i * 2 * Math.PI / N;
    return { x: Math.round(Math.sin(w) * RADIUS + MITTE), y: Math.round(Math.cos(w) * RADIUS + MITTE) };
  });
  /** Entfernungen auf dem Einheitskreis aus den gerundeten Lagen (setDist) */
  const DIST = ORTE.map(a => ORTE.map(b => Math.hypot((a.x - b.x) / 100, (a.y - b.y) / 100)));

  /** Potentiale aller Orte; liefert {v, v1, v2} (zentripetal K1·Σ, zentrifugal K2·Σ, Potential = Differenz) */
  function potentiale(P, p) {
    const v = new Float64Array(N), v1 = new Float64Array(N), v2 = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      let s1 = 0, s2 = 0;
      for (let k = 0; k < N; k++) { s1 += P[k] * Math.exp(-p.alpha * DIST[k][i]); s2 += P[k] * Math.exp(-p.beta * DIST[k][i]); }
      v1[i] = p.k1 * s1; v2[i] = p.k2 * s2; v[i] = v1[i] - v2[i];
    }
    return { v, v1, v2 };
  }

  /** mittleres Potential – wie im Original durch die Zahl der Orte geteilt (nicht durch die Bevölkerung) */
  function mittel(P, v) { let s = 0; for (let i = 0; i < N; i++) s += P[i] * v[i]; return s / N; }

  /** Startverteilung (setupCells): 23 Orte zufällig in [0, 2/24), der letzte bekommt den Rest bis 1; ist er negativ, neu würfeln */
  function startverteilung(zufall) {
    for (;;) {
      const P = new Float64Array(N); let s = 0;
      for (let i = 0; i < N - 1; i++) { P[i] = zufall() * 2 / N; s += P[i]; }
      P[N - 1] = 1 - s;
      if (P[N - 1] >= 0) return P;
    }
  }

  function erzeuge(param, zufall) {
    const z = { t: 0, zufall, P: startverteilung(zufall), V: new Float64Array(N), mittel: 0, kurven: [] };
    z.V = potentiale(z.P, Object.assign({}, STANDARD, param)).v;
    z.kurven.push(Array.from(z.P));                                  // ticks := 999 → erstes Profil nach Schritt 1; hier schon der Anfang
    return z;
  }

  function schritt(z, p) {
    const { v } = potentiale(z.P, p), m = mittel(z.P, v);
    for (let i = 0; i < N; i++) {
      const neu = p.wachstum * (z.P[i] + (v[i] - m) * z.P[i]);
      z.P[i] = neu > 0 ? neu : 0;                                     // Neu: keine negative Bevölkerung
    }
    z.V = v; z.mittel = m; z.t++;
    if (z.t % KURVE_ALLE === 0 && z.kurven.length < KURVEN_MAX) z.kurven.push(Array.from(z.P));
    return z;
  }

  /** Parameter wirken ab dem nächsten Schritt */
  function aendere(z, p) { z.V = potentiale(z.P, p).v; }

  /** Zentren: lokale Maxima auf dem Kreis mit mindestens 1 % der größten Bevölkerung */
  function zentren(P) {
    let max = 0; for (let i = 0; i < N; i++) if (P[i] > max) max = P[i];
    const Z = [];
    for (let i = 0; i < N; i++) {
      const l = P[(i + N - 1) % N], r = P[(i + 1) % N];
      if (P[i] >= 0.01 * max && P[i] > l && P[i] >= r) Z.push(i);
    }
    return Z;
  }

  const summe = P => P.reduce((s, v) => s + v, 0);

  return { STANDARD, N, ORTE, DIST, MITTE, RADIUS, KURVE_ALLE, KURVEN_MAX, potentiale, mittel, startverteilung,
           erzeuge, schritt, aendere, zentren, summe };
});
