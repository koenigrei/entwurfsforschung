/* Active Walker · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 40_activeWalker („Active Walker“ 1.0, Delphi, Reinhard König, 03.06.2006) mit 41_multiWalker
   („Active Walker“ 1.1, 04.06.2006: Diffusion, Noise, mehrere Walker) als Fassung.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (CellForm.pas, agenten.pas, Calcer.pas):
     Landscape Rule (calcCellDist): jede Zelle i erhält in jedem Schritt mark_i += √(dScale · d_ij), d_ij = gerundeter
       Abstand (in Pixeln = Zellgröße · Zellen, im Torus) zur Zelle j des Walkers; in 1.1 vorher die Diffusion
       (Calcer.diffuse): mark_i += (Σ Moore-Nachbarn / 8) · diffusion strength.
     Stepping Rule (checkArea, TAgent.ChangeHeading): der Walker betrachtet die Nachbarzellen im Sichtfeld
       heading ± angle threshold (Sektoren zu 45°) und geht per „hill climbing“ zur Zelle mit dem höchsten mark – der am
       schlechtesten erreichbaren. Liegt die Summe der betrachteten Werte nicht über 3, läuft er zufällig (random walk).
     1.1: nach jedem Schritt wird das Minimum abgezogen (TCell.Paint: mark := mark − minM).
   Feld: Zeichenfläche 404 px, Zellgröße 4 px → round(404 / 4) = 101 × 101 Zellen, Torus. Zeilen von oben nach unten,
   y wächst nach unten wie im Delphi-Canvas; heading in Grad, 0° = Osten, im Uhrzeigersinn (arcTan2(dY, dX)). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const PANEL = 404;                                          // ZeichenPanel.Width/Height
  const DEG = 3.141592654 / 180, RAD = 180 / 3.141592654;     // Konstanten wie im Original (Pi auf 9 Stellen)
  const GRENZE = Math.pow(2, 900), STAUCHUNG = Math.pow(2, -600);

  /** Voreinstellungen 40_activeWalker (1.0, CellForm.dfm) */
  const STANDARD = {
    fassung: "1.0", anzahl: 1, zellgroesse: 4, horizon: 157, wiggle: 0, methode: "hill",
    diffusion: 0, noise: 0, dScale: 0.01, spur: true
  };
  /** Voreinstellungen 41_multiWalker (1.1, CellForm.dfm: Edit_anzAg 10, E_diffuse 0,04, E_noise 4, E_dScale 0,1) */
  const MULTI = { anzahl: 10, horizon: 157, wiggle: 0, diffusion: 0.04, noise: 4, dScale: 0.1 };

  /** Delphis Round: bei genau ,5 zur geraden Zahl (Banker's Rounding) */
  function rundeD(x) {
    const f = Math.floor(x), r = x - f;
    if (r > 0.5) return f + 1;
    if (r < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  }
  const zg = v => Math.min(10, Math.max(1, Math.round(v)));   // Edit_sizeChange: 1 … 10
  /** Anzahl der Zellen je Richtung: spalt := round(ZeichenPanel.Width / cellScal) */
  const zellen = v => rundeD(PANEL / zg(v));

  /** angelBorder: einmal ±360 */
  function winkelRand(a) { if (a < 0) a += 360; if (a > 360) a -= 360; return a; }
  /** case round(comper) of 0..45: 1; 46..90: 2; … 316..360: 8 */
  function sektor(a) { const r = rundeD(a); return r <= 45 ? 1 : Math.min(8, Math.ceil(r / 45)); }
  /** Nachbarzelle je Sektor (checkArea): 1 = (1, 1) … 8 = (1, 0) */
  const NACHBAR = [null, [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]];

  /** Sichtfeld (checkArea): Sektoren von heading − horizon − 22,5 bis heading + horizon − 22,5, im Kreis.
      Fallen Anfang und Ende in denselben Sektor (z. B. horizon 180), bleibt nur eine Zelle – wie im Original. */
  function sichtfeld(heading, horizon) {
    const von = sektor(winkelRand(heading - horizon - 22.5)), bis = sektor(winkelRand(heading + horizon - 22.5));
    const liste = []; let nr = von - 1;
    do { nr++; if (nr > 8) nr = 1; liste.push(nr); } while (nr !== bis);
    return liste;
  }

  /** gefalteter Abstand im Torus (distance-torus measure in calcCellDist) */
  const falte = (d, n) => { d = Math.abs(d); return d > n / 2 ? n - d : d; };
  /** Tabelle √(dScale · round(Zellgröße · Abstand)) je gefaltetem Versatz (|dx|, |dy|) */
  function tabelle(z, dScale) {
    const H1 = z.H + 1, T = new Float64Array(H1 * H1);
    for (let dy = 0; dy < H1; dy++) for (let dx = 0; dx < H1; dx++)
      T[dy * H1 + dx] = Math.sqrt(dScale * Math.round(z.zg * Math.sqrt(dx * dx + dy * dy)));
    z.T = T; z.dScale = dScale;
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const N = zellen(p.zellgroesse), n = Math.max(1, Math.round(p.anzahl));
    const z = { t: 0, zufall, fassung: p.fassung, zg: zg(p.zellgroesse), N, H: Math.floor(N / 2), breite: N, hoehe: N,
                mark: new Float64Array(N * N), limbo: new Float64Array(N * N), begangen: new Uint8Array(N * N),
                n, x: new Int32Array(n), y: new Int32Array(n), h: new Int32Array(n), falteX: new Int32Array(N),
                maxM: 0.1, minM: 0, gestaucht: 0 };
    tabelle(z, p.dScale);
    for (let k = 0; k < n; k++) {
      if (p.fassung === "1.0") { const m = N > 50 ? 50 : N >> 1; z.x[k] = m; z.y[k] = m; }   // onCell := (50, 50)
      else { z.x[k] = zufall.ganz(N); z.y[k] = zufall.ganz(N); }                           // random(reih), random(spalt)
      z.h[k] = zufall.ganz(360);                                                           // Heading := random(360)
    }
    return z;
  }

  /** Diffusion (Calcer.diffuse): erst alle Nachbarsummen (limboWorld), dann mark += Σ8 / 8 · d */
  function diffundiere(z, d) {
    const N = z.N, m = z.mark, L = z.limbo;
    for (let i = 0; i < N; i++) {
      const o = (i === 0 ? N - 1 : i - 1) * N, u = (i === N - 1 ? 0 : i + 1) * N, r = i * N;
      for (let k = 0; k < N; k++) {
        const l = k === 0 ? N - 1 : k - 1, re = k === N - 1 ? 0 : k + 1;
        L[r + k] = m[o + l] + m[o + k] + m[o + re] + m[r + l] + m[r + re] + m[u + l] + m[u + k] + m[u + re];
      }
    }
    const f = d / 8;
    for (let c = 0; c < m.length; c++) m[c] += L[c] * f;
  }

  /** Landscape Rule (calcCellDist) für einen Walker auf Zelle (wx, wy) */
  function landschaft(z, wx, wy) {
    const N = z.N, H1 = z.H + 1, m = z.mark, T = z.T, fx = z.falteX;
    for (let k = 0; k < N; k++) fx[k] = falte(wx - k, N);
    for (let i = 0; i < N; i++) {
      const b = falte(wy - i, N) * H1, r = i * N;
      for (let k = 0; k < N; k++) m[r + k] += T[b + fx[k]];
    }
  }

  /** findMaxMin (maxM beginnt bei 0,1) */
  function maxMin(z) {
    let mx = 0.1, mn = Infinity; const m = z.mark;
    for (let c = 0; c < m.length; c++) { const v = m[c]; if (v > mx) mx = v; if (v < mn) mn = v; }
    z.maxM = mx; z.minM = mn;
  }

  const _w = new Float64Array(8);
  /** Stepping Rule für Walker k: checkArea, TAgent.ChangeHeading, dann ein Schritt (calcAgents) */
  function bewegeWalker(z, p, k) {
    const r = z.zufall, N = z.N, horizon = Math.round(p.horizon), wiggle = Math.round(p.wiggle);
    const liste = sichtfeld(z.h[k], horizon);
    let summe = 0;
    for (let j = 0; j < liste.length; j++) {                     // checkArea: wList = mark + noise, sumChem = Σ
      const nb = NACHBAR[liste[j]], noise = p.noise ? p.noise * (r() - 0.5) : 0;
      const cx = (z.x[k] + nb[0] + N) % N, cy = (z.y[k] + nb[1] + N) % N;
      _w[j] = z.mark[cy * N + cx] + noise; summe += _w[j];
    }
    let dx, dy, h = z.h[k];
    if (summe > 3) {                                             // threshold of chemicals in the neighbourhood
      let wahl = 0;
      if (p.methode === "roulette") {                            // method 1 (im Original abgeschaltet)
        const rnd = r.ganz(100); let s = 0;
        for (let j = 0; j < liste.length; j++) { s += _w[j] / summe * 100; wahl = j; if (s >= rnd) break; }
      } else {                                                   // method 2: hill climbing, erste Zelle mit dem Höchstwert
        let max = 0;
        for (let j = 0; j < liste.length; j++) { const g = _w[j] / summe * 100; if (g > max) { max = g; wahl = j; } }
      }
      [dx, dy] = NACHBAR[liste[wahl]];
      h = rundeD(Math.atan2(dy, dx) * RAD);
      h += r.ganz(wiggle + 1) * (r.ganz(2) * 2 - 1);             // random(wiggle + 1) · (random(2) · 2 − 1)
    } else {                                                     // random walk: heading ± random(angle threshold + 1)
      h += r.ganz(horizon + 1) * (r.ganz(2) * 2 - 1);
      dx = rundeD(Math.cos(h * DEG)); dy = rundeD(Math.sin(h * DEG));
    }
    if (h < 0) h += 360;
    if (h > 360) h -= 360;
    z.h[k] = h;
    z.x[k] = (z.x[k] + dx + N) % N; z.y[k] = (z.y[k] + dy + N) % N;
  }

  /** Ein Schritt (calculate). 1.0: calcCellDist (nur der erste Walker), repaintAll, calcAgents.
      1.1: diffuse, calcCellDist (alle Walker), findMaxMin, repaintAll (mark − minM), calcAgents. */
  function schritt(z, p) {
    const N = z.N;
    if (p.dScale !== z.dScale) tabelle(z, p.dScale);
    if (p.diffusion) diffundiere(z, p.diffusion);
    const zaehlen = z.fassung === "1.0" ? 1 : z.n;
    for (let k = 0; k < zaehlen; k++) { z.begangen[z.y[k] * N + z.x[k]] = 1; landschaft(z, z.x[k], z.y[k]); }
    maxMin(z);
    if (z.fassung !== "1.0") {                                   // TCell.Paint (1.1): mark := mark − minM
      const m = z.mark, mn = z.minM;
      for (let c = 0; c < m.length; c++) m[c] -= mn;
      z.maxM = Math.max(0.1, z.maxM - mn); z.minM = 0;
    }
    if (z.maxM > GRENZE) {                                       // Überlauf vermeiden (QUELLE.md): exakt mit 2^−600 stauchen
      const m = z.mark; for (let c = 0; c < m.length; c++) m[c] *= STAUCHUNG;
      z.maxM *= STAUCHUNG; z.minM *= STAUCHUNG; z.gestaucht++;
    }
    for (let k = 0; k < z.n; k++) bewegeWalker(z, p, k);
    z.t++;
    return z;
  }

  /** Dunkelwert 0 (weiß, gut erreichbar) … 255 (schwarz, schlecht erreichbar) wie TCell.Paint: 1.0 round, 1.1 ceil */
  function dunkel(z, mark) {
    const s = z.maxM - z.minM, t = s > 0 ? (mark - z.minM) * 255 / s : 0;
    const c = z.fassung === "1.0" ? rundeD(255 - t) : Math.ceil(255 - t);
    return 255 - (c < 0 ? 0 : c > 255 ? 255 : c);
  }

  /** Kennzahlen (neu): Anteil begangener Zellen, Abstand von Walker 1 zur Zelle mit dem höchsten mark (seinem „Ziel“),
      mittlerer Abstand jedes Walkers zum nächsten anderen (Cluster) – Abstände in Zellen im Torus */
  function auswertung(z) {
    let beg = 0, mx = -Infinity, ziel = 0;
    const m = z.mark, N = z.N;
    for (let c = 0; c < m.length; c++) { beg += z.begangen[c]; if (m[c] > mx) { mx = m[c]; ziel = c; } }
    const ab = (x1, y1, x2, y2) => Math.hypot(falte(x1 - x2, N), falte(y1 - y2, N));
    let nn = 0;
    for (let a = 0; a < z.n; a++) {
      let best = Infinity;
      for (let b = 0; b < z.n; b++) if (a !== b) { const d = ab(z.x[a], z.y[a], z.x[b], z.y[b]); if (d < best) best = d; }
      nn += best;
    }
    return { begangen: beg / (N * N), ziel: ab(z.x[0], z.y[0], ziel % N, Math.floor(ziel / N)),
             naechster: z.n > 1 ? nn / z.n : null, spanne: z.maxM - z.minM };
  }

  /** distance scaling wirkt ohne Neustart (Tabelle neu); die übrigen Regler im nächsten Schritt */
  function aendere(z, p, id) { if (id === "dScale") tabelle(z, p.dScale); }

  return { STANDARD, MULTI, PANEL, rundeD, zellen, winkelRand, sektor, NACHBAR, sichtfeld, falte, tabelle,
           erzeuge, diffundiere, landschaft, maxMin, bewegeWalker, schritt, dunkel, auswertung, aendere };
});
