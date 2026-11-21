/* Skalenerträge · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 415_Skalenertraege (Delphi 2005, Reinhard König), Kapitel 4.1.5 der Dissertation
   „Dynamische Simulation und Visualisierung räumlicher Prozesse“ (2008).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (facsSteer.pas, calcLocalPreis; agenten.pas, SetAngebPreis):
     relativer Preis für den Kunden in Zelle i beim Markt j:  N_ij = P_j + d_ij · K          (Gleichung 36/37)
     jeder Kunde (eine Zelle) kauft beim Markt mit dem kleinsten N_ij                          (Gleichung 38)
     neuer Angebotspreis:  P_j = Kunden_j / Kunden_j^S · Produktionskosten                     (Gleichung 39)
   mit Kunden_j = 1 + Zahl der Zellen im Einzugsgebiet, S = Skalenertrag, K = Fahrtkosten je Bildpunkt. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ZELLE = 8;                    // cellScal im Original
  const SPALTEN = 96, ZEILEN = 56;    // round(770 / 8) × round(450 / 8) – ImagePaint des Originals
  const BREITE = 770, HOEHE = 450;    // Zeichenfläche in Bildpunkten (Positionen der Märkte)
  const VMAX = 4;                     // Neu: Höchstgeschwindigkeit wandernder Märkte

  /** Voreinstellungen wie im Original (facsSteer.dfm: SB_ProdKost 100, SB_FahrtKost 10 · 0,001, SB_Skalen 0,996 + 21 · 0,0002) */
  const STANDARD = { maerkte: 10, produktionskosten: 100, fahrtkosten: 0.01, skalenertrag: 1.0002, bewegen: false, ansicht: "gebiete" };

  /** Angebotspreis aus der Kundenzahl (SetAngebPreis): Kunden / Kunden^S · Produktionskosten */
  function angebotspreis(kunden, s, produktionskosten) { return kunden / Math.pow(kunden, s) * produktionskosten; }

  /** relativer Preis eines Kunden (Gleichung 36): Angebotspreis + Entfernung · Fahrtkosten */
  function relativerPreis(preis, d, fahrtkosten) { return preis + d * fahrtkosten; }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param), N = SPALTEN * ZEILEN;
    const z = {
      t: 0, zufall, spalten: SPALTEN, zeilen: ZEILEN, zelle: ZELLE, breite: SPALTEN * ZELLE, hoehe: ZEILEN * ZELLE,
      maerkte: [], markt: new Int16Array(N).fill(-1), kosten: new Float64Array(N), dist: null, wechsel: 0, ruhig: false, naechste: 0
    };
    for (let i = 0; i < p.maerkte; i++) setzeMarkt(z, p, zufall.ganz(BREITE), zufall.ganz(HOEHE));   // MakeMarkt: random(Width), random(Height)
    einzugsgebiete(z, p, true);                                       // Anfangsbild: gleiche Preise, jeder beim nächsten Markt
    return z;
  }

  /** neuer Markt (MakeMarkt): Kunden 1, Preis = Produktionskosten, Startrichtung random(3) − 1; Farbe nach laufender Nummer */
  function setzeMarkt(z, p, x, y) {
    z.maerkte.push({ x: Math.round(x), y: Math.round(y), vx: z.zufall.dreh(), vy: z.zufall.dreh(), kunden: 1,
                     preis: angebotspreis(1, 1, p.produktionskosten), farbe: z.naechste++ });
    z.dist = null; z.ruhig = false;
  }
  function entferneMarkt(z, x, y) {
    let best = 40, k = -1;
    z.maerkte.forEach((m, i) => { const d = Math.hypot(m.x - x, m.y - y); if (d < best) { best = d; k = i; } });
    if (k >= 0) { z.maerkte.splice(k, 1); z.dist = null; z.ruhig = false; z.markt.fill(-1); }
  }

  /** gerundete Entfernungen aller Zellmitten (K·8 + 4) zu allen Märkten (NextMarkt / CalcDistance) */
  function entfernungen(z) {
    const n = z.maerkte.length, d = new Float64Array(SPALTEN * ZEILEN * n);
    for (let i = 0; i < ZEILEN; i++) for (let k = 0; k < SPALTEN; k++) {
      const c = i * SPALTEN + k, x = k * ZELLE + ZELLE / 2, y = i * ZELLE + ZELLE / 2;
      for (let u = 0; u < n; u++) d[c * n + u] = Math.round(Math.hypot(z.maerkte[u].x - x, z.maerkte[u].y - y));
    }
    z.dist = d;
  }

  /** Einzugsgebiete und neue Preise (calcLocalPreis); gibt die Zahl der Zellen zurück, die den Markt gewechselt haben.
      nurZuordnung: Kunden zuordnen, ohne neue Preise zu bilden (Anfangsbild, Markt per Klick) */
  function einzugsgebiete(z, p, nurZuordnung) {
    const n = z.maerkte.length, N = SPALTEN * ZEILEN;
    if (!n) { z.markt.fill(-1); return 0; }
    if (!z.dist) entfernungen(z);
    for (const m of z.maerkte) m.kunden = 1;                           // Kundenzahlen zurücksetzen (Kunden := 1)
    let wechsel = 0;
    for (let c = 0; c < N; c++) {
      let best = 214748364, wahl = 0;                                 // bestKost := 214748364
      for (let u = 0; u < n; u++) {
        const k = relativerPreis(z.maerkte[u].preis, z.dist[c * n + u], p.fahrtkosten);
        if (k < best) { best = k; wahl = u; }
      }
      if (z.markt[c] !== wahl) wechsel++;
      z.markt[c] = wahl; z.kosten[c] = best;
      z.maerkte[wahl].kunden++;
    }
    if (!nurZuordnung) for (const m of z.maerkte) m.preis = angebotspreis(m.kunden, p.skalenertrag, p.produktionskosten);
    return wechsel;
  }

  /** Märkte wandern zufällig (SetRndDir mit damp 1,0001), Rand als Torus */
  function bewegeMaerkte(z) {
    for (const m of z.maerkte) {
      m.vx = Math.max(-VMAX, Math.min(VMAX, (m.vx + z.zufall.dreh()) * 1.0001));
      m.vy = Math.max(-VMAX, Math.min(VMAX, (m.vy + z.zufall.dreh()) * 1.0001));
      m.x += Math.round(m.vx); m.y += Math.round(m.vy);
      if (m.x < 0) m.x += BREITE; if (m.x >= BREITE) m.x -= BREITE;
      if (m.y < 0) m.y += HOEHE; if (m.y >= HOEHE) m.y -= HOEHE;
    }
    z.dist = null;
  }

  function schritt(z, p) {
    if (p.bewegen && z.maerkte.length) bewegeMaerkte(z);
    z.wechsel = einzugsgebiete(z, p);
    z.ruhig = z.t > 0 && z.wechsel === 0 && !p.bewegen;              // gleiche Gebiete → gleiche Preise → Gleichgewicht
    z.t++;
    return z;
  }

  /** Parameter ohne Neustart: wirken ab dem nächsten Schritt (wie im Original); Gleichgewicht neu prüfen */
  function aendere(z) { z.ruhig = false; }

  /** Marktanteile in Prozent der Zellen, absteigend */
  function anteile(z) {
    const N = SPALTEN * ZEILEN;
    return z.maerkte.map(m => 100 * (m.kunden - 1) / N).sort((a, b) => b - a);
  }

  return { STANDARD, ZELLE, SPALTEN, ZEILEN, BREITE, HOEHE, VMAX, angebotspreis, relativerPreis,
           erzeuge, schritt, aendere, einzugsgebiete, entfernungen, setzeMarkt, entferneMarkt, anteile };
});
