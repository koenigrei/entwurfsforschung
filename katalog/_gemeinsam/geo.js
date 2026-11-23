/* Parametric Planning Catalogue · gemeinsame Geometrie und Graphen (ohne DOM, in Node testbar)
   Punkte sind [x, y], Polygone Listen von Punkten ohne doppelten Endpunkt, Segmente [[x1, y1], [x2, y2]].
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function (wurzel, fabrik) {
  const G = fabrik();
  if (typeof module === "object" && module.exports) module.exports = G;
  else wurzel.Geo = G;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const EPS = 1e-9;

  /* ---------------------------------------------------------------- Punkte und Vektoren */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const mul = (a, s) => [a[0] * s, a[1] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const kreuz = (a, b) => a[0] * b[1] - a[1] * b[0];
  const laenge = a => Math.hypot(a[0], a[1]);
  const abstand = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const norm = a => { const l = laenge(a) || 1; return [a[0] / l, a[1] / l]; };

  /** kleinster Abstand Punkt–Segment und Parameter t des Fußpunkts */
  function abstandSegment(p, a, b) {
    const d = sub(b, a), l2 = dot(d, d);
    const t = l2 < EPS ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), d) / l2));
    const q = lerp(a, b, t);
    return { d: abstand(p, q), t, q };
  }

  /* ---------------------------------------------------------------- Polygone */
  /** vorzeichenbehaftete Fläche (positiv = gegen den Uhrzeigersinn in y-oben-Koordinaten) */
  function flaecheS(poly) {
    let s = 0;
    for (let i = 0, n = poly.length; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; }
    return s / 2;
  }
  const flaeche = poly => Math.abs(flaecheS(poly));
  function umfang(poly) { let s = 0; for (let i = 0; i < poly.length; i++) s += abstand(poly[i], poly[(i + 1) % poly.length]); return s; }
  function schwerpunkt(poly) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, n = poly.length; i < n; i++) {
      const p = poly[i], q = poly[(i + 1) % n], f = p[0] * q[1] - q[0] * p[1];
      a += f; cx += (p[0] + q[0]) * f; cy += (p[1] + q[1]) * f;
    }
    if (Math.abs(a) < EPS) { let x = 0, y = 0; poly.forEach(p => { x += p[0]; y += p[1]; }); return [x / poly.length, y / poly.length]; }
    return [cx / (3 * a), cy / (3 * a)];
  }
  function punktInPoly(p, poly) {
    let innen = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) innen = !innen;
    }
    return innen;
  }
  function kanten(poly) { return poly.map((p, i) => [p, poly[(i + 1) % poly.length]]); }
  function bbox(punkte) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of punkte) { if (p[0] < x0) x0 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[0] > x1) x1 = p[0]; if (p[1] > y1) y1 = p[1]; }
    return { x0, y0, x1, y1, b: x1 - x0, h: y1 - y0 };
  }
  /** Punkte mit (fast) gleichen Nachbarn und Punkte auf Geraden entfernen */
  function bereinige(poly, tol = 1e-6) {
    let P = poly.filter((p, i) => abstand(p, poly[(i + 1) % poly.length]) > tol);
    let geaendert = true;
    while (geaendert && P.length > 3) {
      geaendert = false;
      for (let i = 0; i < P.length; i++) {
        const a = P[(i + P.length - 1) % P.length], b = P[i], c = P[(i + 1) % P.length];
        if (Math.abs(kreuz(sub(b, a), sub(c, b))) < tol * (abstand(a, b) + abstand(b, c))) { P.splice(i, 1); geaendert = true; break; }
      }
    }
    return P;
  }
  /** konvexe Hülle (Andrew), gegen den Uhrzeigersinn */
  function konvexeHuelle(punkte) {
    const P = punkte.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (P.length < 3) return P;
    const k = (o, a, b) => kreuz(sub(a, o), sub(b, o));
    const u = [], l = [];
    for (const p of P) { while (l.length >= 2 && k(l[l.length - 2], l[l.length - 1], p) <= 0) l.pop(); l.push(p); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (u.length >= 2 && k(u[u.length - 2], u[u.length - 1], p) <= 0) u.pop(); u.push(p); }
    u.pop(); l.pop();
    return l.concat(u);
  }
  /** Polygon auf die Halbebene {p : (p − p0) · n ≤ 0} beschneiden (Sutherland–Hodgman; das Polygon darf konkav sein) */
  function schneideHalbebene(poly, p0, n) {
    const out = [], s = p => dot(sub(p, p0), n);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], sa = s(a), sb = s(b);
      if (sa <= 0) out.push(a);
      if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) out.push(lerp(a, b, sa / (sa - sb)));
    }
    return out;
  }
  /** Polygon entlang der Geraden durch a mit Richtung d teilen → [links, rechts] (bei konkaven Polygonen können Teile zusammenhängen) */
  function teilePolygon(poly, a, d) {
    const n = [-d[1], d[0]];
    return [schneideHalbebene(poly, a, mul(n, -1)), schneideHalbebene(poly, a, n)];
  }
  /** Schnitt der Geraden (a, Richtung d) mit dem Polygonrand: sortierte Parameter s, a + s·d */
  function geradeSchnittPoly(poly, a, d) {
    const S = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], e = sub(q, p), den = kreuz(d, e);
      if (Math.abs(den) < EPS) continue;
      const w = sub(p, a), s = kreuz(w, e) / den, u = kreuz(w, d) / den;
      if (u >= -EPS && u < 1 - EPS) S.push(s);
    }
    return S.sort((x, y) => x - y);
  }
  /** Polygon um d nach innen versetzen (d < 0: nach außen); Kanten werden parallel verschoben und neu geschnitten.
      Für einfache Polygone mit kleinem Versatz; Ecken mit sehr spitzen Winkeln werden begrenzt. */
  function versetze(poly, d) {
    const ccw = flaecheS(poly) > 0, n = poly.length, L = [];
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n], t = norm(sub(b, a));
      const inn = ccw ? [-t[1], t[0]] : [t[1], -t[0]];
      L.push([add(a, mul(inn, d)), t]);
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      const [p1, t1] = L[(i + n - 1) % n], [p2, t2] = L[i], den = kreuz(t1, t2);
      if (Math.abs(den) < 1e-6) { out.push(p2); continue; }
      const s = kreuz(sub(p2, p1), t2) / den, q = add(p1, mul(t1, s));
      if (abstand(q, poly[i]) > Math.abs(d) * 4) { out.push(add(poly[i], mul(norm(sub(q, poly[i])), Math.abs(d) * 4))); continue; }
      out.push(q);
    }
    return out;
  }

  /* ---------------------------------------------------------------- Strahlen und Schnitte */
  /** Schnitt Strahl (o + t·d, t ≥ 0) mit Segment ab → t oder Infinity */
  function strahlSegment(o, d, a, b) {
    const e = sub(b, a), den = kreuz(d, e);
    if (Math.abs(den) < EPS) return Infinity;
    const w = sub(a, o), t = kreuz(w, e) / den, u = kreuz(w, d) / den;
    return t >= 0 && u >= 0 && u <= 1 ? t : Infinity;
  }
  /** Schnitt zweier Segmente → {p, t, u} oder null */
  function segmentSchnitt(a, b, c, d) {
    const r = sub(b, a), s = sub(d, c), den = kreuz(r, s);
    if (Math.abs(den) < EPS) return null;
    const w = sub(c, a), t = kreuz(w, s) / den, u = kreuz(w, r) / den;
    if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
    return { p: add(a, mul(r, t)), t, u };
  }

  /* ---------------------------------------------------------------- Isovist (2D) */
  /** Isovist von o aus: Strahlen gleichmäßig im Blickwinkel um die Richtung (Bogenmaß, 0 = +x, gegen den Uhrzeigersinn),
      begrenzt durch die Reichweite. hindernisse: Liste von Segmenten. Ergebnis: Endpunkte, Längen, getroffenes Segment je Strahl (−1 = frei).
      Wie die DeCodingSpaces-Komponente „Isovist“: Strahlenzahl, Blickwinkel (Grad), Richtung, Reichweite. */
  function isovist(o, hindernisse, opt) {
    const winkel = Math.max(0, Math.min(360, opt.winkel == null ? 360 : opt.winkel)) * Math.PI / 180;
    const n = Math.max(1, Math.round(opt.strahlen || 360)), r = opt.reichweite || 100, dir = opt.richtung || 0;
    const voll = winkel >= 2 * Math.PI - 1e-9;
    const punkte = [], laengen = new Float64Array(n), treffer = new Int32Array(n), winkelListe = new Float64Array(n);
    // Vorfilter: nur Segmente, die den Kreis der Reichweite berühren
    const nah = [];
    for (let k = 0; k < hindernisse.length; k++) { const s = hindernisse[k]; if (abstandSegment(o, s[0], s[1]).d <= r) nah.push(k); }
    for (let i = 0; i < n; i++) {
      const a = voll ? dir + 2 * Math.PI * i / n : dir - winkel / 2 + (n === 1 ? winkel / 2 : winkel * i / (n - 1));
      const d = [Math.cos(a), Math.sin(a)];
      let tmin = r, hit = -1;
      for (const k of nah) { const s = hindernisse[k], t = strahlSegment(o, d, s[0], s[1]); if (t < tmin) { tmin = t; hit = k; } }
      laengen[i] = tmin; treffer[i] = hit; winkelListe[i] = a;
      punkte.push([o[0] + d[0] * tmin, o[1] + d[1] * tmin]);
    }
    return { o, punkte, laengen, treffer, winkel: winkelListe, voll, reichweite: r };
  }
  /** Polygon des Isovists (bei Blickwinkel < 360° mit dem Standpunkt als Ecke) */
  function isovistPolygon(iso) { return iso.voll ? iso.punkte.slice() : [iso.o].concat(iso.punkte); }

  /** Kenngrößen eines Isovists – die 17 Werte der DeCodingSpaces-Komponente (Liste „Isovist Properties“).
      Definitionen nach Benedikt (1979), Batty (2001) und Turner et al. (2001); siehe QUELLE.md der Isovist-Apps. */
  const ISOVIST_MASSE = [
    ["area", "Area", "Fläche"], ["areaDist", "Area (Dist Weighted)", "Fläche (abstandsgewichtet)"], ["perimeter", "Perimeter", "Umfang"],
    ["compactness", "Compactness", "Kompaktheit"], ["circularity", "Circularity", "Kreisähnlichkeit"], ["convexDeficiency", "ConvexDeficiency", "Konvexitätsdefizit"],
    ["occlusivity", "Occlusivity", "Verdeckung"], ["minRadial", "Min Radial", "kleinster Radius"], ["maxRadial", "Max Radial", "größter Radius"],
    ["meanRadial", "Mean Radial", "mittlerer Radius"], ["stdDev", "Standard Deviation", "Standardabweichung"], ["variance", "Variance", "Varianz"],
    ["skewness", "Skewness", "Schiefe"], ["dispersion", "Dispersion", "Dispersion"], ["elongation", "Elongation", "Streckung"],
    ["driftMagnitude", "Drift Magnitude", "Drift (Betrag)"], ["driftAngle", "Drift Angle", "Drift (Winkel)"]
  ];
  function isovistMasse(iso) {
    const P = isovistPolygon(iso), L = iso.laengen, n = L.length;
    const A = flaeche(P), U = umfang(P);
    let s = 0, s2 = 0, mn = Infinity, mx = 0;
    for (let i = 0; i < n; i++) { s += L[i]; s2 += L[i] * L[i]; if (L[i] < mn) mn = L[i]; if (L[i] > mx) mx = L[i]; }
    const mean = s / n, varz = Math.max(0, s2 / n - mean * mean), sd = Math.sqrt(varz);
    let s3 = 0; for (let i = 0; i < n; i++) s3 += Math.pow(L[i] - mean, 3);
    const skew = sd > EPS ? (s3 / n) / Math.pow(sd, 3) : 0;
    // abstandsgewichtete Fläche: Summe der Dreiecksflächen je Strahlsektor, gewichtet mit dem mittleren Abstand ihres Schwerpunkts (2/3 r)
    let aw = 0;
    const m = iso.voll ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const a = iso.punkte[i], b = iso.punkte[(i + 1) % n], f = Math.abs(kreuz(sub(a, iso.o), sub(b, iso.o))) / 2;
      aw += f * (L[i] + L[(i + 1) % n]) / 3;
    }
    // Verdeckung: Länge der Strahlsprünge (radiale Ränder, an denen ein Hindernis den Blick verdeckt)
    let occ = 0;
    for (let i = 0; i < m; i++) { const j = (i + 1) % n; if (Math.abs(L[i] - L[j]) > Math.max(1, 0.1 * Math.max(L[i], L[j]))) occ += Math.abs(L[i] - L[j]); }
    const H = konvexeHuelle(P), AH = flaeche(H);
    const sp = schwerpunkt(P), drift = sub(sp, iso.o);
    // Streckung: Verhältnis der Hauptachsen (Wurzel der Eigenwerte der Flächenträgheit über die Strahlendpunkte)
    let cxx = 0, cyy = 0, cxy = 0;
    for (const p of iso.punkte) { const dx = p[0] - sp[0], dy = p[1] - sp[1]; cxx += dx * dx; cyy += dy * dy; cxy += dx * dy; }
    const tr = cxx + cyy, det = cxx * cyy - cxy * cxy, w = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const l1 = tr / 2 + w, l2 = Math.max(EPS, tr / 2 - w);
    return {
      area: A, areaDist: aw, perimeter: U,
      compactness: U > EPS ? 4 * Math.PI * A / (U * U) : 0,
      circularity: A > EPS ? U * U / (4 * Math.PI * A) : 0,
      convexDeficiency: AH > EPS ? (AH - A) / AH : 0,
      occlusivity: occ, minRadial: mn, maxRadial: mx, meanRadial: mean, stdDev: sd, variance: varz, skewness: skew,
      dispersion: mean > EPS ? sd / mean : 0,
      elongation: Math.sqrt(l1 / l2),
      driftMagnitude: laenge(drift), driftAngle: (Math.atan2(drift[1], drift[0]) * 180 / Math.PI + 360) % 360
    };
  }

  /* ---------------------------------------------------------------- Voronoi */
  /** Voronoi-Zellen der Punkte innerhalb des Polygons (Schnitt von Halbebenen, O(n²)); Zelle i gehört zu Punkt i */
  function voronoi(punkte, rahmen) {
    return punkte.map((p, i) => {
      let z = rahmen.slice();
      for (let j = 0; j < punkte.length && z.length; j++) {
        if (j === i) continue;
        const q = punkte[j]; if (abstand(p, q) < EPS) continue;
        z = schneideHalbebene(z, lerp(p, q, 0.5), sub(q, p));
      }
      return z;
    });
  }

  /* ---------------------------------------------------------------- Netze und Graphen */
  /** Straßennetz aus Segmenten: Knoten werden innerhalb tol zusammengeführt. → {knoten: [[x, y]], kanten: [{a, b, l}]} */
  function netz(segmente, tol = 0.01) {
    const knoten = [], kanten = [], raster = new Map(), g = Math.max(tol, 1e-6) * 4;
    const finde = p => {
      const kx = Math.round(p[0] / g), ky = Math.round(p[1] / g);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const L = raster.get((kx + dx) + "," + (ky + dy)); if (!L) continue;
        for (const i of L) if (abstand(knoten[i], p) <= tol) return i;
      }
      knoten.push([p[0], p[1]]); const k = kx + "," + ky;
      if (!raster.has(k)) raster.set(k, []); raster.get(k).push(knoten.length - 1);
      return knoten.length - 1;
    };
    const gesehen = new Set();
    for (const s of segmente) {
      const a = finde(s[0]), b = finde(s[1]); if (a === b) continue;
      const k = a < b ? a + "-" + b : b + "-" + a; if (gesehen.has(k)) continue; gesehen.add(k);
      kanten.push({ a, b, l: abstand(knoten[a], knoten[b]) });
    }
    return { knoten, kanten };
  }
  /** Adjazenzliste eines Netzes: adj[i] = [{j, k}] (Nachbarknoten j über Kante k) */
  function adjazenz(N) {
    const adj = N.knoten.map(() => []);
    N.kanten.forEach((e, k) => { adj[e.a].push({ j: e.b, k }); adj[e.b].push({ j: e.a, k }); });
    return adj;
  }

  /** binärer Heap für Dijkstra (Schlüssel Float64, Werte Ganzzahl) */
  function Heap() { this.k = []; this.v = []; }
  Heap.prototype.push = function (key, val) {
    const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  };
  Heap.prototype.pop = function () {
    const k = this.k, v = this.v, top = v[0], tk = k[0], lk = k.pop(), lv = v.pop();
    if (k.length) {
      let i = 0; const n = k.length;
      while (true) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; }
      k[i] = lk; v[i] = lv;
    }
    this.letzterSchluessel = tk;
    return top;
  };
  Object.defineProperty(Heap.prototype, "leer", { get() { return this.k.length === 0; } });

  /** Dijkstra auf einem allgemeinen Graphen: nachbarn(i) → [[j, kosten, kante]]. Ergebnis {dist, vor, vorKante, reihenfolge} */
  function dijkstra(n, nachbarn, start, ziel = -1) {
    const dist = new Float64Array(n).fill(Infinity), vor = new Int32Array(n).fill(-1), vorKante = new Int32Array(n).fill(-1), fertig = new Uint8Array(n);
    const reihenfolge = [], H = new Heap();
    const starts = Array.isArray(start) ? start : [start];
    for (const s of starts) { dist[s] = 0; H.push(0, s); }
    while (!H.leer) {
      const i = H.pop(); if (fertig[i]) continue; fertig[i] = 1; reihenfolge.push(i);
      if (i === ziel) break;
      for (const [j, c, k] of nachbarn(i)) {
        const d = dist[i] + c;
        if (d < dist[j] - 1e-12) { dist[j] = d; vor[j] = i; vorKante[j] = k == null ? -1 : k; H.push(d, j); }
      }
    }
    return { dist, vor, vorKante, reihenfolge };
  }
  /** Weg aus einem Vorgängerfeld */
  function weg(vor, ziel) { const w = []; for (let i = ziel; i !== -1; i = vor[i]) { w.push(i); if (w.length > vor.length) break; } return w.reverse(); }

  /** Floyd–Warshall: kosten(i, j) über Kantenliste [{a, b, c}] (ungerichtet). → {dist, next} als Float64Array/Int32Array n·n */
  function floydWarshall(n, kantenListe) {
    const D = new Float64Array(n * n).fill(Infinity), NX = new Int32Array(n * n).fill(-1);
    for (let i = 0; i < n; i++) { D[i * n + i] = 0; NX[i * n + i] = i; }
    for (const e of kantenListe) {
      if (e.c < D[e.a * n + e.b]) { D[e.a * n + e.b] = D[e.b * n + e.a] = e.c; NX[e.a * n + e.b] = e.b; NX[e.b * n + e.a] = e.a; }
    }
    for (let k = 0; k < n; k++) floydSchritt(n, D, NX, k);
    return { dist: D, next: NX };
  }
  /** eine Runde k des Floyd–Warshall-Verfahrens (für schrittweise Darstellung) */
  function floydSchritt(n, D, NX, k) {
    for (let i = 0; i < n; i++) {
      const dik = D[i * n + k]; if (dik === Infinity) continue;
      const ri = i * n, rk = k * n;
      for (let j = 0; j < n; j++) { const d = dik + D[rk + j]; if (d < D[ri + j]) { D[ri + j] = d; NX[ri + j] = NX[ri + k]; } }
    }
  }
  function floydWeg(n, NX, a, b) { if (NX[a * n + b] < 0) return []; const w = [a]; while (a !== b) { a = NX[a * n + b]; w.push(a); if (w.length > n) return []; } return w; }

  /** Brandes-Betweenness für einen Startknoten s (gewichtet mit Ursprungs- und Zielgewichten), addiert in bc.
      nachbarn(i) → [[j, kosten]]. Gleich lange Wege teilen sich den Durchgang (σ). */
  function betweennessVon(n, nachbarn, s, gQ, gZ, bc) {
    const dist = new Float64Array(n).fill(Infinity), sigma = new Float64Array(n), delta = new Float64Array(n), P = Array.from({ length: n }, () => []);
    const S = [], H = new Heap(), fertig = new Uint8Array(n);
    dist[s] = 0; sigma[s] = 1; H.push(0, s);
    while (!H.leer) {
      const v = H.pop(); if (fertig[v]) continue; fertig[v] = 1; S.push(v);
      for (const [w, c] of nachbarn(v)) {
        const d = dist[v] + c;
        if (d < dist[w] - 1e-9) { dist[w] = d; sigma[w] = sigma[v]; P[w] = [v]; H.push(d, w); }
        else if (Math.abs(d - dist[w]) <= 1e-9 && !fertig[w]) { sigma[w] += sigma[v]; P[w].push(v); }
      }
    }
    const ws = gQ ? gQ[s] : 1;
    for (let i = S.length - 1; i >= 0; i--) {
      const w = S[i], zw = (gZ ? gZ[w] : 1);
      for (const v of P[w]) delta[v] += sigma[v] / sigma[w] * ((w !== s ? zw : 0) + delta[w]);
      if (w !== s) bc[w] += ws * delta[w];
    }
    return dist;
  }

  /** Segmentgraph (dualer Graph) eines Netzes wie DeCodingSpaces „BuildGraph“: Knoten = Straßensegmente, Kanten = gemeinsame Endpunkte.
      Kosten = kL · (l_i + l_j) / 2 / l_mittel + kW · Richtungsänderung / 90°.  → {n, adj: [[j, kosten]], mitte: [[x, y]]} */
  function segmentGraph(N, kL = 0.5, kW = 0.5) {
    const m = N.kanten.length, adjK = adjazenz(N);
    const lm = N.kanten.reduce((s, e) => s + e.l, 0) / Math.max(1, m);
    const adj = Array.from({ length: m }, () => []);
    const richtung = (k, vonKnoten) => { const e = N.kanten[k], a = N.knoten[vonKnoten], b = N.knoten[e.a === vonKnoten ? e.b : e.a]; return norm(sub(b, a)); };
    N.knoten.forEach((_, v) => {
      const L = adjK[v];
      for (let x = 0; x < L.length; x++) for (let y = x + 1; y < L.length; y++) {
        const i = L[x].k, j = L[y].k;
        // Richtungsänderung beim Weg von i über v nach j: Winkel zwischen „hinein“ (−richtung i) und „hinaus“ (richtung j)
        const rin = mul(richtung(i, v), -1), raus = richtung(j, v);
        const wink = Math.acos(Math.max(-1, Math.min(1, dot(rin, raus)))) * 180 / Math.PI;
        const c = kL * (N.kanten[i].l + N.kanten[j].l) / 2 / lm + kW * wink / 90;
        adj[i].push([j, c, wink]); adj[j].push([i, c, wink]);
      }
    });
    const mitte = N.kanten.map(e => lerp(N.knoten[e.a], N.knoten[e.b], 0.5));
    return { n: m, adj, mitte, lm };
  }

  return { EPS, sub, add, mul, dot, kreuz, laenge, abstand, lerp, norm, abstandSegment,
           flaecheS, flaeche, umfang, schwerpunkt, punktInPoly, kanten, bbox, bereinige, konvexeHuelle, schneideHalbebene, teilePolygon, geradeSchnittPoly, versetze,
           strahlSegment, segmentSchnitt, isovist, isovistPolygon, ISOVIST_MASSE, isovistMasse, voronoi,
           netz, adjazenz, Heap, dijkstra, weg, floydWarshall, floydSchritt, floydWeg, betweennessVon, segmentGraph };
});
