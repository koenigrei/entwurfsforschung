/* Sichtbarkeit von Objekten · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Isovist Object Visibility“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Bielik, Ekaterina Fuchkina).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie in der .gh-Datei: Die Komponente „Isovist“ (Vantage Point, Obstacle Lines = Gebäudekanten, Viewing Direction =
   Unit Y gedreht um „Angle Direction“, Viewing Range, Viewing Angle, Precision) liefert neben dem Polygon die „Obstacle Visibility“:
   je Hinderniskante die Zahl der Strahlen, die auf ihr enden. Gruppe „Normalizing the number of ray hits by the length of the
   obstacle“: Treffer ÷ Länge (Length, Division) färbt die Kanten. Gruppe „Obstacle Visibility Tree“: Unflatten Tree ordnet die
   Treffer den Gebäuden zu, Mass Addition summiert je Gebäude, Division durch die Grundfläche (Boundary Surfaces → Area) färbt
   die Gebäude. Beide Färbungen mit „Bounds“ und „Gradient“ vom kleinsten zum größten Wert. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Angle Direction 0 (0…6,28 rad), Viewing Range 100 (1…200), Viewing Angle 360 (0…360), Rays 360 (1…720);
      bezug: Teiler der Treffersumme je Gebäude („flaeche“ wie in der Datei oder „umfang“); schrittweite: Weg je Schritt (nur in der App) */
  const STANDARD = { richtung: 0, reichweite: 100, winkel: 360, strahlen: 360, bezug: "flaeche", schrittweite: 0.004 };
  /** Farbverlauf beider Gradient-Komponenten der .gh-Datei (Farbe, Lage des Griffs) – stark gestaucht: schon ein Viertel des
      größten Werts ist gelb, ab 56 % rot */
  const VERLAUF = { farben: [[0, 0, 139], [50, 178, 206], [87, 166, 31], [255, 215, 0], [255, 0, 0]], faktoren: [0, 0.0341, 0.0977, 0.1977, 0.5614] };

  /** Farbe des Verlaufs bei t ∈ [0, 1] → [r, g, b] (linear zwischen den Griffen, jenseits des letzten Griffs dessen Farbe) */
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

  /** Blickrichtung der .gh-Datei: Unit Y (Norden) um „Angle Direction“ gegen den Uhrzeigersinn gedreht (Rotate, Bogenmaß).
      In Bildschirmkoordinaten (y nach unten) ist das der Winkel −π/2 − a. */
  const blick = a => -Math.PI / 2 - (a || 0);
  /** Angle Direction (0…2π), die vom Standpunkt o zum Punkt q blickt */
  function richtungZu(o, q) { const a = -Math.PI / 2 - Math.atan2(q[1] - o[1], q[0] - o[0]); return ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); }

  /* ---------------------------------------------------------------- Gebäude und Kanten */
  /** Obstacle Lines aus den Gebäudeumrissen (Explode): Segmente, je Segment das Gebäude (Unflatten-Guide) und die Länge;
      je Gebäude Fläche (Boundary Surfaces → Area) und Umfang */
  function objekte(gebaeude) {
    const segmente = [], segGeb = [], laenge = [];
    gebaeude.forEach((g, gi) => { for (let i = 0; i < g.length; i++) { const s = [g[i], g[(i + 1) % g.length]]; segmente.push(s); segGeb.push(gi); laenge.push(Geo.abstand(s[0], s[1])); } });
    return { segmente, segGeb: Int32Array.from(segGeb), laenge: Float64Array.from(laenge), flaeche: Float64Array.from(gebaeude.map(Geo.flaeche)), umfang: Float64Array.from(gebaeude.map(Geo.umfang)) };
  }
  /** Sichtbarkeit aus einem Isovist: Treffer je Kante (Obstacle Visibility), je Kante ÷ Länge, Summe je Gebäude (Mass Addition)
      und Summe ÷ Fläche bzw. ÷ Umfang. → {kante, kanteN, geb, gebN, maxK, maxG, frei} */
  function sichtbarkeit(iso, O, bezug = "flaeche") {
    const nk = O.segGeb.length, ng = O.flaeche.length;
    const kante = new Int32Array(nk), geb = new Int32Array(ng), kanteN = new Float64Array(nk), gebN = new Float64Array(ng);
    let frei = 0;
    for (let i = 0; i < iso.treffer.length; i++) { const k = iso.treffer[i]; if (k < 0) { frei++; continue; } kante[k]++; geb[O.segGeb[k]]++; }
    let maxK = 0, maxG = 0;
    for (let k = 0; k < nk; k++) { kanteN[k] = O.laenge[k] > 0 ? kante[k] / O.laenge[k] : 0; if (kanteN[k] > maxK) maxK = kanteN[k]; }
    const teiler = bezug === "umfang" ? O.umfang : O.flaeche;
    for (let g = 0; g < ng; g++) { gebN[g] = teiler[g] > 0 ? geb[g] / teiler[g] : 0; if (gebN[g] > maxG) maxG = gebN[g]; }
    return { kante, geb, kanteN, gebN, maxK, maxG, frei };
  }

  /* ---------------------------------------------------------------- Weg für den wandernden Standpunkt */
  /** Ecken einer Polylinie abrunden (Abstand min(r, ⅓ der Nachbarkanten), Bogen aus „teile“ Stücken) */
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
  /** Rundweg auf den Straßenmitten (ohne Randstraßen) um den Platz und durch die Nachbarschaft: Kreuzungen im Abstand zwei
      um die Platzecken, verbunden durch kürzeste Wege im Straßennetz, geschlossen, Ecken abgerundet. */
  function rundweg(szene) {
    const o = szene.opt, K = szene.knoten, id = (i, j) => j * o.nx + i;
    const pi = Math.floor((o.nx - 1) / 2), pj = Math.floor((o.ny - 1) / 2);
    const amRand = q => Math.abs(q[0] - o.rand) < 1e-6 || Math.abs(q[1] - o.rand) < 1e-6 || Math.abs(q[0] - (o.b - o.rand)) < 1e-6 || Math.abs(q[1] - (o.h - o.rand)) < 1e-6;
    const N = Geo.netz(szene.strassen.filter(s => !(amRand(s[0]) && amRand(s[1])))), adj = Geo.adjazenz(N);
    const knoten = q => { let b = -1, bd = Infinity; N.knoten.forEach((k, i) => { const d = Geo.abstand(k, q); if (d < bd) { bd = d; b = i; } }); return b; };
    const nachbarn = i => adj[i].map(e => [e.j, N.kanten[e.k].l]);
    const strecke = (a, b) => { const r = Geo.dijkstra(N.knoten.length, nachbarn, a, b); return r.dist[b] < Infinity ? Geo.weg(r.vor, b).map(i => N.knoten[i]) : [N.knoten[a], N.knoten[b]]; };
    const ki = (i, j) => knoten(K[id(Math.max(1, Math.min(o.nx - 2, i)), Math.max(1, Math.min(o.ny - 2, j)))]);
    // Stationen: Westen des Platzes, Norden, Osten, Süden (je eine Kreuzung weiter außen), dazu der Platzpunkt unter der Kirche
    const st = [ki(pi - 1, pj + 1), ki(pi - 1, pj), ki(pi, pj), ki(pi + 1, pj), ki(pi + 2, pj), ki(pi + 2, pj + 1), ki(pi + 1, pj + 1)];
    let P = [];
    for (let s = 0; s < st.length - 1; s++) { const T = strecke(st[s], st[s + 1]); P = P.concat(s ? T.slice(1) : T); }
    if (szene.platz) { const c = Geo.schwerpunkt(szene.platz), bb = Geo.bbox(szene.platz); P.push([c[0], c[1] + bb.h * 0.33]); }
    P = P.concat(strecke(ki(pi, pj + 1), st[0]));
    const Q = P.filter((q, i) => i === 0 || Geo.abstand(q, P[i - 1]) > 1e-6);
    return rundeEcken(Q, 4, 4);
  }
  /** Anteil t ∈ [0, 1] des Punkts auf der Polylinie, der q am nächsten liegt */
  function naechsterAnteil(P, q) {
    let L = 0, best = Infinity, bestS = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const l = Geo.abstand(P[i], P[i + 1]), f = Geo.abstandSegment(q, P[i], P[i + 1]);
      if (f.d < best) { best = f.d; bestS = L + f.t * l; }
      L += l;
    }
    return L > 0 ? bestS / L : 0;
  }

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  /** Neuer Zustand: Beispielstadt, Rundweg, Standpunkt auf dem Platz vor der Kirche */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = Szenen.stadt(zufall);
    const O = objekte(szene.gebaeude), pfad = rundweg(szene);
    const c = Geo.schwerpunkt(szene.platz), bb = Geo.bbox(szene.platz);
    const z = { t: 0, szene, b: szene.b, h: szene.h, O, pfad, anteil: 0, o: null, iso: null, s: null };
    z.anteil = naechsterAnteil(pfad, [c[0] - bb.b * 0.25, c[1] + bb.h * 0.33]);
    z.o = Szenen.aufPolylinie(pfad, z.anteil).p;
    rechne(z, p);
    return z;
  }
  /** Isovist und Sichtbarkeit neu berechnen */
  function rechne(z, p) {
    z.iso = Geo.isovist(z.o, z.O.segmente, { winkel: p.winkel, reichweite: p.reichweite, strahlen: p.strahlen, richtung: blick(p.richtung) });
    z.s = sichtbarkeit(z.iso, z.O, p.bezug);
    return z;
  }
  /** Ein Schritt: der Standpunkt wandert um „schrittweite“ den Rundweg entlang (am Ende von vorn); erhöht z.t */
  function schritt(z, p) {
    z.anteil += p.schrittweite == null ? STANDARD.schrittweite : p.schrittweite;
    if (z.anteil >= 1) z.anteil -= Math.floor(z.anteil);
    z.o = Szenen.aufPolylinie(z.pfad, z.anteil).p;
    rechne(z, p);
    z.t++;
    return z;
  }
  function aendere(z, p) { rechne(z, p); }

  /** liegt der Punkt in einem Gebäude? */
  function imGebaeude(z, q) { return z.szene.gebaeude.some(g => Geo.punktInPoly(q, g)); }
  /** Standpunkt frei versetzen (nicht in ein Gebäude, nicht außerhalb); der nächste Schritt geht vom nächsten Wegpunkt weiter */
  function setzeStandpunkt(z, p, q) {
    if (q[0] < 0 || q[1] < 0 || q[0] > z.b || q[1] > z.h || imGebaeude(z, q)) return false;
    z.o = [q[0], q[1]]; z.anteil = naechsterAnteil(z.pfad, q); rechne(z, p); return true;
  }

  /** Kennzahlen: sichtbare Gebäude und Kanten, sichtbarstes Gebäude (nach der normierten Sichtbarkeit) */
  function auswertung(z) {
    const s = z.s; let n = 0, best = -1, nk = 0, summe = 0;
    for (let g = 0; g < s.geb.length; g++) { if (s.geb[g] > 0) n++; summe += s.geb[g]; if (best < 0 || s.gebN[g] > s.gebN[best]) best = g; }
    for (let k = 0; k < s.kante.length; k++) if (s.kante[k] > 0) nk++;
    return { sichtbar: n, gebaeude: s.geb.length, kanten: nk, treffer: summe, frei: s.frei, bester: s.geb[best] > 0 ? best : -1 };
  }

  return { STANDARD, VERLAUF, verlauf, blick, richtungZu, objekte, sichtbarkeit, rundeEcken, rundweg, naechsterAnteil,
           erzeuge, rechne, schritt, aendere, imGebaeude, setzeStandpunkt, auswertung };
});
