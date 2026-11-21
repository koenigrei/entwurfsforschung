/* Interaktionsmodell Standortwahl und Skalenerträge · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 570_Interakt_Standort_Skalenertr „Segregation and Economies of Scale“ (Delphi, März 2006, Reinhard König),
   Kapitel 5.7 der Dissertation „Dynamische Simulation und Visualisierung räumlicher Prozesse“ (2008).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (aus CellForm.pas, Projekt segregation04_scale), je Schritt (execPerStep):
   - calcBidPrice: Angebotspreis jedes Marktes  P_j = Kunden_j / Kunden_j^S · Produktionskosten  (ohne Kunden: Produktionskosten)
   - setLocP: Ortspreis jeder Zelle  N_i = min_j (P_j + d_ij · Fahrtkosten); die Zelle gehört zum Einzugsgebiet dieses Marktes,
     ein Agent auf der Zelle ist dessen Kunde (changeArea).
   - calcAgents: unzufriedene Agenten springen um random(20) − 10 Zellen je Achse (Torus) auf eine freie Zelle.
   - calcCells (Schalter „activate: segregation“): Anteil gleicher Nachbarn > Schwellenwert → angehalten (wie 521/560).
   - compareLoc (Schalter „activate: look for centers“): angehaltene Agenten prüfen bis zu zehn Orte und ziehen auf den
     ersten freien mit kleinerem Ortspreis.
   Zu Beginn sind alle Agenten angehalten (Stopped = true); es gibt kein Ende, die Märkte konkurrieren weiter. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SPALTEN = 40, ZEILEN = 40;   // round(404 / cellScal 10)
  const MAERKTE = 10;                // market: Array [0..9]
  const FREI = -1;
  const VERSUCHE = 100, PRUEFUNGEN = 10;

  /** Voreinstellungen wie im Original (CellForm.dfm): SB_ProdKost 100, SB_FahrtKost 50 · 2/100, SB_Skalen 1 + 100/1000 − 0,1,
      TrB_thresh 3/8, Edit_anzAg 800, beide Schalter an */
  const STANDARD = {
    produktionskosten: 100,
    fahrtkosten: 1,
    skalen: 1,
    schwelle: 3,
    anzahl: 800,
    segregation: true,
    zentren: true,
    ansicht: "gebiete",
    verlauf: true
  };
  const mitStandard = p => Object.assign({}, STANDARD, p);

  function torus(v, n) { return v < 0 ? n + v : v > n - 1 ? v - n : v; }
  /** Sprung wie im Original: random(20) − 10 → −10 … +9 */
  function sprung(zufall) { return zufall.ganz(20) - 10; }
  function abstand(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }   // CalcDistance, hier ungerundet (Double)
  /** Angebotspreis (calcBidPrice) */
  function angebotspreis(kunden, s, produktionskosten) { return kunden <= 0 ? produktionskosten : kunden / Math.pow(kunden, s) * produktionskosten; }
  function aehnlich(gleich, anders) { const s = gleich + anders; return s > 0 ? gleich / s * 100 : 0; }
  function zufrieden(anteil, achtel) { return anteil > achtel * 12.5; }

  function erzeuge(param, zufall) {
    const p = mitStandard(param);
    const N = SPALTEN * ZEILEN, n = Math.max(0, Math.min(N - 1, Math.round(p.anzahl)));
    const z = {
      t: 0, zufall, spalten: SPALTEN, zeilen: ZEILEN, breite: SPALTEN, hoehe: ZEILEN, n,
      maerkte: [], distM: new Float64Array(N * MAERKTE), preis: new Float64Array(MAERKTE).fill(1), kunden: new Int32Array(MAERKTE),
      ortspreis: new Float64Array(N), gebiet: new Int8Array(N),
      zelle: new Int16Array(N).fill(FREI), x: new Int16Array(n), y: new Int16Array(n), typ: new Uint8Array(n),
      sucht: new Uint8Array(n), anteil: new Float32Array(n), nachbarn: new Uint8Array(n), suchend: 0, verlauf: []
    };
    // setupCells: zehn Märkte auf zufälligen Zellen (hier verschiedene), Entfernungen und nächster Markt je Zelle (bestMarket)
    const belegt = new Set();
    while (z.maerkte.length < MAERKTE) { const x = zufall.ganz(SPALTEN), y = zufall.ganz(ZEILEN); if (!belegt.has(y * SPALTEN + x)) { belegt.add(y * SPALTEN + x); z.maerkte.push([x, y]); } }
    for (let c = 0; c < N; c++) {
      const x = c % SPALTEN, y = (c / SPALTEN) | 0; let d = 10000, k = 0;
      for (let m = 0; m < MAERKTE; m++) { const e = abstand(x, y, z.maerkte[m][0], z.maerkte[m][1]); z.distM[c * MAERKTE + m] = e; if (e < d) { d = e; k = m; } }
      z.gebiet[c] = k; z.ortspreis[c] = 1 + d * p.fahrtkosten;
    }
    // setupAgents: freie zufällige Zelle, Typ random(2), angehalten
    for (let i = 0; i < n; i++) {
      let x, y;
      do { x = zufall.ganz(SPALTEN); y = zufall.ganz(ZEILEN); } while (z.zelle[y * SPALTEN + x] !== FREI);
      z.x[i] = x; z.y[i] = y; z.typ[i] = zufall.ganz(2); z.zelle[y * SPALTEN + x] = i;
    }
    zaehleKunden(z); zaehleAlle(z);
    z.verlauf.push(messe(z));
    return z;
  }

  /** Kunden je Markt: Agenten im Einzugsgebiet (entspricht der laufenden Buchführung mit changeArea) */
  function zaehleKunden(z) {
    z.kunden.fill(0);
    for (let i = 0; i < z.n; i++) z.kunden[z.gebiet[z.y[i] * z.spalten + z.x[i]]]++;
  }

  /** calcBidPrice */
  function bietpreise(z, p) { for (let m = 0; m < MAERKTE; m++) z.preis[m] = angebotspreis(z.kunden[m], p.skalen, p.produktionskosten); }

  /** setLocP: günstigster Preis inklusive Fahrtkosten je Zelle; bei Gleichstand gewinnt der Markt mit der kleineren Nummer */
  function ortspreise(z, p) {
    const N = z.spalten * z.zeilen;
    for (let c = 0; c < N; c++) {
      let best = Infinity, k = 0;
      for (let m = 0; m < MAERKTE; m++) { const v = z.preis[m] + z.distM[c * MAERKTE + m] * p.fahrtkosten; if (v < best) { best = v; k = m; } }
      z.ortspreis[c] = best; z.gebiet[c] = k;
    }
    zaehleKunden(z);
  }

  function zaehle(z, x, y, typ) {
    let gleich = 0, anders = 0;
    for (let v = -1; v <= 1; v++) {
      const yy = torus(y + v, z.zeilen);
      for (let u = -1; u <= 1; u++) {
        if (u === 0 && v === 0) continue;
        const a = z.zelle[yy * z.spalten + torus(x + u, z.spalten)];
        if (a === FREI) continue;
        if (z.typ[a] === typ) gleich++; else anders++;
      }
    }
    return [gleich, anders];
  }
  function zaehleAlle(z) { for (let i = 0; i < z.n; i++) { const [g, a] = zaehle(z, z.x[i], z.y[i], z.typ[i]); z.anteil[i] = aehnlich(g, a); z.nachbarn[i] = g + a; } }

  function bewege(z, i, tx, ty) { z.zelle[z.y[i] * z.spalten + z.x[i]] = FREI; z.zelle[ty * z.spalten + tx] = i; z.x[i] = tx; z.y[i] = ty; }

  /** calcAgents: unzufriedene Agenten springen auf eine freie Zelle (höchstens 100 Versuche) */
  function ziehe(z) {
    for (let i = 0; i < z.n; i++) {
      if (!z.sucht[i]) continue;
      for (let k = 0; k < VERSUCHE; k++) {
        const tx = torus(z.x[i] + sprung(z.zufall), z.spalten), ty = torus(z.y[i] + sprung(z.zufall), z.zeilen);
        if (z.zelle[ty * z.spalten + tx] === FREI) { bewege(z, i, tx, ty); break; }
      }
    }
  }

  /** calcCells: Segregation; ausgeschaltet gelten alle als angehalten */
  function bewerte(z, p) {
    zaehleAlle(z);
    let s = 0;
    for (let i = 0; i < z.n; i++) { z.sucht[i] = p.segregation && !zufrieden(z.anteil[i], p.schwelle) ? 1 : 0; s += z.sucht[i]; }
    z.suchend = s;
  }

  /** compareLoc: angehaltene Agenten suchen einen freien Ort mit kleinerem Ortspreis (höchstens zehn Versuche) */
  function vergleiche(z) {
    let k = 0;
    for (let i = 0; i < z.n; i++) {
      if (z.sucht[i]) continue;
      const jetzt = z.ortspreis[z.y[i] * z.spalten + z.x[i]];
      for (let v = 0; v < PRUEFUNGEN; v++) {
        const tx = torus(z.x[i] + sprung(z.zufall), z.spalten), ty = torus(z.y[i] + sprung(z.zufall), z.zeilen), c = ty * z.spalten + tx;
        if (z.ortspreis[c] < jetzt && z.zelle[c] === FREI) { bewege(z, i, tx, ty); k++; break; }
      }
    }
    return k;
  }

  /** Ein Zeitschritt (execPerStep) */
  function schritt(z, param) {
    const p = mitStandard(param);
    bietpreise(z, p);
    ortspreise(z, p);
    ziehe(z);
    bewerte(z, p);
    z.umzuege = p.zentren ? vergleiche(z) : 0;
    zaehleKunden(z);
    z.t++;
    z.verlauf.push(messe(z));
    return z;
  }

  /** Parameter ohne Neustart: Preise, Fahrtkosten und Skalenertrag gelten ab dem nächsten Schritt, Schwellenwert und
      Segregationsschalter sofort (Suchen/Anhalten neu bewerten); Fahrtkosten: Ortspreise sofort neu, damit das Bild stimmt */
  function aendere(z, param, id) {
    const p = mitStandard(param);
    if (id === "schwelle" || id === "segregation") bewerte(z, p);
    if (id === "fahrtkosten" || id === "produktionskosten" || id === "skalen") { if (z.t > 0) { bietpreise(z, p); ortspreise(z, p); } }
  }

  /** Märkte mit mindestens einem Kunden */
  function aktiveMaerkte(z) { let k = 0; for (let m = 0; m < MAERKTE; m++) if (z.kunden[m] > 0) k++; return k; }
  /** Größter Anteil eines Marktes an allen Kunden */
  function groessterAnteil(z) { let g = 0; for (let m = 0; m < MAERKTE; m++) g = Math.max(g, z.kunden[m]); return z.n ? g / z.n : 0; }
  function gleicheNachbarn(z) { let s = 0, k = 0; for (let i = 0; i < z.n; i++) if (z.nachbarn[i] > 0) { s += z.anteil[i]; k++; } return k ? s / k : 0; }
  function mittlererOrtspreis(z) { let s = 0; for (let i = 0; i < z.n; i++) s += z.ortspreis[z.y[i] * z.spalten + z.x[i]]; return z.n ? s / z.n : 0; }

  /** Verlauf je Schritt: [Kunden je Markt (10), Angebotspreise (10)] */
  function messe(z) { return [Array.from(z.kunden), Array.from(z.preis)]; }

  return { STANDARD, SPALTEN, ZEILEN, MAERKTE, FREI, torus, sprung, abstand, angebotspreis, aehnlich, zufrieden, zaehle,
           erzeuge, bietpreise, ortspreise, zaehleKunden, ziehe, bewerte, vergleiche, schritt, aendere,
           aktiveMaerkte, groessterAnteil, gleicheNachbarn, mittlererOrtspreis };
});
