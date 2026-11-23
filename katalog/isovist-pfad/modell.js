/* Isovist entlang eines Weges · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Isovist On Path“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Bielik, Ekaterina Fuchkina).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie in der .gh-Datei: „Evaluate Curve“ wertet den Weg (Walking Path) beim Anteil „Point On Curve“ (0…1, Voreinstellung 0,274)
   aus und liefert Punkt und Tangente. Der Punkt ist der Standpunkt (Vantage Point), die Tangente die Blickrichtung (Viewing Direction)
   der Komponente „Isovist“ mit Blickwinkel (Viewing Angle 0…360), Reichweite (Viewing Range 1…200) und Strahlen (Precision 1…720);
   Hindernisse sind die Gebäudekanten. „List Item“ wählt eine der 17 Kenngrößen. Das Katalogbild „Isovist Statistics“ zeigt den
   Verlauf der Kenngrößen entlang des Weges – die App rechnet dafür das Profil an 201 Stellen. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Point On Curve 0,274 (0…1), Viewing Angle 360 (0…360), Viewing Range 100 (1…200), Rays 360 (1…720), Liste „Area“;
      schrittweite: Anteil des Weges je Schritt, amEnde: „anhalten“ oder „vonVorn“ (nur in der App) */
  const STANDARD = { anteil: 0.274, winkel: 360, reichweite: 100, strahlen: 360, kenngroesse: "area", schrittweite: 0.004, amEnde: "anhalten" };
  const KENNGROESSEN = Geo.ISOVIST_MASSE.map(m => m[0]);
  /** Zahl der Abschnitte des Profils (201 Stellen von 0 bis 1) */
  const PROFIL_N = 200;

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

  /* ---------------------------------------------------------------- Weg durch die Stadt (Vorschlag für _gemeinsam/szenen.js) */
  /** Ecken einer Polylinie abrunden: an jedem inneren Punkt wird die Ecke im Abstand min(r, ⅓ der Nachbarkanten) abgeschnitten
      und durch einen Bogen aus „teile“ Stücken (quadratische Bézierkurve) ersetzt. */
  function rundeEcken(P, r = 4, teile = 4) {
    if (P.length < 3) return P.map(q => q.slice());
    const Q = [P[0].slice()];
    for (let i = 1; i < P.length - 1; i++) {
      const a = P[i - 1], b = P[i], c = P[i + 1], la = Geo.abstand(a, b), lc = Geo.abstand(b, c);
      const d = Math.min(r, la / 3, lc / 3);
      if (d < 1e-9) { Q.push(b.slice()); continue; }
      const p0 = Geo.lerp(b, a, d / la), p2 = Geo.lerp(b, c, d / lc);
      for (let k = 0; k <= teile; k++) { const u = k / teile, v = 1 - u; Q.push([v * v * p0[0] + 2 * u * v * b[0] + u * u * p2[0], v * v * p0[1] + 2 * u * v * b[1] + u * u * p2[1]]); }
    }
    Q.push(P[P.length - 1].slice());
    return Q.filter((q, i) => i === 0 || Geo.abstand(q, Q[i - 1]) > 1e-9);
  }
  /** Weg der Beispielstadt auf den Straßenmitten (ohne die Randstraßen): von der ersten inneren Kreuzung im Westen (Knotenreihe
      unter dem Platz) auf dem kürzesten Weg zur Südwestecke des Platzes, über einen Punkt unterhalb der Kirche quer über den Platz
      zur Südostecke, weiter zur letzten inneren Kreuzung im Osten;
      Ecken mit 4 m abgerundet. (Szenen.stadt().pfad schneidet bei manchen Saaten Gebäude und die Kirche.) */
  function wegDurchStadt(szene) {
    const o = szene.opt, K = szene.knoten, id = (i, j) => j * o.nx + i;
    const pi = Math.floor((o.nx - 1) / 2), pj = Math.min(o.ny - 1, Math.floor((o.ny - 1) / 2) + 1);
    // nur Straßen im Inneren: Kanten auf dem Rand der Szene entfallen (dort blickt man ins Leere)
    const amRand = q => Math.abs(q[0] - o.rand) < 1e-6 || Math.abs(q[1] - o.rand) < 1e-6 || Math.abs(q[0] - (o.b - o.rand)) < 1e-6 || Math.abs(q[1] - (o.h - o.rand)) < 1e-6;
    const N = Geo.netz(szene.strassen.filter(s => !(amRand(s[0]) && amRand(s[1])))), adj = Geo.adjazenz(N);
    const knoten = q => { let b = -1, bd = Infinity; N.knoten.forEach((k, i) => { const d = Geo.abstand(k, q); if (d < bd) { bd = d; b = i; } }); return b; };
    const nachbarn = i => adj[i].map(e => [e.j, N.kanten[e.k].l]);
    const strecke = (a, b) => { const r = Geo.dijkstra(N.knoten.length, nachbarn, a, b); return r.dist[b] < Infinity ? Geo.weg(r.vor, b).map(i => N.knoten[i]) : [N.knoten[a], N.knoten[b]]; };
    const W = knoten(K[id(Math.min(1, pi), pj)]), SW = knoten(K[id(pi, pj)]), SO = knoten(K[id(pi + 1, pj)]), O = knoten(K[id(Math.max(pi + 1, o.nx - 2), pj)]);
    let P = strecke(W, SW);
    if (szene.platz) { const c = Geo.schwerpunkt(szene.platz), bb = Geo.bbox(szene.platz); P.push([c[0], c[1] + bb.h * 0.33]); }
    P = P.concat(strecke(SO, O));
    return rundeEcken(P.map(q => q.slice()), 4, 4);
  }

  /* ---------------------------------------------------------------- Weg */
  /** Anteil t ∈ [0, 1] des Punkts auf der Polylinie P, der q am nächsten liegt */
  function naechsterAnteil(P, q) {
    let L = 0, best = Infinity, bestS = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const l = Geo.abstand(P[i], P[i + 1]), f = Geo.abstandSegment(q, P[i], P[i + 1]);
      if (f.d < best) { best = f.d; bestS = L + f.t * l; }
      L += l;
    }
    return L > 0 ? bestS / L : 0;
  }
  /** Länge der Polylinie */
  function laenge(P) { let L = 0; for (let i = 0; i < P.length - 1; i++) L += Geo.abstand(P[i], P[i + 1]); return L; }

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  /** Neuer Zustand: Beispielstadt mit einem Weg von West nach Ost über den Platz (wegDurchStadt) */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = Szenen.stadt(zufall);
    const z = { t: 0, szene, b: szene.b, h: szene.h, pfad: wegDurchStadt(szene), segRaster: segmentRaster(szene.hindernisse, 5),
                anteil: Math.max(0, Math.min(1, p.anteil)), profil: null, zeichnung: null };
    rechne(z, p);
    return z;
  }

  const isoOpt = (p, richtung) => ({ winkel: p.winkel, reichweite: p.reichweite, strahlen: p.strahlen, richtung });
  /** Isovist am Anteil a des Weges: Evaluate Curve → Punkt und Tangente → Isovist → {o, richtung, iso, masse} */
  function isovistBei(z, p, a) {
    const e = Szenen.aufPolylinie(z.pfad, a);
    const iso = isovistRaster(e.p, z.szene.hindernisse, z.segRaster, isoOpt(p, e.richtung));
    return { o: e.p, richtung: e.richtung, laenge: e.laenge, iso, masse: Geo.isovistMasse(iso) };
  }
  /** Isovist am aktuellen Anteil neu berechnen */
  function rechne(z, p) {
    const r = isovistBei(z, p, z.anteil);
    z.o = r.o; z.richtung = r.richtung; z.laenge = r.laenge; z.iso = r.iso; z.masse = r.masse;
    return z;
  }
  /** Profil der 17 Kenngrößen an PROFIL_N + 1 Stellen des Weges (wird erst bei Bedarf gerechnet und nach Änderungen verworfen).
      → {n, werte: {key: Float64Array}, min, max} */
  function profil(z, p) {
    if (z.profil) return z.profil;
    const n = PROFIL_N, werte = {}, min = {}, max = {};
    for (const k of KENNGROESSEN) { werte[k] = new Float64Array(n + 1); min[k] = Infinity; max[k] = -Infinity; }
    for (let i = 0; i <= n; i++) {
      const m = isovistBei(z, p, i / n).masse;
      for (const k of KENNGROESSEN) { const v = m[k]; werte[k][i] = v; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
    }
    z.profil = { n, werte, min, max };
    return z.profil;
  }

  /** am Ende angekommen (nur bei „anhalten“) */
  const amZiel = (z, p) => (p.amEnde || STANDARD.amEnde) !== "vonVorn" && z.anteil >= 1 - 1e-12;

  /** Ein Schritt: der Standpunkt wandert um „schrittweite“ (Anteil der Weglänge) weiter; am Ende anhalten oder von vorn; erhöht z.t */
  function schritt(z, p) {
    const d = p.schrittweite == null ? STANDARD.schrittweite : p.schrittweite;
    if (!amZiel(z, p)) {
      let a = z.anteil + d;
      if (a > 1 + 1e-12) a = (p.amEnde === "vonVorn") ? (z.anteil >= 1 - 1e-12 ? 0 : 1) : 1;
      z.anteil = Math.min(1, a);
      rechne(z, p);
    }
    z.t++;
    return z;
  }

  /** Parameter ohne Neustart: „anteil“ setzt den Standpunkt, Isovist-Parameter rechnen Isovist und Profil neu, die Kenngröße nur die Anzeige */
  function aendere(z, p, id) {
    if (id === "anteil") { z.anteil = Math.max(0, Math.min(1, p.anteil)); rechne(z, p); }
    else if (id === "winkel" || id === "reichweite" || id === "strahlen") { z.profil = null; rechne(z, p); }
  }

  /** liegt der Punkt in einem Gebäude? */
  function imGebaeude(z, q) { return z.szene.gebaeude.some(g => Geo.punktInPoly(q, g)); }
  /** Standpunkt auf den Weg setzen: nächster Punkt zu q */
  function geheZu(z, p, q) { z.anteil = naechsterAnteil(z.pfad, q); rechne(z, p); return z.anteil; }
  /** eigenen Weg setzen (mindestens zwei Punkte, mindestens 5 m lang); Standpunkt an den Anfang, Profil neu; true, wenn gesetzt */
  function setzePfad(z, p, P) {
    if (!P || P.length < 2 || laenge(P) < 5) return false;
    z.pfad = P.map(q => [q[0], q[1]]); z.anteil = 0; z.profil = null; rechne(z, p); return true;
  }
  /** Weg mit der Maus zeichnen: beginnen, Punkt anhängen (Mindestabstand 3 m, nicht in Gebäuden, nicht außerhalb) */
  function zeichneBeginn(z, q) { z.zeichnung = imGebaeude(z, q) ? [] : [[q[0], q[1]]]; }
  function zeichneWeiter(z, p, q) {
    if (!z.zeichnung) return false;
    if (q[0] < 0 || q[1] < 0 || q[0] > z.b || q[1] > z.h || imGebaeude(z, q)) return false;
    const L = z.zeichnung;
    if (L.length && Geo.abstand(L[L.length - 1], q) < 3) return false;
    L.push([q[0], q[1]]);
    return L.length >= 2 ? setzePfad(z, p, L) : false;
  }
  /** Weg der Beispielstadt wiederherstellen */
  function pfadZurueck(z, p) { z.zeichnung = null; z.pfad = wegDurchStadt(z.szene); z.anteil = 0; z.profil = null; rechne(z, p); }

  return { STANDARD, KENNGROESSEN, PROFIL_N, segmentRechteck, segmentRaster, isovistRaster, rundeEcken, wegDurchStadt, naechsterAnteil, laenge,
           erzeuge, isovistBei, rechne, profil, amZiel, schritt, aendere, imGebaeude, geheZu, setzePfad, zeichneBeginn, zeichneWeiter, pfadZurueck };
});
