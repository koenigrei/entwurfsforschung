/* Parametric Planning Catalogue · gemeinsame Rasterverfahren (ohne DOM, in Node testbar)
   Herkunft (seit 23.11.2026 hier gemeinsam, vorher in den Apps):
   - ueberlauf: Priority-Flood aus katalog/hochwasser-pegel (Barnes, Lehman & Mulla 2014, „Priority-flood: An optimal
     depression-filling and watershed-labeling algorithm“, Computers & Geosciences 62, 117–127, doi:10.1016/j.cageo.2013.04.024).
   - sichtbar, sieht: symmetrisches Shadowcasting aus katalog/sichttiefe (Verfahren nach Albert Ford, „Symmetric Shadowcasting“,
     2021, https://www.albertford.com/shadowcasting/, eigene Umsetzung).
   - kontur: Marching Squares (Isolinien über den Zellmitten) aus katalog/isochronen-oepnv (Lorensen & Cline 1987, 2D-Fassung).
   - abstandsTransformation: begrenzte Abstandstransformation mit zwei Durchläufen (Chamfer, Nachbarn gerade und diagonal;
     Rosenfeld & Pfaltz 1966, doi:10.1145/321356.321357; Borgefors 1986) aus katalog/isochronen-oepnv.
   Raster: Zelle k = j · nx + i (Zeile j von oben, y nach unten). Eigene Umsetzungen, kein fremder Code übernommen.
   Node: require("../_gemeinsam/raster.js"); Browser: <script src="../_gemeinsam/raster.js"> nach geo.js → globales Objekt Raster.
   Tests: test/raster.test.mjs.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const R = fabrik(node ? require("./geo.js") : wurzel.Geo);
  if (node) module.exports = R;
  else wurzel.Raster = R;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo) {
  "use strict";

  /* ---------------------------------------------------------------- Priority-Flood */
  /** Überlaufhöhe W je Gitterpunkt eines Höhenrasters h (nx × ny, Float64Array o. ä.) von den Quellpunkten aus (quelle[k] wahr,
      z. B. die Flussrinne): W = max(h, kleinstes W eines Nachbarn auf dem Weg zur Quelle) – die kleinste Wasserhöhe, bei der Wasser
      von einer Quelle dorthin gelangt (Minimax-Weg, Vierer-Nachbarschaft in der Reihenfolge links, rechts, oben, unten).
      Bei Pegel L steht Wasser an jedem Punkt mit W < L – hinter Wällen erst, wenn L den Wall übersteigt. Nicht erreichbare Punkte
      (keine Quelle verbunden) behalten Infinity. → Float64Array */
  function ueberlauf(h, nx, ny, quelle) {
    const W = new Float64Array(nx * ny).fill(Infinity), fertig = new Uint8Array(nx * ny), H = new Geo.Heap();
    for (let k = 0; k < W.length; k++) if (quelle[k]) { W[k] = h[k]; H.push(W[k], k); }
    while (!H.leer) {
      const k = H.pop(); if (fertig[k]) continue; fertig[k] = 1;
      const i = k % nx, j = (k - i) / nx, w = W[k];
      for (const m of [i > 0 ? k - 1 : -1, i < nx - 1 ? k + 1 : -1, j > 0 ? k - nx : -1, j < ny - 1 ? k + nx : -1]) {
        if (m < 0 || fertig[m]) continue;
        const v = Math.max(h[m], w);
        if (v < W[m]) { W[m] = v; H.push(v, m); }
      }
    }
    return W;
  }

  /* ---------------------------------------------------------------- Sichtbarkeit: symmetrisches Shadowcasting */
  /** Ruft sieh(k) für jede freie Zelle auf, die von der Zelle s aus sichtbar ist (ohne s selbst). R = {nx, ny, gesperrt}
      (gesperrt[k] === 1: Hindernis). Eine Zelle gilt als sichtbar, wenn ihre Mitte von der Mitte von s aus frei zu sehen ist;
      gesperrte Zellen und der Rand verdecken als volle Quadrate. Symmetrisch: b sichtbar von a ⇔ a sichtbar von b.
      Vier Quadranten, zeilenweise mit Neigungen als Brüche ganzer Zahlen (exakt, ohne Rundungsfehler). Zellen auf den
      Diagonalen liegen in zwei Quadranten und werden zweimal gemeldet (sieh muss das vertragen, z. B. „schon gesehen?“ prüfen). */
  function sichtbar(R, s, sieh) {
    const { nx, ny, gesperrt } = R, ox = s % nx, oy = (s - ox) / nx;
    const wand = (x, y) => x < 0 || y < 0 || x >= nx || y >= ny || gesperrt[y * nx + x] === 1;
    for (let q = 0; q < 4; q++) {
      // Quadrant: (Tiefe d, Spalte c) → Zelle
      const tx = q === 0 ? (d, c) => ox + c : q === 1 ? (d, c) => ox + c : q === 2 ? (d, c) => ox + d : (d, c) => ox - d;
      const ty = q === 0 ? (d, c) => oy - d : q === 1 ? (d, c) => oy + d : q === 2 ? (d, c) => oy + c : (d, c) => oy + c;
      const scan = (d, sn, sd, en, ed) => {
        // Spalten von round_ties_up(d·sn/sd) bis round_ties_down(d·en/ed)
        const cMin = Math.floor((2 * d * sn + sd) / (2 * sd)), cMax = Math.ceil((2 * d * en - ed) / (2 * ed));
        let vor = 0;   // 0: keine, 1: Wand, 2: frei
        for (let c = cMin; c <= cMax; c++) {
          const x = tx(d, c), y = ty(d, c), w = wand(x, y);
          if (!w && c * sd >= d * sn && c * ed <= d * en) sieh(y * nx + x);
          if (vor === 1 && !w) { sn = 2 * c - 1; sd = 2 * d; }
          if (vor === 2 && w) scan(d + 1, sn, sd, 2 * c - 1, 2 * d);
          vor = w ? 1 : 2;
        }
        if (vor === 2) scan(d + 1, sn, sd, en, ed);
      };
      scan(1, -1, 1, 1, 1);
    }
  }
  /** sieht Zelle a die Zelle b? */
  function sieht(R, a, b) { let ja = false; sichtbar(R, a, k => { if (k === b) ja = true; }); return ja; }

  /* ---------------------------------------------------------------- Isolinien */
  /** Isolinie zum Wert w auf einem Werteraster T (Marching Squares über die Zellmitten; R = {nx, ny, zelle}) →
      Segmente [[[x, y], [x, y]], …] in Metern. Werte über deckel (z. B. Infinity für „nicht erreicht“) zählen als deckel.
      Sattelzellen (vier Schnitte) ergeben zwei Segmente in der Reihenfolge der Kanten oben, rechts, unten, links. */
  function kontur(T, R, w, deckel = 1e6) {
    const { nx, ny, zelle } = R, S = [], val = o => Math.min(T[o], deckel);
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = val(j * nx + i), b = val(j * nx + i + 1), c = val((j + 1) * nx + i + 1), d = val((j + 1) * nx + i), P = [];
      const kante = (h1, h2, x1, y1, x2, y2) => { if ((h1 < w) !== (h2 < w)) { const t = (w - h1) / (h2 - h1); P.push([(x1 + (x2 - x1) * t + 0.5) * zelle, (y1 + (y2 - y1) * t + 0.5) * zelle]); } };
      kante(a, b, i, j, i + 1, j); kante(b, c, i + 1, j, i + 1, j + 1); kante(c, d, i + 1, j + 1, i, j + 1); kante(d, a, i, j + 1, i, j);
      if (P.length >= 2) S.push([P[0], P[1]]);
      if (P.length === 4) S.push([P[2], P[3]]);
    }
    return S;
  }

  /* ---------------------------------------------------------------- Abstandstransformation */
  /** Begrenzte Abstandstransformation mit zwei Durchläufen (vorwärts: links, oben, oben links, oben rechts; rückwärts: rechts,
      unten, unten rechts, unten links), Schrittweite zelle gerade und zelle · √2 diagonal. R = {nx, ny, zelle}.
      T: Kosten je Zelle (z. B. Reisezeit, Infinity = unbekannt), D: zurückgelegter Weg ab dem letzten Startwert (m); beide werden
      an Ort und Stelle verbessert: Zelle o übernimmt vom Nachbarn u den Wert T[u] + l / v, wenn dieser kleiner ist und
      D[u] + l ≤ grenze (so läuft die Ausbreitung höchstens grenze Meter weit). v = Geschwindigkeit (1 → T in Metern). → T */
  function abstandsTransformation(T, D, R, v = 1, grenze = Infinity) {
    const { nx, ny, zelle } = R, dg = zelle * Math.SQRT2;
    const nimm = (o, u, l) => { const d = D[u] + l; if (d <= grenze) { const t = T[u] + l / v; if (t < T[o]) { T[o] = t; D[o] = d; } } };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const o = j * nx + i;
      if (i > 0) nimm(o, o - 1, zelle);
      if (j > 0) { nimm(o, o - nx, zelle); if (i > 0) nimm(o, o - nx - 1, dg); if (i < nx - 1) nimm(o, o - nx + 1, dg); }
    }
    for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) {
      const o = j * nx + i;
      if (i < nx - 1) nimm(o, o + 1, zelle);
      if (j < ny - 1) { nimm(o, o + nx, zelle); if (i < nx - 1) nimm(o, o + nx + 1, dg); if (i > 0) nimm(o, o + nx - 1, dg); }
    }
    return T;
  }

  return { ueberlauf, sichtbar, sieht, kontur, abstandsTransformation };
});
