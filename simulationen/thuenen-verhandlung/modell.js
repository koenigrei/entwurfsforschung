/* Verhandlungsmodell für die Landnutzung nach v. Thünen · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 413_ThuenenVerhandel (Delphi 2005, Reinhard König), Kapitel 4.1.3 der Dissertation
   „Dynamische Simulation und Visualisierung räumlicher Prozesse“ (2008).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Jede Zelle ist ein Landwirt mit festem Produkt (A, B, C) oder leer. Ein Schritt (facsSteer.pas, ApplicationEvents1Idle):
     1. RectanglPaint/CalcLagerR: Lagerente jeder Zelle für ihr eigenes Produkt,
        L = Ertrag · (Marktpreis − Erzeugungskosten) − Ertrag · Distanz · Transportkosten.
     2. makeOffer: jeder Landwirt wählt 8 zufällige Zellen im Tauschradius (TBaseCell.setNachbKoordi) und bewirbt sich dort,
        wenn er mit seinem Produkt mehr erzielt als zu Hause UND mehr als der jetzige Besitzer dort.
     3. acceptOffer: jede Zelle nimmt die Bewerber mit dem höchsten Angebot (bei Gleichstand alle).
     4. ChooseChange: jeder angenommene Landwirt tauscht mit seinem besten Ziel – nacheinander in Zeilenfolge. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ZELLE = 10;                 // cellScal im Original
  const SPALTEN = 77, ZEILEN = 45;  // round(769 / 10) × round(450 / 10) – ImagePaint des Originals
  const PRODUKTE = ["A", "B", "C"];
  const LEER = -1;                  // Original: State = 99
  const KEIN_MARKT = 100000;        // Original: Distance := MaxInt (dort mit Überlauf in der Rentenformel)
  const NEG = -Infinity;            // Original: MaxRente := −2147483647 für leere Zellen
  const VMAX = 4;                   // Neu: Höchstgeschwindigkeit wandernder Märkte (wie thuenen-ringe)

  /** Voreinstellungen wie im Original (facsSteer.dfm) */
  const STANDARD = {
    anteilA: 25, anteilB: 25, anteilC: 25, tauschradius: 40, maerkte: 1, bewegen: false, ansicht: "nutzung", beispiel: "eigen",
    ertragA: 2500, kostenA: 10, preisA: 400, transportA: 5,   // Produkt A – Gelb
    ertragB: 500,  kostenB: 1,  preisB: 900, transportB: 6,   // Produkt B – Grün
    ertragC: 2000, kostenC: 6,  preisC: 400, transportC: 3    // Produkt C – Weiß
  };

  /** Lagerente eines Produkts j in der Entfernung d (TBaseCell.RechneLagerR) */
  function lagerente(p, j, d) {
    const n = PRODUKTE[j], y = p["ertrag" + n];
    return y * (p["preis" + n] - p["kosten" + n]) - y * d * p["transport" + n];
  }

  /** Koeffizienten je Produkt für schnelle Rechnung: L = a − b · d */
  function koeffizienten(p) {
    return PRODUKTE.map(n => ({ a: p["ertrag" + n] * (p["preis" + n] - p["kosten" + n]), b: p["ertrag" + n] * p["transport" + n] }));
  }

  /** Produkt einer Zelle aus der Zufallszahl v ∈ [0, 100) und den Anteilen (RectanglCreate): kumulativ A, B, C, sonst leer */
  function produktFuer(v, p) {
    if (v < p.anteilA) return 0;
    if (v < p.anteilA + p.anteilB) return 1;
    if (v < p.anteilA + p.anteilB + p.anteilC) return 2;
    return LEER;
  }

  /** gerundete Entfernung zum nächsten Markt (TBaseCell.NextMarkt / CalcDistance) */
  function entfernung(maerkte, x, y) {
    let d = KEIN_MARKT;
    for (const m of maerkte) { const t = Math.round(Math.hypot(m.x - x, m.y - y)); if (t < d) d = t; }
    return d;
  }

  /** acht Vergleichszellen im Tauschradius T (setNachbKoordi): je Himmelsrichtung ein Versatz random(T), am Rand begrenzt.
      Reihenfolge der Zufallszahlen wie im Original. Schreibt 8 Zellindizes nach aus. */
  function nachbarn(k, i, T, zufall, aus) {
    const r = () => zufall.ganz(T);
    const setze = (u, x, y) => { x = x < 0 ? 0 : x > SPALTEN - 1 ? SPALTEN - 1 : x; y = y < 0 ? 0 : y > ZEILEN - 1 ? ZEILEN - 1 : y; aus[u] = y * SPALTEN + x; };
    let a, b;
    a = k + r(); b = i - r(); setze(0, a, b);
    a = k + r(); setze(1, a, i);
    a = k + r(); b = i + r(); setze(2, a, b);
    b = i + r(); setze(3, k, b);
    a = k - r(); b = i + r(); setze(4, a, b);
    a = k - r(); setze(5, a, i);
    a = k - r(); b = i - r(); setze(6, a, b);
    b = i - r(); setze(7, k, b);
    return aus;
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param), N = SPALTEN * ZEILEN;
    const z = {
      t: 0, zufall, spalten: SPALTEN, zeilen: ZEILEN, zelle: ZELLE, breite: SPALTEN * ZELLE, hoehe: ZEILEN * ZELLE,
      maerkte: [], nutzung: new Int8Array(N), distanz: new Int32Array(N), rente: new Float64Array(N),
      tausche: 0, ruhe: 0, gesamt: 0, positiv: 0, besetzt: 0
    };
    for (let n = 0; n < N; n++) z.nutzung[n] = produktFuer(zufall.ganz(100), p);   // vert := random(100)
    for (let i = 0; i < p.maerkte; i++) {
      if (i === 0) setzeMarkt(z, 400, 300);                                         // MakeMarkt(400, 300) in FormCreate
      else setzeMarkt(z, zufall.zwischen(20, z.breite - 20), zufall.zwischen(20, z.hoehe - 20));
    }
    distanzen(z); renten(z, p);
    return z;
  }

  /** Markt setzen (MakeMarkt: Startrichtung random(3) − 1) */
  function setzeMarkt(z, x, y) { z.maerkte.push({ x: Math.round(x), y: Math.round(y), vx: z.zufall.dreh(), vy: z.zufall.dreh() }); }
  /** nächsten Markt im Umkreis von 40 Bildpunkten entfernen */
  function entferneMarkt(z, x, y) {
    let best = 40, k = -1;
    z.maerkte.forEach((m, i) => { const d = Math.hypot(m.x - x, m.y - y); if (d < best) { best = d; k = i; } });
    if (k >= 0) z.maerkte.splice(k, 1);
  }

  /** Entfernung jeder Zelle (Mittelpunkt K·10 + 5) zum nächsten Markt */
  function distanzen(z) {
    for (let i = 0; i < ZEILEN; i++) for (let k = 0; k < SPALTEN; k++)
      z.distanz[i * SPALTEN + k] = entfernung(z.maerkte, k * ZELLE + ZELLE / 2, i * ZELLE + ZELLE / 2);
  }

  /** Lagerente jeder Zelle für ihr eigenes Produkt (CalcLagerR); dazu Summe und Zahl der Zellen mit positiver Rente */
  function renten(z, p) {
    let s = 0, pos = 0, bes = 0;
    const K = koeffizienten(p);
    for (let n = 0; n < z.nutzung.length; n++) {
      const u = z.nutzung[n];
      const r = u === LEER ? NEG : K[u].a - K[u].b * z.distanz[n];
      z.rente[n] = r;
      if (u !== LEER) { s += r; bes++; if (r > 0) pos++; }
    }
    z.gesamt = s; z.positiv = pos; z.besetzt = bes;
  }

  /** Ein Verhandlungsschritt (makeOffer, acceptOffer, ChooseChange); gibt die Zahl der Tausche zurück */
  function verhandle(z, p) {
    const N = z.nutzung.length, T = Math.max(1, Math.round(p.tauschradius));
    const nb = new Int32Array(8), K = koeffizienten(p);
    const zielV = [], renteV = [], vonV = [];                  // alle Bewerbungen dieses Schritts
    const best = new Float64Array(N).fill(NEG);                // höchstes Angebot je Zelle (acceptOffer)
    for (let i = 0; i < ZEILEN; i++) for (let k = 0; k < SPALTEN; k++) {
      const n = i * SPALTEN + k, u = z.nutzung[n];
      if (u === LEER) continue;                                // nur verhandeln, wenn die Zelle besetzt ist
      nachbarn(k, i, T, z.zufall, nb);
      for (let q = 0; q < 8; q++) {
        const j = nb[q], r = K[u].a - K[u].b * z.distanz[j];
        if (r > z.rente[n] && r > z.rente[j]) {                // mehr als zu Hause und mehr als der Besitzer dort
          zielV.push(j); renteV.push(r); vonV.push(n);
          if (r > best[j]) best[j] = r;
        }
      }
    }
    // Annahme: Bewerber mit dem höchsten Angebot (alle Gleichstände); jeder wählt sein bestes angenommenes Ziel,
    // bei gleichem Betrag das in Zeilenfolge erste (Reihenfolge der AkzeptList im Original)
    const ziel = new Int32Array(N).fill(-1), zielR = new Float64Array(N).fill(NEG);
    for (let o = 0; o < zielV.length; o++) {
      const j = zielV[o], r = renteV[o], n = vonV[o];
      if (r !== best[j]) continue;
      if (r > zielR[n] || (r === zielR[n] && j < ziel[n])) { zielR[n] = r; ziel[n] = j; }
    }
    // Tausch nacheinander in Zeilenfolge (ChooseChange) – wie im Original mit dem jeweils aktuellen Inhalt der Zellen
    let tausche = 0;
    for (let n = 0; n < N; n++) {
      const j = ziel[n]; if (j < 0) continue;
      const a = z.nutzung[n], b = z.nutzung[j];
      if (a !== b) { z.nutzung[n] = b; z.nutzung[j] = a; tausche++; }
    }
    return tausche;
  }

  /** Märkte wandern zufällig (TAgent.SetRndDir mit damp 1,0001), Rand als Torus */
  function bewegeMaerkte(z) {
    for (const m of z.maerkte) {
      m.vx = Math.max(-VMAX, Math.min(VMAX, (m.vx + z.zufall.dreh()) * 1.0001));
      m.vy = Math.max(-VMAX, Math.min(VMAX, (m.vy + z.zufall.dreh()) * 1.0001));
      m.x += Math.round(m.vx); m.y += Math.round(m.vy);
      if (m.x < 0) m.x += z.breite; if (m.x >= z.breite) m.x -= z.breite;
      if (m.y < 0) m.y += z.hoehe; if (m.y >= z.hoehe) m.y -= z.hoehe;
    }
  }

  function schritt(z, p) {
    if (p.bewegen && z.maerkte.length) { bewegeMaerkte(z); distanzen(z); }
    renten(z, p);
    z.tausche = verhandle(z, p);
    z.ruhe = z.tausche === 0 ? z.ruhe + 1 : 0;
    renten(z, p);                                              // für Anzeige und Kennzahlen: Renten nach dem Tausch
    z.t++;
    return z;
  }

  /** Parameter ohne Neustart (Produktwerte, Tauschradius, Märkte): Entfernungen und Renten neu berechnen */
  function aendere(z, p) { distanzen(z); renten(z, p); z.ruhe = 0; }

  /** Flächenanteile [A, B, C, leer] in Prozent */
  function anteile(z) {
    const c = [0, 0, 0, 0];
    for (let n = 0; n < z.nutzung.length; n++) c[z.nutzung[n] === LEER ? 3 : z.nutzung[n]]++;
    return c.map(v => 100 * v / z.nutzung.length);
  }

  /** mittlere Entfernung zum nächsten Markt je Produkt (in Bildpunkten des Originals) – zeigt die Ringfolge */
  function mittlereEntfernung(z) {
    const s = [0, 0, 0], c = [0, 0, 0];
    for (let n = 0; n < z.nutzung.length; n++) { const u = z.nutzung[n]; if (u !== LEER) { s[u] += z.distanz[n]; c[u]++; } }
    return s.map((v, j) => c[j] ? v / c[j] : NaN);
  }

  return { STANDARD, PRODUKTE, LEER, ZELLE, SPALTEN, ZEILEN, VMAX, KEIN_MARKT, lagerente, produktFuer, entfernung, nachbarn,
           erzeuge, schritt, aendere, verhandle, distanzen, renten, setzeMarkt, entferneMarkt, anteile, mittlereEntfernung };
});
