/* Parzellierung mit Voronoi · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Parcellation via Voronoi“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verdrahtung der .gh-Datei: Divide Distance (Blockkurve, Abstand = Cell Distance) → Voronoi → Trim with Region (Block) →
   Network to Segments (mit der Blockkurve) → Network Smooth (Ankerpunkte = Blockecken und Schnittpunkte der Zellgrenzen mit
   dem Blockrand, Snap threshold = Cell Distance × Snapping). Die Blöcke selbst kommen in der Datei aus „Polygons from lines“
   (Straßennetz → geschlossene Flächen). Weil alle Erzeugerpunkte auf dem Blockrand liegen, berührt jede Zelle den Rand:
   „Keeps each parcel connected to the street.“ Das Glätten kann sehr kurze Straßenfronten zusammenlegen. Ein Schritt ist eine Phase eines Blocks (Punkte → Zellen → Glätten). */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen,
                   node ? require("../_gemeinsam/flaechen.js") : wurzel.Flaechen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen, Flaechen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Cell Distance 59 [10..100], Snapping 0,3 [0,1..0,5]; Network Smooth an, „Snap to anchor points only“ = false */
  const STANDARD = { abstand: 59, snapping: 0.3, glaetten: true, nurAnker: false };
  const TOL = 1e-6;

  /** Beispielquartier (Szenen.quartier): verzogenes Straßenraster, nur Blöcke (Gebäude und Platz aus) */
  const quartier = zufall => Szenen.quartier(zufall);

  /** Divide Distance: Punkte auf der geschlossenen Blockkurve ab der ersten Ecke, jeder im (geraden) Abstand d zum vorigen.
      Der nächste Punkt ist der erste Schnitt des Kreises um den vorigen Punkt mit dem weiteren Kurvenverlauf; Ende, wenn die Kurve
      vor dem Anfang endet (der Anfang wird nicht doppelt gesetzt). */
  function teileDistanz(poly, d) {
    const n = poly.length, out = [poly[0].slice()];
    if (!(d > 0)) return out;
    let c = poly[0], k = 0, t0 = 0;
    for (let schutz = 0; schutz < 100000; schutz++) {
      let gefunden = false;
      for (; k < n; k++, t0 = 0) {
        const a = poly[k], b = poly[(k + 1) % n], e = [b[0] - a[0], b[1] - a[1]], w = [a[0] - c[0], a[1] - c[1]];
        const A = e[0] * e[0] + e[1] * e[1], B = 2 * (w[0] * e[0] + w[1] * e[1]), C = w[0] * w[0] + w[1] * w[1] - d * d;
        const D = B * B - 4 * A * C;
        if (A < 1e-18 || D < 0) continue;
        const s = Math.sqrt(D), r = [(-B - s) / (2 * A), (-B + s) / (2 * A)].filter(t => t > t0 + 1e-12 && t <= 1 + 1e-12);
        if (!r.length) continue;
        const t = Math.min(1, r[0]);
        if (k === n - 1 && t >= 1 - 1e-9) break;            // fiele auf den Anfang
        c = Geo.lerp(a, b, t); t0 = t; out.push(c); gefunden = true; break;
      }
      if (!gefunden) break;
    }
    return out;
  }

  /** Voronoi der Randpunkte, beschnitten mit dem Block (Voronoi + Trim with Region) */
  function zellen(punkte, block) {
    if (punkte.length < 2) return [block.slice()];
    return Geo.voronoi(punkte, block).map(z => Geo.bereinige(z, 1e-7)).filter(z => z.length >= 3 && Geo.flaeche(z) > 1e-6);
  }

  /** Abstand eines Punktes zum Blockrand (Flaechen.randAbstand) */
  const randAbstand = Flaechen.randAbstand;

  /** Netz der Zellen: gemeinsame Ecken (Toleranz), je Ecke „am Rand“ oder „innen“; Zellen als Indexlisten */
  function netzAusZellen(Z, block) {
    const ecken = [], idx = Z.map(z => z.map(q => {
      let i = ecken.findIndex(e => Geo.abstand(e.p, q) < 1e-4);
      if (i < 0) { i = ecken.length; ecken.push({ p: q.slice(), rand: randAbstand(q, block) < 1e-4 }); }
      return i;
    }));
    return { ecken, idx };
  }

  /** Ankerpunkte (Explode.Vertices + Curve|Curve.Points, Remove Duplicate Points 0,001): Blockecken und Randpunkte der Zellen */
  function anker(block, netz) {
    const A = block.map(p => p.slice());
    for (const e of netz.ecken) if (e.rand && !A.some(a => Geo.abstand(a, e.p) < 0.001)) A.push(e.p.slice());
    return A;
  }

  /** Network Smooth wie im Quelltext beschrieben (legacy-generation/migration.md der Toolbox; eigene Umsetzung):
      JEDE Ecke des Netzes (innere Voronoi-Ecken, Randpunkte, Blockecken), die näher als die Schwelle an einer anderen liegt,
      wird mit ihr zusammengelegt, auch in einer Kette (A nahe B, B nahe C). Eine Gruppe springt auf den Anker, der einem ihrer
      Mitglieder am nächsten liegt, wenn er näher als die Schwelle ist (bei Gleichstand der erste Anker: Blockecken vor den
      Randpunkten), sonst – bei mehr als einem Mitglied – auf ihren Mittelpunkt. nurAnker („Snap to anchor points only“):
      keine Gruppen, jede Ecke springt einzeln auf den nächsten Anker innerhalb der Schwelle oder bleibt.
      → {zellen, bewegt: Anzahl verschobener Ecken, anker} */
  function glaette(Z, block, schwelle, nurAnker = false) {
    const netz = netzAusZellen(Z, block), E = netz.ecken, A = anker(block, netz), n = E.length;
    const vater = E.map((_, i) => i), finde = i => vater[i] === i ? i : (vater[i] = finde(vater[i]));
    if (!nurAnker) for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++)
      if (Geo.abstand(E[a].p, E[b].p) < schwelle) vater[finde(a)] = finde(b);
    const gruppen = new Map();
    for (let i = 0; i < n; i++) { const r = finde(i); if (!gruppen.has(r)) gruppen.set(r, []); gruppen.get(r).push(i); }
    const ziel = E.map(e => e.p);
    for (const g of gruppen.values()) {
      let best = null, bd = schwelle;
      for (const a of A) for (const i of g) { const d = Geo.abstand(E[i].p, a); if (d < bd) { bd = d; best = a; } }
      let q = best;
      if (!q && g.length > 1) { q = [0, 0]; for (const i of g) { q[0] += E[i].p[0] / g.length; q[1] += E[i].p[1] / g.length; } }
      if (q) for (const i of g) ziel[i] = q;
    }
    const bewegt = E.filter((e, i) => Geo.abstand(e.p, ziel[i]) > TOL).length;
    const neu = netz.idx.map(z => {
      const P = [];
      for (const i of z) { const q = ziel[i]; if (!P.length || Geo.abstand(P[P.length - 1], q) > TOL) P.push(q); }
      while (P.length > 1 && Geo.abstand(P[0], P[P.length - 1]) <= TOL) P.pop();
      return P.length >= 3 ? Geo.bereinige(P, 1e-7) : P;
    }).filter(z => z.length >= 3 && Math.abs(Geo.flaecheS(z)) > 1e-6);
    return { zellen: neu, bewegt, anker: A };
  }

  /** Länge der Zellkanten auf dem Blockrand (Straßenanschluss) */
  function strassenfront(z, block) {
    let L = 0;
    for (let i = 0; i < z.length; i++) {
      const a = z[i], b = z[(i + 1) % z.length];
      if (randAbstand(Geo.lerp(a, b, 0.5), block) < 1e-3 && randAbstand(a, block) < 1e-3 && randAbstand(b, block) < 1e-3) L += Geo.abstand(a, b);
    }
    return L;
  }

  /** ganzen Block parzellieren (Tests, Neuberechnung) */
  function parzelliere(block, param) {
    const p = Object.assign({}, STANDARD, param);
    const punkte = teileDistanz(block, p.abstand), roh = zellen(punkte, block);
    const g = p.glaetten ? glaette(roh, block, p.abstand * p.snapping, p.nurAnker) : { zellen: roh, bewegt: 0, anker: [] };
    return { punkte, roh, zellen: g.zellen, bewegt: g.bewegt, anker: g.anker };
  }

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  const phasen = p => p.glaetten ? 3 : 2;
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = quartier(zufall);
    const bloecke = szene.bloecke.map(poly => ({ poly, A: Geo.flaeche(poly), phase: 0, punkte: null, roh: null, zellen: null, anker: null, bewegt: 0 }));
    return { t: 0, szene, b: szene.b, h: szene.h, bloecke, aktuell: -1, wahl: -1 };
  }

  /** eine Phase eines Blocks rechnen: 1 Punkte (Divide Distance), 2 Zellen (Voronoi + Trim), 3 Glätten (Network Smooth) */
  function phase(b, p) {
    b.phase++;
    if (b.phase === 1) b.punkte = teileDistanz(b.poly, p.abstand);
    else if (b.phase === 2) { b.roh = zellen(b.punkte, b.poly); b.zellen = b.roh; }
    else if (b.phase === 3) { const g = glaette(b.roh, b.poly, p.abstand * p.snapping, p.nurAnker); b.zellen = g.zellen; b.anker = g.anker; b.bewegt = g.bewegt; }
  }

  /** Ein Schritt = eine Phase im nächsten Block, der noch nicht fertig ist */
  function schritt(z, param) {
    const p = Object.assign({}, STANDARD, param), np = phasen(p);
    const i = z.bloecke.findIndex(b => b.phase < np);
    if (i >= 0) { phase(z.bloecke[i], p); z.aktuell = i; }
    z.t++;
    return z;
  }

  const fertig = (z, param) => { const np = phasen(Object.assign({}, STANDARD, param)); return z.bloecke.every(b => b.phase >= np); };
  /** Parzellen eines Blocks (oder der Block selbst, solange noch keine Zellen) */
  const parzellenVon = b => b.zellen || [b.poly];
  function blockBei(z, q) { return z.bloecke.findIndex(b => Geo.punktInPoly(q, b.poly)); }

  /** Snapping ändern ohne Neustart: geglättete Blöcke neu glätten; Glätten aus → rohe Zellen */
  function aendere(z, param, id) {
    const p = Object.assign({}, STANDARD, param);
    if (id !== "snapping" && id !== "glaetten" && id !== "nurAnker") return;
    for (const b of z.bloecke) {
      if (b.phase < 2) continue;
      if (!p.glaetten) { b.zellen = b.roh; b.anker = null; b.bewegt = 0; if (b.phase > 2) b.phase = 2; continue; }
      if (b.phase >= 3) { const g = glaette(b.roh, b.poly, p.abstand * p.snapping, p.nurAnker); b.zellen = g.zellen; b.anker = g.anker; b.bewegt = g.bewegt; }
    }
  }

  return { STANDARD, quartier, teileDistanz, zellen, randAbstand, netzAusZellen, anker, glaette, strassenfront, parzelliere,
           phasen, erzeuge, phase, schritt, fertig, parzellenVon, blockBei, aendere };
});
