/* Serpentinen · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Serpentine Roads (Path by Steepness)“ aus dem Parametric Planning Catalogue
   (DeCodingSpaces – Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie in SerpentineRoads.gh:
   1. Divide Surface (U = V = „Number Slider“ 50) legt ein Punktgitter auf das Gelände; das C#-Skript verbindet jeden Punkt
      mit dem rechten und dem unteren Nachbarn und mit beiden Diagonalen der Masche (8er-Nachbarschaft) → Graph (SpiderWeb graphFromLines).
   2. Je Kante der Steigungswinkel α = Angle(Kante, waagerechte Projektion der Kante); Evaluate `if(x>y, PI*0.5, x)` mit
      y = Radians(„Degree Steepness“, ganzzahlig): Kanten steiler als die Schwelle bekommen den Höchstwert π/2.
   3. Kosten = Remap(Steilheit)·(1 − w) + Remap(Länge)·w mit w = „Weight Steepness“ (Panel: „0 : Only Steepness, 1: Only Shortest Path“);
      Remap bildet die Spannweite (Bounds) aller Kanten auf 0…1 ab.
   4. ShortestPathBetweenPoints (Dijkstra) zwischen den Gitterpunkten, die Start und Ziel am nächsten liegen (Closest Point);
      Start und Ziel werden mit Linien angehängt (Join Curves) und der Weg mit Smooth Polyline (Strength 1, Times = „Smooth“) geglättet. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Number Slider (U/V-Teilung) 50 [0..100], Weight Steepness 0 [0..1], Smooth 2 [1..10];
      Degree Steepness [0..100] mit Startwert 5° (≈ 8,7 %) statt 1° der Datei – nächste ganze Gradzahl zur Höchstlängsneigung 8 %
      von Landstraßen (RAL, FGSV 2012), siehe QUELLE.md; nur in der App: expansionen = Dijkstra-Schritte je Schritt (Suchfront sichtbar) */
  const STANDARD = { teilung: 50, gewicht: 0, grad: 5, glaetten: 2, expansionen: 25 };
  /** Gelände der Beispielszene (Meter): 2 km × 2 km, Berg rund 160 m hoch – Hänge bis etwa 20°, auf denen Kehren mit 5° möglich sind */
  const GELAENDE = { n: 101, groesse: 2000, hoehe: 160 };

  /* ---------------------------------------------------------------- 1. Gitter und Graph */
  /** Punktgitter (U+1)×(U+1) auf dem Gelände (Divide Surface) → {U, x, y, z: Float64Array, pos(k)} ; Index k = j·(U+1) + i */
  function gitter(G, U) {
    U = Math.max(1, Math.round(U));
    const m = U + 1, x = new Float64Array(m * m), y = new Float64Array(m * m), z = new Float64Array(m * m), s = G.groesse / U;
    for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) { const k = j * m + i; x[k] = i * s; y[k] = j * s; z[k] = Szenen.hoehe(G, x[k], y[k]); }
    return { U, m, s, x, y, z };
  }
  /** Kanten wie das C#-Skript: rechts (j+1 im Zweig), unten (nächster Zweig) und beide Diagonalen der Masche.
      → {a, b: Int32Array, laenge (3D), alpha (Steigungswinkel, rad)} */
  function kanten(N) {
    const m = N.m, A = [], B = [];
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {           // i = Zweig (Spalte), j = Punkt im Zweig wie im Skript
      const k = (a, b) => b * m + a;                                     // Punkt (Zweig a, Index b) → Gitterindex
      if (j < m - 1) { A.push(k(i, j)); B.push(k(i, j + 1)); }
      if (i < m - 1) { A.push(k(i, j)); B.push(k(i + 1, j)); }
      if (j < m - 1 && i < m - 1) { A.push(k(i, j)); B.push(k(i + 1, j + 1)); A.push(k(i + 1, j)); B.push(k(i, j + 1)); }
    }
    const n = A.length, a = Int32Array.from(A), b = Int32Array.from(B), laenge = new Float64Array(n), alpha = new Float64Array(n);
    for (let e = 0; e < n; e++) {
      const dx = N.x[b[e]] - N.x[a[e]], dy = N.y[b[e]] - N.y[a[e]], dz = N.z[b[e]] - N.z[a[e]], hz = Math.hypot(dx, dy);
      laenge[e] = Math.hypot(hz, dz); alpha[e] = Math.atan2(Math.abs(dz), hz);   // Angle(Kante, Vector XYZ(x, y, 0))
    }
    return { n, a, b, laenge, alpha };
  }
  /** Nachbarlisten (CSR) eines Graphen mit n Knoten */
  function nachbarn(nKnoten, E) {
    const grad = new Int32Array(nKnoten + 1);
    for (let e = 0; e < E.n; e++) { grad[E.a[e] + 1]++; grad[E.b[e] + 1]++; }
    for (let i = 0; i < nKnoten; i++) grad[i + 1] += grad[i];
    const nb = new Int32Array(2 * E.n), ke = new Int32Array(2 * E.n), fuell = grad.slice(0, nKnoten);
    for (let e = 0; e < E.n; e++) { nb[fuell[E.a[e]]] = E.b[e]; ke[fuell[E.a[e]]++] = e; nb[fuell[E.b[e]]] = E.a[e]; ke[fuell[E.b[e]]++] = e; }
    return { start: grad, nb, ke };
  }

  /* ---------------------------------------------------------------- 2./3. Steilheit und Kosten */
  /** Evaluate `if(x>y, PI*0.5, x)`: x = Steigungswinkel, y = Schwelle in rad */
  const steilheit = (alpha, schwelle) => alpha > schwelle ? Math.PI * 0.5 : alpha;
  /** Remap Numbers mit Source = Bounds der Liste und Target 0…1 (bei leerer Spannweite 0) */
  function remap(werte) {
    let mn = Infinity, mx = -Infinity;
    for (const v of werte) { if (v < mn) mn = v; if (v > mx) mx = v; }
    const d = mx - mn, r = new Float64Array(werte.length);
    for (let i = 0; i < werte.length; i++) r[i] = d > 0 ? (werte[i] - mn) / d : 0;
    return r;
  }
  /** Kosten je Kante: Remap(Steilheit)·(1 − w) + Remap(Länge)·w; „Degree Steepness“ geht über Integer → Radians */
  function kosten(E, p) {
    const y = Math.round(p.grad) * Math.PI / 180, st = new Float64Array(E.n);
    for (let e = 0; e < E.n; e++) st[e] = steilheit(E.alpha[e], y);
    const rs = remap(st), rl = remap(E.laenge), w = p.gewicht, c = new Float64Array(E.n);
    for (let e = 0; e < E.n; e++) c[e] = rs[e] * (1 - w) + rl[e] * w;
    return { c, ueber: st.map(v => v === Math.PI * 0.5 ? 1 : 0) };
  }

  /* ---------------------------------------------------------------- 4. Dijkstra schrittweise, Glätten */
  /** nächster Gitterpunkt zu q (Closest Point) */
  function naechster(N, q) {
    const i = Math.max(0, Math.min(N.U, Math.round(q[0] / N.s))), j = Math.max(0, Math.min(N.U, Math.round(q[1] / N.s)));
    return j * N.m + i;
  }
  /** Suche vom Gitterpunkt s zum Gitterpunkt g vorbereiten */
  function neueSuche(nK, s, g) {
    const dist = new Float64Array(nK).fill(Infinity), vor = new Int32Array(nK).fill(-1), fertig = new Uint8Array(nK), H = new Geo.Heap();
    dist[s] = 0; H.push(0, s);
    return { s, g, dist, vor, fertig, H, besucht: 0, fertigGefunden: false, knoten: null };
  }
  /** höchstens k Knoten endgültig machen; true, wenn das Ziel erreicht ist (oder nichts mehr zu tun) */
  function expandiere(Q, NB, c, k) {
    const { dist, vor, fertig, H } = Q;
    while (k > 0 && !Q.fertigGefunden && !H.leer) {
      const i = H.pop(); if (fertig[i]) continue;
      fertig[i] = 1; Q.besucht++; k--;
      if (i === Q.g) { Q.fertigGefunden = true; break; }
      for (let r = NB.start[i]; r < NB.start[i + 1]; r++) {
        const j = NB.nb[r], d = dist[i] + c[NB.ke[r]];
        if (d < dist[j] - 1e-12) { dist[j] = d; vor[j] = i; H.push(d, j); }
      }
    }
    if (H.leer) Q.fertigGefunden = true;
    if (Q.fertigGefunden && !Q.knoten) Q.knoten = dist[Q.g] < Infinity ? Geo.weg(vor, Q.g) : [];
    return Q.fertigGefunden;
  }
  /** Smooth Polyline (Grasshopper): jeder innere Punkt rückt um strength zur Mitte seiner Nachbarn, Enden bleiben; times Durchgänge */
  function glaette(P, strength, times) {
    let Q = P.map(q => q.slice());
    for (let r = 0; r < times; r++) {
      const R = Q.map(q => q.slice());
      for (let i = 1; i < Q.length - 1; i++) for (let d = 0; d < Q[i].length; d++) R[i][d] = Q[i][d] + strength * ((Q[i - 1][d] + Q[i + 1][d]) / 2 - Q[i][d]);
      Q = R;
    }
    return Q;
  }
  /** Längsprofil einer 3D-Polylinie: Länge (3D), Höhenunterschied, max. und mittlere Steigung (dz/waagerecht) */
  function profil(P) {
    let L = 0, Lh = 0, steig = 0, maxS = 0, auf = 0;
    for (let i = 1; i < P.length; i++) {
      const h = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]), dz = P[i][2] - P[i - 1][2];
      L += Math.hypot(h, dz); Lh += h; steig += Math.abs(dz); if (dz > 0) auf += dz;
      if (h > 1e-9) maxS = Math.max(maxS, Math.abs(dz) / h);
    }
    return { laenge: L, waagerecht: Lh, hoehe: P.length ? P[P.length - 1][2] - P[0][2] : 0, maxSteigung: maxS, mittel: Lh > 0 ? steig / Lh : 0, anstieg: auf };
  }

  /* ---------------------------------------------------------------- Zustand */
  /** Neuer Zustand: Gelände, Start auf dem Gipfel, Ziel gegenüber in der Ebene; Suche beginnt bei t = 0 */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const G = Szenen.gelaende(zufall, GELAENDE);
    let gk = 0; for (let k = 1; k < G.h.length; k++) if (G.h[k] > G.h[gk]) gk = k;
    const S = G.groesse, gipfel = [(gk % G.n) * G.zelle, Math.floor(gk / G.n) * G.zelle], start = zielpunkt(S, gipfel, [0, 0], 0);
    let d = [S / 2 - gipfel[0], S / 2 - gipfel[1]]; if (Math.hypot(d[0], d[1]) < S * 0.05) d = [1, 1];
    const ziel = zielpunkt(S, start, Geo.norm(d), S);
    const z = { t: 0, G, b: G.groesse, h: G.groesse, start, ziel, N: null, E: null, NB: null, K: null, Q: null, weg: null, prof: null, greif: null };
    baue(z, p); neu(z, p);
    return z;
  }
  /** Punkt von a aus in Richtung d, höchstens l weit, innerhalb des Rands (6 % der Seite) */
  function zielpunkt(S, a, d, l) {
    const lo = S * 0.06, hi = S * 0.94; let t = l;
    for (let k = 0; k < 2; k++) { if (d[k] > 1e-12) t = Math.min(t, (hi - a[k]) / d[k]); if (d[k] < -1e-12) t = Math.min(t, (lo - a[k]) / d[k]); }
    t = Math.max(0, t);
    return [Math.max(lo, Math.min(hi, a[0] + d[0] * t)), Math.max(lo, Math.min(hi, a[1] + d[1] * t))];
  }
  /** Gitter, Kanten und Nachbarlisten neu (nach Änderung der Teilung) */
  function baue(z, p) { z.N = gitter(z.G, Math.max(2, p.teilung)); z.E = kanten(z.N); z.NB = nachbarn(z.N.m * z.N.m, z.E); z.K = kosten(z.E, p); z.U = z.N.U; }
  /** Suche zurück auf den Anfang (ohne Weg) */
  function neu(z, p) { z.Q = neueSuche(z.N.m * z.N.m, naechster(z.N, z.start), naechster(z.N, z.ziel)); z.weg = null; z.prof = null; z.profGitter = null; }
  /** Weg aus der fertigen Suche: Start – Gitterweg – Ziel, auf das Gelände gelegt, geglättet */
  function wegAus(z, p) {
    const N = z.N, kn = z.Q.knoten || [];
    const P = [[z.start[0], z.start[1], Szenen.hoehe(z.G, z.start[0], z.start[1])]]
      .concat(kn.map(k => [N.x[k], N.y[k], N.z[k]]))
      .concat([[z.ziel[0], z.ziel[1], Szenen.hoehe(z.G, z.ziel[0], z.ziel[1])]]);
    const roh = P.filter((q, i) => i === 0 || Math.hypot(q[0] - P[i - 1][0], q[1] - P[i - 1][1]) > 1e-6);
    let ueber = 0; for (let i = 1; i < kn.length; i++) { const e = kanteZwischen(z, kn[i - 1], kn[i]); if (e >= 0 && z.K.ueber[e]) ueber++; }
    z.roh = roh; z.weg = glaette(roh, 1, Math.max(1, Math.round(p.glaetten))); z.prof = profil(z.weg); z.ueber = ueber; z.kantenWeg = Math.max(0, kn.length - 1);
    z.profGitter = profil(kn.map(k => [N.x[k], N.y[k], N.z[k]]));   // Steigungen auf den Gitterkanten (ohne Anschlusslinien und Glättung)
  }
  function kanteZwischen(z, i, j) { for (let r = z.NB.start[i]; r < z.NB.start[i + 1]; r++) if (z.NB.nb[r] === j) return z.NB.ke[r]; return -1; }
  /** Suche zu Ende rechnen (nach Ziehen oder Reglern – wie Grasshopper sofort) */
  function loese(z, p) { neu(z, p); expandiere(z.Q, z.NB, z.K.c, Infinity); wegAus(z, p); }

  /** Ein Schritt: „expansionen“ Knoten der Dijkstra-Suche endgültig machen; danach steht der Weg */
  function schritt(z, p) {
    if (!z.weg && expandiere(z.Q, z.NB, z.K.c, Math.max(1, p.expansionen || STANDARD.expansionen))) wegAus(z, p);
    z.t++;
    return z;
  }
  const fertig = z => !!z.weg;

  /** Regler ohne Neustart: Teilung → neues Gitter; Gewicht, Schwelle → neue Kosten; Glätten → nur Weg; dann sofort lösen */
  function aendere(z, p, id) {
    if (id === "expansionen" || (id && id.startsWith("zeige"))) return;
    if (id === "glaetten") { if (z.weg) wegAus(z, p); return; }
    if (id === "teilung" || !z.N || z.N.U !== Math.max(2, Math.round(p.teilung))) baue(z, p);
    else z.K = kosten(z.E, p);
    loese(z, p);
  }
  /** Start oder Ziel versetzen (der nähere der beiden wird gegriffen) und den Weg sofort neu rechnen */
  function ziehe(z, p, q, phase) {
    const kl = v => Math.max(0, Math.min(z.G.groesse, v)); q = [kl(q[0]), kl(q[1])];
    if (phase !== "ziehen" || !z.greif) z.greif = Geo.abstand(q, z.start) <= Geo.abstand(q, z.ziel) ? "start" : "ziel";
    z[z.greif] = q; loese(z, p);
  }
  /** Suche mit den aktuellen Punkten von vorn abspielen */
  function abspielen(z, p) { neu(z, p); z.t = 0; }

  return { STANDARD, GELAENDE, gitter, kanten, nachbarn, steilheit, remap, kosten, naechster, neueSuche, expandiere, glaette, profil,
           zielpunkt, erzeuge, baue, neu, loese, wegAus, schritt, fertig, aendere, ziehe, abspielen };
});
