/* Dichtefeld · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Skripts „Building coverage Density“ (GSI Density Grid_2018-12-05.gh) aus dem Eintrag
   „Discovering Cities Workshop | Amman“ im DeCodingSpaces Lab (DeCodingSpaces / Bauhaus-Universität Weimar, 2018).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie in der .gh-Datei (gelesen, nichts ausgeführt):
   1. „Divide Domain²“ + „Isotrim“: die Analysefläche wird in U × V Rasterzellen geteilt; U = Länge der ersten Kante /
      „Grid X Dimension“ (50 [0..100]), V = Länge der zweiten Kante / „Grid Y Dimension“ (50 [0..100]), als ganze Zahl.
   2. „Area“ liefert Mittelpunkt (Centroid) jeder Zelle und Grundfläche und Schwerpunkt jedes Gebäudeumrisses.
   3. „Distance“ + „Smaller Than“ + „Cull Pattern“ + „Mass Addition“: je Zelle die Summe der Grundflächen aller Gebäude,
      deren Schwerpunkt näher als der Suchradius („Search Redius“, 150 [0..1000]) am Zellmittelpunkt liegt.
   4. „Square“ · „Pi“ und „Division“: GSI = Summe / (π · R²); „Gradient“ (0…1) färbt die Zellen. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Grid X/Y Dimension 50 (0…100), Search Redius 150 (0…1000);
      radius2: zweiter Radius für den Vergleich (nur in der App), vergleich: beide Karten nebeneinander */
  const STANDARD = { zelleX: 50, zelleY: 50, radius: 150, radius2: 400, vergleich: true, skala: "fest" };
  /** Farbverlauf der Komponente „Gradient“ (fünf Griffe bei 0, 0,25, 0,5, 0,75, 1; nicht linear = glatt) */
  const VERLAUF = [[0, 61, 89], [0, 155, 180], [148, 193, 28], [243, 154, 0], [183, 26, 73]];
  /** Größe der Beispielstadt in m */
  const STADT = { b: 1000, h: 700, nx: 15, ny: 11 };

  /** Farbe des Verlaufs bei t ∈ [0, 1] → [r, g, b] (Griffe gleichmäßig verteilt, Übergänge geglättet wie „Linear: false“) */
  function verlauf(t) {
    t = Math.max(0, Math.min(1, isFinite(t) ? t : 0));
    const x = t * (VERLAUF.length - 1), i = Math.min(VERLAUF.length - 2, Math.floor(x)), u0 = x - i, u = u0 * u0 * (3 - 2 * u0);
    return [0, 1, 2].map(k => Math.round(VERLAUF[i][k] + (VERLAUF[i + 1][k] - VERLAUF[i][k]) * u));
  }

  /* ---------------------------------------------------------------- Beispielstadt mit Dichtegefälle */
  /** Stadt wie Szenen.stadt, aber Blockrand je Block unterschiedlich dicht: im Zentrum tiefe, geschlossene Ränder und
      einzelne ganz bebaute Blöcke, nach außen flachere Ränder mit mehr Lücken und Grünflächen ohne Gebäude.
      So entsteht ein Dichtegefälle, an dem sich der Einfluss des Suchradius zeigt. */
  function stadt(zufall) {
    const S = Szenen.stadt(zufall, Object.assign({}, STADT, { gebaeude: false, kirche: false }));
    const mx = S.b * (0.35 + 0.3 * zufall()), my = S.h * (0.35 + 0.3 * zufall()), dmax = Math.hypot(S.b, S.h) * 0.55;
    const gebaeude = [], gruen = [];
    for (const bl of S.bloecke) {
      const c = Geo.schwerpunkt(bl), d = Math.min(1, Geo.abstand(c, [mx, my]) / dmax);
      if (zufall() < 0.05 + 0.2 * d) { gruen.push(bl); continue; }
      if (zufall() < 0.22 * (1 - d) * (1 - d)) { gebaeude.push(bl.slice()); continue; }
      const o = { tiefe: 7 + 13 * (1 - d) + 3 * (zufall() - 0.5), breite: [8, 16 + 8 * d], luecke: 0.04 + 0.5 * d };
      gebaeude.push(...Szenen.blockrand(zufall, bl, o));
    }
    return Object.assign(S, { gebaeude, gruen, zentrum: [mx, my] });
  }

  /* ---------------------------------------------------------------- Verfahren */
  /** Zahl der Zellen je Richtung wie „Divide Domain²“ mit Länge / Zellmaß als ganze Zahl (gerundet, mindestens 1) */
  function teilung(laenge, mass) { return Math.max(1, Math.round(laenge / Math.max(1e-9, mass))); }

  /** Raster der Analysefläche [0, b] × [0, h]: nx × ny Zellen der Größe cw × ch; Zelle k = j·nx + i, Zeile j von oben */
  function raster(b, h, zelleX, zelleY) {
    const nx = teilung(b, zelleX), ny = teilung(h, zelleY);
    return { nx, ny, cw: b / nx, ch: h / ny, b, h };
  }
  /** Mittelpunkt (Centroid) der Zelle k */
  function zellMitte(R, k) { const i = k % R.nx, j = (k - i) / R.nx; return [(i + 0.5) * R.cw, (j + 0.5) * R.ch]; }
  /** Zelle unter dem Punkt q oder −1 */
  function zelleBei(R, q) {
    const i = Math.floor(q[0] / R.cw), j = Math.floor(q[1] / R.ch);
    return i >= 0 && j >= 0 && i < R.nx && j < R.ny ? j * R.nx + i : -1;
  }

  /** Grundflächen und Schwerpunkte der Gebäude (Komponente „Area“) als Felder */
  function gebaeudeDaten(gebaeude) {
    const n = gebaeude.length, cx = new Float64Array(n), cy = new Float64Array(n), a = new Float64Array(n);
    gebaeude.forEach((g, i) => { const c = Geo.schwerpunkt(g); cx[i] = c[0]; cy[i] = c[1]; a[i] = Geo.flaeche(g); });
    return { n, cx, cy, a };
  }

  /** Summe der Grundflächen aller Gebäude, deren Schwerpunkt streng näher als R an q liegt („Smaller Than“), und ihre Zahl */
  function summeImRadius(D, q, R) {
    let s = 0, k = 0;
    const R2 = R * R;
    for (let i = 0; i < D.n; i++) {
      const dx = D.cx[i] - q[0], dy = D.cy[i] - q[1];
      if (dx * dx + dy * dy < R2) { s += D.a[i]; k++; }
    }
    return { summe: s, anzahl: k };
  }
  /** GSI am Punkt q: Summe der Grundflächen im Suchradius / (π · R²); 0 bei R ≤ 0 (die .gh-Datei teilt dann durch null) */
  function gsi(D, q, R) { return R > 0 ? summeImRadius(D, q, R).summe / (Math.PI * R * R) : 0; }

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  const radien = p => [Math.max(0, p.radius), Math.max(0, p.radius2)];

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = stadt(zufall);
    let flaeche = 0; for (const g of szene.gebaeude) flaeche += Geo.flaeche(g);
    const z = { t: 0, szene, b: szene.b, h: szene.h, D: gebaeudeDaten(szene.gebaeude), gsiGesamt: flaeche / (szene.b * szene.h), auswahl: -1 };
    baueRaster(z, p);
    return z;
  }

  /** Raster neu anlegen (Zellmaß geändert); verwirft alle Werte, t = 0 */
  function baueRaster(z, p) {
    z.R = raster(z.b, z.h, p.zelleX, p.zelleY);
    const n = z.R.nx * z.R.ny;
    z.werte = [new Float64Array(n).fill(NaN), new Float64Array(n).fill(NaN)];
    z.zeile = 0; z.t = 0;
    if (z.auswahl >= n) z.auswahl = -1;
  }

  /** Zeile j für beide Radien berechnen */
  function rechneZeile(z, p, j) {
    const [r1, r2] = radien(p), R = z.R;
    for (let i = 0; i < R.nx; i++) {
      const k = j * R.nx + i, q = zellMitte(R, k);
      z.werte[0][k] = gsi(z.D, q, r1); z.werte[1][k] = gsi(z.D, q, r2);
    }
  }

  const fertig = z => z.zeile >= z.R.ny;

  /** Ein Schritt: die nächste Rasterzeile (von Norden nach Süden) für beide Radien berechnen; erhöht z.t */
  function schritt(z, p) {
    if (!fertig(z)) { rechneZeile(z, p, z.zeile); z.zeile++; }
    z.t++;
    return z;
  }

  /** Parameter ohne Neustart: Zellmaß → neues Raster (t = 0); Radius → die schon gerechneten Zeilen sofort neu rechnen */
  function aendere(z, p, id) {
    if (id === "zelleX" || id === "zelleY") baueRaster(z, p);
    else if (id === "radius" || id === "radius2") for (let j = 0; j < z.zeile; j++) rechneZeile(z, p, j);
  }

  /** Statistik der gerechneten Zellen einer Karte (0: Radius, 1: zweiter Radius) */
  function statistik(z, m) {
    const W = z.werte[m];
    let n = 0, s = 0, s2 = 0, mn = Infinity, mx = -Infinity;
    for (let k = 0; k < W.length; k++) { const v = W[k]; if (!isFinite(v)) continue; n++; s += v; s2 += v * v; if (v < mn) mn = v; if (v > mx) mx = v; }
    const mittel = n ? s / n : NaN;
    return { n, mittel, std: n ? Math.sqrt(Math.max(0, s2 / n - mittel * mittel)) : NaN, min: n ? mn : NaN, max: n ? mx : NaN };
  }

  /** Zelle k wählen (−1: keine) */
  function waehle(z, k) { z.auswahl = k >= 0 && k < z.R.nx * z.R.ny ? k : -1; return z.auswahl >= 0; }

  /** Gebäude, die für Zelle k beim Radius R zählen (Indizes) */
  function gezaehlte(z, k, R) {
    const q = zellMitte(z.R, k), out = [], R2 = R * R;
    for (let i = 0; i < z.D.n; i++) { const dx = z.D.cx[i] - q[0], dy = z.D.cy[i] - q[1]; if (dx * dx + dy * dy < R2) out.push(i); }
    return out;
  }

  return { STANDARD, VERLAUF, STADT, verlauf, stadt, teilung, raster, zellMitte, zelleBei, gebaeudeDaten, summeImRadius, gsi,
           erzeuge, baueRaster, rechneZeile, fertig, schritt, aendere, statistik, waehle, gezaehlte };
});
