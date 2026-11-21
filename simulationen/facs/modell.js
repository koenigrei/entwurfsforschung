/* FACS – Free Agents in Cellular Space · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung der Delphi-Programme 01_FACS (4.5.2005), 02_Swarming (9.5.2005) und 03_Swarming (10.5.2005) von Reinhard König –
   drei Fassungen desselben Projekts FACS.dpr (Formular TMovePlate, Units facsSteer.pas, agenten.pas, cell.pas).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (facsSteer.pas, ApplicationEvents1Idle – ein Durchlauf der Idle-Prozedur = ein Schritt):
   - Freie Agenten mit ganzzahliger Position und stetigem Bewegungsvektor (StepX, StepY) auf 800 × 600 px; Zellenraster 80 × 60 (cellScal 10).
   - Maus: Agenten näher als der Mausradius bekommen den Vektor Dir · round((Position − Maus) · 0,1) – abstoßen (Dir 1) oder anziehen (Dir −1).
     Sonst ändert sich der Vektor zufällig um (random(3) − 1) · d je Achse (d = 0,11 | 0,1 | 0,28).
   - 01: Rand prallt ab; Zellen unter Agenten werden blau, ihre Moore-Nachbarn hellblau (lookCell, cellStates, checkNeighbour).
   - 02: Swarming (agenten.pas, NeigborCheck): Jeder Agent mittelt die Vektoren der Agenten mit höherer Listennummer im
     Interaktionsradius; der neue Vektor ist der Mittelwert aus eigenem und gemitteltem (0,5 · (Step + limbo)). Ist der nächste
     Nachbar näher als 5 px, ändert er die Richtung zufällig (SetRndDir 0,5). Rand als Torus. Linien zum nächsten Nachbarn.
   - 03: Nachbarn aus der ganzen Liste, Sichtfeld und Mindestabstand einstellbar, Mischung 1,0035 · (0,9 · Step + 0,1 · limbo),
     Zellen zählen die Begehungen (Passed, weiß bis 255), Bewegungsvektoren als Linien. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const BREITE = 800, HOEHE = 600, ZELLE = 10;            // ImagePaint 800 × 600 px, cellScal = 10
  const SPALTEN = BREITE / ZELLE, ZEILEN = HOEHE / ZELLE;  // spalt = round(800 / 10), reih = round(600 / 10)
  const RAND = { links: 5, oben: 5, rechts: BREITE - 5, unten: HOEHE - 5 };   // LEFT/TOP_BORDER = 10 − 5, RIGHT/BOTTOM = Breite − 5
  const MAX_AGENTEN = 2000;                                // Obergrenze (neu): „Create Pts“ fügt nur bis hierhin an
  const LINIE_01 = 40;                                     // Connect: Verbindungslinie, wenn distance < 40

  /** Konstanten je Fassung (Quelltext, nicht im Formular einstellbar) */
  const FASSUNGEN = {
    "01": { zufall: 0.11, torus: false, schwarm: false },
    "02": { zufall: 0.1, torus: true, schwarm: true, nah: 0.5, alle: false, sicht: false, mischung: [0.5, 0.5, 1] },
    "03": { zufall: 0.28, torus: true, schwarm: true, nah: 0.15, alle: true, sicht: true, mischung: [0.9, 0.1, 1.0035] }
  };

  /** Voreinstellungen (03 = facsSteer.dfm/FormCreate von 03_Swarming); die anderen Fassungen setzen ihre über „folgen“ (VOR) */
  const STANDARD = {
    fassung: "03",
    anzahl: 100,            // NUM_BALLS je „Create Pts“ (01: 500, 02/03: 100)
    mausRadius: 50,         // Mouse_Rad (ScrollBar1 5–200, 03: 0–200)
    mausModus: "abstossen", // Dir = 1 (Repel); „Attract/Repel“ kehrt um
    schwarm: true,          // CheckB_Verbind „Swarming“ (02, 03)
    radius: 40,             // Abstand „InteraktionsRadius“ (ScrollBarInterakt 5–200)
    mindest: 8,             // MinAbstand (03: ScrollBar_MinDist 1–50, FormCreate 8; 02 fest 5)
    sicht: 140,             // Sichtfeld in ° (03: ScrollBar_Sichtfeld 10–360, FormCreate 140)
    arccos: false,          // neu: Sichtfeld mit ArcCos statt ArcSin (Original: ArcSin, siehe QUELLE.md)
    vmax: 4,                // neu: Höchstgeschwindigkeit in px je Schritt (Original unbegrenzt)
    zellen: true,           // CheckB_Zellen „Zellen markieren“ (01: an, 02: aus, 03: an)
    linien: true            // 01 „Verbindungslinien“ (aus), 02 Linien zum nächsten Nachbarn (mit Swarming), 03 „Bewegungsvektoren“ (an)
  };
  const VOR = {   // Voreinstellungen je Fassung (Formular und Konstanten der jeweiligen facsSteer.pas)
    "01": { anzahl: 500, zellen: true, linien: false, mindest: 5 },
    "02": { anzahl: 100, zellen: false, linien: true, mindest: 5 },
    "03": { anzahl: 100, zellen: true, linien: true, mindest: 8 }
  };

  /** Delphis Round: zur geraden Zahl bei genau x,5 (Banker's Rounding) */
  function rund(v) {
    const f = Math.floor(v), d = v - f;
    return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1);
  }
  /** distance / CalcDistance: euklidischer Abstand, gerundet (Integer) */
  const abstand = (x1, y1, x2, y2) => rund(Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2)));

  function leer(zufall) {
    const n = MAX_AGENTEN, f = () => new Float64Array(n);
    return {
      t: 0, zufall, breite: BREITE, hoehe: HOEHE, spalten: SPALTEN, zeilen: ZEILEN, n: 0,
      x: new Int32Array(n), y: new Int32Array(n), sx: f(), sy: f(), lx: f(), ly: f(),
      ox: new Int32Array(n), oy: new Int32Array(n), nb: new Int32Array(n).fill(-1), sd: f().fill(1000),
      marke: new Uint8Array(SPALTEN * ZEILEN),    // 01/02: 10 = Agent auf der Zelle, 1 = Moore-Nachbar (limboWorld)
      begangen: new Uint8Array(SPALTEN * ZEILEN), // 03: Passed (0–255)
      maus: { x: 0, y: 0, aktiv: false }
    };
  }

  /** „Create Pts“ (Button_CreateClick): anzahl Agenten im Band y 250–299, Vektor je Achse −1, 0 oder 1 */
  function erzeugeAgenten(z, anzahl) {
    const k = Math.max(0, Math.min(Math.round(anzahl), MAX_AGENTEN - z.n));
    for (let j = 0; j < k; j++) {
      const i = z.n++;
      z.x[i] = z.zufall.ganz(800); z.y[i] = 250 + z.zufall.ganz(50);   // random(800), 250 + random(50)
      z.sx[i] = z.zufall.dreh(); z.sy[i] = z.zufall.dreh();             // random(3) − 1
      z.ox[i] = z.x[i]; z.oy[i] = z.y[i]; z.nb[i] = -1; z.sd[i] = 1000; z.lx[i] = z.sx[i]; z.ly[i] = z.sy[i];
    }
    return k;
  }
  /** „Delete 100 Pts“: die letzten 100 Agenten der Liste entfernen (ShapesList.Count − 100, hier nicht unter 0) */
  function loescheAgenten(z, k = 100) {
    z.n = Math.max(0, z.n - k);
    for (let i = 0; i < z.n; i++) if (z.nb[i] >= z.n) { z.nb[i] = -1; z.sd[i] = 1000; }
  }
  /** „Cells Black“ (03): alle Zählerstände der Zellen auf 0 */
  function zellenSchwarz(z) { z.begangen.fill(0); }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = leer(zufall);
    erzeugeAgenten(z, p.anzahl);
    if (p.zellen && p.fassung !== "03") markiere(z);
    return z;
  }

  /** Mausposition in Pixeln des Originals (aktiv = über der Zeichenfläche) */
  function setzeMaus(z, x, y, aktiv) { z.maus.x = Math.round(x); z.maus.y = Math.round(y); z.maus.aktiv = !!aktiv; }

  /** SetRndDir(damp): Vektor je Achse um (random(3) − 1) · damp ändern */
  function zufallsRichtung(z, i, d) { z.sx[i] += z.zufall.dreh() * d; z.sy[i] += z.zufall.dreh() * d; }

  /** Winkel für das Sichtfeld wie in NeigborCheck (03): |ArcSin(a·b / (|a| |b|))| in Grad – also |90° − Winkel zwischen den Vektoren|.
      Mit arccos (neu, wahlweise): der Winkel zwischen den Bewegungsrichtungen selbst. Ohne Bewegung 0. */
  function sichtWinkel(ax, ay, bx, by, arccos) {
    const n = Math.sqrt(ax * ax + ay * ay) * Math.sqrt(bx * bx + by * by);
    if (!(n > 0)) return 0;
    const q = Math.max(-1, Math.min(1, (ax * bx + ay * by) / n));   // geklemmt: ArcSin(1,0000001) bricht in Delphi ab
    return Math.abs((arccos ? Math.acos(q) : Math.asin(q)) / Math.PI * 180);
  }

  /** NeigborCheck für Agent i: Nachbarn im Interaktionsradius → limbo (gemittelter Vektor) oder zufällige Richtung bei Enge.
      02: nur Agenten mit höherer Nummer (K := I + 1 …); 03: alle außer sich selbst, nur innerhalb des Sichtfelds.
      Liefert die Zahl der berücksichtigten Nachbarn. */
  function nachbarn(z, i, p, f) {
    const A = p.radius, xi = z.x[i], yi = z.y[i], komp = rund(p.sicht / 2), grenze = (A + 0.5) * (A + 0.5);
    z.lx[i] = z.sx[i]; z.ly[i] = z.sy[i]; z.sd[i] = 1000;
    let sumX = 0, sumY = 0, zahl = 0, freieSicht = true;
    for (let k = f.alle ? 0 : i + 1; k < z.n; k++) {
      if (k === i) continue;
      freieSicht = true;                                   // im Original für jeden K neu gesetzt – wirkt also nur beim letzten K
      const dx = z.x[k] - xi, dy = z.y[k] - yi, d2 = dx * dx + dy * dy;
      if (d2 > grenze) continue;
      const d = rund(Math.sqrt(d2));
      if (d >= A) continue;
      if (d < z.sd[i]) { z.sd[i] = d; z.nb[i] = k; }      // nächster Nachbar (NeigborList[0])
      if (f.sicht) {
        const w = sichtWinkel(z.sx[i], z.sy[i], z.sx[k], z.sy[k], p.arccos);
        if (!(w < komp)) continue;
        if (w < 5) freieSicht = false;
      }
      sumX += z.sx[k]; sumY += z.sy[k]; zahl++;
    }
    if (zahl > 0) {
      if (z.sd[i] > p.mindest && freieSicht) { z.lx[i] = sumX / zahl; z.ly[i] = sumY / zahl; }
      else zufallsRichtung(z, i, f.nah);                   // zu nah oder Sicht verstellt: SetRndDir
    }
    return zahl;
  }

  /** Vektor auf die Höchstgeschwindigkeit begrenzen (neu; im Original wächst er unbegrenzt) */
  function begrenze(z, i, vmax) {
    const v = Math.hypot(z.sx[i], z.sy[i]);
    if (v > vmax) { z.sx[i] *= vmax / v; z.sy[i] *= vmax / v; }
  }

  /** Bewegung eines Agenten (Schleife in ApplicationEvents1Idle) */
  function bewege(z, i, p, f) {
    const m = z.maus;
    if (f.schwarm && p.schwarm) {                         // LimboPos übertragen
      const [a, b, c] = f.mischung;
      z.sx[i] = c * (a * z.sx[i] + b * z.lx[i]);
      z.sy[i] = c * (a * z.sy[i] + b * z.ly[i]);
    }
    if (m.aktiv && abstand(z.x[i], z.y[i], m.x, m.y) < p.mausRadius) {   // MausInteraktion
      const dir = p.mausModus === "anziehen" ? -1 : 1;
      z.sx[i] = dir * rund((z.x[i] - m.x) * 0.1);
      z.sy[i] = dir * rund((z.y[i] - m.y) * 0.1);
    } else {
      zufallsRichtung(z, i, f.zufall);                    // BewegungsVektor verändern
      begrenze(z, i, p.vmax);
    }
    if (f.torus) {                                        // „Randlos Torus“: erst umsetzen, dann bewegen (wie im Original)
      if (z.x[i] < RAND.links) z.x[i] = RAND.rechts;
      if (z.x[i] > RAND.rechts) z.x[i] = RAND.links;
      if (z.y[i] < RAND.oben) z.y[i] = RAND.unten;
      if (z.y[i] > RAND.unten) z.y[i] = RAND.oben;
    } else {                                              // 01: „Rand nicht überschreiten“ – Vektor umkehren
      if (z.x[i] < RAND.oben) z.sx[i] = -z.sx[i];         // (Original vergleicht x mit TOP_BORDER; beide sind 5)
      if (z.x[i] > RAND.rechts) z.sx[i] = -z.sx[i];
      if (z.y[i] < RAND.oben) z.sy[i] = -z.sy[i];
      if (z.y[i] > RAND.unten) z.sy[i] = -z.sy[i];
    }
    z.x[i] += rund(z.sx[i]);
    z.y[i] += rund(z.sy[i]);
  }

  /** Zelle unter einem Punkt (lookCell: round((Pos − 5) / 10)) oder −1 außerhalb */
  function zelleVon(x, y) {
    const k = rund((x - ZELLE / 2) / ZELLE), r = rund((y - ZELLE / 2) / ZELLE);
    return k < 0 || k > SPALTEN - 1 || r < 0 || r > ZEILEN - 1 ? -1 : r * SPALTEN + k;
  }

  /** 01/02 „Zellen markieren“: Zellen unter Agenten 10, sonst 1, wenn ein Moore-Nachbar 10 ist (checkNeighbour);
      nur innere Zellen (cellStates läuft von 1 bis reih − 2 bzw. spalt − 2), jede Runde neu (limboWorld wird gelöscht). */
  function markiere(z) {
    const unter = new Uint8Array(SPALTEN * ZEILEN);
    for (let i = 0; i < z.n; i++) { const c = zelleVon(z.x[i], z.y[i]); if (c >= 0) unter[c] = 1; }
    z.marke.fill(0);
    for (let r = 1; r < ZEILEN - 1; r++) for (let k = 1; k < SPALTEN - 1; k++) {
      const c = r * SPALTEN + k;
      if (unter[c]) { z.marke[c] = 10; continue; }
      let s = 0;
      for (let v = -1; v <= 1 && !s; v++) for (let u = -1; u <= 1; u++) if (unter[c + v * SPALTEN + u]) { s = 1; break; }
      if (s) z.marke[c] = 1;
    }
  }
  /** 03 „Zellen markieren“: Passed der Zelle unter jedem Agenten + 1, höchstens 255 */
  function begehe(z) {
    for (let i = 0; i < z.n; i++) { const c = zelleVon(z.x[i], z.y[i]); if (c >= 0 && z.begangen[c] < 255) z.begangen[c]++; }
  }

  /** Ein Durchlauf der Idle-Prozedur */
  function schritt(z, param) {
    const p = Object.assign({}, STANDARD, param), f = FASSUNGEN[p.fassung] || FASSUNGEN["03"];
    if (f.schwarm && p.schwarm) {                         // Swarming(): alte Positionen merken, Nachbarn bestimmen
      for (let j = 0; j < z.n; j++) { z.ox[j] = z.x[j]; z.oy[j] = z.y[j]; nachbarn(z, j, p, f); }
    }
    for (let i = 0; i < z.n; i++) bewege(z, i, p, f);
    if (p.fassung === "03") { if (p.zellen) begehe(z); z.marke.fill(0); }
    else if (p.zellen) markiere(z); else z.marke.fill(0);
    z.t++;
    return z;
  }

  /** Parameter ohne Neustart: „Zellen markieren“ zeigt in 01/02 sofort den Stand */
  function aendere(z, param, id) {
    const p = Object.assign({}, STANDARD, param);
    if (id === "zellen" && p.fassung !== "03") { if (p.zellen) markiere(z); else z.marke.fill(0); }
  }

  /** Ordnung des Schwarms: Länge des mittleren Vektors / mittlere Länge (0 = ungeordnet, 1 = alle gleich gerichtet) */
  function ordnung(z) {
    let sx = 0, sy = 0, s = 0;
    for (let i = 0; i < z.n; i++) { sx += z.sx[i]; sy += z.sy[i]; s += Math.hypot(z.sx[i], z.sy[i]); }
    return s > 0 ? Math.hypot(sx, sy) / s : 0;
  }
  /** Mittlere Ausrichtung zum nächsten Nachbarn (lokale Ordnung): Mittel von cos(Winkel) zwischen Agent und nächstem Agenten im Radius */
  function lokaleOrdnung(z, radius) {
    let s = 0, k = 0;
    for (let i = 0; i < z.n; i++) {
      let best = Infinity, j = -1;
      for (let q = 0; q < z.n; q++) { if (q === i) continue; const d = (z.x[q] - z.x[i]) ** 2 + (z.y[q] - z.y[i]) ** 2; if (d < best) { best = d; j = q; } }
      if (j < 0 || best >= radius * radius) continue;
      const a = Math.hypot(z.sx[i], z.sy[i]) * Math.hypot(z.sx[j], z.sy[j]);
      if (a > 0) { s += (z.sx[i] * z.sx[j] + z.sy[i] * z.sy[j]) / a; k++; }
    }
    return k ? s / k : 0;
  }
  /** mittlere Geschwindigkeit in px je Schritt */
  function tempo(z) { let s = 0; for (let i = 0; i < z.n; i++) s += Math.hypot(z.sx[i], z.sy[i]); return z.n ? s / z.n : 0; }
  /** Anteil der Zellen mit Markierung (01/02) bzw. mit mindestens einer Begehung (03) */
  function zellAnteil(z, fassung) {
    const a = fassung === "03" ? z.begangen : z.marke; let k = 0;
    for (let c = 0; c < a.length; c++) if (a[c]) k++;
    return k / a.length;
  }

  return { STANDARD, VOR, FASSUNGEN, BREITE, HOEHE, ZELLE, SPALTEN, ZEILEN, RAND, MAX_AGENTEN, LINIE_01,
           rund, abstand, erzeuge, erzeugeAgenten, loescheAgenten, zellenSchwarz, setzeMaus, sichtWinkel, nachbarn, bewege,
           begrenze, zelleVon, markiere, begehe, schritt, aendere, ordnung, lokaleOrdnung, tempo, zellAnteil };
});
