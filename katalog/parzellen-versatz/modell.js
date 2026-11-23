/* Parzellen mit eigenem Kantenversatz · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Parcel Custom Offset“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Bielik).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie die Schaltung der .gh-Datei: Wege als Kurven (Paths) → Network to Segments (Kurven nach dem Umwandlungswinkel
   in Strecken, an Schnitten geteilt) → Network Smooth (Knoten im Fangabstand zusammenlegen) → CityGraph (Betweenness Centrality,
   Length Coefficient 1, Angular Coefficient 0) → Polygons from lines (geschlossene Flächen des Liniennetzes, jede Kante trägt den
   Wert ihres Wegsegments: Synchronized values) → Remap Numbers (Betweenness → Offset Min … Offset Max, immer nach innen und
   nie unter 0) → Custom offset (jede Plotkante parallel um ihren eigenen Wert verschoben, Nachbarkanten geschnitten).
   Ein Schritt = ein Plot erhält seinen Versatz. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";
  const { sub, add, mul, dot, kreuz, norm, abstand } = Geo;

  /** Voreinstellungen der .gh-Datei (Schieberegler: Wert [Bereich]):
      umwandeln: Toggle → ConvertCurves (true) · winkel: ConversionAngle 0.517 [0..1] (Bogenmaß) · fang: Snap threshold 19 [0..100] m
      versatzMin: Offset Min 7 [0..100] m · versatzMax: Offset Max 18 [0..100] m (Abstände ≥ 0, immer nach innen;
      den Schalter Negative Offset gibt es in der App nicht – siehe QUELLE.md)
      staerke: Thickness 2 [0..10] (Custom Preview Lineweights der Wege) */
  const STANDARD = { umwandeln: true, winkel: 0.517, fang: 19, versatzMin: 7, versatzMax: 18, staerke: 2,
                     original: true, gebaeude: true };
  const B = 800, H = 560;

  /* ---------------------------------------------------------------- Szene */
  /** quadratische Bézierkurve a → b mit Kontrollpunkt c, n Teilstrecken */
  function bezier(a, c, b, n = 16) {
    const P = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; P.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); }
    return P;
  }
  /** gebogener Weg von a nach b: Kontrollpunkt um biegung × Länge seitlich der Mitte */
  function weg(a, b, biegung) {
    const d = sub(b, a), n = norm([-d[1], d[0]]);
    return bezier(a, add(Geo.lerp(a, b, 0.5), mul(n, biegung * Geo.laenge(d))), b);
  }

  /** Beispielszene wie im Katalogbild: Stadt als Hintergrund (Gebäude und andere Straßen, nur Darstellung) und darin ein Gebiet
      mit geschwungenen Wegen (Paths): verzogenes Raster aus 6 × 5 Knoten, einzelne Diagonalen, einzelne Wege entfallen,
      Stichwege nach außen. → {kurven: [[[x, y]…]], gebiet: Polygon, stadt: {gebaeude, strassen}, b, h} */
  function szene(zufall) {
    const stadt = Szenen.stadt(zufall, { b: B, h: H, nx: 13, ny: 9, rand: 0, jitter: 0.25, strasse: 8, tiefe: 9, breite: [6, 12], luecke: 0.2, zusammen: 0.2, platz: false, kirche: false });
    const nx = 6, ny = 5, x0 = 120, y0 = 90, x1 = 680, y1 = 470, dx = (x1 - x0) / (nx - 1), dy = (y1 - y0) / (ny - 1);
    const K = [], id = (i, j) => j * nx + i;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const rand = i === 0 || j === 0 || i === nx - 1 || j === ny - 1;
      K.push([x0 + i * dx + (zufall() - 0.5) * (rand ? 0.25 : 0.5) * dx, y0 + j * dy + (zufall() - 0.5) * (rand ? 0.25 : 0.5) * dy]);
    }
    const kanten = [], grad = new Int32Array(K.length);
    const neu = (a, b, biegung) => { kanten.push({ a, b, biegung }); grad[a]++; grad[b]++; };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if (i < nx - 1) neu(id(i, j), id(i + 1, j), (zufall() - 0.5) * 0.6);
      if (j < ny - 1) neu(id(i, j), id(i, j + 1), (zufall() - 0.5) * 0.6);
    }
    // einzelne innere Wege entfallen (beide Knoten behalten mindestens drei Wege)
    const randkante = e => { const ia = e.a % nx, ja = Math.floor(e.a / nx), ib = e.b % nx, jb = Math.floor(e.b / nx);
      return ja === jb ? ja === 0 || ja === ny - 1 : ia === 0 || ia === nx - 1; };
    for (let k = kanten.length - 1; k >= 0; k--) {
      const e = kanten[k];
      if (!randkante(e) && grad[e.a] > 3 && grad[e.b] > 3 && zufall() < 0.18) { kanten.splice(k, 1); grad[e.a]--; grad[e.b]--; }
    }
    // Diagonalen in einzelnen Zellen
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      if (zufall() < 0.3) { const r = zufall() < 0.5; neu(r ? id(i, j) : id(i + 1, j), r ? id(i + 1, j + 1) : id(i, j + 1), (zufall() - 0.5) * 0.1); }
    }
    const kurven = kanten.map(e => weg(K[e.a], K[e.b], e.biegung));
    // Stichwege vom Rand des Gebiets nach außen
    const mitte = [(x0 + x1) / 2, (y0 + y1) / 2];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if (!(i === 0 || j === 0 || i === nx - 1 || j === ny - 1) || zufall() > 0.55) continue;
      const p = K[id(i, j)], r = norm(sub(p, mitte)), l = 30 + zufall() * 35;
      const q = add(p, mul(norm(add(r, [(zufall() - 0.5) * 0.6, (zufall() - 0.5) * 0.6])), l));
      kurven.push(weg(p, [Math.max(4, Math.min(B - 4, q[0])), Math.max(4, Math.min(H - 4, q[1]))], (zufall() - 0.5) * 0.3));
    }
    // Gebiet (Rand des Rasters, etwas erweitert): Hintergrund darin ausblenden
    const rand = [];
    for (let i = 0; i < nx; i++) rand.push(K[id(i, 0)]);
    for (let j = 1; j < ny; j++) rand.push(K[id(nx - 1, j)]);
    for (let i = nx - 2; i >= 0; i--) rand.push(K[id(i, ny - 1)]);
    for (let j = ny - 2; j > 0; j--) rand.push(K[id(0, j)]);
    const gebiet = Geo.versetze(rand, -22);
    const drin = p => Geo.punktInPoly(p, gebiet);
    const gebaeude = stadt.gebaeude.filter(g => !g.some(drin));
    const strassen = stadt.strassen.filter(s => !drin(s[0]) && !drin(s[1]) && !drin(Geo.lerp(s[0], s[1], 0.5)));
    return { kurven, gebiet, stadt: { gebaeude, strassen }, b: B, h: H };
  }

  /* ---------------------------------------------------------------- Network to Segments */
  /** Kurve (dicht abgetastete Polylinie) in Strecken wandeln: ein Knick bleibt, wenn die Richtung seit dem letzten
      Knick um mehr als winkel (Bogenmaß) gedreht hat (ConversionAngle). umwandeln = false: nur Anfang und Ende (Sehne). */
  function vereinfache(P, winkel, umwandeln = true) {
    if (!umwandeln || P.length <= 2) return [P[0], P[P.length - 1]];
    const out = [P[0]];
    let r0 = norm(sub(P[1], P[0]));
    for (let i = 1; i < P.length - 1; i++) {
      const r = norm(sub(P[i + 1], P[i]));
      if (Math.acos(Math.max(-1, Math.min(1, dot(r0, r)))) > winkel) { out.push(P[i]); r0 = r; }
    }
    out.push(P[P.length - 1]);
    return out;
  }
  /** Strecken an allen Schnitt- und Berührpunkten teilen (Split = true): Kreuzungen und T-Stöße (Endpunkt auf einer anderen Strecke) */
  function teileAnSchnitten(S, eps = 1e-9) {
    const T = S.map(() => []), bb = S.map(s => [Math.min(s[0][0], s[1][0]), Math.min(s[0][1], s[1][1]), Math.max(s[0][0], s[1][0]), Math.max(s[0][1], s[1][1])]);
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const A = bb[i], C = bb[j];
      if (A[0] > C[2] + 1e-6 || C[0] > A[2] + 1e-6 || A[1] > C[3] + 1e-6 || C[1] > A[3] + 1e-6) continue;
      const a = S[i][0], r = sub(S[i][1], a), c = S[j][0], s = sub(S[j][1], c), den = kreuz(r, s);
      if (Math.abs(den) < 1e-12) continue;                                   // parallel: kein Schnittpunkt
      const w = sub(c, a), t = kreuz(w, s) / den, u = kreuz(w, r) / den;
      if (t < -eps || t > 1 + eps || u < -eps || u > 1 + eps) continue;
      if (t > eps && t < 1 - eps) T[i].push(t);
      if (u > eps && u < 1 - eps) T[j].push(u);
    }
    const out = [];
    S.forEach((s, i) => {
      const ts = [0].concat(T[i].sort((x, y) => x - y), [1]);
      for (let k = 0; k < ts.length - 1; k++) {
        const p = Geo.lerp(s[0], s[1], ts[k]), q = Geo.lerp(s[0], s[1], ts[k + 1]);
        if (abstand(p, q) > 1e-6) out.push([p, q]);
      }
    });
    return out;
  }
  /** Network to Segments: Kurven → Strecken (vereinfacht, an Schnitten geteilt) */
  function zuSegmenten(kurven, p) {
    const S = [];
    for (const P of kurven) { const Q = vereinfache(P, p.winkel, p.umwandeln); for (let i = 0; i < Q.length - 1; i++) S.push([Q[i], Q[i + 1]]); }
    return teileAnSchnitten(S);
  }
  /** Network Smooth: alle Knoten näher als der Fangabstand zusammenlegen (Geo.netz). Verschobene Knoten können neue Kreuzungen
      erzeugen; sie werden noch einmal geteilt, damit das Netz eben bleibt. Fangabstand 0 wirkt wie im Original nicht (0,01 m). */
  function glaette(S, fang) {
    const N0 = Geo.netz(S, Math.max(0.01, fang));
    return Geo.netz(teileAnSchnitten(N0.kanten.map(e => [N0.knoten[e.a], N0.knoten[e.b]])), 0.01);
  }

  /* ---------------------------------------------------------------- CityGraph */
  /** Betweenness Centrality je Segment (Length Coefficient 1, Angular Coefficient 0, alle Segmente Ursprung und Ziel,
      geordnete Paare, Start- und Zielsegment zählen nicht) über Geo.segmentGraph und Geo.betweennessVon */
  function betweenness(N) {
    const G = Geo.segmentGraph(N, 1, 0), bc = new Float64Array(G.n);
    for (let s = 0; s < G.n; s++) Geo.betweennessVon(G.n, i => G.adj[i], s, null, null, bc);
    return bc;
  }

  /* ---------------------------------------------------------------- Polygons from lines */
  /** Geschlossene Flächen eines ebenen Liniennetzes N = {knoten, kanten: [{a, b}]}: Sackgassen werden wiederholt abgeschnitten,
      dann läuft man über Halbkanten und biegt an jedem Knoten in die nächste Kante im Uhrzeigersinn ab (kleinster Zyklus links
      der Laufrichtung). Begrenzte Flächen haben positive Fläche (Geo.flaecheS), der Außenrand jedes Netzteils negative – er entfällt.
      Doppelt durchlaufene Brücken werden aus dem Zyklus genommen. → [{poly, kanten}] – kanten[i] = Netzkante unter poly[i] → poly[i+1] */
  function flaechenAusLinien(N, minFlaeche = 1e-6) {
    const n = N.knoten.length, m = N.kanten.length, adj = Geo.adjazenz(N), grad = new Int32Array(n), aktiv = new Uint8Array(m).fill(1);
    N.kanten.forEach(e => { grad[e.a]++; grad[e.b]++; });
    const stapel = []; for (let v = 0; v < n; v++) if (grad[v] === 1) stapel.push(v);
    while (stapel.length) {
      const v = stapel.pop(); if (grad[v] !== 1) continue;
      for (const { j, k } of adj[v]) if (aktiv[k]) { aktiv[k] = 0; grad[v]--; grad[j]--; if (grad[j] === 1) stapel.push(j); break; }
    }
    const rund = N.knoten.map((p, v) => adj[v].filter(x => aktiv[x.k]).map(x => ({ j: x.j, k: x.k, w: Math.atan2(N.knoten[x.j][1] - p[1], N.knoten[x.j][0] - p[0]) }))
      .sort((a, b) => a.w - b.w));
    const lage = rund.map(L => { const M = new Map(); L.forEach((x, i) => M.set(x.k, i)); return M; });
    const halb = (u, k) => 2 * k + (N.kanten[k].a === u ? 0 : 1), besucht = new Uint8Array(2 * m), out = [];
    for (let k0 = 0; k0 < m; k0++) {
      if (!aktiv[k0]) continue;
      for (const u0 of [N.kanten[k0].a, N.kanten[k0].b]) {
        if (besucht[halb(u0, k0)]) continue;
        const Z = []; let u = u0, k = k0, sicher = 0;
        do {
          besucht[halb(u, k)] = 1; Z.push({ v: u, k });
          const e = N.kanten[k], v = e.a === u ? e.b : e.a, L = rund[v], nx = L[(lage[v].get(k) - 1 + L.length) % L.length];
          u = v; k = nx.k;
        } while (halb(u, k) !== halb(u0, k0) && ++sicher <= 2 * m);
        // Brücken (Kante hin und gleich zurück) entfernen
        let weiter = true;
        while (weiter && Z.length > 2) {
          weiter = false;
          for (let i = 0; i < Z.length; i++) { const j = (i + 1) % Z.length; if (Z[i].k === Z[j].k) { Z.splice(Math.max(i, j), 1); Z.splice(Math.min(i, j), 1); weiter = true; break; } }
        }
        if (Z.length < 3) continue;
        const poly = Z.map(x => N.knoten[x.v]);
        if (Geo.flaecheS(poly) > minFlaeche) out.push({ poly, kanten: Z.map(x => x.k) });
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- Remap und Custom offset */
  /** Bounds → Remap Numbers: Wert x aus [lo, hi] der Betweenness auf [a, b]; ohne Spannweite → a */
  function remap(x, lo, hi, a, b) { return hi - lo > 1e-12 ? a + (x - lo) / (hi - lo) * (b - a) : a; }
  /** Versatz als Abstand in Metern: nie negativ (auch nicht bei Werten aus der Adresse), nicht-Zahlen → 0 */
  function abstandM(v) { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : 0; }
  /** Zielbereich des Versatzes [Offset Min, Offset Max] als Abstände ≥ 0 nach innen (der Plot schrumpft, der Straßenraum wächst) */
  function zielbereich(p) { return [abstandM(p.versatzMin), abstandM(p.versatzMax)]; }

  /** Custom offset: jede Kante i des Polygons (positive Fläche) um d[i] parallel verschieben – d > 0 nach außen, d < 0 nach innen –
      und benachbarte Kanten schneiden. Laufen Nachbarkanten auseinander (Außenecke beim Vergrößern, Innenecke beim Verkleinern)
      und läge der Schnitt weiter als 4 × Versatz von der Ecke, wird die Ecke abgeschrägt; sind sie parallel (gerade Kante mit
      zwei Werten), entsteht eine Stufe. Kehrt eine versetzte Kante ihre Richtung um, ist sie verschwunden: sie fällt heraus und
      ihre Nachbarn werden neu geschnitten. → Polygon oder null (Plot ganz verschwunden) */
  function versetzeKanten(poly, d, grenze = 4) {
    const n = poly.length;
    let E = [];
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n], t = norm(sub(b, a)), o = [t[1], -t[0]];
      E.push({ p: add(a, mul(o, d[i])), t, o, d: d[i], a, i });
    }
    const fuss = (q, e) => add(e.p, mul(e.t, dot(sub(q, e.p), e.t)));
    const ecke = (e1, e2) => {
      const q = e2.a, cr = kreuz(e1.t, e2.t), f1 = fuss(q, e1), f2 = fuss(q, e2);
      if (Math.abs(cr) < 1e-9) return abstand(f1, f2) < 1e-9 ? [f1] : [f1, f2];
      const s = kreuz(sub(e2.p, e1.p), e2.t) / cr, x = add(e1.p, mul(e1.t, s));
      const auseinander = dot(sub(x, f1), e1.t) > 1e-9;                        // Schnitt liegt hinter dem Fußpunkt: Kanten laufen auseinander
      if (auseinander && abstand(x, q) > grenze * Math.max(Math.abs(e1.d), Math.abs(e2.d), 1e-9)) return [f1, f2];
      return [x];
    };
    for (let runde = 0; runde <= n; runde++) {
      const m = E.length;
      if (m < 3) return null;
      const V = E.map((e, j) => ecke(E[(j + m - 1) % m], e));
      let schlimm = -1, wert = -1e-9;
      for (let j = 0; j < m; j++) {
        const von = V[j][V[j].length - 1], bis = V[(j + 1) % m][0], v = dot(sub(bis, von), E[j].t);
        if (v < wert) { wert = v; schlimm = j; }
      }
      if (schlimm < 0) {
        const P = [].concat(...V);
        return Geo.flaecheS(P) > 1e-6 ? P : null;
      }
      E.splice(schlimm, 1);
    }
    return null;
  }

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  /** Netz, Betweenness und Plots aus den Kurven (Network to Segments → Network Smooth → CityGraph → Polygons from lines) */
  function baueNetz(z, p) {
    z.segmente0 = zuSegmenten(z.S.kurven, p);
    z.N = glaette(z.segmente0, p.fang);
    z.bc = betweenness(z.N);
    let lo = Infinity, hi = -Infinity;
    for (const v of z.bc) { if (v < lo) lo = v; if (v > hi) hi = v; }
    z.bounds = z.N.kanten.length ? [lo, hi] : [0, 0];
    // Logarithmus → Bounds → Remap 0…1 für die Farbe der Wege (Gradient); Betweenness 0 hat keinen Logarithmus → 0
    let a = Infinity, b = -Infinity;
    const L = Array.from(z.bc, v => v > 0 ? Math.log(v) : NaN);
    for (const v of L) if (v === v) { if (v < a) a = v; if (v > b) b = v; }
    z.farbwert = L.map(v => v === v && b - a > 1e-12 ? (v - a) / (b - a) : 0);
    z.plots = flaechenAusLinien(z.N);
    leere(z, p);
  }
  /** Versatz aller schon bearbeiteten Plots zurücksetzen (t = 0) */
  function leere(z) { z.k = 0; z.t = 0; z.erg = []; z.werte = []; }

  /** Versatzwerte der Kanten eines Plots: Synchronized values → Remap auf Offset Min … Max (Abstände ≥ 0) */
  function plotWerte(z, p, P) {
    const [a, b] = zielbereich(p);
    return P.kanten.map(k => abstandM(remap(z.bc[k], z.bounds[0], z.bounds[1], a, b)));
  }
  /** Custom offset eines Plots: jede Kante um ihren Abstand nach innen (versetzeKanten erwartet innen als negatives Vorzeichen) */
  function versetzeNachInnen(poly, w) { return versetzeKanten(poly, w.map(d => -abstandM(d))); }
  function versetzePlot(z, p, i) {
    const w = plotWerte(z, p, z.plots[i]);
    z.werte[i] = w; z.erg[i] = versetzeNachInnen(z.plots[i].poly, w);
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, S: szene(zufall), b: B, h: H, wahl: -1 };
    baueNetz(z, p);
    return z;
  }

  /** Ein Schritt: der nächste Plot erhält seinen Versatz (Custom offset). Danach tut er nichts mehr. */
  function schritt(z, p) {
    if (z.k < z.plots.length) { versetzePlot(z, p, z.k); z.k++; }
    z.t++;
    return z;
  }
  const fertig = z => z.k >= z.plots.length;
  function rechneAlles(z, p) { for (let i = 0; i < z.plots.length; i++) versetzePlot(z, p, i); z.t = Math.max(z.t, z.plots.length); z.k = z.plots.length; }

  /** Parameter ohne Neustart: Netz neu (Umwandlung, Fangabstand) oder nur die Versätze der bearbeiteten Plots neu */
  function aendere(z, p, id) {
    if (id === "umwandeln" || id === "winkel" || id === "fang") {
      const lief = z.t > 0; baueNetz(z, p); z.wahl = -1;
      if (lief) rechneAlles(z, p);
    } else if (id === "versatzMin" || id === "versatzMax") {
      for (let i = 0; i < z.k; i++) versetzePlot(z, p, i);
    }
  }

  /** Plot unter dem Punkt q (Index oder −1) */
  function plotBei(z, q) { return z.plots.findIndex(P => Geo.punktInPoly(q, P.poly)); }

  /** Bilanz der bearbeiteten Plots: Flächen vorher/nachher, verschwundene Plots */
  function bilanz(z) {
    let vor = 0, nach = 0, weg = 0;
    for (let i = 0; i < z.k; i++) { vor += Geo.flaeche(z.plots[i].poly); if (z.erg[i]) nach += Geo.flaeche(z.erg[i]); else weg++; }
    let gesamt = 0; for (const P of z.plots) gesamt += Geo.flaeche(P.poly);
    return { vor, nach, weg, gesamt, plots: z.plots.length, fertig: z.k };
  }

  return { STANDARD, bezier, weg, szene, vereinfache, teileAnSchnitten, zuSegmenten, glaette, betweenness, flaechenAusLinien,
           remap, abstandM, zielbereich, versetzeKanten, versetzeNachInnen, baueNetz, leere, plotWerte, erzeuge, schritt, fertig, rechneAlles, aendere, plotBei, bilanz };
});
