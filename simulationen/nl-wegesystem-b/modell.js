/* 07 wegesystem B · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von wegesystem02direction.nlogo (NetLogo 2.1, Reinhard König, 18.02.2005),
   mit den Erweiterungen aus wegesystem04.nlogo („09 wegesystem B update 1“, 09.03.2005) und dem Vorgänger
   wegesystem01.nlogo („06 wegesystem A“, 10.02.2005: acht Nachbarn, absolute Richtungen) als Fassungen.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (aus „to go“):
     1. Jede turtle liest die Markierung (mark) der drei Patches vor sich – schräg links (patch-left-and-ahead 45 1),
        geradeaus (… 0 1) und schräg rechts (… −45 1) – und multipliziert sie mit path-attract: m0, m1, m2.
     2. Kumulierte Bereiche mV = [33 + m0, 66 + m0 + m1, 99 + m0 + m1 + m2] · 100 / (m0 + m1 + m2 + 100);
        randV = random-float 100 entscheidet: links (heading − 45), geradeaus, rechts (heading + 45).
        Der Rest über item 2 mV (anfangs 1 %) lässt die Richtung unverändert.
     3. Ist mark von patch-here < max-mark, kommt mark-strenght hinzu; danach fd 1.
     4. Alle Patches: mark − decrease-per-tick, nicht unter 0. Farbe = 9.999 − mark · 10 / (max-mark + mark-strenght),
        also weiß (unmarkiert) bis schwarz (stark markiert).
   Welt wie im GRAPHICS-WINDOW: screen-edge 50 → Patches −50…50 in x und y (101 × 101), Rand als Torus (NetLogo 2.x).
   turtles haben stetige Koordinaten; Patch eines Punkts = gerundete Koordinate (Patchmitten liegen auf ganzen Zahlen). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const RAND = 50;                 // screen-edge-x/-y im GRAPHICS-WINDOW
  const N = 2 * RAND + 1;          // 101 Patches je Richtung
  const ZEICHNEN = 100;            // wegesystem04: set mark-of patch-at mouse-xcor mouse-ycor 100

  /** Voreinstellungen wie im Original (SLIDER-Blöcke in wegesystem02direction.nlogo) */
  const STANDARD = {
    "num-turtles": 100, "path-attract": 50, "mark-strenght": 10.8, "max-mark": 100, "decrease-per-tick": 0.2,
    "show-mark-over": 0,           // aus update 1; 0 zeigt jede Markierung wie in B
    fassung: "b", turtles: true
  };
  /** Voreinstellungen von „B update 1“ (wegesystem04.nlogo) */
  const UPDATE1 = { "path-attract": 20, "mark-strenght": 5, "max-mark": 100, "decrease-per-tick": 0.11, "show-mark-over": 20 };
  /** Voreinstellungen von „06 wegesystem A“ (SLIDER-Blöcke in wegesystem01.nlogo) */
  const FASSUNG_A = { "path-attract": 1, "mark-strenght": 5, "max-mark": 50, "decrease-per-tick": 0.05, "show-mark-over": 0 };

  // sin/cos je ganzzahligem heading (NetLogo: 0° = Norden, im Uhrzeigersinn; dx = sin, dy = cos)
  const SIN = new Float64Array(360), COS = new Float64Array(360);
  for (let h = 0; h < 360; h++) {
    const r = h * Math.PI / 180, s = Math.sin(r), c = Math.cos(r);
    SIN[h] = Math.abs(s) < 1e-12 ? 0 : s; COS[h] = Math.abs(c) < 1e-12 ? 0 : c;
  }
  const grad = h => ((h % 360) + 360) % 360;

  /** Torus: Koordinate in [−50,5; 50,5) */
  function wickle(x) {
    x = (x + RAND + 0.5) % N; if (x < 0) x += N;
    return x - RAND - 0.5;
  }
  /** Patch-Koordinate eines Punkts (Patchmitte = ganze Zahl), im Torus */
  function patchKoord(x) {
    const p = Math.floor(wickle(x) + 0.5);
    return p > RAND ? p - N : p;
  }
  /** Index im Feld (Zeilen von oben nach unten, damit das Bild direkt gezeichnet werden kann) */
  const index = (px, py) => (RAND - py) * N + (px + RAND);

  /** patch-left-and-ahead winkel 1: Index des Patches im Abstand 1 in Richtung heading − winkel */
  function patchVorne(x, y, heading, winkel) {
    const h = grad(heading - winkel);
    return index(patchKoord(x + SIN[h]), patchKoord(y + COS[h]));
  }

  /** Regel 1–2: Wahrscheinlichkeitsbereiche mV aus den drei Markierungen (schräg links, geradeaus, schräg rechts) */
  function bereiche(m0, m1, m2, pathAttract) {
    const a = m0 * pathAttract, b = m1 * pathAttract, c = m2 * pathAttract, ent = a + b + c, f = 100 / (ent + 100);
    return [(33 + a) * f, (66 + a + b) * f, (99 + a + b + c) * f];
  }
  /** Regel 2: Richtungswahl wie die ifelse-Kette des Originals → −45 (links), 0 (geradeaus/Rest), +45 (rechts) */
  function wahl(mV, randV) {
    if (randV > 0 && randV < mV[0]) return -45;
    if (randV > mV[0] && randV < mV[1]) return 0;
    if (randV > mV[1] && randV < mV[2]) return 45;
    return 0;
  }

  /** Fassung A, Regel 1–2: kumulierte Bereiche aus den acht Nachbarn in den absoluten Richtungen 0°, 45°, …, 315°
      (patch-at-heading-and-distance (i · 45) 1): mV[i] = Σ_{j ≤ i} (12,5 + m_j · path-attract), skaliert mit 100 / (markEnt + 100). */
  function bereicheA(m, pathAttract) {
    const mV = new Array(8); let summe = 0, ent = 0;
    for (let i = 0; i < 8; i++) { const t = m[i] * pathAttract; summe += 12.5 + t; ent += t; mV[i] = summe; }
    const f = 100 / (ent + 100);
    for (let i = 0; i < 8; i++) mV[i] *= f;
    return mV;
  }
  /** Fassung A, Richtungswahl wie die ifelse-Kette in wegesystem01.nlogo: neues heading i · 45, oder −1 = unverändert
      (nur wenn randV genau auf einer Grenze liegt oder 0 ist) */
  function wahlA(mV, randV) {
    if (randV > 0 && randV < mV[0]) return 0;
    for (let i = 1; i < 8; i++) if (randV > mV[i - 1] && randV < mV[i]) return 45 * i;
    return -1;
  }

  function neueTurtles(z, p) {
    const n = Math.max(0, Math.round(p["num-turtles"]));
    z.n = n; z.x = new Float64Array(n); z.y = new Float64Array(n); z.h = new Int16Array(n); z.ordnung = new Int32Array(n);
    for (let k = 0; k < n; k++) {
      z.ordnung[k] = k;
      if (p.fassung === "update1") { z.h[k] = 0; continue; }          // wegesystem04: set heading 0, kein fd
      const h = z.zufall.ganz(360);                                      // set heading random 360
      const d = p.fassung === "a" ? z.zufall.ganz(30) + 10 : z.zufall.ganz(10) + 20;   // A: fd random 30 + 10 · B: fd random 10 + 20
      z.h[k] = h; z.x[k] = wickle(SIN[h] * d); z.y[k] = wickle(COS[h] * d);
    }
  }

  /** setup: ca, alle Patches weiß (mark 0), cct num-turtles am Ursprung */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, zufall, N, RAND, breite: N, hoehe: N, mark: new Float64Array(N * N), maus: null };
    neueTurtles(z, p);
    return z;
  }

  const _m8 = new Float64Array(8);
  /** Ein Durchlauf von „go“ für eine turtle k */
  function bewegeTurtle(z, p, k) {
    const x = z.x[k], y = z.y[k], h = z.h[k], mk = z.mark;
    let nh;
    if (p.fassung === "a") {                                             // wegesystem01.nlogo: acht Nachbarn, absolute Richtungen
      for (let i = 0; i < 8; i++) _m8[i] = mk[patchVorne(x, y, 45 * i, 0)];
      const w = wahlA(bereicheA(_m8, p["path-attract"]), z.zufall() * 100);
      nh = w < 0 ? h : w;
    } else {
      const mV = bereiche(mk[patchVorne(x, y, h, 45)], mk[patchVorne(x, y, h, 0)], mk[patchVorne(x, y, h, -45)], p["path-attract"]);
      nh = grad(h + wahl(mV, z.zufall() * 100));                         // randV = random-float 100
    }
    const hier = index(patchKoord(x), patchKoord(y));
    if (mk[hier] < p["max-mark"]) mk[hier] += p["mark-strenght"];        // Markierung auf patch-here, vor dem Schritt
    z.h[k] = nh; z.x[k] = wickle(x + SIN[nh]); z.y[k] = wickle(y + COS[nh]);   // fd 1
  }

  /** Verfall aller Patches (ask patches) */
  function verfall(mark, d) {
    for (let n = 0; n < mark.length; n++) {
      let m = mark[n];
      if (m > 0) { m -= d; mark[n] = m < 0 ? 0 : m; }
    }
  }

  /** Ein tick von „go“: turtles in zufälliger Reihenfolge, dann Verfall, dann ticks + 1 */
  function schritt(z, p) {
    const o = z.ordnung, r = z.zufall;
    for (let k = z.n - 1; k > 0; k--) { const j = r.ganz(k + 1), s = o[k]; o[k] = o[j]; o[j] = s; }
    for (let k = 0; k < z.n; k++) bewegeTurtle(z, p, o[k]);
    verfall(z.mark, p["decrease-per-tick"]);
    z.t++;
    return z;
  }

  /** Grauwert 0 (weiß) … 1 (schwarz) wie pcolor = 9.999 − mark · 10 / (max-mark + mark-strenght); update 1: nur über show-mark-over */
  function grau(mark, p) {
    if (!(mark > 0) || mark <= p["show-mark-over"]) return 0;
    const t = mark / (p["max-mark"] + p["mark-strenght"] || 1);
    return t > 1 ? 1 : t;
  }

  /** wegesystem04: mit gedrückter Maus Wege einzeichnen (mark = 100). Spalte/Zeile im Bild; Linie ab dem letzten Punkt ohne Lücken. */
  function zeichneWeg(z, spalte, zeile, neu) {
    const c = Math.min(N - 1, Math.max(0, Math.floor(spalte))), r = Math.min(N - 1, Math.max(0, Math.floor(zeile)));
    let [c0, r0] = !neu && z.maus ? z.maus : [c, r];
    const dc = Math.abs(c - c0), dr = Math.abs(r - r0), sc = c0 < c ? 1 : -1, sr = r0 < r ? 1 : -1;
    let f = dc - dr;
    for (;;) {                                                           // Bresenham
      z.mark[r0 * N + c0] = ZEICHNEN;
      if (c0 === c && r0 === r) break;
      const e = 2 * f;
      if (e > -dr) { f -= dr; c0 += sc; }
      if (e < dc) { f += dc; r0 += sr; }
    }
    z.maus = [c, r];
  }

  /** Kennzahlen (neu, nicht im Original): Anteil markierter und stark markierter Patches (Wege, mark ≥ schwelle,
      voreingestellt max-mark / 2), Anteil der turtles auf Wegen und Orthogonalität: Von den Wegepatches, die in einer
      geraden Dreierlinie liegen, der Anteil waagerechter/senkrechter (statt diagonaler) Linien; zufällig verteilt ≈ 0,5. */
  function auswertung(z, p, schwelle) {
    const mk = z.mark, s = schwelle != null ? schwelle : p["max-mark"] / 2;
    const w = (r, c) => mk[((r + N) % N) * N + ((c + N) % N)] >= s;
    let markiert = 0, stark = 0, orth = 0, diag = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const m = mk[r * N + c]; if (m > 0) markiert++;
      if (m < s) continue;
      stark++;
      if ((w(r, c - 1) && w(r, c + 1)) || (w(r - 1, c) && w(r + 1, c))) orth++;
      if ((w(r - 1, c - 1) && w(r + 1, c + 1)) || (w(r - 1, c + 1) && w(r + 1, c - 1))) diag++;
    }
    let aufWeg = 0;
    for (let k = 0; k < z.n; k++) if (mk[index(patchKoord(z.x[k]), patchKoord(z.y[k]))] >= s) aufWeg++;
    const A = N * N;
    return { markiert: markiert / A, stark: stark / A, aufWeg: z.n ? aufWeg / z.n : 0, orthogonal: orth + diag ? orth / (orth + diag) : 0.5 };
  }

  /** Parameter ohne Neustart: alle außer num-turtles und fassung wirken im nächsten tick */
  function aendere() {}

  return { STANDARD, UPDATE1, FASSUNG_A, bereicheA, wahlA, N, RAND, ZEICHNEN, SIN, COS, wickle, patchKoord, index, patchVorne, bereiche, wahl,
           erzeuge, schritt, bewegeTurtle, verfall, grau, zeichneWeg, auswertung, aendere };
});
