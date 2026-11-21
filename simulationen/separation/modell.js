/* Separation durch Standortpräferenzen · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 421_Separation (Delphi 2005, Reinhard König; Projekt fraktErschl), Kapitel 4.2.1 der Dissertation
   „Dynamische Simulation und Visualisierung räumlicher Prozesse“ (2008).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Rote Agenten bilden einen zufälligen Erschließungsgraphen (Anlagerungspunkte, „Straßenknoten“), blaue (Gewerbe) und gelbe
   (Wohnen) Agenten suchen einen Platz. Je Schritt (facsSteer.pas, ApplicationEvents1Idle → Swarming; agenten.pas):
     – Zellmarkierung (lookCell, checkNeighbour): Zelle = −55 je blauem + 50 je gelbem Agenten in der Moore-Nachbarschaft.
     – Blau darf nur auf Zellen ≤ 0, Gelb nur auf Zellen ≥ 0 bleiben; sonst Zufallsschritt mit Faktor 1,5 (SetRndDir(1.5)).
     – Sonst Nachbarsuche im Anlagerungsradius: an Rot lagert jeder an (übernimmt dessen Bewegung), Rot an Rot hält an,
       andere Nachbarn: SetRndDir(1.1). Unter dem Mindestabstand: SetRndDir(0.8).
   Danach bewegen sich alle um ihren gerundeten Schritt, Rand als Torus. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const BREITE = 777, HOEHE = 450;                 // ImagePaint des Originals
  const ZELLE = 10, SPALTEN = 78, ZEILEN = 45;     // cellScal 10 → round(77,7) × 45
  const VMAX = 5;                                  // Neu: Höchstgeschwindigkeit (SetRndDir(1.5) beschleunigt im Original unbegrenzt)
  const ROT = 0, BLAU = 1, GELB = 2;

  /** Voreinstellungen wie im Original (facsSteer.dfm, Button_CreateClick); zusatzBlau/zusatzGelb = je viermal „Create Blues/Yellows“ */
  const STANDARD = { punkte: 100, zusatzBlau: 200, zusatzGelb: 200, distRot: 80, distBlau: 30, distGelb: 30, minAbstand: 10, zellen: true, verbindungen: true };

  const dist = (p, r) => r === ROT ? p.distRot : r === BLAU ? p.distBlau : p.distGelb;

  /** „Create Pts“: Index I = 1…n; I < n/4 rot, I < n/2 blau, sonst gelb; Lage random(777) × random(450), Schritt random(3) − 1 */
  function rangFuer(i, n) { return i < n / 4 ? ROT : i < n / 2 ? BLAU : GELB; }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, zufall, breite: BREITE, hoehe: HOEHE, spalten: SPALTEN, zeilen: ZEILEN, zelle: ZELLE,
                ag: [], zellen: new Int16Array(SPALTEN * ZEILEN), bewegt: 0, abgewiesen: 0 };
    for (let i = 1; i <= p.punkte; i++) neuerAgent(z, zufall.ganz(777), zufall.ganz(450), rangFuer(i, p.punkte), true);
    hinzufuegen(z, BLAU, p.zusatzBlau); hinzufuegen(z, GELB, p.zusatzGelb);   // wie mehrfaches „Create Blues“ / „Create Yellows“
    return z;
  }

  function neuerAgent(z, x, y, rang, laufend) {
    z.ag.push({ x: Math.round(x), y: Math.round(y), vx: laufend ? z.zufall.dreh() : 0, vy: laufend ? z.zufall.dreh() : 0,
                rang, connect: 0, bind: [] });
  }
  /** „Create Blues“ / „Create Yellows“: je 50 Agenten */
  function hinzufuegen(z, rang, n = 50) { for (let i = 0; i < n; i++) neuerAgent(z, z.zufall.ganz(777), z.zufall.ganz(450), rang, true); }

  const begrenze = v => v > VMAX ? VMAX : v < -VMAX ? -VMAX : v;
  function rndDir(a, damp, zufall) { a.vx = begrenze((a.vx + zufall.dreh()) * damp); a.vy = begrenze((a.vy + zufall.dreh()) * damp); }
  const entf = (a, b) => Math.round(Math.hypot(a.x - b.x, a.y - b.y));
  const zelleVon = a => { const xc = Math.round((a.x - ZELLE / 2) / ZELLE), yc = Math.round((a.y - ZELLE / 2) / ZELLE);
                          return xc >= 0 && xc < SPALTEN && yc >= 0 && yc < ZEILEN ? yc * SPALTEN + xc : -1; };

  /** darf der Agent hier bleiben? (Swarming): Rot immer, Blau auf Zellen ≤ 0, Gelb auf Zellen ≥ 0 */
  function erlaubt(rang, status) { return rang === ROT || (rang === BLAU && status <= 0) || (rang === GELB && status >= 0); }

  /** Nachbarsuche und Anlagern (NeigborCheck, Anlagern, SetAnlDir) */
  function nachbarschaft(z, p, i) {
    const a = z.ag[i], r = dist(p, a.rang), liste = [];
    let naechster = -1, dN = 1000;
    for (let k = 0; k < z.ag.length; k++) {
      if (k === i) continue;
      const d = entf(a, z.ag[k]);
      if (d < r) liste.push(k);
      if (d < dN) { dN = d; naechster = k; }
    }
    a.bind = [];
    if (dN < r) {
      a.connect = 0;
      for (const k of liste) {
        const b = z.ag[k];
        if (b.rang === ROT && a.rang !== ROT) {                // an einen roten Knoten anlagern: Bewegung des ranghöchsten Nachbarn
          a.connect = 1;
          let who = naechster; for (const q of liste) if (z.ag[q].rang < z.ag[who].rang) who = q;
          a.vx = z.ag[who].vx; a.vy = z.ag[who].vy;
          a.bind.push(k);
        } else if (a.rang === ROT && b.rang === ROT) {         // Rot an Rot: anhalten
          a.connect = 2; b.connect = 2; a.vx = 0; a.vy = 0;
          a.bind.push(k);
        } else if (a.connect === 0) rndDir(a, 1.1, z.zufall);
      }
    }
    if (dN < p.minAbstand) rndDir(a, 0.8, z.zufall);
  }

  /** Zellen markieren (lookCell, cellStates/checkNeighbour); der Rand bleibt 0 */
  function zellenMarkieren(z) {
    const belegt = new Int8Array(SPALTEN * ZEILEN).fill(-1);
    for (const a of z.ag) { const c = zelleVon(a); if (c >= 0) belegt[c] = a.rang; }
    z.zellen.fill(0);
    for (let i = 1; i < ZEILEN - 1; i++) for (let k = 1; k < SPALTEN - 1; k++) {
      let s = 0;
      for (let di = -1; di <= 1; di++) for (let dk = -1; dk <= 1; dk++) {
        const r = belegt[(i + di) * SPALTEN + k + dk];
        if (r === BLAU) s -= 55; else if (r === GELB) s += 50;
      }
      z.zellen[i * SPALTEN + k] = s;
    }
  }

  function schritt(z, p) {
    let abgewiesen = 0;
    for (let i = 0; i < z.ag.length; i++) {                     // Swarming: Zellstatus aus dem vorigen Durchlauf
      const a = z.ag[i], c = zelleVon(a), status = c >= 0 ? z.zellen[c] : 0;
      if (c < 0 || erlaubt(a.rang, status)) { if (c >= 0) nachbarschaft(z, p, i); }
      else { a.connect = 0; a.bind = []; rndDir(a, 1.5, z.zufall); abgewiesen++; }
    }
    let bewegt = 0;
    for (const a of z.ag) {
      const dx = Math.round(a.vx), dy = Math.round(a.vy);
      if (dx || dy) bewegt++;
      a.x = ((a.x + dx) % BREITE + BREITE) % BREITE;
      a.y = ((a.y + dy) % HOEHE + HOEHE) % HOEHE;
    }
    if (p.zellen) zellenMarkieren(z); else z.zellen.fill(0);   // ohne „Zellen markieren“ bleiben alle Zellen neutral
    z.bewegt = bewegt; z.abgewiesen = abgewiesen;
    z.t++;
    return z;
  }

  function aendere(z, p, id) { if (id === "zellen") { if (p.zellen) zellenMarkieren(z); else z.zellen.fill(0); } }

  /** Kennzahlen: Anzahl je Farbe, an Rot angelagerte, Anteil gleichfarbiger unter den blau/gelben Nachbarn im Umkreis von 30 px */
  function auswertung(z) {
    const n = [0, 0, 0], an = [0, 0, 0];
    let gleich = 0, alle = 0, links = 0;
    for (const a of z.ag) {
      n[a.rang]++; if (a.connect === 1) an[a.rang]++;
      if (a.rang === ROT) { links += a.bind.length; continue; }
      for (const b of z.ag) {
        if (b === a || b.rang === ROT) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) < 30) { alle++; if (b.rang === a.rang) gleich++; }
      }
    }
    return { n, an, links, gleich: alle ? 100 * gleich / alle : NaN };
  }

  return { STANDARD, BREITE, HOEHE, ZELLE, SPALTEN, ZEILEN, VMAX, ROT, BLAU, GELB, rangFuer, erlaubt,
           erzeuge, schritt, aendere, neuerAgent, hinzufuegen, nachbarschaft, zellenMarkieren, auswertung };
});
