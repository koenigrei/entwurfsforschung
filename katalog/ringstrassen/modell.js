/* Ringstraßen · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Ringroads“ aus dem Parametric Planning Catalogue
   (DeCodingSpaces – Ondřej Veselý, Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie in RingRoads.gh:
   1. „Divide Terrain into Cells“: Divide Domain² + Isotrim teilen das Gelände in Auflösung × Auflösung Zellen (Grid Resolution 50);
      je Zelle Mittelpunkt (CellCenters) und Fläche (Area, auf dem Gelände gemessen).
   2. „Smoothing Terrain to reduce small bumps“: Surface From Points (Interpolate = false) aus den Zellmitten – eine
      kubische B-Spline-Fläche mit den Mitten als Kontrollpunkten; „Calculate Slope for each Cell“ = Angle(Normale, Z).
   3. „Height Difference from Center“ = |z_Zelle − z_Zentrum|, „Distance to Center“ = Abstand Zentrum–Zellmitte,
      „Distance to Road“ = kleinster Abstand zu den Straßenkurven (Curve Closest Point, Sort List, List Item 0).
   4. „Score each Cell“: Entwine der vier Werte, Remap je Wert über seine Spannweite (Bounds) auf 0…1, Flip Matrix,
      Weighted Average mit den Gewichten [WeightTerrain, WeightTerrain, WeightRoad, WeightCenter].
   5. „Sort Cells by Score. Pick cells up until they reach necessary Area“: Sort List aufsteigend, Mass Addition (Teilsummen),
      Smaller Than „Needed Area“ (zwei Regler → zwei Ringe), Cull Pattern; „Draw a line around them (AlphaShape)“:
      Alpha Shape mit Radius = mittlere Zellbreite × 2, Smooth Polyline (Strength 1, Times 1), auf das Gelände projiziert. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: WeightTerrain 0, WeightRoad 0,6, WeightCenter 0,86 [0..1], Grid Resolution 50 [0..100],
      Needed Area 386665 und 1175109 [0..10000000] m², Alpha-Faktor „Number Slider“ 2 [0..10], Smooth Strength „Number Slider“ 1 [0..1] */
  const STANDARD = { gewTerrain: 0, gewStrasse: 0.6, gewZentrum: 0.86, aufloesung: 50, flaeche1: 386665, flaeche2: 1175109, alpha: 2, staerke: 1 };
  /** Gelände der Beispielszene: 2 km × 2 km, damit beide Flächen (39 ha und 118 ha) Platz haben */
  const GELAENDE = { n: 101, groesse: 2000, hoehe: 300 };

  /* ---------------------------------------------------------------- 1.–3. Zellen und ihre Werte */
  /** Zellen R × R: Mitte (x, y, z), Fläche auf dem Gelände (zwei Dreiecke über den Ecken), Breite in u-Richtung (3D) */
  function zellen(G, R) {
    R = Math.max(2, Math.round(R));
    const c = G.groesse / R, n = R * R, x = new Float64Array(n), y = new Float64Array(n), z = new Float64Array(n), flaeche = new Float64Array(n), breite = new Float64Array(n);
    const H = (a, b) => Szenen.hoehe(G, a, b);
    const tri = (p, q, r) => { const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], v = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
      return 0.5 * Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]); };
    for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
      const k = j * R + i, x0 = i * c, y0 = j * c, x1 = x0 + c, y1 = y0 + c;
      x[k] = x0 + c / 2; y[k] = y0 + c / 2; z[k] = H(x[k], y[k]);
      const a = [x0, y0, H(x0, y0)], b = [x1, y0, H(x1, y0)], d = [x1, y1, H(x1, y1)], e = [x0, y1, H(x0, y1)];
      flaeche[k] = tri(a, b, d) + tri(a, d, e);
      breite[k] = Math.hypot(c, H(x1, y[k]) - H(x0, y[k]));
    }
    return { R, c, n, x, y, z, flaeche, breite };
  }
  /** Hangneigung je Zelle auf der geglätteten Fläche (Surface From Points, kubische B-Spline mit den Zellmitten als
      Kontrollpunkten): an den Knoten Gewichte [1, 4, 1]/6 und Ableitung [−1, 0, 1]/2 je Richtung; Rand gespiegelt fortgesetzt. */
  function neigungen(Z) {
    const R = Z.R, h = (i, j) => Z.z[Math.max(0, Math.min(R - 1, j)) * R + Math.max(0, Math.min(R - 1, i))], w = [1 / 6, 4 / 6, 1 / 6], out = new Float64Array(Z.n);
    for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
      let gx = 0, gy = 0;
      for (let d = -1; d <= 1; d++) { gx += w[d + 1] * (h(i + 1, j + d) - h(i - 1, j + d)) / 2; gy += w[d + 1] * (h(i + d, j + 1) - h(i + d, j - 1)) / 2; }
      out[j * R + i] = Math.atan(Math.hypot(gx, gy) / Z.c);   // Angle(Unit Z, Normal) = atan(|∇h|)
    }
    return out;
  }
  /** kleinster Abstand (3D) eines Punktes zu Polylinien [[x, y, z], …] */
  function abstandStrassen(q, strassen) {
    let best = Infinity;
    for (const S of strassen) for (let i = 0; i < S.length - 1; i++) {
      const a = S[i], b = S[i + 1], u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = u[0] * u[0] + u[1] * u[1] + u[2] * u[2];
      let t = L ? ((q[0] - a[0]) * u[0] + (q[1] - a[1]) * u[1] + (q[2] - a[2]) * u[2]) / L : 0; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(a[0] + u[0] * t - q[0], a[1] + u[1] * t - q[1], a[2] + u[2] * t - q[2]); if (d < best) best = d;
    }
    return best;
  }
  /** die vier Werte je Zelle: Neigung (rad), Höhenunterschied zum Zentrum, Abstand zur Straße, Abstand zum Zentrum */
  function werte(Z, zentrum, strassen) {
    const neig = neigungen(Z), hoehe = new Float64Array(Z.n), strasse = new Float64Array(Z.n), mitte = new Float64Array(Z.n);
    for (let k = 0; k < Z.n; k++) {
      const q = [Z.x[k], Z.y[k], Z.z[k]];
      hoehe[k] = Math.abs(Z.z[k] - zentrum[2]);
      strasse[k] = abstandStrassen(q, strassen);
      mitte[k] = Math.hypot(q[0] - zentrum[0], q[1] - zentrum[1], q[2] - zentrum[2]);
    }
    return [neig, hoehe, strasse, mitte];
  }

  /* ---------------------------------------------------------------- 4. Bewertung */
  /** Remap Numbers mit Source = Bounds der Liste, Target 0…1 (leere Spannweite → 0) */
  function remap(v) {
    let mn = Infinity, mx = -Infinity; for (const a of v) { if (a < mn) mn = a; if (a > mx) mx = a; }
    const d = mx - mn, r = new Float64Array(v.length); for (let i = 0; i < v.length; i++) r[i] = d > 0 ? (v[i] - mn) / d : 0; return r;
  }
  /** Score je Zelle = gewichtetes Mittel der vier auf 0…1 abgebildeten Werte, Gewichte [wT, wT, wR, wC]; alle 0 → einfaches Mittel */
  function bewerte(W, p) {
    const g = [p.gewTerrain, p.gewTerrain, p.gewStrasse, p.gewZentrum], sg = g.reduce((a, b) => a + b, 0), V = W.map(remap), n = V[0].length, s = new Float64Array(n);
    for (let k = 0; k < n; k++) { let a = 0; for (let m = 0; m < 4; m++) a += (sg > 0 ? g[m] : 1) * V[m][k]; s[k] = a / (sg > 0 ? sg : 4); }
    return s;
  }
  /** Sort List aufsteigend nach Score (bei Gleichstand nach Index) */
  function rangfolge(score) { return Int32Array.from([...score.keys()].sort((a, b) => score[a] - score[b] || a - b)); }

  /* ---------------------------------------------------------------- 5. Auswahl nach Fläche, Umriss */
  /** Mass Addition + Smaller Than: Anzahl der vordersten Zellen, deren Teilsumme (einschließlich) kleiner als die Fläche ist */
  function anzahlBis(reihe, flaeche, ziel) {
    let s = 0, n = 0; for (const k of reihe) { s += flaeche[k]; if (s < ziel) n++; else break; } return n;
  }
  /** Alpha-Hülle der Mittelpunkte gewählter Zellen auf einem Abtastraster (f Proben je Zelle): ein Abtastpunkt liegt außen,
      wenn ihn ein leerer Kreis vom Radius r enthält (Kreismitten auf dem Raster). → Maske {w, h, x0, y0, d, innen: Uint8Array} */
  function alphaMaske(Z, gewaehlt, r, f = 2) {
    const d = Z.c / f, rand = Math.ceil(r / d) + 2, w = Z.R * f + 2 * rand, h = w, x0 = Z.c / 2 - rand * d, y0 = x0;   // Abtastpunkte treffen die Zellmitten
    const A = new Uint8Array(w * h);
    for (const k of gewaehlt) { const i = Math.round((Z.x[k] - x0) / d), j = Math.round((Z.y[k] - y0) / d); A[j * w + i] = 1; }
    const rr = Math.ceil(r / d), off = [];
    for (let dj = -rr; dj <= rr; dj++) for (let di = -rr; di <= rr; di++) { const l = Math.hypot(di, dj) * d; if (l < r - 1e-9) off.push([di, dj]); }
    // leere Kreismitten: kein gewählter Punkt näher als r
    const leer = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let frei = 1;
      for (const [di, dj] of off) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < w && b < h && A[b * w + a]) { frei = 0; break; } }
      leer[j * w + i] = frei;
    }
    // außen = innerhalb r um eine leere Kreismitte
    const innen = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let aussen = 0;
      for (const [di, dj] of off) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= w || b >= h || leer[b * w + a]) { aussen = 1; break; } }
      innen[j * w + i] = aussen ? 0 : 1;
    }
    return { w, h, x0, y0, d, innen };
  }
  /** Umrisslinien einer 0/1-Maske (Marching Squares auf Höhe 0,5) als geschlossene Polygone */
  function umrisse(Mk) {
    const { w, h, x0, y0, d, innen } = Mk, v = (i, j) => (i < 0 || j < 0 || i >= w || j >= h) ? 0 : innen[j * w + i];
    const nach = new Map(), key = (a, b) => a + "," + b;   // Kantenmitten als halbzahlige Rasterkoordinaten ×2
    const verbinde = (p, q) => { nach.set(key(p[0], p[1]), q); };
    for (let j = -1; j < h; j++) for (let i = -1; i < w; i++) {
      const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), e = v(i, j + 1), fall = a | (b << 1) | (c << 2) | (e << 3);
      if (fall === 0 || fall === 15) continue;
      const O = [2 * i + 1, 2 * j], Rr = [2 * i + 2, 2 * j + 1], U = [2 * i + 1, 2 * j + 2], L = [2 * i, 2 * j + 1];
      // Richtung so, dass das Innere links liegt (gegen den Uhrzeigersinn in Bildschirmkoordinaten egal – nur konsistent)
      switch (fall) {
        case 1: verbinde(L, O); break; case 2: verbinde(O, Rr); break; case 3: verbinde(L, Rr); break;
        case 4: verbinde(Rr, U); break; case 5: verbinde(L, U); verbinde(Rr, O); break; case 6: verbinde(O, U); break;
        case 7: verbinde(L, U); break; case 8: verbinde(U, L); break; case 9: verbinde(U, O); break;
        case 10: verbinde(O, L); verbinde(U, Rr); break; case 11: verbinde(U, Rr); break; case 12: verbinde(Rr, L); break;
        case 13: verbinde(Rr, O); break; case 14: verbinde(O, L); break;
      }
    }
    const loops = [], gesehen = new Set();
    for (const [k0] of nach) {
      if (gesehen.has(k0)) continue;
      const P = []; let k = k0, sicher = 0;
      while (!gesehen.has(k) && sicher++ < 1e6) {
        gesehen.add(k); const [a, b] = k.split(",").map(Number); P.push([x0 + a / 2 * d, y0 + b / 2 * d]);
        const q = nach.get(k); if (!q) break; k = key(q[0], q[1]);
      }
      if (P.length >= 3) loops.push(P);
    }
    return loops;
  }
  /** Smooth Polyline für geschlossene Linien: jeder Punkt rückt um strength zur Mitte seiner Nachbarn; times Durchgänge */
  function glaetteZu(P, strength, times) {
    let Q = P.map(q => q.slice()); const n = Q.length;
    for (let r = 0; r < times; r++) {
      const R = Q.map(q => q.slice());
      for (let i = 0; i < n; i++) { const a = Q[(i - 1 + n) % n], b = Q[(i + 1) % n]; for (let k = 0; k < 2; k++) R[i][k] = Q[i][k] + strength * ((a[k] + b[k]) / 2 - Q[i][k]); }
      Q = R;
    }
    return Q;
  }
  /** Ringstraße um die ersten n Zellen der Rangfolge: Alpha-Hülle, geglättet (je Zelle zwei Abtastpunkte → zwei Durchgänge je „Times“),
      auf das Gelände gelegt → {linien: [[x, y, z]…], laenge (3D), flaeche (eingeschlossen, waagerecht)} */
  function ring(z, p, n) {
    if (n <= 0) return { linien: [], laenge: 0, flaeche: 0 };
    const Z = z.Z, r = p.alpha * z.zellbreite, f = 2;
    const loops = umrisse(alphaMaske(Z, z.reihe.subarray(0, n), Math.max(r, Z.c * 0.75), f))
      .map(L => glaetteZu(L, p.staerke, f)).map(L => L.map(q => [q[0], q[1], Szenen.hoehe(z.G, q[0], q[1])]));
    let laenge = 0, flaeche = 0;
    for (const L of loops) { for (let i = 0; i < L.length; i++) { const a = L[i], b = L[(i + 1) % L.length]; laenge += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); } flaeche += Geo.flaecheS(L); }
    return { linien: loops, laenge, flaeche: Math.abs(flaeche) };
  }

  /* ---------------------------------------------------------------- Szene: Straßen und Zentrum */
  /** Straße als Polylinie von a nach b mit seitlichem Versatz (Anteil der Länge), geglättet, verdichtet, auf das Gelände gelegt */
  function strasse(zufall, G, a, b, versatz) {
    const L = Geo.abstand(a, b), nrm = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L], K = 7, P = [a];
    for (let i = 1; i < K; i++) { const s = (zufall() - 0.5) * 2 * versatz * L; const q = Geo.lerp(a, b, i / K); P.push([q[0] + nrm[0] * s, q[1] + nrm[1] * s]); }
    P.push(b);
    const S = Szenen.glatt(P, 3), kl = v => Math.max(0, Math.min(G.groesse, v));
    return S.map(q => [kl(q[0]), kl(q[1]), Szenen.hoehe(G, kl(q[0]), kl(q[1]))]);
  }
  /** Zentrum: flache, eher tief gelegene Stelle im mittleren Bereich (Neigung + 0,8 · Höhe, beide auf 0…1 bezogen) */
  function flachsteMitte(G) {
    const Z = zellen(G, 20), ng = remap(neigungen(Z)), hz = remap(Z.z), wert = k => ng[k] + 0.8 * hz[k]; let best = -1;
    for (let k = 0; k < Z.n; k++) { const i = k % Z.R, j = Math.floor(k / Z.R); if (i < 6 || j < 6 || i > 13 || j > 13) continue; if (best < 0 || wert(k) < wert(best)) best = k; }
    return [Z.x[best], Z.y[best]];
  }
  /** drei Straßen: eine quer über das Gelände am Zentrum vorbei, zwei vom Rand zum Zentrum */
  function strassen(zufall, G, c) {
    const S = G.groesse, rnd = (a, b) => a + (b - a) * zufall();
    const durch = [c[0] + rnd(-0.06, 0.06) * S, c[1] + rnd(0.04, 0.09) * S];
    const s1 = strasse(zufall, G, [0, rnd(0.25, 0.75) * S], durch, 0.05).concat(strasse(zufall, G, durch, [S, rnd(0.25, 0.75) * S], 0.05).slice(1));
    const s2 = strasse(zufall, G, [rnd(0.25, 0.75) * S, 0], [c[0] + rnd(-0.03, 0.03) * S, c[1] - 0.02 * S], 0.06);
    const s3 = strasse(zufall, G, [rnd(0.2, 0.8) * S, S], durch, 0.06);
    return [s1, s2, s3];
  }

  /* ---------------------------------------------------------------- Zustand */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const G = Szenen.gelaende(zufall, GELAENDE), c = flachsteMitte(G);
    const z = { t: 0, n: 0, G, b: G.groesse, h: G.groesse, zentrum: [c[0], c[1], Szenen.hoehe(G, c[0], c[1])], strassen: strassen(zufall, G, c), umrissCache: null };
    baue(z, p); rechne(z, p);
    return z;
  }
  /** Zellen neu (Auflösung) */
  function baue(z, p) { z.Z = zellen(z.G, p.aufloesung); let s = 0; for (const b of z.Z.breite) s += b; z.zellbreite = s / z.Z.n; }
  /** Werte, Score, Rangfolge, Zellzahlen und Ringe je „Needed Area“ */
  function rechne(z, p) {
    z.W = werte(z.Z, z.zentrum, z.strassen); z.score = bewerte(z.W, p); z.reihe = rangfolge(z.score);
    z.ziele = [p.flaeche1, p.flaeche2].map((a, i) => ({ i, flaeche: a, n: anzahlBis(z.reihe, z.Z.flaeche, a) }));
    z.nMax = Math.max(...z.ziele.map(q => q.n));
    z.ringe = z.ziele.map(q => ring(z, p, q.n));
    z.umrissCache = null; z.n = Math.min(z.n, z.nMax);
  }
  /** Ein Schritt: eine Zelle mehr nach Rang (bis die größere Fläche erreicht ist) */
  function schritt(z, p) { if (z.n < z.nMax) z.n++; z.t++; return z; }
  const fertig = z => z.n >= z.nMax;
  /** gewählte Fläche der ersten n Zellen */
  function flaecheBis(z, n) { let s = 0; for (let i = 0; i < n; i++) s += z.Z.flaeche[z.reihe[i]]; return s; }
  /** Umriss der aktuell gewählten Zellen (für die Anzeige während des Wachsens, je n zwischengespeichert) */
  function aktuellerUmriss(z, p) {
    if (!z.umrissCache || z.umrissCache.n !== z.n) z.umrissCache = { n: z.n, ring: ring(z, p, z.n) };
    return z.umrissCache.ring;
  }
  /** Regler: Auflösung → neue Zellen; sonst neu bewerten; Ergebnis sofort fertig (wie Grasshopper) */
  function aendere(z, p, id) {
    if (id && id.startsWith("zeige")) return;
    if (id === "aufloesung" || z.Z.R !== Math.max(2, Math.round(p.aufloesung))) baue(z, p);
    rechne(z, p); z.n = z.nMax;
  }
  /** Zentrum per Klick setzen und sofort neu rechnen */
  function setzeZentrum(z, p, q) {
    const kl = v => Math.max(0, Math.min(z.G.groesse, v)), x = kl(q[0]), y = kl(q[1]);
    z.zentrum = [x, y, Szenen.hoehe(z.G, x, y)]; rechne(z, p); z.n = z.nMax;
  }
  /** Wachstum von vorn zeigen */
  function abspielen(z) { z.n = 0; z.t = 0; z.umrissCache = null; }

  return { STANDARD, GELAENDE, zellen, neigungen, abstandStrassen, werte, remap, bewerte, rangfolge, anzahlBis, alphaMaske, umrisse, glaetteZu, ring,
           strasse, strassen, flachsteMitte, erzeuge, baue, rechne, schritt, fertig, flaecheBis, aktuellerUmriss, aendere, setzeZentrum, abspielen };
});
