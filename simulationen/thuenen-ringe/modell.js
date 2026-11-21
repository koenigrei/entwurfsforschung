/* Thünen-Ringe · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 412_ThuenenRinge (Delphi 2005, Reinhard König), Kapitel 4.1.2 der Dissertation
   „Dynamische Simulation und Visualisierung räumlicher Prozesse“ (2008).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regel (aus cell.pas, TBaseCell.CalcLagerR):
     Lagerente_j = Ertrag_j · (Marktpreis_j − Erzeugungskosten_j) − Ertrag_j · Distanz · Transportkosten_j
   Jede Zelle baut das Produkt mit der höchsten Lagerente an, sofern diese größer als 1 ist; sonst bleibt sie ungenutzt.
   Distanz = gerundete euklidische Entfernung (in Bildpunkten des Originals) zum nächsten Markt (TBaseCell.NextMarkt). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ZELLE = 6;                  // cellScal im Original: 6 Bildpunkte je Zelle
  const SPALTEN = 129, ZEILEN = 76; // round(775 / 6) × round(455 / 6) – Zeichenfläche des Originals
  const PRODUKTE = ["A", "B", "C"];
  const KEINE = -1;                 // Original: State = 99
  const KEIN_MARKT = 1000;          // Original: Distance := 1000, solange kein Markt näher ist
  const VMAX = 4;                   // Neu: Höchstgeschwindigkeit der Märkte (Original unbegrenzt)

  /** Voreinstellungen wie im Original (facsSteer.dfm) */
  const STANDARD = {
    ertragA: 2500, kostenA: 10, preisA: 400, transportA: 5,   // Produkt A – Gelb
    ertragB: 500,  kostenB: 1,  preisB: 900, transportB: 6,   // Produkt B – Grün
    ertragC: 2000, kostenC: 6,  preisC: 400, transportC: 3,   // Produkt C – Weiß
    maerkte: 1, bewegen: true, ansicht: "ringe"
  };

  const produkt = (p, j) => {
    const n = PRODUKTE[j];
    return { ertrag: p["ertrag" + n], kosten: p["kosten" + n], preis: p["preis" + n], transport: p["transport" + n] };
  };

  /** Lagerente eines Produkts j in der Entfernung d */
  function lagerente(p, j, d) {
    const q = produkt(p, j);
    return q.ertrag * (q.preis - q.kosten) - q.ertrag * d * q.transport;
  }

  /** Nutzung in der Entfernung d: Index des Produkts mit der höchsten Lagerente (> 1) oder KEINE */
  function nutzung(p, d) {
    let best = 1, wahl = KEINE;
    for (let j = 0; j < PRODUKTE.length; j++) {
      const r = lagerente(p, j, d);
      if (best < r) { best = r; wahl = j; }
    }
    return wahl;
  }

  /** Ringfolge um einen einzelnen Markt: [{produkt, von, bis}] in Bildpunkten */
  function ringfolge(p, dmax = KEIN_MARKT) {
    const R = [];
    for (let d = 0; d <= dmax; d++) {
      const n = nutzung(p, d);
      if (n === KEINE) break;
      if (R.length && R[R.length - 1].produkt === n) R[R.length - 1].bis = d;
      else R.push({ produkt: n, von: d, bis: d });
    }
    return R;
  }

  /** gerundete Entfernung zum nächsten Markt */
  function naechsterMarkt(maerkte, x, y) {
    let d = KEIN_MARKT, k = -1;
    for (let i = 0; i < maerkte.length; i++) {
      const dx = maerkte[i].x - x, dy = maerkte[i].y - y, t = Math.round(Math.sqrt(dx * dx + dy * dy));
      if (t < d) { d = t; k = i; }
    }
    return { d, k };
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = {
      t: 0, zufall, spalten: SPALTEN, zeilen: ZEILEN, zelle: ZELLE, breite: SPALTEN * ZELLE, hoehe: ZEILEN * ZELLE,
      maerkte: [], distanz: new Int16Array(SPALTEN * ZEILEN), nutzung: new Int8Array(SPALTEN * ZEILEN), rente: new Float64Array(SPALTEN * ZEILEN)
    };
    for (let i = 0; i < p.maerkte; i++) {
      if (i === 0) setzeMarkt(z, z.breite / 2, z.hoehe / 2);
      else setzeMarkt(z, zufall.zwischen(20, z.breite - 20), zufall.zwischen(20, z.hoehe - 20));
    }
    berechne(z, p);
    return z;
  }

  /** Markt per Mausklick (Original: ImagePaintClick, Startrichtung random(3) − 1) */
  function setzeMarkt(z, x, y) {
    z.maerkte.push({ x: Math.round(x), y: Math.round(y), vx: z.zufall.dreh(), vy: z.zufall.dreh() });
  }
  function entferneMarkt(z, x, y) {
    const { d, k } = naechsterMarkt(z.maerkte, x, y);
    if (k >= 0 && d < 40) z.maerkte.splice(k, 1);
  }

  /** Lagerenten und Nutzung aller Zellen neu berechnen (Original: RectanglPaint, in jedem Durchlauf) */
  function berechne(z, p) {
    const nTab = new Int8Array(KEIN_MARKT + 1), rTab = new Float64Array(KEIN_MARKT + 1);   // Entfernungen sind ganzzahlig: Nutzung je Entfernung vorab
    for (let d = 0; d <= KEIN_MARKT; d++) { const u = nutzung(p, d); nTab[d] = u; rTab[d] = u === KEINE ? 0 : lagerente(p, u, d); }
    for (let i = 0; i < z.zeilen; i++) {
      for (let k = 0; k < z.spalten; k++) {
        const n = i * z.spalten + k, x = k * ZELLE + ZELLE / 2, y = i * ZELLE + ZELLE / 2;
        let d = KEIN_MARKT;
        for (const m of z.maerkte) { const dx = m.x - x, dy = m.y - y, t = Math.round(Math.sqrt(dx * dx + dy * dy)); if (t < d) d = t; }
        z.distanz[n] = d; z.nutzung[n] = nTab[d]; z.rente[n] = rTab[d];
      }
    }
  }

  /** Ein Zeitschritt: Märkte wandern zufällig (SetRndDir mit damp 1,0001), Rand als Torus, danach Neuberechnung */
  function schritt(z, p) {
    if (p.bewegen) {
      for (const m of z.maerkte) {
        m.vx = Math.max(-VMAX, Math.min(VMAX, (m.vx + z.zufall.dreh()) * 1.0001));
        m.vy = Math.max(-VMAX, Math.min(VMAX, (m.vy + z.zufall.dreh()) * 1.0001));
        m.x += Math.round(m.vx); m.y += Math.round(m.vy);
        if (m.x < 0) m.x += z.breite; if (m.x >= z.breite) m.x -= z.breite;
        if (m.y < 0) m.y += z.hoehe; if (m.y >= z.hoehe) m.y -= z.hoehe;
      }
    }
    berechne(z, p);
    z.t++;
    return z;
  }

  /** Parameteränderung ohne Neustart: Nutzung sofort neu berechnen */
  function aendere(z, p) { berechne(z, p); }

  /** Flächenanteile [A, B, C, ungenutzt] in Prozent */
  function anteile(z) {
    const c = [0, 0, 0, 0];
    for (let n = 0; n < z.nutzung.length; n++) c[z.nutzung[n] === KEINE ? 3 : z.nutzung[n]]++;
    return c.map(v => 100 * v / z.nutzung.length);
  }

  return { STANDARD, PRODUKTE, KEINE, ZELLE, SPALTEN, ZEILEN, VMAX, lagerente, nutzung, ringfolge, naechsterMarkt,
           erzeuge, schritt, aendere, berechne, setzeMarkt, entferneMarkt, anteile };
});
