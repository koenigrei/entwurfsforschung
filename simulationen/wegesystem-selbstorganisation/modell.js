/* Selbstorganisation bei Wegesystemen (Path System 01) und Slime Mold · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 331_SelbstorgaWegeSys = 36_pathSystem_01 („PathSystem“ Version 1.0, April 2006; Units CellForm.pas, agenten.pas, cell_P.pas)
   und der Erweiterung 37_slimeMold („PathSystem and SlimeMold“ Version 1.1 vom 15.04.2006, „mainly the diffusion procedure was added“);
   Delphi, Reinhard König.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (calculate = repaintAll, calcAgents, diffuse):
     Verfall (repaintAll) – 36: jede Zelle mit mark > 1 verliert 1; 37: jede Zelle mit mark > e + 2 (e = round(evaporate rate · 10))
       verliert e, wenn nicht diffundiert wird. Diese Zellen zählen als markiert (Diagramm „sum of marked cells“).
     Sichtbereich (checkArea) – die Moore-Nachbarn von heading − angle threshold bis heading + angle threshold (je um 22,5° verschoben),
       mit ihren Markierungen als Gewichte (Anteil in %).
     Richtung (ChangeHeading) – Ist die Summe der Markierungen im Sichtbereich größer als der sniff threshold (36: 3), wählt der Agent eine Zelle
       per Roulette Wheel (Wahrscheinlichkeit ~ Markierung) oder Hill Climbing (stärkste Markierung) und dreht sich dorthin, dazu ± random(wiggle + 1);
       sonst Random Walk: heading ± random(angle threshold + 1), Schritt = (round(cos), round(sin)) – eine Zelle der Moore-Nachbarschaft.
     Bewegung (calcAgents) – die verlassene Zelle erhält + mark strenght (36: 20); Rand als Torus.
     Diffusion (diffuse, 37) – jede Zelle erhält round(Summe der acht Nachbarn / 8), dann · (1 − evaporate rate), gerundet, mindestens 1.
   Delphis Round rundet ,5 zur geraden Zahl (rundeD); Grad ↔ Bogenmaß mit Pi = 3,141592654 wie im Original. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const PANEL = 404;                                    // ZeichenPanel 404 × 404 px
  const PI_D = 3.141592654, DEG = PI_D / 180, RAD = 180 / PI_D;
  // Nachbarzellen 1 … 8 (checkArea): 1 = (1, 1) … 8 = (1, 0); y wächst nach unten
  const NB = [null, [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]];

  /** Voreinstellungen von 36_pathSystem_01 (CellForm.dfm) */
  const STANDARD = { fassung: "36", anzahl: 100, zelle: 4, angle: 25, wiggle: 0, methode: "roulette", mark: 20, evapo: 0.13, sniff: 3, visible: 3, diffus: false, verlauf: true };
  /** Voreinstellungen von 37_slimeMold */
  const SLIME = { anzahl: 175, zelle: 7, angle: 45, wiggle: 40, methode: "hill", mark: 20, evapo: 0.13, sniff: 10, visible: 3, diffus: true };

  function rundeD(x) {
    const f = Math.floor(x), d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  }
  const torus = (v, n) => v < 0 ? n + v : v > n - 1 ? v - n : v;

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const n = Math.round(PANEL / p.zelle);                // spalt = reih = round(404 / cellScal)
    const z = { t: 0, zufall, n, mark: new Float64Array(n * n).fill(1), A: p.anzahl,
                x: new Int32Array(p.anzahl), y: new Int32Array(p.anzahl), h: new Int32Array(p.anzahl), spur: new Uint8Array(p.anzahl),
                sx: new Int32Array(p.anzahl), sy: new Int32Array(p.anzahl), summe: 0, verlauf: [], limbo: new Float64Array(n * n) };
    for (let i = 0; i < p.anzahl; i++) {                  // setupAgents
      z.x[i] = zufall.ganz(n); z.y[i] = zufall.ganz(n);
      zufall.ganz(2);                                     // State := random(2) (ohne Wirkung)
      z.h[i] = zufall.ganz(360);
    }
    return z;
  }

  /** Sektor 1 … 8 eines Winkels (case round(comper) of 0..45: 1 … 316..360: 8) */
  function sektor(w) { const r = rundeD(w); return r <= 45 ? 1 : Math.min(8, Math.ceil(r / 45)); }
  const grenze = w => w < 0 ? 360 + w : w > 360 ? w - 360 : w;   // angelBorder

  /** checkArea: Liste der Nachbarzellen 1 … 8 im Sichtbereich */
  function sichtbereich(heading, horizon) {
    const von = sektor(grenze(heading - horizon - 22.5)), bis = sektor(grenze(heading + horizon - 22.5)), L = [];
    let nr = von - 1;
    do { nr++; if (nr > 8) nr = 1; L.push(nr); } while (nr !== bis);
    return L;
  }

  /** ChangeHeading für Agent i; setzt Schritt (sx, sy) und heading */
  function richtung(z, i, p) {
    const rnd = z.zufall, L = sichtbereich(z.h[i], p.angle), n = z.n;
    let summe = 0;
    const w = L.map(k => { const m = z.mark[torus(z.y[i] + NB[k][1], n) * n + torus(z.x[i] + NB[k][0], n)]; summe += m; return m; });
    let dx = 0, dy = 0, h = z.h[i];
    z.spur[i] = summe > p.sniff ? 1 : 0;
    if (summe > p.sniff) {
      const g = w.map(m => summe > 0 ? m / summe * 100 : 0);
      let k = 0;
      if (p.methode === "hill") { let max = 0; for (let j = 0; j < g.length; j++) if (g[j] > max) { max = g[j]; k = j; } }
      else { const r = rnd.ganz(100); let s = 0, j = 0; do { s += g[j]; k = j; j++; } while (s < r && j < g.length); }
      dx = NB[L[k]][0]; dy = NB[L[k]][1];
      h = rundeD(Math.atan2(dy, dx) * RAD);
      h += rnd.ganz(p.wiggle + 1) * (rnd.ganz(2) * 2 - 1);
    } else {                                              // random walk
      h += rnd.ganz(p.angle + 1) * (rnd.ganz(2) * 2 - 1);
      dx = rundeD(Math.cos(h * DEG)); dy = rundeD(Math.sin(h * DEG));
    }
    if (h < 0) h += 360; if (h > 360) h -= 360;
    z.h[i] = h; z.sx[i] = dx; z.sy[i] = dy;
  }

  /** repaintAll: Verfall und Zahl der markierten Zellen */
  function verfall(z, p) {
    const m = z.mark;
    let s = 0;
    if (p.fassung === "36") {
      for (let k = 0; k < m.length; k++) if (m[k] > 1) { m[k]--; if (m[k] > 255) m[k] = 255; s++; }   // Paint: If mark > 255 then mark := 255
    } else {
      const e = rundeD(p.evapo * 10);
      for (let k = 0; k < m.length; k++) if (m[k] > e + 2) { if (!p.diffus) m[k] -= e; s++; }
    }
    return s;
  }

  /** diffuse (37): Mittel der acht Nachbarn, dann Verdunstung, mindestens 1 */
  function diffusion(z, p) {
    const n = z.n, m = z.mark, L = z.limbo, f = 1 - p.evapo;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let s = 0;
      for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) s += m[torus(y + u, n) * n + torus(x + v, n)];
      L[y * n + x] = s - m[y * n + x];
    }
    for (let k = 0; k < m.length; k++) { let v = rundeD(L[k] / 8); v = rundeD(v * f); m[k] = v < 1 ? 1 : v; }
  }

  /** Ein Zeitschritt (calculate); erhöht z.t */
  function schritt(z, p) {
    z.summe = verfall(z, p);
    z.verlauf.push(z.summe);
    const n = z.n;
    for (let i = 0; i < z.A; i++) {                       // calcAgents
      richtung(z, i, p);
      const nx = torus(z.x[i] + z.sx[i], n), ny = torus(z.y[i] + z.sy[i], n);
      z.mark[z.y[i] * n + z.x[i]] += p.mark;              // verlassene Zelle markieren
      z.x[i] = nx; z.y[i] = ny;
    }
    if (p.diffus) diffusion(z, p);
    z.t++;
    return z;
  }

  /** Maus: linke Taste mark 255, rechte mark 1 (markCell) */
  function markiere(z, x, y, an) {
    const k = Math.floor(x), i = Math.floor(y);
    if (k < 0 || i < 0 || k >= z.n || i >= z.n) return false;
    z.mark[i * z.n + k] = an ? 255 : 1; return true;
  }

  /** Cluster (neu): zusammenhängende Gebiete (Moore, Torus) sichtbarer Zellen mit mark > schwelle, mindestens 4 Zellen */
  function cluster(z, schwelle) {
    const n = z.n, m = z.mark, gesehen = new Uint8Array(n * n), q = new Int32Array(n * n);
    let c = 0, groesste = 0, zellen = 0;
    for (let s = 0; s < n * n; s++) {
      if (gesehen[s] || m[s] <= schwelle) continue;
      let a = 0, b = 0; q[b++] = s; gesehen[s] = 1;
      while (a < b) {
        const u = q[a++], ux = u % n, uy = (u - ux) / n;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const v = torus(uy + dy, n) * n + torus(ux + dx, n);
          if (!gesehen[v] && m[v] > schwelle) { gesehen[v] = 1; q[b++] = v; }
        }
      }
      if (b >= 4) { c++; zellen += b; if (b > groesste) groesste = b; }
    }
    return { anzahl: c, groesste, zellen };
  }

  /** Anteil der Agenten, die einer Spur folgen (Summe im Sichtbereich > sniff threshold) */
  function aufSpur(z) { let s = 0; for (let i = 0; i < z.A; i++) s += z.spur[i]; return z.A ? s / z.A : 0; }

  function aendere(z, p, id) {}

  return { STANDARD, SLIME, PANEL, NB, rundeD, torus, sektor, sichtbereich, richtung, verfall, diffusion, erzeuge, schritt, aendere, markiere, cluster, aufSpur };
});
