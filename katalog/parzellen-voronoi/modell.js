/* Parzellierung mit Voronoi · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Parcellation via Voronoi“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verdrahtung der .gh-Datei: Divide Distance (Blockkurve, Abstand = Cell Distance) → Voronoi → Trim with Region (Block) →
   Network Smooth (Ankerpunkte = Blockecken und Schnittpunkte der Zellgrenzen mit dem Blockrand, Snap threshold =
   Cell Distance × Snapping) → Polygons from lines. Weil alle Erzeugerpunkte auf dem Blockrand liegen, berührt jede Zelle den
   Rand: „Keeps each parcel connected to the street.“ Ein Schritt ist eine Phase eines Blocks (Punkte → Zellen → Glätten). */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Cell Distance 59 [10..100], Snapping 0,3 [0,1..0,5]; glaetten = Network Smooth an */
  const STANDARD = { abstand: 59, snapping: 0.3, glaetten: true };
  const TOL = 1e-6;

  /** Beispielquartier: verzogenes Straßenraster, nur Blöcke (Gebäude und Platz aus) */
  function quartier(zufall) {
    const s = Szenen.stadt(zufall, { b: 720, h: 500, nx: 7, ny: 6, strasse: 14, gebaeude: false, platz: false, kirche: false });
    s.bloecke = s.bloecke.map(b => Geo.flaecheS(b) < 0 ? b.slice().reverse() : b);
    return s;
  }

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

  /** Abstand eines Punktes zum Blockrand */
  function randAbstand(q, block) {
    let m = Infinity;
    for (let i = 0; i < block.length; i++) m = Math.min(m, Geo.abstandSegment(q, block[i], block[(i + 1) % block.length]).d);
    return m;
  }

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

  /** Network Smooth (nachgebildet): Innere Ecken, die näher als die Schwelle beieinanderliegen, werden zu ihrem Mittel
      zusammengezogen (kurze Zellgrenzen verschwinden); liegt eine Ecke einer solchen Gruppe näher als die Schwelle an einem Anker,
      springt die Gruppe auf den nächsten Anker. Randecken bleiben fest. → {zellen, bewegt: Anzahl verschobener Ecken, ziele} */
  function glaette(Z, block, schwelle) {
    const netz = netzAusZellen(Z, block), E = netz.ecken, A = anker(block, netz), n = E.length;
    const vater = E.map((_, i) => i), finde = i => vater[i] === i ? i : (vater[i] = finde(vater[i]));
    const innen = E.map((e, i) => e.rand ? -1 : i).filter(i => i >= 0);
    for (let a = 0; a < innen.length; a++) for (let b = a + 1; b < innen.length; b++)
      if (Geo.abstand(E[innen[a]].p, E[innen[b]].p) < schwelle) vater[finde(innen[a])] = finde(innen[b]);
    const gruppen = new Map();
    for (const i of innen) { const r = finde(i); if (!gruppen.has(r)) gruppen.set(r, []); gruppen.get(r).push(i); }
    const ziel = E.map(e => e.p);
    let bewegt = 0;
    for (const g of gruppen.values()) {
      let best = null, bd = schwelle;
      for (const i of g) for (const a of A) { const d = Geo.abstand(E[i].p, a); if (d < bd) { bd = d; best = a; } }
      let q = best;
      if (!q) { q = [0, 0]; for (const i of g) { q[0] += E[i].p[0] / g.length; q[1] += E[i].p[1] / g.length; } }
      if (best || g.length > 1) { for (const i of g) ziel[i] = q; bewegt += g.length; }
    }
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
    const g = p.glaetten ? glaette(roh, block, p.abstand * p.snapping) : { zellen: roh, bewegt: 0, anker: [] };
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
    else if (b.phase === 3) { const g = glaette(b.roh, b.poly, p.abstand * p.snapping); b.zellen = g.zellen; b.anker = g.anker; b.bewegt = g.bewegt; }
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
    if (id !== "snapping" && id !== "glaetten") return;
    for (const b of z.bloecke) {
      if (b.phase < 2) continue;
      if (!p.glaetten) { b.zellen = b.roh; b.anker = null; b.bewegt = 0; if (b.phase > 2) b.phase = 2; continue; }
      if (b.phase >= 3) { const g = glaette(b.roh, b.poly, p.abstand * p.snapping); b.zellen = g.zellen; b.anker = g.anker; b.bewegt = g.bewegt; }
    }
  }

  return { STANDARD, quartier, teileDistanz, zellen, randAbstand, netzAusZellen, anker, glaette, strassenfront, parzelliere,
           phasen, erzeuge, phase, schritt, fertig, parzellenVon, blockBei, aendere };
});
