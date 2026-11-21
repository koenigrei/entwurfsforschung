/* Quellen und Ziele der Bewegungen (Path System 02) · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 332_Quellen_Ziele („Path System 02“ 1.0, Delphi, Reinhard König, April 2006; gleicher Quellcode
   wie 38_pathSystem_02 im Laboratorium für räumliche Prozesse).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (CellForm.pas, agenten.pas):
     Zehn zufällige Home Cells (rot) und eine Center Cell aus 5 × 5 Zellen in der Mitte (grün). Die Agenten starten
     gleichmäßig verteilt auf den Home Cells und suchen die Center Cell (Seeking).
     Je Schritt und Agent (calcAgents): Sichtfeld heading ± angle threshold (checkArea). Liegt die Summe der Markierungen
     darin über dem sniff threshold, folgt der Agent der stärksten Markierung (hill climbing) oder wählt gewichtet
     (roulette wheel), jeweils mit ± wiggle; sonst random walk um ± angle threshold (ChangeHeading). Auf dem Rückweg
     richtet er sich vorher auf seine Home Cell aus und erhöht die Markierung der Zelle, die er verlässt, um
     mark strenght. Erreicht er die Center Cell, kehrt er heim; erreicht er seine Home Cell, sucht er wieder.
     Markierungen verdunsten (repaintAll: mark − round(10 · evaporate rate), solange mark > dieser Wert + 2) oder
     diffundieren (diffuse). Feld: 404 px / cell size 6 → 67 × 67 Zellen, Torus; y wächst nach unten,
     heading 0° = Osten, im Uhrzeigersinn. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const PANEL = 404, MAERKTE = 10, RAD = 180 / 3.141592654, DEG = 3.141592654 / 180;

  /** Voreinstellungen wie im Original (CellForm.dfm) */
  const STANDARD = {
    anzahl: 200, zellgroesse: 6, zentrumBekannt: false, horizon: 45, wiggle: 25, methode: "hill",
    markStr: 50, evapo: 0.5, sniff: 15, sichtbar: 50, diffusion: false, verlauf: true
  };

  /** Delphis Round: bei genau ,5 zur geraden Zahl */
  function rundeD(x) { const f = Math.floor(x), r = x - f; return r > 0.5 ? f + 1 : r < 0.5 ? f : (f % 2 === 0 ? f : f + 1); }
  const zg = v => Math.min(10, Math.max(1, Math.round(v)));
  /** spalt = reih = round(404 / cell size) */
  const zellen = v => rundeD(PANEL / zg(v));
  function winkelRand(a) { if (a < 0) a += 360; if (a > 360) a -= 360; return a; }
  function sektor(a) { const r = rundeD(a); return r <= 45 ? 1 : Math.min(8, Math.ceil(r / 45)); }
  const NACHBAR = [null, [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]];
  /** checkArea: Sektoren von heading − horizon − 22,5 bis heading + horizon − 22,5 im Uhrzeigersinn */
  function sichtfeld(heading, horizon) {
    const von = sektor(winkelRand(heading - horizon - 22.5)), bis = sektor(winkelRand(heading + horizon - 22.5));
    const liste = []; let nr = von - 1;
    do { nr++; if (nr > 8) nr = 1; liste.push(nr); } while (nr !== bis);
    return liste;
  }
  /** Verdunstung je Schritt: evapo := round(StrToFloat(Lbl_evapo.Caption) · 10) */
  const verdunstung = rate => rundeD(rate * 10);

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const N = zellen(p.zellgroesse), n = Math.max(1, Math.round(p.anzahl));
    const z = { t: 0, zufall, N, breite: N, hoehe: N, zg: zg(p.zellgroesse),
                mark: new Int32Array(N * N), limbo: new Float64Array(N * N), heimZelle: new Uint8Array(N * N), quelle: new Uint8Array(N * N),
                maerkte: [], n, x: new Int32Array(n), y: new Int32Array(n), h: new Int32Array(n),
                hx: new Int32Array(n), hy: new Int32Array(n), sucht: new Uint8Array(n), kennt: p.zentrumBekannt ? 1 : 0,
                cx: rundeD(N / 2), cy: rundeD(N / 2), summe: 0, verlauf: [], fenster: 0, hoch: 100,
                heim: 0, heimJe: new Int32Array(1000), maus: null };
    for (let i = 0; i < MAERKTE; i++) z.maerkte.push([zufall.ganz(N), zufall.ganz(N)]);   // market[I] := random(spalt), random(reih)
    z.mark.fill(10);                                                                   // multiCentre: jede Zelle mark 10
    for (const [mx, my] of z.maerkte) z.heimZelle[my * N + mx] = 1;                    // cent (rot)
    for (let u = -2; u <= 2; u++) for (let v = -2; v <= 2; v++) {                      // SetupSource: 5 × 5 um die Mitte
      const c = ((z.cy + u + N) % N) * N + (z.cx + v + N) % N; z.quelle[c] = 1; z.mark[c] = 10;
    }
    for (let k = 0; k < n; k++) {                                                      // SetupAgents: M := I mod 10
      const [mx, my] = z.maerkte[k % MAERKTE];
      z.hx[k] = z.x[k] = mx; z.hy[k] = z.y[k] = my; z.sucht[k] = 1; z.h[k] = zufall.ganz(360);
    }
    return z;
  }

  /** repaintAll: Verdunstung (ohne Diffusion) und Zählung der sichtbaren Zellen (mark > visibility threshold) */
  function verdunste(z, p) {
    const e = verdunstung(p.evapo), vis = Math.round(p.sichtbar), m = z.mark;
    let s = 0;
    for (let c = 0; c < m.length; c++) {
      if (m[c] > e + 2) { if (!p.diffusion) m[c] -= e; if (m[c] > vis) s++; }
    }
    return s;
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

  const _w = new Float64Array(8);
  /** calcAgents für Agent k: checkArea, ChangeHeading, Schritt, Markierung, Zustandswechsel. Gibt 1 bei Heimkehr. */
  function bewegeAgent(z, p, k) {
    const r = z.zufall, N = z.N, horizon = Math.round(p.horizon), wiggle = Math.round(p.wiggle);
    const liste = sichtfeld(z.h[k], horizon);                    // checkArea mit dem bisherigen heading
    let summe = 0;
    for (let j = 0; j < liste.length; j++) {
      const nb = NACHBAR[liste[j]];
      _w[j] = z.mark[((z.y[k] + nb[1] + N) % N) * N + (z.x[k] + nb[0] + N) % N]; summe += _w[j];
    }
    let h = z.h[k], heimgekehrt = 0;
    if (!z.sucht[k]) {                                           // Rückweg: auf die Home Cell ausrichten
      const dx = z.hx[k] - z.x[k], dy = z.hy[k] - z.y[k];
      if (dx === 0 && dy === 0) { z.sucht[k] = 1; h += 180; heimgekehrt = 1; }
      else h = rundeD(Math.atan2(dy, dx) * RAD);
    } else if (z.kennt) {                                        // „agents know the center position“
      h = rundeD(Math.atan2(z.cy - z.y[k], z.cx - z.x[k]) * RAD);
    }
    let sx, sy;
    if (summe > p.sniff) {                                       // sumChem > sniff threshold
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
    } else {                                                     // randomWalk(wiggle, degree = angle threshold)
      h += r.ganz(horizon + 1) * (r.ganz(2) * 2 - 1);
      sx = rundeD(Math.cos(h * DEG)); sy = rundeD(Math.sin(h * DEG));
    }
    if (h < 0) h += 360;
    if (h > 360) h -= 360;
    z.h[k] = h;
    if (!z.sucht[k]) z.mark[z.y[k] * N + z.x[k]] += Math.round(p.markStr);   // Markierung der verlassenen Zelle
    z.x[k] = (z.x[k] + sx + N) % N; z.y[k] = (z.y[k] + sy + N) % N;
    if (z.quelle[z.y[k] * N + z.x[k]]) z.sucht[k] = 0;            // Center Cell erreicht → Rückweg
    return heimgekehrt;
  }

  /** calculate: repaintAll (Verdunstung, Zählung, Diagramm), calcAgents, diffuse */
  function schritt(z, p) {
    z.summe = verdunste(z, p);
    if (z.t % 999 === 0) { z.verlauf = []; z.fenster = z.t; z.hoch = 100; }   // resetGraph: Fenster von 1000 Schritten
    if (z.summe + 50 > z.hoch) z.hoch = z.summe + 100;
    z.verlauf.push(z.summe);
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

  /** Grauwert wie TCell.Paint: 255 − mark, wenn mark > visibility threshold, sonst weiß; Ergebnis 0 (weiß) … 1 (schwarz) */
  function grau(mark, sichtbar) { return mark > sichtbar ? Math.min(255, mark) / 255 : 0; }

  /** Kennzahlen: Agenten auf dem Rückweg, Heimkehren gesamt und in den letzten 1000 Schritten */
  function auswertung(z) {
    let rueck = 0, letzte = 0;
    for (let k = 0; k < z.n; k++) rueck += 1 - z.sucht[k];
    for (let i = 0; i < 1000; i++) letzte += z.heimJe[i];
    return { summe: z.summe, rueck, heim: z.heim, heimLetzte: letzte };
  }

  function aendere() {}

  return { STANDARD, PANEL, MAERKTE, rundeD, zellen, sektor, sichtfeld, NACHBAR, verdunstung, erzeuge, verdunste, diffundiere,
           bewegeAgent, schritt, markiere, grau, auswertung, aendere };
});
