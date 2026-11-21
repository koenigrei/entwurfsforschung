/* Konkurrenz um zentrale Orte · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 560_KonkurrenzZentrOrte „Segregation by Move“ mit Zentren (Delphi, März 2006, Reinhard König),
   Kapitel 5.6 der Dissertation „Dynamische Simulation und Visualisierung räumlicher Prozesse“ (2008).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (aus CellForm.pas, Projekt segregation03_center):
   - setupCells: ein Zentrum in der Mitte (Abstand in Bildpunkten, cellScal 10) oder zehn zufällig verteilte Zentren
     (Abstand in Zellen zum nächsten Zentrum); Abstände euklidisch, gerundet, ohne Torus.
   - calcAgents: jeder suchende Agent springt um rndN(−10, 10) Zellen je Achse (Torus), bis die Zielzelle frei ist (höchstens 100 Versuche).
   - calcCells/checkNei: Anteil gleicher unter den besetzten Nachbarzellen der Moore-Nachbarschaft; über dem
     Schwellenwert (Position · 12,5 %) hält der Agent an, sonst sucht er weiter.
   - compareLoc: jeder angehaltene Agent prüft bis zu zehn zufällige Orte (gleicher Sprung) und zieht auf den ersten
     freien, der näher am (nächsten) Zentrum liegt – Konkurrenz um den zentralsten Ort (hill climbing).
   - Timer1Timer: calcAgents, calcCells, compareLoc; der Lauf endet, wenn niemand mehr sucht. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SPALTEN = 40, ZEILEN = 40;   // round(404 / cellScal 10)
  const FREI = -1;
  const VERSUCHE = 100;              // calcAgents: If resc > 100 then break
  const PRUEFUNGEN = 10;             // compareLoc: for K := 0 to nTest (9)
  const ZEHN = 10;                   // market: Array [0..9]

  /** Voreinstellungen wie im Original (CellForm.dfm: TrB_thresh Position 3 von 8, Edit_anzAg 800, CB_mCent angehakt) */
  const STANDARD = {
    schwelle: 3,         // Schwellenwert in Achteln: 3/8 = 37,5 %
    anzahl: 800,         // Anzahl Agenten für Setup
    zentren: "zehn",     // "zehn" verteilte Zentren oder "eins" in der Mitte
    weite: 10,           // ChangeHeading(180, 10)
    verlauf: true
  };

  function torus(v, n) { return v < 0 ? n + v : v > n - 1 ? v - n : v; }
  function rndN(zufall, unten, oben) { return Math.round((oben - unten + 1) * zufall() + unten); }
  /** CalcDistance: euklidischer Abstand, gerundet */
  function abstand(ax, ay, bx, by) { return Math.round(Math.hypot(ax - bx, ay - by)); }
  function aehnlich(gleich, anders) { const s = gleich + anders; return s > 0 ? gleich / s * 100 : 0; }
  /** Schwellenwert in Prozent aus der Position des Schiebers (Lbl_P = Position · 12,5) */
  function prozent(achtel) { return achtel * 12.5; }
  function zufrieden(anteil, achtel) { return anteil > prozent(achtel); }

  /** Abstandsfeld und Zentren (setupCells). Ein Zentrum: Abstand der Zellmitten in Bildpunkten (× 10);
      zehn Zentren: Abstand in Zellen zum nächsten Zentrum, dazu dessen Nummer. */
  function zentrenFeld(z, art, zufall) {
    const S = z.spalten, Z = z.zeilen;
    z.dist = new Int16Array(S * Z); z.naechstes = new Int8Array(S * Z);
    if (art === "eins") {
      const mx = Math.round(S / 2), my = Math.round(Z / 2);
      z.zentren = [[mx, my]];
      for (let y = 0; y < Z; y++) for (let x = 0; x < S; x++) z.dist[y * S + x] = abstand(x * 10, y * 10, mx * 10, my * 10);
    } else {
      z.zentren = [];
      for (let m = 0; m < ZEHN; m++) z.zentren.push([zufall.ganz(S), zufall.ganz(Z)]);
      for (let y = 0; y < Z; y++) for (let x = 0; x < S; x++) {
        let d = 10000, k = 0;
        z.zentren.forEach(([cx, cy], m) => { const e = abstand(x, y, cx, cy); if (e < d) { d = e; k = m; } });
        z.dist[y * S + x] = d; z.naechstes[y * S + x] = k;
      }
    }
  }

  /** Nachbarn [gleich, anders] eines Agenten vom Typ typ auf (x, y), Moore-Nachbarschaft, Torus (checkNei) */
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

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const n = Math.max(0, Math.min(SPALTEN * ZEILEN - 1, Math.round(p.anzahl)));
    const z = {
      t: 0, zufall, spalten: SPALTEN, zeilen: ZEILEN, breite: SPALTEN, hoehe: ZEILEN, n,
      zelle: new Int16Array(SPALTEN * ZEILEN).fill(FREI),
      x: new Int16Array(n), y: new Int16Array(n), typ: new Uint8Array(n),
      sucht: new Uint8Array(n).fill(1), anteil: new Float32Array(n), nachbarn: new Uint8Array(n),
      suchend: n, naeher: 0, verlauf: [], fertig: null
    };
    zentrenFeld(z, p.zentren, zufall);
    for (let i = 0; i < n; i++) {                    // setupAgents: zufällige Zelle, Typ random(2); hier nur freie Zellen
      let x, y;
      do { x = zufall.ganz(SPALTEN); y = zufall.ganz(ZEILEN); } while (z.zelle[y * SPALTEN + x] !== FREI);
      z.x[i] = x; z.y[i] = y; z.typ[i] = zufall.ganz(2); z.zelle[y * SPALTEN + x] = i;
    }
    zaehleAlle(z);
    z.verlauf.push(messe(z));
    return z;
  }

  function zaehleAlle(z) {
    for (let i = 0; i < z.n; i++) { const [g, a] = zaehle(z, z.x[i], z.y[i], z.typ[i]); z.anteil[i] = aehnlich(g, a); z.nachbarn[i] = g + a; }
  }

  function bewege(z, i, tx, ty) {
    z.zelle[z.y[i] * z.spalten + z.x[i]] = FREI; z.zelle[ty * z.spalten + tx] = i; z.x[i] = tx; z.y[i] = ty;
  }

  /** calcAgents: Umzug aller Suchenden in Listenreihenfolge */
  function ziehe(z, p) {
    const w = Math.max(1, Math.round(p.weite ?? STANDARD.weite));
    for (let i = 0; i < z.n; i++) {
      if (!z.sucht[i]) continue;
      for (let k = 0; k < VERSUCHE; k++) {
        const tx = torus(z.x[i] + rndN(z.zufall, -w, w), z.spalten), ty = torus(z.y[i] + rndN(z.zufall, -w, w), z.zeilen);
        if (z.zelle[ty * z.spalten + tx] === FREI) { bewege(z, i, tx, ty); break; }
      }
    }
  }

  /** calcCells: Bewertung aller Agenten */
  function bewerte(z, p) {
    zaehleAlle(z);
    let s = 0;
    for (let i = 0; i < z.n; i++) { z.sucht[i] = zufrieden(z.anteil[i], p.schwelle) ? 0 : 1; s += z.sucht[i]; }
    z.suchend = s;
    return s;
  }

  /** compareLoc: angehaltene Agenten suchen bis zu zehnmal einen freien Ort näher am Zentrum. Liefert die Zahl der Umzüge. */
  function naehere(z, p) {
    const w = Math.max(1, Math.round(p.weite ?? STANDARD.weite));
    let k = 0;
    for (let i = 0; i < z.n; i++) {
      if (z.sucht[i]) continue;
      const jetzt = z.dist[z.y[i] * z.spalten + z.x[i]];
      for (let v = 0; v < PRUEFUNGEN; v++) {
        const tx = torus(z.x[i] + rndN(z.zufall, -w, w), z.spalten), ty = torus(z.y[i] + rndN(z.zufall, -w, w), z.zeilen);
        const c = ty * z.spalten + tx;
        if (z.dist[c] < jetzt && z.zelle[c] === FREI) { bewege(z, i, tx, ty); k++; break; }
      }
    }
    z.naeher = k;
    return k;
  }

  /** Ein Zeitschritt (Timer1Timer): calcAgents, calcCells, compareLoc */
  function schritt(z, p) {
    ziehe(z, p);
    bewerte(z, p);
    naehere(z, p);
    z.t++;
    z.verlauf.push(messe(z));
    if (z.suchend === 0 && z.fertig == null) z.fertig = z.t;
    return z;
  }

  /** Schwellenwert ohne Neustart (TrB_thresh wird in jedem Schritt gelesen); Suchen/Anhalten sofort neu bewerten */
  function aendere(z, p, id) {
    if (id !== "schwelle" || z.t === 0) return;
    bewerte(z, p);
    if (z.suchend > 0) z.fertig = null; else if (z.fertig == null) z.fertig = z.t;
  }

  /** Mittlerer Anteil gleicher Nachbarn (%) über Agenten mit mindestens einem Nachbarn (Stand der letzten Bewertung) */
  function gleicheNachbarn(z) {
    let s = 0, k = 0;
    for (let i = 0; i < z.n; i++) if (z.nachbarn[i] > 0) { s += z.anteil[i]; k++; }
    return k ? s / k : 0;
  }

  /** Mittlerer Abstand der Agenten zum (nächsten) Zentrum in Zellen */
  function mittlererAbstand(z) {
    let s = 0;
    for (let i = 0; i < z.n; i++) s += Math.hypot(z.x[i] - nahX(z, i), z.y[i] - nahY(z, i));
    return z.n ? s / z.n : 0;
  }
  const nahX = (z, i) => z.zentren[z.naechstes[z.y[i] * z.spalten + z.x[i]]][0];
  const nahY = (z, i) => z.zentren[z.naechstes[z.y[i] * z.spalten + z.x[i]]][1];

  /** Segregation nach Zentren: je Zentrum die Agenten im Umkreis r (Zellen), Anteil der dort häufigeren Sorte;
      gewichtetes Mittel über alle Zentren mit Agenten (0,5 = gemischt, 1 = nur eine Sorte je Zentrum) */
  function reinheit(z, r = 5) {
    let s = 0, k = 0;
    for (const [cx, cy] of z.zentren) {
      let a = 0, b = 0;
      for (let i = 0; i < z.n; i++) if (Math.hypot(z.x[i] - cx, z.y[i] - cy) <= r) { if (z.typ[i]) b++; else a++; }
      if (a + b) { s += Math.max(a, b); k += a + b; }
    }
    return k ? s / k : 0;
  }

  /** Verlauf je Schritt: [angelagert, suchend, gleiche Nachbarn %, mittlerer Abstand] */
  function messe(z) { return [z.n - z.suchend, z.suchend, gleicheNachbarn(z), mittlererAbstand(z)]; }

  return { STANDARD, SPALTEN, ZEILEN, FREI, VERSUCHE, PRUEFUNGEN, torus, rndN, abstand, aehnlich, prozent, zufrieden,
           zentrenFeld, zaehle, erzeuge, ziehe, bewerte, naehere, schritt, aendere, gleicheNachbarn, mittlererAbstand, reinheit };
});
