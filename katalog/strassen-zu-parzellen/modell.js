/* Vom Straßennetz zu Grundstücken · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Streets to Plots“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie die Schaltung der .gh-Datei: Straßen → Network to Segments (an Kreuzungen geteilt) → Plot Division wahlweise
   „DeCodingSpaces (fast)“ (Polygons from lines: geschlossene Flächen des Liniennetzes, Endpunkte müssen exakt zusammenfallen)
   oder „GH Split Surface (slow, maybe more accurate)“ (Fläche geometrisch mit allen Straßen geteilt, mit Toleranz) → je Plot
   Polygon Center → Mesh | Ray auf das Gelände → Normale (Brep Closest Point) → Angle zur Senkrechten = Neigung (CellSlope) →
   Bounds/Remap auf 0…1 → Smaller Than WeightSlope → Cull Pattern: zu steile Plots fallen heraus → Bake.
   Ein Schritt = ein Plot, dessen Neigung bestimmt wird. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";
  const { sub, add, mul, kreuz, norm, abstand } = Geo;

  /** Voreinstellungen der .gh-Datei: methode = Wertliste „Plot Division“ (DeCodingSpaces (fast)), weightSlope = WeightSlope 1 [0..1].
      Ergänzt: toleranz (Toleranz der Flächenteilung, entspricht der Dokumenttoleranz in Rhino), luecken (Anteil ungenauer
      Anschlüsse in der Beispielszene), Darstellung. */
  const STANDARD = { methode: "dcs", toleranz: 1.5, weightSlope: 1, luecken: 0.05, faerbung: "neigung", hoehenlinien: 10, zeigeLuecken: true };
  const GROESSE = 1000;
  const EXAKT = 0.01;                       // Endpunkte näher als 1 cm sind derselbe Knoten (Polygons from lines)

  /* ---------------------------------------------------------------- Szene */
  /** Gelände (Szenen.gelaende, 1 km²) mit einem Straßennetz darauf (Szenen.stadt ohne Gebäude, verzogenes Raster 18 × 18),
      Umriss unregelmäßig rund – Straßen, die über den Umriss hinausragen, bleiben als Stiche wie im Katalogbild.
      Ein Anteil luecken der Straßen endet 0,3…1,2 m vor der Kreuzung (ungenau gezeichnete Anschlüsse).
      → {G, strassen: [[p, q]], luecken: [[x, y]] (Stellen der Lücken), b, h} */
  function szene(zufall, p) {
    const G = Szenen.gelaende(zufall, { n: 101, groesse: GROESSE });
    const st = Szenen.stadt(zufall, { b: 860, h: 860, nx: 18, ny: 18, rand: 0, jitter: 0.32, zusammen: 0.2, platz: false, kirche: false, gebaeude: false });
    const v = [70, 70], c = [500, 500], R = 370, f1 = zufall() * 6.283, f2 = zufall() * 6.283;
    const innen = q => { const d = sub(q, c), w = Math.atan2(d[1], d[0]); return Geo.laenge(d) < R * (1 + 0.16 * Math.sin(2 * w + f1) + 0.09 * Math.sin(3 * w + f2)); };
    let S = st.strassen.map(s => [add(s[0], v), add(s[1], v)]).filter(s => innen(Geo.lerp(s[0], s[1], 0.5)));
    // Grad der Endpunkte, damit Lücken nur an echten Kreuzungen entstehen
    const N = Geo.netz(S, EXAKT), grad = new Int32Array(N.knoten.length);
    N.kanten.forEach(e => { grad[e.a]++; grad[e.b]++; });
    const knotenVon = q => N.knoten.findIndex(k => abstand(k, q) <= EXAKT);
    const luecken = [];
    S = S.map(s => {
      if (zufall() >= p.luecken) return s;
      const ende = zufall() < 0.5 ? 0 : 1, q = s[ende], o = s[1 - ende];
      if (grad[knotenVon(q)] < 3 || abstand(q, o) < 20) return s;
      const g = 0.3 + zufall() * 0.9, neu = add(q, mul(norm(sub(o, q)), g));
      luecken.push(q);
      return ende === 0 ? [neu, o] : [o, neu];
    });
    return { G, strassen: S, luecken, b: GROESSE, h: GROESSE };
  }

  /* ---------------------------------------------------------------- Network to Segments */
  /** Strecken an allen Schnitt- und Berührpunkten teilen (Split = true): Kreuzungen und T-Stöße (Endpunkt auf einer anderen Strecke) */
  function teileAnSchnitten(S, eps = 1e-9) {
    const T = S.map(() => []), bb = S.map(s => [Math.min(s[0][0], s[1][0]), Math.min(s[0][1], s[1][1]), Math.max(s[0][0], s[1][0]), Math.max(s[0][1], s[1][1])]);
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const A = bb[i], C = bb[j];
      if (A[0] > C[2] + 1e-6 || C[0] > A[2] + 1e-6 || A[1] > C[3] + 1e-6 || C[1] > A[3] + 1e-6) continue;
      const a = S[i][0], r = sub(S[i][1], a), c = S[j][0], s = sub(S[j][1], c), den = kreuz(r, s);
      if (Math.abs(den) < 1e-12) continue;
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
  /** offene Enden (Endpunkte, an denen keine andere Strecke anschließt) um tol verlängern, damit knapp verfehlte Anschlüsse
      die Nachbarstraße noch treffen; Enden an Kreuzungen und Knicken bleiben, wo sie sind */
  function verlaengere(S, tol) {
    const N = Geo.netz(S, EXAKT), grad = new Int32Array(N.knoten.length);
    N.kanten.forEach(e => { grad[e.a]++; grad[e.b]++; });
    const offen = new Set(); N.knoten.forEach((q, v) => { if (grad[v] === 1) offen.add(Math.round(q[0] / EXAKT) + "," + Math.round(q[1] / EXAKT)); });
    const istOffen = q => offen.has(Math.round(q[0] / EXAKT) + "," + Math.round(q[1] / EXAKT));
    return S.map(s => {
      const d = norm(sub(s[1], s[0]));
      return [istOffen(s[0]) ? sub(s[0], mul(d, tol)) : s[0], istOffen(s[1]) ? add(s[1], mul(d, tol)) : s[1]];
    });
  }

  /* ---------------------------------------------------------------- Polygons from lines */
  /** Geschlossene Flächen eines ebenen Liniennetzes N = {knoten, kanten: [{a, b}]}: Sackgassen werden wiederholt abgeschnitten,
      dann läuft man über Halbkanten und biegt an jedem Knoten in die nächste Kante im Uhrzeigersinn ab (kleinster Zyklus links
      der Laufrichtung). Begrenzte Flächen haben positive Fläche (Geo.flaecheS), der Außenrand jedes Netzteils negative – er entfällt.
      Doppelt durchlaufene Brücken werden aus dem Zyklus genommen. → [{poly, kanten}] */
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

  /* ---------------------------------------------------------------- Plot Division */
  /** „DeCodingSpaces (fast)“: Polygons from lines auf den geteilten Segmenten; nur exakt gemeinsame Endpunkte verbinden. */
  function teilungDCS(segmente) { const N = Geo.netz(segmente, EXAKT); return { N, plots: flaechenAusLinien(N) }; }
  /** „GH Split Surface (slow, maybe more accurate)“: die Fläche wird geometrisch mit allen Straßen geteilt. Nachgebildet als
      Anordnung aller um die Toleranz verlängerten Straßen: alle Schnitte werden gesucht und die Straßen dort geteilt, dann die
      Flächen der Anordnung; die überstehenden Enden sind Sackgassen und fallen weg. Knapp verfehlte Anschlüsse (Lücke < Toleranz)
      treffen so die Nachbarstraße und trennen zwei Plots. */
  function teilungSplit(segmente, tol) {
    const N = Geo.netz(teileAnSchnitten(verlaengere(segmente, Math.max(0, tol))), EXAKT);
    return { N, plots: flaechenAusLinien(N) };
  }
  /** offene Anschlüsse: Sackgassen-Enden, die näher als tol an einer anderen Straße liegen (zeichnerische Lücken) */
  function offeneAnschluesse(N, tol) {
    const grad = new Int32Array(N.knoten.length); N.kanten.forEach(e => { grad[e.a]++; grad[e.b]++; });
    const out = [];
    N.knoten.forEach((q, v) => {
      if (grad[v] !== 1) return;
      let d = Infinity;
      for (const e of N.kanten) if (e.a !== v && e.b !== v) d = Math.min(d, Geo.abstandSegment(q, N.knoten[e.a], N.knoten[e.b]).d);
      if (d < tol) out.push(q);
    });
    return out;
  }

  /* ---------------------------------------------------------------- Neigung */
  /** Polygon Center, Center(V): Mittel der Eckpunkte */
  function mittelpunkt(poly) { let x = 0, y = 0; for (const q of poly) { x += q[0]; y += q[1]; } return [x / poly.length, y / poly.length]; }
  /** Neigung eines Plots in Grad: Mittelpunkt 500 m unter das Gelände (Move, Unit Z −500), Strahl nach oben (Mesh | Ray),
      Normale am Treffpunkt (Brep Closest Point), Angle zur Senkrechten (Unit Z) = atan |∇h| */
  function plotNeigung(G, poly) { const c = mittelpunkt(poly); return Szenen.neigung(G, c[0], c[1]); }
  /** Bounds → Remap Numbers (Ziel 0…1) → Smaller Than WeightSlope → Cull Pattern. Nur schon bestimmte Neigungen (n ≤ Anzahl).
      → {wert: Float64Array (0…1), behalten: Uint8Array, lo, hi} */
  function filtere(neigung, n, gewicht) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) { if (neigung[i] < lo) lo = neigung[i]; if (neigung[i] > hi) hi = neigung[i]; }
    const wert = new Float64Array(n), behalten = new Uint8Array(n);
    for (let i = 0; i < n; i++) { wert[i] = hi - lo > 1e-12 ? (neigung[i] - lo) / (hi - lo) : 0; behalten[i] = wert[i] < gewicht ? 1 : 0; }
    return { wert, behalten, lo, hi };
  }

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  function teile(z, p) {
    const T = p.methode === "split" ? teilungSplit(z.segmente, p.toleranz) : teilungDCS(z.segmente);
    z.N = T.N; z.plots = T.plots;
    z.offen = offeneAnschluesse(teilungDCS(z.segmente).N, p.toleranz);
    leere(z, p);
  }
  function leere(z, p) { z.k = 0; z.t = 0; z.neigung = new Float64Array(z.plots.length); z.wahl = -1; z.F = filtere(z.neigung, 0, p.weightSlope); }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const S = szene(zufall, p);
    const z = { t: 0, S, G: S.G, b: S.b, h: S.h, segmente: teileAnSchnitten(S.strassen) };
    teile(z, p);
    return z;
  }

  /** Ein Schritt: die Neigung des nächsten Plots wird bestimmt, danach wird mit allen bisher bestimmten neu gefiltert */
  function schritt(z, p) {
    if (z.k < z.plots.length) { z.neigung[z.k] = plotNeigung(z.G, z.plots[z.k].poly); z.k++; z.F = filtere(z.neigung, z.k, p.weightSlope); }
    z.t++;
    return z;
  }
  const fertig = z => z.k >= z.plots.length;
  function rechneAlles(z, p) {
    for (let i = 0; i < z.plots.length; i++) z.neigung[i] = plotNeigung(z.G, z.plots[i].poly);
    z.k = z.plots.length; z.t = Math.max(z.t, z.k); z.F = filtere(z.neigung, z.k, p.weightSlope);
  }

  /** Parameter ohne Neustart: Methode und Toleranz teilen neu (war der Lauf begonnen, wird gleich ganz gerechnet), WeightSlope filtert neu */
  function aendere(z, p, id) {
    if (id === "methode" || id === "toleranz") { const lief = z.t > 0; teile(z, p); if (lief) rechneAlles(z, p); }
    else if (id === "weightSlope") z.F = filtere(z.neigung, z.k, p.weightSlope);
  }

  function plotBei(z, q) { return z.plots.findIndex(P => Geo.punktInPoly(q, P.poly)); }

  /** Bilanz: Anzahl und Fläche der behaltenen und aussortierten Plots, Neigungsbereich */
  function bilanz(z) {
    let nb = 0, na = 0, fb = 0, fa = 0, maxB = -Infinity, minA = Infinity;
    for (let i = 0; i < z.k; i++) {
      const f = Geo.flaeche(z.plots[i].poly);
      if (z.F.behalten[i]) { nb++; fb += f; maxB = Math.max(maxB, z.neigung[i]); } else { na++; fa += f; minA = Math.min(minA, z.neigung[i]); }
    }
    return { plots: z.plots.length, fertig: z.k, behalten: nb, aussortiert: na, flaecheBehalten: fb, flaecheAussortiert: fa, lo: z.F.lo, hi: z.F.hi, maxBehalten: maxB, minAussortiert: minA };
  }
  /** behaltene Plots als GeoJSON (entspricht „Bake“ auf die Ebene „Plots“); Meter, y nach unten wie in der Zeichnung */
  function geojson(z) {
    const features = [];
    for (let i = 0; i < z.k; i++) if (z.F.behalten[i]) {
      const r = z.plots[i].poly.map(q => [Math.round(q[0] * 100) / 100, Math.round(q[1] * 100) / 100]);
      features.push({ type: "Feature", properties: { layer: "Plots", neigung_grad: Math.round(z.neigung[i] * 100) / 100, flaeche_m2: Math.round(Geo.flaeche(z.plots[i].poly)) },
                      geometry: { type: "Polygon", coordinates: [r.concat([r[0]])] } });
    }
    return { type: "FeatureCollection", features };
  }

  return { STANDARD, szene, teileAnSchnitten, verlaengere, flaechenAusLinien, teilungDCS, teilungSplit, offeneAnschluesse,
           mittelpunkt, plotNeigung, filtere, teile, leere, erzeuge, schritt, fertig, rechneAlles, aendere, plotBei, bilanz, geojson };
});
