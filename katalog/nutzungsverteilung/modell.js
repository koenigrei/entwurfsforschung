/* Nutzungsverteilung · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Land Use Distribution“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Reinhard König, Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie die Schaltung der .gh-Datei (Komponenten und C#-Skripte in Klammern):
   1. Straßennetz → dualer Graph (1. ProcessGeometry, 2. BuildGraph mit Length/Angular Coefficient und Straßenhierarchie als
      Additional Edge Weight); jede Parzelle gehört zum Straßensegment, dessen Mitte ihrem Schwerpunkt am nächsten liegt
      (Closest Point). Closeness und Betweenness der Segmente (4. FWGetPaths, Origins = Destinations = Segmente der Parzellen)
      werden je Parzelle abgelesen, die Betweenness logarithmiert, beide auf 0…1 gebracht (Weight Criteria).
   2. Gewichtete Werte je Profil und Parzelle: Mittel über die Kriterien von Gewicht × Kriterium (C# „weightedValues“ → Average),
      gemeinsam auf 0…1 gebracht (Remap mit flachen Bounds). Erste Verteilung: je Profil eine Einheit auf der besten Parzelle.
   3. Abstände Parzelle–Parzelle (Luftlinie zwischen den Segmentmitten oder Netzdistanz), auf 0…1 normiert, durch die
      Wahrnehmungsfunktion (Perceived Distance: Linear/Exponential, Close/Far, Falloff Value, Exponent).
   4. Je Iteration (Loop Start/End): Attraktivität jeder Parzelle für jedes Profil aus Beziehung × gewichtetem Wert × wahrgenommener
      Nähe × aktueller Verteilung (C# „Attractivity“-Baum {Plot From, Plot To, Profile From, Profile To} und Summenskript), normiert;
      volle Parzellen (maxDensity) erhalten 0; dann setzt ein Glücksrad (roulette wheel) je Profil maxPop / Iterations neue Einheiten.
   Ein Schritt = eine Iteration. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen,
                   node ? require("../../simulationen/_gemeinsam/zufall.js") : wurzel.Zufall);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen, Zufall) {
  "use strict";

  /** Drei Profile wie die Panels der .gh-Datei (Profile Settings: Name, Max Population) */
  const PROFILE = ["R", "C", "I"];
  const NAMEN = [{ de: "Wohnen", en: "Residential" }, { de: "Gewerbe", en: "Commercial" }, { de: "Industrie", en: "Industry" }];
  /** Kriterien (Weight Criteria): Centrality (Closeness), Accessibility (Betweeness), „additionally i.e. Flat Area (Slope)“ */
  const KRITERIEN = [{ de: "Zentralität (Closeness)", en: "Centrality (closeness)" }, { de: "Erreichbarkeit (Betweenness)", en: "Accessibility (betweenness)" },
                     { de: "Flache Lage (Slope)", en: "Flat area (slope)" }];

  /** Voreinstellungen der .gh-Datei:
      popR/popC/popI: Max Population 10000/5000/5000 (Panels „Residential“, „Commercial“, „Industry“)
      wR0, wR1 …: Criteria Weights (Prefer > 0, Avoid < 0): Residential 0.5/−0.25, Commercial 1/1, Industry −1/1; Flat Area 0 (nur als Hinweis in der Datei)
      m: Gewichtsmatrix Nutzung × Nutzung = Relations „To Residential/To Commercial/To Industry“ zeilenweise als Text
         (Zeile = Nutzung, Spalte = Bezug): Residential 1/0.5/−0.75, Commercial 0.5/0.5/0.25, Industry −0.5/0/1
      funktion: Perceived Distance Function Exponential [Linear, Exponential] · wichtig: Distance Importance Close [Close, Far]
      falloff: Falloff Value 1 [0..1] · exponent: Exponent 2 [2..6]
      iterationen: Iterations 30 [0..1000] · leer: Percent Cells not filled 0.3 [0..1] · det: deterministic false (Toggle)
      kL, kW: Length/Angular Coefficient 0.5 [0..1] · kH: Hierarchy Weighting 0.5 [0..1] · variante: Simplified Direct Distance
      radius: Radius Factor 0.5 [0..1] (Darstellung der Kreisdiagramme) · darstellung: Visualisation · profil: Proifle 0 [0..2] */
  const STANDARD = {
    popR: 10000, popC: 5000, popI: 5000,
    wR0: 0.5, wR1: -0.25, wR2: 0, wC0: 1, wC1: 1, wC2: 0, wI0: -1, wI1: 1, wI2: 0,
    m: "1,0.5,-0.75,0.5,0.5,0.25,-0.5,0,1",
    funktion: "exponential", wichtig: "close", falloff: 1, exponent: 2,
    iterationen: 30, leer: 0.3, det: false,
    kL: 0.5, kW: 0.5, kH: 0.5, variante: "direkt",
    radius: 0.5, darstellung: "verteilung", profil: 0, diagramme: true, gelaende: true
  };
  const STANDARD_M = STANDARD.m;
  /** Parameter, die nur die Darstellung betreffen (ohne Neuberechnung) */
  const DARSTELLUNG = new Set(["radius", "darstellung", "profil", "diagramme", "gelaende"]);

  /** Gewichtsmatrix der Relations (Zeile = Nutzung, Spalte = Bezug) aus dem Text der Adresse („1,0.5,-0.75,…“):
      neun Zahlen, auf −1…1 begrenzt und auf 0.05 gerundet; fehlende oder ungültige Einträge nehmen den Wert des Originals. */
  const RASTER_MATRIX = 0.05;
  function matrixAusText(s) {
    const roh = String(s == null ? "" : s).split(","), std = String(STANDARD_M).split(",").map(Number);
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let k = 0; k < 9; k++) {
      const v = roh[k] != null && roh[k].trim() !== "" ? Number(roh[k]) : NaN;
      M[Math.floor(k / 3)][k % 3] = Number.isFinite(v) ? rundeMatrix(v) : std[k];
    }
    return M;
  }
  /** Matrix → kompakter Text für die Adresse (ohne überflüssige Nullen) */
  const matrixAlsText = M => M.flat().map(v => String(rundeMatrix(v))).join(",");
  function rundeMatrix(v) { const r = Math.round(Math.max(-1, Math.min(1, v)) / RASTER_MATRIX) * RASTER_MATRIX; return Math.round(r * 100) / 100 || 0; }
  /** Matrix mit einem geänderten Eintrag (Zeile i, Spalte n) als Text */
  function setzeMatrix(s, i, n, v) { const M = matrixAusText(s); M[i][n] = rundeMatrix(Number(v) || 0); return matrixAlsText(M); }

  /** Profile aus den Parametern → {maxPop[3], w[3][3] (Profil × Kriterium), rel[3][3] (Profil → Profil, aus der Matrix)} */
  function profile(p) {
    return {
      maxPop: PROFILE.map(a => Math.max(0, Number(p["pop" + a]) || 0)),
      w: PROFILE.map(a => [0, 1, 2].map(c => Number(p["w" + a + c]) || 0)),
      rel: matrixAusText(p.m)
    };
  }

  /* ------------------------------------------------------------------ Szene */
  /** Beispielstadt: verzogenes Straßenraster (Szenen.stadt), Blöcke = Parzellen (wie „Polygons from lines“ aus den Straßen),
      Hauptstraßen (Hierarchie 1) = Rand, mittlere Zeile und mittlere Spalte des Rasters, sonst Hierarchie 2; dazu ein Gelände.
      → {b, h, szene, strassen, hierarchie, parzellen: [poly], G (Gelände)} */
  function szene(zufall, opt = {}) {
    const o = Object.assign({ b: 960, h: 680, nx: 16, ny: 12, rand: 24, jitter: 0.26, zusammen: 0.2, strasse: 9, platz: true, kirche: false, gebaeude: false }, opt);
    const S = Szenen.stadt(zufall, o);
    const K = S.knoten, schluessel = q => q[0].toFixed(6) + "," + q[1].toFixed(6), ij = new Map();
    K.forEach((q, k) => ij.set(schluessel(q), [k % o.nx, Math.floor(k / o.nx)]));
    const mi = Math.floor(o.nx / 2), mj = Math.floor(o.ny / 2);
    const hierarchie = S.strassen.map(([a, b]) => {
      const A = ij.get(schluessel(a)), B = ij.get(schluessel(b));
      if (!A || !B) return 2;
      const gleichI = A[0] === B[0], gleichJ = A[1] === B[1];
      if (gleichJ && (A[1] === 0 || A[1] === o.ny - 1 || A[1] === mj)) return 1;
      if (gleichI && (A[0] === 0 || A[0] === o.nx - 1 || A[0] === mi)) return 1;
      return 2;
    });
    const G = Szenen.glaette(Szenen.gelaende(zufall, { n: 81, groesse: Math.max(o.b, o.h), hoehe: 70, rauh: 0.3 }), 2);
    const parzellen = S.bloecke.filter(q => Geo.flaeche(q) > 1);
    return { b: o.b, h: o.h, szene: S, strassen: S.strassen, hierarchie, parzellen, G };
  }

  /* ------------------------------------------------------------------ 1. Netz und Kennwerte */
  /** Netz und dualer Graph. Kosten eines Übergangs i → j: Geo.segmentGraph (kL · Länge + kW · Winkel) plus
      kH · (h_i + h_j) / 2 mit der Hierarchiestufe h als Additional Edge Weight. → {N, G, hier: Float64Array, adj} */
  function netzGraph(strassen, hierarchie, p) {
    const N = Geo.netz(strassen, 0.01);
    // Hierarchie je Netzkante (Geo.netz kann Segmente zusammenführen; Zuordnung über die Endpunkte)
    const hier = new Float64Array(N.kanten.length).fill(2), idx = new Map();
    const k = (q) => q[0].toFixed(3) + "," + q[1].toFixed(3);
    strassen.forEach((s, i) => { idx.set(k(s[0]) + "|" + k(s[1]), hierarchie[i]); idx.set(k(s[1]) + "|" + k(s[0]), hierarchie[i]); });
    N.kanten.forEach((e, i) => { const h = idx.get(k(N.knoten[e.a]) + "|" + k(N.knoten[e.b])); if (h != null) hier[i] = h; });
    const G = Geo.segmentGraph(N, p.kL, p.kW);
    const adj = G.adj.map((L, i) => L.map(([j, c]) => [j, c + p.kH * (hier[i] + hier[j]) / 2]));
    return { N, G, hier, adj };
  }

  /** Straßensegment je Parzelle: Segment, dessen Mitte dem Schwerpunkt am nächsten liegt (Closest Point, Cloud = Curve Middle) */
  function segmentJeParzelle(mitten, schwerpunkte) {
    return schwerpunkte.map(q => {
      let best = -1, bd = Infinity;
      mitten.forEach((m, k) => { const d = Geo.abstand(m, q); if (d < bd) { bd = d; best = k; } });
      return best;
    });
  }

  /** Closeness und Betweenness je Segment (FWGetPaths, Origins = Destinations = Segment je Parzelle, Mehrfachnennung zählt):
      Closeness = n / Σ_d c(o, d) über alle n Ziele (Legacy-Definition n/Σd), Betweenness nach Brandes (Geo.betweennessVon) mit
      Ursprungs- und Zielgewicht = Anzahl Parzellen am Segment, Start- und Zielsegment zählen mit (Legacy: „both endpoints count“).
      → {cc, bc, kosten: Map Segment → Float64Array der Kosten zu allen Segmenten} */
  function netzKennwerte(n, adj, seg) {
    const cnt = new Float64Array(n); for (const s of seg) if (s >= 0) cnt[s]++;
    const ziele = seg.length, cc = new Float64Array(n), bc = new Float64Array(n), kosten = new Map();
    for (let s = 0; s < n; s++) {
      if (!cnt[s]) continue;
      const dist = Geo.betweennessVon(n, i => adj[i], s, cnt, cnt, bc);
      kosten.set(s, dist);
      let sum = 0;
      for (let t = 0; t < n; t++) {
        if (!cnt[t] || dist[t] === Infinity) continue;
        sum += cnt[t] * dist[t];
        if (t !== s) { bc[s] += cnt[s] * cnt[t]; bc[t] += cnt[s] * cnt[t]; }
      }
      cc[s] = sum > 0 ? ziele / sum : 0;
    }
    return { cc, bc, kosten };
  }

  /** Remap Numbers mit Bounds: Liste auf 0…1 (ohne Spannweite: alles 0) */
  function remap(L) {
    let mn = Infinity, mx = -Infinity;
    for (const v of L) { if (v < mn) mn = v; if (v > mx) mx = v; }
    const sp = mx - mn;
    return Float64Array.from(L, v => sp > 1e-15 ? (v - mn) / sp : 0);
  }

  /** Kriterienwerte je Parzelle (Weight Criteria): [Closeness, log(Betweenness), Flache Lage], je auf 0…1.
      Betweenness 0 (Logarithmus undefiniert) erhält den kleinsten Wert. Flache Lage = 1 − Neigung (auf 0…1). */
  function kriterien(K, seg, neigung) {
    const C = seg.map(s => K.cc[s]);
    const lg = seg.map(s => K.bc[s] > 0 ? Math.log(K.bc[s]) : NaN);
    const mn = Math.min(...lg.filter(Number.isFinite).concat([0]));
    const B = lg.map(v => Number.isFinite(v) ? v : mn);
    const flach = remap(neigung).map(v => 1 - v);
    return [remap(C), remap(B), Float64Array.from(flach)];
  }

  /* ------------------------------------------------------------------ 2. Gewichtete Werte und erste Verteilung */
  /** C# „weightedValues“ je Kriterium c: A{i, j} = w[i][c] · V[c][j]; Average über die Kriterien (gleiche Pfade {i, j});
      Shift Paths → je Profil i eine Liste über die Parzellen; Remap mit flachen Bounds (gemeinsam über alle Profile) auf 0…1.
      → W[i] = Float64Array (Parzellen) */
  function gewichteteWerte(V, w) {
    const nP = V[0].length, C = V.length;
    const mittel = w.map(wi => { const a = new Float64Array(nP); for (let c = 0; c < C; c++) for (let j = 0; j < nP; j++) a[j] += wi[c] * V[c][j] / C; return a; });
    let mn = Infinity, mx = -Infinity;
    for (const a of mittel) for (const v of a) { if (v < mn) mn = v; if (v > mx) mx = v; }
    const sp = mx - mn;
    return mittel.map(a => Float64Array.from(a, v => sp > 1e-15 ? (v - mn) / sp : 0));
  }
  /** First Profile Distribution: Equality(Weights, Bounds.End je Profil) → 1 auf der (den) besten Parzelle(n), sonst 0 */
  function ersteVerteilung(W) {
    return W.map(a => { let mx = -Infinity; for (const v of a) if (v > mx) mx = v; return Int32Array.from(a, v => v === mx ? 1 : 0); });
  }

  /* ------------------------------------------------------------------ 3. Abstände und Wahrnehmung */
  /** Abstände Parzelle–Parzelle: „direkt“ = Luftlinie zwischen den Mitten der Segmente (Simplified Direct Distance),
      „netz“ = Kosten des kürzesten Wegs zwischen den Segmenten (Precise Distance); gleiche Segmente: 0.
      Remap mit flachen Bounds (Minimum 0 auf der Diagonale) → Float64Array nP·nP in 0…1 */
  function distanzen(seg, mitten, kosten, variante) {
    const nP = seg.length, D = new Float64Array(nP * nP);
    let mx = 0;
    for (let a = 0; a < nP; a++) for (let b = 0; b < nP; b++) {
      let d = 0;
      if (seg[a] !== seg[b]) {
        if (variante === "netz") { const k = kosten.get(seg[a]); d = k && Number.isFinite(k[seg[b]]) ? k[seg[b]] : NaN; }
        else d = Geo.abstand(mitten[seg[a]], mitten[seg[b]]);
      }
      D[a * nP + b] = d; if (d > mx) mx = d;
    }
    for (let i = 0; i < D.length; i++) D[i] = Number.isFinite(D[i]) ? (mx > 0 ? D[i] / mx : 0) : 1;   // nicht erreichbar: weitester Abstand
    return D;
  }
  /** Ausdruck wie „Assemble Perceived Distance Formular“: If(dist > Falloff, Close→0 | Far→1, Close: 1-dist | Far: dist, Linear: {0} | Exponential: Pow({0}, Exponent)) */
  function formel(p) {
    const fern = p.wichtig === "far", innen = fern ? "dist" : "1-dist";
    const z = v => String(Math.round(v * 1000) / 1000);
    const kern = p.funktion === "linear" ? innen : `Pow(${innen}, ${z(p.exponent)})`;
    return `If(dist > ${z(p.falloff)}, ${fern ? 1 : 0}, ${kern})`;
  }
  /** wahrgenommene Entfernung f(dist) für dist ∈ [0, 1] (Evaluate der Formel) */
  function wahrnehmung(dist, p) {
    const fern = p.wichtig === "far";
    if (dist > p.falloff) return fern ? 1 : 0;
    const x = fern ? dist : 1 - dist;
    return p.funktion === "linear" ? x : Math.pow(Math.max(0, x), p.exponent);
  }

  /* ------------------------------------------------------------------ 4. Attraktivität und Verteilung */
  /** Attraktivität je Profil i und Parzelle j wie die beiden C#-Skripte:
      Baum A{j, m, i, n} = rel[i][n] · W_n[j] · P[j][m] (Skript „attract · weights · distance“, Graft → Profile To n),
      Summe über alle Parzellen m und Profile n mit Verteilung D_n[m] > 0: Σ A · D_n[m].
      Normierung wie im Skript (x − min) · 1/max; ist max ≤ 0, (x − min)/(max − min) (siehe QUELLE.md). → att[i] Float64Array */
  function attraktivitaet(D, W, Pw, rel) {
    const K = D.length, nP = D[0].length, att = [];
    // S_n[j] = Σ_m P[j][m] · D_n[m] (wahrgenommene Menge des Profils n um Parzelle j)
    const S = D.map(Dn => {
      const s = new Float64Array(nP), nz = [];
      for (let m = 0; m < nP; m++) if (Dn[m] > 0) nz.push(m);
      for (let j = 0; j < nP; j++) { let v = 0; const r = j * nP; for (const m of nz) v += Pw[r + m] * Dn[m]; s[j] = v; }
      return s;
    });
    for (let i = 0; i < K; i++) {
      const a = new Float64Array(nP);
      for (let j = 0; j < nP; j++) { let v = 0; for (let n = 0; n < K; n++) v += rel[i][n] * W[n][j] * S[n][j]; a[j] = v; }
      let mn = Infinity, mx = -Infinity;
      for (const v of a) { if (v < mn) mn = v; if (v > mx) mx = v; }
      const teiler = mx > 0 ? mx : mx - mn;
      for (let j = 0; j < nP; j++) a[j] = teiler > 0 ? (a[j] - mn) / teiler : 0;
      att.push(a);
    }
    return att;
  }

  /** Einheiten je Iteration (AddPopulationPerProfile): Max Population / Iterations, als Integer gerundet */
  const jeIteration = (maxPop, it) => maxPop.map(v => it > 0 ? Math.round(v / it) : 0);
  /** maxDensity je Parzelle: Fläche / Gesamtfläche · Σ Max Population / (1 − Percent Cells not filled) */
  function maxDichte(flaechen, maxPop, leer) {
    const A = flaechen.reduce((s, v) => s + v, 0), summe = maxPop.reduce((s, v) => s + v, 0), f = 1 / Math.max(0.01, 1 - leer);
    return Float64Array.from(flaechen, a => A > 0 ? a / A * summe * f : 0);
  }

  /** C# „Attractivity“ (Verteilung): volle Parzellen (Summe ≥ maxDensity) bekommen Attraktivität 0; dann je Profil add[i]
      Einheiten per Glücksrad (roulette wheel, Feldgröße = Attraktivität) bzw. deterministisch auf die attraktivste Parzelle.
      Ist die gewählte Parzelle inzwischen voll, verfällt die Einheit („SOMETHING WENT WRONG – with the density control“).
      Verändert D; → {voll, platziert[3], verfallen[3]} */
  function verteile(D, att, add, dichte, rnd, det) {
    const K = D.length, nP = D[0].length, belegt = new Float64Array(nP);
    for (let j = 0; j < nP; j++) for (let i = 0; i < K; i++) belegt[j] += D[i][j];
    const A = att.map(a => Float64Array.from(a));
    let voll = 0;
    for (let j = 0; j < nP; j++) if (belegt[j] >= dichte[j]) { voll++; for (let i = 0; i < K; i++) A[i][j] = 0; }
    const platziert = new Array(K).fill(0), verfallen = new Array(K).fill(0);
    for (let i = 0; i < K; i++) {
      const a = A[i]; let summe = 0, mx = -Infinity, imx = -1;
      for (let k = 0; k < nP; k++) { summe += a[k]; if (a[k] > mx) { mx = a[k]; imx = k; } }
      for (let e = 0; e < add[i]; e++) {
        let slot = -1;
        if (det) slot = mx > 0 ? imx : -1;
        else {
          const r = rnd() * summe; let s = 0;
          for (let k = 0; k < nP; k++) { s += a[k]; if (s > r) { slot = k; break; } }
        }
        if (slot >= 0 && belegt[slot] < dichte[slot]) { D[i][slot]++; belegt[slot]++; platziert[i]++; }
        else verfallen[i]++;
      }
    }
    return { voll, platziert, verfallen };
  }

  /** C# „simple traffic estimation“ (EstimTripDist): Σ_i Σ_m Σ_n dist(m, n) · D_i[m] · Σ_{j≠i} D_j[n] / Summe_j.
      Im Skript steht Distances.Branch(i)[n] (Profilindex als Parzelle) – hier dist(m, n), siehe QUELLE.md. */
  function wegeSchaetzung(D, dn) {
    const K = D.length, nP = D[0].length, summe = D.map(a => a.reduce((s, v) => s + v, 0));
    let wege = 0;
    for (let i = 0; i < K; i++) {
      // Wahrscheinlichkeit, von Profil i aus Parzelle n anzusteuern: Anteil der anderen Profile auf n
      const q = new Float64Array(nP);
      for (let n = 0; n < nP; n++) for (let j = 0; j < K; j++) if (j !== i && summe[j] > 0) q[n] += D[j][n] / summe[j];
      for (let m = 0; m < nP; m++) {
        const dm = D[i][m]; if (!dm) continue;
        let s = 0; const r = m * nP;
        for (let n = 0; n < nP; n++) s += dn[r + n] * q[n];
        wege += dm * s;
      }
    }
    return wege;
  }
  /** dieselbe Schätzung für die gleichmäßige Verteilung (equal distribution on plots: Summe / Anzahl Parzellen je Profil) */
  function wegeGleich(D, dn) {
    const nP = D[0].length;
    return wegeSchaetzung(D.map(a => { const s = a.reduce((x, v) => x + v, 0) / nP; return new Float64Array(nP).fill(s); }), dn);
  }

  /* ------------------------------------------------------------------ Zustand */
  /** Neuer Zustand: Szene, Netzkennwerte, Kriterien, gewichtete Werte, Abstände, erste Verteilung (t = 0) */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const sz = szene(zufall);
    const z = { t: 0, b: sz.b, h: sz.h, sz, laufSaat: Math.floor(zufall() * 4294967296) >>> 0, auswahl: -1 };
    z.parz = sz.parzellen.map(q => ({ poly: q, flaeche: Geo.flaeche(q), mitte: Geo.schwerpunkt(q) }));
    z.neigung = z.parz.map(q => Szenen.neigung(sz.G, q.mitte[0], q.mitte[1]));
    baueNetz(z, p);
    return z;
  }
  function baueNetz(z, p) {
    z.netz = netzGraph(z.sz.strassen, z.sz.hierarchie, p);
    z.seg = segmentJeParzelle(z.netz.G.mitte, z.parz.map(q => q.mitte));
    z.K = netzKennwerte(z.netz.G.n, z.netz.adj, z.seg);
    z.V = kriterien(z.K, z.seg, z.neigung);
    baueAbstaende(z, p);
  }
  function baueAbstaende(z, p) {
    z.dn = distanzen(z.seg, z.netz.G.mitte, z.K.kosten, p.variante);
    baueWahrnehmung(z, p);
  }
  function baueWahrnehmung(z, p) {
    z.Pw = Float64Array.from(z.dn, d => wahrnehmung(d, p));
    baueGewichte(z, p);
  }
  function baueGewichte(z, p) {
    const pr = profile(p);
    z.pr = pr;
    z.W = gewichteteWerte(z.V, pr.w);
    z.dichte = maxDichte(z.parz.map(q => q.flaeche), pr.maxPop, p.leer);
    z.add = jeIteration(pr.maxPop, Math.round(p.iterationen));
    neuerLauf(z, p);
  }
  /** Lauf von vorn: erste Verteilung, Zufall des Laufs neu (gleiche Saat), Verlauf leer */
  function neuerLauf(z, p) {
    z.D = ersteVerteilung(z.W);
    z.rnd = Zufall.zufall(z.laufSaat);
    z.iter = 0; z.t = 0; z.voll = 0;
    z.platziert = [0, 0, 0]; z.verfallen = [0, 0, 0];
    z.att = attraktivitaet(z.D, z.W, z.Pw, z.pr.rel);
    z.verlauf = [protokoll(z)];
  }
  /** C#_Recorder: Summen je Profil und Wegeschätzung (aktuell und bei gleichmäßiger Verteilung) */
  function protokoll(z) {
    return { summe: z.D.map(a => a.reduce((s, v) => s + v, 0)), wege: wegeSchaetzung(z.D, z.dn), gleich: wegeGleich(z.D, z.dn) };
  }

  /** Ein Schritt = eine Iteration der Schleife (Loop Start → Attractivity → Loop End); nach „Iterations“ tut er nichts mehr */
  function schritt(z, p) {
    if (z.iter < Math.round(p.iterationen)) {
      const r = verteile(z.D, z.att, z.add, z.dichte, z.rnd, !!p.det);
      z.voll = r.voll;
      for (let i = 0; i < 3; i++) { z.platziert[i] += r.platziert[i]; z.verfallen[i] += r.verfallen[i]; }
      z.iter++;
      z.att = attraktivitaet(z.D, z.W, z.Pw, z.pr.rel);
      z.verlauf.push(protokoll(z));
    }
    z.t++;
    return z;
  }
  const fertig = (z, p) => z.iter >= Math.round(p.iterationen);

  /** Lauf neu bis zur Iteration k (wie Grasshopper, das nach jeder Änderung die ganze Schleife rechnet) */
  function rechneBis(z, p, k) {
    neuerLauf(z, p);
    const ziel = Math.min(k, Math.round(p.iterationen));
    while (z.iter < ziel) schritt(z, p);
    z.t = ziel;
  }

  /** Parameter ohne Neustart: betroffene Teile neu; war der Lauf schon begonnen, wird er bis zur selben Iteration neu gerechnet */
  function aendere(z, p, id) {
    if (DARSTELLUNG.has(id)) return;
    const k = z.iter;
    if (id === "kL" || id === "kW" || id === "kH") baueNetz(z, p);
    else if (id === "variante") baueAbstaende(z, p);
    else if (id === "funktion" || id === "wichtig" || id === "falloff" || id === "exponent") baueWahrnehmung(z, p);
    else if (id === "det") neuerLauf(z, p);
    else if (id === "m") { z.pr = profile(p); neuerLauf(z, p); }   // Gewichtsmatrix: nur die Relations
    else baueGewichte(z, p);                              // Profile, Iterations, Percent Cells not filled
    if (k > 0) rechneBis(z, p, k);
  }

  /** Parzelle am Punkt q (oder −1) */
  function parzelleBei(z, q) {
    for (let j = 0; j < z.parz.length; j++) if (Geo.punktInPoly(q, z.parz[j].poly)) return j;
    return -1;
  }

  /** Kennzahlen: je Profil Summe, belegte Parzellen, anteilige Fläche (m²), bevölkerungsgewichtete Zentralität und Erreichbarkeit;
      dazu volle Parzellen und das Verhältnis der Wegeschätzung zur gleichmäßigen Verteilung */
  function bilanz(z) {
    const nP = z.parz.length, K = 3;
    const summe = [0, 0, 0], parzellen = [0, 0, 0], flaeche = [0, 0, 0], zentral = [0, 0, 0], erreichbar = [0, 0, 0];
    let volleParz = 0, gemischt = 0;
    for (let j = 0; j < nP; j++) {
      let tot = 0, arten = 0; for (let i = 0; i < K; i++) { tot += z.D[i][j]; if (z.D[i][j] > 0) arten++; }
      if (tot >= z.dichte[j]) volleParz++;
      if (arten > 1) gemischt++;
      for (let i = 0; i < K; i++) {
        const d = z.D[i][j]; if (!d) continue;
        summe[i] += d; parzellen[i]++; flaeche[i] += z.parz[j].flaeche * d / tot;
        zentral[i] += d * z.V[0][j]; erreichbar[i] += d * z.V[1][j];
      }
    }
    for (let i = 0; i < K; i++) { if (summe[i]) { zentral[i] /= summe[i]; erreichbar[i] /= summe[i]; } }
    const v = z.verlauf[z.verlauf.length - 1];
    return { summe, parzellen, flaeche, zentral, erreichbar, voll: volleParz, gemischt, wege: v.wege, gleich: v.gleich, verhaeltnis: v.gleich > 0 ? v.wege / v.gleich : NaN };
  }

  return { PROFILE, NAMEN, KRITERIEN, STANDARD, DARSTELLUNG, RASTER_MATRIX, matrixAusText, matrixAlsText, setzeMatrix, profile, szene, netzGraph, segmentJeParzelle, netzKennwerte, remap, kriterien,
           gewichteteWerte, ersteVerteilung, distanzen, formel, wahrnehmung, attraktivitaet, jeIteration, maxDichte, verteile,
           wegeSchaetzung, wegeGleich, erzeuge, baueNetz, neuerLauf, schritt, fertig, rechneBis, aendere, parzelleBei, bilanz };
});
