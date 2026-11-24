/* Hochwasser: steigender Pegel · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung der „Spatial Resilience Toolbox – Flooding“ (SRTF) aus dem DeCodingSpaces Lab:
   Morschek, J., König, R., Schneider, S. (2019): An integrated urban planning and simulation method to enforce spatial
   resilience towards flooding hazards. SimAUD 2019, Atlanta. Die Grasshopper-Dateien sind nicht öffentlich; umgesetzt ist das
   Verfahren, wie es Paper und Projektseite beschreiben.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Tidal & River Flooding (Paper 3.3, 3.4):
   - Eine Wasserebene steigt vom Startpegel bis zum Höchstpegel, je Schritt (Frame) um 8 cm. Überflutet ist, was unter der Ebene
     liegt UND mit dem Fluss verbunden ist („culls areas that are not directly connected to the original surface“, z. B. hinter
     einem Damm). Hier: Überlaufhöhe W je Gitterpunkt = kleinste Wasserhöhe, bei der Wasser vom Fluss dorthin gelangt
     (Priority-Flood, Minimax-Weg über das Gelände); überflutet bei Pegel L, wenn W < L.
   - Ein Gebäude gilt als überflutet, sobald der Pegel die Oberkante seines Sockels erreicht (und das Wasser dort ankommt).
     Tiefe = Zahl der Schritte seit der Überflutung × 8 cm; ab 24 cm gleich gewertet; Färbung hell- bis dunkelrot.
   - Straßensegmente (an Kreuzungen und Knicken geteilt) zählen nach ihrem tiefsten Punkt, genauso.
   - Mittleres Risiko: je Gebäude/Segment/Geländezelle Zahl der Pegelstände, in denen der Punkt überflutet ist, geteilt durch die
     Zahl aller Pegelstände.
   Rain Runoff (Paper 3.1, 3.2), optional:
   - Partikel mit Masse fallen auf das Gelände und laufen unter der Schwerkraft ab (im Original Kangaroo), Gebäude sind Hindernisse,
     Wald bremst. Überflutungsrisiko je Gebäude = Partikel im Umkreis (2 m) / Grundfläche, je Straßensegment = Partikel im Umkreis /
     Fläche des Umkreises. Erosionsrisiko: Fließwege aus den Orten alle 10 Schritte; Abschnitte, die schneller als die Schwelle
     zurückgelegt werden, gelten als erosionsgefährdet.
   Maßnahmen (Paper „Working with the SRTF“): Gebäude anheben, Gräben ziehen, aufforsten. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen,
                   node ? require("../_gemeinsam/raster.js") : wurzel.Raster);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen, Raster) {
  "use strict";

  /** Voreinstellungen: Pegel 0 → 8 m in Schritten von 8 cm, Tiefen ab 24 cm gleich (Paper); Sockel 0,5 m (eigene Annahme);
      Regen: Umkreis 2 m (Paper), 1500 Partikel, 600 Schritte, Erosion ab 6 m je 10 Schritte (an die Schrittweite der App angepasst) */
  const STANDARD = { modus: "pegel", ansicht: "zustand", startpegel: 0, maxpegel: 8, schrittweite: 8, tiefenschwelle: 24, sockel: 0.5,
                     partikel: 1500, iterationen: 600, umkreis: 2, erosion: 6, werkzeug: "anheben" };
  /** Gelände: Quadrat 400 m, Gitter 201 × 201 (2 m); Fluss im Süden, Stadt am Nordhang */
  const GELAENDE = { n: 201, groesse: 400 };
  const FLUSS = { breite: 16, tiefe: 1.5 };
  const STADT = { x: 30, y: 15, b: 340, h: 240, nx: 7, ny: 5 };
  /** Regen: Beschleunigung je Schritt = −A · Gefälle, Dämpfung je Schritt (Wald stärker) → Endgeschwindigkeit A · Gefälle / Dämpfung;
      größte Geschwindigkeit m/Schritt; Wegpunkt alle 10 Schritte (Paper) */
  const REGEN = { A: 2, daempfung: 0.2, wald: 0.6, vmax: 4, aufzeichnung: 10 };
  /** Maßnahmen: Anheben je Klick (m), Graben (Tiefe, halbe Breite in m), Aufforstung (Radius in m) */
  const MASSNAHME = { anheben: 0.5, maxAnheben: 3, grabenTiefe: 1.5, grabenRadius: 2.5, waldRadius: 12 };

  /* ---------------------------------------------------------------- Gelände mit Fluss */
  /** Mittellinie des Flusses (y in Abhängigkeit von x) */
  const flussY = (x, phase) => GELAENDE.groesse * 0.78 + 14 * Math.sin(2 * Math.PI * 1.3 * x / GELAENDE.groesse + phase);

  /** flaches Tal: Flussrinne (−1,5 m), Uferwall, Nordhang leicht konkav (Stadt), kurzer Südhang, Rauschen ±0,7 m.
      Höhen in m über dem Normalwasserstand (0). → {n, groesse, zelle, h, min, max, fluss: Uint8Array (Rinne), phase} */
  function tal(zufall) {
    const { n, groesse } = GELAENDE, z = groesse / (n - 1), N = Szenen.rauschen(zufall, n, 4), phase = zufall() * 2 * Math.PI;
    const h = new Float64Array(n * n), fluss = new Uint8Array(n * n), w2 = FLUSS.breite / 2;
    let mn = Infinity, mx = -Infinity;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = i * z, y = j * z, dy = y - flussY(x, phase), d = Math.abs(dy), k = j * n + i;
      let v;
      if (d < w2) { v = -FLUSS.tiefe * (1 - (d / w2) * (d / w2)); fluss[k] = 1; }
      else if (dy < 0) { const e = d - w2; v = 0.026 * e + 0.0001 * e * e + 0.9 * Math.exp(-(((e - 7) / 5) ** 2)); }
      else { const e = d - w2; v = 0.1 * e + 0.5 * Math.exp(-(((e - 6) / 4) ** 2)); }
      if (!fluss[k]) v += 1.4 * (N(x / groesse * 5, y / groesse * 5) - 0.5) * Math.min(1, (d - w2) / 10);
      h[k] = v; if (v < mn) mn = v; if (v > mx) mx = v;
    }
    return { n, groesse, zelle: z, h, min: mn, max: mx, fluss, phase };
  }
  /** Gitterpunkt am nächsten zu (x, y) */
  const punktIndex = (G, x, y) => {
    const i = Math.max(0, Math.min(G.n - 1, Math.round(x / G.zelle))), j = Math.max(0, Math.min(G.n - 1, Math.round(y / G.zelle)));
    return j * G.n + i;
  };

  /** Überlaufhöhe W je Gitterpunkt (Priority-Flood vom Fluss aus, Vierer-Nachbarschaft; Raster.ueberlauf in ../_gemeinsam/raster.js):
      W = max(h, kleinstes W eines Nachbarn auf dem Weg zum Fluss). Bei Pegel L steht Wasser an jedem Punkt mit W < L – auch hinter
      Wällen erst, wenn L den Wall übersteigt. */
  const ueberlauf = G => Raster.ueberlauf(G.h, G.n, G.n, G.fluss);

  /* ---------------------------------------------------------------- Stadt auf dem Gelände */
  function verschiebe(P, dx, dy) { return P.map(q => [q[0] + dx, q[1] + dy]); }
  /** Beispielstadt (Szenen.stadt) am Nordhang; Gebäude mit Fußpunkt (Gelände am Schwerpunkt), Straßen in Segmenten */
  function stadt(zufall, G) {
    const S = Szenen.stadt(zufall, { b: STADT.b, h: STADT.h, nx: STADT.nx, ny: STADT.ny, kirche: false });
    const geb = S.gebaeude.map(g => verschiebe(g, STADT.x, STADT.y));
    const gebaeude = geb.map(g => {
      const c = Geo.schwerpunkt(g);
      return { poly: g, c, flaeche: Geo.flaeche(g), bb: Geo.bbox(g), grund: Szenen.hoehe(G, c[0], c[1]), extra: 0, punkt: punktIndex(G, c[0], c[1]) };
    });
    const strassen = S.strassen.map(s => {
      const a = [s[0][0] + STADT.x, s[0][1] + STADT.y], b = [s[1][0] + STADT.x, s[1][1] + STADT.y], L = Geo.abstand(a, b), m = Math.max(1, Math.ceil(L / 2));
      const proben = []; for (let t = 0; t <= m; t++) { const q = Geo.lerp(a, b, t / m); proben.push(punktIndex(G, q[0], q[1])); }
      return { a, b, laenge: L, proben };
    });
    return { gebaeude, strassen, platz: S.platz ? verschiebe(S.platz, STADT.x, STADT.y) : null };
  }
  /** Gitterpunkte in Gebäuden (Index + 1 des Gebäudes, 0 = frei) – Hindernisse für den Regen */
  function gebaeudeMaske(G, gebaeude) {
    const M = new Int32Array(G.n * G.n), z = G.zelle;
    gebaeude.forEach((g, gi) => {
      const i0 = Math.max(0, Math.floor(g.bb.x0 / z)), i1 = Math.min(G.n - 1, Math.ceil(g.bb.x1 / z));
      const j0 = Math.max(0, Math.floor(g.bb.y0 / z)), j1 = Math.min(G.n - 1, Math.ceil(g.bb.y1 / z));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Geo.punktInPoly([i * z, j * z], g.poly)) M[j * G.n + i] = gi + 1;
    });
    return M;
  }

  /* ---------------------------------------------------------------- Pegel */
  /** Pegelstände: L_k = Start + k · dz für k = 0 … N (dz in m) */
  function pegelStufen(p) {
    const dz = Math.max(0.01, p.schrittweite / 100), N = Math.max(1, Math.round((p.maxpegel - p.startpegel) / dz - 1e-9));
    return { start: p.startpegel, dz, N };
  }
  const pegelBei = (S, k) => S.start + k * S.dz;
  /** erster Schritt k, bei dem der Pegel die Höhe F erreicht (L_k ≥ F); 0, wenn schon der Startpegel reicht; Infinity für F = ∞ */
  function ersterSchritt(S, F) { return isFinite(F) ? Math.max(0, Math.ceil((F - S.start) / S.dz - 1e-9)) : Infinity; }
  /** erster Schritt k, bei dem an einem Geländepunkt mit Überlaufhöhe W Wasser steht (L_k > W) */
  function ersterSchrittZelle(S, W) { return isFinite(W) ? Math.max(0, Math.floor((W - S.start) / S.dz + 1e-9) + 1) : Infinity; }
  /** Überflutungshöhe eines Gebäudes: Oberkante Sockel = Fußpunkt + Sockelhöhe + Anhebung, mindestens die Überlaufhöhe am Fußpunkt */
  const oberkante = (g, p) => g.grund + p.sockel + g.extra;
  const gebaeudeHoehe = (z, g, p) => Math.max(oberkante(g, p), z.W[g.punkt]);
  /** Überflutungshöhe eines Straßensegments: kleinste Überlaufhöhe seiner Punkte (der tiefste Punkt, den das Wasser erreicht) */
  function strassenHoehe(z, s) { let m = Infinity; for (const k of s.proben) if (z.W[k] < m) m = z.W[k]; return m; }

  /** Überflutungsschritte neu rechnen (nach Maßnahmen oder Parametern): je Gebäude/Segment der erste Schritt mit Wasser */
  function rechnePegel(z, p) {
    z.stufen = pegelStufen(p);
    z.kGeb = z.gebaeude.map(g => ersterSchritt(z.stufen, gebaeudeHoehe(z, g, p)));
    z.kStr = z.strassen.map(s => ersterSchritt(z.stufen, strassenHoehe(z, s)));
    // Zahl überfluteter Gebäude je Pegelstand (Kurve)
    const N = z.stufen.N, kurve = new Int32Array(N + 1);
    for (const k of z.kGeb) if (k <= N) kurve[k]++;
    for (let k = 1; k <= N; k++) kurve[k] += kurve[k - 1];
    z.kurve = kurve;
  }
  /** Tiefenstufe 1 … K+1 eines Elements mit erstem Überflutungsschritt kE beim Schritt k (0 = trocken); K = Schwelle / Schrittweite */
  function tiefenStufe(kE, k, p) {
    if (!(k >= kE)) return 0;
    const K = Math.max(1, Math.round(p.tiefenschwelle / p.schrittweite));
    return Math.min(K, k - kE) + 1;
  }
  /** mittleres Risiko = Anteil der Pegelstände 0 … N, in denen das Element überflutet ist */
  function mittleresRisiko(kE, N) { return kE <= N ? (N - kE + 1) / (N + 1) : 0; }

  /* ---------------------------------------------------------------- Regen */
  /** Partikel gleichmäßig über das Gelände, nicht in Gebäuden und nicht im Fluss */
  function regenPartikel(z, n, zufall) {
    const P = [];
    let versuche = 0;
    while (P.length < n && versuche++ < n * 20) {
      const x = zufall() * z.G.groesse, y = zufall() * z.G.groesse, k = punktIndex(z.G, x, y);
      if (z.maske[k] || z.G.fluss[k]) continue;
      P.push({ x, y, vx: 0, vy: 0, aktiv: true, weg: [[x, y]] });
    }
    return P;
  }
  /** ein Schritt eines Partikels: Hangabtrieb, Dämpfung (Wald stärker), Gebäude als Hindernis (gleitet an der Kante entlang),
      im Fluss abgeflossen */
  function bewege(z, q) {
    if (!q.aktiv) return;
    const G = z.G, g = Szenen.gradient(G, q.x, q.y), k0 = punktIndex(G, q.x, q.y), d = z.wald[k0] ? REGEN.wald : REGEN.daempfung;
    q.vx = q.vx * (1 - d) - REGEN.A * g[0]; q.vy = q.vy * (1 - d) - REGEN.A * g[1];
    const v = Math.hypot(q.vx, q.vy); if (v > REGEN.vmax) { q.vx *= REGEN.vmax / v; q.vy *= REGEN.vmax / v; }
    const frei = (x, y) => x >= 0 && y >= 0 && x <= G.groesse && y <= G.groesse && !z.maske[punktIndex(G, x, y)];
    let x = q.x + q.vx, y = q.y + q.vy;
    if (!frei(x, y)) {
      if (frei(q.x + q.vx, q.y)) { y = q.y; q.vy = 0; }
      else if (frei(q.x, q.y + q.vy)) { x = q.x; q.vx = 0; }
      else { x = q.x; y = q.y; q.vx = 0; q.vy = 0; }
    }
    q.x = x; q.y = y;
    if (G.fluss[punktIndex(G, x, y)]) q.aktiv = false;
  }
  /** Abstand eines Punkts zu einem Polygon (0 innen) */
  function abstandPoly(q, P) {
    if (Geo.punktInPoly(q, P)) return 0;
    let d = Infinity; for (let i = 0; i < P.length; i++) d = Math.min(d, Geo.abstandSegment(q, P[i], P[(i + 1) % P.length]).d);
    return d;
  }
  /** Überflutungsrisiko durch Regen: je Gebäude Partikel im Umkreis r / Grundfläche, je Segment Partikel im Umkreis r / (2rL + πr²).
      Gezählt werden die Partikel, die noch auf dem Gelände liegen (nicht abgeflossen). */
  function regenRisiko(z, r) {
    const RG = new Float64Array(z.gebaeude.length), RS = new Float64Array(z.strassen.length);
    for (const q of z.regen) {
      if (!q.aktiv) continue;
      const pt = [q.x, q.y];
      z.gebaeude.forEach((g, i) => {
        if (q.x < g.bb.x0 - r || q.x > g.bb.x1 + r || q.y < g.bb.y0 - r || q.y > g.bb.y1 + r) return;
        if (abstandPoly(pt, g.poly) <= r) RG[i]++;
      });
      z.strassen.forEach((s, i) => {
        if (q.x < Math.min(s.a[0], s.b[0]) - r || q.x > Math.max(s.a[0], s.b[0]) + r || q.y < Math.min(s.a[1], s.b[1]) - r || q.y > Math.max(s.a[1], s.b[1]) + r) return;
        if (Geo.abstandSegment(pt, s.a, s.b).d <= r) RS[i]++;
      });
    }
    z.gebaeude.forEach((g, i) => { RG[i] /= g.flaeche; });
    z.strassen.forEach((s, i) => { RS[i] /= 2 * r * s.laenge + Math.PI * r * r; });
    return { gebaeude: RG, strassen: RS };
  }
  /** Erosion: Gitterpunkte entlang der Wegabschnitte (alle 10 Schritte), deren Länge die Schwelle erreicht → Fläche in m² */
  function markiereErosion(z, a, b, schwelle) {
    if (Geo.abstand(a, b) < schwelle) return false;
    const G = z.G, m = Math.max(1, Math.ceil(Geo.abstand(a, b) / G.zelle));
    for (let t = 0; t <= m; t++) { const q = Geo.lerp(a, b, t / m), k = punktIndex(G, q[0], q[1]); if (!z.erosion[k]) { z.erosion[k] = 1; z.erosionsPunkte++; } }
    return true;
  }

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const G = tal(zufall), S = stadt(zufall, G);
    const z = { t: 0, G, h0: G.h.slice(), b: G.groesse, h: G.groesse, gebaeude: S.gebaeude, strassen: S.strassen, platz: S.platz,
                graeben: [], baeume: [], wald: new Uint8Array(G.n * G.n), zufall, version: 0 };
    z.maske = gebaeudeMaske(G, z.gebaeude);
    z.W = ueberlauf(G);
    rechnePegel(z, p);
    neuLauf(z, p);
    return z;
  }

  /** Lauf neu beginnen (t = 0), Maßnahmen bleiben: Pegel auf Start, Regenpartikel neu verteilt */
  function neuLauf(z, p) {
    z.t = 0; z.k = 0;
    z.regen = regenPartikel(z, Math.max(0, Math.round(p.partikel)), z.zufall);
    z.erosion = new Uint8Array(z.G.n * z.G.n); z.erosionsPunkte = 0;
    z.risiko = regenRisiko(z, p.umkreis);
    rechnePegel(z, p);
  }

  /** aktueller Pegel in m */
  const pegel = z => pegelBei(z.stufen, z.k);
  const fertig = (z, p) => p.modus === "regen" ? z.t >= p.iterationen : z.k >= z.stufen.N;

  /** Ein Schritt: im Pegelmodus ein Pegelschritt (+ 8 cm), im Regenmodus ein Partikelschritt; erhöht z.t */
  function schritt(z, p) {
    if (p.modus === "regen") {
      if (z.t < p.iterationen) {
        for (const q of z.regen) bewege(z, q);
        if ((z.t + 1) % REGEN.aufzeichnung === 0) for (const q of z.regen) {
          const a = q.weg[q.weg.length - 1], b = [q.x, q.y];
          if (a[0] !== b[0] || a[1] !== b[1]) { q.weg.push(b); markiereErosion(z, a, b, p.erosion); }
        }
        z.risiko = regenRisiko(z, p.umkreis);
      }
    } else if (z.k < z.stufen.N) z.k++;
    z.t++;
    return z;
  }

  /** Auswertung beim aktuellen Pegel: überflutete Gebäude/Segmente, davon mit voller Tiefe, überflutete Fläche (ha) */
  function auswertung(z, p) {
    const k = z.k, K = Math.max(1, Math.round(p.tiefenschwelle / p.schrittweite)) + 1, L = pegel(z);
    let geb = 0, tief = 0, str = 0, flaeche = 0, risiko = 0, ueber50 = 0, rStr = 0;
    z.kGeb.forEach(kE => { const s = tiefenStufe(kE, k, p); if (s) { geb++; if (s >= K) tief++; } const r = mittleresRisiko(kE, z.stufen.N); risiko += r; if (r > 0.5) ueber50++; });
    z.kStr.forEach(kE => { if (k >= kE) str++; rStr += mittleresRisiko(kE, z.stufen.N); });
    for (let i = 0; i < z.W.length; i++) if (z.W[i] < L && !z.G.fluss[i]) flaeche++;
    return { geb, tief, str, flaeche: flaeche * z.G.zelle * z.G.zelle / 1e4, risiko: risiko / (z.gebaeude.length || 1), ueber50,
             risikoStr: rStr / (z.strassen.length || 1), maxGeb: z.kurve[z.stufen.N] };
  }
  /** Auswertung des Regens */
  function regenAuswertung(z) {
    let aktiv = 0; for (const q of z.regen) if (q.aktiv) aktiv++;
    let mit = 0, hoch = 0, mx = 0; for (const r of z.risiko.gebaeude) { if (r > 0) mit++; if (r >= 0.05) hoch++; if (r > mx) mx = r; }
    let str = 0; for (const r of z.risiko.strassen) if (r > 0) str++;
    return { aktiv, abgeflossen: z.regen.length - aktiv, mit, hoch, max: mx, str, erosion: z.erosionsPunkte * z.G.zelle * z.G.zelle / 1e4 };
  }

  /** Parameter ohne Neustart: Sockel/Tiefenschwelle → nur neu auswerten; Pegelbereich, Modus, Partikel → Lauf neu (Maßnahmen bleiben) */
  function aendere(z, p, id) {
    if (id === "sockel") rechnePegel(z, p);
    else if (["startpegel", "maxpegel", "schrittweite", "modus", "partikel", "iterationen"].includes(id)) neuLauf(z, p);
    else if (id === "umkreis") z.risiko = regenRisiko(z, p.umkreis);
  }

  /* ---------------------------------------------------------------- Maßnahmen */
  /** Gebäude unter dem Punkt q oder −1 */
  function gebaeudeBei(z, q) { return z.gebaeude.findIndex(g => q[0] >= g.bb.x0 && q[0] <= g.bb.x1 && q[1] >= g.bb.y0 && q[1] <= g.bb.y1 && Geo.punktInPoly(q, g.poly)); }
  /** Gebäude anheben (+0,5 m je Klick, höchstens 3 m) oder zurücksetzen; true, wenn ein Gebäude getroffen wurde */
  function hebeAn(z, p, q, zurueck = false) {
    const i = gebaeudeBei(z, q); if (i < 0) return false;
    const g = z.gebaeude[i]; g.extra = zurueck ? 0 : Math.min(MASSNAHME.maxAnheben, g.extra + MASSNAHME.anheben);
    rechnePegel(z, p); return true;
  }
  /** Graben: entlang der Strecke a–b das Gelände auf (Ursprungshöhe − 1,5 m) absenken, halbe Breite 2,5 m; Überlauf neu */
  function grabe(z, p, a, b) {
    const G = z.G, r = MASSNAHME.grabenRadius, zz = G.zelle;
    const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - r) / zz)), i1 = Math.min(G.n - 1, Math.ceil((Math.max(a[0], b[0]) + r) / zz));
    const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - r) / zz)), j1 = Math.min(G.n - 1, Math.ceil((Math.max(a[1], b[1]) + r) / zz));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * G.n + i, d = Geo.abstandSegment([i * zz, j * zz], a, b).d;
      if (d <= r && !z.maske[k]) G.h[k] = Math.min(G.h[k], z.h0[k] - MASSNAHME.grabenTiefe * (1 - 0.5 * (d / r) * (d / r)));
    }
    let mn = Infinity; for (const v of G.h) if (v < mn) mn = v; G.min = mn;
    z.W = ueberlauf(G); rechnePegel(z, p); z.version++;
  }
  /** Graben beginnen (neue Linie) oder fortsetzen (Punkt anhängen, ab 3 m Abstand) */
  function graben(z, p, q, neuerGraben) {
    if (neuerGraben || !z.graeben.length) { z.graeben.push([q.slice()]); grabe(z, p, q, q); return; }
    const L = z.graeben[z.graeben.length - 1], a = L[L.length - 1];
    if (Geo.abstand(a, q) < 3) return;
    L.push(q.slice()); grabe(z, p, a, q);
  }
  /** Aufforsten: Gitterpunkte im Kreis (12 m) werden Wald (bremst den Abfluss); Bäume im 4-m-Raster für die Zeichnung */
  function forste(z, q) {
    const G = z.G, r = MASSNAHME.waldRadius, zz = G.zelle;
    for (let j = Math.max(0, Math.floor((q[1] - r) / zz)); j <= Math.min(G.n - 1, Math.ceil((q[1] + r) / zz)); j++)
      for (let i = Math.max(0, Math.floor((q[0] - r) / zz)); i <= Math.min(G.n - 1, Math.ceil((q[0] + r) / zz)); i++) {
        const k = j * G.n + i;
        if (Math.hypot(i * zz - q[0], j * zz - q[1]) > r || z.maske[k] || G.fluss[k] || z.wald[k]) continue;
        z.wald[k] = 1;
        if (i % 2 === 0 && j % 2 === 0) z.baeume.push([i * zz + ((j * 7 + i * 3) % 5 - 2) * 0.4, j * zz + ((i * 5 + j) % 5 - 2) * 0.4]);
      }
    z.version++;
  }
  /** alle Maßnahmen zurücknehmen */
  function massnahmenWeg(z, p) {
    z.G.h.set(z.h0); z.graeben = []; z.baeume = []; z.wald.fill(0);
    for (const g of z.gebaeude) g.extra = 0;
    z.W = ueberlauf(z.G); rechnePegel(z, p); z.version++;
  }

  return { STANDARD, GELAENDE, FLUSS, STADT, REGEN, MASSNAHME, flussY, tal, punktIndex, ueberlauf, stadt, gebaeudeMaske,
           pegelStufen, pegelBei, ersterSchritt, ersterSchrittZelle, oberkante, gebaeudeHoehe, strassenHoehe, rechnePegel, tiefenStufe, mittleresRisiko,
           regenPartikel, bewege, abstandPoly, regenRisiko, markiereErosion, erzeuge, neuLauf, pegel, fertig, schritt, auswertung,
           regenAuswertung, aendere, gebaeudeBei, hebeAn, grabe, graben, forste, massnahmenWeg };
});
