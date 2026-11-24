/* Baublock-Generator (DigiWo) · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung der „DigiWo – Block Generation Components / Slabs Generation Components“ aus dem DeCodingSpaces Lab
   (Iuliia Osintseva mit Reinhard König, Sven Schneider, Martin Bielik, Andreas Berst; SimAUD 2020).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie im Tutorial und im Paper (Osintseva et al. 2020): Das Grundstück wird um die Abstandsfläche
   T = max(Mindestmaß, Faktor · H) nach innen versetzt (H = Geschosse · Geschosshöhe; Faktor nach Land und Baugebiet;
   an Straßen darf die Abstandsfläche bis zur Straßenmitte reichen, an einer „Baulinie“ entfällt sie). Daraus entsteht
   der Basisblock: ein Ring der Gebäudetiefe, zerlegt in Flügel (je Kante) und Ecken. Danach wirken „Aktionen“ in
   beliebiger Folge auf die Baukörper – jede mit eigener Saat und wahlweise am Attraktorpunkt: Kanten löschen,
   Rücksprünge an Kanten und Ecken, Eckdurchgänge, Zufallsdurchgänge, Höhe reduzieren, Türme (begrenzt durch die
   Abstandsflächen-Hüllkurve), Hofgebäude, Dachgeschosse. Zweite Typologie: Zeilen entlang von vier charakteristischen
   Kanten. Zustand t = 0 ist die Grundform, jeder Schritt wendet eine Aktion an; danach folgt die nächste Variante
   (eigene Saaten, wie „Nr of options“ des Originals), deren GFZ in einer Reihe gesammelt wird. Kennzahlen GRZ, GFZ, BGF (Definitionen wie BauNVO §§ 19, 20).
   Die Grasshopper-Dateien sind nicht mehr erreichbar; alles ist nach Seite, Bildern und Paper neu umgesetzt (QUELLE.md). */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/flaechen.js") : wurzel.Flaechen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Flaechen) {
  "use strict";
  const { sub, add, mul, dot, norm, abstand, flaeche, flaecheS, schwerpunkt, punktInPoly, geradeSchnittPoly, versetze, bereinige, abstandSegment } = Geo;
  const EPS = 1e-7, KLEIN = 0.05;   // Flächen unter 0,05 m² gelten als leer (Rundungsreste beim Schneiden)

  /* ---------------------------------------------------------------- Regeln: Abstandsflächen und Dichte */
  /** Abstandsflächen je Land: Regeltiefe f·H, Mindesttiefe, abweichende Faktoren je Baugebiet.
      Werte aus den Landesbauordnungen, wie in den Profilen der DeCodingSpaces Toolbox (data/abstandsflaechen/*.json) abgelesen. */
  const LAENDER = {
    MBO: { de: "Musterbauordnung und die meisten Länder (0,4 H, mind. 3 m)", en: "Model building code and most Länder (0.4 H, min. 3 m)", f: 0.4, min: 3, zonen: { GE: 0.2 } },
    BW: { de: "Baden-Württemberg (0,4 H, mind. 2,5 m)", en: "Baden-Württemberg (0.4 H, min. 2.5 m)", f: 0.4, min: 2.5, zonen: { MK: 0.2, MU: 0.2, GE: 0.125 } },
    HE: { de: "Hessen (0,4 H, mind. 2,5 m)", en: "Hesse (0.4 H, min. 2.5 m)", f: 0.4, min: 2.5, zonen: { GE: 0.2 } },
    HH: { de: "Hamburg (0,4 H, mind. 2,5 m)", en: "Hamburg (0.4 H, min. 2.5 m)", f: 0.4, min: 2.5, zonen: { GE: 0.2 } },
    NW: { de: "Nordrhein-Westfalen (0,4 H; MK 0,25 H)", en: "North Rhine-Westphalia (0.4 H; MK 0.25 H)", f: 0.4, min: 3, zonen: { MK: 0.25, GE: 0.2 } },
    RP: { de: "Rheinland-Pfalz (0,4 H; GE 0,25 H)", en: "Rhineland-Palatinate (0.4 H; GE 0.25 H)", f: 0.4, min: 3, zonen: { GE: 0.25 } },
    BY250: { de: "Bayern, Gemeinde > 250 000 Ew. (Art. 6 Abs. 5a: 1 H)", en: "Bavaria, city > 250,000 (Art. 6 (5a): 1 H)", f: 1.0, min: 3, zonen: { MK: 0.4, MU: 0.4, GE: 0.2 } }
  };
  /** Baugebiete mit den Orientierungswerten für Obergrenzen nach § 17 BauNVO (GRZ, GFZ) */
  const GEBIETE = {
    WA: { de: "WA – Allgemeines Wohngebiet", en: "WA – general residential", grz: 0.4, gfz: 1.2 },
    MI: { de: "MI – Mischgebiet", en: "MI – mixed area", grz: 0.6, gfz: 1.2 },
    MU: { de: "MU – Urbanes Gebiet", en: "MU – urban area", grz: 0.8, gfz: 3.0 },
    MK: { de: "MK – Kerngebiet", en: "MK – core area", grz: 1.0, gfz: 3.0 },
    GE: { de: "GE – Gewerbegebiet", en: "GE – commercial area", grz: 0.8, gfz: 2.4 }
  };
  /** Standortfaktor f und Mindesttiefe nach Land und Baugebiet */
  function standort(p) {
    const L = LAENDER[p.land] || LAENDER.MBO;
    return { f: L.zonen[p.gebiet] != null ? L.zonen[p.gebiet] : L.f, min: L.min };
  }
  /** Tiefe der Abstandsfläche: T = max(Mindestmaß, Faktor · H) */
  function abstandsTiefe(H, p) { const s = standort(p); return Math.max(s.min, s.f * H); }
  /** Abstand vom Grundstücksrand je Kantenart: Nachbargrenze T; Straße T − halbe Straßenbreite (Fläche darf bis zur Mitte reichen); Baulinie 0 */
  function randAbstand(art, T, p) {
    if (art === "baulinie") return 0;
    if (art === "strasse") return Math.max(0, T - p.strasse / 2);
    return T;
  }

  /* ---------------------------------------------------------------- Grundstücke */
  const GRUNDSTUECKE = {
    rechteck: { de: "Rechteck 120 × 90 m", en: "Rectangle 120 × 90 m", punkte: [[0, 0], [120, 0], [120, 90], [0, 90]], arten: ["strasse", "nachbar", "strasse", "nachbar"] },
    trapez: { de: "Trapez", en: "Trapezoid", punkte: [[0, 0], [150, 0], [128, 100], [12, 100]], arten: ["strasse", "strasse", "nachbar", "strasse"] },
    keil: { de: "Keil (wie im Paper)", en: "Wedge (as in the paper)", punkte: [[0, 0], [165, 0], [165, 26], [42, 128], [0, 118]], arten: ["strasse", "strasse", "strasse", "nachbar", "baulinie"] },
    fuenfeck: { de: "Fünfeck", en: "Pentagon", punkte: [[10, 0], [120, 8], [140, 80], [64, 122], [0, 76]], arten: ["strasse", "nachbar", "strasse", "nachbar", "strasse"] }
  };
  const KANTENARTEN = ["strasse", "nachbar", "baulinie"];

  /* ---------------------------------------------------------------- Aktionen */
  const AKTIONEN = {
    kanten: { de: "Kanten löschen", en: "Delete edges", saat: "kSaat", attr: "kAttr", zeilen: true },
    rsKante: { de: "Rücksprünge an Kanten", en: "Setbacks edges", saat: "rkSaat", attr: "rkAttr", zeilen: false },
    rsEcke: { de: "Rücksprünge an Ecken", en: "Setbacks corners", saat: "reSaat", attr: "reAttr", zeilen: false },
    eck: { de: "Eckdurchgänge", en: "Cornerbreaks", saat: "ebSaat", attr: "ebAttr", zeilen: false },
    durch: { de: "Zufallsdurchgänge", en: "Random breaks", saat: "zdSaat", attr: "zdAttr", zeilen: true },
    hoehe: { de: "Höhe reduzieren", en: "Reduce height", saat: "rhSaat", attr: "rhAttr", zeilen: true },
    turm: { de: "Türme", en: "Towers", saat: "tuSaat", attr: "tuAttr", zeilen: true },
    hof: { de: "Hofgebäude", en: "Yard buildings", saat: "hoSaat", attr: "hoAttr", zeilen: false },
    dach: { de: "Dachgeschosse", en: "Rooftops", saat: "daSaat", attr: "daAttr", zeilen: true }
  };
  const SLOTS = ["a1", "a2", "a3", "a4", "a5", "a6"];

  /** Voreinstellungen. Bereiche stehen in app.js. Die .gh-Dateien sind verloren; Werte aus Tutorial, Paper (Fig. 2: Nr of options 10,
      yards floor cnt „3 to 5“, cut the yard slabs? True) und üblichen Maßen des Wohnungsbaus (Tiefe 12 m wie PerimeterTypology der Toolbox). */
  const STANDARD = {
    form: "rechteck", strasse: 20, land: "MBO", gebiet: "MU",
    typ: "block", tiefe: 12, gMin: 4, gMax: 6, gh: 3,
    zFolge: "1234", zR1: 2, zR2: 1, zR3: 1, zR4: 0, zLaenge: 50,
    a1: "durch", a2: "rsKante", a3: "hoehe", a4: "turm", a5: "hof", a6: "dach",
    kStart: 0, kAnzahl: 1, kSaat: 1, kAttr: false,
    rkLmin: 12, rkLmax: 30, rkTmin: 3, rkTmax: 6, rkAnzahl: 2, rkSaat: 1, rkAttr: false,
    reMin: 4, reMax: 9, reAnzahl: 2, reSaat: 1, reAttr: false,
    ebBreite: 6, ebRichtung: "zufall", ebAnzahl: 0, ebSaat: 1, ebAttr: false,
    zdModus: "flaeche", zdFlaeche: 1500, zdBreite: 18, zdEinzel: 6, zdSaat: 1, zdAttr: false,
    rhFlaeche: 2000, rhMin: 2, rhSaat: 1, rhAttr: false,
    tuAnzahl: 2, tuFlaeche: 250, tuMax: 6, tuSaat: 1, tuAttr: true,
    hoTiefe: 12, hoGmin: 3, hoGmax: 5, hoAnzahl: 1, hoZuschneiden: true, hoRichtung: "laengs", hoSaat: 1, hoAttr: false,
    daTiefe: 8, daAusrichtung: "hof", daAnteil: 60, daSaat: 1, daAttr: false,
    varianten: 20
  };

  /* ---------------------------------------------------------------- Zufall je Aktion (aus der Saat des Laufs abgeleitet) */
  function mische() {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < arguments.length; i++) { h ^= (arguments[i] >>> 0); h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; }
    return h >>> 0;
  }
  /** Zufallsfolge mit fester Saat (mulberry32 wie zufall.js) – die Saat stammt aus dem übergebenen zufall() des Laufs */
  function zufallAus(saat) {
    let a = (saat >>> 0) || 1;
    const f = function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.ganz = n => Math.floor(f() * n);
    f.zwischen = (u, o) => u + f() * (o - u);
    return f;
  }

  /* ---------------------------------------------------------------- Halbebenen und konvexe Polygone (_gemeinsam/flaechen.js) */
  /** Halbebene {x : (x − p) · n ≤ 0} */
  const HE = Flaechen.halbebene;
  /** gegen den Uhrzeigersinn ausrichten (flaecheS > 0) */
  const ccw = P => (flaecheS(P) < 0 ? P.slice().reverse() : P);
  /** Polygon auf den Schnitt der Halbebenen beschneiden; [] wenn leer (Flächen unter KLEIN gelten als leer) */
  const clip = (poly, H) => Flaechen.clip(poly, H, KLEIN);
  /** poly ohne den Schnitt der Halbebenen H → Liste konvexer Teile (poly konvex) */
  const ohne = (poly, H) => Flaechen.ohne(poly, H, KLEIN);
  /** Halbebenen eines konvexen Polygons (Innenseite) */
  const halbebenen = P => Flaechen.halbebenen(P);
  const schnitt = (A, B) => clip(A, halbebenen(B));
  const istKonvex = P => {
    let s = 0;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], c = P[(i + 2) % P.length];
      const k = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(k) < 1e-9) continue;
      if (s === 0) s = Math.sign(k); else if (Math.sign(k) !== s) return false;
    }
    return true;
  };

  /* ---------------------------------------------------------------- Rahmen: Kante mit Richtung e und Innennormale n */
  function rahmen(a, b, t) { const e = norm(sub(b, a)); return { a, e, n: [-e[1], e[0]], L: abstand(a, b), t }; }
  const uv = (f, x) => [dot(sub(x, f.a), f.e), dot(sub(x, f.a), f.n)];
  const punktUV = (f, u, v) => add(f.a, add(mul(f.e, u), mul(f.n, v)));
  const vMin = (f, c) => HE(punktUV(f, 0, c), [-f.n[0], -f.n[1]]);
  const vMax = (f, c) => HE(punktUV(f, 0, c), f.n);
  const uMin = (f, c) => HE(punktUV(f, c, 0), [-f.e[0], -f.e[1]]);
  const uMax = (f, c) => HE(punktUV(f, c, 0), f.e);
  /** Rechteck im Rahmen (u0…u1, v0…v1) als Polygon und als Halbebenen */
  const band = (f, u0, u1, v0, v1) => [uMin(f, u0), uMax(f, u1), vMin(f, v0), vMax(f, v1)];
  const rechteck = (f, u0, u1, v0, v1) => ccw([punktUV(f, u0, v0), punktUV(f, u1, v0), punktUV(f, u1, v1), punktUV(f, u0, v1)]);
  /** u-Bereich eines Polygons im Rahmen */
  function uBereich(f, P) { let a = Infinity, b = -Infinity; for (const x of P) { const u = uv(f, x)[0]; if (u < a) a = u; if (u > b) b = u; } return [a, b]; }
  function vBereich(f, P) { let a = Infinity, b = -Infinity; for (const x of P) { const v = uv(f, x)[1]; if (v < a) a = v; if (v > b) b = v; } return [a, b]; }
  /** u-Abschnitt der Geraden v = const im konvexen Polygon */
  function linieIm(P, f, v) { const S = geradeSchnittPoly(P, punktUV(f, 0, v), f.e); return S.length >= 2 ? [S[0], S[S.length - 1]] : null; }
  /** u-Bereich, in dem das ganze Band v0…v1 im konvexen Polygon liegt */
  function bandIm(P, f, v0, v1) {
    const a = linieIm(P, f, v0 + 1e-6), b = linieIm(P, f, v1 - 1e-6);
    if (!a || !b) return null;
    const r = [Math.max(a[0], b[0]), Math.min(a[1], b[1])];
    return r[1] > r[0] ? r : null;
  }
  /** freie Abschnitte von [lo, hi] ohne die gesperrten Intervalle */
  function freieAbschnitte(lo, hi, gesperrt) {
    const G = gesperrt.filter(g => g[1] > lo && g[0] < hi).sort((x, y) => x[0] - y[0]), out = [];
    let a = lo;
    for (const g of G) { if (g[0] > a) out.push([a, Math.min(g[0], hi)]); a = Math.max(a, g[1]); if (a >= hi) break; }
    if (a < hi) out.push([a, hi]);
    return out.filter(x => x[1] - x[0] > 1e-6);
  }
  /** Abschnitt der Länge len in m Stücke ≤ lmax mit Lücke s teilen (Stücke ≥ lmin) → [[u0, u1], …] */
  function teileAbschnitt(a, b, lmax, lmin, s) {
    const len = b - a; if (len < lmin - 1e-9) return [];
    let m = Math.max(1, Math.ceil((len + s) / (lmax + s) - 1e-9)), st = (len - (m - 1) * s) / m;
    while (m > 1 && st < lmin) { m--; st = (len - (m - 1) * s) / m; }
    const out = []; for (let j = 0; j < m; j++) { const u0 = a + j * (st + s); out.push([u0, u0 + st]); }
    return out;
  }

  /* ---------------------------------------------------------------- Baukörper (konvexe Teile auf dem Boden, mit Geschossen und Dachgeschoss) */
  function stueck(z, poly, g, art, x) {
    return Object.assign({ id: ++z.nid, poly: ccw(poly), g, art, kante: -1, ecke: -1, teil: "", rahmen: [], dach: [], dg: 0, markiert: true }, x || {});
  }
  const kopie = (z, st, poly) => Object.assign({}, st, { id: ++z.nid, poly, dach: st.dach.map(d => schnitt(d, poly)).filter(d => d.length) });
  /** Fläche ∩H aus den Baukörpern entfernen, die filter erfüllen; liefert entfernte BGF in m² */
  function entferne(z, H, filter) {
    let weg = 0; const neu = [];
    for (const st of z.st) {
      if (!filter(st)) { neu.push(st); continue; }
      const c = clip(st.poly, H);
      if (!c.length) { neu.push(st); continue; }
      weg += flaeche(c) * st.g + st.dach.reduce((s, d) => s + flaeche(schnitt(d, c)), 0) * st.dg;
      z.weg.push(c);
      for (const q of ohne(st.poly, H)) neu.push(kopie(z, st, q));
    }
    z.st = neu; return weg;
  }
  /** Baukörper an ∩H teilen; aendern(teilInnen) verändert den inneren Teil */
  function teileUnd(z, H, filter, aendern) {
    const neu = []; let n = 0;
    for (const st of z.st) {
      if (!filter(st)) { neu.push(st); continue; }
      const c = clip(st.poly, H);
      if (!c.length) { neu.push(st); continue; }
      for (const q of ohne(st.poly, H)) neu.push(kopie(z, st, q));
      const k = kopie(z, st, c); aendern(k); k.markiert = true; neu.push(k); n++;
    }
    z.st = neu; return n;
  }
  const grundflaeche = z => z.st.reduce((s, st) => s + flaeche(st.poly), 0);
  const bgf = z => z.st.reduce((s, st) => s + flaeche(st.poly) * st.g + st.dach.reduce((a, d) => a + flaeche(d), 0) * st.dg, 0);
  /** überdeckt der Polygonzug bestehende Baukörper? (Fläche des Schnitts) */
  const ueberdeckung = (z, P, filter) => z.st.reduce((s, st) => s + (!filter || filter(st) ? (schnitt(P, st.poly).length ? flaeche(schnitt(P, st.poly)) : 0) : 0), 0);

  /* ---------------------------------------------------------------- Grundform */
  /** Grundstück nach innen um die Abstände je Kante versetzen (Schnitt der Halbebenen; konvexe Grundstücke) */
  function versetzeGrundstueck(plot, abst) {
    const F = plot.map((a, j) => rahmen(a, plot[(j + 1) % plot.length], 0));
    const P = clip(plot, F.map((f, j) => vMin(f, abst[j])));
    return P.length ? bereinige(P, 1e-6) : [];
  }
  /** Ring der Tiefe t im Umriss: Flügel je Kante (ohne Ecken) und Ecken (Schnitt zweier Streifen) */
  function ring(umriss, t) {
    const m = umriss.length, F = umriss.map((a, i) => rahmen(a, umriss[(i + 1) % m], t));
    const fluegel = [], ecken = [];
    for (let i = 0; i < m; i++) {
      const f = F[i], fv = F[(i + m - 1) % m], fn = F[(i + 1) % m];
      fluegel.push(clip(umriss, [vMax(f, t), vMin(fv, t), vMin(fn, t)]));
      ecken.push(clip(umriss, [vMax(fv, t), vMax(f, t)]));    // Ecke i am Punkt i, zwischen Flügel i − 1 und i
    }
    const hof = clip(umriss, F.map(f => vMin(f, t)));
    return { F, fluegel, ecken, hof };
  }
  /** Rechteckiger Teil eines Flügels (volle Tiefe) als u-Bereich */
  function fluegelMitte(f, P, t) { return P.length ? bandIm(P, f, 0, t) : null; }

  /** Vier charakteristische Kanten: benachbarte Kanten mit der kleinsten Richtungsänderung zusammenfassen, bis vier übrig sind;
      die Richtung einer Gruppe ist die ihrer längsten Kante (Gruppen-Sehne als Richtung, solange nur eine Kante) */
  function charakteristischeKanten(P) {
    const m = P.length; let G = P.map((_, i) => ({ von: i, bis: i }));
    const richtung = g => { const a = P[g.von], b = P[(g.bis + 1) % m]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    const knick = (g1, g2) => { let d = Math.abs(richtung(g2) - richtung(g1)) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };
    while (G.length > 4) {
      let best = 0, bw = Infinity;
      for (let i = 0; i < G.length; i++) { const w = knick(G[i], G[(i + 1) % G.length]); if (w < bw - 1e-12) { bw = w; best = i; } }
      const j = (best + 1) % G.length, g = { von: G[best].von, bis: G[j].bis };
      if (j === 0) { G[best] = g; G.shift(); } else G.splice(best, 2, g);
    }
    G.sort((x, y) => x.von - y.von);
    // Richtung und Lage gibt die längste Kante der Gruppe vor; kette = die zusammengefassten Kanten (zum Zeichnen)
    return G.map(g => {
      const idx = []; for (let i = g.von; ; i = (i + 1) % m) { idx.push(i); if (i === g.bis) break; }
      const l = idx.reduce((b, i) => abstand(P[i], P[(i + 1) % m]) > abstand(P[b], P[(b + 1) % m]) ? i : b, idx[0]);
      return { a: P[l], b: P[(l + 1) % m], von: g.von, bis: g.bis, kette: idx.map(i => P[i]).concat([P[(g.bis + 1) % m]]) };
    });
  }

  /* ---------------------------------------------------------------- Zustand */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const G = GRUNDSTUECKE[p.form] || GRUNDSTUECKE.rechteck;
    let plot = G.punkte.map(q => q.slice()), arten = G.arten.slice();
    if (flaecheS(plot) < 0) { plot = plot.reverse(); const r = arten.slice().reverse(); arten = r.slice(1).concat(r.slice(0, 1)); }
    const c = schwerpunkt(plot);
    const z = { t: 0, basis: zufall.ganz(2147483647), plot, arten, attraktor: add(c, mul(sub(plot[2 % plot.length], c), 0.62)), nid: 0 };
    baue(z, p);
    return z;
  }

  /** Folge der Aktionen aus den sechs Feldern */
  const folge = p => SLOTS.map(s => p[s]).filter(a => AKTIONEN[a]);
  /** Variantenreihe: je Variante Grundform + alle Aktionen; Schritt t gehört zu Variante v = ⌊t / (n + 1)⌋ mit k = t mod (n + 1) Aktionen */
  const proVariante = p => folge(p).length + 1;
  const anzahlVarianten = p => Math.max(1, p.varianten | 0);
  const fertig = (z, p) => z.t >= anzahlVarianten(p) * proVariante(p) - 1;
  const lage = (z, p) => ({ v: Math.floor(z.t / proVariante(p)), k: z.t % proVariante(p) });
  const kurz = z => ({ v: z.v, GFZ: z.kz.GFZ, GRZ: z.kz.GRZ, BGF: z.kz.BGF });

  /** Zustand aus Grundstück und Parametern neu aufbauen: frühere Varianten (nur Kennzahlen), dann die laufende Variante bis zum Schritt z.t */
  function baue(z, p) {
    p = Object.assign({}, STANDARD, p);
    // Variante und Zahl der Aktionen bleiben erhalten, auch wenn sich die Länge der Folge ändert
    if (z.v != null) z.t = Math.min(z.v, anzahlVarianten(p) - 1) * proVariante(p) + Math.min(z.k, proVariante(p) - 1);
    z.t = Math.max(0, Math.min(z.t, anzahlVarianten(p) * proVariante(p) - 1));
    const { v, k } = lage(z, p);
    z.vBis = Math.min(Math.max(z.vBis || 0, k === proVariante(p) - 1 ? v + 1 : v), anzahlVarianten(p));   // so viele Varianten waren schon fertig
    z.varianten = [];
    for (let u = 0; u < Math.max(v, z.vBis); u++) if (u !== v) { aufbau(z, p, u, proVariante(p) - 1); z.varianten.push(kurz(z)); }
    return aufbau(z, p, v, k);
  }
  /** Variante v mit Grundform und den ersten k Aktionen (Zustand t = 0 ist die Grundform der ersten Variante) */
  function aufbau(z, p, v, k) {
    z.v = v; z.k = k; z.sv = v === 0 ? z.basis : mische(z.basis, 9973, v);
    const r0 = zufallAus(mische(z.sv, 0));
    const gMin = Math.min(p.gMin, p.gMax), gMax = Math.max(p.gMin, p.gMax);
    z.G = p.typ === "zeilen" ? gMax : gMin + r0.ganz(gMax - gMin + 1);    // Zeilen: Abstandsflächen für die höchste Zeile
    z.H = z.G * p.gh; z.T = abstandsTiefe(z.H, p); z.stand = standort(p);
    z.abst = z.arten.map(a => randAbstand(a, z.T, p));
    z.plotF = z.plot.map((a, j) => rahmen(a, z.plot[(j + 1) % z.plot.length], 0));
    z.umriss = versetzeGrundstueck(z.plot, z.abst);
    z.st = []; z.weg = []; z.log = []; z.rahmen = []; z.hof = []; z.mitte = []; z.ck = []; z.nid = 0; z.zeilenAbstand = 2 * z.T;
    (p.typ === "zeilen" ? zeilen : basisblock)(z, p, zufallAus(mische(z.sv, 1)));
    for (const st of z.st) st.markiert = false;                         // die Grundform ist keine Aktion
    for (let j = 1; j <= k; j++) schrittAus(z, p, j);
    messe(z, p);
    return z;
  }

  function schrittAus(z, p, k) {
    z.weg = []; for (const st of z.st) st.markiert = false;
    const id = folge(p)[k - 1], A = AKTIONEN[id];
    const rnd = zufallAus(mische(z.sv, k, p[A.saat] | 0, 7));
    if (p.typ === "zeilen" && !A.zeilen) { z.log.push({ de: `${A.de}: nur für den Blockrand`, en: `${A.en}: perimeter block only` }); return; }
    if (!z.umriss.length) { z.log.push({ de: `${A.de}: kein Bauland`, en: `${A.en}: no buildable area` }); return; }
    TUN[id](z, p, rnd, !!p[A.attr]);
  }

  /** Grundform Blockrand: Ring der Gebäudetiefe um den versetzten Umriss, zerlegt in Flügel und Ecken */
  function basisblock(z, p) {
    if (z.umriss.length < 3) { z.log.push({ de: "Basisblock: Grundstück zu klein", en: "Basic block: plot too small" }); return; }
    const t = p.tiefe, R = ring(z.umriss, t), m = z.umriss.length;
    z.rahmen = R.F.slice(); z.hof = R.hof; z.mitte = R.F.map((f, i) => fluegelMitte(f, R.fluegel[i], t));
    for (let i = 0; i < m; i++) {
      if (R.ecken[i].length) z.st.push(stueck(z, R.ecken[i], z.G, "ecke", { ecke: i, teil: "e" + i, rahmen: [(i + m - 1) % m, i] }));
      if (R.fluegel[i].length) z.st.push(stueck(z, R.fluegel[i], z.G, "rand", { kante: i, teil: "k" + i, rahmen: [i] }));
    }
    entflechte(z);
    z.log.push({ de: `Basisblock: ${z.G} Geschosse, Tiefe ${fd(t)} m, Abstandsfläche ${fd(z.T)} m`, en: `Basic block: ${z.G} floors, depth ${fmt(t)} m, spacing ${fmt(z.T)} m` });
  }
  /** Überlappungen (bei kurzen Kanten möglich) entfernen: spätere Teile verlieren, was frühere schon belegen */
  function entflechte(z) {
    const out = [];
    for (const st of z.st) {
      let teile = [st.poly];
      for (const o of out) { const H = halbebenen(o.poly); teile = teile.flatMap(q => schnitt(q, o.poly).length ? ohne(q, H) : [q]); }
      for (const q of teile) out.push(q === st.poly ? st : kopie(z, st, q));
    }
    z.st = out;
  }

  /** Grundform Zeilen: Zeilen parallel zu den vier charakteristischen Kanten, in der gewählten Reihenfolge, so lange Platz ist */
  function zeilen(z, p, rnd) {
    if (z.umriss.length < 3) { z.log.push({ de: "Zeilen: Grundstück zu klein", en: "Slabs: plot too small" }); return; }
    const K = charakteristischeKanten(z.umriss), t = p.tiefe, a = z.zeilenAbstand;
    const reihen = [p.zR1, p.zR2, p.zR3, p.zR4], ordnung = String(p.zFolge).split("").map(c => +c - 1).filter(i => i >= 0 && i < K.length);
    const gMin = Math.min(p.gMin, p.gMax), gMax = Math.max(p.gMin, p.gMax);
    z.ck = K; let n = 0;
    for (const k of ordnung) {
      const f0 = rahmen(K[k].a, K[k].b, t);
      for (let r = 0; r < (reihen[k] | 0); r++) {
        const v0 = r * (t + a), v1 = v0 + t, ok = bandIm(z.umriss, f0, v0, v1);
        if (!ok) break;
        const gesperrt = [];
        for (const st of z.st) {
          const d = clip(versetze(st.poly, -a), [vMin(f0, v0), vMax(f0, v1)]);
          if (d.length) gesperrt.push(uBereich(f0, d));
        }
        for (const [s0, s1] of freieAbschnitte(ok[0], ok[1], gesperrt))
          for (const [u0, u1] of teileAbschnitt(s0, s1, p.zLaenge, 12, a)) {
            const fi = z.rahmen.length;
            z.rahmen.push(rahmen(punktUV(f0, u0, v0), punktUV(f0, u1, v0), t));
            z.st.push(stueck(z, rechteck(f0, u0, u1, v0, v1), gMin + rnd.ganz(gMax - gMin + 1), "zeile", { kante: k, teil: "z" + (++n), rahmen: [fi] }));
          }
      }
    }
    z.log.push({ de: `Zeilen: ${n} Zeilen an ${K.length} charakteristischen Kanten, Zeilenabstand ${fd(a)} m`, en: `Slabs: ${n} slabs along ${K.length} characteristic edges, spacing ${fmt(a)} m` });
  }

  /* ---------------------------------------------------------------- Hilfen für die Aktionen */
  const m_ = z => z.umriss.length;
  const naechsteKante = (z, q) => { let b = 0, bd = Infinity; for (let i = 0; i < m_(z); i++) { const d = abstandSegment(q, z.umriss[i], z.umriss[(i + 1) % m_(z)]).d; if (d < bd) { bd = d; b = i; } } return b; };
  /** zufällige Auswahl ohne Zurücklegen */
  function ziehe(rnd, L, n) { const A = L.slice(), out = []; while (A.length && out.length < n) out.push(A.splice(rnd.ganz(A.length), 1)[0]); return out; }
  const gesch = (z, q) => { const st = z.st.find(s => punktInPoly(q, s.poly)); return st ? st.g : 0; };
  const fmt = (x, n = 1) => (Math.round(x * Math.pow(10, n)) / Math.pow(10, n)).toString();
  const fd = (x, n = 1) => fmt(x, n).replace(".", ",");
  const fmtM2 = x => Math.round(x).toString();
  /** Abschnitte an Kanten (Blockrand: rechteckige Flügelteile; Zeilen: jede Zeile) für Durchgänge und Türme */
  function abschnitte(z) {
    if (z.ck.length) {   // Zeilen
      const out = [];
      for (const st of z.st) if (st.art === "zeile") { const f = z.rahmen[st.rahmen[0]], [u0, u1] = uBereich(f, st.poly); out.push({ fi: st.rahmen[0], u0, u1, filter: s => s.teil === st.teil, teil: st.teil }); }
      return out;
    }
    return z.mitte.map((mi, i) => mi && z.st.some(s => s.kante === i) ? { fi: i, u0: mi[0], u1: mi[1], filter: s => s.kante === i && s.art !== "hof", kante: i } : null).filter(Boolean);
  }
  /** Ist das Band im Rahmen voll bebaut? (Anteil der Fläche) */
  function bebaut(z, f, u0, u1, filter) {
    const R = rechteck(f, u0, u1, 0, f.t);
    return ueberdeckung(z, R, filter) / Math.max(EPS, flaeche(R));
  }

  /* ---------------------------------------------------------------- Aktionen */
  const TUN = {
    /** Kanten löschen (Open Block): ab der Startkante n Flügel entfernen; Ecken zwischen zwei gelöschten Flügeln fallen mit weg */
    kanten(z, p, rnd, attr) {
      const zeil = z.ck.length > 0, m = zeil ? z.ck.length : m_(z), n = Math.max(1, Math.min(p.kAnzahl, m - 1));
      const start = attr ? (zeil ? naechsteCK(z, z.attraktor) : naechsteKante(z, z.attraktor)) : p.kStart > 0 ? (p.kStart - 1) % m : rnd.ganz(m);
      const K = new Set(), E = new Set();
      for (let j = 0; j < n; j++) { K.add((start + j) % m); if (j > 0) E.add((start + j) % m); }
      const vor = bgf(z), alt = z.st;
      z.st = z.st.filter(st => !((st.kante >= 0 && K.has(st.kante) && st.art !== "hof") || (st.ecke >= 0 && E.has(st.ecke))));
      for (const st of alt) if (!z.st.includes(st)) z.weg.push(st.poly);
      z.log.push({ de: `Kanten löschen: ab Kante ${start + 1}, ${n} Kante(n), −${fmtM2(vor - bgf(z))} m² BGF`, en: `Delete edges: from edge ${start + 1}, ${n} edge(s), −${fmtM2(vor - bgf(z))} m² GFA` });
    },

    /** Rücksprünge an Kanten: ein Stück des Flügels (Länge, Tiefe aus dem Bereich) rückt nach innen – außen ein Platz, innen ragt es in den Hof */
    rsKante(z, p, rnd, attr) {
      const lmin = Math.min(p.rkLmin, p.rkLmax), lmax = Math.max(p.rkLmin, p.rkLmax), tmin = Math.min(p.rkTmin, p.rkTmax), tmax = Math.max(p.rkTmin, p.rkTmax), rand = 3;
      let n = 0;
      for (let s = 0; s < p.rkAnzahl; s++) {
        for (let versuch = 0; versuch < 24; versuch++) {
          const A = abschnitte(z).filter(a => a.u1 - a.u0 >= lmin + 2 * rand);
          if (!A.length) break;
          const a = attr && versuch === 0 && s === 0 ? A.find(x => x.kante === naechsteKante(z, z.attraktor)) || A[rnd.ganz(A.length)] : A[rnd.ganz(A.length)];
          const f = z.rahmen[a.fi], t = f.t, L = rnd.zwischen(lmin, Math.min(lmax, a.u1 - a.u0 - 2 * rand)), r = rnd.zwischen(tmin, tmax);
          let u0 = rnd.zwischen(a.u0 + rand, a.u1 - rand - L);
          if (attr && versuch === 0) u0 = Math.max(a.u0 + rand, Math.min(a.u1 - rand - L, uv(f, z.attraktor)[0] - L / 2));
          const innen = rechteck(f, u0, u0 + L, t, t + r);
          if (bebaut(z, f, u0, u0 + L, a.filter) < 0.97) continue;               // dort ist schon ein Durchgang o. Ä.
          if (ueberdeckung(z, innen) > KLEIN) continue;                           // würde andere Baukörper schneiden
          if (flaeche(schnitt(innen, z.umriss)) < flaeche(innen) - 0.1) continue;  // muss im Umriss liegen
          const g = gesch(z, punktUV(f, u0 + L / 2, t / 2));
          entferne(z, band(f, u0, u0 + L, -1, r), a.filter);
          z.st.push(stueck(z, innen, g, "rand", { kante: a.kante, teil: "k" + a.kante, rahmen: [a.fi] }));
          for (const st of z.st) if (a.filter(st) && clip(st.poly, band(f, u0, u0 + L, -1, t + r + 1)).length) st.markiert = true;
          n++; break;
        }
      }
      z.log.push({ de: `Rücksprünge an Kanten: ${n} von ${p.rkAnzahl}`, en: `Setbacks edges: ${n} of ${p.rkAnzahl}` });
    },

    /** Rücksprünge an Ecken: an der Außenecke ein Stück a × b ausschneiden, wenn die anschließenden Kanten lang genug sind */
    rsEcke(z, p, rnd, attr) {
      const m = m_(z), lo = Math.min(p.reMin, p.reMax), hi = Math.max(p.reMin, p.reMax);
      const kand = [];
      for (let i = 0; i < m; i++) {
        const fv = z.rahmen[(i + m - 1) % m], f = z.rahmen[i];
        if (z.st.some(s => s.ecke === i) && fv.L >= 2 * hi + 6 && f.L >= 2 * hi + 6) kand.push(i);
      }
      const wahl = attr ? kand.slice().sort((i, j) => abstand(z.attraktor, z.umriss[i]) - abstand(z.attraktor, z.umriss[j])).slice(0, p.reAnzahl) : ziehe(rnd, kand, p.reAnzahl);
      let weg = 0;
      for (const i of wahl) {
        const fv = z.rahmen[(i + m - 1) % m], f = z.rahmen[i], a = rnd.zwischen(lo, hi), b = rnd.zwischen(lo, hi);
        weg += entferne(z, [vMax(fv, b), vMax(f, a)], st => st.ecke === i || st.kante === i || st.kante === (i + m - 1) % m);
        for (const st of z.st) if (st.ecke === i) st.markiert = true;
      }
      z.log.push({ de: `Rücksprünge an Ecken: ${wahl.length} Ecke(n), −${fmtM2(weg)} m² BGF`, en: `Setbacks corners: ${wahl.length} corner(s), −${fmtM2(weg)} m² GFA` });
    },

    /** Eckdurchgänge: neben der Ecke einen Durchgang der Breite w schneiden, parallel zur anderen Kante (Richtung: Kante davor, danach, beide) */
    eck(z, p, rnd, attr) {
      const m = m_(z), w = p.ebBreite, t = p.tiefe;
      const kand = []; for (let i = 0; i < m; i++) if (z.st.some(s => s.ecke === i)) kand.push(i);
      const n = p.ebAnzahl > 0 ? Math.min(p.ebAnzahl, kand.length) : kand.length;
      const wahl = attr ? kand.slice().sort((i, j) => abstand(z.attraktor, z.umriss[i]) - abstand(z.attraktor, z.umriss[j])).slice(0, n) : ziehe(rnd, kand, n);
      let weg = 0, k = 0;
      for (const i of wahl) {
        const iv = (i + m - 1) % m, fv = z.rahmen[iv], f = z.rahmen[i];
        const r = p.ebRichtung === "zufall" ? (rnd() < 0.5 ? "davor" : "danach") : p.ebRichtung;
        if (r === "davor" || r === "beide") { const d = entferne(z, [vMin(f, t), vMax(f, t + w)], st => st.kante === iv && st.art !== "hof"); weg += d; if (d > 0) k++; }
        if (r === "danach" || r === "beide") { const d = entferne(z, [vMin(fv, t), vMax(fv, t + w)], st => st.kante === i && st.art !== "hof"); weg += d; if (d > 0) k++; }
        for (const st of z.st) if (st.ecke === i) st.markiert = true;
      }
      z.log.push({ de: `Eckdurchgänge: ${k} Durchgang/-gänge à ${fd(w)} m, −${fmtM2(weg)} m² BGF`, en: `Cornerbreaks: ${k} passage(s) of ${fmt(w)} m, −${fmtM2(weg)} m² GFA` });
    },

    /** Zufallsdurchgänge: Durchgänge durch den Blockrand an zufälligen Stellen (oder am Attraktor), bis die abzuziehende Fläche
        bzw. die Gesamtbreite erreicht ist */
    durch(z, p, rnd, attr) {
      const flaechenModus = p.zdModus === "flaeche";
      const anzahl = flaechenModus ? Infinity : Math.max(1, Math.round(p.zdBreite / p.zdEinzel));
      const w = flaechenModus ? p.zdEinzel : p.zdBreite / anzahl;
      let weg = 0, n = 0;
      for (let versuch = 0; versuch < 80 && n < anzahl && (!flaechenModus || weg < p.zdFlaeche); versuch++) {
        const A = abschnitte(z).filter(a => a.u1 - a.u0 >= w + 4);
        if (!A.length) break;
        let a, u0;
        if (attr && n === 0) {
          a = A.slice().sort((x, y) => distAbschnitt(z, x, z.attraktor) - distAbschnitt(z, y, z.attraktor))[0];
          u0 = Math.max(a.u0 + 2, Math.min(a.u1 - 2 - w, uv(z.rahmen[a.fi], z.attraktor)[0] - w / 2));
        } else {
          const L = A.reduce((s, x) => s + x.u1 - x.u0, 0); let q = rnd() * L; a = A[A.length - 1];
          for (const x of A) { if (q < x.u1 - x.u0) { a = x; break; } q -= x.u1 - x.u0; }
          u0 = rnd.zwischen(a.u0 + 2, a.u1 - 2 - w);
        }
        const f = z.rahmen[a.fi];
        if (bebaut(z, f, u0 - 2, u0 + w + 2, a.filter) < 0.97) continue;    // nicht direkt neben einen anderen Durchgang
        weg += entferne(z, band(f, u0, u0 + w, -1, f.t + 15), a.filter); n++;
      }
      z.log.push({ de: `Zufallsdurchgänge: ${n} à ${fd(w)} m, −${fmtM2(weg)} m² BGF`, en: `Random breaks: ${n} of ${fmt(w)} m, −${fmtM2(weg)} m² GFA` });
    },

    /** Höhe reduzieren: den Block an den Ecken in Fragmente teilen (Flügel, Ecken) und einzelne Fragmente um je ein Geschoss senken,
        bis die abzuziehende Fläche erreicht ist */
    hoehe(z, p, rnd, attr) {
      const teile = () => {
        const T = {};
        for (const st of z.st) if (st.art !== "hof" && st.art !== "turm") (T[st.teil] = T[st.teil] || []).push(st);
        return Object.keys(T).map(k => ({ k, S: T[k], g: Math.max(...T[k].map(s => s.g)), c: schwerpunkt(T[k].reduce((a, s) => flaeche(s.poly) > flaeche(a) ? s.poly : a, T[k][0].poly)) }));
      };
      let weg = 0, n = 0; const getroffen = new Set();
      while (weg < p.rhFlaeche - 1e-9) {
        const K = teile().filter(f => f.g > p.rhMin);
        if (!K.length) break;
        const f = attr ? K.sort((x, y) => abstand(x.c, z.attraktor) - abstand(y.c, z.attraktor))[0] : K[rnd.ganz(K.length)];
        for (const st of f.S) if (st.g > p.rhMin) { st.g--; weg += flaeche(st.poly); st.markiert = true; }
        getroffen.add(f.k); n++;
      }
      z.log.push({ de: `Höhe reduzieren: ${getroffen.size} Fragment(e), ${n}× ein Geschoss, −${fmtM2(weg)} m² BGF`, en: `Reduce height: ${getroffen.size} fragment(s), ${n}× one floor, −${fmtM2(weg)} m² GFA` });
    },

    /** Türme: ein oder zwei Fragmente der Fläche A erhalten Zusatzgeschosse – höchstens so viele, wie die Abstandsflächen-Hüllkurve zulässt */
    turm(z, p, rnd, attr) {
      let n = 0, plus = 0;
      for (let s = 0; s < p.tuAnzahl; s++) {
        for (let versuch = 0; versuch < 30; versuch++) {
          const A = abschnitte(z);
          if (!A.length) break;
          const a = attr && s === 0 && versuch === 0 ? A.slice().sort((x, y) => distAbschnitt(z, x, z.attraktor) - distAbschnitt(z, y, z.attraktor))[0] : A[rnd.ganz(A.length)];
          const f = z.rahmen[a.fi], L = p.tuFlaeche / f.t;
          if (a.u1 - a.u0 < L) continue;
          let u0 = rnd.zwischen(a.u0, a.u1 - L);
          if (attr && s === 0 && versuch === 0) u0 = Math.max(a.u0, Math.min(a.u1 - L, uv(f, z.attraktor)[0] - L / 2));
          if (bebaut(z, f, u0, u0 + L, a.filter) < 0.97) continue;
          const R = rechteck(f, u0, u0 + L, 0, f.t);
          if (z.st.some(st => st.art === "turm" && schnitt(versetze(st.poly, -10), R).length)) continue;   // Abstand zum anderen Turm
          const g0 = gesch(z, punktUV(f, u0 + L / 2, f.t / 2)), Hmax = huellHoehe(z, p, R);
          const e = Math.min(p.tuMax, Math.floor((Hmax - g0 * p.gh) / p.gh + 1e-9));
          if (e < 1) continue;
          teileUnd(z, band(f, u0, u0 + L, -1, f.t + 1), a.filter, k => { k.g = g0 + e; k.art = "turm"; k.dach = []; k.dg = 0; k.hmax = Hmax; });
          n++; plus += e * L * f.t; break;
        }
      }
      z.log.push({ de: `Türme: ${n} von ${p.tuAnzahl}, +${fmtM2(plus)} m² BGF`, en: `Towers: ${n} of ${p.tuAnzahl}, +${fmtM2(plus)} m² GFA` });
    },

    /** Hofgebäude entlang einer Achse (durch den Attraktor oder die Hofmitte; längs oder quer zur längsten Kante); mit „zuschneiden“
        halten sie die Abstandsflächen zum Blockrand ein, sonst schließen sie an ihn an */
    hof(z, p, rnd, attr) {
      if (!z.hof.length) { z.log.push({ de: "Hofgebäude: kein Hof", en: "Yard buildings: no yard" }); return; }
      let li = 0; for (let i = 1; i < z.rahmen.length && i < m_(z); i++) if (z.rahmen[i].L > z.rahmen[li].L) li = i;
      const fl = z.rahmen[li], e = p.hoRichtung === "quer" ? fl.n : fl.e;
      const P = attr && punktInPoly(z.attraktor, z.hof) ? z.attraktor : schwerpunkt(z.hof);
      const d = p.hoTiefe, gMin = Math.min(p.hoGmin, p.hoGmax), gMax = Math.max(p.hoGmin, p.hoGmax);
      let n = 0, zu = 0;
      for (let k = 0; k < p.hoAnzahl; k++) {
        const g = gMin + rnd.ganz(gMax - gMin + 1), Th = abstandsTiefe(g * p.gh, p);
        const vc = (k - (p.hoAnzahl - 1) / 2) * (d + 2 * Th);
        const f = rahmen(add(P, mul([-e[1], e[0]], vc - d / 2)), add(add(P, e), mul([-e[1], e[0]], vc - d / 2)), d);
        const fi = z.rahmen.length;
        const neu = [];
        if (p.hoZuschneiden) {
          const ok = bandIm(z.umriss, f, 0, d); if (!ok) continue;
          const c = Th + z.T, gesperrt = [];
          for (const st of z.st) { const q = clip(versetze(st.poly, -c), [vMin(f, 0), vMax(f, d)]); if (q.length) gesperrt.push(uBereich(f, q)); }
          for (const [u0, u1] of freieAbschnitte(ok[0], ok[1], gesperrt)) if (u1 - u0 >= 10) neu.push(rechteck(f, u0, u1, 0, d));
        } else {
          let teile = [clip(z.umriss, [vMin(f, 0), vMax(f, d)])].filter(q => q.length);
          for (const st of z.st) { const H = halbebenen(st.poly); teile = teile.flatMap(q => schnitt(q, st.poly).length ? ohne(q, H) : [q]); }
          for (const q of teile) if (flaeche(q) >= 6 * d && punktImHof(z, q)) neu.push(q);
        }
        if (neu.length) { z.rahmen.push(f); n++; }
        for (const q of neu) { z.st.push(stueck(z, q, g, "hof", { teil: "h" + k, rahmen: [fi] })); zu += flaeche(q) * g; }
      }
      z.log.push({ de: `Hofgebäude: ${n} Achse(n), +${fmtM2(zu)} m² BGF`, en: `Yard buildings: ${n} axis/axes, +${fmtM2(zu)} m² GFA` });
    },

    /** Dachgeschosse: zurückgesetzte Dachgeschosse auf dem Blockrand; Tiefe, Ausrichtung (zur Straße/zum Hof bündig) und Anteil */
    dach(z, p, rnd, attr) {
      const kand = {};
      for (const st of z.st) if ((st.art === "rand" || st.art === "ecke" || st.art === "zeile") && !st.dach.length) (kand[st.teil] = kand[st.teil] || []).push(st);
      let K = Object.keys(kand).map(k => ({ k, S: kand[k], a: kand[k].reduce((s, x) => s + flaeche(x.poly), 0), c: schwerpunkt(kand[k][0].poly) }));
      const ziel = K.reduce((s, x) => s + x.a, 0) * p.daAnteil / 100;
      K = attr ? K.sort((x, y) => abstand(x.c, z.attraktor) - abstand(y.c, z.attraktor)) : ziehe(rnd, K, K.length);
      let a = 0, zu = 0;
      for (const fr of K) {
        if (a >= ziel - 1e-9) break;
        for (const st of fr.S) { st.dach = dachFlaeche(z, p, st); st.dg = st.dach.length ? 1 : 0; st.markiert = "dach"; zu += st.dach.reduce((s, d) => s + flaeche(d), 0); }
        a += fr.a;
      }
      z.log.push({ de: `Dachgeschosse: ${Math.round(a / Math.max(1, K.reduce((s, x) => s + x.a, 0)) * 100)} % des Blockrands, +${fmtM2(zu)} m² BGF`, en: `Rooftops: ${Math.round(a / Math.max(1, K.reduce((s, x) => s + x.a, 0)) * 100)} % of the perimeter, +${fmtM2(zu)} m² GFA` });
    }
  };

  /** Abstand des Attraktors zu einem Abschnitt (Mittellinie des Bands) */
  function distAbschnitt(z, a, q) { const f = z.rahmen[a.fi]; return abstandSegment(q, punktUV(f, a.u0, f.t / 2), punktUV(f, a.u1, f.t / 2)).d; }
  function naechsteCK(z, q) { let b = 0, bd = Infinity; z.ck.forEach((k, i) => { const d = abstandSegment(q, k.a, k.b).d; if (d < bd) { bd = d; b = i; } }); return b; }
  /** liegt das Teil (überwiegend) im Hof? – verhindert Hofgebäude außerhalb des Blocks bei offenen Blöcken nicht, nur Reste an der Grenze */
  function punktImHof(z, q) { return punktInPoly(schwerpunkt(q), z.umriss); }

  /** Fläche des Dachgeschosses über einem Baukörper: bündig zum Hof (Terrasse zur Straße) oder bündig zur Straße (Terrasse zum Hof) */
  function dachFlaeche(z, p, st) {
    const dd = p.daTiefe, hof = p.daAusrichtung === "hof";
    if (st.rahmen.length === 2) {          // Ecke: zwei Kanten
      const [f1, f2] = st.rahmen.map(i => z.rahmen[i]), t = p.tiefe;
      if (hof) return [clip(st.poly, [vMin(f1, t - dd), vMin(f2, t - dd)])].filter(q => q.length);
      return ohne(st.poly, [vMin(f1, dd), vMin(f2, dd)]);
    }
    const f = z.rahmen[st.rahmen[0]], [v0, v1] = vBereich(f, st.poly);
    if (v1 - v0 <= dd + 0.5) return [st.poly];
    return [clip(st.poly, hof ? [vMin(f, v1 - dd)] : [vMax(f, v0 + dd)])].filter(q => q.length);
  }

  /** Höhengrenze aus den Abstandsflächen (vereinfachte Hüllkurve): je Grundstückskante H ≤ (freier Abstand + ggf. halbe Straße) / Faktor;
      an einer Baulinie keine Grenze. Freier Abstand = kleinster Abstand der Grundfläche zur Kante. */
  function huellHoehe(z, p, poly) {
    const s = standort(p); let H = Infinity;
    z.plotF.forEach((f, j) => {
      const art = z.arten[j]; if (art === "baulinie") return;
      let d = Infinity; for (const x of poly) d = Math.min(d, uv(f, x)[1]);
      d += art === "strasse" ? p.strasse / 2 : 0;
      H = Math.min(H, d + 1e-9 < s.min ? 0 : d / s.f);
    });
    return H;
  }

  /* ---------------------------------------------------------------- Kennzahlen (Definitionen wie BauNVO §§ 19, 20 und Toolbox docs/zoning.md) */
  function messe(z, p) {
    const A = flaeche(z.plot), GR = grundflaeche(z);
    let B = 0, Bvoll = 0, gmin = Infinity, gmax = 0;
    for (const st of z.st) {
      const a = flaeche(st.poly), ad = st.dach.reduce((s, d) => s + flaeche(d), 0) * st.dg;
      B += a * st.g + ad;
      Bvoll += a * st.g + (ad >= 2 / 3 * a - 1e-9 ? ad : 0);    // Dachgeschoss ist Vollgeschoss, wenn es ≥ 2/3 des Geschosses darunter deckt
      gmin = Math.min(gmin, st.g); gmax = Math.max(gmax, st.g + (st.dg && st.dach.length ? st.dg : 0));
    }
    const teile = new Set(z.st.map(s => s.teil));
    z.kz = { A, GR, BGF: B, BGFvoll: Bvoll, GRZ: GR / A, GFZ: Bvoll / A, gmin: z.st.length ? gmin : 0, gmax, teile: teile.size, stuecke: z.st.length };
    return z.kz;
  }

  /* ---------------------------------------------------------------- Ablauf */
  /** Ein Schritt: die nächste Aktion der Folge; nach der letzten Aktion beginnt die nächste Variante (neue Saaten) mit der Grundform */
  function schritt(z, param) {
    const p = Object.assign({}, STANDARD, param);
    if (fertig(z, p)) return z;
    const { v, k } = lage(z, p);
    if (k < proVariante(p) - 1) { z.t++; z.k = k + 1; schrittAus(z, p, k + 1); messe(z, p); }
    else { z.varianten = z.varianten.filter(r => r.v !== v).concat([kurz(z)]).sort((a, b) => a.v - b.v); z.vBis = Math.max(z.vBis || 0, v + 1); z.t++; aufbau(z, p, v + 1, 0); }
    return z;
  }
  /** zu einer schon erzeugten Variante v springen (fertig, mit allen Aktionen) */
  function zeigeVariante(z, p, v) { p = Object.assign({}, STANDARD, p); z.v = Math.min(v, anzahlVarianten(p) - 1); z.k = proVariante(p) - 1; baue(z, p); }
  /** Parameter übernehmen: Zustand bis zum aktuellen Schritt neu aufbauen */
  const NUR_ANSICHT = ["drehung", "neigung", "vorlage", "zeigeAbstand", "zeigeZahlen"];
  function aendere(z, param, id) { if (!NUR_ANSICHT.includes(id)) baue(z, param); }

  /* ---------------------------------------------------------------- Bearbeiten (Maus) */
  /** Grundstücksecke verschieben – nur, wenn das Grundstück konvex bleibt und keine Kante kürzer als 10 m wird */
  function verschiebeEcke(z, p, i, q) {
    const P = z.plot.map(x => x.slice()); P[i] = [q[0], q[1]];
    if (!istKonvex(P) || flaecheS(P) <= 0) return false;
    for (let j = 0; j < P.length; j++) if (abstand(P[j], P[(j + 1) % P.length]) < 10) return false;
    z.plot = P; baue(z, p); return true;
  }
  /** Art einer Grundstückskante weiterschalten: Straße → Nachbar → Baulinie */
  function wechsleKante(z, p, j) { z.arten[j] = KANTENARTEN[(KANTENARTEN.indexOf(z.arten[j]) + 1) % KANTENARTEN.length]; baue(z, p); }
  function setzeAttraktor(z, p, q) { z.attraktor = [q[0], q[1]]; baue(z, p); }

  return {
    STANDARD, LAENDER, GEBIETE, GRUNDSTUECKE, KANTENARTEN, AKTIONEN, SLOTS,
    erzeuge, schritt, aendere, baue, aufbau, fertig, folge, lage, proVariante, zeigeVariante, messe,
    standort, abstandsTiefe, randAbstand, versetzeGrundstueck, ring, charakteristischeKanten, huellHoehe, dachFlaeche,
    clip, ohne, schnitt, halbebenen, rahmen, uv, punktUV, uMin, uMax, vMin, vMax, uBereich, band, rechteck, bandIm, freieAbschnitte, teileAbschnitt, istKonvex, zufallAus, mische,
    grundflaeche, bgf, verschiebeEcke, wechsleKante, setzeAttraktor, TUN
  };
});
