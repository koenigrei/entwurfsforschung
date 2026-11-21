/* convexHull – Hülle um beliebig verteilte Punkte · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 04convexHull.htm (AutoCAD-VBA, Reinhard König, April 2004).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regel (Sub main): anzahl + 1 Punkte (For v = 0 To anzahl) zufällig in 0 … 1000 × 0 … 800, nach x sortiert
   (funQsort und Umsortieren der koordList). Ab dem Punkt mit dem kleinsten x läuft eine Hüllkette („Geschenk-
   papier“-Verfahren): Von startP aus wird jeder Punkt geprüft und der mit dem größten Winkelwert „ergebnis“
   gewählt – auf dem Hinweg (richtung) nur Punkte rechts davon, Winkel 90° + Steigungswinkel (steilster Anstieg),
   nach dem Punkt mit dem größten x auf dem Rückweg nur Punkte links davon (steilster Abstieg). Jede Kante bekommt
   die Farbe z (0, 1, 2 …). Ende, sobald startP wieder der erste Punkt ist.
   Ein Schritt = ein geprüfter Punkt der Schleife For i; nach dem letzten Punkt entsteht die nächste Kante. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const BREITE = 1000, HOEHE = 800;            // random(0#, 1000#), random(0#, 800#)

  /** Voreinstellungen wie im Original: anzahl = 200 (also 201 Punkte) */
  const STANDARD = { anzahl: 200, suche: true };

  const RAD = 180 / Math.PI;

  /** Function random(lower, upper) = Int((upper − lower + 1) · Rnd + lower) */
  const random = (r, lower, upper) => Math.floor((upper - lower + 1) * r + lower);

  /** arkusKos des Originals (Arkuskosinus in Bogenmaß über Atn). Bewusst geändert: für −1 liefert das Original 180
      (Grad statt Bogenmaß), nach der Umrechnung · 180/π also 10 313° – hier π. */
  function arkusKos(wert) {
    if (wert === 1) return 0;
    if (wert === -1) return Math.PI;
    if (wert < 1 && wert > -1) return Math.atan(-wert / Math.sqrt(-wert * wert + 1)) + 2 * Math.atan(1);
    return 0;                                    // außerhalb: im Original leer (Variant Empty = 0)
  }

  /** Winkelwert „ergebnis“ des Punkts q von s aus; null, wenn q auf dieser Kette nicht in Frage kommt */
  function ergebnis(s, q, richtung) {
    const dx = q[0] - s[0], dy = q[1] - s[1], w = arkusKos(dx / Math.sqrt(dx * dx + dy * dy)) * RAD;
    if (richtung) {
      if (!(q[0] >= s[0])) return null;
      return q[1] <= s[1] ? 360 - w - 270 : w + 90;
    }
    if (!(q[0] <= s[0])) return null;
    return q[1] <= s[1] ? 360 - w - 90 : w - 90;
  }

  /** funQsort xKoord, danach koordList wie im Original umsortieren (While u <= anzahl · For f = u To anzahl …) */
  function sortiere(liste) {
    const L = liste.map(q => q.slice()), xs = L.map(q => q[0]).sort((a, b) => a - b), n = L.length - 1;
    let u = 0;
    while (u <= n) {
      for (let f = u, ende = n; f <= ende; f++) {
        if (L[f][0] === xs[u]) { const t = L[u]; L[u] = L[f]; L[f] = t; u++; }
      }
    }
    return L;
  }

  const gleich = (a, b) => a[0] === b[0] && a[1] === b[1];


  /** Zustand für eine gegebene Punktliste: sortieren, Kette am ersten Punkt beginnen */
  function beginne(z, punkte) {
    z.punkte = sortiere(punkte);
    z.start = z.punkte.length ? z.punkte[0].slice() : null;
    z.richtung = true; z.i = 0; z.refWi = 0; z.high = null; z.kanten = []; z.fertig = z.punkte.length < 2; z.fehler = z.punkte.length < 2;
    z.letzter = null;
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param), anzahl = Math.max(1, Math.round(p.anzahl)), pk = [];
    for (let v = 0; v <= anzahl; v++) pk.push([random(zufall(), 0, BREITE), random(zufall(), 0, HOEHE)]);
    const z = { t: 0, zufall, breite: BREITE, hoehe: HOEHE };
    beginne(z, pk);
    return z;
  }

  /** Einen Punkt i prüfen (Rumpf der Schleife For i); nach dem letzten Punkt die Kante startP → highP(z) ziehen */
  function pruefe(z) {
    const P = z.punkte, n = P.length - 1, q = P[z.i];
    z.letzter = z.i;
    if (!gleich(z.start, q)) {
      if (z.start[0] >= P[n][0]) z.richtung = false;         // am Punkt mit dem größten x: Rückweg
      const e = ergebnis(z.start, q, z.richtung);
      if (e !== null && (z.richtung ? z.refWi < e : z.refWi <= e)) { z.refWi = e; z.high = q.slice(); }
    }
    if (++z.i <= n) return;
    // Ende der Schleife: Kante zeichnen (draw_line startP, endP, z), nächster startP.
    // Bewusst geändert: Ist der Rückweg in der Spalte des ersten Punkts angekommen (gleiches x), schließt die Kante
    // direkt zum ersten Punkt. Das Original wählt dort unter senkrecht übereinanderliegenden Punkten nach der
    // Sortierung und kann endlos zwischen zwei Punkten pendeln (bei rund 1 von 250 Läufen mit 201 Punkten).
    if (!z.richtung && z.kanten.length && z.start[0] === P[0][0]) z.high = P[0].slice();
    if (!z.high || z.kanten.length > 2 * P.length) { z.fertig = true; z.fehler = true; return; }   // Schutz gegen Endlosschleife
    z.kanten.push({ a: z.start.slice(), b: z.high.slice(), farbe: z.kanten.length });
    z.start = z.high.slice();
    z.i = 0; z.refWi = 0; z.high = null;
    if (gleich(z.start, P[0])) z.fertig = true;              // Loop While Not (startP = koordList(0))
  }

  /** Ein Schritt = ein geprüfter Punkt; erhöht z.t. Nichts mehr, wenn die Hülle geschlossen ist. */
  function schritt(z, p) {
    if (z.fertig) return z;
    pruefe(z);
    z.t++;
    return z;
  }

  /** Hülle in einem Zug fertig rechnen (ohne Schrittzählung) */
  function rechneAlle(z) { const t = z.t; while (!z.fertig) pruefe(z); z.t = t; }

  /** Punkt hinzufügen (Mausklick) oder den nächsten Punkt im Umkreis r entfernen; danach beginnt die Hülle von vorn */
  function setzePunkt(z, x, y) {
    const pk = z.punkte.concat([[Math.round(Math.max(0, Math.min(BREITE, x))), Math.round(Math.max(0, Math.min(HOEHE, y)))]]);
    beginne(z, pk);
  }
  function entfernePunkt(z, x, y, r) {
    let best = -1, d = r * r;
    z.punkte.forEach((q, i) => { const e = (q[0] - x) ** 2 + (q[1] - y) ** 2; if (e <= d) { d = e; best = i; } });
    if (best < 0) return false;
    beginne(z, z.punkte.filter((_, i) => i !== best));
    return true;
  }

  /** Zustand aus einer vorgegebenen Punktliste (für Tests und eigene Versuche in der Konsole) */
  function mitPunkten(punkte) { const z = { t: 0, zufall: null, breite: BREITE, hoehe: HOEHE }; beginne(z, punkte); return z; }

  function aendere(z, p, id) {}

  /** Kennzahlen: Ecken der Hülle, Fläche (Gaußsche Trapezformel) und Punkte außerhalb (Kontrolle: 0) */
  function flaeche(z) {
    let s = 0; for (const k of z.kanten) s += k.a[0] * k.b[1] - k.b[0] * k.a[1];
    return Math.abs(s) / 2;
  }
  function ausserhalb(z) {
    if (!z.fertig || z.fehler || z.kanten.length < 3) return 0;
    let n = 0;
    for (const q of z.punkte) {
      for (const k of z.kanten) {                               // Hülle im Uhrzeigersinn: Punkt links einer Kante → außerhalb
        const c = (k.b[0] - k.a[0]) * (q[1] - k.a[1]) - (k.b[1] - k.a[1]) * (q[0] - k.a[0]);
        if (c > 1e-9) { n++; break; }
      }
    }
    return n;
  }

  return { STANDARD, BREITE, HOEHE, random, arkusKos, ergebnis, sortiere, erzeuge, mitPunkten, schritt, aendere, rechneAlle, setzePunkt, entfernePunkt,
           flaeche, ausserhalb };
});
