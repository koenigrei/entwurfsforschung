/* Agentenbasiertes Interaktionsmodell (Interaction Pattern) · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 320_AgInteraktModell („Interaction Patterns“ 1.0, Delphi, Reinhard König, 11.06.2006; gleicher
   Quellcode wie 42_interactionPatterns im Laboratorium für räumliche Prozesse).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (CellForm.pas, agenten.pas):
     Alle Agenten starten auf dem Ursprungsort (3 × 3 Zellen in der Mitte, blau) und erkunden das Feld (Modus 0).
     Erkunden (checkArea, ChangeHeading): Gewichte der Zellen im Sichtfeld heading ± angle threshold = Rückweg-
       markierung markB + Rauschen (minM + 1) · (random − 0,5). Ist die Summe > 0, wählt der Agent per hill climbing
       (oder roulette wheel) eine Zelle, ± wiggle; sonst random walk um ± angle threshold.
     Rückweg (Modus 1): heading = Richtung zum Ursprungsort ± random(return noise + 1), Schritt (round(cos), round(sin)).
     Jeder Agent erhöht markA der verlassenen Zelle um 10, auf dem Rückweg auch markB. Erreicht er einen Zielort
     (grün), kehrt er um; erreicht er den Ursprungsort, war er erfolgreich und erkundet wieder.
     Optional verfallen alle Markierungen je Schritt mit dem Faktor decay rate.
   Feld: 404 px / cell size 2 → 202 × 202 Zellen, Torus; y wächst nach unten, heading 0° = Osten, im Uhrzeigersinn. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const PANEL = 404, RAD = 180 / 3.141592654, DEG = 3.141592654 / 180;

  /** Voreinstellungen wie im Original (CellForm.dfm) */
  const STANDARD = {
    ziele: "zufall", anzahl: 800, zellgroesse: 2, horizon: 30, wiggle: 20, methode: "hill", noise: 30,
    decay: false, decayRate: 0.95, stopp: 10000, nurRueck: true, spuren: true, linien: false, gravScale: 5, agenten: true, verlauf: true
  };
  /** return noise je Zielanordnung (setDestinations setzt E_noise.Text) */
  const NOISE = { zufall: 30, kreis: 50, raster: 30 };

  function rundeD(x) { const f = Math.floor(x), r = x - f; return r > 0.5 ? f + 1 : r < 0.5 ? f : (f % 2 === 0 ? f : f + 1); }
  const zg = v => Math.min(10, Math.max(1, Math.round(v)));
  const zellen = v => rundeD(PANEL / zg(v));
  function winkelRand(a) { if (a < 0) a += 360; if (a > 360) a -= 360; return a; }
  function sektor(a) { const r = rundeD(a); return r <= 45 ? 1 : Math.min(8, Math.ceil(r / 45)); }
  const NACHBAR = [null, [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]];
  function sichtfeld(heading, horizon) {
    const von = sektor(winkelRand(heading - horizon - 22.5)), bis = sektor(winkelRand(heading + horizon - 22.5));
    const liste = []; let nr = von - 1;
    do { nr++; if (nr > 8) nr = 1; liste.push(nr); } while (nr !== bis);
    return liste;
  }

  /** setDestinations: zufall = 10 zufällige 3 × 3-Zielorte; kreis = alle Zellen weiter als 180 px von der Mitte;
      raster = 5 × 5 Zielorte im Raster. Liefert die Zielorte (Mitte in Zellen) und setzt zustand/zielNr der Zellen. */
  function setzeZiele(z, art) {
    const N = z.N, ziele = [], r = z.zufall;
    const block = (px, py, nr) => {
      for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) {
        const c = ((py + i + N) % N) * N + (px + k + N) % N; z.zustand[c] = 2; z.zielNr[c] = nr;
      }
    };
    if (art === "kreis") {                                       // calcCellDist: Dist in Pixeln zur Mittelzelle
      const m = rundeD(N / 2);
      for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) {
        const d = Math.round(z.zg * Math.hypot(k - m, i - m));
        if (d > 180) { const c = i * N + k; z.zustand[c] = 2; z.zielNr[c] = ziele.length; ziele.push([k, i]); }
      }
    } else if (art === "raster") {
      for (let i = 0; i < 5; i++) for (let k = 0; k < 5; k++) {
        const px = rundeD(k * (N / 5) + 0.5 * (N / 5)), py = rundeD(i * (N / 5) + 0.5 * (N / 5));
        block(px, py, ziele.length); ziele.push([px, py]);
      }
    } else {
      for (let m = 0; m < 10; m++) { const px = r.ganz(N), py = r.ganz(N); block(px, py, m); ziele.push([px, py]); }
    }
    return ziele;
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const N = zellen(p.zellgroesse), n = Math.max(1, Math.round(p.anzahl)), mitte = rundeD(N / 2);
    const z = { t: 0, zufall, N, breite: N, hoehe: N, zg: zg(p.zellgroesse), mitte,
                markA: new Float64Array(N * N), markB: new Float64Array(N * N), zustand: new Uint8Array(N * N), zielNr: new Int32Array(N * N),
                n, x: new Int32Array(n).fill(mitte), y: new Int32Array(n).fill(mitte), h: new Int32Array(n),
                modus: new Uint8Array(n), erfolg: new Uint8Array(n), ziel: new Int32Array(n),
                maxM: 0.1, minM: 0, verlauf: [], rueckkehr: 0 };
    for (let k = 0; k < n; k++) z.h[k] = zufall.ganz(360);       // setupAgents: Heading := random(360)
    z.ziele = setzeZiele(z, p.ziele);
    z.zahl = new Int32Array(z.ziele.length);                     // destiList[].numbers
    for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) z.zustand[((mitte + i + N) % N) * N + (mitte + k + N) % N] = 1;   // setOrigins
    maxMin(z, p);
    return z;
  }

  /** findMaxMin über markB („show only return tracks“) oder markA; maxM beginnt bei 0,1 */
  function maxMin(z, p) {
    const m = p.nurRueck ? z.markB : z.markA;
    let mx = 0.1, mn = Infinity;
    for (let c = 0; c < m.length; c++) { const v = m[c]; if (v > mx) mx = v; if (v < mn) mn = v; }
    z.maxM = mx; z.minM = mn;
  }

  const _w = new Float64Array(8);
  /** calcAgents für Agent k: checkArea, ChangeHeading, Schritt, Markierung, Moduswechsel */
  function bewegeAgent(z, p, k) {
    const r = z.zufall, N = z.N, horizon = Math.round(p.horizon), wiggle = Math.round(p.wiggle);
    const liste = sichtfeld(z.h[k], horizon), staerke = z.minM + 1;   // strN := minM + 1
    let summe = 0;
    for (let j = 0; j < liste.length; j++) {                     // checkArea: markB (Erkunden) bzw. markH = 0 (Rückweg) + noise
      const noise = staerke * (r() - 0.5), nb = NACHBAR[liste[j]];
      const c = ((z.y[k] + nb[1] + N) % N) * N + (z.x[k] + nb[0] + N) % N;
      _w[j] = (z.modus[k] === 0 ? z.markB[c] : 0) + noise; summe += _w[j];
    }
    let h = z.h[k], sx, sy;
    if (z.modus[k] === 1) {                                      // returning mode: zum Ursprungsort ± return noise
      h = rundeD(Math.atan2(z.mitte - z.y[k], z.mitte - z.x[k]) * RAD);
      h += r.ganz(Math.round(p.noise) + 1) * (r.ganz(2) * 2 - 1);
      sx = rundeD(Math.cos(h * DEG)); sy = rundeD(Math.sin(h * DEG));
    } else if (summe > 0) {                                      // Markierungen im Sichtfeld
      let wahl = 0;
      if (p.methode === "roulette") {
        const rnd = r.ganz(100); let s = 0;
        for (let j = 0; j < liste.length; j++) { s += _w[j] / summe * 100; wahl = j; if (s >= rnd) break; }
      } else {
        let max = 0;
        for (let j = 0; j < liste.length; j++) { const g = _w[j] / summe * 100; if (g > max) { max = g; wahl = j; } }
      }
      [sx, sy] = NACHBAR[liste[wahl]];
      h = rundeD(Math.atan2(sy, sx) * RAD) + r.ganz(wiggle + 1) * (r.ganz(2) * 2 - 1);
    } else {                                                     // random walk
      h += r.ganz(horizon + 1) * (r.ganz(2) * 2 - 1);
      sx = rundeD(Math.cos(h * DEG)); sy = rundeD(Math.sin(h * DEG));
    }
    if (h < 0) h += 360;
    if (h > 360) h -= 360;
    z.h[k] = h;
    const von = z.y[k] * N + z.x[k];
    z.markA[von] += 10;                                          // mark all visited places
    if (z.modus[k] === 1) z.markB[von] += 10;                    // mark the way home
    z.x[k] = (z.x[k] + sx + N) % N; z.y[k] = (z.y[k] + sy + N) % N;
    const neu = z.y[k] * N + z.x[k];
    if (z.zustand[neu] === 1 && z.modus[k] === 1) { z.modus[k] = 0; z.erfolg[k] = 1; z.zahl[z.ziel[k]]++; z.rueckkehr++; }
    if (z.zustand[neu] === 2 && z.modus[k] === 0) { z.modus[k] = 1; z.ziel[k] = z.zielNr[neu]; }
  }

  /** calculate: findMaxMin, calcAgents, decayMarks, Diagramm (calcGraph) */
  function schritt(z, p) {
    maxMin(z, p);
    for (let k = 0; k < z.n; k++) bewegeAgent(z, p, k);
    if (p.decay) { const d = p.decayRate, a = z.markA, b = z.markB; for (let c = 0; c < a.length; c++) { a[c] *= d; b[c] *= d; } }
    z.t++;
    const w = auswertung(z);
    z.verlauf.push([w.erfolgreich, w.rueckweg, z.maxM]);
    return z;
  }

  /** Grauwert wie TCell.rePaint: 0 (weiß) … 1 (schwarz); jede Markierung > 0 mindestens 20 / 255 */
  function grau(z, mark) {
    const s = z.maxM - z.minM, t = s > 0 ? (mark - z.minM) * 235 / s : 0;
    return Math.min(255, Math.max(0, t + (mark > 0 ? 20 : 0))) / 255;
  }

  /** calcGraph: erfolgreiche Agenten (mindestens einmal heimgekehrt) und Agenten auf dem Rückweg in Prozent */
  function auswertung(z) {
    let e = 0, r = 0, gefunden = 0;
    for (let k = 0; k < z.n; k++) { e += z.erfolg[k]; r += z.modus[k]; }
    for (let i = 0; i < z.zahl.length; i++) if (z.zahl[i] > 0) gefunden++;
    return { erfolgreich: rundeD(100 * e / z.n), rueckweg: rundeD(100 * r / z.n), gefunden, rueckkehr: z.rueckkehr };
  }

  /** „show only return tracks“ ändert die Normierung (findMaxMin) sofort */
  function aendere(z, p, id) { if (id === "nurRueck") maxMin(z, p); }

  return { STANDARD, NOISE, PANEL, rundeD, zellen, sektor, sichtfeld, NACHBAR, setzeZiele, erzeuge, maxMin, bewegeAgent,
           schritt, grau, auswertung, aendere };
});
