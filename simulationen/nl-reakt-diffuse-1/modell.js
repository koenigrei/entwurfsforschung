/* 03 reakt diffuse · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von reaktDiffuse02.nlogo („03_reakt diffuse“, NetLogo 2.1, Reinhard König, 03.01.2005; Code nach einem Skript
   von Paul Coates, CECA, University of East London) mit der Fassung reaktDiffuse03.nlogo („04_repel and reakt diffuse“, 04.01.2005).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln:
     setup (03)  – crt seed; jede turtle an einen zufälligen Patch, stamp green + who (eigene Farbnummer 55, 56, …), die.
     setup (04)  – crt density; zufällige Patches, bis jede allein auf ihrem Patch steht (while any? other-turtles-here [fd 1]);
                   attract: Richtung Mitte, innerhalb von radius bk 1, sonst fd 1 → die turtles sammeln sich auf einem Kreis;
                   repel: Richtung nächste turtle, bk repel-strength → sie verteilen sich; stamp-agents prägt sie als Keime ein.
     leak        – jeder schwarze Patch (pcolor 0, nicht boundary) summiert die Farbnummern seiner acht Nachbarn (s1) und zählt
                   die farbigen (s2). Ist s1 durch s2 teilbar – meist, weil alle farbigen Nachbarn dieselbe Farbe haben –, nimmt
                   er den Mittelwert s1 / s2 an; sonst wird er Grenze (boundary, weiß 9.9). Erst rechnen alle, dann färben alle.
   NetLogo-Farbnummern bleiben als Zahlen erhalten (auch zufällig entstehende Mischfarben); app.js übersetzt sie in RGB.
   Welt aus dem GRAPHICS-WINDOW: screen-edge 80 → 161 × 161 Patches (03), screen-edge 100 → 201 × 201 (04), Torus. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const WEISS = 9.9, GRUEN = 55;

  /** Voreinstellungen (SLIDER-Blöcke): 03 seed 50; 04 density 61, radius 33, repel-strength 0.8 */
  const STANDARD = { fassung: "rd03", seed: 50, radius: 33, "repel-strength": 0.8, attract: true, repel: true, stampNach: 150 };
  const KANTE = { rd03: 80, rd04: 100 };

  /** Koordinate in den Torus [−e − 0,5; e + 0,5) */
  function wickle(x, e) { const N = 2 * e + 1; x = (x + e + 0.5) % N; if (x < 0) x += N; return x - e - 0.5; }
  /** Patch eines Punkts (gerundet, Patchmitten auf ganzen Zahlen) → Index (Zeilen von oben) */
  function patchIndex(x, y, e) {
    const N = 2 * e + 1; let px = Math.floor(wickle(x, e) + 0.5), py = Math.floor(wickle(y, e) + 0.5);
    if (px > e) px -= N; if (py > e) py -= N;
    return (e - py) * N + (px + e);
  }
  /** kürzester Abstand im Torus (dx, dy) von a nach b */
  function delta(a, b, e) { const N = 2 * e + 1; let d = (b - a) % N; if (d > N / 2) d -= N; if (d < -N / 2) d += N; return d; }
  /** heading in NetLogo-Grad (0 = Norden, im Uhrzeigersinn) von (dx, dy) */
  const richtung = (dx, dy) => { const h = Math.atan2(dx, dy) * 180 / Math.PI; return h < 0 ? h + 360 : h; };
  const sin = h => Math.sin(h * Math.PI / 180), cos = h => Math.cos(h * Math.PI / 180);

  /** zufällige Reihenfolge (ask turtles) */
  function reihenfolge(n, zufall) { const o = Array.from({ length: n }, (_, i) => i); for (let k = n - 1; k > 0; k--) { const j = zufall.ganz(k + 1); [o[k], o[j]] = [o[j], o[k]]; } return o; }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param), e = KANTE[p.fassung] || 80, N = 2 * e + 1;
    const z = { t: 0, zufall, fassung: p.fassung, e, N, breite: N, hoehe: N, pcolor: new Float64Array(N * N), boundary: new Uint8Array(N * N),
                s1: new Float64Array(N * N), neu: new Uint8Array(N * N), phase: "leak", n: 0, x: null, y: null, h: null, geaendert: 0, keime: 0, fertig: null };
    const n = Math.max(0, Math.round(p.seed)), wrapInt = v => ((v + e) % N + N) % N - e;     // setxy random screen-size: 0…N−1 → Torus
    z.n = n; z.x = new Float64Array(n); z.y = new Float64Array(n); z.h = new Float64Array(n);
    for (let k = 0; k < n; k++) z.h[k] = zufall.ganz(360);                                  // crt: zufällige ganzzahlige headings
    if (p.fassung === "rd04") {
      z.phase = "bewegen";
      const patch = k => patchIndex(z.x[k], z.y[k], e);
      for (const k of reihenfolge(n, zufall)) {                                              // ask turtles [setxy … while any? other-turtles-here [fd 1]]
        z.x[k] = wrapInt(zufall.ganz(N)); z.y[k] = wrapInt(zufall.ganz(N));
        for (let schutz = 0; schutz < 4 * N; schutz++) {
          let besetzt = false; const q = patch(k);
          for (let j = 0; j < n && !besetzt; j++) if (j !== k && patch(j) === q) besetzt = true;
          if (!besetzt) break;
          z.x[k] = wickle(z.x[k] + sin(z.h[k]), e); z.y[k] = wickle(z.y[k] + cos(z.h[k]), e);
        }
      }
    } else {
      for (let k = 0; k < n; k++) { z.x[k] = wrapInt(zufall.ganz(N)); z.y[k] = wrapInt(zufall.ganz(N)); }
      stempeln(z);
    }
    return z;
  }

  /** stamp-agents: ask patches [set boundary false]; ask turtles [stamp green + who die] (zufällige Reihenfolge) */
  function stempeln(z) {
    if (z.phase === "leak" && z.n === 0) return;
    z.boundary.fill(0);
    for (const k of reihenfolge(z.n, z.zufall)) z.pcolor[patchIndex(z.x[k], z.y[k], z.e)] = GRUEN + k;
    z.keime = new Set(Array.from({ length: z.n }, (_, k) => patchIndex(z.x[k], z.y[k], z.e))).size;
    z.n = 0; z.phase = "leak"; z.fertig = null;
  }

  /** attract: heading towardsxy 0 0; innerhalb radius bk 1, sonst fd 1 */
  function anziehen(z, p) {
    for (const k of reihenfolge(z.n, z.zufall)) {
      const dx = -z.x[k], dy = -z.y[k], d = Math.hypot(dx, dy);
      if (d > 0) z.h[k] = richtung(dx, dy);                                                 // in der Mitte selbst bleibt die Richtung
      const s = d < p.radius ? -1 : 1;
      z.x[k] = wickle(z.x[k] + s * sin(z.h[k]), z.e); z.y[k] = wickle(z.y[k] + s * cos(z.h[k]), z.e);
    }
  }

  /** repel: heading towards nächste andere turtle (kürzester Weg im Torus), bk repel-strength; nacheinander */
  function abstossen(z, p) {
    const e = z.e;
    for (const k of reihenfolge(z.n, z.zufall)) {
      let best = -1, bd = Infinity, bx = 0, by = 0;
      for (let j = 0; j < z.n; j++) {
        if (j === k) continue;
        const dx = delta(z.x[k], z.x[j], e), dy = delta(z.y[k], z.y[j], e), d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = j; bx = dx; by = dy; }
      }
      if (best < 0) continue;
      if (bd > 0) z.h[k] = richtung(bx, by);
      z.x[k] = wickle(z.x[k] - p["repel-strength"] * sin(z.h[k]), e); z.y[k] = wickle(z.y[k] - p["repel-strength"] * cos(z.h[k]), e);
    }
  }

  /** checkdiffuse für einen Patch: gibt [s1, boundary] zurück (nur für schwarze Patches aufgerufen) */
  function pruefe(z, n) {
    const N = z.N, r = Math.floor(n / N), k = n % N, pc = z.pcolor;
    let s1 = 0, s2 = 0;
    for (let di = -1; di <= 1; di++) for (let dk = -1; dk <= 1; dk++) {
      if (!di && !dk) continue;
      const v = pc[((r + di + N) % N) * N + (k + dk + N) % N];
      s1 += v; if (v > 0) s2++;
    }
    if (s2 > 0) { if (Math.trunc(s1 / s2) * s2 === s1) return [s1 / s2, false]; return [s1, true]; }
    return [s1, false];
  }

  /** leak: erst alle schwarzen Patches prüfen, dann boundary → weiß, sonst s1 > 0 → pcolor s1 */
  function leck(z) {
    const pc = z.pcolor, b = z.boundary, s1 = z.s1;
    for (let n = 0; n < pc.length; n++) {
      if (b[n] || pc[n] !== 0) continue;
      const [v, grenze] = pruefe(z, n); s1[n] = v; if (grenze) b[n] = 1;
    }
    let g = 0;
    for (let n = 0; n < pc.length; n++) {
      if (b[n]) { if (pc[n] !== WEISS) { pc[n] = WEISS; g++; } s1[n] = 0; }
      else if (s1[n] > 0 && pc[n] !== s1[n]) { pc[n] = s1[n]; g++; }
    }
    return g;
  }

  /** Ein Schritt: in 04 vor dem Einprägen attract/repel (wie gleichzeitig gedrückte forever-Knöpfe), sonst leak */
  function schritt(z, p) {
    if (z.phase === "bewegen") {
      if (p.attract) anziehen(z, p);
      if (p.repel) abstossen(z, p);
      z.geaendert = z.n;
      z.t++;
      if (p.stampNach > 0 && z.t >= p.stampNach) stempeln(z);
      return z;
    }
    z.geaendert = leck(z);
    z.t++;
    if (z.geaendert === 0 && z.fertig === null) z.fertig = z.t;
    return z;
  }

  /** Kennzahlen: Anteile gefärbt / Grenze / noch schwarz, Zahl der Farben (Mischfarben: nicht unter den Keimfarben) */
  function auswertung(z) {
    const pc = z.pcolor, A = pc.length, farben = new Set(); let grenze = 0, schwarz = 0;
    for (let n = 0; n < A; n++) { const v = pc[n]; if (v === WEISS) grenze++; else if (v === 0) schwarz++; else farben.add(v); }
    let misch = 0; for (const f of farben) if (!(Number.isInteger(f) && f >= GRUEN && f < GRUEN + 400)) misch++;
    return { gefaerbt: (A - grenze - schwarz) / A, grenze: grenze / A, schwarz: schwarz / A, farben: farben.size, misch };
  }

  /** attract, repel, radius, repel-strength und stamp nach wirken sofort; seed/density und Fassung setzen zurück */
  function aendere() {}

  return { STANDARD, KANTE, WEISS, GRUEN, wickle, patchIndex, delta, richtung, erzeuge, stempeln, anziehen, abstossen, pruefe, leck, schritt, auswertung, aendere };
});
