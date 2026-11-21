/* Segregation durch Eigenschaftsanpassung · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 522_SegregationEigenschaft „Segregation Model“ 1.0 (Delphi, 18.12.2005, Reinhard König),
   Kapitel 5.2.2 der Dissertation „Dynamische Simulation und Visualisierung räumlicher Prozesse“ (2008), nach Batty (2005).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (aus CellForm.pas):
   - setupCells: jede Zelle erhält zufällig die Eigenschaft 0 (schwarz, Weintrinker) oder 1 (weiß, Biertrinker), random(2);
     „mit leeren Zellen“: random(3), der Wert 2 ist eine leere Zelle (grau), die nie mitrechnet.
   - checkNei/Timer1Timer ohne leere Zellen: neighSum = Zahl der weißen Zellen unter den acht Nachbarn (Torus);
     neighSum > Schwellenwert → weiß, neighSum < Schwellenwert → schwarz, gleich → unverändert.
   - mit leeren Zellen: in der 3 × 3-Moore-Nachbarschaft werden weiße und schwarze Zellen gezählt – die Zelle selbst
     zählt dabei mit (checkNei zieht den eigenen Wert nur von neighSum ab); die Mehrheit setzt sich durch, Gleichstand → unverändert.
   - Timer1Timer zählt erst alle Nachbarschaften, dann ändert er alle Zellen: synchrone Aktualisierung.
   - B_disturbClick: jede (nicht leere) Zelle erhält mit Wahrscheinlichkeit „Störwert“ eine neue zufällige Eigenschaft random(2). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SPALTEN = 101, ZEILEN = 101;   // round(404 / cellScal 4): ZeichenPanel 404 × 404 px im Original
  const SCHWARZ = 0, WEISS = 1, LEER = 2;

  /** Voreinstellungen wie im Original (CellForm.dfm: Edit_thresh 4, Edit_disturb 0,45, cb_leerZell aus) */
  const STANDARD = {
    schwelle: 4,      // Schwellenwert (ohne leere Zellen), Zahl weißer Nachbarn
    leer: false,      // „mit leeren Zellen“
    stoerwert: 0.45,  // Stärke der Störung
    verlauf: true     // Diagramm wie RChart1 (nur Darstellung)
  };

  /** Torus wie in checkNei: ein Überlauf um eine Zelle wird auf die andere Seite geklappt */
  function torus(v, n) { return v < 0 ? n + v : v > n - 1 ? v - n : v; }
  const mod = (v, n) => ((v % n) + n) % n;

  /** Regel ohne leere Zellen: weiße Nachbarn (von acht) gegen den Schwellenwert, Gleichstand behält die Eigenschaft */
  function regelSchwelle(weiss, schwelle, alt) { return weiss > schwelle ? WEISS : weiss < schwelle ? SCHWARZ : alt; }

  /** Regel mit leeren Zellen: Mehrheit der weißen und schwarzen Zellen im 3 × 3-Block (mit der Zelle selbst) */
  function regelMehrheit(weiss, schwarz, alt) { return weiss > schwarz ? WEISS : schwarz > weiss ? SCHWARZ : alt; }

  /** Weiße und schwarze Zellen im 3 × 3-Block um (x, y), Torus; mitte: Zelle selbst mitzählen */
  function zaehle(z, x, y, mitte) {
    let w = 0, s = 0;
    for (let v = -1; v <= 1; v++) {
      const yy = torus(y + v, z.zeilen) * z.spalten;
      for (let u = -1; u <= 1; u++) {
        if (!mitte && u === 0 && v === 0) continue;
        const c = z.feld[yy + torus(x + u, z.spalten)];
        if (c === WEISS) w++; else if (c === SCHWARZ) s++;
      }
    }
    return [w, s];
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const n = SPALTEN * ZEILEN;
    const z = { t: 0, zufall, spalten: SPALTEN, zeilen: ZEILEN, breite: SPALTEN, hoehe: ZEILEN, leer: !!p.leer,
                feld: new Uint8Array(n), neu: new Uint8Array(n), geaendert: 0, verlauf: [], fertig: null, stoerungen: [] };
    for (let i = 0; i < n; i++) z.feld[i] = zufall.ganz(z.leer ? 3 : 2);   // random(3) bzw. random(2)
    z.verlauf.push(messe(z));
    return z;
  }

  /** Ein Zeitschritt (Timer1Timer): alle Nachbarschaften zählen, dann alle Zellen gleichzeitig ändern */
  function schritt(z, p) {
    const S = z.spalten, Z = z.zeilen, f = z.feld, g = z.neu;
    let k = 0;
    for (let y = 0; y < Z; y++) {
      for (let x = 0; x < S; x++) {
        const i = y * S + x, alt = f[i];
        if (alt === LEER) { g[i] = LEER; continue; }
        const [w, s] = zaehle(z, x, y, z.leer);
        const neu = z.leer ? regelMehrheit(w, s, alt) : regelSchwelle(w, p.schwelle, alt);
        g[i] = neu; if (neu !== alt) k++;
      }
    }
    z.feld = g; z.neu = f; z.geaendert = k;
    z.t++;
    const m = messe(z); m[2] = k / Math.max(1, zellen(z)); z.verlauf.push(m);
    if (k === 0 && z.fertig == null) z.fertig = z.t;
    return z;
  }

  /** Störung (B_disturbClick): jede nicht leere Zelle mit Wahrscheinlichkeit stoerwert neu würfeln, random(2) */
  function stoere(z, p) {
    for (let i = 0; i < z.feld.length; i++) {
      if (z.feld[i] === LEER) continue;
      if (z.zufall() < p.stoerwert) z.feld[i] = z.zufall.ganz(2);
    }
    z.fertig = null; z.geaendert = 0; z.stoerungen.push(z.t);
    z.verlauf[z.verlauf.length - 1] = messe(z);
  }

  /** Zellen setzen (Maus): eigene Ergänzung, eine örtliche Störung von Hand (Kreis mit Radius r um x, y) */
  function setze(z, x, y, wert, r = 2) {
    const cx = Math.floor(x), cy = Math.floor(y);
    for (let v = -r; v <= r; v++) for (let u = -r; u <= r; u++) {
      if (u * u + v * v > r * r + 1) continue;
      const i = mod(cy + v, z.zeilen) * z.spalten + mod(cx + u, z.spalten);
      if (z.feld[i] !== LEER) z.feld[i] = wert;
    }
    z.fertig = null;
    z.verlauf[z.verlauf.length - 1] = messe(z);
  }

  /** Schwellenwert ohne Neustart: wirkt im nächsten Schritt (wie Edit_thresh im Original); Ruhe neu prüfen */
  function aendere(z, p, id) { if (id === "schwelle") z.fertig = null; }

  /** Zahl der nicht leeren Zellen (cellSum) */
  function zellen(z) { let k = 0; for (let i = 0; i < z.feld.length; i++) if (z.feld[i] !== LEER) k++; return k; }

  /** Anteil weißer Zellen (Durchschnittswert stateSum / cellSum) */
  function anteilWeiss(z) { let w = 0, k = 0; for (let i = 0; i < z.feld.length; i++) { const c = z.feld[i]; if (c !== LEER) { k++; w += c; } } return k ? w / k : 0; }

  /** Mittlerer Anteil gleicher unter den belegten Nachbarn (0 … 1) – Maß der Segregation */
  function gleicheNachbarn(z) {
    let s = 0, k = 0;
    for (let y = 0; y < z.zeilen; y++) for (let x = 0; x < z.spalten; x++) {
      const c = z.feld[y * z.spalten + x]; if (c === LEER) continue;
      const [w, b] = zaehle(z, x, y, false), n = w + b; if (!n) continue;
      s += (c === WEISS ? w : b) / n; k++;
    }
    return k ? s / k : 0;
  }

  /** Verlauf je Schritt: [Anteil weiß, gleiche Nachbarn, geänderte Zellen (Anteil)] */
  function messe(z) { return [anteilWeiss(z), gleicheNachbarn(z), 0]; }

  return { STANDARD, SPALTEN, ZEILEN, SCHWARZ, WEISS, LEER, torus, regelSchwelle, regelMehrheit, zaehle,
           erzeuge, schritt, stoere, setze, aendere, zellen, anteilWeiss, gleicheNachbarn };
});
