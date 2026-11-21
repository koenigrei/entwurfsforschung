/* Dichte Packungen · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 06_minUeberschn („Dichte Packungen I“, Delphi, Reinhard König, Mai 2005) mit der Fassung
   07_packingScale („Dichte Packungen II“, Version 1.01, November 2005).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Evolutionäre Strategie (main.pas, overlap/optimize):
   - Es gibt nrPop Varianten derselben Rechteckmenge (I: 10, II: 16). Fitness = Summe der paarweisen
     Überschneidungsflächen (schneideRecht/sumAreas, wie in „Überlagerungsflächen“).
   - Selectionsort sortiert die Flächen; area_ind[0] ist die beste Variante. Ist ihre Fläche > 100, erzeugt optimize
     die nächste Generation: Jede andere Variante wird zur Kopie eines Elters, deren Rechtecke mit der Mutationsrate
     (%) an einen zufälligen Ort springen, sonst um höchstens ± Variationsweite verschoben werden.
   - I: ein Elter (die beste Variante), Quadrate der halben Kantenlänge „Rechteckgröße“.
   - II: vier Eltern area_ind[0..3], je vier Varianten (counter = Ceil(K/4 − 0,9)); zusätzlich ändert jedes Rechteck
     seine halbe Breite cx um ± Variationsweite, die Höhe folgt aus der Fläche (2·Rechteckgröße)².
   Ein Schritt = eine Generation (ein Aufruf von overlap im Idle-Ereignis). Ende, sobald die Fläche ≤ 100 ist. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** Fassungen: Feld (ImagePaint), Zahl der Varianten, Voreinstellungen der Schieberegler (main.dfm) */
  const FASSUNGEN = {
    I:  { breite: 409, hoehe: 393, nrPop: 10, eltern: 1, numbers: 20, groesse: 30, variation: 10, mutation: 1 },
    II: { breite: 580, hoehe: 400, nrPop: 16, eltern: 4, numbers: 15, groesse: 61, variation: 1, mutation: 1 }
  };
  const ZIEL = 100;                                   // If area[0] > 100 then optimize … sonst „Programm bereit“

  /** Voreinstellungen (Fassung I wie 06_minUeberschn) */
  const STANDARD = { fassung: "I", numbers: 20, groesse: 30, variation: 10, mutation: 1, verlauf: true };

  /** Delphi-Round: bei genau .5 zur geraden Zahl (Banker's Rounding), sonst zur nächsten ganzen Zahl */
  function round(x) {
    const f = Math.floor(x), r = x - f;
    if (Math.abs(r - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
    return r < 0.5 ? f : f + 1;
  }

  /** Variante: n Rechtecke mit Mittelpunkt (px, py) und halben Seiten (cx, cy) */
  const variante = n => ({ px: new Int32Array(n), py: new Int32Array(n), cx: new Int32Array(n), cy: new Int32Array(n) });

  /** Schnittfläche zweier Rechtecke wie IntersectRect (leer, auch bei Berührung → 0) */
  function schnitt(v, i, k) {
    const w = Math.min(v.px[i] + v.cx[i], v.px[k] + v.cx[k]) - Math.max(v.px[i] - v.cx[i], v.px[k] - v.cx[k]);
    const h = Math.min(v.py[i] + v.cy[i], v.py[k] + v.cy[k]) - Math.max(v.py[i] - v.cy[i], v.py[k] - v.cy[k]);
    return w > 0 && h > 0 ? w * h : 0;
  }

  /** Fitness (schneideRecht + sumAreas): Summe der Überschneidungsflächen aller Paare I < L */
  function ueberschneidung(v) {
    const n = v.px.length; let s = 0;
    for (let i = 0; i < n; i++) for (let k = i + 1; k < n; k++) s += schnitt(v, i, k);
    return s;
  }

  /** Überschneidungsrechtecke einer Variante (für die Darstellung, LapsList) */
  function laps(v) {
    const n = v.px.length, L = [];
    for (let i = 0; i < n; i++) for (let k = i + 1; k < n; k++) {
      const x1 = Math.max(v.px[i] - v.cx[i], v.px[k] - v.cx[k]), x2 = Math.min(v.px[i] + v.cx[i], v.px[k] + v.cx[k]);
      const y1 = Math.max(v.py[i] - v.cy[i], v.py[k] - v.cy[k]), y2 = Math.min(v.py[i] + v.cy[i], v.py[k] + v.cy[k]);
      if (x2 > x1 && y2 > y1) L.push({ x1, y1, x2, y2 });
    }
    return L;
  }

  /** Selectionsort des Originals, wörtlich: sortiert list aufsteigend und schreibt listInd (anfangs 0) wie im Quelltext.
      listInd[0] ist so der Index der besten Variante; listInd[1..] sind keine verlässliche Rangfolge (Eigenheit des Originals). */
  function selectionsort(list, listInd, min, max) {
    for (let i = min; i <= max - 1; i++) {
      let best = list[i], bj = i;
      for (let j = i + 1; j <= max; j++) {
        if (list[j] < best) { best = list[j]; bj = j; listInd[i] = j; listInd[i + 1] = i; }
      }
      list[bj] = list[i]; list[i] = best;
    }
  }

  /** Gruppe der Variante K in Fassung II: counter = Ceil(K/4 − 0,9) → 0,0,0,0,1,1,1,1,… */
  const gruppe = K => Math.ceil(K / 4 - 0.9) + 0;

  /** Halbe Höhe zur halben Breite cx bei der Fläche IR = (2·Größe)², mit den Grenzen 10 … Feld/2 − 5 (optimize, Fassung II).
      Bewusst geändert: an der Grenze wird cx aus IR / (4·cy) berechnet; das Original rechnet IR / cy und vervierfacht so die Fläche. */
  function seiten(cxNeu, groesse, F) {
    const IR = round(Math.pow(groesse * 2, 2));
    let cx = cxNeu;
    if (cx < 10) cx = 10;
    if (cx > round(F.breite / 2 - 5)) cx = round(F.breite / 2 - 5);
    let cy = round((IR / (cx * 2)) / 2);
    if (cy < 10) { cy = 10; cx = round(IR / (4 * cy)); }
    if (cy > round(F.hoehe / 2 - 5)) { cy = round(F.hoehe / 2 - 5); cx = round(IR / (4 * cy)); }
    return [cx, cy];
  }

  /** Mittelpunkt im Feld halten: Größe ≤ x ≤ Breite − Größe (optimize) */
  const klemme = (w, lo, hi) => (w < lo ? lo : w > hi ? hi : w);

  /** Neuer Ort eines Rechtecks: Mutation (mutRat > random(100)) → zufällig im Feld, sonst ± varSteps (random(2v + 1) − v) */
  function verschiebe(zufall, x, y, p, F) {
    if (p.mutation > zufall.ganz(100)) return [zufall.ganz(F.breite), zufall.ganz(F.hoehe)];
    const v = Math.max(1, Math.round(p.variation));
    x += zufall.ganz(2 * v + 1) - v;
    y += zufall.ganz(2 * v + 1) - v;
    return [x, y];
  }

  /* ------------------------------------------------------------------ Zustand */

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const fassung = FASSUNGEN[p.fassung] ? p.fassung : "I", F = FASSUNGEN[fassung];
    const n = Math.max(1, Math.round(p.numbers)), g = Math.max(1, Math.round(p.groesse));
    const z = { t: 0, zufall, fassung, F, breite: F.breite, hoehe: F.hoehe, n, groesse: g, pop: [], flaechen: new Array(F.nrPop).fill(0),
                best: 0, eltern: [0], flaeche: 0, laps: [], verlauf: [], fertig: false };
    for (let K = 0; K < F.nrPop; K++) {                // Button_createRechtClick: jede Variante für sich zufällig
      const v = variante(n);
      for (let i = 0; i < n; i++) {
        v.cx[i] = g; v.cy[i] = g;
        v.px[i] = g + zufall.ganz(F.breite - 2 * g);
        v.py[i] = g + zufall.ganz(F.hoehe - 2 * g);
      }
      z.pop.push(v);
    }
    overlap(z, p);                                     // „Überlapungs-Optimierung starten“
    return z;
  }

  /** overlap: alle Varianten bewerten, sortieren, die beste zeigen; Fläche > 100 → optimize (nächste Generation) */
  function overlap(z, p) {
    const area = z.pop.map(ueberschneidung), ind = new Array(area.length).fill(0);
    z.flaechen = area.slice();
    selectionsort(area, ind, 0, area.length - 1);
    z.best = ind[0];
    z.eltern = ind.slice(0, z.F.eltern);
    z.flaeche = area[0];
    z.laps = laps(z.pop[z.best]);
    z.verlauf.push(area[0]);
    if (area[0] > ZIEL) optimize(z, p, ind); else z.fertig = true;
  }

  /** optimize: Varianten der besten (I) bzw. der vier besten Varianten (II) erzeugen; die Eltern selbst bleiben erhalten */
  function optimize(z, p, ind) {
    const F = z.F, rnd = z.zufall, g = z.groesse;
    if (z.fassung === "I") {
      const e = z.pop[ind[0]];
      for (let K = 0; K < F.nrPop; K++) {
        if (K === ind[0]) continue;
        const v = z.pop[K];
        for (let i = 0; i < z.n; i++) {
          let [x, y] = verschiebe(rnd, e.px[i], e.py[i], p, F);
          v.px[i] = klemme(x, g, F.breite - g); v.py[i] = klemme(y, g, F.hoehe - g);
          v.cx[i] = g; v.cy[i] = g;
        }
      }
      return;
    }
    // Fassung II: tempList = Kopie aller Varianten; neue Werte nur dort, wo K nicht sein eigener Elter ist
    const temp = z.pop.map(v => ({ px: v.px.slice(), py: v.py.slice(), cx: v.cx.slice(), cy: v.cy.slice() }));
    const s = Math.max(1, Math.round(p.variation));          // scalStep := round(varSteps / 1)
    for (let K = 0; K < F.nrPop; K++) {
      const c = gruppe(K), e = z.pop[ind[c]];
      if (K === ind[c]) continue;
      const v = temp[K];
      for (let i = 0; i < z.n; i++) {
        let [x, y] = verschiebe(rnd, e.px[i], e.py[i], p, F);
        const [cx, cy] = seiten(e.cx[i] + (rnd.ganz(2 * s + 1) - s), g, F);
        v.cx[i] = cx; v.cy[i] = cy;
        v.px[i] = klemme(x, cx, F.breite - cx); v.py[i] = klemme(y, cy, F.hoehe - cy);
      }
    }
    for (let J = 0; J < F.nrPop; J++) {                   // zurückschreiben, außer in die vier Eltern
      if (J === ind[0] || J === ind[1] || J === ind[2] || J === ind[3]) continue;
      z.pop[J] = temp[J];
    }
  }

  /** Eine Generation (Idle-Ereignis): nichts mehr, wenn die Fläche ≤ 100 ist. Erhöht z.t. */
  function schritt(z, p) {
    if (z.fertig) return z;
    overlap(z, p);
    z.t++;
    return z;
  }

  /** Mutationsrate und Variationsweite liest optimize in jeder Generation neu – keine Änderung am Zustand nötig */
  function aendere(z, p, id) {}

  /** Kennzahlen: Feldfläche und Rechteckfläche wie Label_gesArea / Label_gesRecht (Fassung II) */
  const feldFlaeche = z => z.breite * z.hoehe;
  const sollFlaeche = z => z.n * round(Math.pow(z.groesse * 2, 2));
  function istFlaeche(v) { let s = 0; for (let i = 0; i < v.px.length; i++) s += 4 * v.cx[i] * v.cy[i]; return s; }

  return { STANDARD, FASSUNGEN, ZIEL, round, variante, schnitt, ueberschneidung, laps, selectionsort, gruppe, seiten, klemme, verschiebe,
           erzeuge, overlap, optimize, schritt, aendere, feldFlaeche, sollFlaeche, istFlaeche };
});
