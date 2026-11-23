/* Parzellierung mit Slicing Tree · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Parcellation Slicing Tree“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Die Komponente „Slicing Tree Structure for Parcels“ der DeCodingSpaces-Toolbox ist kompiliert; nachgebildet wird ein
   Slicing-Tree-Verfahren nach Beschreibung, Parametern und Katalogbild: Jeder Block wird rekursiv mit geraden Schnitten in
   zwei Teile zerlegt (binärer Baum). Tiefe Blöcke werden zuerst längs in zwei Reihen geteilt, danach jede Reihe quer zu ihrer
   längsten Straßenkante in Parzellen von etwa der Parzellenbreite (parcelWidth); das Teilungsverhältnis streut um splitRate.
   Weil jeder Querschnitt die Straßenkante kreuzt, behält jede Parzelle eine Kante am Blockrand („Keeps each parcel connected to
   the street“). Ein Schritt ist ein Schnitt; die Schnitte laufen Ebene für Ebene des Baums durch alle Blöcke. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen: parcelWidth 31 [10..100] (Regler der .gh-Datei), treeDepth 7, splitRate 0,5, minBlockArea 800 (feste Werte der
      Komponente „Customized Parameters“); streuung und laengsAb sind Parameter der Nachbildung */
  const STANDARD = { breite: 31, baumtiefe: 7, teilung: 0.5, streuung: 0.3, laengsAb: 60, minBlock: 800 };
  /** feste Werte der Komponente „Customized Parameters“ in der .gh-Datei (zur Dokumentation) */
  const CUSTOMIZED = { scalingFactor: 1, maxLength: 100, minLength: 20, angleRange: 90, nChildren: 3, treeDepth: 7, minAngleD: 10, minDistance: 1,
    minBlockArea: 800, blockOffset: 0, maxRank: 4, rank: 0, maxArea: 20, parcelDepth: 5, parcelWidth: 31, splitRate: 0.5, density: 10, seed: -1 };

  /** Beispielquartier: verzogenes Straßenraster, nur Blöcke (Gebäude und Platz aus) */
  function quartier(zufall) {
    const s = Szenen.stadt(zufall, { b: 720, h: 500, nx: 7, ny: 6, strasse: 14, gebaeude: false, platz: false, kirche: false });
    s.bloecke = s.bloecke.map(b => Geo.flaecheS(b) < 0 ? b.slice().reverse() : b);
    return s;
  }

  /** Abstand eines Punktes zum Blockrand */
  function randAbstand(q, block) {
    let m = Infinity;
    for (let i = 0; i < block.length; i++) m = Math.min(m, Geo.abstandSegment(q, block[i], block[(i + 1) % block.length]).d);
    return m;
  }
  /** Straßenkanten eines Teilpolygons: Kanten, die auf dem Blockrand liegen → [{a, b, l}] */
  function strassenkanten(poly, block, tol = 1e-3) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], l = Geo.abstand(a, b);
      if (l > tol && randAbstand(a, block) < tol && randAbstand(b, block) < tol && randAbstand(Geo.lerp(a, b, 0.5), block) < tol) out.push({ a, b, l });
    }
    return out;
  }
  const front = (poly, block) => strassenkanten(poly, block).reduce((s, k) => s + k.l, 0);

  /** Tiefe des Polygons quer zur Kante a→b (größter Abstand einer Ecke von der Kantengeraden, zur Innenseite) und Innennormale */
  function tiefeQuer(poly, a, b) {
    const t = Geo.norm(Geo.sub(b, a)), n = Geo.flaecheS(poly) > 0 ? [-t[1], t[0]] : [t[1], -t[0]];
    let D = 0; for (const q of poly) D = Math.max(D, Geo.dot(Geo.sub(q, a), n));
    return { D, t, n };
  }

  /** Polygon an der Geraden durch p mit Richtung d teilen; nur echte Zweiteilung (beide Teile mit Fläche) */
  function teile(poly, p, d) {
    const [l, r] = Geo.teilePolygon(poly, p, d).map(q => Geo.bereinige(q, 1e-7));
    if (l.length < 3 || r.length < 3) return null;
    const A = Geo.flaeche(poly), al = Geo.flaeche(l), ar = Geo.flaeche(r);
    if (al < 1e-6 * A || ar < 1e-6 * A || Math.abs(al + ar - A) > 1e-6 * A) return null;
    const S = Geo.geradeSchnittPoly(poly, p, d);
    const linie = S.length >= 2 ? [Geo.add(p, Geo.mul(d, S[0])), Geo.add(p, Geo.mul(d, S[S.length - 1]))] : [p, p];
    return { kinder: [l, r], linie };
  }

  /** Teilungsregel eines Knotens. → {art: "laengs"|"quer", kinder, linie, anteil} oder null (Blatt = Parzelle)
      längs: quer zur längsten Straßenkante (Länge L) mehr als laengsAb tief, und beide Hälften behalten eine Straßenkante ≥ L/2
      (so entstehen zwei Reihen Rücken an Rücken, aber keine Streifen ohne Straßenkante an der Langseite);
      quer: k = round(L / breite) Parzellen entlang der längsten Straßenkante, das linke Kind bekommt round(k · r) davon,
      r = splitRate ± streuung/2 (zufällig), Schnitt senkrecht zur Kante. */
  function regel(poly, block, p, zufall, ebene) {
    if (ebene >= p.baumtiefe) return null;
    if (ebene === 0 && Geo.flaeche(poly) < p.minBlock) return null;
    const K = strassenkanten(poly, block);
    if (!K.length) return null;
    const e = K.reduce((m, k) => k.l > m.l ? k : m);
    const { D, t, n } = tiefeQuer(poly, e.a, e.b);
    if (D > p.laengsAb) {
      const s = teile(poly, Geo.add(e.a, Geo.mul(n, D / 2)), t);
      const langeKante = q => strassenkanten(q, block).some(k => k.l >= e.l / 2);
      if (s && s.kinder.every(langeKante)) return Object.assign(s, { art: "laengs", anteil: 0.5 });
    }
    const k = Math.round(e.l / p.breite);
    if (k < 2) return null;
    const r = p.teilung + (zufall() - 0.5) * p.streuung;
    const k1 = Math.max(1, Math.min(k - 1, Math.round(k * r)));
    const s = teile(poly, Geo.lerp(e.a, e.b, k1 / k), n);
    if (!s) return null;
    // das Kind auf der Seite von e.a zuerst
    if (!Geo.punktInPoly(Geo.lerp(e.a, e.b, k1 / k / 2), s.kinder[0]) && Geo.punktInPoly(Geo.lerp(e.a, e.b, k1 / k / 2), s.kinder[1])) s.kinder.reverse();
    return Object.assign(s, { art: "quer", anteil: k1 / k, k });
  }

  /** Slicing Tree eines Blocks (rekursiv, Tiefe zuerst) → Knotenliste; Knoten {id, poly, ebene, eltern, kinder, art, linie} */
  function baum(block, param, zufall) {
    const p = Object.assign({}, STANDARD, param), K = [];
    (function teileRek(poly, ebene, eltern) {
      const kn = { id: K.length, poly, ebene, eltern, kinder: null, art: null, linie: null };
      K.push(kn);
      const s = regel(poly, block, p, zufall, ebene);
      if (s) {
        kn.art = s.art; kn.linie = s.linie; kn.anteil = s.anteil;
        kn.kinder = s.kinder.map(q => teileRek(q, ebene + 1, kn.id));
      }
      return kn.id;
    })(block, 0, -1);
    return K;
  }
  const blaetter = K => K.filter(k => !k.kinder);

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = quartier(zufall);
    const bloecke = szene.bloecke.map(poly => ({ poly, A: Geo.flaeche(poly), knoten: baum(poly, p, zufall) }));
    for (const b of bloecke) for (const k of b.knoten) if (!k.kinder) { k.front = front(k.poly, b.poly); k.A = Geo.flaeche(k.poly); }
    // Schnittreihenfolge: Ebene für Ebene, darin Block für Block, im Block in Baumreihenfolge
    const schnitte = [];
    bloecke.forEach((b, bi) => b.knoten.forEach(k => { if (k.kinder) schnitte.push([k.ebene, bi, k.id]); }));
    schnitte.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
    schnitte.forEach(([, bi, id], i) => { bloecke[bi].knoten[id].nr = i; });
    for (const b of bloecke) { let j = 0; b.knoten.filter(k => k.kinder).sort((x, y) => x.nr - y.nr).forEach(k => { k.nrImBlock = ++j; }); }
    let wahl = 0; bloecke.forEach((b, i) => { if (b.A > bloecke[wahl].A) wahl = i; });
    return { t: 0, szene, b: szene.b, h: szene.h, bloecke, schnitte, wahl };
  }

  /** Ein Schritt = ein Schnitt (der nächste in der Schnittreihenfolge) */
  function schritt(z) { z.t++; return z; }
  const fertig = z => z.t >= z.schnitte.length;
  /** ist Knoten k zur Zeit t schon geschnitten? */
  const geschnitten = (k, t) => k.kinder && k.nr < t;
  /** sichtbare Teile eines Blocks zur Zeit t: Knoten, deren Eltern geschnitten sind und die selbst (noch) nicht geschnitten sind */
  function teileZurZeit(b, t) { return b.knoten.filter(k => (k.eltern < 0 || b.knoten[k.eltern].nr < t) && !geschnitten(k, t)); }
  /** zuletzt ausgeführter Schnitt → {bi, knoten} */
  function letzter(z) { if (z.t < 1) return null; const [, bi, id] = z.schnitte[Math.min(z.t, z.schnitte.length) - 1]; return { bi, knoten: z.bloecke[bi].knoten[id] }; }
  function blockBei(z, q) { return z.bloecke.findIndex(b => Geo.punktInPoly(q, b.poly)); }

  /** Lage der Baumknoten für die Zeichnung: Blätter gleichmäßig verteilt (x in [0, 1]), Eltern mittig über den Kindern, y = Ebene */
  function baumLayout(K) {
    const pos = new Array(K.length), n = blaetter(K).length; let i = 0;
    (function lege(id) {
      const k = K[id];
      if (!k.kinder) { pos[id] = [(i++ + 0.5) / n, k.ebene]; return pos[id][0]; }
      const xs = k.kinder.map(lege); pos[id] = [(xs[0] + xs[xs.length - 1]) / 2, k.ebene]; return pos[id][0];
    })(0);
    return pos;
  }

  function aendere() {}

  return { STANDARD, CUSTOMIZED, quartier, randAbstand, strassenkanten, front, tiefeQuer, teile, regel, baum, blaetter, erzeuge, schritt,
           fertig, geschnitten, teileZurZeit, letzter, blockBei, baumLayout, aendere };
});
