/* Isovist 3D · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Isovist 3D“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Bielik, Ekaterina Fuchkina).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie in der .gh-Datei: Die Komponente „Isovist3D“ schickt vom Standpunkt (Vantage Point) ein Strahlenbündel aus –
   Horizontal Precision × Vertical Precision Strahlen (beide am Regler „Precision“) über den horizontalen Blickwinkel um die
   Blickrichtung (Unit X, um Unit Z gedreht um den Regler in Grad) und den vertikalen Blickwinkel um die Waagerechte, verschoben
   um „Vertical Angle Offset“. Jeder Strahl endet am ersten Hindernis (Obstacle Surfaces = Gebäude), am Boden (Ground at zero:
   Ebene z = 0) oder bei der Reichweite (Viewing Range). Ausgänge: Strahlen (Rays Geometry), Kategorie je Strahl (Rays to Vantage
   points, Zweige 0 = Himmel, 1 = Hindernis, 2 = Boden), Länge je Strahl (Rays Length), getroffenes Objekt je Strahl (Surfaces to
   Rays), Treffer je Gebäude (Object Visibility), Volumen. Die Gruppen der Datei werten das aus: Anteile der Kategorien
   (List Length ÷ Mass Addition), Strahllängenstatistik (Sort, Average, Mass Addition, Standardabweichung über (x−y)²) und die
   Färbung der Gebäude (Bounds → Gradient für Treffer ≠ 0, graue Farbe für Treffer = 0).

   Die Gebäude sind Prismen über den Grundrissen der Beispielstadt. Weil alle Strahlen einer Spalte (gleiche Himmelsrichtung)
   denselben Grundriss-Strahl haben, schneidet das Modell je Spalte einmal in 2D mit allen Grundrissen (Eintritts-/Austritts-
   abstand je Prisma) und prüft dann je Neigungswinkel nur noch die Höhe – schnell genug für flüssige Bedienung. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";
  const D2R = Math.PI / 180;

  /** Voreinstellungen der .gh-Datei: Viewing Range 100 (0…360), Precision 90 (0…1000; hier 1…400), Horizontal Viewing Angle 120
      (0…360), Vertical Viewing Angle 60 (0…180), Vertical Angle Offset 0 (−100…100), Blickrichtung 58° (0…360), Calculate Isovist
      Geometry aus, Ground at zero for CPU an. Ergänzt: Augenhöhe (in der Datei liegt der Standpunkt bei z = 0), Ablauf je Schritt. */
  const STANDARD = { reichweite: 100, praezision: 90, hwinkel: 120, vwinkel: 60, versatz: 0, richtung: 58, geometrie: false, boden: true,
                     augenhoehe: 1.6, ablauf: "drehen", drehschritt: 2, schrittweite: 0.004 };
  /** Kategorien des Panels „Filter rays by type of obstacle colision“: 0 = no obstacle (sky), 1 = obstacle, 2 = floor */
  const HIMMEL = 0, HINDERNIS = 1, BODEN = 2;
  /** Geschosshöhe der Beispielstadt (m), Geschosse 3…7; Kirchenschiff und Turm (m) */
  const GESCHOSS = 3.2, SCHIFF = 18, TURM = 42;
  /** Farbverlauf der Gradient-Komponente der .gh-Datei (Farbe, Lage des Griffs) und die beiden Colour Swatches */
  const VERLAUF = { farben: [[0, 0, 139], [50, 178, 206], [87, 166, 31], [255, 215, 0], [255, 0, 0]], faktoren: [0, 0.0341, 0.0977, 0.1977, 0.5614] };
  const GRAU = [173, 173, 173], GELB = [255, 204, 0];

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

  /* ---------------------------------------------------------------- Richtungen */
  /** Blickrichtung der .gh-Datei: Unit X um Unit Z gedreht um a Grad (gegen den Uhrzeigersinn, 0 = Osten, 90 = Norden).
      Modellkoordinaten: x nach Osten, y nach Süden (wie der Plan auf dem Bildschirm), z nach oben → [dx, dy] */
  const grundrichtung = a => [Math.cos(a * D2R), -Math.sin(a * D2R)];
  /** Blickrichtung in Grad (0…360), die vom Punkt o zum Punkt q zeigt */
  function richtungZu(o, q) { const a = Math.atan2(-(q[1] - o[1]), q[0] - o[0]) / D2R; return ((a % 360) + 360) % 360; }

  /** Winkel des Strahlenbündels: nh Himmelsrichtungen über hwinkel um die Blickrichtung, nv Neigungen über vwinkel um versatz.
      Jeder Strahl steht in der Mitte seiner Zelle (so überdecken die Strahlen den Blickwinkel gleichmäßig, bei 360° ohne doppelten
      Strahl). Neigungen werden auf −90…90° begrenzt. raum[j]: Raumwinkel einer Zelle der Zeile j (sr), Summe = Raumwinkel des Bündels.
      → {nh, nv, azimut (Grad), neigung (Grad), raum} */
  function buendel(p, blick) {
    const nh = Math.max(1, Math.round(p.praezision)), nv = nh;   // Horizontal Precision und Vertical Precision hängen am selben Regler
    const hw = Math.max(0, Math.min(360, p.hwinkel)), vw = Math.max(0, Math.min(180, p.vwinkel));
    const azimut = new Float64Array(nh), neigung = new Float64Array(nv), raum = new Float64Array(nv);
    for (let i = 0; i < nh; i++) azimut[i] = blick - hw / 2 + hw * (i + 0.5) / nh;
    const dphi = hw * D2R / nh, kl = x => Math.max(-90, Math.min(90, x));
    for (let j = 0; j < nv; j++) {
      const u = p.versatz - vw / 2 + vw * j / nv, o = p.versatz - vw / 2 + vw * (j + 1) / nv;
      neigung[j] = kl(p.versatz - vw / 2 + vw * (j + 0.5) / nv);
      raum[j] = dphi * Math.abs(Math.sin(kl(o) * D2R) - Math.sin(kl(u) * D2R));
    }
    return { nh, nv, azimut, neigung, raum };
  }

  /* ---------------------------------------------------------------- Szene */
  /** Prismen der Beispielstadt: je Gebäude der Grundriss mit 3…7 Geschossen à 3,2 m; die Kirche (letztes Gebäude) als Schiff
      (18 m) mit Turm (42 m) an der Westseite – ein Objekt aus zwei Prismen. zufall wird erst nach der Stadt benutzt.
      → {objekte: [{name, prismen: [i…], huelle (m²)}], prismen: [{poly, H, obj, bb}]} */
  function baue(szene, zufall) {
    const objekte = [], prismen = [];
    const neu = (poly, H, obj) => { prismen.push({ poly, H, obj, bb: Geo.bbox(poly) }); objekte[obj].prismen.push(prismen.length - 1); };
    szene.gebaeude.forEach((g, i) => {
      const kirche = szene.kirche && i === szene.gebaeude.length - 1;
      objekte.push({ name: kirche ? "kirche" : "#" + (i + 1), prismen: [], huelle: 0, geschosse: 0 });
      if (!kirche) { const n = 3 + zufall.ganz(5); objekte[i].geschosse = n; neu(g, n * GESCHOSS, i); return; }
      neu(g, SCHIFF, i);
      const bb = Geo.bbox(g), hh = bb.h, x0 = bb.x0, y0 = bb.y0 + hh * 0.2, s = hh * 0.6;
      neu([[x0, y0], [x0 + s, y0], [x0 + s, y0 + s], [x0, y0 + s]], TURM, i);
    });
    for (const o of objekte) o.huelle = o.prismen.reduce((a, k) => a + Geo.umfang(prismen[k].poly) * prismen[k].H + Geo.flaeche(prismen[k].poly), 0);
    return { objekte, prismen };
  }

  /* ---------------------------------------------------------------- Strahlen */
  /** Abschnitte eines Grundriss-Strahls o + t·u (t = waagerechter Abstand) im Inneren eines Polygons: Schnitte mit allen Kanten,
      sortiert, paarweise [ein, aus]. Liegt o im Polygon, beginnt der erste Abschnitt bei 0. → [t0, t1, t2, t3, …] */
  function abschnitte(o, u, poly) {
    const T = [];
    for (let i = 0, n = poly.length; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1];
      const den = u[0] * ey - u[1] * ex;
      if (Math.abs(den) < 1e-12) continue;
      const ax = a[0] - o[0], ay = a[1] - o[1];
      const t = (ax * ey - ay * ex) / den, w = (ax * u[1] - ay * u[0]) / den;
      if (t >= 0 && w >= 0 && w < 1) T.push(t);
    }
    T.sort((x, y) => x - y);
    if (Geo.punktInPoly(o, poly)) T.unshift(0);
    if (T.length % 2) T.pop();
    return T;
  }

  /** Erster Treffer eines geneigten Strahls in einem Abschnitt [ein, aus] eines Prismas der Höhe H: waagerechter Abstand t mit
      0 ≤ e + k·t ≤ H (e Augenhöhe, k = tan Neigung), t ≤ tmax; −1, wenn keiner. Trifft der Strahl von oben, ist es das Dach. */
  function trefferHoehe(ein, aus, H, e, k, tmax) {
    let lo = 0, hi = Infinity;
    if (Math.abs(k) < 1e-12) { if (e < 0 || e > H) return -1; }
    else { const ta = -e / k, tb = (H - e) / k; lo = Math.min(ta, tb); hi = Math.max(ta, tb); }
    const t = Math.max(ein, lo);
    return t <= Math.min(aus, hi, tmax) ? t : -1;
  }

  /** Das Strahlenbündel der Komponente Isovist3D vom Standpunkt o (Augenhöhe e) in Blickrichtung blick (Grad).
      Strahl r = i·nv + j (Spalte i = Himmelsrichtung, Zeile j = Neigung). → {nh, nv, n, kat, len, obj, end, treffer, B} */
  function strahlen(o, e, blick, p, S) {
    const B = buendel(p, blick), n = B.nh * B.nv, R = Math.max(0, p.reichweite);
    const kat = new Uint8Array(n), len = new Float32Array(n), obj = new Int16Array(n).fill(-1), end = new Float32Array(3 * n);
    const treffer = new Int32Array(S.objekte.length);
    // Vorfilter: nur Prismen, deren Umriss-Rechteck in Reichweite liegt
    const kand = S.prismen.filter(q => Math.hypot(Math.max(q.bb.x0 - o[0], 0, o[0] - q.bb.x1), Math.max(q.bb.y0 - o[1], 0, o[1] - q.bb.y1)) <= R);
    const cosN = B.neigung.map(a => Math.cos(a * D2R)), tanN = B.neigung.map(a => Math.tan(a * D2R)), sinN = B.neigung.map(a => Math.sin(a * D2R));
    for (let i = 0; i < B.nh; i++) {
      const u = grundrichtung(B.azimut[i]);
      // Abschnitte aller Prismen auf diesem Grundriss-Strahl: [ein, aus, H, obj], nach ein sortiert
      const A = [];
      for (const q of kand) { const T = abschnitte(o, u, q.poly); for (let m = 0; m < T.length; m += 2) if (T[m] <= R) A.push([T[m], T[m + 1], q.H, q.obj]); }
      A.sort((x, y) => x[0] - y[0]);
      for (let j = 0; j < B.nv; j++) {
        const r = i * B.nv + j, c = cosN[j], k = tanN[j];
        let s = R, typ = HIMMEL, wer = -1;
        if (c < 1e-9) {                                        // senkrecht: nach oben Himmel, nach unten Boden
          if (sinN[j] < 0 && p.boden && e <= R) { s = e; typ = BODEN; }
        } else {
          const tmax = R * c;
          let best = Infinity;
          for (const a of A) {
            if (a[0] > best || a[0] > tmax) break;
            const t = trefferHoehe(a[0], a[1], a[2], e, k, tmax);
            if (t >= 0 && t < best) { best = t; wer = a[3]; }
          }
          if (p.boden && k < 0) { const tb = -e / k; if (tb <= tmax && tb < best) { best = tb; wer = -1; typ = BODEN; } }
          if (best < Infinity) { s = best / c; if (wer >= 0) typ = HINDERNIS; }
        }
        kat[r] = typ; len[r] = s; obj[r] = wer;
        if (wer >= 0) treffer[wer]++;
        end[3 * r] = o[0] + s * c * u[0]; end[3 * r + 1] = o[1] + s * c * u[1]; end[3 * r + 2] = e + s * sinN[j];
      }
    }
    return { nh: B.nh, nv: B.nv, n, kat, len, obj, end, treffer, B };
  }

  /* ---------------------------------------------------------------- Auswertung wie in den Gruppen der .gh-Datei */
  /** Gruppe „ground to obstacle to sky visibility“: Anteil der Strahlen je Kategorie (List Length je Zweig ÷ Mass Addition);
      daneben der Anteil am Raumwinkel des Bündels (gleichmäßig gewichtet, unabhängig von der Strahlendichte am Zenit) */
  function anteile(E) {
    const zahl = [0, 0, 0], raum = [0, 0, 0];
    let summe = 0;
    for (let r = 0; r < E.n; r++) { const w = E.B.raum[r % E.nv]; zahl[E.kat[r]]++; raum[E.kat[r]] += w; summe += w; }
    return { zahl, anteil: zahl.map(x => E.n ? x / E.n : 0), raum: raum.map(x => summe > 0 ? x / summe : 0), raumwinkel: summe };
  }
  /** Gruppe „ray length statistics“: Sort → kleinster und (Reverse) größter Wert, Average, Mass Addition, Standardabweichung
      √(Σ(x − Mittel)² ÷ Zahl der Strahlen); dazu der Median */
  function statistik(len) {
    const n = len.length;
    if (!n) return { n: 0, min: 0, max: 0, mittel: 0, summe: 0, std: 0, median: 0 };
    const s = Float64Array.from(len).sort();
    let summe = 0; for (let i = 0; i < n; i++) summe += s[i];
    const mittel = summe / n; let q = 0; for (let i = 0; i < n; i++) q += (s[i] - mittel) * (s[i] - mittel);
    return { n, min: s[0], max: s[n - 1], mittel, summe, std: Math.sqrt(q / n), median: n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 };
  }
  /** Volumen des Isovists aus den Strahlen: Σ Länge³ ÷ 3 · Raumwinkel der Zelle (m³) – genähert wie der Ausgang „Volume“ */
  function volumen(E) { let v = 0; for (let r = 0; r < E.n; r++) v += E.len[r] ** 3 / 3 * E.B.raum[r % E.nv]; return v; }
  /** Gruppe „mapping results on building breps (building visibility)“: Wert je Gebäude (Object Visibility = Treffer, wahlweise je
      100 m² Hüllfläche), Bounds über alle Gebäude; t ∈ [0, 1] für den Gradient, −1 für Treffer = 0 (grau) */
  function gebaeudeWerte(E, S, mass = "treffer") {
    const n = S.objekte.length, w = new Float64Array(n), t = new Float64Array(n);
    for (let g = 0; g < n; g++) w[g] = mass === "huelle" ? (S.objekte[g].huelle > 0 ? E.treffer[g] / S.objekte[g].huelle * 100 : 0) : E.treffer[g];
    let lo = Infinity, hi = -Infinity;
    for (let g = 0; g < n; g++) { if (w[g] < lo) lo = w[g]; if (w[g] > hi) hi = w[g]; }
    for (let g = 0; g < n; g++) t[g] = E.treffer[g] === 0 ? -1 : (hi > lo ? (w[g] - lo) / (hi - lo) : 1);
    return { wert: w, t, lo: n ? lo : 0, hi: n ? hi : 0 };
  }

  /* ---------------------------------------------------------------- Weg für den wandernden Standpunkt */
  /** Rundweg: der Umriss der Platzzelle auf den Straßenmitten um den Platz, geschlossen */
  function rundweg(szene) {
    const o = szene.opt, pi = Math.floor((o.nx - 1) / 2), pj = Math.floor((o.ny - 1) / 2);
    const Z = szene.zellen[pj * (o.nx - 1) + pi];
    return Z.concat([Z[0]]).map(q => q.slice());
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
  /** Neuer Zustand: Beispielstadt mit Gebäudehöhen, Standpunkt auf dem Platz südwestlich der Kirche */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = Szenen.stadt(zufall), S = baue(szene, zufall);
    const c = Geo.schwerpunkt(szene.platz), bb = Geo.bbox(szene.platz);
    const z = { t: 0, szene, b: szene.b, h: szene.h, S, pfad: rundweg(szene), anteil: 0, o: [c[0] - bb.b * 0.3, c[1] + bb.h * 0.32], blick: p.richtung, E: null };
    z.anteil = naechsterAnteil(z.pfad, z.o);
    rechne(z, p);
    return z;
  }
  /** Strahlen und Auswertung neu berechnen */
  function rechne(z, p) {
    z.E = strahlen(z.o, Math.max(0, p.augenhoehe), z.blick, p, z.S);
    z.A = anteile(z.E);
    z.L = statistik(z.E.len);
    z.V = volumen(z.E);
    return z;
  }
  /** Ein Schritt: „drehen“ – die Blickrichtung dreht um drehschritt Grad gegen den Uhrzeigersinn; „wandern“ – der Standpunkt geht
      um schrittweite den Rundweg um den Platz entlang und blickt in Gehrichtung. Erhöht z.t. */
  function schritt(z, p) {
    if (p.ablauf === "wandern") {
      z.anteil += p.schrittweite == null ? STANDARD.schrittweite : p.schrittweite;
      if (z.anteil >= 1) z.anteil -= Math.floor(z.anteil);
      const a = Szenen.aufPolylinie(z.pfad, z.anteil);
      z.o = a.p; z.blick = ((-a.richtung / D2R) % 360 + 360) % 360;
    } else z.blick = ((z.blick + (p.drehschritt == null ? STANDARD.drehschritt : p.drehschritt)) % 360 + 360) % 360;
    rechne(z, p);
    z.t++;
    return z;
  }
  /** Parameter ohne Neustart: der Regler Blickrichtung setzt die aktuelle Blickrichtung; reine Ansichtsparameter rechnen nicht neu */
  const ANSICHT = new Set(["drehung", "neigung", "zoom", "filter", "faerbung", "mass", "geometrie"]);
  function aendere(z, p, id) {
    if (id === "richtung") z.blick = p.richtung;
    if (!ANSICHT.has(id)) rechne(z, p);
  }

  /** liegt der Punkt in einem Gebäude? */
  function imGebaeude(z, q) { return z.S.prismen.some(r => Geo.punktInPoly(q, r.poly)); }
  /** Standpunkt frei versetzen (nicht in ein Gebäude, nicht außerhalb); der nächste Wanderschritt geht vom nächsten Wegpunkt weiter */
  function setzeStandpunkt(z, p, q) {
    if (q[0] < 0 || q[1] < 0 || q[0] > z.b || q[1] > z.h || imGebaeude(z, q)) return false;
    z.o = [q[0], q[1]]; z.anteil = naechsterAnteil(z.pfad, q); rechne(z, p); return true;
  }

  /** Kennzahlen der Gebäude: gesehene Gebäude, meistgesehenes Gebäude, Treffer der Kirche */
  function auswertung(z) {
    const T = z.E.treffer; let n = 0, best = -1;
    for (let g = 0; g < T.length; g++) { if (T[g] > 0) n++; if (best < 0 || T[g] > T[best]) best = g; }
    const k = z.szene.kirche ? z.S.objekte.length - 1 : -1;
    return { sichtbar: n, gebaeude: T.length, bester: best >= 0 && T[best] > 0 ? best : -1, kirche: k >= 0 ? T[k] : 0 };
  }

  return { STANDARD, HIMMEL, HINDERNIS, BODEN, GESCHOSS, SCHIFF, TURM, VERLAUF, GRAU, GELB, verlauf, grundrichtung, richtungZu, buendel,
           baue, abschnitte, trefferHoehe, strahlen, anteile, statistik, volumen, gebaeudeWerte, rundweg, naechsterAnteil,
           erzeuge, rechne, schritt, aendere, imGebaeude, setzeStandpunkt, auswertung };
});
