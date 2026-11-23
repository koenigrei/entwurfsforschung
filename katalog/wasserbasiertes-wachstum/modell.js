/* Straßenwachstum nach dem Wasserabfluss · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Waterbased Street Growth“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie in WaterBasedStreetGrowth.gh (GhPython-Komponenten WSGConfig, WSGenerator, WSGResults von Martin Dennemark, 2020;
   dort nach dem Verfahren von „Procedural Cities“, phiresky 2015, das auf Parish & Müller 2001 zurückgeht):
   1. Gelände: „Flow Paths“ glättet das Gelände (Smooth), „Divide Surface“ tastet es in einem Punktraster ab (200 × 200);
      die Höhen der Rasterpunkte sind das Graustufenbild („Heatmap“), auf dem die Straßen wachsen.
   2. Wachstumsgrenze: je Zelle Neigung (Angle Normale–Z), Höhenunterschied zum Zentrum und Abstand zum Zentrum; jeder Wert über
      seine Spannweite auf 0…1 gebracht (Bounds, Remap); eine Zelle gehört zur Stadt, wenn alle drei Werte kleiner als ihre Gewichte
      sind (Smaller Than, Mass Multiplication). Außen „Population“ = 1, innen 0; Fläche innen / benötigte Fläche (Einwohner,
      Personen je Haushalt, Fläche je Haushalt) = Flächenfaktor.
   3. Wachstum (WSGenerator): eine Warteschlange von Straßenvorschlägen, geordnet nach der Zeit t. Je Schritt (eine Runde der
      Anemone-Schleife) wird der früheste Vorschlag geprüft – lokale Bedingungen (Schnitt mit einer Straße → dort enden, Fang an
      einem Straßenende, Fang an einer Straße im Radius; spitze Winkel < 10° verworfen), Population ≤ Schwelle, für neue Äste
      kein ähnlicher Ast in der Nähe – und bei Annahme gebaut. Dann folgen neue Vorschläge (globale Ziele): geradeaus, um höchstens
      MaxGrowthAngle zur Fließrichtung gedreht (bzw. quer dazu), und nach SegmentsPerBlockEdge Segmenten Abzweige nach rechts und
      links (Crossing) oder abwechselnd (T-Junction). */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei (Schieberegler: Wert [Bereich]):
      WeightSlope 0,5, WeightHeight 0,75, WeightCenter 0,3 [0..1]; Number People 10000 [0..10000], PersonPerHousehold 3 [0..10],
      AreaPerHousehold 1000 [50..1000] m²; StreetBlockSize 120 [0..150] m, SegmentsPerBlockEdge 2 [0..10], MaxGrowthAngle 10 [0..90]°,
      GrowthAngle 1 [1..5]°, WaterAngleShift 0 [0..45]°, Junction Type „Crossing“, InitialDirection „Both Directions“,
      PopulationThreshold 0,85 [0..1], Street Segments 10000 [0..10000]; Flow Paths Smooth 0,5 [0..1], Divide Surface 200 − 1 [0..1000].
      grenze: „schwellen“ wie in der Datei, „flaeche“ = Ergänzung (Zellen nach Bewertung bis zur benötigten Fläche). */
  const STANDARD = {
    grenze: "schwellen", gewNeigung: 0.5, gewHoehe: 0.75, gewZentrum: 0.3, einwohner: 10000, personen: 3, flaecheHaushalt: 1000,
    blockgroesse: 120, segmenteKante: 2, maxWinkel: 10, winkelSchritt: 1, wasserVersatz: 0, kreuzung: "kreuzung", richtung: "beide",
    schwelle: 0.85, maxSegmente: 10000, bestand: true, glaettung: 0.5, aufloesung: 200
  };
  /** Beispielgelände: 3 km × 3 km, bis 300 m Höhenunterschied (Platz für die 3,3 km² der Voreinstellung) */
  const GELAENDE = { n: 101, groesse: 3000, hoehe: 300 };
  /** Glättungsdurchgänge bei Smooth = 0 (wie in „Regenwasserabfluss (Raster)“) */
  const GLAETTUNG_MAX = 8;

  /* ---------------------------------------------------------------- kleine Hilfen wie in Python */
  /** Python-Modulo (Ergebnis hat das Vorzeichen des Teilers) */
  const pyMod = (a, b) => ((a % b) + b) % b;
  /** Python 3 round(): auf die nächste ganze Zahl, bei ,5 auf die gerade */
  function rundePy(x) { const f = Math.floor(x), d = x - f; if (d > 0.5) return f + 1; if (d < 0.5) return f; return f % 2 === 0 ? f : f + 1; }
  const gleich = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 < 0.00001;   // equalV
  const RAD = Math.PI / 180;

  /* ---------------------------------------------------------------- Konfiguration (WSGConfig) */
  /** Parameter der App → Konfiguration des Generators wie in WSGConfig:
      segmentLength = StreetBlockSize / SegmentsPerBlockEdge, growthAngle = MaxGrowthAngle, branchingSteps = SegmentsPerBlockEdge,
      Abzweige bei Crossing beidseitig (0/0), bei T-Junction um ceil(branchingSteps / 2) versetzt; Fang 0,9 · L, Ähnlichkeit
      0,66 · L · branchingSteps, Mindestabweichung 10° bei Schnitten und 30° bei ähnlichen Ästen. */
  function konfiguration(p) {
    const BS = Math.max(1, Math.round(p.segmenteKante)), L = Math.max(5, p.blockgroesse) / BS, halb = Math.ceil(BS / 2);
    return {
      L, A: Math.max(0, p.maxWinkel), GA: Math.max(0.1, p.winkelSchritt), shift: p.wasserVersatz || 0, BS,
      BSL: p.kreuzung === "t_rechts" ? halb : 0, BSR: p.kreuzung === "t_links" ? halb : 0,
      schwelle: Math.max(0, Math.min(1, p.schwelle)), init: p.richtung === "links" ? 1 : p.richtung === "rechts" ? 2 : 0,
      MID: 10, SNAP: L * 0.9, SIM: L * BS * 0.66, SIMA: 30
    };
  }

  /* ---------------------------------------------------------------- Graustufenbild (Heatmap) */
  /** Raster {m, groesse, H}: Punkt (i, j) bei (i, j) · groesse / (m − 1), Wert H[i·m + j] (i in x-Richtung, j in y-Richtung) */
  function raster(m, groesse, f) {
    const H = new Float64Array(m * m), d = groesse / (m - 1);
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) H[i * m + j] = f(i * d, j * d);
    return { m, groesse, d, H };
  }
  /** Heatmap.valueAt der .gh-Datei: Zellen um den Punkt mit Gewichten 1 − (Anteil der Gegenecke) – keine bilineare
      Interpolation, sondern eine schwächere (Gewichte summieren sich zu 3); am Rand wie im Skript geklemmt. */
  function wertAn(K, x, y) {
    const mx = K.m - 1, G = K.H, m = K.m;
    const cx = (x / K.groesse) * mx, cy = (y / K.groesse) * mx;
    let xl = Math.floor(cx), xh = Math.ceil(cx), yl = Math.floor(cy), yh = Math.ceil(cy);
    if (xl < 0) { xl = 0; xh = 1; }
    if (xh >= mx) { xh = mx; xl = mx - 1; }
    if (yl < 0) { yl = 0; yh = 1; }
    if (yh >= mx) { yh = mx; yl = mx - 1; }
    const w0 = 1 - (cx - xl) * (cy - yl), w1 = 1 - (xh - cx) * (cy - yl), w2 = 1 - (xh - cx) * (yh - cy), w3 = 1 - (cx - xl) * (yh - cy);
    return (G[xl * m + yl] * w0 + G[xh * m + yl] * w1 + G[xh * m + yh] * w2 + G[xl * m + yh] * w3) / (w0 + w1 + w2 + w3);
  }
  /** Heatmap.valueAtClosest: Wert des nächsten Rasterpunkts (Python-Rundung), geklemmt */
  function wertNaechst(K, x, y) {
    const mx = K.m - 1;
    const i = Math.max(0, Math.min(mx, rundePy((x / K.groesse) * mx))), j = Math.max(0, Math.min(mx, rundePy((y / K.groesse) * mx)));
    return K.H[i * K.m + j];
  }

  /* ---------------------------------------------------------------- Segmente */
  /** Segment {a, b, t, step, perp, severed, art}; art "neu" (gewachsen) oder "bestand" (Existing Streets) */
  const seg = (a, b, t, q, art = "neu") => ({ a: [a[0], a[1]], b: [b[0], b[1]], t, step: q.step || 0, perp: !!q.perp, severed: !!q.severed, art });
  const laenge = s => Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
  /** Segment.dir(): Winkel in Grad von der +y-Achse zur +x-Achse (−1 · sign(Kreuzprodukt) · Winkel; sign(0) = +1 wie im Skript) */
  function richtung(s) {
    const vx = s.b[0] - s.a[0], vy = s.b[1] - s.a[1], l = Math.hypot(vx, vy);
    const w = l > 0 ? Math.acos(Math.max(-1, Math.min(1, vy / l))) / RAD : 90;
    return (-vx >= 0 ? -1 : 1) * w;
  }
  /** Segment.pointInDirection: Punkt in Richtung dir (Grad, 0 = +y, 90 = +x) im Abstand len */
  const inRichtung = (p, dir, len) => [p[0] + len * Math.sin(dir * RAD), p[1] + len * Math.cos(dir * RAD)];
  const mitRichtung = (p, dir, len, t, q) => seg(p, inRichtung(p, dir, len), t, q);
  /** minDegreeDifference: Winkelunterschied zweier Richtungen ohne Vorzeichen und Sinn, 0…90° */
  function winkelDiff(a, b) { const u = Math.abs(a - b) % 180; return Math.min(u, Math.abs(u - 180)); }

  /** lineSegementsIntersect mit omitEnds: Schnitt im Innern beider Segmente → {punkt, t} (t auf p–p2) oder null */
  function schnitt(p, p2, q, q2) {
    const r = [p2[0] - p[0], p2[1] - p[1]], s = [q2[0] - q[0], q2[1] - q[1]], qp = [q[0] - p[0], q[1] - p[1]];
    const den = r[0] * s[1] - r[1] * s[0];
    if (den === 0) return null;
    const u = (qp[0] * r[1] - qp[1] * r[0]) / den, t = (qp[0] * s[1] - qp[1] * s[0]) / den;
    if (0.001 < t && t < 0.999 && 0.001 < u && u < 0.999) return { punkt: [p[0] + t * r[0], p[1] + t * r[1]], t };
    return null;
  }
  /** distanceToLine: Lotfußpunkt von a auf die Gerade b–e mit Abstand² und Projektion (mit richtigem Skalarprodukt, s. QUELLE.md) */
  function abstandZuLinie(a, b, e) {
    const d = [a[0] - b[0], a[1] - b[1]], v = [e[0] - b[0], e[1] - b[1]], dot = d[0] * v[0] + d[1] * v[1], l2 = v[0] * v[0] + v[1] * v[1];
    const k = l2 ? dot / l2 : 0, pr = [v[0] * k, v[1] * k], fuss = [b[0] + pr[0], b[1] + pr[1]];
    return { abstand2: (fuss[0] - a[0]) ** 2 + (fuss[1] - a[1]) ** 2, fuss, proj2: (dot >= 0 ? 1 : -1) * (pr[0] * pr[0] + pr[1] * pr[1]), laenge2: l2 };
  }

  /* ---------------------------------------------------------------- Richtungen auf dem Graustufenbild */
  /** getSteepestDirection: unter steps Winkeln von minA bis maxA (relativ zur Segmentrichtung, ab dem Segmentende, Abstand len)
      der mit dem größten |Höhenunterschied|; 0, wenn nirgends ein Unterschied */
  function steilste(K, s, minA, maxA, steps, len) {
    if (steps < 2) steps = 2;
    const w0 = wertAn(K, s.b[0], s.b[1]), d = richtung(s);
    let st = 0, best = 0;
    for (let i = 0; i < steps; i++) {
      const cur = ((maxA - minA) / (steps - 1)) * i + minA, q = inRichtung(s.b, d + cur, len), v = Math.abs(w0 - wertAn(K, q[0], q[1]));
      if (v > st) { st = v; best = cur; }
    }
    return best;
  }
  /** getWaterflowDirection: steilste Richtung rundum (von −180 + 360/steps bis 180 in steps − 1 Winkeln, wie im Skript) */
  const fliessrichtung = (K, s, steps, len) => steilste(K, s, -180 + 360 / steps, 180, steps - 1, len);
  /** getCloseToWaterDirection: Fließrichtung (minus WaterAngleShift; bei perp + 90°) auf −90…90° gebracht und in [minA, maxA]
      geklemmt; dann – wie in der Notiz der .gh-Datei beschrieben – auf die geprüften Winkel im Abstand GrowthAngle gerundet. */
  function nahWasser(K, s, minA, maxA, C, len) {
    let opt = fliessrichtung(K, s, 16, len) - C.shift;
    if (s.perp) opt += 90;
    opt = pyMod(opt, 180);
    if (Math.abs(opt - 180) < opt) opt -= 180;
    const w = maxA < opt ? maxA : minA > opt ? minA : opt;
    return raste(w, minA, maxA, C.GA);
  }
  /** nächster der Winkel Mitte + k · GA (|k · GA| ≤ halbe Spanne) und der beiden Grenzen */
  function raste(w, minA, maxA, GA) {
    const c = (minA + maxA) / 2, h = (maxA - minA) / 2, kand = [minA, maxA];
    for (let k = -Math.floor(h / GA + 1e-9); k * GA <= h + 1e-9; k++) kand.push(c + k * GA);
    let best = kand[0];
    for (const a of kand) if (Math.abs(a - w) < Math.abs(best - w) - 1e-12) best = a;
    return best;
  }

  /* ---------------------------------------------------------------- räumlicher Index (statt Quadtree) */
  function index(zelle) {
    const Z = new Map(), key = (i, j) => i * 100003 + j;
    const zellen = (a, b, r, f) => {
      const i0 = Math.floor((Math.min(a[0], b[0]) - r) / zelle), i1 = Math.floor((Math.max(a[0], b[0]) + r) / zelle);
      const j0 = Math.floor((Math.min(a[1], b[1]) - r) / zelle), j1 = Math.floor((Math.max(a[1], b[1]) + r) / zelle);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) f(key(i, j));
    };
    return {
      rein(s) { zellen(s.a, s.b, 0, k => { let l = Z.get(k); if (!l) Z.set(k, l = []); l.push(s); }); },
      /** alle Segmente, deren Rechteck dem Rechteck von s um r erweitert nahekommt, in der Reihenfolge des Einfügens */
      nahe(s, r) {
        const g = new Set(); zellen(s.a, s.b, r, k => { const l = Z.get(k); if (l) for (const o of l) g.add(o); });
        return [...g].sort((x, y) => x.nr - y.nr);
      }
    };
  }
  function fuegeEin(z, s) { s.nr = z.nr++; z.segmente.push(s); z.idx.rein(s); }

  /** Segment.split: other am Punkt teilen; der erste Teil (Anfang–Punkt) kommt als neues Segment hinzu */
  function teile(z, other, punkt) {
    if (gleich(punkt, other.a) || gleich(punkt, other.b)) return;
    const erst = seg(other.a, punkt, other.t, other, other.art);
    other.a = [punkt[0], punkt[1]];
    fuegeEin(z, erst);
  }

  /* ---------------------------------------------------------------- lokale Bedingungen (localConstraints) */
  /** prüft einen Vorschlag gegen die Straßen in der Nähe; kürzt ihn ggf. und teilt die getroffene Straße.
      Wie im Skript: Schnitt (Priorität 4, kleinstes t) vor Fang an einem Ende (3, das letzte passende) vor Fang an einer Straße im
      Radius (2); die Merker bleiben gesetzt und werden in der Reihenfolge Radius → Fang → Schnitt ausgewertet. → true = annehmen */
  function lokal(z, s) {
    const C = z.C, A = { prio: 0, obj: null, punkt: null, schnitt: false, fang: false, radius: false, t: null };
    for (const o of z.idx.nahe(s, C.SNAP)) {
      if (A.prio <= 4) {
        const x = schnitt(s.a, s.b, o.a, o.b);
        if (x && x.t > 0.01 && (A.t === null || x.t < A.t)) { A.t = x.t; A.prio = 4; A.schnitt = true; A.obj = o; A.punkt = x.punkt; }
      }
      if (A.prio <= 3 && !gleich(s.a, o.b) && Math.hypot(s.b[0] - o.b[0], s.b[1] - o.b[1]) <= C.SNAP) {
        A.prio = 3; A.fang = true; A.obj = o; A.punkt = o.b.slice();
      }
      if (A.prio <= 2 && !gleich(s.a, o.a) && !gleich(s.a, o.b)) {
        const D = abstandZuLinie(s.b, o.a, o.b);
        if (D.abstand2 > 0.01 && !gleich(s.a, D.fuss) && D.abstand2 < C.SNAP * C.SNAP && D.proj2 >= 0 && D.proj2 <= D.laenge2) {
          A.prio = 2; A.radius = true; A.obj = o; A.punkt = D.fuss;
        }
      }
    }
    if (!A.obj) return true;
    const o = A.obj, q = A.punkt;
    if (A.radius) {
      s.b = q.slice(); s.severed = true;
      if (winkelDiff(richtung(o), richtung(s)) < C.MID) return false;
      teile(z, o, q); return true;
    }
    if (A.fang) {
      s.b = q.slice(); s.severed = true;
      // doppelte Straße (gleiche Enden) nicht anlegen
      for (const w of z.idx.nahe(s, 0)) if ((gleich(w.a, s.b) && gleich(w.b, s.a)) || (gleich(w.a, s.a) && gleich(w.b, s.b))) return false;
      return true;
    }
    if (winkelDiff(richtung(o), richtung(s)) < C.MID) return false;
    teile(z, o, q); s.b = q.slice(); s.severed = true;
    return true;
  }
  /** branchConstraints: ein neuer Ast (step 0) entfällt, wenn eine Straße mit anderem Anfang mit Anfang oder Ende näher als
      ROAD_SIMILARITY_DISTANCE an seinem Ende liegt und fast gleich gerichtet ist (< 30°) */
  function aehnlich(z, s) {
    const C = z.C, r2 = C.SIM * C.SIM;
    for (const o of z.idx.nahe(s, C.SIM)) {
      if (gleich(s.a, o.a)) continue;
      const dE = (s.b[0] - o.b[0]) ** 2 + (s.b[1] - o.b[1]) ** 2, dA = (s.b[0] - o.a[0]) ** 2 + (s.b[1] - o.a[1]) ** 2;
      if ((dE <= r2 || dA <= r2) && winkelDiff(richtung(o), richtung(s)) < C.SIMA) return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------- globale Ziele (globalGoalsGenerate) */
  /** neue Vorschläge nach einem gebauten Segment: geradeaus (step + 1, gleiche Länge), nach branchingSteps Abzweige (step 0, Länge L,
      perp umgekehrt) rechts (+90°) und links (−90°) je nach Kreuzungsart; alle mit t = 0 (die Zeit setzt schritt) */
  function ziele(z, prev) {
    if (prev.severed) return [];
    const C = z.C, K = z.K, d = richtung(prev), len = laenge(prev), out = [];
    out.push(mitRichtung(prev.b, d + nahWasser(K, prev, -C.A, C.A, C, len), len, 0, { perp: prev.perp, step: prev.step + 1 }));
    if (prev.step >= C.BS) {
      if (pyMod(prev.step - C.BSR, C.BS) === 0) out.push(mitRichtung(prev.b, d + nahWasser(K, prev, 90 - C.A, 90 + C.A, C, len), C.L, 0, { perp: !prev.perp, step: 0 }));
      if (pyMod(prev.step - C.BSL, C.BS) === 0) out.push(mitRichtung(prev.b, d + nahWasser(K, prev, -90 - C.A, -90 + C.A, C, len), C.L, 0, { perp: !prev.perp, step: 0 }));
    }
    return out;
  }

  /* ---------------------------------------------------------------- Gelände, Zentrum, Bestandsstraße */
  /** Smooth (0 = glatt, 1 = genau) → Glättungsdurchgänge */
  const durchgaenge = s => Math.round((1 - Math.max(0, Math.min(1, s))) * GLAETTUNG_MAX);
  /** geglättetes Gelände, Graustufenbild der Höhen (Divide Surface: m × m Punkte), Fließlinien zur Anzeige */
  function baueGelaende(z, p) {
    z.G = Szenen.glaette(z.G0, durchgaenge(p.glaettung));
    const m = Math.max(10, Math.min(400, Math.round(p.aufloesung)));
    z.K = raster(m, z.G.groesse, (x, y) => Szenen.hoehe(z.G, x, y));
    z.fluss = fliesslinien(z.G);
  }
  /** Fließlinien (Anzeige „Visualise Water Flowlines“): von einem Raster aus Startpunkten bergab entlang −Gradient */
  function fliesslinien(G, n = 18, schritte = 45) {
    const S = G.groesse, d = S / n, L = [], dl = S / 150;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      let q = [(a + 0.5) * d, (b + 0.5) * d]; const P = [q];
      for (let k = 0; k < schritte; k++) {
        const g = Szenen.gradient(G, q[0], q[1]), l = Math.hypot(g[0], g[1]);
        if (l < 1e-4) break;
        q = [q[0] - g[0] / l * dl, q[1] - g[1] / l * dl];
        if (q[0] < 0 || q[1] < 0 || q[0] > S || q[1] > S) break;
        P.push(q);
      }
      if (P.length > 3) L.push(P);
    }
    return L;
  }
  /** Zentrum der Beispielszene: flache, tief gelegene Stelle im mittleren Bereich (Neigung und Höhe je auf 0…1 bezogen) */
  function flachsteMitte(G) {
    const n = 24, S = G.groesse, c = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = (i + 0.5) * S / n, y = (j + 0.5) * S / n; c.push([x, y, Szenen.neigung(G, x, y), Szenen.hoehe(G, x, y), i, j]); }
    const mm = k => { let a = Infinity, b = -Infinity; for (const q of c) { a = Math.min(a, q[k]); b = Math.max(b, q[k]); } return [a, b - a || 1]; };
    const [n0, nd] = mm(2), [h0, hd] = mm(3);
    let best = null, bw = Infinity;
    for (const q of c) { if (q[4] < 7 || q[5] < 7 || q[4] > 16 || q[5] > 16) continue; const w = (q[2] - n0) / nd + 0.8 * (q[3] - h0) / hd; if (w < bw) { bw = w; best = q; } }
    return [best[0], best[1]];
  }
  /** Bestandsstraße (Existing Streets) durch das Zentrum: ungefähr entlang der Höhenlinie, leicht geschwungen (Form aus der Saat),
      auf das Gebiet beschnitten → Punkte der Polylinie */
  function bestandsstrasse(z) {
    const G = z.G, c = z.zentrum, S = G.groesse, g = Szenen.gradient(G, c[0], c[1]);
    const w = Math.atan2(g[1], g[0]) + Math.PI / 2 + z.form.winkel, u = [Math.cos(w), Math.sin(w)], nr = [-u[1], u[0]], V = z.form.versatz, K = V.length, mitte = (K - 1) / 2;
    const P = [];
    for (let i = 0; i < K; i++) { const s = (i - mitte) / mitte * S * 1.5, off = i === mitte ? 0 : V[i] * 0.1 * S * Math.min(1, Math.abs(i - mitte) / 2); P.push([c[0] + u[0] * s + nr[0] * off, c[1] + u[1] * s + nr[1] * off]); }
    const Q = [];
    const glatt = Szenen.glatt(P, 4);
    for (let i = 0; i < glatt.length - 1; i++) { const a = glatt[i], b = glatt[i + 1], k = Math.max(1, Math.ceil(Geo.abstand(a, b) / 10)); for (let t = 0; t < k; t++) Q.push(Geo.lerp(a, b, t / k)); }
    Q.push(glatt[glatt.length - 1]);
    const innen = q => q[0] >= 0 && q[1] >= 0 && q[0] <= S && q[1] <= S;
    let k0 = 0, bd = Infinity; Q.forEach((q, k) => { const d = Geo.abstand(q, c); if (d < bd) { bd = d; k0 = k; } });
    let a = k0, b = k0; while (a > 0 && innen(Q[a - 1])) a--; while (b < Q.length - 1 && innen(Q[b + 1])) b++;
    return Q.slice(a, b + 1);
  }
  /** Curve To Polyline (MaxEdge = StreetBlockSize) + Explode: Polylinie in gleich lange Stücke ≤ maxKante */
  function stuecke(P, maxKante) {
    const l = [0]; for (let i = 1; i < P.length; i++) l.push(l[i - 1] + Geo.abstand(P[i - 1], P[i]));
    const Lg = l[l.length - 1], n = Math.max(1, Math.ceil(Lg / maxKante - 1e-9)), pt = s => {
      let i = 1; while (i < P.length - 1 && l[i] < s) i++; const u = l[i] > l[i - 1] ? (s - l[i - 1]) / (l[i] - l[i - 1]) : 0; return Geo.lerp(P[i - 1], P[i], Math.max(0, Math.min(1, u)));
    };
    const Q = []; for (let k = 0; k <= n; k++) Q.push(pt(Lg * k / n));
    const S = []; for (let k = 0; k < n; k++) S.push([Q[k], Q[k + 1]]);
    return S;
  }

  /* ---------------------------------------------------------------- Wachstumsgrenze */
  /** Remap über die Spannweite (Bounds) auf 0…1; leere Spannweite (auch nur Rundungsrauschen, < 1e-4 des Betrags) → 0 */
  function remap(v) {
    let a = Infinity, b = -Infinity; for (const x of v) { if (x < a) a = x; if (x > b) b = x; }
    const d = b - a, leer = !(d > 1e-4 * Math.max(1e-12, Math.abs(a), Math.abs(b))), r = new Float64Array(v.length);
    for (let i = 0; i < v.length; i++) r[i] = leer ? 0 : (v[i] - a) / d; return r;
  }
  /** Werte je Rasterpunkt: Neigung (rad, Angle Unit Z – Normale), |Höhe − Höhe Zentrum|, Abstand zum Zentrum (3D) */
  function zellwerte(K, zentrum) {
    const m = K.m, H = K.H, n = m * m, ng = new Float64Array(n), dh = new Float64Array(n), ab = new Float64Array(n);
    const h = (i, j) => H[Math.max(0, Math.min(m - 1, i)) * m + Math.max(0, Math.min(m - 1, j))];
    const zc = wertBilinear(K, zentrum[0], zentrum[1]);
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
      const k = i * m + j, ix = (i > 0 && i < m - 1) ? 2 : 1, jx = (j > 0 && j < m - 1) ? 2 : 1;
      const gx = (h(i + 1, j) - h(i - 1, j)) / (ix * K.d), gy = (h(i, j + 1) - h(i, j - 1)) / (jx * K.d);
      ng[k] = Math.atan(Math.hypot(gx, gy));
      dh[k] = Math.abs(H[k] - zc);
      ab[k] = Math.hypot(i * K.d - zentrum[0], j * K.d - zentrum[1], H[k] - zc);
    }
    return [ng, dh, ab];
  }
  /** Höhe auf dem Raster, bilinear (Mesh | Ray: Zentrum auf das Gelände projiziert) */
  function wertBilinear(K, x, y) {
    const m = K.m, fx = Math.max(0, Math.min(m - 1.000001, x / K.d)), fy = Math.max(0, Math.min(m - 1.000001, y / K.d)), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, H = K.H;
    return (H[i * m + j] * (1 - u) + H[(i + 1) * m + j] * u) * (1 - v) + (H[i * m + j + 1] * (1 - u) + H[(i + 1) * m + j + 1] * u) * v;
  }
  /** Wachstumsgrenze → {frei: Uint8Array (1 = Stadt), pop: Raster (0 innen, 1 außen), score, anzahl, flaecheZelle, moeglich, benoetigt, faktor}
      „schwellen“ (wie die .gh-Datei): normierte Neigung < WeightSlope und normierte Höhe < WeightHeight und normierter Abstand < WeightCenter.
      „flaeche“ (Ergänzung): Bewertung = gewichtetes Mittel der normierten Werte (CellScore), aufsteigend, bis die benötigte Fläche erreicht ist. */
  function grenze(K, zentrum, p) {
    const W = zellwerte(K, zentrum).map(remap), n = K.m * K.m, frei = new Uint8Array(n), g = [p.gewNeigung, p.gewHoehe, p.gewZentrum];
    const sg = g[0] + g[1] + g[2], score = new Float64Array(n);
    for (let k = 0; k < n; k++) score[k] = sg > 0 ? (g[0] * W[0][k] + g[1] * W[1][k] + g[2] * W[2][k]) / sg : (W[0][k] + W[1][k] + W[2][k]) / 3;
    const flaecheZelle = K.groesse * K.groesse / n, benoetigt = (p.einwohner / Math.max(1, p.personen)) * p.flaecheHaushalt;
    let anzahl = 0;
    if (p.grenze === "flaeche") {
      const reihe = [...score.keys()].sort((a, b) => score[a] - score[b] || a - b);
      for (const k of reihe) { if ((anzahl + 1) * flaecheZelle > benoetigt + flaecheZelle / 2) break; frei[k] = 1; anzahl++; }
    } else {
      for (let k = 0; k < n; k++) if (W[0][k] < g[0] && W[1][k] < g[1] && W[2][k] < g[2]) { frei[k] = 1; anzahl++; }
    }
    const pop = { m: K.m, groesse: K.groesse, d: K.d, H: Float64Array.from(frei, v => 1 - v) };
    const moeglich = anzahl * flaecheZelle;
    return { frei, pop, score, anzahl, flaecheZelle, moeglich, benoetigt, faktor: benoetigt > 0 ? moeglich / benoetigt : Infinity };
  }

  /* ---------------------------------------------------------------- Anfang des Wachstums (makeExistingSegments) */
  /** Startvorschläge. Mit Bestandsstraße: je Stück i ein Querast am Anfang des Stücks (rechts mit −L, links mit +L) nach
      branchingSteps und Kreuzungsart, zur Fließrichtung gedreht; das Stück gilt als „perp“, wenn die Fließrichtung > 45° davon abweicht.
      Ohne Bestandsstraße: ein Segment vom Zentrum in Fließrichtung (32 Winkel), je nach InitialDirection auch das Gegenstück.
      Nur Vorschläge, deren Ende in der Stadt liegt (Population ≤ Schwelle). */
  function anfaenge(z) {
    const C = z.C, K = z.K, L = C.L, out = [], links = C.init === 0 || C.init === 1, rechts = C.init === 0 || C.init === 2;
    if (z.bestand.length) {
      z.bestand.forEach((b, i) => {
        if (fliessrichtung(K, b, 32, L) > 45) b.perp = true;
        const s0 = mitRichtung(b.a, richtung(b) - 90, L, 0, { perp: !b.perp, step: 0 }), dw = nahWasser(K, s0, -C.A, C.A, C, L), d0 = richtung(s0);
        if (pyMod(i - C.BSR, C.BS) === 0 && rechts) out.push(mitRichtung(s0.a, d0 + dw, -L, 0, { perp: s0.perp, step: 0 }));
        if (pyMod(i - C.BSL, C.BS) === 0 && links) out.push(mitRichtung(s0.a, d0 + dw, L, 0, { perp: s0.perp, step: 0 }));
      });
    } else {
      const c = z.zentrum, probe = seg([c[0] - L, c[1]], c, 0, {});
      const wurzel = mitRichtung(c, richtung(probe) + fliessrichtung(K, probe, 32, L), L, 0, { perp: false, step: 0 });
      const gegen = seg(c, [2 * c[0] - wurzel.b[0], 2 * c[1] - wurzel.b[1]], 0, { perp: false, step: 0 });
      if (C.init !== 2) out.push(wurzel);
      if (C.init !== 1) out.push(gegen);
    }
    return out.filter(s => wertNaechst(z.grenze.pop, s.b[0], s.b[1]) <= C.schwelle);
  }

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const G0 = Szenen.gelaende(zufall, GELAENDE);
    const z = { t: 0, G0, b: G0.groesse, h: G0.groesse, form: { winkel: (zufall() - 0.5) * Math.PI / 4, versatz: Array.from({ length: 9 }, () => zufall() - 0.5) } };
    baueGelaende(z, p);
    z.zentrum = flachsteMitte(z.G);
    rechneGrenze(z, p); beginne(z, p);
    return z;
  }
  function rechneGrenze(z, p) { z.grenze = grenze(z.K, z.zentrum, p); }
  /** Wachstum von vorn: Konfiguration, Bestandsstraße, Startvorschläge in die Warteschlange; t = 0 */
  function beginne(z, p) {
    z.C = konfiguration(p); z.t = 0; z.nr = 0; z.segmente = []; z.idx = index(Math.max(40, z.C.L)); z.warte = []; z.kopf = 0;
    z.abgelehnt = 0; z.neu = 0; z.tMax = 0; z.laengeNeu = 0; z.abwSumme = 0; z.abwN = 0; z.letzter = null;
    z.bestand = p.bestand ? stuecke(bestandsstrasse(z), Math.max(5, p.blockgroesse)).map(([a, b]) => seg(a, b, 0, {}, "bestand")) : [];
    const start = anfaenge(z);            // setzt perp der Bestandsstücke
    for (const b of z.bestand) fuegeEin(z, b);
    z.warte.push(...start);
    return z;
  }
  /** Abweichung eines Segments von der Fließrichtung (−Gradient des Geländes) in Grad, 0 = parallel oder quer, 45 = schräg; null auf ebenem Grund */
  function abweichung(G, s) {
    const m = Geo.lerp(s.a, s.b, 0.5), g = Szenen.gradient(G, m[0], m[1]);
    if (Math.hypot(g[0], g[1]) < 0.01) return null;
    const w = Math.abs(Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]) - Math.atan2(-g[1], -g[0])) / RAD % 90;
    return Math.min(w, 90 - w);
  }
  /** Ein Schritt = eine Runde der Schleife (generationStep): den frühesten Vorschlag prüfen, ggf. bauen, neue Vorschläge einreihen.
      Die Warteschlange ist nach t geordnet; weil neue Vorschläge t + 1 bekommen, genügt die Reihenfolge des Einreihens (wie die
      PriorityQueue des Skripts mit „kleinstes t, bei Gleichstand das früheste“). */
  function schritt(z, p) {
    if (z.kopf < z.warte.length && z.t < p.maxSegmente) {
      const C = z.C, s = z.warte[z.kopf++];
      let ok = lokal(z, s);
      if (wertNaechst(z.grenze.pop, s.b[0], s.b[1]) > C.schwelle) ok = false;
      if (s.b[0] < 0 || s.b[1] < 0 || s.b[0] > z.b || s.b[1] > z.h) ok = false;
      if (ok && s.step === 0) ok = !aehnlich(z, s);
      if (ok && laenge(s) > 1e-3) {
        fuegeEin(z, s); z.neu++; z.laengeNeu += laenge(s); if (s.t > z.tMax) z.tMax = s.t;
        const w = abweichung(z.G, s); if (w !== null) { z.abwSumme += w; z.abwN++; }
        for (const n of ziele(z, s)) { n.t = s.t + 1 + n.t; z.warte.push(n); }
        s.ok = true;
      } else { z.abgelehnt++; s.ok = false; }
      z.letzter = s;
      if (z.kopf > 4096 && z.kopf * 2 > z.warte.length) { z.warte = z.warte.slice(z.kopf); z.kopf = 0; }
    }
    z.t++;
    return z;
  }
  const offen = z => z.warte.length - z.kopf;
  const fertig = (z, p) => offen(z) === 0 || z.t >= p.maxSegmente;
  const mittlereAbweichung = z => z.abwN ? z.abwSumme / z.abwN : null;
  /** Alle gewachsenen Segmente enden in der Stadt (Population ≤ Schwelle)? */
  const alleInnen = z => z.segmente.every(s => s.art !== "neu" || wertNaechst(z.grenze.pop, s.b[0], s.b[1]) <= z.C.schwelle);

  const GELAENDE_IDS = ["glaettung", "aufloesung"], GRENZE_IDS = ["grenze", "gewNeigung", "gewHoehe", "gewZentrum", "einwohner", "personen", "flaecheHaushalt"];
  /** Regler wie in Grasshopper: Gelände bzw. Grenze neu, dann das Wachstum von vorn (t = 0); Darstellungsschalter ändern nichts */
  function aendere(z, p, id) {
    if (id && id.startsWith("zeige")) return;
    if (GELAENDE_IDS.includes(id)) baueGelaende(z, p);
    if (GELAENDE_IDS.includes(id) || GRENZE_IDS.includes(id)) rechneGrenze(z, p);
    if (id === "maxSegmente" && z.t <= p.maxSegmente) return;   // nur die Grenze der Schleife
    beginne(z, p);
  }
  /** Zentrum per Klick: Grenze und Bestandsstraße neu, Wachstum von vorn */
  function setzeZentrum(z, p, q) {
    const kl = v => Math.max(0, Math.min(z.b, v));
    z.zentrum = [kl(q[0]), kl(q[1])]; rechneGrenze(z, p); beginne(z, p);
  }

  return { STANDARD, GELAENDE, pyMod, rundePy, konfiguration, raster, wertAn, wertNaechst, wertBilinear, seg, laenge, richtung, inRichtung, winkelDiff,
           schnitt, abstandZuLinie, steilste, fliessrichtung, nahWasser, raste, index, fuegeEin, teile, lokal, aehnlich, ziele, durchgaenge, baueGelaende,
           fliesslinien, flachsteMitte, bestandsstrasse, stuecke, remap, zellwerte, grenze, anfaenge, erzeuge, rechneGrenze, beginne, abweichung,
           schritt, offen, fertig, mittlereAbweichung, alleInnen, aendere, setzeZentrum };
});
