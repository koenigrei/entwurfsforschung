/* Optimiertes Wegesystem (Evolutionary Network) · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 333_OptiWege („Network 01“ 1.1, Delphi, Reinhard König, 24.04.2006; gleicher Quellcode wie
   39_evoNet im Laboratorium für räumliche Prozesse). Grundlage ist „Path System 02“ (332_Quellen_Ziele).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln wie Path System 02 (zehn Home Cells, Center Cell 5 × 5, Suchen, markierter Heimweg, Verdunstung), dazu:
     Jeder Agent hat eigene Werte angle threshold und wiggle threshold (anfangs random(180)), gespeichert als
       Chromosom aus 2 × 8 Bit (setChroma), und einen Energievorrat von 100 000.
     Energie je Schritt (markCells): auf Straßen (Zielzelle mark ≥ visibility threshold) − round(mark strenght / 2),
       im freien Feld suchend − 3 · mark strenght, heimkehrend − mark strenght.
     Erfolg = Anzahl der Heimkehren. Ist die Energie verbraucht (rebirth), wählt der Agent per roulette wheel zwei Eltern
       seiner Familie (gleiche Home Cell) nach ihrem Erfolg, kreuzt ihre Chromosomen an einem zufälligen Punkt
       (crossover) und mutiert mit der mutation rate ein Bit (mutate); dann sucht er mit voller Energie neu.
   Feld: 404 px / cell size 6 → 67 × 67 Zellen, Torus; y wächst nach unten, heading 0° = Osten, im Uhrzeigersinn. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const PANEL = 404, MAERKTE = 10, ENERGIE = 100000, RAD = 180 / 3.141592654, DEG = 3.141592654 / 180;

  /** Voreinstellungen wie im Original (CellForm.dfm) */
  const STANDARD = {
    anzahl: 200, zellgroesse: 6, ortsSaat: 1, zentrumBekannt: false, methode: "hill", mutation: 0.01,
    markStr: 50, evapo: 0.5, sniff: 15, sichtbar: 100, diffusion: false, agenten: true, verlauf: true
  };

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
  const verdunstung = rate => rundeD(rate * 10);

  /** Chromosom (setChroma): IntToBin(angleTh) + IntToBin(wiggleTh), je 8 Bit; Stelle 1 = höchstes Bit */
  const chromosom = (winkel, wackeln) => ((winkel & 255) << 8) | (wackeln & 255);
  const alsText = c => c.toString(2).padStart(16, "0");
  /** crossover: Stellen 1 … crossP vom ersten, crossP + 1 … 16 vom zweiten Elternteil */
  function kreuze(c0, c1, crossP) { const maske = (0xFFFF << (16 - crossP)) & 0xFFFF; return (c0 & maske) | (c1 & ~maske & 0xFFFF); }
  /** mutate: Bit an Stelle rndP (1 … 15) umdrehen */
  const kippe = (c, stelle) => c ^ (1 << (16 - stelle));
  /** Calcer.rouletteWheel: random(100), kumulieren bis ≥ rnd oder letzte Stelle */
  function rad(gewichte, rnd) {
    let s = 0, m = 0;
    for (; m < gewichte.length; m++) { s += gewichte[m]; if (s >= rnd) return m; }
    return gewichte.length - 1;
  }

  /** zehn Home Cells: market[I] := (random(spalt), random(reih)) */
  function zieheOrte(zufall, N) { const o = []; for (let i = 0; i < MAERKTE; i++) o.push([zufall.ganz(N), zufall.ganz(N)]); return o; }

  /** settings: p.orte (fest, z. B. aus eigener Saat) oder aus dem Zufall des Laufs */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const N = zellen(p.zellgroesse), n = Math.max(1, Math.round(p.anzahl));
    const z = { t: 0, zufall, N, breite: N, hoehe: N, zg: zg(p.zellgroesse),
                mark: new Int32Array(N * N), limbo: new Float64Array(N * N), heimZelle: new Uint8Array(N * N), quelle: new Uint8Array(N * N),
                n, x: new Int32Array(n), y: new Int32Array(n), h: new Int32Array(n), hx: new Int32Array(n), hy: new Int32Array(n),
                sucht: new Uint8Array(n), kennt: p.zentrumBekannt ? 1 : 0, cx: rundeD(N / 2), cy: rundeD(N / 2),
                winkel: new Int32Array(n), wackeln: new Int32Array(n), chroma: new Uint16Array(n), energie: new Int32Array(n),
                erfolg: new Int32Array(n), familie: [], heim: 0, heimJe: new Int32Array(1000), geburten: 0, verlauf: [], maus: null };
    z.maerkte = p.orte && p.orte.length === MAERKTE ? p.orte.map(o => [o[0] % N, o[1] % N]) : zieheOrte(zufall, N);
    for (let i = 0; i < MAERKTE; i++) z.familie.push([]);
    z.mark.fill(10);                                                                   // multiCentre
    for (const [mx, my] of z.maerkte) z.heimZelle[my * N + mx] = 1;
    for (let u = -2; u <= 2; u++) for (let v = -2; v <= 2; v++) {                      // SetupSource
      const c = ((z.cy + u + N) % N) * N + (z.cx + v + N) % N; z.quelle[c] = 1; z.mark[c] = 10;
    }
    for (let k = 0; k < n; k++) {                                                      // SetupAgents
      const f = k % MAERKTE, [mx, my] = z.maerkte[f];
      z.familie[f].push(k);
      z.hx[k] = z.x[k] = mx; z.hy[k] = z.y[k] = my; z.sucht[k] = 1; z.h[k] = zufall.ganz(360);
      z.winkel[k] = zufall.ganz(180); z.wackeln[k] = zufall.ganz(180);                  // angleTh, wiggleTh := random(180)
      z.chroma[k] = chromosom(z.winkel[k], z.wackeln[k]); z.energie[k] = ENERGIE;
    }
    mittelwerte(z);
    return z;
  }

  /** decline: Verdunstung (ohne Diffusion) */
  function verdunste(z, p) {
    const e = verdunstung(p.evapo), m = z.mark;
    if (p.diffusion) return;
    for (let c = 0; c < m.length; c++) if (m[c] > e + 2) m[c] -= e;
  }

  /** diffuse: mark := round(Σ8 / 8), dann round(mark · (1 − evaporate rate)), mindestens 1 */
  function diffundiere(z, p) {
    const N = z.N, m = z.mark, L = z.limbo, f = 1 - p.evapo;
    for (let i = 0; i < N; i++) {
      const o = (i === 0 ? N - 1 : i - 1) * N, u = (i === N - 1 ? 0 : i + 1) * N, r = i * N;
      for (let k = 0; k < N; k++) {
        const l = k === 0 ? N - 1 : k - 1, re = k === N - 1 ? 0 : k + 1;
        L[r + k] = m[o + l] + m[o + k] + m[o + re] + m[r + l] + m[r + re] + m[u + l] + m[u + k] + m[u + re];
      }
    }
    for (let c = 0; c < m.length; c++) { let v = rundeD(L[c] / 8); v = rundeD(v * f); m[c] = v < 1 ? 1 : v; }
  }

  /** rebirth: Eltern aus der Familie nach Erfolg (roulette wheel), crossover, mutate; volle Energie, sucht neu.
      Der Agent bleibt, wo er ist (siehe QUELLE.md). */
  function wiedergeburt(z, p, k) {
    const r = z.zufall, fam = z.familie[k % MAERKTE];
    let summe = 0; for (const j of fam) summe += z.erfolg[j];
    const gew = fam.map(j => summe > 0 ? z.erfolg[j] / summe * 100 : 5);
    const e0 = fam[rad(gew, r.ganz(100))], e1 = fam[rad(gew, r.ganz(100))];
    const neu = kreuze(z.chroma[e0], z.chroma[e1], r.ganz(16) + 1);
    z.erfolg[k] = 0; z.sucht[k] = 1; z.energie[k] = ENERGIE;
    z.winkel[k] = neu >> 8; z.wackeln[k] = neu & 255; z.chroma[k] = neu;
    if (p.mutation > r()) z.chroma[k] = kippe(z.chroma[k], r.ganz(15) + 1);       // nur das Chromosom, nicht die Werte
    z.geburten++;
  }

  const _w = new Float64Array(8);
  /** calcAgents für Agent k (wie Path System 02, mit eigenen Schwellen und Energie). Gibt 1 bei Heimkehr. */
  function bewegeAgent(z, p, k) {
    if (z.energie[k] < 1) wiedergeburt(z, p, k);
    const r = z.zufall, N = z.N, horizon = z.winkel[k], wiggle = z.wackeln[k];
    const liste = sichtfeld(z.h[k], horizon);
    let summe = 0;
    for (let j = 0; j < liste.length; j++) {
      const nb = NACHBAR[liste[j]];
      _w[j] = z.mark[((z.y[k] + nb[1] + N) % N) * N + (z.x[k] + nb[0] + N) % N]; summe += _w[j];
    }
    let h = z.h[k], heim = 0;
    if (!z.sucht[k]) {
      const dx = z.hx[k] - z.x[k], dy = z.hy[k] - z.y[k];
      if (dx === 0 && dy === 0) { z.sucht[k] = 1; h += 180; z.erfolg[k]++; heim = 1; }   // at home again!
      else h = rundeD(Math.atan2(dy, dx) * RAD);
    } else if (z.kennt) {
      h = rundeD(Math.atan2(z.cy - z.y[k], z.cx - z.x[k]) * RAD);
    }
    let sx, sy;
    if (summe > p.sniff) {
      let wahl = 0;
      if (p.methode === "roulette") {
        const rnd = r.ganz(100); let s = 0;
        for (let j = 0; j < liste.length; j++) { s += summe > 0 ? _w[j] / summe * 100 : 0; wahl = j; if (s >= rnd) break; }
      } else {
        let max = 0;
        for (let j = 0; j < liste.length; j++) { const g = summe > 0 ? _w[j] / summe * 100 : 0; if (g > max) { max = g; wahl = j; } }
      }
      [sx, sy] = NACHBAR[liste[wahl]];
      h = rundeD(Math.atan2(sy, sx) * RAD) + r.ganz(wiggle + 1) * (r.ganz(2) * 2 - 1);
    } else {
      h += r.ganz(horizon + 1) * (r.ganz(2) * 2 - 1);
      sx = rundeD(Math.cos(h * DEG)); sy = rundeD(Math.sin(h * DEG));
    }
    if (h < 0) h += 360;
    if (h > 360) h -= 360;
    z.h[k] = h;
    const von = z.y[k] * N + z.x[k];
    z.x[k] = (z.x[k] + sx + N) % N; z.y[k] = (z.y[k] + sy + N) % N;
    const nach = z.y[k] * N + z.x[k];
    energie(z, p, k, von, nach);
    if (z.quelle[nach]) z.sucht[k] = 0;
    return heim;
  }

  /** markCells: Heimkehrer markieren die verlassene Zelle; Energieverbrauch nach der Zielzelle */
  function energie(z, p, k, von, nach) {
    const ms = Math.round(p.markStr), vis = Math.round(p.sichtbar), strasse = z.mark[nach] >= vis;
    if (!z.sucht[k]) { z.mark[von] += ms; z.energie[k] -= strasse ? rundeD(ms / 2) : ms; }
    else z.energie[k] -= strasse ? rundeD(ms / 2) : 3 * ms;
  }

  /** Mittelwerte von angle threshold und wiggle threshold (repaintAgents: Lbl_avgAngle, Lbl_avgWiggle) */
  function mittelwerte(z) {
    let a = 0, w = 0;
    for (let k = 0; k < z.n; k++) { a += z.winkel[k]; w += z.wackeln[k]; }
    z.mittelWinkel = rundeD(a / z.n); z.mittelWackeln = rundeD(w / z.n);
  }

  /** calculate: decline, (Zeichnen, alle 100 Schritte Mittelwerte und Diagramm bis Schritt 49 800), calcAgents, diffuse */
  function schritt(z, p) {
    verdunste(z, p);
    if (z.t % 100 === 0) { mittelwerte(z); if (z.t < 49800) z.verlauf.push([z.t, z.mittelWinkel, z.mittelWackeln]); }
    let heim = 0;
    for (let k = 0; k < z.n; k++) heim += bewegeAgent(z, p, k);
    z.heim += heim; z.heimJe[z.t % 1000] = heim;
    if (p.diffusion) diffundiere(z, p);
    z.t++;
    return z;
  }

  /** Maus (markCell): links mark 255, rechts mark 1; lückenlos entlang der Mausbewegung */
  function markiere(z, spalte, zeile, wert, neu) {
    const N = z.N, c = Math.min(N - 1, Math.max(0, Math.floor(spalte))), r = Math.min(N - 1, Math.max(0, Math.floor(zeile)));
    let [c0, r0] = !neu && z.maus ? z.maus : [c, r];
    const dc = Math.abs(c - c0), dr = Math.abs(r - r0), sc = c0 < c ? 1 : -1, sr = r0 < r ? 1 : -1;
    let f = dc - dr;
    for (;;) {
      z.mark[r0 * N + c0] = wert;
      if (c0 === c && r0 === r) break;
      const e = 2 * f;
      if (e > -dr) { f -= dr; c0 += sc; }
      if (e < dc) { f += dc; r0 += sr; }
    }
    z.maus = [c, r];
  }

  /** Grauwert wie TCell.Paint: 255 − mark, wenn mark > visibility threshold, sonst weiß; 0 (weiß) … 1 (schwarz) */
  function grau(mark, sichtbar) { return mark > sichtbar ? Math.min(255, mark) / 255 : 0; }

  /** Kennzahlen: Straßenzellen (mark ≥ visibility threshold), Heimkehren in den letzten 1000 Schritten, Streuung der Werte */
  function auswertung(z, p) {
    let strasse = 0, letzte = 0, sa = 0, sw = 0, ma = 0, mw = 0;
    const vis = Math.round(p ? p.sichtbar : STANDARD.sichtbar);
    for (let c = 0; c < z.mark.length; c++) if (z.mark[c] >= vis) strasse++;
    for (let i = 0; i < 1000; i++) letzte += z.heimJe[i];
    for (let k = 0; k < z.n; k++) { ma += z.winkel[k]; mw += z.wackeln[k]; }
    ma /= z.n; mw /= z.n;
    for (let k = 0; k < z.n; k++) { sa += (z.winkel[k] - ma) ** 2; sw += (z.wackeln[k] - mw) ** 2; }
    return { strasse, heimLetzte: letzte, heim: z.heim, geburten: z.geburten, winkel: ma, wackeln: mw,
             streuungWinkel: Math.sqrt(sa / z.n), streuungWackeln: Math.sqrt(sw / z.n) };
  }

  function aendere() {}

  return { STANDARD, PANEL, MAERKTE, ENERGIE, rundeD, zellen, sektor, sichtfeld, NACHBAR, verdunstung, chromosom, alsText,
           kreuze, kippe, rad, zieheOrte, erzeuge, verdunste, diffundiere, wiedergeburt, bewegeAgent, energie, mittelwerte,
           schritt, markiere, grau, auswertung, aendere };
});
