/* Wachstum mit räumlicher Umorganisation · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 29_groupGrow „group segregation model“ (Delphi, 18./20.01.2006, Reinhard König).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Einfaches Wachstum (28_probabCA) kombiniert mit Segregation durch Eigenschaftsanpassung (CellForm.pas):
   - Wachstum: eine unentwickelte Zelle mit mindestens einem entwickelten Moore-Nachbarn wird mit Wahrscheinlichkeit p entwickelt.
   - Typ bei der Entwicklung: innerhalb des Radius r um die Feldmitte mit der Wahrscheinlichkeit q („State 1/2 Probability“)
     Typ 1 (grau), sonst Typ 2 (weiß); außerhalb von r umgekehrt.
   - Segregation (procedure segregation, nach jedem Schritt, Zellen der Reihe nach und sofort wirksam): eine entwickelte Zelle
     mit mehr als 4 weißen Nachbarn wird weiß, sonst mit mehr als 4 grauen Nachbarn grau (Mehrheit der 8 Moore-Nachbarn).
   - „activate aging“: Zellen älter als die Lebensdauer sterben (D = 0) und können neu entwickelt werden.
   - Farbe: Typ · (127 − 2 · Alter), also Typ 1 grau, Typ 2 weiß, ältere dunkler. Stopp nach 300 Schritten. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const N = 101, ZELLE = 4, MITTE = 50;   // 404 / 4 Zellen; round(101 / 2) = 50 (Delphi rundet auf die gerade Zahl)
  const STOPP = 300;                      // „stop condition“ steps = 300
  /** Voreinstellungen wie im Original (CellForm.dfm: E_probab 100, E_death 30, E_statProb 60, Cb_aging aus; Radius 100 px = 25 Zellen) */
  const STANDARD = { wahrscheinlichkeit: 100, lebensdauer: 30, zustandP: 60, altern: false, samen: false, radius: 25, verlauf: true };

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param), nn = N * N;
    const z = { t: 0, zufall, n: N, breite: N, hoehe: N, zustand: new Uint8Array(nn), prob: new Float64Array(nn).fill(p.wahrscheinlichkeit / 100),
                geburt: new Int32Array(nn), alter: new Int32Array(nn), dist: new Int32Array(nn), limbo: new Uint8Array(nn),
                verlauf: { gesamt: [], grau: [], weiss: [] } };
    for (let i = 0; i < N; i++) for (let k = 0; k < N; k++)                      // Entfernung zur Mitte in Bildpunkten des Originals
      z.dist[i * N + k] = Math.round(Math.hypot(ZELLE * (k - MITTE), ZELLE * (i - MITTE)));
    if (p.samen) for (let s = 0; s <= 20; s++) { const x = zufall.ganz(N), y = zufall.ganz(N); z.zustand[y * N + x] = 1; }
    z.zustand[MITTE * N + MITTE] = 1;                                              // one seed (Typ 1)
    zaehle(z);
    return z;
  }

  /** Moore-Nachbarn ohne die Zelle: [Zustandssumme, Zahl Typ 1, Zahl Typ 2], Rand als Torus */
  function nachbarn(s, n, k, i) {
    let summe = 0, eins = 0, zwei = 0;
    for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) {
      if (!u && !v) continue;
      const w = s[((i + v + n) % n) * n + (k + u + n) % n];
      summe += w; if (w === 1) eins++; else if (w === 2) zwei++;
    }
    return [summe, eins, zwei];
  }

  /** Typ einer neu entwickelten Zelle: innerhalb r mit Wahrscheinlichkeit q Typ 1, außerhalb mit q Typ 2 */
  const typ = (innen, zufallszahl, q) => innen ? (zufallszahl <= q ? 1 : 2) : (zufallszahl <= q ? 2 : 1);

  /** Abstimmungsregel (segregation): mehr als 4 weiße Nachbarn → weiß, sonst mehr als 4 graue → grau */
  const abstimmung = (zustand, eins, zwei) => zustand === 0 ? 0 : zwei > 4 ? 2 : eins > 4 ? 1 : zustand;

  function schritt(z, param) {
    const n = z.n, s = z.zustand, pr = z.prob, g = z.geburt, al = z.alter, li = z.limbo, zu = z.zufall, t = z.t;
    const p = param.wahrscheinlichkeit / 100, q = param.zustandP / 100, tod = param.lebensdauer, r = ZELLE * param.radius;
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) li[i * n + k] = nachbarn(s, n, k, i)[0] >= 1 ? 1 : 0;   // checkNei
    if (param.altern) for (let j = 0; j < s.length; j++) {                       // ageCheck
      al[j] = t - g[j];
      if (al[j] > tod) { al[j] = 0; s[j] = 0; pr[j] = p; }
    }
    for (let j = 0; j < s.length; j++) {
      if (li[j] && s[j] === 0) {
        if (zu() < pr[j]) { g[j] = t; al[j] = 0; s[j] = typ(z.dist[j] < r, zu(), q); }
        else { if (pr[j] === p) g[j] = t; pr[j] = pr[j] * pr[j]; }
      }
    }
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {                    // segregation, in place
      const j = i * n + k, [, eins, zwei] = nachbarn(s, n, k, i);
      s[j] = abstimmung(s[j], eins, zwei);
    }
    z.t++;
    zaehle(z);
    return z;
  }

  function zaehle(z) {
    let a = 0, b = 0; const s = z.zustand;
    for (let j = 0; j < s.length; j++) { if (s[j] === 1) a++; else if (s[j] === 2) b++; }
    z.verlauf.gesamt.push(a + b); z.verlauf.grau.push(a); z.verlauf.weiss.push(b);
  }

  /** Anteil Typ 1 unter den entwickelten Zellen innerhalb und außerhalb des Radius */
  function trennung(z, radius) {
    const r = ZELLE * radius; let ie = 0, in1 = 0, ae = 0, au2 = 0;
    for (let j = 0; j < z.zustand.length; j++) {
      const s = z.zustand[j]; if (!s) continue;
      if (z.dist[j] < r) { ie++; if (s === 1) in1++; } else { ae++; if (s === 2) au2++; }
    }
    return { innenGrau: ie ? in1 / ie : 0, aussenWeiss: ae ? au2 / ae : 0 };
  }

  /** Grauwert wie im Original: Typ · (127 − 2 · Alter), begrenzt auf 0 … 255 */
  const grau = (zustand, alter) => Math.max(0, Math.min(255, zustand * (127 - 2 * alter)));

  return { STANDARD, N, ZELLE, MITTE, STOPP, erzeuge, schritt, nachbarn, typ, abstimmung, trennung, grau };
});
