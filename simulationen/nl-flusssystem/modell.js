/* 08 flusssystem · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 05_wegesys_attrakt.nlogo (NetLogo 2.1, Reinhard König, 26.02.2005; nach einer Arbeit von
   Tomor Elezkurtaj, iemar TU Wien).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (Prozedur „attract“, je tick):
     1. Jede turtle merkt sich ihren Abstand zum Zielpunkt (ownDist = distancexy hx hy).
     2. Jede turtle sucht unter den anderen turtles, die näher am Ziel sind als sie selbst, die ihr nächste (goto-turtle).
        Gibt es keine, richtet sie sich auf den Zielpunkt aus, sonst auf goto-turtle; ist das Gegenüber weiter als
        point-dist entfernt, geht sie einen Schritt (fd 1) und färbt mit leavePath den Patch unter sich orange (stamp).
   „repel“: jede turtle geht von der nächsten turtle um repel-strength zurück (bk). Ein Mausklick setzt den Zielpunkt.
   Welt wie im GRAPHICS-WINDOW: screen-edge 100 → Patches −100…100 (201 × 201), Torus (NetLogo 2.x), stetige
   Koordinaten der turtles; Patch eines Punkts = gerundete Koordinate. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const RAND = 100, N = 2 * RAND + 1;              // screen-edge-x/-y 100 → 201 Patches

  /** Voreinstellungen wie im Original (SLIDER- und SWITCH-Blöcke) */
  const STANDARD = { density: 146, "point-dist": 3, "repel-strength": 0.2, attract: true, repel: false, leavePath: true };

  /** Torus: Koordinate in [−100,5; 100,5) */
  function wickle(x) { x = (x + RAND + 0.5) % N; if (x < 0) x += N; return x - RAND - 0.5; }
  /** kürzester Versatz im Torus (NetLogo 2.x rechnet distance und towards über den Rand) */
  function versatz(d) { d %= N; if (d > N / 2) d -= N; else if (d < -N / 2) d += N; return d; }
  /** Patch eines Punkts (gerundet, im Torus) */
  function patchKoord(x) { const p = Math.floor(wickle(x) + 0.5); return p > RAND ? p - N : p; }
  /** Feldindex, Zeilen von oben (pycor 100) nach unten */
  const index = (px, py) => (RAND - py) * N + (px + RAND);
  const abstand = (x1, y1, x2, y2) => Math.hypot(versatz(x2 - x1), versatz(y2 - y1));

  /** setup: ca, deletePath, crt density, setxy random-int-or-float screen-size-x … (ganze Zahlen 0…200, im Torus) */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const n = Math.max(0, Math.round(p.density));
    const z = { t: 0, zufall, N, RAND, breite: N, hoehe: N, n, x: new Float64Array(n), y: new Float64Array(n),
                dist: new Float64Array(n), ziel: new Int32Array(n).fill(-1), ordnung: new Int32Array(n),
                pfad: new Uint8Array(N * N), hx: 0, hy: 0, start: 0 };
    for (let k = 0; k < n; k++) {
      z.x[k] = wickle(zufall.ganz(N)); z.y[k] = wickle(zufall.ganz(N)); z.ordnung[k] = k;
    }
    z.start = summeAbstand(z);
    return z;
  }

  /** Σ Abstand aller turtles zum Zielpunkt (Bezug der Kennzahl „Bündelung“) */
  function summeAbstand(z) { let s = 0; for (let k = 0; k < z.n; k++) s += abstand(z.x[k], z.y[k], z.hx, z.hy); return s; }

  /** makeStep: fd 1 in Richtung (tx, ty); mit leavePath stamp orange auf den neuen Patch */
  function makeStep(z, p, k, tx, ty) {
    const dx = versatz(tx - z.x[k]), dy = versatz(ty - z.y[k]), d = Math.hypot(dx, dy);
    if (d === 0) return;                                          // towards ohne Richtung: kein Schritt (siehe QUELLE.md)
    z.x[k] = wickle(z.x[k] + dx / d); z.y[k] = wickle(z.y[k] + dy / d);
    if (p.leavePath) z.pfad[index(patchKoord(z.x[k]), patchKoord(z.y[k]))] = 1;
  }

  /** goto-turtle: min-one-of (andere turtles mit ownDist < eigenem ownDist) [distance myself], sonst −1 (nobody) */
  function naechsteNaeher(z, k) {
    let best = -1, bd = Infinity;
    const x = z.x[k], y = z.y[k], o = z.dist[k];
    for (let j = 0; j < z.n; j++) {
      if (j === k || !(z.dist[j] < o)) continue;
      const d = abstand(x, y, z.x[j], z.y[j]);
      if (d < bd) { bd = d; best = j; }
    }
    return best;
  }

  /** Prozedur attract: erst alle ownDist, dann jede turtle (in zufälliger Reihenfolge) */
  function attract(z, p) {
    for (let k = 0; k < z.n; k++) z.dist[k] = abstand(z.x[k], z.y[k], z.hx, z.hy);
    const o = z.ordnung, r = z.zufall;
    for (let k = z.n - 1; k > 0; k--) { const j = r.ganz(k + 1), s = o[k]; o[k] = o[j]; o[j] = s; }
    const pd = p["point-dist"];
    for (let i = 0; i < z.n; i++) {
      const k = o[i], g = naechsteNaeher(z, k);
      z.ziel[k] = g;
      if (g < 0) { if (abstand(z.x[k], z.y[k], z.hx, z.hy) > pd) makeStep(z, p, k, z.hx, z.hy); }
      else if (abstand(z.x[k], z.y[k], z.x[g], z.y[g]) > pd) makeStep(z, p, k, z.x[g], z.y[g]);
    }
  }

  /** Prozedur repel: heading towards closest-turtle, bk repel-strength */
  function repel(z, p) {
    const o = z.ordnung, s = p["repel-strength"];
    for (let i = 0; i < z.n; i++) {
      const k = o[i]; let best = -1, bd = Infinity;
      for (let j = 0; j < z.n; j++) if (j !== k) { const d = abstand(z.x[k], z.y[k], z.x[j], z.y[j]); if (d < bd) { bd = d; best = j; } }
      if (best < 0 || bd === 0) continue;
      const dx = versatz(z.x[best] - z.x[k]), dy = versatz(z.y[best] - z.y[k]);
      z.x[k] = wickle(z.x[k] - dx / bd * s); z.y[k] = wickle(z.y[k] - dy / bd * s);
    }
  }

  /** Ein tick: attract und/oder repel (die beiden forever-Knöpfe des Originals) */
  function schritt(z, p) {
    if (p.attract) attract(z, p);
    if (p.repel) repel(z, p);
    z.t++;
    return z;
  }

  /** Mausklick (mouse-down?): neuer Zielpunkt hx, hy aus Spalte/Zeile im Bild */
  function setzeZiel(z, spalte, zeile) {
    z.hx = Math.min(RAND, Math.max(-RAND, spalte - RAND - 0.5));
    z.hy = Math.min(RAND, Math.max(-RAND, RAND + 0.5 - zeile));
    z.start = summeAbstand(z);
  }

  /** deletePath: alle Patches weiß */
  function loesche(z) { z.pfad.fill(0); }

  /** Kennzahlen (neu): Anteil angekommener turtles (Gegenüber höchstens point-dist entfernt), mittlerer Abstand zum
      Zielpunkt, Anteil oranger Patches und Bündelung = 1 − orange Patches / Σ Abstände beim Setzen des Ziels
      (0: jede turtle ginge allein geradeaus, nahe 1: wenige gemeinsame Stränge). */
  function auswertung(z, p) {
    let ruhe = 0, s = 0, pf = 0;
    for (let k = 0; k < z.n; k++) {
      const dz = abstand(z.x[k], z.y[k], z.hx, z.hy); s += dz;
      const g = z.ziel[k], d = g < 0 ? dz : abstand(z.x[k], z.y[k], z.x[g], z.y[g]);
      if (d <= p["point-dist"]) ruhe++;
    }
    for (let c = 0; c < z.pfad.length; c++) pf += z.pfad[c];
    return { ruhe: z.n ? ruhe / z.n : 0, mittel: z.n ? s / z.n : 0, pfad: pf / (N * N), buendelung: z.start > 0 ? 1 - pf / z.start : 0 };
  }

  /** alle Regler wirken im nächsten tick (density setzt zurück) */
  function aendere() {}

  return { STANDARD, N, RAND, wickle, versatz, patchKoord, index, abstand, erzeuge, naechsteNaeher, makeStep,
           attract, repel, schritt, setzeZiel, loesche, summeAbstand, auswertung, aendere };
});
