/* Rohrnetzberechnung im Browser (ohne DOM, in Node testbar) – gemeinsamer Löser der Apps „Wasserleitung“ und „Wassernetz“
   (die Datei liegt in beiden App-Ordnern gleich; Vorschlag: nach katalog/_gemeinsam/hydraulik.js verschieben).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie EPANET 2 (Rossman 2000, Anhang D; Quelltext MIT-lizenziert, https://github.com/OpenWaterAnalytics/EPANET):
   stationäre Berechnung eines Druckrohrnetzes mit dem Gradientenverfahren von Todini & Pilati (1988). Eigene Umsetzung,
   kein Code aus EPANET übernommen. Einheiten SI: Durchfluss m³/s, Höhen und Drücke in m Wassersäule, Längen und Durchmesser in m.

   Netz: knoten [{z, bedarf, behaelter?, kopf?}] – Verbraucher (Junctions) mit Geländehöhe z und Bedarf (m³/s), Behälter
   (Tanks) mit festem Wasserspiegel kopf = z + Füllhöhe; leitungen [{a, b, art: "rohr"|"pumpe", L, d, C, P}] – Rohre mit
   Hazen-Williams-Verlust (Rauheit C), Pumpen mit konstanter Leistung P (kW) in Richtung a → b. */
(function (wurzel, fabrik) {
  const H = fabrik();
  if (typeof module === "object" && module.exports) module.exports = H;
  else wurzel.Hydraulik = H;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FT = 0.3048, CFS = 0.028316846592, KW_JE_PS = 0.7457;
  /** Hazen-Williams-Exponent und Beiwert. EPANET rechnet in US-Einheiten h = 4.727 · C^-1.852 · d^-4.871 · L · q^1.852 (ft, cfs);
      umgerechnet auf SI ergibt das ≈ 10.67 (h in m, d und L in m, Q in m³/s). */
  const N_HW = 1.852, K_HW = 4.727 * Math.pow(FT, 4.871) / Math.pow(CFS, N_HW);
  /** Pumpe konstanter Leistung (EPANET „POWER“): Förderhöhe h = 8.814 · Leistung[PS] / q[cfs] ft → h[m] = K_PUMPE · P[kW] / Q[m³/s]
      (entspricht P / (ρ · g · Q) mit ρ · g ≈ 9.80 kN/m³) */
  const K_PUMPE = FT * 8.814 * CFS / KW_JE_PS;
  const RHO_G = 1 / K_PUMPE;                       // kN/m³ – für die Energie: kW = ρ g Q ΔH
  /** kleinste Steigung dh/dQ (EPANET RQtol = 1e-7 ft/cfs, in SI umgerechnet): darunter wird das Rohr linear behandelt (Q ≈ 0) */
  const G_MIN = 1e-7 * FT / CFS;
  /** kleinster Pumpendurchfluss für die Förderhöhe h = c / Q (sonst unendlich) */
  const Q_PUMPE_MIN = 1e-4;
  const GENAUIGKEIT = 0.001, MAX_ITER = 40;      // EPANET [OPTIONS] Accuracy 0.001, Trials 40 (wie in Testnet.inp)
  const WIRKUNGSGRAD = 0.75;                      // EPANET [ENERGY] Global Efficiency 75 % (nur für die Energie der Pumpe)

  /** Widerstandsbeiwert r eines Rohrs (h = r · |Q|^0.852 · Q) */
  const widerstand = (L, d, C) => K_HW * L / (Math.pow(C, N_HW) * Math.pow(d, 4.871));
  /** Druckverlust eines Rohrs mit Widerstand r bei Durchfluss Q (m, Vorzeichen wie Q) */
  const verlustHW = (r, Q) => r * Math.pow(Math.abs(Q), N_HW - 1) * Q;
  /** Förderhöhe einer Pumpe mit Leistung P (kW) bei Durchfluss Q (m³/s) */
  const foerderhoehe = (P, Q) => K_PUMPE * P / Math.max(Q, Q_PUMPE_MIN);
  const querschnitt = d => Math.PI * d * d / 4;

  /** Vorbereitung: Indizes der unbekannten Knoten, Widerstände, Anfangsdurchflüsse wie EPANET (1 ft/s in Rohren, 1 cfs in Pumpen).
      → Löserzustand S {n, zeile, Q, Hk, r, iter, fehler, verlauf, fertig} */
  function neu(netz) {
    const K = netz.knoten, L = netz.leitungen, zeile = new Int32Array(K.length).fill(-1);
    let n = 0;
    K.forEach((k, i) => { if (!k.behaelter) zeile[i] = n++; });
    const Q = new Float64Array(L.length), r = new Float64Array(L.length);
    L.forEach((l, k) => {
      if (l.art === "pumpe") { Q[k] = CFS; return; }
      const d = Math.max(l.d, 1e-3), Ln = Math.max(l.L, 1e-3);
      r[k] = widerstand(Ln, d, l.C);
      Q[k] = querschnitt(d) * FT;
    });
    const Hk = new Float64Array(K.length);
    K.forEach((k, i) => { Hk[i] = k.behaelter ? k.kopf : NaN; });
    return { n, zeile, Q, Hk, r, iter: 0, fehler: Infinity, verlauf: [], fertig: false, singulaer: false };
  }

  /** Steigung p = 1 / (dh/dQ) und Korrektur y = p · h einer Leitung beim Durchfluss Q (Todini & Pilati: Q_neu = Q − y + p · (H_a − H_b)) */
  function koeffizienten(l, r, Q, P) {
    if (l.art === "pumpe") {
      const q = Math.max(Q, Q_PUMPE_MIN), c = K_PUMPE * P;
      const h = -c / q, g = c / (q * q);             // Verlust = − Förderhöhe
      return { p: 1 / g, y: h / g };
    }
    let g = N_HW * r * Math.pow(Math.abs(Q), N_HW - 1), h;
    if (g < G_MIN) { g = G_MIN; h = g * Q; } else h = verlustHW(r, Q);
    return { p: 1 / g, y: h / g };
  }

  /** Cholesky-Zerlegung und Lösung von A x = b (A symmetrisch positiv definit, dicht n × n, wird überschrieben) */
  function cholesky(A, b, n) {
    let singulaer = false;
    for (let j = 0; j < n; j++) {
      let s = A[j * n + j];
      for (let k = 0; k < j; k++) s -= A[j * n + k] * A[j * n + k];
      if (!(s > 1e-300)) { singulaer = true; s = 1; }
      const d = Math.sqrt(s); A[j * n + j] = d;
      for (let i = j + 1; i < n; i++) {
        let t = A[i * n + j];
        for (let k = 0; k < j; k++) t -= A[i * n + k] * A[j * n + k];
        A[i * n + j] = t / d;
      }
    }
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) { let t = b[i]; for (let k = 0; k < i; k++) t -= A[i * n + k] * x[k]; x[i] = t / A[i * n + i]; }
    for (let i = n - 1; i >= 0; i--) { let t = x[i]; for (let k = i + 1; k < n; k++) t -= A[k * n + i] * x[k]; x[i] = t / A[i * n + i]; }
    return { x, singulaer };
  }

  /** Eine Iteration des Gradientenverfahrens: Gleichungssystem A H = F für die unbekannten Höhen aufstellen und lösen,
      dann alle Durchflüsse neu. Gibt die relative Änderung Σ|ΔQ| / Σ|Q| zurück (EPANET „relative error“). */
  function iteration(netz, S) {
    const K = netz.knoten, L = netz.leitungen, n = S.n, A = new Float64Array(n * n), F = new Float64Array(n);
    const P = new Float64Array(L.length), Y = new Float64Array(L.length);
    K.forEach((k, i) => { if (S.zeile[i] >= 0) F[S.zeile[i]] = -(k.bedarf || 0); });
    L.forEach((l, k) => {
      const c = koeffizienten(l, S.r[k], S.Q[k], l.P);
      P[k] = c.p; Y[k] = c.y;
      const ia = S.zeile[l.a], ib = S.zeile[l.b], rest = S.Q[k] - c.y;
      if (ia >= 0) { A[ia * n + ia] += c.p; F[ia] -= rest; if (ib < 0) F[ia] += c.p * S.Hk[l.b]; }
      if (ib >= 0) { A[ib * n + ib] += c.p; F[ib] += rest; if (ia < 0) F[ib] += c.p * S.Hk[l.a]; }
      if (ia >= 0 && ib >= 0) { A[ia * n + ib] -= c.p; A[ib * n + ia] -= c.p; }
    });
    const { x, singulaer } = cholesky(A, F, n);
    S.singulaer = S.singulaer || singulaer;
    K.forEach((k, i) => { if (S.zeile[i] >= 0) S.Hk[i] = x[S.zeile[i]]; });
    let dq = 0, sq = 0;
    L.forEach((l, k) => {
      let q = S.Q[k] - Y[k] + P[k] * (S.Hk[l.a] - S.Hk[l.b]);
      if (l.art === "pumpe" && q < 0) q = 0;          // Pumpe fördert nicht rückwärts (EPANET schließt sie dann)
      dq += Math.abs(q - S.Q[k]); sq += Math.abs(q); S.Q[k] = q;
    });
    S.iter++;
    S.fehler = sq > 0 ? dq / sq : dq;
    S.verlauf.push(S.fehler);
    if (S.fehler <= (netz.genauigkeit || GENAUIGKEIT) || S.iter >= (netz.maxIter || MAX_ITER)) S.fertig = true;
    return S.fehler;
  }

  /** ganz lösen (bis zur Genauigkeit oder höchstens maxIter Iterationen) */
  function loese(netz, S = neu(netz)) {
    while (!S.fertig) iteration(netz, S);
    return S;
  }

  /** Ergebnisse wie die Ausgaben von EPANET (Analyse Hydrology Network: Pipe Values, Node Values):
      knoten [{kopf (Hydraulic head, m), druck (Pressure, m), bedarf (Actual demand, L/s)}],
      leitungen [{q (Flow rate, L/s), v (Flow velocity, m/s), verlust (Head loss: Rohr m/km, Pumpe −Förderhöhe m), status (1 offen),
      C (Roughness), energie (Energy expended, kW)}] */
  function ergebnisse(netz, S) {
    const K = netz.knoten, L = netz.leitungen;
    const knoten = K.map((k, i) => ({ kopf: S.Hk[i], druck: S.Hk[i] - k.z, bedarf: (k.bedarf || 0) * 1000 }));
    L.forEach((l, k) => {
      if (K[l.a].behaelter) knoten[l.a].bedarf -= S.Q[k] * 1000;
      if (K[l.b].behaelter) knoten[l.b].bedarf += S.Q[k] * 1000;
    });
    const leitungen = L.map((l, k) => {
      const q = S.Q[k], dh = S.Hk[l.a] - S.Hk[l.b];
      if (l.art === "pumpe") return { q: q * 1000, v: 0, verlust: dh, status: 1, C: null, energie: Math.abs(dh) * Math.abs(q) * RHO_G / WIRKUNGSGRAD, foerderhoehe: -dh };
      const Ln = Math.max(l.L, 1e-3);
      return { q: q * 1000, v: Math.abs(q) / querschnitt(Math.max(l.d, 1e-3)), verlust: 1000 * Math.abs(dh) / Ln, status: 1, C: l.C, energie: Math.abs(dh) * Math.abs(q) * RHO_G };
    });
    return { knoten, leitungen };
  }

  /** Probe: Massenbilanz je Verbraucher (Zufluss − Abfluss − Bedarf, m³/s) – größter Betrag */
  function bilanzfehler(netz, S) {
    const b = new Float64Array(netz.knoten.length);
    netz.leitungen.forEach((l, k) => { b[l.a] -= S.Q[k]; b[l.b] += S.Q[k]; });
    let m = 0;
    netz.knoten.forEach((k, i) => { if (!k.behaelter) m = Math.max(m, Math.abs(b[i] - (k.bedarf || 0))); });
    return m;
  }

  return { N_HW, K_HW, K_PUMPE, RHO_G, G_MIN, Q_PUMPE_MIN, GENAUIGKEIT, MAX_ITER, WIRKUNGSGRAD,
           widerstand, verlustHW, foerderhoehe, querschnitt, neu, koeffizienten, cholesky, iteration, loese, ergebnisse, bilanzfehler };
});
