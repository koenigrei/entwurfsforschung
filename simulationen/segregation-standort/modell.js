/* Segregation durch Standortwahl · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 521_SegragationStandort „Segregation by Move“ (Delphi, Dezember 2005, Reinhard König),
   Kapitel 5.2.1 der Dissertation „Dynamische Simulation und Visualisierung räumlicher Prozesse“ (2008), nach Schelling.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (aus CellForm.pas):
   - calcCells/checkNei: Jeder Agent zählt in seiner 3 × 3-Moore-Nachbarschaft (Torus) die Agenten gleichen und anderen Typs
     (freie Zellen zählen nicht, er selbst auch nicht). Anteil gleicher = gleich / (gleich + anders) · 100, ohne Nachbarn 0.
     Liegt der Anteil ÜBER dem Schwellenwert, hält der Agent an (Stopped), sonst sucht er weiter.
   - calcAgents/ChangeHeading: Jeder suchende Agent springt in Listenreihenfolge um einen Zufallsversatz
     rndN(−10, 10) je Achse (Torus) und wiederholt den Sprung, bis die Zielzelle frei ist.
   - Timer1Timer: ein Schritt = erst alle Suchenden umziehen (calcAgents), dann alle neu bewerten (calcCells).
     Zu Beginn suchen alle Agenten (Stopped = false); der Lauf endet, wenn niemand mehr sucht.
   Optionen aus der erweiterten Fassung 521_SegragationStandort2: Nachbarschaftsradius, Umzugsweite, Anzahl Gruppen,
   Umzug nur in eine bessere Lage (calcAgents/testLocation dort). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SPALTEN = 40, ZEILEN = 40;   // round(404 / cellScal 10): ZeichenPanel 404 × 404 px im Original
  const FREI = -1;
  const VERSUCHE = 1000;             // Abbruch der Suche nach freier Zelle (resc > 1000 in der erweiterten Fassung)

  /** Voreinstellungen wie im Original (CellForm.dfm: Edit_thresh 74, Edit_anzAg 1000; Konstanten in CellForm.pas) */
  const STANDARD = {
    schwelle: 74,      // Schwellenwert in Prozent gleicher Nachbarn
    anzahl: 1000,      // Anzahl Agenten für Setup
    gruppen: 2,        // Grundmodell: zwei Typen (State 0 schwarz, 1 weiß)
    radius: 1,         // checkNei: Moore-Nachbarschaft mit Abstand 1
    weite: 10,         // ChangeHeading(180, 10): Sprungweite in Zellen
    nurBesser: false,  // erweiterte Fassung: nur umziehen, wenn der neue Ort mehr Gleiche bietet
    verlauf: true      // Diagramm wie RChart1 (nur Darstellung)
  };

  /** Torus wie TForm1.torus: ein Überlauf wird auf die andere Seite geklappt */
  function torus(v, n) { return v < 0 ? n + v : v > n - 1 ? v - n : v; }

  /** Zufallsversatz wie rndN(lower, upper) = round((upper − lower + 1) · Random + lower); für (−10, 10) also −10 … 11 */
  function rndN(zufall, unten, oben) { return Math.round((oben - unten + 1) * zufall() + unten); }

  /** Anteil gleicher Nachbarn in Prozent (calcCells: similar := neighSimi / nSum · 100, ohne Nachbarn 0) */
  function aehnlich(gleich, anders) { const s = gleich + anders; return s > 0 ? gleich / s * 100 : 0; }

  /** Anhalten, wenn der Anteil über dem Schwellenwert liegt (If similar > thresh then stopped := true) */
  function zufrieden(anteil, schwelle) { return anteil > schwelle; }

  /** Nachbarn eines Agenten vom Typ typ, gedacht auf Zelle (x, y): [gleich, anders] (checkNei, Torus).
      Die Mittelzelle zählt nicht (Original: zählt sich selbst und zieht 1 ab); ohne: Zelle, die als frei gilt (alter Ort). */
  function zaehle(z, x, y, typ, r, ohne = -1) {
    let gleich = 0, anders = 0;
    for (let v = -r; v <= r; v++) {
      const yy = torus(y + v, z.zeilen);
      for (let u = -r; u <= r; u++) {
        if (u === 0 && v === 0) continue;
        const n = yy * z.spalten + torus(x + u, z.spalten);
        if (n === ohne) continue;
        const a = z.zelle[n];
        if (a === FREI) continue;
        if (z.typ[a] === typ) gleich++; else anders++;
      }
    }
    return [gleich, anders];
  }

  /** Anteil gleicher Nachbarn aller Agenten an ihrem Ort neu zählen (z.anteil, z.nachbarn) */
  function zaehleAlle(z, r) {
    for (let i = 0; i < z.n; i++) {
      const [g, a] = zaehle(z, z.x[i], z.y[i], z.typ[i], r);
      z.anteil[i] = aehnlich(g, a); z.nachbarn[i] = g + a;
    }
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const n = Math.max(0, Math.min(SPALTEN * ZEILEN - 1, Math.round(p.anzahl)));
    const z = {
      t: 0, zufall, spalten: SPALTEN, zeilen: ZEILEN, breite: SPALTEN, hoehe: ZEILEN, n, gruppen: Math.max(2, Math.round(p.gruppen)),
      zelle: new Int16Array(SPALTEN * ZEILEN).fill(FREI),   // Agentennummer je Zelle (AgNr) oder FREI
      x: new Int16Array(n), y: new Int16Array(n), typ: new Uint8Array(n),
      sucht: new Uint8Array(n).fill(1),       // Stopped = false für alle (setupAgents)
      anteil: new Float32Array(n),            // Anteil gleicher Nachbarn je Agent (%)
      nachbarn: new Uint16Array(n),           // Zahl der Nachbarn je Agent
      suchend: n, verlauf: [], fertig: null
    };
    // setupAgents: zufällige Zelle und zufälliger Typ (random(spalt), random(reih), random(2)); hier nur freie Zellen
    for (let i = 0; i < n; i++) {
      let x, y;
      do { x = zufall.ganz(SPALTEN); y = zufall.ganz(ZEILEN); } while (z.zelle[y * SPALTEN + x] !== FREI);
      z.x[i] = x; z.y[i] = y; z.typ[i] = zufall.ganz(z.gruppen); z.zelle[y * SPALTEN + x] = i;
    }
    zaehleAlle(z, p.radius);
    z.verlauf.push([0, n, gleicheNachbarn(z)]);   // RChart1.MoveTo(0, 0): zu Beginn ist niemand angelagert
    return z;
  }

  /** Umzug aller suchenden Agenten in Listenreihenfolge (calcAgents). Liefert die Zahl der Umzüge. */
  function ziehe(z, p) {
    const w = Math.max(1, Math.round(p.weite)), r = p.radius;
    let umzuege = 0;
    for (let i = 0; i < z.n; i++) {
      if (!z.sucht[i]) continue;
      const alt = z.y[i] * z.spalten + z.x[i];
      let ziel = -1, tx = 0, ty = 0;
      for (let k = 0; k < VERSUCHE; k++) {       // repeat … until curCell.besetzt = false
        tx = torus(z.x[i] + rndN(z.zufall, -w, w), z.spalten);
        ty = torus(z.y[i] + rndN(z.zufall, -w, w), z.zeilen);
        const c = ty * z.spalten + tx;
        if (z.zelle[c] === FREI) { ziel = c; break; }
      }
      if (ziel < 0) continue;
      if (p.nurBesser) {                         // erweiterte Fassung: if tmpSati < similar then moveAgent
        const [g0, a0] = zaehle(z, z.x[i], z.y[i], z.typ[i], r);
        const [g1, a1] = zaehle(z, tx, ty, z.typ[i], r, alt);
        if (!(aehnlich(g0, a0) < aehnlich(g1, a1))) continue;
      }
      z.zelle[alt] = FREI; z.zelle[ziel] = i; z.x[i] = tx; z.y[i] = ty; umzuege++;
    }
    return umzuege;
  }

  /** Bewertung aller Agenten (calcCells): Anteil gleicher Nachbarn und Suchen/Anhalten nach dem Schwellenwert */
  function bewerte(z, p) {
    zaehleAlle(z, p.radius);
    let s = 0;
    for (let i = 0; i < z.n; i++) { z.sucht[i] = zufrieden(z.anteil[i], p.schwelle) ? 0 : 1; s += z.sucht[i]; }
    z.suchend = s;
    return s;
  }

  /** Ein Zeitschritt (Timer1Timer): calcAgents, dann calcCells; Verlauf [angelagert, suchend, gleiche Nachbarn %] */
  function schritt(z, p) {
    ziehe(z, p);
    bewerte(z, p);
    z.t++;
    z.verlauf.push([z.n - z.suchend, z.suchend, gleicheNachbarn(z)]);
    if (z.suchend === 0 && z.fertig == null) z.fertig = z.t;
    return z;
  }

  /** Parameter ohne Neustart: Schwellenwert und Radius gelten sofort (vor dem ersten Schritt suchen ohnehin alle) */
  function aendere(z, p, id) {
    if (id !== "schwelle" && id !== "radius") return;
    if (z.t === 0) { zaehleAlle(z, p.radius); z.verlauf[0][2] = gleicheNachbarn(z); return; }
    bewerte(z, p);
    if (z.suchend > 0) z.fertig = null; else if (z.fertig == null) z.fertig = z.t;
  }

  /** Mittlerer Anteil gleicher Nachbarn (%) über alle Agenten mit mindestens einem Nachbarn */
  function gleicheNachbarn(z) {
    let s = 0, k = 0;
    for (let i = 0; i < z.n; i++) if (z.nachbarn[i] > 0) { s += z.anteil[i]; k++; }
    return k ? s / k : 0;
  }

  return { STANDARD, SPALTEN, ZEILEN, FREI, VERSUCHE, torus, rndN, aehnlich, zufrieden, zaehle, zaehleAlle,
           erzeuge, ziehe, bewerte, schritt, aendere, gleicheNachbarn };
});
