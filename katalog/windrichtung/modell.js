/* Windrichtung und Luftbelastung · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Wind Direction“ aus dem Parametric Planning Catalogue
   (DeCodingSpaces – Martin Dennemark, v. 1.0, 2020).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie in WindDirection.gh (nur Grasshopper-Standardkomponenten und ein kurzes GhPython-Skript):
   1. Windrose lesen (GhPython „jsonDB“ → values, angles = center_degrees − 180): Häufigkeit je Sektor,
      mit „Remap Numbers“ auf 0…1 bezogen auf den größten Sektor.
   2. Von der gewählten Parzelle (Parcel Index, „Wind From“) zu jeder Parzelle („Wind To“) einen Vektor
      zwischen den Schwerpunkten bilden (Vector 2Pt: Richtung und Länge).
   3. „check angle to each wind direction“: Winkel zwischen diesem Vektor und jeder Sektorrichtung (Angle, Degrees).
   4. „check if angle is within wind sector“: Winkel ≤ Sektorbreite · Faktor / 2 (Smaller Than, Faktor 1,25 –
      „if angle is between two wind directions, it will take both and calculate average“).
   5. „create weighted average of wind directions“: Weighted Average der Häufigkeiten der getroffenen Sektoren,
      gewichtet mit denselben Häufigkeiten → Σ f² / Σ f.
   6. Belastung („pollution“): die Häufigkeiten vorher mit dem Abfall über die Entfernung multiplizieren
      („multiply with falloff function“, Panel „Distance Falloff“ Exp(−0.02·x)).
   7. Färben (Gradient 0 … Max): Max = 1 für die Windrichtung, Max = Abfall bei der Reichweite (Falloff Radius) für die Belastung.
   Ein Schritt nimmt einen Teil eines Sektors (Takt); nach je „takt“ Schritten zählt ein Sektor mehr mit. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Toggle „windDirection: false pollution: true“ = false, Parcel Index 61 (0…100, List Item mit Wrap),
      Faktor 1,25 (0…10), Distance Falloff Exp(−0.02·x), Falloff Radius 432 (0…1000), WindRoseScale 400 (0…1000),
      Radial Extent R 5 (0…10), Drehregler 180 (0…1000). In der App dazu: Windrose (Beispiel), Wind From/To tauschen, Takt, Farbskala. */
  const STANDARD = { modus: "wind", rose: "weimar", parzelle: 61, tauschen: false, faktor: 1.25, abfallK: 0.02, radius: 432,
                     massstab: 400, ringe: 5, drehung: 180, takt: 6, kegel: true, skala: "gh" };

  /** Beispiel-Windrosen im Aufbau von windFrequencyRose.json (Global Wind Atlas, „Plot data“): je Sektor center_degrees
      (Herkunftsrichtung, 0 = Nord, im Uhrzeigersinn) und value (Häufigkeit in %). AUSDRÜCKLICH BEISPIELE, keine Messdaten:
      „weimar“ ist eine selbst festgelegte, für Thüringen typische Verteilung mit vorherrschendem West-/Südwestwind. */
  const sektoren = (werte) => werte.map((v, i) => ({ sector: i + 1, center_degrees: i * 360 / werte.length, value: v }));
  const ROSEN = {
    weimar: sektoren([5, 4, 6, 7, 5, 5, 8, 14, 16, 14, 9, 7]),
    gleich: sektoren(new Array(12).fill(100 / 12)),
    nordost: sektoren([9, 12, 16, 13, 7, 4, 3, 3, 5, 7, 6, 5, 3, 2, 2, 3])
  };

  /** windFrequencyRose.json lesen wie das GhPython-Skript der .gh-Datei: values, angles = center_degrees − 180,
      dazu die kleinste center_degrees (im Skript „angle“, in der Datei als Sektorbreite benutzt). Wirft bei falschem Aufbau. */
  function roseAusJSON(text) {
    const db = typeof text === "string" ? JSON.parse(text) : text;
    const liste = Array.isArray(db) ? db : (db && (db.data || db.sectors || db.windFrequencyRose));
    if (!Array.isArray(liste) || !liste.length) throw new Error("windFrequencyRose.json: keine Liste von Sektoren");
    const werte = [], mitten = [], angles = [];
    let kleinster = 360;
    for (const e of liste) {
      const v = Number(e.value), c = Number(e.center_degrees);
      if (!isFinite(v) || !isFinite(c)) throw new Error("windFrequencyRose.json: value/center_degrees fehlen");
      werte.push(v); mitten.push(c); angles.push(c - 180);
      if (c < kleinster) kleinster = c;
    }
    return { n: werte.length, werte, mitten, angles, kleinster, breite: 360 / werte.length };
  }

  /** Windrose zum Parameter: Beispiel oder eingefügte Datei (p.eigeneRose, Text von windFrequencyRose.json) */
  function rose(p) {
    if (p.rose === "eigen" && p.eigeneRose) { try { return roseAusJSON(p.eigeneRose); } catch (e) { /* Beispiel nehmen */ } }
    return roseAusJSON(ROSEN[p.rose] || ROSEN.weimar);
  }

  /** Remap Numbers: Häufigkeit auf 0…1 bezogen auf den größten Sektor (Quelle 0…Bounds.End, Ziel 0…1) */
  function normiere(werte) {
    const mx = Math.max(0, ...werte);
    return werte.map(v => mx > 0 ? v / mx : 0);
  }

  /** Peilung (Grad, 0 = Nord, im Uhrzeigersinn – Construct Plane mit X = Unit Y, Y = Unit X in der .gh) → Einheitsvektor
      in Bildschirmkoordinaten (y nach unten, Norden oben) */
  function peilungZuVektor(grad) {
    const a = grad * Math.PI / 180;
    return [Math.sin(a), -Math.cos(a)];
  }
  /** Peilung eines Vektors in Grad 0…360 */
  function vektorZuPeilung(v) { return ((Math.atan2(v[0], -v[1]) * 180 / Math.PI) % 360 + 360) % 360; }

  /** Angle + Degrees ohne Ebene: Winkel 0…180° zwischen zwei Vektoren; NaN, wenn einer die Länge 0 hat (gewählte Parzelle selbst) */
  function winkelGrad(a, b) {
    const la = Math.hypot(a[0], a[1]), lb = Math.hypot(b[0], b[1]);
    if (la < 1e-12 || lb < 1e-12) return NaN;
    const c = Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (la * lb)));
    return Math.acos(c) * 180 / Math.PI;
  }

  /** Wirkrichtungen der Sektoren (Peilung, wohin der Wind weht): center_degrees + Drehung (Voreinstellung 180) */
  function wirkrichtungen(R, drehung) { return R.mitten.map(c => ((c + drehung) % 360 + 360) % 360); }

  /** Smaller Than (… or Equal to): Indizes der Sektoren unter den ersten „aktiv“, deren Wirkrichtung höchstens
      grenze Grad vom Vektor v abweicht */
  function sektorTreffer(v, richtungen, grenze, aktiv = richtungen.length) {
    const T = [];
    for (let i = 0; i < Math.min(aktiv, richtungen.length); i++) {
      const w = winkelGrad(v, peilungZuVektor(richtungen[i]));
      if (w <= grenze) T.push(i);
    }
    return T;
  }

  /** Weighted Average: Σ g·x / Σ g; null bei leerer Liste oder Gewichtssumme 0 (dann färbt Grasshopper nicht) */
  function gewichtetesMittel(x, g) {
    let s = 0, sg = 0;
    for (let i = 0; i < x.length; i++) { s += x[i] * g[i]; sg += g[i]; }
    return x.length && sg > 0 ? s / sg : null;
  }

  /** Distance Falloff: Exp(−k·x) (Panel der .gh-Datei: k = 0.02) */
  function abfall(x, k) { return Math.exp(-k * x); }

  /** Obergrenze der Farbskala (Stream Filter „Max“): 1 für die Windrichtung, Abfall bei der Reichweite für die Belastung */
  function obergrenze(p) { return p.modus === "belastung" ? abfall(p.radius, p.abfallK) : 1; }

  /** Wert einer Parzelle: Vektor v (von Wind From zu Wind To), Entfernung d, normierte Häufigkeiten f, getroffene Sektoren T */
  function parzellenWert(p, f, T, d) {
    if (!T.length) return null;
    const ff = T.map(i => f[i]);
    if (p.modus === "belastung") { const a = abfall(d, p.abfallK); return gewichtetesMittel(ff.map(x => x * a), ff); }
    return gewichtetesMittel(ff, ff);
  }

  /** Beispielszene: Parzellen (Blöcke eines verzogenen Straßenrasters) auf einem Gelände wie im Katalogbild */
  function szene(zufall) {
    const B = 2460, H = 1450, ox = 90, oy = 150;
    const G = Szenen.gelaende(zufall, { groesse: B, n: 116, hoehe: 140, gipfel: [B * 0.35, H * 0.55] });
    const st = Szenen.stadt(zufall, { b: 1440, h: 1180, nx: 10, ny: 8, rand: 0, jitter: 0.24, strasse: 22, zusammen: 0.2, gebaeude: false, platz: false, kirche: false });
    const parzellen = st.bloecke.map(P => P.map(q => [q[0] + ox, q[1] + oy]));
    const strassen = st.strassen.map(s => s.map(q => [q[0] + ox, q[1] + oy]));
    return { b: B, h: H, G, parzellen, strassen, schwerpunkte: parzellen.map(P => Geo.schwerpunkt(P)), flaechen: parzellen.map(P => Math.abs(Geo.flaeche(P))) };
  }

  /** Neuer Zustand (t = 0: noch kein Sektor geprüft) */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const sz = szene(zufall);
    const n = sz.parzellen.length;
    const z = { t: 0, b: sz.b, h: sz.h, sz, auswahl: ((Math.round(p.parzelle) % n) + n) % n, roseO: [2010, 480], aktiv: 0, werte: [], treffer: [] };
    rechne(z, p);
    return z;
  }

  /** Alles neu rechnen mit den ersten z.aktiv Sektoren */
  function rechne(z, p) {
    const R = rose(p), f = normiere(R.werte), dirs = wirkrichtungen(R, p.drehung);
    const grenze = R.breite * p.faktor / 2, S = z.sz.schwerpunkte, s = S[z.auswahl];
    z.rose = R; z.f = f; z.richtungen = dirs; z.grenze = grenze; z.max = obergrenze(p);
    z.aktiv = Math.min(R.n, Math.floor(z.t / Math.max(1, Math.round(p.takt))));
    z.werte = []; z.treffer = []; z.abstaende = [];
    let mit = 0, summe = 0, groesster = 0;
    for (let j = 0; j < S.length; j++) {
      const v = p.tauschen ? [s[0] - S[j][0], s[1] - S[j][1]] : [S[j][0] - s[0], S[j][1] - s[1]];
      const d = Math.hypot(v[0], v[1]);
      const T = sektorTreffer(v, dirs, grenze, z.aktiv);
      const w = parzellenWert(p, f, T, d);
      z.werte.push(w); z.treffer.push(T); z.abstaende.push(d);
      if (w != null) { mit++; summe += w; if (w > groesster) groesster = w; }
    }
    z.mitWert = mit; z.mittel = mit ? summe / mit : null; z.groesster = groesster;
    // Farbskala: Max wie in der .gh-Datei oder (Zusatz der App) bis zum größten Wert, damit die Richtung auch bei der Belastung sichtbar bleibt
    if (p.skala === "groesster" && groesster > 0) z.max = groesster;
    return z;
  }

  /** Ein Schritt: Takt weiter; nach je „takt“ Schritten kommt der nächste Sektor hinzu */
  function schritt(z, p) {
    z.t++;
    const neu = Math.min(z.rose.n, Math.floor(z.t / Math.max(1, Math.round(p.takt))));
    if (neu !== z.aktiv) rechne(z, p);
    return z;
  }
  /** fertig, wenn alle Sektoren geprüft sind */
  function fertig(z, p) { return z.t >= z.rose.n * Math.max(1, Math.round(p.takt)); }
  /** Anteil des laufenden Sektors (für die Darstellung des Suchkegels) */
  function laufend(z, p) {
    const k = Math.max(1, Math.round(p.takt));
    return fertig(z, p) ? null : { i: Math.floor(z.t / k), anteil: (z.t % k + 1) / k };
  }

  function aendere(z, p, id) {
    if (id === "parzelle") { const n = z.sz.parzellen.length; z.auswahl = ((Math.round(p.parzelle) % n) + n) % n; }
    rechne(z, p);
  }

  /** Parzelle am Punkt q (Index oder −1) */
  function parzelleAn(z, q) { return z.sz.parzellen.findIndex(P => Geo.punktInPoly(q, P)); }
  function waehle(z, p, i) { if (i >= 0 && i < z.sz.parzellen.length && i !== z.auswahl) { z.auswahl = i; rechne(z, p); return true; } return false; }

  /** Mittelwerte im Lee (±45° um die Hauptwindrichtung, wohin der häufigste Wind weht) und im Luv (Gegenrichtung) der gewählten Parzelle */
  function leeLuv(z) {
    const R = z.rose, iMax = R.werte.indexOf(Math.max(...R.werte)), lee = peilungZuVektor(z.richtungen[iMax]);
    const S = z.sz.schwerpunkte, s = S[z.auswahl], a = [], b = [];
    for (let j = 0; j < S.length; j++) {
      if (j === z.auswahl || z.werte[j] == null) continue;
      const w = winkelGrad([S[j][0] - s[0], S[j][1] - s[1]], lee);
      if (w <= 45) a.push(z.werte[j]); else if (w >= 135) b.push(z.werte[j]);
    }
    const m = L => L.length ? L.reduce((x, y) => x + y, 0) / L.length : null;
    return { lee: m(a), luv: m(b), nLee: a.length, nLuv: b.length };
  }

  return { STANDARD, ROSEN, roseAusJSON, rose, normiere, peilungZuVektor, vektorZuPeilung, winkelGrad, wirkrichtungen, sektorTreffer,
           gewichtetesMittel, abfall, obergrenze, parzellenWert, szene, erzeuge, rechne, schritt, fertig, laufend, aendere, parzelleAn, waehle, leeLuv };
});
