/* Alonsos Modell der Standortwahl der Betriebe · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 414_Alonso (Delphi, August 2005, Reinhard König; Projekt alonsoBoden), Kapitel 4.1.4 der Dissertation
   „Dynamische Simulation und Visualisierung räumlicher Prozesse“ (2008), nach W. Alonso: Theory of the Urban Land Market (1960).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Je Zelle mit der Entfernung d zum nächsten Markt (cell.pas, ganzzahlig gerundet wie Delphis Round):
     Umsatz             V = round(q − d · vkund/100 + G)
     Produktionskosten  C = round(V/10 + q/10 + d · vtrans/100)
     Bid-Price          B = V − C − G
     Bodenpreis         P = round(mp / (0,01 + d · vpt/10))
   Mögliche Standorte der Nutzung: Zellen, auf denen der gebotene Preis genau dem Bodenpreis entspricht (B = P). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ZELLE = 6;                   // cellScal
  const SPALTEN = 138, ZEILEN = 88;  // round(825 / 6) × round(530 / 6) – ImagePaint des Originals (Delphi rundet 137,5 auf 138)
  const KEIN_MARKT = 1000;           // NextMarkt: Distance := 1000
  const VMAX = 4;                    // Neu: Höchstgeschwindigkeit wandernder Märkte

  /** Voreinstellungen wie im Original (facsSteer.dfm); vkund und vtrans in Hundertsteln wie im Programm (Anzeige dort /10) */
  const STANDARD = { betriebsgroesse: 60, gewinn: 10, kundensens: 20, transport: 50, maxPreis: 500, preisAbnahme: 6,
                     maerkte: 1, bewegen: true, anzeige: "bid", standorte: true };

  /** Delphis Round: kaufmännisch zur geraden Zahl bei genau ,5 (Banker's Rounding) */
  function rund(x) {
    const f = Math.floor(x), r = x - f;
    if (Math.abs(r - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
    return Math.round(x);
  }

  /** alle Größen einer Zelle in der Entfernung d (CalcUmsatz, CalcProdKost, CalcBidPr, CalcBodenPreis) */
  function werte(p, d) {
    const V = rund(p.betriebsgroesse - d * (p.kundensens / 100) + p.gewinn);
    const C = rund(V / 10 + p.betriebsgroesse / 10 + d * p.transport / 100);
    const B = V - C - p.gewinn;
    const P = rund(p.maxPreis / (0.01 + d * (p.preisAbnahme / 10)));
    return { V, C, B, P };
  }

  /** Entfernungen, für die B = P gilt (mögliche Standorte), im Bereich 0…dmax */
  function standortRinge(p, dmax = KEIN_MARKT) {
    const R = [];
    for (let d = 0; d <= dmax; d++) { const w = werte(p, d); if (w.B === w.P) R.push(d); }
    return R;
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param), N = SPALTEN * ZEILEN;
    const z = { t: 0, zufall, spalten: SPALTEN, zeilen: ZEILEN, zelle: ZELLE, breite: SPALTEN * ZELLE, hoehe: ZEILEN * ZELLE,
                maerkte: [], distanz: new Int16Array(N), V: new Int32Array(N), C: new Int32Array(N), B: new Int32Array(N), P: new Int32Array(N),
                standort: new Uint8Array(N), anzahl: 0 };
    for (let i = 0; i < p.maerkte; i++) {
      if (i === 0) setzeMarkt(z, z.breite / 2, z.hoehe / 2);
      else setzeMarkt(z, zufall.zwischen(20, z.breite - 20), zufall.zwischen(20, z.hoehe - 20));
    }
    berechne(z, p);
    return z;
  }

  /** Markt per Klick (ImagePaintClick: Startrichtung random(3) − 1) */
  function setzeMarkt(z, x, y) { z.maerkte.push({ x: Math.round(x), y: Math.round(y), vx: z.zufall.dreh(), vy: z.zufall.dreh() }); }
  function entferneMarkt(z, x, y) {
    let best = 40, k = -1;
    z.maerkte.forEach((m, i) => { const d = Math.hypot(m.x - x, m.y - y); if (d < best) { best = d; k = i; } });
    if (k >= 0) z.maerkte.splice(k, 1);
  }

  /** alle Zellen neu berechnen (RectanglPaint); Entfernung = gerundete Entfernung der Zellmitte zum nächsten Markt */
  function berechne(z, p) {
    const tab = [];                                             // Entfernungen sind ganzzahlig: Werte je Entfernung vorab
    for (let d = 0; d <= KEIN_MARKT; d++) tab.push(werte(p, d));
    let n = 0, anzahl = 0;
    for (let i = 0; i < ZEILEN; i++) for (let k = 0; k < SPALTEN; k++, n++) {
      const x = k * ZELLE + ZELLE / 2, y = i * ZELLE + ZELLE / 2;
      let d = KEIN_MARKT;
      for (const m of z.maerkte) { const t = Math.round(Math.hypot(m.x - x, m.y - y)); if (t < d) d = t; }
      const w = tab[d];
      z.distanz[n] = d; z.V[n] = w.V; z.C[n] = w.C; z.B[n] = w.B; z.P[n] = w.P;
      z.standort[n] = w.B === w.P ? 1 : 0; anzahl += z.standort[n];
    }
    z.anzahl = anzahl;
  }

  /** Märkte wandern zufällig (SetRndDir mit damp 1,0001), Rand als Torus */
  function schritt(z, p) {
    if (p.bewegen) for (const m of z.maerkte) {
      m.vx = Math.max(-VMAX, Math.min(VMAX, (m.vx + z.zufall.dreh()) * 1.0001));
      m.vy = Math.max(-VMAX, Math.min(VMAX, (m.vy + z.zufall.dreh()) * 1.0001));
      m.x += Math.round(m.vx); m.y += Math.round(m.vy);
      if (m.x < 0) m.x += z.breite; if (m.x >= z.breite) m.x -= z.breite;
      if (m.y < 0) m.y += z.hoehe; if (m.y >= z.hoehe) m.y -= z.hoehe;
    }
    berechne(z, p);
    z.t++;
    return z;
  }

  function aendere(z, p) { berechne(z, p); }

  return { STANDARD, ZELLE, SPALTEN, ZEILEN, KEIN_MARKT, VMAX, rund, werte, standortRinge,
           erzeuge, schritt, aendere, berechne, setzeMarkt, entferneMarkt };
});
