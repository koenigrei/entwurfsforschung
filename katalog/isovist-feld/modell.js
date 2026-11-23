/* Isovistenfeld · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Isovist Field“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Bielik, Ekaterina Fuchkina).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie in der .gh-Datei: Die Komponente „Analysis Grid“ legt ein Gitter mit der Zellgröße (Cell Size, 1…10,
   Voreinstellung 2) durch den Füllpunkt (Fill Point) und flutet von dort in vier Richtungen; ein Schritt zwischen zwei Zellmitten
   ist gesperrt, wenn er ein Hindernis berührt (Gebäudekanten und Kanten des Analyserahmens „Analysis boundary“), so wie in
   docs/visibility.md §3 der DeCodingSpaces-Toolbox beschrieben (GPL-3.0; Definition abgelesen, kein Code übernommen). Die Komponente „Isovist“
   rechnet für jede Zellmitte (Analysis Points) einen Isovist – Blickrichtung Unit Y, Blickwinkel (Viewing Angle 0…360),
   Reichweite (Viewing Range 1…200), Strahlen (Precision 1…720); Hindernisse sind die Gebäudekanten und der Analyserahmen.
   „List Item“ wählt eine der 17 Kenngrößen, „Bounds“ und „Gradient“ färben die Zellen vom kleinsten zum größten Wert. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Cell Size 2 (1…10), Viewing Angle 360 (0…360), Viewing Range 100 (1…200), Rays 360 (1…720), Liste „Area“ */
  const STANDARD = { zelle: 2, winkel: 360, reichweite: 100, strahlen: 360, kenngroesse: "area" };
  /** Schlüssel der 17 Kenngrößen (Reihenfolge der Werteliste „Isovist Properties“) */
  const KENNGROESSEN = Geo.ISOVIST_MASSE.map(m => m[0]);
  /** Blickrichtung der .gh-Datei: Unit Y (Norden) – in Bildschirmkoordinaten (y nach unten) also −90° */
  const RICHTUNG = -Math.PI / 2;
  /** Farbverlauf der Komponente „Gradient“ in der .gh-Datei (Farbe, Lage des Griffs) */
  const VERLAUF = { farben: [[0, 0, 139], [50, 178, 206], [87, 166, 31], [255, 215, 0], [255, 0, 0]], faktoren: [0, 0.2536, 0.5009, 0.7482, 1] };

  /** Farbe des Verlaufs bei t ∈ [0, 1] → [r, g, b] (linear zwischen den Griffen) */
  function verlauf(t, V = VERLAUF) {
    const f = V.faktoren, c = V.farben;
    t = Math.max(0, Math.min(1, isFinite(t) ? t : 0));
    if (t <= f[0]) return c[0].slice();
    for (let i = 1; i < f.length; i++) if (t <= f[i]) {
      const u = (t - f[i - 1]) / ((f[i] - f[i - 1]) || 1);
      return [0, 1, 2].map(k => Math.round(c[i - 1][k] + (c[i][k] - c[i - 1][k]) * u));
    }
    return c[c.length - 1].slice();
  }

  /* ---------------------------------------------------------------- schneller Isovist (Vorschlag für _gemeinsam/geo.js) */
  /** Schneidet das Segment ab das achsparallele Rechteck [x0, x1] × [y0, y1]? (Liang–Barsky; rand > 0 vergrößert, < 0 verkleinert das Rechteck) */
  function segmentRechteck(a, b, x0, y0, x1, y1, rand = 1e-7) {
    x0 -= rand; y0 -= rand; x1 += rand; y1 += rand;
    let t0 = 0, t1 = 1;
    const dx = b[0] - a[0], dy = b[1] - a[1], P = [-dx, dx, -dy, dy], Q = [a[0] - x0, x1 - a[0], a[1] - y0, y1 - a[1]];
    for (let i = 0; i < 4; i++) {
      if (P[i] === 0) { if (Q[i] < 0) return false; continue; }
      const r = Q[i] / P[i];
      if (P[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return t0 <= t1;
  }
  /** Raster der Hindernissegmente (Weite g): je Rasterzelle die Segmente, die sie berühren */
  function segmentRaster(hindernisse, g = 5) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of hindernisse) for (const p of s) { if (p[0] < x0) x0 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[0] > x1) x1 = p[0]; if (p[1] > y1) y1 = p[1]; }
    if (!hindernisse.length) { x0 = y0 = 0; x1 = y1 = 1; }
    x0 -= g; y0 -= g; x1 += g; y1 += g;
    const nx = Math.max(1, Math.ceil((x1 - x0) / g)), ny = Math.max(1, Math.ceil((y1 - y0) / g));
    const listen = Array.from({ length: nx * ny }, () => []);
    hindernisse.forEach((s, k) => {
      const i0 = Math.max(0, Math.floor((Math.min(s[0][0], s[1][0]) - x0) / g) - 1), i1 = Math.min(nx - 1, Math.floor((Math.max(s[0][0], s[1][0]) - x0) / g) + 1);
      const j0 = Math.max(0, Math.floor((Math.min(s[0][1], s[1][1]) - y0) / g) - 1), j1 = Math.min(ny - 1, Math.floor((Math.max(s[0][1], s[1][1]) - y0) / g) + 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++)
        if (segmentRechteck(s[0], s[1], x0 + i * g, y0 + j * g, x0 + (i + 1) * g, y0 + (j + 1) * g)) listen[j * nx + i].push(k);
    });
    return { x0, y0, g, nx, ny, zellen: listen.map(L => Int32Array.from(L)), stempel: new Int32Array(hindernisse.length), lauf: 0 };
  }
  /** Isovist wie Geo.isovist (gleiche Strahlen, gleiche Längen, gleiches getroffenes Segment), aber jeder Strahl prüft nur die
      Segmente der Rasterzellen, die er durchläuft (Amanatides–Woo), und hört beim ersten Treffer auf. Etwa 40-mal schneller. */
  function isovistRaster(o, hindernisse, R, opt) {
    const { x0, y0, g, nx, ny, zellen, stempel } = R;
    const fx = (o[0] - x0) / g, fy = (o[1] - y0) / g;
    if (!(fx >= 0 && fy >= 0 && fx < nx && fy < ny)) return Geo.isovist(o, hindernisse, opt);
    const winkel = Math.max(0, Math.min(360, opt.winkel == null ? 360 : opt.winkel)) * Math.PI / 180;
    const n = Math.max(1, Math.round(opt.strahlen || 360)), r = opt.reichweite || 100, dir = opt.richtung || 0;
    const voll = winkel >= 2 * Math.PI - 1e-9;
    const punkte = [], laengen = new Float64Array(n), treffer = new Int32Array(n), winkelListe = new Float64Array(n);
    const i00 = Math.floor(fx), j00 = Math.floor(fy);
    for (let s = 0; s < n; s++) {
      const a = voll ? dir + 2 * Math.PI * s / n : dir - winkel / 2 + (n === 1 ? winkel / 2 : winkel * s / (n - 1));
      const d = [Math.cos(a), Math.sin(a)], lauf = ++R.lauf;
      let i = i00, j = j00, tmin = r, hit = -1;
      const si = d[0] > 0 ? 1 : d[0] < 0 ? -1 : 0, sj = d[1] > 0 ? 1 : d[1] < 0 ? -1 : 0;
      let tx = si > 0 ? (x0 + (i + 1) * g - o[0]) / d[0] : si < 0 ? (x0 + i * g - o[0]) / d[0] : Infinity;
      let ty = sj > 0 ? (y0 + (j + 1) * g - o[1]) / d[1] : sj < 0 ? (y0 + j * g - o[1]) / d[1] : Infinity;
      const dtx = si ? g / Math.abs(d[0]) : Infinity, dty = sj ? g / Math.abs(d[1]) : Infinity;
      while (true) {
        const L = zellen[j * nx + i];
        for (let q = 0; q < L.length; q++) {
          const k = L[q]; if (stempel[k] === lauf) continue; stempel[k] = lauf;
          const sg = hindernisse[k], t = Geo.strahlSegment(o, d, sg[0], sg[1]);
          // gleiche Regel wie Geo.isovist: kleinstes t, bei Gleichstand das Segment mit dem kleineren Index
          if (t < tmin || (t === tmin && hit >= 0 && k < hit)) { tmin = t; hit = k; }
        }
        const aus = Math.min(tx, ty);
        if (tmin <= aus) break;
        if (tx < ty) { i += si; tx += dtx; } else { j += sj; ty += dty; }
        if (i < 0 || j < 0 || i >= nx || j >= ny) break;
      }
      laengen[s] = tmin; treffer[s] = hit; winkelListe[s] = a;
      punkte.push([o[0] + d[0] * tmin, o[1] + d[1] * tmin]);
    }
    return { o, punkte, laengen, treffer, winkel: winkelListe, voll, reichweite: r, hindernisse };
  }

  /* ---------------------------------------------------------------- Analysis Grid */
  /** Berührt die Strecke a–b ein Hindernis (Schnitt oder Abstand ≤ tol)? Sucht nur in den Zellen des Segmentrasters R um die Strecke. */
  function blockiert(a, b, hindernisse, R, tol = 1e-6) {
    const { x0, y0, g, nx, ny, zellen, stempel } = R, lauf = ++R.lauf;
    const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - tol - x0) / g)), i1 = Math.min(nx - 1, Math.floor((Math.max(a[0], b[0]) + tol - x0) / g));
    const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - tol - y0) / g)), j1 = Math.min(ny - 1, Math.floor((Math.max(a[1], b[1]) + tol - y0) / g));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const L = zellen[j * nx + i];
      for (let q = 0; q < L.length; q++) {
        const k = L[q]; if (stempel[k] === lauf) continue; stempel[k] = lauf;
        const s = hindernisse[k];
        if (Geo.segmentSchnitt(a, b, s[0], s[1]) || Geo.abstandSegment(s[0], a, b).d <= tol || Geo.abstandSegment(s[1], a, b).d <= tol ||
            Geo.abstandSegment(a, s[0], s[1]).d <= tol || Geo.abstandSegment(b, s[0], s[1]).d <= tol) return true;
      }
    }
    return false;
  }
  /** Analysis Grid wie in docs/visibility.md §3 der DeCodingSpaces-Toolbox (Definition abgelesen, kein Code übernommen):
      Zellmitten auf einem quadratischen Gitter durch den Füllpunkt (Abstand cs), vom Füllpunkt aus in vier Richtungen geflutet.
      Ein Schritt ist gesperrt, wenn die Strecke zwischen zwei Mitten ein Hindernis berührt (≤ 1e-6 m); die Flutung bleibt im
      umschreibenden Rechteck der Hindernisse. R: Segmentraster (segmentRaster) für die Suche.
      → {cs, nx, ny, x0, y0 (linke obere Ecke des Zellenbilds), aktiv, zeilen: [[Zellindex …] je Gitterzeile, von unten (Süden) nach oben],
         anzahl, start (Zelle des Füllpunkts), bounds} */
  function analyseRaster(hindernisse, cs, fuell, R = null) {
    R = R || segmentRaster(hindernisse, 5);
    const bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const s of hindernisse) for (const p of s) { bb.x0 = Math.min(bb.x0, p[0]); bb.y0 = Math.min(bb.y0, p[1]); bb.x1 = Math.max(bb.x1, p[0]); bb.y1 = Math.max(bb.y1, p[1]); }
    const leer = { cs, nx: 1, ny: 1, x0: fuell[0] - cs / 2, y0: fuell[1] - cs / 2, aktiv: new Uint8Array(1), zeilen: [], anzahl: 0, start: -1, bounds: bb };
    const innen = q => q[0] >= bb.x0 && q[0] <= bb.x1 && q[1] >= bb.y0 && q[1] <= bb.y1;
    if (!hindernisse.length || !innen(fuell)) return leer;
    const imin = Math.ceil((bb.x0 - fuell[0]) / cs - 1e-9), imax = Math.floor((bb.x1 - fuell[0]) / cs + 1e-9);
    const jmin = Math.ceil((bb.y0 - fuell[1]) / cs - 1e-9), jmax = Math.floor((bb.y1 - fuell[1]) / cs + 1e-9);
    const nx = imax - imin + 1, ny = jmax - jmin + 1, aktiv = new Uint8Array(nx * ny);
    const mitte = k => { const i = k % nx, j = (k - i) / nx; return [fuell[0] + (i + imin) * cs, fuell[1] + (j + jmin) * cs]; };
    const start = (-jmin) * nx + (-imin);
    aktiv[start] = 1;
    const schlange = [start];
    let anzahl = 0;
    for (let h = 0; h < schlange.length; h++) {
      const k = schlange[h], i = k % nx, j = (k - i) / nx, a = mitte(k); anzahl++;
      for (const m of [i < nx - 1 ? k + 1 : -1, i > 0 ? k - 1 : -1, j < ny - 1 ? k + nx : -1, j > 0 ? k - nx : -1]) {
        if (m < 0 || aktiv[m]) continue;
        const b = mitte(m);
        if (!innen(b) || blockiert(a, b, hindernisse, R)) continue;
        aktiv[m] = 1; schlange.push(m);
      }
    }
    const zeilen = [];
    for (let j = ny - 1; j >= 0; j--) { const Z = []; for (let i = 0; i < nx; i++) if (aktiv[j * nx + i]) Z.push(j * nx + i); if (Z.length) zeilen.push(Z); }
    return { cs, nx, ny, x0: fuell[0] + (imin - 0.5) * cs, y0: fuell[1] + (jmin - 0.5) * cs, aktiv, zeilen, anzahl, start, bounds: bb };
  }
  /** Mitte der Zelle k (Analysis Point) */
  function zellMitte(G, k) { const i = k % G.nx, j = (k - i) / G.nx; return [G.x0 + (i + 0.5) * G.cs, G.y0 + (j + 0.5) * G.cs]; }
  /** Index der Zelle unter dem Punkt q oder −1 */
  function zelleBei(G, q) {
    const i = Math.floor((q[0] - G.x0) / G.cs), j = Math.floor((q[1] - G.y0) / G.cs);
    return i >= 0 && j >= 0 && i < G.nx && j < G.ny ? j * G.nx + i : -1;
  }

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  /** Neuer Zustand: Beispielstadt, Analyserahmen = ganze Szene, Füllpunkt auf dem Platz vor der Kirche */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = Szenen.stadt(zufall);
    const rahmen = { x0: 0, y0: 0, b: szene.b, h: szene.h };
    const ecken = [[0, 0], [szene.b, 0], [szene.b, szene.h], [0, szene.h]];
    // Hindernisse wie in der .gh-Datei: Gebäudekanten und die Kanten des Analyserahmens (Explode → Obstacle Lines)
    const hindernisse = szene.hindernisse.concat(Geo.kanten(ecken));
    const c = Geo.schwerpunkt(szene.platz), bb = Geo.bbox(szene.platz);
    const z = { t: 0, szene, b: szene.b, h: szene.h, rahmen, ecken, hindernisse, segRaster: segmentRaster(hindernisse, 5),
                fuell: [c[0] - bb.b * 0.25, c[1] + bb.h * 0.33], auswahl: -1, auswahlIso: null, auswahlMasse: null };
    baueRaster(z, p);
    return z;
  }

  /** Raster neu anlegen (Zellgröße oder Füllpunkt geändert) und alle Werte verwerfen */
  function baueRaster(z, p) {
    z.raster = analyseRaster(z.hindernisse, Math.max(1, Math.min(10, p.zelle)), z.fuell, z.segRaster);
    z.auswahl = -1; z.auswahlIso = null; z.auswahlMasse = null;
    leere(z);
  }
  /** Werte verwerfen (Isovist-Parameter geändert): neu beginnen, t = 0 */
  function leere(z) {
    const n = z.raster.nx * z.raster.ny;
    z.werte = {}; z.min = {}; z.max = {}; z.summe = {};
    for (const k of KENNGROESSEN) { z.werte[k] = new Float64Array(n).fill(NaN); z.min[k] = Infinity; z.max[k] = -Infinity; z.summe[k] = 0; }
    z.zeile = 0; z.berechnet = 0; z.t = 0;
  }

  const isoOpt = p => ({ winkel: p.winkel, reichweite: p.reichweite, strahlen: p.strahlen, richtung: RICHTUNG });
  /** Isovist von Punkt q mit den Parametern p (gleiches Ergebnis wie Geo.isovist) */
  function isovistAn(z, p, q) { return isovistRaster(q, z.hindernisse, z.segRaster, isoOpt(p)); }

  /** Zelle k berechnen: Isovist der Zellmitte, alle 17 Kenngrößen speichern */
  function rechneZelle(z, p, k) {
    const m = Geo.isovistMasse(isovistAn(z, p, zellMitte(z.raster, k)));
    for (const key of KENNGROESSEN) {
      const v = m[key]; z.werte[key][k] = v; z.summe[key] += v;
      if (v < z.min[key]) z.min[key] = v; if (v > z.max[key]) z.max[key] = v;
    }
    z.berechnet++;
    return m;
  }

  /** fertig, wenn alle Zeilen mit Zellen berechnet sind */
  const fertig = z => z.zeile >= z.raster.zeilen.length;

  /** Ein Schritt: die nächste Gitterzeile (von Süden nach Norden, wie die Komponente die Zellen ausgibt) berechnen; erhöht z.t */
  function schritt(z, p) {
    if (!fertig(z)) { for (const k of z.raster.zeilen[z.zeile]) rechneZelle(z, p, k); z.zeile++; }
    z.t++;
    return z;
  }
  /** alle restlichen Zeilen berechnen */
  function rechneAlle(z, p) { while (!fertig(z)) schritt(z, p); return z; }

  /** Parameter ohne Neustart übernehmen: Kenngröße nur umfärben (alle 17 Werte liegen vor), sonst neu rechnen */
  function aendere(z, p, id) {
    if (id === "zelle") baueRaster(z, p);
    else if (id === "winkel" || id === "reichweite" || id === "strahlen") { leere(z); if (z.auswahl >= 0) waehle(z, p, z.auswahl); }
  }

  /** Zelle k auswählen: ihr Isovist und ihre Werte werden gezeigt; false, wenn k keine aktive Zelle ist */
  function waehle(z, p, k) {
    if (k < 0 || !z.raster.aktiv[k]) { z.auswahl = -1; z.auswahlIso = null; z.auswahlMasse = null; return false; }
    z.auswahl = k; z.auswahlIso = isovistAn(z, p, zellMitte(z.raster, k)); z.auswahlMasse = Geo.isovistMasse(z.auswahlIso);
    return true;
  }
  /** liegt der Punkt in einem Gebäude? */
  function imGebaeude(z, q) { return z.szene.gebaeude.some(g => Geo.punktInPoly(q, g)); }
  /** Füllpunkt versetzen (im Rahmen, nicht in ein Gebäude); baut das Raster neu; true, wenn versetzt */
  function setzeFuellpunkt(z, p, q) {
    const R = z.rahmen;
    if (q[0] < R.x0 || q[1] < R.y0 || q[0] >= R.x0 + R.b || q[1] >= R.y0 + R.h || imGebaeude(z, q)) return false;
    z.fuell = [q[0], q[1]]; baueRaster(z, p); return true;
  }

  /** t ∈ [0, 1] des Werts v für die Kenngröße key (Bounds → Gradient wie in der .gh-Datei) */
  function anteil(z, key, v) { const a = z.min[key], b = z.max[key]; return b > a ? (v - a) / (b - a) : 0.5; }
  /** Mittelwert der berechneten Zellen */
  const mittel = (z, key) => z.berechnet ? z.summe[key] / z.berechnet : NaN;

  return { STANDARD, KENNGROESSEN, RICHTUNG, VERLAUF, verlauf, segmentRechteck, segmentRaster, isovistRaster, blockiert, analyseRaster, zellMitte, zelleBei,
           erzeuge, baueRaster, leere, isovistAn, rechneZelle, fertig, schritt, rechneAlle, aendere, waehle, imGebaeude, setzeFuellpunkt, anteil, mittel };
});
