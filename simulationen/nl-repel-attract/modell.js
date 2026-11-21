/* 01 repel attract · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von repel_attract.nlogo (NetLogo 2.1, 2005, Reinhard König).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (Prozeduren des Originals, je ein Dauerknopf):
   - attract: jede turtle dreht sich zum Ursprung (towardsxy 0 0); ist sie näher als radius, geht sie einen Schritt zurück (bk 1),
     sonst einen vor (fd 1). Die turtles sammeln sich auf einem Kreis mit dem Radius radius.
   - repel: jede turtle sucht die nächste andere turtle (min-one-of … [distance myself]), dreht sich zu ihr und geht
     repel-strength zurück (bk). Die turtles verteilen sich gleichmäßig.
   - setup: density turtles an zufälligen Patches, jede geht in ihrer zufälligen Richtung vor, bis sie allein auf ihrem Patch ist.
   Welt aus dem GRAPHICS-WINDOW: screen-edge-x/y 100 → Patches −100 … 100 (201 × 201), Rand als Torus (NetLogo 2.x). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const RAND = 100, N = 2 * RAND + 1;            // screen-edge 100, screen-size 201
  const D2R = Math.PI / 180;

  /** Voreinstellungen wie im Original (SLIDER-Blöcke: density 0–500/105, radius 0–130/33, repel-strength 0–5/1,0 in 0,2) */
  const STANDARD = {
    density: 105,
    radius: 33,
    "repel-strength": 1.0,
    attract: true,        // Dauerknopf attract (im Original zu Beginn aus, hier an – siehe QUELLE.md)
    repel: true,          // Dauerknopf repel
    kreis: true           // Darstellung: Kreis mit dem Radius zeigen (neu)
  };

  /** Koordinate in die Welt [−100,5; 100,5) falten (Torus) */
  function falte(v) { if (v >= -RAND - 0.5 && v < RAND + 0.5) return v; const w = ((v + RAND + 0.5) % N + N) % N; return w - RAND - 0.5; }
  /** kürzeste Differenz im Torus (a, b liegen in der Welt, die Differenz also in (−201, 201)) */
  function diff(a, b) { const d = b - a; return d >= RAND + 0.5 ? d - N : d < -RAND - 0.5 ? d + N : d; }
  /** Patch einer Koordinate (gerundet, Patchmitte auf ganzen Zahlen) */
  const patch = v => Math.round(falte(v)) === RAND + 1 ? -RAND : Math.round(falte(v));
  /** heading in NetLogo-Grad (0 = Norden, im Uhrzeigersinn) von (x1, y1) nach (x2, y2) über den kürzesten Weg; null bei gleichem Punkt */
  function richtung(x1, y1, x2, y2) {
    const dx = diff(x1, x2), dy = diff(y1, y2);
    if (dx === 0 && dy === 0) return null;
    const h = Math.atan2(dx, dy) / D2R;
    return h < 0 ? h + 360 : h;
  }
  /** fd d in Richtung heading (bk d = fd −d) */
  function gehe(z, i, d) {
    const h = z.h[i] * D2R;
    z.x[i] = falte(z.x[i] + d * Math.sin(h));
    z.y[i] = falte(z.y[i] + d * Math.cos(h));
  }
  /** Abstand im Torus */
  function abstand(z, i, k) { const dx = diff(z.x[i], z.x[k]), dy = diff(z.y[i], z.y[k]); return Math.sqrt(dx * dx + dy * dy); }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const n = Math.max(0, Math.round(p.density));
    const z = { t: 0, zufall, n, breite: N, hoehe: N, x: new Float64Array(n), y: new Float64Array(n), h: new Float64Array(n) };
    // crt density: zufällige ganzzahlige Richtung; setxy random-int-or-float screen-size-x …: ganze Zahl 0 … 200, gefaltet
    for (let i = 0; i < n; i++) { z.h[i] = zufall.ganz(360); z.x[i] = falte(zufall.ganz(N)); z.y[i] = falte(zufall.ganz(N)); }
    // while [any? other-turtles-here] [fd 1] – nacheinander wie ask turtles
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 4 * N && andereHier(z, i); k++) gehe(z, i, 1);
    }
    return z;
  }
  /** steht eine andere turtle auf demselben Patch? */
  function andereHier(z, i) {
    const px = patch(z.x[i]), py = patch(z.y[i]);
    for (let k = 0; k < z.n; k++) if (k !== i && patch(z.x[k]) === px && patch(z.y[k]) === py) return true;
    return false;
  }

  /** Reihenfolge von ask turtles: jede Runde zufällig (Fisher-Yates mit der Saat) */
  function reihenfolge(z) {
    const r = new Int32Array(z.n); for (let i = 0; i < z.n; i++) r[i] = i;
    for (let i = z.n - 1; i > 0; i--) { const j = z.zufall.ganz(i + 1), t = r[i]; r[i] = r[j]; r[j] = t; }
    return r;
  }

  /** to attract: set heading towardsxy 0 0; ifelse distancexy 0 0 < radius [bk 1] [fd 1] */
  function attract(z, p, i) {
    const h = richtung(z.x[i], z.y[i], 0, 0);
    if (h !== null) z.h[i] = h;
    gehe(z, i, Math.hypot(z.x[i], z.y[i]) < p.radius ? -1 : 1);
  }
  /** to repel: set closest-turtle min-one-of turtles with [self != myself] [distance myself]; set heading towards …; bk repel-strength */
  function naechste(z, i) {
    let best = Infinity, k0 = -1;
    const xi = z.x[i], yi = z.y[i], X = z.x, Y = z.y;
    for (let k = 0; k < z.n; k++) {
      if (k === i) continue;
      const dx = diff(xi, X[k]), dy = diff(yi, Y[k]), d = dx * dx + dy * dy;
      if (d < best) { best = d; k0 = k; }       // bei Gleichstand die erste in der Liste
    }
    return k0;
  }
  function repel(z, p, i) {
    const k = naechste(z, i);
    if (k < 0) return;
    const h = richtung(z.x[i], z.y[i], z.x[k], z.y[k]);
    if (h !== null) z.h[i] = h;                   // im Original Laufzeitfehler bei gleichem Punkt; hier bleibt die Richtung
    gehe(z, i, -p["repel-strength"]);
  }

  /** Ein Schritt = ein Durchlauf jedes gedrückten Dauerknopfs (erst attract, dann repel) */
  function schritt(z, param) {
    const p = Object.assign({}, STANDARD, param);
    if (p.attract) { const r = reihenfolge(z); for (let j = 0; j < z.n; j++) attract(z, p, r[j]); }
    if (p.repel) { const r = reihenfolge(z); for (let j = 0; j < z.n; j++) repel(z, p, r[j]); }
    z.t++;
    return z;
  }

  /** Kennzahlen: mittlerer Abstand zum Ursprung und Streuung, mittlerer und kleinster Abstand zur nächsten turtle */
  function auswertung(z) {
    const n = z.n;
    if (!n) return { mitte: 0, streuung: 0, nn: 0, nnMin: 0, nnStreuung: 0 };
    let s = 0, q = 0, ns = 0, nq = 0, nmin = Infinity;
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(z.x[i], z.y[i]); s += r; q += r * r;
      if (n > 1) { const k = naechste(z, i), d = abstand(z, i, k); ns += d; nq += d * d; if (d < nmin) nmin = d; }
    }
    const mitte = s / n, nn = n > 1 ? ns / n : 0;
    return { mitte, streuung: Math.sqrt(Math.max(0, q / n - mitte * mitte)), nn, nnMin: n > 1 ? nmin : 0,
             nnStreuung: n > 1 ? Math.sqrt(Math.max(0, nq / n - nn * nn)) : 0 };
  }

  return { STANDARD, RAND, N, falte, diff, patch, richtung, gehe, abstand, erzeuge, andereHier, reihenfolge, attract, naechste, repel, schritt, auswertung };
});
