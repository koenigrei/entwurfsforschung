/* Shortest Path with A* · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 13_Pathfinding (Delphi 2005, Reinhard König; Projekt A_Stern.dpr, Unit facsSteer.pas, Version 1.0 vom 16.07.2005,
   „Wände werden nicht diagonal geschnitten“ seit 17.07.2005).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (facsSteer.pas):
     findPath       – Startzelle in die offene Liste; solange die Liste nicht leer und das Ziel nicht gefunden ist: letzten Eintrag
                      (kleinstes F) als expandierten Knoten schließen, Nachbarn prüfen, Liste absteigend nach F sortieren, Knoten entfernen.
     checkNeighbour – die 3 × 3 Nachbarn (Zeile außen, Spalte innen); Wände (State 999) und geschlossene Zellen werden übergangen.
                      Neue Zelle: F, G, H berechnen, Vorgänger setzen, in die offene Liste – außer die Wand würde diagonal geschnitten.
                      Schon offen: neues G nur übernehmen (mit neuem Vorgänger), wenn es nicht größer ist als das alte.
                      Das Ziel gilt als gefunden, sobald es in die offene Liste kommt.
     calcF          – G = G(Vorgänger) + 10 (waagerecht/senkrecht) bzw. + 14 (diagonal); H = 10 · (|Δx| + |Δy|) bis zum Ziel; F = G + H.
                      Diagonal: Liegt eine der vier waagerecht/senkrecht benachbarten Zellen der neuen Zelle in einer Wand, wird
                      die Wand „diagonal geschnitten“ und der Schritt verworfen.
   Ein Schritt der App = ein Durchlauf der while-Schleife (ein expandierter Knoten); das Original lief bis zum Ende ohne Anzeige. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ZELLE = 14;                                   // cellScal
  const SPALTEN = Math.round(758 / ZELLE);            // ImagePaint 758 × 458 px → 54 × 33 Zellen
  const ZEILEN = Math.round(458 / ZELLE);
  const FREI = 0, WAND = 1;                           // Original: State 0 bzw. 999

  /** Voreinstellungen: Werkzeug der Maus (neu) und „Pfad sofort“ (Original: Suche bei jedem Loslassen der Maus) */
  const STANDARD = { werkzeug: "wand", sofort: true };
  /** Ausgangslage wie RectanglCreate: Start cellList[20,5], Ziel cellList[20,50], Wand in Spalte 30, Zeilen 10–30 */
  const START = { zeile: 20, spalte: 5 }, ZIEL = { zeile: 20, spalte: 50 };

  const idx = (zeile, spalte) => zeile * SPALTEN + spalte;
  const imFeld = (zeile, spalte) => zeile >= 0 && spalte >= 0 && zeile < ZEILEN && spalte < SPALTEN;

  function erzeuge(param, zufall) {
    const n = SPALTEN * ZEILEN;
    const z = {
      t: 0, zufall, spalten: SPALTEN, zeilen: ZEILEN, zelle: new Uint8Array(n),
      start: idx(START.zeile, START.spalte), ziel: idx(ZIEL.zeile, ZIEL.spalte),
      F: new Int32Array(n), G: new Int32Array(n), H: new Int32Array(n), vorg: new Int32Array(n), geschlossen: new Uint8Array(n),
      offen: [], inOffen: new Uint8Array(n), iter: 0, status: "sucht", pfad: [], kosten: 0, optimum: null, letzte: -1
    };
    for (let i = 0; i <= 20; i++) z.zelle[idx(10 + i, 30)] = WAND;
    neueSuche(z);
    return z;
  }

  /** deletePath + Anfang von findPath: Listen leeren, F/G/H/closed zurücksetzen, Startzelle in die offene Liste */
  function neueSuche(z) {
    z.F.fill(0); z.G.fill(0); z.H.fill(0); z.vorg.fill(-1); z.geschlossen.fill(0); z.inOffen.fill(0);
    z.offen = [z.start]; z.inOffen[z.start] = 1;
    z.iter = 0; z.status = "sucht"; z.pfad = []; z.kosten = 0; z.letzte = -1; z.optimum = null;
    return z;
  }

  /** Prüfung des Originals: eine der vier waagerecht/senkrecht benachbarten Zellen von (zeile, spalte) ist Wand */
  function wandDaneben(z, zeile, spalte) {
    const d = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (const [a, b] of d) { const i = zeile + a, k = spalte + b; if (imFeld(i, k) && z.zelle[idx(i, k)] === WAND) return true; }
    return false;
  }

  /** calcF: G, H, F der Zelle me über den Vorgänger vorg; liefert cutWall (Wand würde diagonal geschnitten) */
  function berechneF(z, vorg, me) {
    const vz = Math.floor(vorg / SPALTEN), vs = vorg % SPALTEN, mz = Math.floor(me / SPALTEN), ms = me % SPALTEN;
    let schneidet = false;
    if (Math.abs(vs - ms) === 1 && Math.abs(vz - mz) === 1) {
      z.G[me] = z.G[vorg] + 14;
      schneidet = wandDaneben(z, mz, ms);
    } else z.G[me] = z.G[vorg] + 10;
    const zz = Math.floor(z.ziel / SPALTEN), zs = z.ziel % SPALTEN;
    z.H[me] = 10 * Math.abs(zs - ms) + 10 * Math.abs(zz - mz);
    z.F[me] = z.G[me] + z.H[me];
    return schneidet;
  }

  /** checkNeighbour: Nachbarn des expandierten Knotens prüfen; true, wenn das Ziel in die offene Liste kam */
  function pruefeNachbarn(z, knoten) {
    const zeile = Math.floor(knoten / SPALTEN), spalte = knoten % SPALTEN;
    let gefunden = false;
    for (let i = zeile - 1; i <= zeile + 1; i++) {
      for (let k = spalte - 1; k <= spalte + 1; k++) {
        if (!imFeld(i, k)) continue;
        const me = idx(i, k);
        if (z.zelle[me] === WAND || z.geschlossen[me]) continue;
        if (!z.inOffen[me]) {
          const schneidet = berechneF(z, knoten, me);
          if (!schneidet) {
            z.vorg[me] = knoten; z.offen.push(me); z.inOffen[me] = 1;
            if (me === z.ziel) gefunden = true;
          }
        } else {
          const altG = z.G[me], altH = z.H[me], altF = z.F[me];
          const schneidet = berechneF(z, knoten, me);
          if (altG < z.G[me] || schneidet) { z.G[me] = altG; z.H[me] = altH; z.F[me] = altF; }
          else z.vorg[me] = knoten;
        }
      }
    }
    return gefunden;
  }

  /** compareByF + TList.Sort: absteigend nach F, der letzte Eintrag hat das kleinste F (hier stabil sortiert) */
  function sortiere(z) { const F = z.F; z.offen.sort((a, b) => F[b] - F[a]); }

  /** Ein Durchlauf der while-Schleife von findPath; false, wenn die Suche schon beendet war */
  function suchSchritt(z) {
    if (z.status !== "sucht") return false;
    if (!z.offen.length) { z.status = "keinPfad"; return false; }
    const knoten = z.offen[z.offen.length - 1];
    z.geschlossen[knoten] = 1; z.letzte = knoten;
    const gefunden = pruefeNachbarn(z, knoten);
    sortiere(z);
    const p = z.offen.indexOf(knoten); if (p >= 0) z.offen.splice(p, 1);
    z.inOffen[knoten] = 0;
    z.iter++;
    if (gefunden) { z.status = "gefunden"; pfadAus(z); }
    else if (!z.offen.length) z.status = "keinPfad";
    return true;
  }

  const diagonal = (a, b) => Math.abs(a % SPALTEN - b % SPALTEN) === 1 && Math.abs(Math.floor(a / SPALTEN) - Math.floor(b / SPALTEN)) === 1;
  /** Pfad (Vorgänger-Kette vom Ziel zurück, ohne Start und Ziel – so färbt das Original) und seine Kosten (10/14 je Schritt) */
  function pfadAus(z) {
    const p = [];
    let k = z.vorg[z.ziel], kosten = diagonal(k, z.ziel) ? 14 : 10;
    while (k !== z.start && k >= 0) { p.push(k); kosten += diagonal(z.vorg[k], k) ? 14 : 10; k = z.vorg[k]; }
    z.pfad = p; z.kosten = kosten;
    z.optimum = kuerzester(z);
  }

  /** Vergleich (neu): kürzester Weg nach denselben Zugregeln (10/14, kein diagonaler Schritt neben eine Wand) mit Dijkstra */
  function kuerzester(z) {
    const n = SPALTEN * ZEILEN, d = new Int32Array(n).fill(2147483647), fertig = new Uint8Array(n);
    d[z.start] = 0;
    for (;;) {
      let u = -1, best = 2147483647;
      for (let i = 0; i < n; i++) if (!fertig[i] && d[i] < best) { best = d[i]; u = i; }
      if (u < 0) return null;
      if (u === z.ziel) return d[u];
      fertig[u] = 1;
      const zeile = Math.floor(u / SPALTEN), spalte = u % SPALTEN;
      for (let i = zeile - 1; i <= zeile + 1; i++) for (let k = spalte - 1; k <= spalte + 1; k++) {
        if (!imFeld(i, k)) continue;
        const v = idx(i, k);
        if (v === u || z.zelle[v] === WAND || fertig[v]) continue;
        const diag = i !== zeile && k !== spalte;
        if (diag && wandDaneben(z, i, k)) continue;
        const w = d[u] + (diag ? 14 : 10);
        if (w < d[v]) d[v] = w;
      }
    }
  }

  /** ganze Suche auf einmal (wie findPath im Original) */
  function sucheGanz(z) { while (suchSchritt(z)); return z; }

  /** Ein Schritt der App: ein expandierter Knoten (nach dem Ende der Suche ohne Wirkung); erhöht z.t */
  function schritt(z, p) {
    suchSchritt(z);
    z.t++;
    return z;
  }

  /** Zelle unter einem Punkt (Modelleinheiten = Zellen); außerhalb → -1 */
  function zelleBei(x, y) {
    const k = Math.floor(x), i = Math.floor(y);
    return imFeld(i, k) ? idx(i, k) : -1;
  }

  /** Wand setzen/löschen (Original: mittlere Maustaste, mit Umschalt löschen); Start und Ziel bleiben frei. true bei Änderung. */
  function setzeWand(z, i, wand) {
    if (i < 0 || i === z.start || i === z.ziel) return false;
    const v = wand ? WAND : FREI;
    if (z.zelle[i] === v) return false;
    z.zelle[i] = v; return true;
  }
  /** Linie von a nach b (Zellenindizes) als Wand setzen/löschen, damit schnelles Ziehen keine Lücken lässt */
  function wandLinie(z, a, b, wand) {
    let geaendert = false;
    if (b < 0) return false;
    if (a < 0) a = b;
    const az = Math.floor(a / SPALTEN), as = a % SPALTEN, bz = Math.floor(b / SPALTEN), bs = b % SPALTEN;
    const n = Math.max(Math.abs(bz - az), Math.abs(bs - as), 1);
    for (let j = 0; j <= n; j++) geaendert = setzeWand(z, idx(Math.round(az + (bz - az) * j / n), Math.round(as + (bs - as) * j / n)), wand) || geaendert;
    return geaendert;
  }
  /** Start bzw. Ziel versetzen (Original: linke bzw. rechte Maustaste); eine Wand an der Stelle verschwindet (State := 1) */
  function setzeStart(z, i) { if (i < 0 || i === z.ziel || i === z.start) return false; z.zelle[i] = FREI; z.start = i; return true; }
  function setzeZiel(z, i) { if (i < 0 || i === z.start || i === z.ziel) return false; z.zelle[i] = FREI; z.ziel = i; return true; }
  /** alle Wände entfernen (neu) */
  function waendeLoeschen(z) { z.zelle.fill(FREI); }

  function aendere(z, p, id) {}

  /** Anteil der Zellen, die die Suche angefasst hat (geschlossen oder offen), an allen freien Zellen */
  function abgesucht(z) {
    let a = 0, frei = 0;
    for (let i = 0; i < z.zelle.length; i++) { if (z.zelle[i] === FREI) frei++; if (z.geschlossen[i] || z.inOffen[i]) a++; }
    return a / Math.max(1, frei);
  }

  return { STANDARD, ZELLE, SPALTEN, ZEILEN, FREI, WAND, START, ZIEL, idx, erzeuge, schritt, aendere, neueSuche, berechneF, wandDaneben,
           pruefeNachbarn, suchSchritt, sucheGanz, kuerzester, zelleBei, setzeWand, wandLinie, setzeStart, setzeZiel, waendeLoeschen, abgesucht };
});
