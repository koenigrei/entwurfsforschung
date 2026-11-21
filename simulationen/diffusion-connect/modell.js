/* Diffusion Connect Model · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 23_diffusion-contract „Diffusion-Contact Model“ Version 1.0 (Delphi, 17.12.2005, Reinhard König), nach Batty,
   Cities and Complexity (2005), Kapitel 1.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (CellForm.pas, Timer1Timer; agenten.pas, ChangeHeading):
   - Feld 135 × 135 Zellen (ZeichenPanel 404 px / cellScal 3), Rand als Torus.
   - Jeder freie Agent dreht sich um rndN(−2, 2) · 45° und geht eine Zelle weit: StepX = round(sin(Heading)), StepY = round(cos(Heading)).
     Achtung Original: Heading steht in Grad, sin/cos erwarten Bogenmaß – die Richtung ist darum praktisch zufällig (Schalter „korrigiert“).
   - Jede Zelle zählt die Agenten auf sich (State). Unentwickelte Zellen beginnen jede Runde bei 0, entwickelte zählen weiter.
   - Danach für jede Zelle: Summe der States in der 3 × 3-Moore-Nachbarschaft (mit der Zelle selbst) > Schwellenwert,
     Zelle noch nicht entwickelt und mindestens ein Agent darauf → Zelle wird entwickelt, ihre Agenten lagern sich an.
     Weil entwickelte Zellen weiterzählen, lagern sich Agenten in der Nähe eines Clusters bald sofort an: Cluster wachsen
     und verbinden sich (diffusionsbegrenztes Wachstum). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const N = 135;                 // spalt = reih = round(404 / 3)
  const D2R = Math.PI / 180;

  /** Voreinstellungen wie im Original (CellForm.dfm: Edit_thresh 7, Edit_anzAg 2000) */
  const STANDARD = {
    schwelle: 7,          // Schwellenwert für Anlagerung
    anzahl: 2000,         // Anzahl Agenten für Setup
    korrigiert: false,    // neu: Heading in Grad umrechnen (Original: Grad als Bogenmaß)
    agenten: true,        // Darstellung: Agenten zeigen
    verlauf: true         // Darstellung: Diagramm „freie Agenten“ (RChart1)
  };

  /** Delphis Round: zur geraden Zahl bei genau x,5 */
  function rund(v) { const f = Math.floor(v), d = v - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1); }
  /** rndN(lower, upper) = round((upper − lower + 1) · Random + lower); für (−2, 2) also −2 … 3 */
  function rndN(zufall, unten, oben) { return rund((oben - unten + 1) * zufall() + unten); }
  /** Torus wie in checkNei: ein Überlauf um eins wird auf die andere Seite geklappt */
  const torus = v => v < 0 ? v + N : v > N - 1 ? v - N : v;

  /** Schritt aus der Richtung (SetStepX/SetStepY): round(sin), round(cos); korrigiert mit Grad → Bogenmaß */
  function schrittVon(heading, korrigiert) {
    const w = korrigiert ? heading * D2R : heading;
    return [rund(Math.sin(w)), rund(Math.cos(w))];
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const n = Math.max(0, Math.round(p.anzahl));
    const z = {
      t: 0, zufall, n, breite: N, hoehe: N,
      x: new Int16Array(n), y: new Int16Array(n), h: new Int32Array(n), frei: new Uint8Array(n).fill(1),
      state: new Float64Array(N * N),     // State: Agenten auf der Zelle; entwickelte Zellen zählen weiter
      entw: new Uint8Array(N * N),        // colr = 255: entwickelt
      kopf: new Int32Array(N * N).fill(-1), weiter: new Int32Array(n),   // AgNr: Agenten je Zelle als verkettete Liste
      anzahlFrei: n, verlauf: [n], fertig: null
    };
    // setupAgents: zufällige Zelle, Heading random(8) · 45, alle frei (State 1)
    for (let i = 0; i < n; i++) { z.x[i] = zufall.ganz(N); z.y[i] = zufall.ganz(N); z.h[i] = zufall.ganz(8) * 45; }
    return z;
  }

  /** Moore-Summe der States um Zelle (x, y), Zelle selbst eingeschlossen (checkNei, Torus) */
  function nachbarSumme(z, x, y) {
    let s = 0;
    for (let v = -1; v <= 1; v++) { const yy = torus(y + v) * N; for (let u = -1; u <= 1; u++) s += z.state[yy + torus(x + u)]; }
    return s;
  }

  /** Ein Zeitschritt (Timer1Timer) */
  function schritt(z, param) {
    const p = Object.assign({}, STANDARD, param), st = z.state, en = z.entw;
    for (let c = 0; c < N * N; c++) { if (!en[c]) st[c] = 0; z.kopf[c] = -1; }   // Zellen zurücksetzen
    let frei = 0;
    for (let i = 0; i < z.n; i++) {                                         // Agenten bewegen und Zellen markieren
      if (z.frei[i]) {
        frei++;
        z.h[i] += rndN(z.zufall, -2, 2) * 45;                               // ChangeHeading(2)
        const [sx, sy] = schrittVon(z.h[i], p.korrigiert);
        z.x[i] = torus(z.x[i] + sx); z.y[i] = torus(z.y[i] + sy);
      }
      const c = z.y[i] * N + z.x[i];
      st[c] += 1; z.weiter[i] = z.kopf[c]; z.kopf[c] = i;
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {               // Zellennachbarschaft prüfen
      const c = y * N + x;
      if (en[c] || z.kopf[c] < 0) continue;
      if (nachbarSumme(z, x, y) > p.schwelle) {
        en[c] = 1;
        for (let i = z.kopf[c]; i >= 0; i = z.weiter[i]) z.frei[i] = 0;    // Agenten anlagern
      }
    }
    let rest = 0; for (let i = 0; i < z.n; i++) rest += z.frei[i];
    z.anzahlFrei = rest;
    z.t++;
    z.verlauf.push(frei);                                                    // RChart1.DrawTo(steps, agCount)
    if (rest === 0 && z.fertig == null) z.fertig = z.t;
    return z;
  }

  /** Zahl der entwickelten Zellen */
  function entwickelt(z) { let k = 0; for (let c = 0; c < N * N; c++) k += z.entw[c]; return k; }

  /** Cluster entwickelter Zellen (Moore-Nachbarschaft, Torus): [Anzahl, größter Cluster in Zellen] */
  function cluster(z) {
    const marke = new Int32Array(N * N), stapel = new Int32Array(N * N);
    let zahl = 0, groesst = 0;
    for (let c0 = 0; c0 < N * N; c0++) {
      if (!z.entw[c0] || marke[c0]) continue;
      zahl++; let oben = 0, g = 0; stapel[oben++] = c0; marke[c0] = zahl;
      while (oben) {
        const c = stapel[--oben], x = c % N, y = (c - x) / N; g++;
        for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) {
          const d = torus(y + v) * N + torus(x + u);
          if (z.entw[d] && !marke[d]) { marke[d] = zahl; stapel[oben++] = d; }
        }
      }
      if (g > groesst) groesst = g;
    }
    return [zahl, groesst];
  }

  return { STANDARD, N, rund, rndN, torus, schrittVon, erzeuge, nachbarSumme, schritt, entwickelt, cluster };
});
