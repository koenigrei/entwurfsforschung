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
  /** Isovist von o aus: Strahlen gleichmäßig im Blickwinkel um die Richtung (Bogenmaß im Koordinatensystem der Szene: 0 = +x,
      Winkel wächst von +x nach +y – bei y nach unten also im Uhrzeigersinn auf dem Bildschirm), begrenzt durch die Reichweite.
      hindernisse: Liste von Segmenten. Ergebnis: Endpunkte, Längen, getroffenes Segment je Strahl (−1 = frei), dazu die Hindernisliste.
      Wie die Legacy-Komponente „Isovist“ von DeCodingSpaces (Strahlenzahl „Precision“, Blickwinkel in Grad, Richtung, Reichweite);
      bei Blickwinkel < 360° liegen die Strahlen von Richtung − Winkel/2 bis Richtung + Winkel/2 (wie der Sweep in Isovist.cs der Toolbox). */
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
    return { o, punkte, laengen, treffer, winkel: winkelListe, voll, reichweite: r, hindernisse };
  }
  /** Polygon des Isovists (bei Blickwinkel < 360° mit dem Standpunkt als Ecke) */
  function isovistPolygon(iso) { return iso.voll ? iso.punkte.slice() : [iso.o].concat(iso.punkte); }

  /** Kenngrößen eines Isovists – die 17 Werte der DeCodingSpaces-Komponente (Liste „Isovist Properties“).
      Abgeglichen mit docs/visibility.md und src/DecodingSpaces.Core/Visibility/Isovist.cs der DeCodingSpaces-Toolbox
      (GPL-3.0; Definitionen abgelesen, kein Code übernommen): Fläche, Umfang, Kompaktheit 4πA/U², Verdeckung (Länge der
      verdeckenden Kanten), kleinster/größter/mittlerer Radius, Varianz, Standardabweichung und Schiefe der Strahllänge über alle
      Richtungen gleich gewichtet, Drift und Drift-Winkel (Grad ab +x, gegen den Uhrzeigersinn wie in Rhino, 0…360).
      Ohne prüfbare Definition in der Toolbox (dort entfallen) und daher eigene Definitionen nach Benedikt (1979) und Batty (2001):
      Fläche (abstandsgewichtet), Kreisähnlichkeit, Konvexitätsdefizit, Dispersion, Streckung. Siehe QUELLE.md der Isovist-Apps. */
  const ISOVIST_MASSE = [
    ["area", "Area", "Fläche"], ["areaDist", "Area (Dist Weighted)", "Fläche (abstandsgewichtet)"], ["perimeter", "Perimeter", "Umfang"],
    ["compactness", "Compactness", "Kompaktheit"], ["circularity", "Circularity", "Kreisähnlichkeit"], ["convexDeficiency", "ConvexDeficiency", "Konvexitätsdefizit"],
    ["occlusivity", "Occlusivity", "Verdeckung"], ["minRadial", "Min Radial", "kleinster Radius"], ["maxRadial", "Max Radial", "größter Radius"],
    ["meanRadial", "Mean Radial", "mittlerer Radius"], ["stdDev", "Standard Deviation", "Standardabweichung"], ["variance", "Variance", "Varianz"],
    ["skewness", "Skewness", "Schiefe"], ["dispersion", "Dispersion", "Dispersion"], ["elongation", "Elongation", "Streckung"],
    ["driftMagnitude", "Drift Magnitude", "Drift (Betrag)"], ["driftAngle", "Drift Angle", "Drift (Winkel)"]
  ];
  /** Hängen zwei Hindernissegmente zusammen (gemeinsamer Endpunkt oder Endpunkt auf dem anderen Segment)? */
  function verbunden(s, t, tol = 1e-6) {
    return abstandSegment(s[0], t[0], t[1]).d <= tol || abstandSegment(s[1], t[0], t[1]).d <= tol ||
           abstandSegment(t[0], s[0], s[1]).d <= tol || abstandSegment(t[1], s[0], s[1]).d <= tol;
  }
  function isovistMasse(iso) {
    const P = isovistPolygon(iso), L = iso.laengen, n = L.length;
    const A = flaeche(P), U = umfang(P);
    // Strahlstatistik: jede Richtung gleich gewichtet, (1/Θ)∫r dθ usw. (Toolbox: Isovist.cs); bei Blickwinkel < 360° liegen die
    // äußeren Strahlen auf dem Rand des Blickfelds und zählen nach der Trapezregel halb
    let W = 0, s = 0, s2 = 0, mn = Infinity, mx = 0;
    for (let i = 0; i < n; i++) {
      const w = !iso.voll && n > 1 && (i === 0 || i === n - 1) ? 0.5 : 1;
      W += w; s += w * L[i]; s2 += w * L[i] * L[i]; if (L[i] < mn) mn = L[i]; if (L[i] > mx) mx = L[i];
    }
    const mean = s / W, quadrat = s2 / W, varRoh = Math.max(0, quadrat - mean * mean);
    let s3 = 0;
    for (let i = 0; i < n; i++) { const w = !iso.voll && n > 1 && (i === 0 || i === n - 1) ? 0.5 : 1; s3 += w * Math.pow(L[i] - mean, 3); }
    // konstante Strahllänge (Rundungsrest): Varianz, Abweichung und Schiefe 0 – wie in der Toolbox
    const konstant = varRoh <= 1e-12 * quadrat, varz = konstant ? 0 : varRoh, sd = Math.sqrt(varz);
    const skew = konstant ? 0 : (s3 / W) / Math.pow(sd, 3);
    // abstandsgewichtete Fläche: Summe der Dreiecksflächen je Strahlsektor, gewichtet mit dem mittleren Abstand ihres Schwerpunkts (2/3 r)
    let aw = 0;
    const m = iso.voll ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const a = iso.punkte[i], b = iso.punkte[(i + 1) % n], f = Math.abs(kreuz(sub(a, iso.o), sub(b, iso.o))) / 2;
      aw += f * (L[i] + L[(i + 1) % n]) / 3;
    }
    // Verdeckung (Toolbox: Summe der Sprünge in r(θ), wo etwas endet und dahinter mehr sichtbar ist; die Seitenränder eines
    // begrenzten Blickfelds zählen nicht). Mit Strahlen: ein Sprung liegt zwischen zwei Nachbarstrahlen, die verschiedene,
    // nicht zusammenhängende Hindernisse treffen oder von denen einer frei bis zur Reichweite geht; Länge = Unterschied der Strahllängen.
    let occ = 0, occN = 0;
    const H0 = iso.hindernisse;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % n, a = iso.treffer[i], b = iso.treffer[j], sprung = Math.abs(L[i] - L[j]);
      if (a === b || sprung <= 1e-7) continue;
      if (H0 ? (a >= 0 && b >= 0 && verbunden(H0[a], H0[b])) : sprung <= Math.max(1, 0.1 * Math.max(L[i], L[j]))) continue;
      occ += sprung; occN++;
    }
    const H = konvexeHuelle(P), AH = flaeche(H);
    const sp = schwerpunkt(P), drift = sub(sp, iso.o), dl = laenge(drift);
    // Drift-Winkel wie in Rhino (y nach oben): Grad ab +x gegen den Uhrzeigersinn; die Szene hat y nach unten, daher −dy
    let dw = Math.atan2(-drift[1], drift[0]) * 180 / Math.PI; if (dw < 0) dw += 360;
    if (dl < 1e-9 || dw > 360 - 1e-9) dw = 0;
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
      occlusivity: occ, occlusions: occN, minRadial: mn, maxRadial: mx, meanRadial: mean, stdDev: sd, variance: varz, skewness: skew,
      dispersion: mean > EPS ? sd / mean : 0,
      elongation: Math.sqrt(l1 / l2),
      driftMagnitude: dl, driftAngle: dw
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

  /** binärer Heap für Dijkstra (Schlüssel Float64, Werte Ganzzahl). Optional ein zweiter Schlüssel key2 (Rangfolge erst key,
      dann key2 – z. B. Kosten, dann Schrittzahl); ohne key2 verhält er sich wie bisher. */
  function Heap() { this.k = []; this.k2 = []; this.v = []; }
  Heap.prototype.push = function (key, val, key2 = 0) {
    const k = this.k, k2 = this.k2, v = this.v; let i = k.length; k.push(key); k2.push(key2); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] < key || (k[p] === key && k2[p] <= key2)) break; k[i] = k[p]; k2[i] = k2[p]; v[i] = v[p]; i = p; }
    k[i] = key; k2[i] = key2; v[i] = val;
  };
  Heap.prototype.pop = function () {
    const k = this.k, k2 = this.k2, v = this.v, top = v[0], tk = k[0], lk = k.pop(), lk2 = k2.pop(), lv = v.pop();
    if (k.length) {
      let i = 0; const n = k.length;
      const kl = (a, b) => k[a] < k[b] || (k[a] === k[b] && k2[a] < k2[b]);
      while (true) {
        let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && kl(c + 1, c)) c++;
        if (k[c] > lk || (k[c] === lk && k2[c] >= lk2)) break;
        k[i] = k[c]; k2[i] = k2[c]; v[i] = v[c]; i = c;
      }
      k[i] = lk; k2[i] = lk2; v[i] = lv;
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

  /** Floyd–Warshall: kosten(i, j) über Kantenliste [{a, b, c}] (ungerichtet; gerichtet = true: nur a → b, z. B. für richtungsGraph).
      → {dist, next} als Float64Array/Int32Array n·n */
  function floydWarshall(n, kantenListe, gerichtet = false) {
    const D = new Float64Array(n * n).fill(Infinity), NX = new Int32Array(n * n).fill(-1);
    for (let i = 0; i < n; i++) { D[i * n + i] = 0; NX[i * n + i] = i; }
    for (const e of kantenListe) {
      if (e.c < D[e.a * n + e.b]) { D[e.a * n + e.b] = e.c; NX[e.a * n + e.b] = e.b; }
      if (!gerichtet && e.c < D[e.b * n + e.a]) { D[e.b * n + e.a] = e.c; NX[e.b * n + e.a] = e.a; }
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

  /** Segmentgraph (ungerichteter dualer Graph): Knoten = Straßensegmente, Kanten = gemeinsame Endpunkte.
      Kosten = kL · (l_i + l_j) / 2 / l_mittel + kW · Richtungsänderung / 90°.  → {n, adj: [[j, kosten, grad]], mitte: [[x, y]], lm}
      Vereinfachte Fassung (bleibt für ältere Apps): ohne Fahrtrichtung kann ein Weg an einem Knoten „über“ ein Nachbarsegment
      abbiegen, ohne es zu durchfahren, und die Normierung (mittlere Länge) ist eine eigene. Abgleich mit der DeCodingSpaces-Toolbox
      (Bauhaus-InfAU/decoding-spaces-toolbox, GPL-3.0, kein Code übernommen): dort ist der Segmentgraph gerichtet – siehe richtungsGraph. */
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

  /* ---------------------------------------------------------------- Segmentgraph mit Fahrtrichtung
     Abgleich mit der DeCodingSpaces-Toolbox (github.com/Bauhaus-InfAU/decoding-spaces-toolbox, GPL-3.0; Definitionen aus
     docs/measures.md, docs/review-2026-11.md, src/DecodingSpaces.Core/Network/SegmentNetwork.cs, NetworkAnalysis.cs abgelesen,
     kein Code übernommen) und Grafit (github.com/Bauhaus-InfAU/Grafit, MIT: „dual directed graph“, Winkel in Grad). */

  /** Segment, das dem Punkt q am nächsten liegt (Index in N.kanten, −1 bei leerem Netz) */
  function naechstesSegment(N, q) {
    let best = -1, bd = Infinity;
    for (let k = 0; k < N.kanten.length; k++) { const e = N.kanten[k], d = abstandSegment(q, N.knoten[e.a], N.knoten[e.b]).d; if (d < bd) { bd = d; best = k; } }
    return best;
  }

  /** Gerichteter Segmentgraph: Segment s hat die Zustände 2s (gefahren von knoten a nach b) und 2s+1 (b → a). Ein Schritt führt vom
      Ausgangsknoten eines Zustands zu einem Zustand eines anderen Segments, der dort beginnt; Wenden auf demselben Segment gibt es nicht,
      eine Sackgasse ist ein Endpunkt. Anteile je Schritt: meter = (l_i + l_j) / 2 (Mitte zu Mitte), grad = Richtungsänderung 0…180°,
      eigen = (w_i + w_j) / 2 (eigene Gewichte je Zustand: opt.vor für a → b, opt.rueck für b → a, Voreinstellung 0).
      Kosten je Schritt nach opt.norm:
        "standard" (Toolbox v2, measures.md §2):         kL · meter          + kW · grad / 90  + kC · eigen
        "dcs2020"  (Legacy-Komponenten 2020/21, review-2026-11.md): kL · meter / l_max + kW · grad / 180 + kC · eigen
      → {n: Segmente, z: Zustände, nb[zustand] = [[zielzustand, kosten, meter, grad, eigen]], laenge, mitte, lmax, norm, kL, kW, kC} */
  function richtungsGraph(N, opt = {}) {
    const o = Object.assign({ kL: 1, kW: 0, kC: 0, norm: "standard", vor: null, rueck: null }, opt);
    const m = N.kanten.length, L = N.kanten.map(e => e.l);
    let lmax = 0; for (const l of L) if (l > lmax) lmax = l;
    const w = new Float64Array(2 * m);
    for (let s = 0; s < m; s++) { w[2 * s] = o.vor ? o.vor[s] : 0; w[2 * s + 1] = o.rueck ? o.rueck[s] : w[2 * s]; }
    const ein = N.knoten.map(() => []);
    N.kanten.forEach((e, s) => { ein[e.a].push(2 * s); ein[e.b].push(2 * s + 1); });
    const richtung = st => { const e = N.kanten[st >> 1], d = norm(sub(N.knoten[e.b], N.knoten[e.a])); return st & 1 ? mul(d, -1) : d; };
    const ausgang = st => { const e = N.kanten[st >> 1]; return st & 1 ? e.a : e.b; };
    const legacy = o.norm === "dcs2020";
    const fL = legacy ? o.kL / Math.max(lmax, 1e-12) : o.kL, fW = legacy ? o.kW / 180 : o.kW / 90;
    const nb = [];
    for (let st = 0; st < 2 * m; st++) {
      const liste = [], s = st >> 1, r = richtung(st);
      for (const nx of ein[ausgang(st)]) {
        const t = nx >> 1; if (t === s) continue;
        const grad = Math.acos(Math.max(-1, Math.min(1, dot(r, richtung(nx))))) * 180 / Math.PI;
        const meter = (L[s] + L[t]) / 2, eigen = (w[st] + w[nx]) / 2;
        liste.push([nx, fL * meter + fW * grad + o.kC * eigen, meter, grad, eigen]);
      }
      nb.push(liste);
    }
    const mitte = N.kanten.map(e => lerp(N.knoten[e.a], N.knoten[e.b], 0.5));
    return { n: m, z: 2 * m, nb, laenge: L, mitte, lmax, norm: o.norm, kL: o.kL, kW: o.kW, kC: o.kC };
  }

  /** Auflösung der Kosten: jeder Schritt wird einmal auf ein Vielfaches gerundet, Wegkosten sind dann exakte Summen (measures.md §3) */
  const KOSTEN_AUFLOESUNG = 1e-7;

  /** Kürzeste Wege im gerichteten Segmentgraphen vom Segment s aus (beide Zustände mit Kosten 0). Rangfolge (Kosten, Schritte):
      unter gleich teuren Wegen gewinnt der mit weniger Schritten; gleichrangige Wege werden gezählt (σ). opt.ziel: Abbruch, sobald
      ein Zustand dieses Segments fest ist. → {s, U (Kosten in Auflösungseinheiten), T (Schritte), meter (kürzeste Länge unter den
      optimalen Wegen), sigma, P (Vorgänger je Zustand), S (Zustände in fester Reihenfolge)} */
  function zustandsSuche(G, s, opt = {}) {
    const z = G.z, U = new Float64Array(z).fill(Infinity), T = new Int32Array(z).fill(0x7fffffff), Lm = new Float64Array(z).fill(Infinity);
    const sigma = new Float64Array(z), P = new Array(z), fest = new Uint8Array(z), S = [], H = new Heap();
    for (const st of [2 * s, 2 * s + 1]) { U[st] = 0; T[st] = 0; Lm[st] = 0; sigma[st] = 1; P[st] = []; H.push(0, st, 0); }
    while (!H.leer) {
      const v = H.pop(); if (fest[v]) continue; fest[v] = 1; S.push(v);
      if (opt.ziel != null && (v >> 1) === opt.ziel) break;
      for (const [w, c, meter] of G.nb[v]) {
        if (fest[w]) continue;
        const u = U[v] + Math.round(c / KOSTEN_AUFLOESUNG), t = T[v] + 1, l = Lm[v] + meter;
        if (u < U[w] || (u === U[w] && t < T[w])) { U[w] = u; T[w] = t; Lm[w] = l; sigma[w] = sigma[v]; P[w] = [v]; H.push(u, w, t); }
        else if (u === U[w] && t === T[w]) { sigma[w] += sigma[v]; P[w].push(v); if (l < Lm[w]) Lm[w] = l; }
      }
    }
    return { s, U, T, meter: Lm, sigma, P, S, fest };
  }
  /** beste Zustände eines Segments t in einer Suche (gleichrangig beste, beide wenn gleich) */
  function besteZustaende(R, t) {
    const a = 2 * t, b = a + 1, ua = R.U[a], ub = R.U[b];
    if (ua === Infinity && ub === Infinity) return [];
    if (ua < ub || (ua === ub && R.T[a] < R.T[b])) return [a];
    if (ub < ua || (ua === ub && R.T[b] < R.T[a])) return [b];
    return [a, b];
  }
  /** je Segment: Kosten (min über beide Zustände), metrische Länge (Mitte zu Mitte) und Schritte → {kosten, meter, schritte} */
  function segmentAbstaende(G, R) {
    const kosten = new Float64Array(G.n).fill(Infinity), meter = new Float64Array(G.n).fill(Infinity), schritte = new Int32Array(G.n).fill(-1);
    for (let t = 0; t < G.n; t++) {
      const B = besteZustaende(R, t); if (!B.length) continue;
      kosten[t] = R.U[B[0]] * KOSTEN_AUFLOESUNG; schritte[t] = R.T[B[0]];
      meter[t] = Math.min(...B.map(b => R.meter[b]));
    }
    return { kosten, meter, schritte };
  }
  /** ein optimaler Weg von R.s zum Segment t als Liste der Segmente (leer, wenn nicht erreichbar) */
  function zustandsWeg(R, t) {
    const B = besteZustaende(R, t); if (!B.length) return [];
    const w = []; let v = B[0];
    while (v != null) { w.push(v >> 1); const p = R.P[v]; v = p && p.length ? p[0] : null; if (w.length > R.U.length) return []; }
    return w.reverse();
  }

  /** Betweenness (Choice) im gerichteten Segmentgraphen für das Ursprungssegment s, gewichtet mit gQ (Ursprung) und gZ (Ziel) je
      Segment, addiert in bc (je Segment). Brandes-Verfahren über die Zustände; gleichrangige Wege teilen sich den Durchgang (σ).
      opt.enden = false (Toolbox v2, measures.md §4: Start- und Zielsegment zählen nicht) oder true (Legacy 2020/21,
      review-2026-11.md: „both endpoints count“ – jedes Paar zählt auch für Start- und Zielsegment). → Ergebnis der zustandsSuche */
  function segmentBetweennessVon(G, s, gQ, gZ, bc, opt = {}) {
    const R = zustandsSuche(G, s), ws = gQ ? gQ[s] : 1;
    if (ws === 0) return R;
    const ende = new Float64Array(G.z), delta = new Float64Array(G.z);
    for (let t = 0; t < G.n; t++) {
      if (t === s) continue;
      const B = besteZustaende(R, t); if (!B.length) continue;
      const gt = gZ ? gZ[t] : 1; let sig = 0; for (const b of B) sig += R.sigma[b];
      for (const b of B) ende[b] = gt * R.sigma[b] / sig;
      if (opt.enden) { bc[s] += ws * gt; bc[t] += ws * gt; }
    }
    for (let i = R.S.length - 1; i >= 0; i--) {
      const w = R.S[i];
      for (const v of R.P[w]) delta[v] += R.sigma[v] / R.sigma[w] * (ende[w] + delta[w]);
      if ((w >> 1) !== s) bc[w >> 1] += ws * delta[w];
    }
    return R;
  }

  /** Nähe-Maße (Closeness) des Segments s (Toolbox v2, measures.md §4, ohne Radius): NC = erreichte Segmente + 1, TD = Σ Kosten,
      MD = TD / (NC − 1), Integration = NC² / TD, NAIN = NC^1.2 / (TD + 2), harmonisch = Σ 1 / Länge (Mitte zu Mitte);
      dazu dcs2020 = (NC − 1) / TD („n/Σd“ der Legacy-Komponenten, review-2026-11.md) */
  function segmentClosenessVon(G, s) {
    const A = segmentAbstaende(G, zustandsSuche(G, s));
    let n = 0, td = 0, h = 0;
    for (let t = 0; t < G.n; t++) { if (t === s || A.kosten[t] === Infinity) continue; n++; td += A.kosten[t]; if (A.meter[t] > 0) h += 1 / A.meter[t]; }
    const nc = n + 1;
    return { nc, td, md: n ? td / n : NaN, integration: td > 0 ? nc * nc / td : NaN, nain: Math.pow(nc, 1.2) / (td + 2), harmonisch: h,
             dcs2020: td > 0 ? n / td : NaN };
  }

  return { EPS, sub, add, mul, dot, kreuz, laenge, abstand, lerp, norm, abstandSegment,
           flaecheS, flaeche, umfang, schwerpunkt, punktInPoly, kanten, bbox, bereinige, konvexeHuelle, schneideHalbebene, teilePolygon, geradeSchnittPoly, versetze,
           strahlSegment, segmentSchnitt, isovist, isovistPolygon, ISOVIST_MASSE, isovistMasse, voronoi,
           netz, adjazenz, Heap, dijkstra, weg, floydWarshall, floydSchritt, floydWeg, betweennessVon, segmentGraph,
           naechstesSegment, richtungsGraph, KOSTEN_AUFLOESUNG, zustandsSuche, besteZustaende, segmentAbstaende, zustandsWeg,
           segmentBetweennessVon, segmentClosenessVon };
});
