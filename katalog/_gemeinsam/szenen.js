/* Parametric Planning Catalogue · Beispielszenen (ohne DOM, in Node testbar)
   Die Grasshopper-Dateien des Katalogs arbeiten mit Geometrie aus einer Rhino-Datei (Altstadt, Straßennetz, Gelände).
   Diese Datei erzeugt vergleichbare Szenen mit fester Saat: eine Stadt aus Straßenraster, Blöcken und Gebäuden
   und ein Gelände als Höhenraster. Maße in Metern, y nach unten (Bildschirmkoordinaten).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function (wurzel, fabrik) {
  const S = fabrik(typeof module === "object" && module.exports ? require("./geo.js") : wurzel.Geo);
  if (typeof module === "object" && module.exports) module.exports = S;
  else wurzel.Szenen = S;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo) {
  "use strict";

  /** Stadt: verzogenes Straßenraster (nx × ny Knoten), Blöcke zwischen den Straßen (um die halbe Straßenbreite eingerückt),
      einzelne Blöcke zusammengelegt (zusammen = Anteil), Gebäude als Blockrand (Tiefe, Breite), optional ein Platz mit Kirche.
      → {b, h, knoten, strassen: [[p, q]], bloecke: [poly], zellen: [poly], gebaeude: [poly], hindernisse: [[p, q]], platz, kirche}
      Wege für Apps (z. B. Isovist On Path) bilden die Apps selbst aus dem Straßennetz (kürzester Weg), damit sie nicht durch Gebäude führen. */
  function stadt(zufall, opt = {}) {
    const o = Object.assign({ b: 260, h: 180, nx: 6, ny: 5, rand: 6, jitter: 0.22, strasse: 10, tiefe: 12, breite: [8, 16], luecke: 0.12, zusammen: 0.18, platz: true, kirche: true, gebaeude: true }, opt);
    const dx = (o.b - 2 * o.rand) / (o.nx - 1), dy = (o.h - 2 * o.rand) / (o.ny - 1);
    const K = [];
    for (let j = 0; j < o.ny; j++) for (let i = 0; i < o.nx; i++) {
      const rx = i === 0 || i === o.nx - 1 ? 0 : (zufall() - 0.5) * 2 * o.jitter * dx;
      const ry = j === 0 || j === o.ny - 1 ? 0 : (zufall() - 0.5) * 2 * o.jitter * dy;
      K.push([o.rand + i * dx + rx, o.rand + j * dy + ry]);
    }
    const id = (i, j) => j * o.nx + i;
    // Zellen des Rasters
    const zellen = [], zelleIJ = [];
    for (let j = 0; j < o.ny - 1; j++) for (let i = 0; i < o.nx - 1; i++) {
      zellen.push([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)]); zelleIJ.push([i, j]);
    }
    // Platz: eine Zelle nahe der Mitte bleibt frei von Gebäuden
    const pi = Math.floor((o.nx - 1) / 2), pj = Math.floor((o.ny - 1) / 2), platzZelle = o.platz ? pj * (o.nx - 1) + pi : -1;
    // Zellen zusammenlegen: gemeinsame Kante entfällt als Straße
    const entfallen = new Set(), benutzt = new Set([platzZelle]);
    const kantenKey = (a, b) => a < b ? a + "-" + b : b + "-" + a;
    const bloeckeIdx = [];
    for (let z = 0; z < zellen.length; z++) {
      if (benutzt.has(z)) { if (z === platzZelle) bloeckeIdx.push({ idx: zellen[z], platz: true }); continue; }
      const [i, j] = zelleIJ[z];
      let partner = -1;
      if (zufall() < o.zusammen) {
        const rechts = i < o.nx - 2 ? z + 1 : -1, unten = j < o.ny - 2 ? z + (o.nx - 1) : -1;
        const wahl = zufall() < 0.5 ? [rechts, unten] : [unten, rechts];
        partner = wahl.find(p => p >= 0 && !benutzt.has(p)) ?? -1;
      }
      benutzt.add(z);
      if (partner < 0) { bloeckeIdx.push({ idx: zellen[z] }); continue; }
      benutzt.add(partner);
      const A = zellen[z], B = zellen[partner];
      let m;
      if (partner === z + 1) { m = [A[0], A[1], B[1], B[2], A[2], A[3]]; entfallen.add(kantenKey(A[1], A[2])); }
      else { m = [A[0], A[1], A[2], B[2], B[3], A[3]]; entfallen.add(kantenKey(A[3], A[2])); }
      bloeckeIdx.push({ idx: m });
    }
    // Straßen: Rasterkanten ohne die entfallenen
    const strassen = [];
    for (let j = 0; j < o.ny; j++) for (let i = 0; i < o.nx; i++) {
      if (i < o.nx - 1 && !entfallen.has(kantenKey(id(i, j), id(i + 1, j)))) strassen.push([K[id(i, j)], K[id(i + 1, j)]]);
      if (j < o.ny - 1 && !entfallen.has(kantenKey(id(i, j), id(i, j + 1)))) strassen.push([K[id(i, j)], K[id(i, j + 1)]]);
    }
    const bloecke = [], gebaeude = [];
    let platz = null, kirche = null;
    for (const bl of bloeckeIdx) {
      const roh = Geo.bereinige(bl.idx.map(k => K[k]));
      const poly = Geo.versetze(roh, o.strasse / 2);
      if (bl.platz) { platz = poly; continue; }
      bloecke.push(poly);
      if (o.gebaeude) gebaeude.push(...blockrand(zufall, poly, o));
    }
    if (platz && o.kirche) {
      const c = Geo.schwerpunkt(platz), w = Math.min(Geo.bbox(platz).b * 0.42, 60), hh = Math.min(Geo.bbox(platz).h * 0.32, 22);
      const x0 = c[0] - w / 2, y0 = c[1] - hh / 2, ap = hh * 0.5;
      kirche = [[x0, y0], [x0 + w - ap, y0], [x0 + w - ap * 0.3, y0 + hh * 0.2], [x0 + w, y0 + hh / 2], [x0 + w - ap * 0.3, y0 + hh * 0.8], [x0 + w - ap, y0 + hh],
                [x0, y0 + hh], [x0, y0 + hh * 0.8], [x0 - hh * 0.35, y0 + hh * 0.8], [x0 - hh * 0.35, y0 + hh * 0.2], [x0, y0 + hh * 0.2]];
      gebaeude.push(kirche);
    }
    const hindernisse = [];
    for (const g of gebaeude) for (let i = 0; i < g.length; i++) hindernisse.push([g[i], g[(i + 1) % g.length]]);
    return { b: o.b, h: o.h, knoten: K, strassen, bloecke, zellen: zellen.map(z => z.map(k => K[k])), gebaeude, hindernisse, platz, kirche, opt: o };
  }

  /** Blockrand: Streifen der Tiefe o.tiefe entlang jeder Blockkante, in Gebäude der Breite o.breite geteilt, einzelne Lücken */
  function blockrand(zufall, poly, o) {
    const innen = Geo.versetze(poly, o.tiefe), out = [];
    if (Geo.flaeche(innen) < 40 || Geo.flaecheS(innen) * Geo.flaecheS(poly) <= 0) return [poly.slice()];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], c = innen[(i + 1) % poly.length], d = innen[i];
      const L = Geo.abstand(a, b), teile = [0];
      let s = 0;
      while (true) { s += o.breite[0] + zufall() * (o.breite[1] - o.breite[0]); if (s >= L - o.breite[0] * 0.6) break; teile.push(s / L); }
      teile.push(1);
      for (let k = 0; k < teile.length - 1; k++) {
        if (zufall() < o.luecke) continue;
        const t0 = teile[k], t1 = teile[k + 1];
        out.push([Geo.lerp(a, b, t0), Geo.lerp(a, b, t1), Geo.lerp(d, c, t1), Geo.lerp(d, c, t0)]);
      }
    }
    return out;
  }

  /** Chaikin-Glättung einer offenen Polylinie */
  function glatt(P, n) {
    let Q = P.slice();
    for (let r = 0; r < n; r++) {
      const R = [Q[0]];
      for (let i = 0; i < Q.length - 1; i++) { R.push(Geo.lerp(Q[i], Q[i + 1], 0.25), Geo.lerp(Q[i], Q[i + 1], 0.75)); }
      R.push(Q[Q.length - 1]); Q = R;
    }
    return Q;
  }
  /** Punkt bei Anteil t ∈ [0, 1] der Länge einer Polylinie, dazu die Richtung */
  function aufPolylinie(P, t) {
    let L = 0; const l = [];
    for (let i = 0; i < P.length - 1; i++) { l.push(Geo.abstand(P[i], P[i + 1])); L += l[i]; }
    let s = Math.max(0, Math.min(1, t)) * L;
    for (let i = 0; i < l.length; i++) {
      if (s <= l[i] || i === l.length - 1) { const u = l[i] ? Math.min(1, s / l[i]) : 0; return { p: Geo.lerp(P[i], P[i + 1], u), richtung: Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]), laenge: L }; }
      s -= l[i];
    }
    return { p: P[P.length - 1], richtung: 0, laenge: L };
  }

  /* ---------------------------------------------------------------- Gelände */
  /** Wertrauschen auf einem Gitter (glatt interpoliert), mehrere Oktaven */
  function rauschen(zufall, n, oktaven = 4) {
    const T = new Float64Array(512); for (let i = 0; i < 512; i++) T[i] = zufall();
    const P = new Uint16Array(512); for (let i = 0; i < 256; i++) P[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(zufall() * (i + 1)); const t = P[i]; P[i] = P[j]; P[j] = t; }
    for (let i = 0; i < 256; i++) P[256 + i] = P[i];
    const wert = (x, y) => T[P[P[x & 255] + (y & 255)]];
    const s = t => t * t * (3 - 2 * t);
    return (x, y) => {
      let v = 0, a = 1, f = 1, sum = 0;
      for (let o = 0; o < oktaven; o++) {
        const X = x * f, Y = y * f, xi = Math.floor(X), yi = Math.floor(Y), u = s(X - xi), w = s(Y - yi);
        const v0 = wert(xi, yi) * (1 - u) + wert(xi + 1, yi) * u, v1 = wert(xi, yi + 1) * (1 - u) + wert(xi + 1, yi + 1) * u;
        v += a * (v0 * (1 - w) + v1 * w); sum += a; a *= 0.5; f *= 2;
      }
      return v / sum;
    };
  }
  /** Gelände wie in den Katalogbeispielen: ein Berg mit Rücken und Tälern über einer Ebene.
      → {n, groesse, zelle, h: Float64Array n·n (Höhe in m), min, max}; Gitterpunkt (i, j) liegt bei (i·zelle, j·zelle). */
  function gelaende(zufall, opt = {}) {
    const o = Object.assign({ n: 101, groesse: 1000, hoehe: 160, rauh: 0.35, gipfel: null }, opt);
    const N = rauschen(zufall, o.n, 5), z = o.groesse / (o.n - 1);
    const gx = o.gipfel ? o.gipfel[0] : o.groesse * (0.3 + 0.4 * zufall()), gy = o.gipfel ? o.gipfel[1] : o.groesse * (0.2 + 0.25 * zufall());
    const w = zufall() * Math.PI;
    const h = new Float64Array(o.n * o.n);
    let mn = Infinity, mx = -Infinity;
    for (let j = 0; j < o.n; j++) for (let i = 0; i < o.n; i++) {
      const x = i * z, y = j * z, dx = (x - gx) / o.groesse, dy = (y - gy) / o.groesse;
      // gedrehter elliptischer Berg + Rauschen
      const u = dx * Math.cos(w) + dy * Math.sin(w), v = -dx * Math.sin(w) + dy * Math.cos(w);
      const berg = Math.exp(-(u * u / 0.09 + v * v / 0.035));
      const r = N(x / o.groesse * 4, y / o.groesse * 4);
      const val = o.hoehe * (0.75 * berg + o.rauh * (r - 0.5) + 0.12 * (y / o.groesse));
      h[j * o.n + i] = val; if (val < mn) mn = val; if (val > mx) mx = val;
    }
    for (let k = 0; k < h.length; k++) h[k] -= mn;
    return { n: o.n, groesse: o.groesse, zelle: z, h, min: 0, max: mx - mn };
  }
  /** Gelände glätten (Mittel der Nachbarn, k Durchgänge) */
  function glaette(G, k) {
    const n = G.n; let a = G.h.slice();
    for (let r = 0; r < k; r++) {
      const b = new Float64Array(a.length);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        let s = 0, c = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const x = i + di, y = j + dj; if (x >= 0 && y >= 0 && x < n && y < n) { s += a[y * n + x]; c++; } }
        b[j * n + i] = s / c;
      }
      a = b;
    }
    let mx = 0; for (const v of a) if (v > mx) mx = v;
    return Object.assign({}, G, { h: a, max: mx });
  }
  /** Höhe an der Stelle (x, y) in Metern (bilinear) */
  function hoehe(G, x, y) {
    const n = G.n, fx = Math.max(0, Math.min(n - 1.000001, x / G.zelle)), fy = Math.max(0, Math.min(n - 1.000001, y / G.zelle));
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, H = G.h;
    return (H[j * n + i] * (1 - u) + H[j * n + i + 1] * u) * (1 - v) + (H[(j + 1) * n + i] * (1 - u) + H[(j + 1) * n + i + 1] * u) * v;
  }
  /** Gefälle an (x, y): [∂h/∂x, ∂h/∂y] (zentrale Differenzen) */
  function gradient(G, x, y) {
    const d = G.zelle * 0.5;
    return [(hoehe(G, x + d, y) - hoehe(G, x - d, y)) / (2 * d), (hoehe(G, x, y + d) - hoehe(G, x, y - d)) / (2 * d)];
  }
  /** Hangneigung in Grad (Winkel zwischen Geländenormale und Senkrechter) */
  function neigung(G, x, y) { const g = gradient(G, x, y); return Math.atan(Math.hypot(g[0], g[1])) * 180 / Math.PI; }

  return { stadt, blockrand, glatt, aufPolylinie, rauschen, gelaende, glaette, hoehe, gradient, neigung };
});
