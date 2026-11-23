/* Parametric Planning Catalogue · generative Bausteine: Straßenwachstum nach Instruktionsbaum und Slicing Tree (ohne DOM, in Node testbar)
   Vorher als Kopie in mehreren Apps (Runde 3, 23.11.2026):
   – Street Network Synthesis / Street Network Generator / ChromosomeMapper: Instruktionsbaum (Gene je Knoten) und Wachstum in
     die größte freie Lücke (aus netzoptimierung, stadtsynthese, gebaeude-generierung)
   – Slicing Tree (STreeExtended, „Slicing Tree Structure for Parcels“) und die Parzellenteilung „Parcels“ (PG) als Variante
     (aus parzellen-slicing-tree, stadtsynthese, gebaeude-generierung)
   Abgleich mit dem rekonstruierten Quelltext der DeCodingSpaces-Toolbox (Bauhaus-InfAU/decoding-spaces-toolbox, GPL-3.0;
   Ablauf, Voreinstellungen und Randfälle aus docs/research/legacy-generation.md §1, §2, §6 abgelesen; kein Code übernommen).
   Zufall: Funktionen () → [0, 1) mit .ganz(n) (simulationen/_gemeinsam/zufall.js), nie Math.random().
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const G = fabrik(node ? require("./geo.js") : wurzel.Geo);
  if (node) module.exports = G;
  else wurzel.Generierung = G;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo) {
  "use strict";
  const { sub, dot, norm, abstand } = Geo;

  /* ================================================================ Straßenwachstum nach Instruktionsbaum */
  /** feste Werte im Inneren der kompilierten Komponenten (legacy-generation.md §1) und eigene Grenzen */
  const INTERN = {
    freiwinkel: 80,      // kleinster freier Winkel für einen neuen Arm (_minAngle = 80°)
    wurzelArme: 3,       // drei Arm-Plätze je Knoten der Startstraßen
    wurzelMaxArme: 4,    // höchster Grad an den Wurzeln (maxConn = 4)
    fangStart: 1,        // Rand und Startstraßen werden mit 1 m Fangabstand eingefügt
    minSegment: 1,       // kürzere Arme werden verworfen
    maxKnoten: 20000     // Obergrenze der Baumgröße (bei TreeDepth 20 wüchse der Baum sonst auf Millionen Knoten)
  };
  /** Art einer Kante im Wachstumsgraphen */
  const ART = { RAND: 0, START: 1, NEU: 2 };

  /* ---------------------------------------------------------------- Straßengraph {P: Punkte, adj: Kanten je Knoten, E: [{a, b, art, lebt}]} */
  function netzNeu() { return { P: [], adj: [], E: [] }; }
  function knotenNeu(G, q) { G.P.push([q[0], q[1]]); G.adj.push([]); return G.P.length - 1; }
  function kanteNeu(G, a, b, art) { const k = G.E.length; G.E.push({ a, b, art, lebt: true }); G.adj[a].push(k); G.adj[b].push(k); return k; }
  const gegenueber = (G, v, k) => (G.E[k].a === v ? G.E[k].b : G.E[k].a);
  const grad = (G, v) => G.adj[v].length;
  const nachbarn = (G, v) => G.adj[v].map(k => gegenueber(G, v, k));
  const verbunden = (G, a, b) => G.adj[a].some(k => gegenueber(G, a, k) === b);
  const amRand = (G, v) => G.adj[v].some(k => G.E[k].art === ART.RAND);
  /** Kante k am Knoten v teilen (v liegt auf k) */
  function kanteTeilen(G, k, v) {
    const e = G.E[k]; e.lebt = false;
    G.adj[e.a] = G.adj[e.a].filter(x => x !== k); G.adj[e.b] = G.adj[e.b].filter(x => x !== k);
    kanteNeu(G, e.a, v, e.art); kanteNeu(G, v, e.b, e.art);
  }
  /** nächster Knoten zu q (ohne Knoten „ohne“) → {v, d} */
  function naechsterKnoten(G, q, ohne = -1) {
    let v = -1, d = Infinity;
    for (let i = 0; i < G.P.length; i++) {
      if (i === ohne) continue;
      const di = Math.hypot(G.P[i][0] - q[0], G.P[i][1] - q[1]); if (di < d) { d = di; v = i; }
    }
    return { v, d };
  }
  /** nächste lebende Kante zu q, die nicht am Knoten „ohne“ hängt → {k, d, q (Fußpunkt), t} */
  function naechsteKante(G, q, ohne = -1) {
    let best = { k: -1, d: Infinity, q: null, t: 0 };
    for (let k = 0; k < G.E.length; k++) {
      const e = G.E[k]; if (!e.lebt || e.a === ohne || e.b === ohne) continue;
      const r = Geo.abstandSegment(q, G.P[e.a], G.P[e.b]); if (r.d < best.d) best = { k, d: r.d, q: r.q, t: r.t };
    }
    return best;
  }
  /** erster Schnitt der Strecke a → b mit lebenden Kanten, die nicht an den Knoten v1/v2 hängen und nicht k0 sind → {k, t, p} | null */
  function ersterSchnitt(G, a, b, v1, v2, k0) {
    let best = null;
    for (let k = 0; k < G.E.length; k++) {
      const e = G.E[k];
      if (!e.lebt || k === k0 || e.a === v1 || e.b === v1 || (v2 >= 0 && (e.a === v2 || e.b === v2))) continue;
      const s = Geo.segmentSchnitt(a, b, G.P[e.a], G.P[e.b]);
      if (s && s.t > 1e-9 && s.t < 1 - 1e-9 && (!best || s.t < best.t)) best = { k, t: s.t, p: s.p };
    }
    return best;
  }
  /** Knoten (≠ v1, v2), der näher als md an der Strecke a → b liegt, der erste entlang der Strecke → {v, t} | null */
  function knotenAnStrecke(G, a, b, v1, v2, md) {
    let best = null;
    for (let i = 0; i < G.P.length; i++) {
      if (i === v1 || i === v2 || !G.adj[i].length) continue;
      const r = Geo.abstandSegment(G.P[i], a, b);
      if (r.d < md && r.t > 1e-9 && r.t < 1 - 1e-9 && (!best || r.t < best.t)) best = { v: i, t: r.t };
    }
    return best;
  }
  /** Strecke a–b (Rand oder Startstraße) mit Fangabstand tol einfügen: Endpunkte fangen an Knoten oder Kanten,
      unterwegs jede gekreuzte Kante teilen (Knoten an Kreuzungen). → [Knoten am Anfang, Knoten am Ende] */
  function fuegeStreckeEin(G, a, b, art, tol) {
    const ende = q => {
      const nv = naechsterKnoten(G, q); if (nv.v >= 0 && nv.d <= tol) return nv.v;
      const ne = naechsteKante(G, q); const v = knotenNeu(G, ne.k >= 0 && ne.d <= tol ? ne.q : q);
      if (ne.k >= 0 && ne.d <= tol) kanteTeilen(G, ne.k, v);
      return v;
    };
    const va = ende(a), vb = ende(b);
    if (va === vb) return [va, vb];
    const pa = G.P[va], pb = G.P[vb], kette = [];
    for (let k = 0; k < G.E.length; k++) {
      const e = G.E[k]; if (!e.lebt || e.a === va || e.b === va || e.a === vb || e.b === vb) continue;
      const s = Geo.segmentSchnitt(pa, pb, G.P[e.a], G.P[e.b]);
      if (s && s.t > 1e-9 && s.t < 1 - 1e-9) kette.push({ t: s.t, k, p: s.p });
    }
    kette.sort((x, y) => x.t - y.t);
    let u = va;
    for (const c of kette) {
      const e = G.E[c.k]; let v;
      if (abstand(c.p, G.P[e.a]) <= tol) v = e.a; else if (abstand(c.p, G.P[e.b]) <= tol) v = e.b;
      else { v = knotenNeu(G, c.p); kanteTeilen(G, c.k, v); }
      if (v !== u && !verbunden(G, u, v)) kanteNeu(G, u, v, art);
      u = v;
    }
    if (u !== vb && !verbunden(G, u, vb)) kanteNeu(G, u, vb, art);
    return [va, vb];
  }
  /** Grundnetz einer Szene S = {rand: Polygon, start: [Polylinien]}: Rand (geschlossen) und Startstraßen mit 1 m Fangabstand.
      → {G, wurzeln: Knoten der Startstraßen (eine Wurzel je Stützpunkt)} */
  function grundnetz(S) {
    const G = netzNeu(), R = S.rand;
    for (let i = 0; i < R.length; i++) fuegeStreckeEin(G, R[i], R[(i + 1) % R.length], ART.RAND, INTERN.fangStart);
    for (const pl of S.start) for (let i = 0; i + 1 < pl.length; i++) fuegeStreckeEin(G, pl[i], pl[i + 1], ART.START, INTERN.fangStart);
    const wurzeln = [];
    for (const pl of S.start) for (const q of pl) wurzeln.push(naechsterKnoten(G, q).v);
    return { G, wurzeln };
  }
  /** Punkt im äußeren Rand (OuterBoundary fehlt → Rand + 1 m) */
  function imAussenrand(S, q) {
    if (Geo.punktInPoly(q, S.rand)) return true;
    const R = S.rand;
    for (let i = 0; i < R.length; i++) if (Geo.abstandSegment(q, R[i], R[(i + 1) % R.length]).d <= 1) return true;
    return false;
  }
  /** Einen Arm vom Knoten pv zum Zielpunkt einfügen (AddGraphElement, eigene geordnete Fangregeln):
      1. Zielpunkt fängt an einem Knoten (näher als MinDist; Knoten mit Grad ≥ MaxArms lehnen ab), sonst an einer Kante (Fußpunkt);
      2. der Arm endet am ersten Schnitt mit einer anderen Straße (die geteilt wird) – ein Arm, der den Rand trifft, ist geschlossen;
      3. liegt ein Knoten näher als MinDist an der Strecke, endet der Arm dort; 2. und 3. werden wiederholt, bis sich nichts ändert;
      4. Ziel außerhalb des äußeren Rands oder kürzer als 1 m → verworfen.  → {v, zu} oder null */
  function arm(G, S, pv, ziel, md, maxArme) {
    let q = ziel, zielV = -1, teilK = -1, zu = false;
    const nv = naechsterKnoten(G, q, pv);
    if (nv.v >= 0 && nv.d < md) { if (grad(G, nv.v) >= maxArme) return null; zielV = nv.v; q = G.P[zielV]; }
    else { const ne = naechsteKante(G, q, pv); if (ne.k >= 0 && ne.d < md && ne.t > 0 && ne.t < 1) { q = ne.q; teilK = ne.k; } }
    for (let runde = 0; runde < 6; runde++) {
      let geaendert = false;
      const s = ersterSchnitt(G, G.P[pv], q, pv, zielV, teilK);
      if (s) {
        const e = G.E[s.k], da = abstand(s.p, G.P[e.a]), db = abstand(s.p, G.P[e.b]);
        if (Math.min(da, db) <= INTERN.fangStart) { zielV = da <= db ? e.a : e.b; q = G.P[zielV]; teilK = -1; }
        else { zielV = -1; q = s.p; teilK = s.k; }
        geaendert = true;
      }
      const w = knotenAnStrecke(G, G.P[pv], q, pv, zielV, md);
      if (w) { zielV = w.v; q = G.P[zielV]; teilK = -1; geaendert = true; }
      if (zielV === pv) return null;
      if (zielV >= 0 && grad(G, zielV) >= maxArme) return null;
      if (!geaendert) break;
    }
    if (zielV < 0 && teilK < 0 && !imAussenrand(S, q)) return null;
    if (abstand(G.P[pv], q) < INTERN.minSegment) return null;
    if (zielV >= 0 && verbunden(G, pv, zielV)) return null;
    let v = zielV;
    if (v < 0) { v = knotenNeu(G, q); if (teilK >= 0) { if (G.E[teilK].art === ART.RAND) zu = true; kanteTeilen(G, teilK, v); } }
    else if (amRand(G, v)) zu = true;
    kanteNeu(G, pv, v, ART.NEU);
    return { v, zu };
  }
  /** Richtung von a nach b in Grad */
  const richtung = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
  /** Richtung des neuen Arms am Knoten pv relativ zur Herkunft ref (Grad, gegen den Uhrzeigersinn im Rechensinn):
      ein Nachbar → 180° (geradeaus); sonst Winkelhalbierende der größten freien Lücke zwischen den Nachbarn (die Herkunft
      zählt als belegt); Lücke < 80° → null (kein Platz); Lücke ≥ 260° → Versatz 45°/90°/135°/… vom Lückenanfang (teiler). */
  function armRichtung(P, pv, ref, nb, teiler) {
    if (nb.length <= 1) return 180;
    const a0 = richtung(P[pv], P[ref]);
    const W = [0];
    for (const v of nb) { const w = ((richtung(P[pv], P[v]) - a0) % 360 + 360) % 360; if (w > 1e-9 && w < 360 - 1e-9) W.push(w); }
    W.sort((x, y) => x - y);
    let luecke = -1, anfang = 0;
    for (let i = 0; i < W.length; i++) {
      const g = (i + 1 < W.length ? W[i + 1] : 360) - W[i];
      if (g > luecke + 1e-9) { luecke = g; anfang = W[i]; }
    }
    if (luecke < INTERN.freiwinkel) return null;
    if (luecke >= 260) luecke = 90 + 90 * Math.floor(teiler * Math.ceil(luecke / 90));
    return anfang + luecke / 2;
  }

  /* ---------------------------------------------------------------- Instruktionsbaum */
  /** Gene eines Knotens wie im Original: Winkel = Next(RandomAngle) − RandomAngle/2 (ganze Grad), Länge = Next(MaxLength) + MinLength
      (ganze Meter), höchster Grad maxArme = Next(MaxArms − 1) + 2, teiler für sehr große Lücken.
      p: {zufallsWinkel, maxLaenge, minLaenge, maxArme} */
  function gene(zufall, p) {
    const ra = Math.max(0, Math.round(p.zufallsWinkel)), ml = Math.max(1, Math.round(p.maxLaenge)), ma = Math.max(1, Math.round(p.maxArme));
    return { winkel: zufall.ganz(ra) - ra / 2, laenge: zufall.ganz(ml) + p.minLaenge, maxArme: zufall.ganz(ma - 1) + 2, teiler: zufall() };
  }
  /** Zufälliger Instruktionsbaum (Street Network Chromosome): je Knoten der Startstraßen eine Wurzel mit drei Arm-Plätzen;
      TreeDepth Ebenen breitenweise; jeder Knoten bekommt einen sicheren Platz und k − 1 weitere (k = Next(MaxArms − 1) + 1),
      ab Ebene 4 jeden weiteren nur mit Wahrscheinlichkeit (k + 1) / Ebene. p: Gene + {baumtiefe}.
      opt.ebene: jeder Knoten merkt seine Ebene (für die Reihenfolge der Arme). → {wurzeln: [{kinder: [...]}], anzahl} */
  function baum(zufall, nWurzeln, p, opt = {}) {
    const ma = Math.max(1, Math.round(p.maxArme)), tiefe = Math.max(0, Math.round(p.baumtiefe));
    const wurzeln = [];
    let plaetze = [], anzahl = 0;
    for (let i = 0; i < nWurzeln; i++) { const w = { kinder: [] }; wurzeln.push(w); for (let j = 0; j < INTERN.wurzelArme; j++) plaetze.push(w); }
    for (let ebene = 1; ebene <= tiefe && plaetze.length; ebene++) {
      const naechste = [];
      for (const e of plaetze) {
        if (anzahl >= INTERN.maxKnoten) break;
        const c = Object.assign(opt.ebene ? { kinder: [], ebene } : { kinder: [] }, gene(zufall, p));
        e.kinder.push(c); anzahl++; naechste.push(c);
        const k = zufall.ganz(ma - 1) + 1;
        for (let x = 1; x < k; x++) if (ebene <= 3 || zufall() <= (k + 1) / ebene) naechste.push(c);
      }
      plaetze = naechste;
    }
    return { wurzeln, anzahl };
  }

  /* ---------------------------------------------------------------- Wachstum (ChromosomeMapper, GrowStreetPatternNew) */
  /** Wachstum vorbereiten: Grundnetz G mit Wurzelknoten, Baum B; Ebene 0 = die Wurzeln.
      → W = {G, B, ebene: [{k, e, pos, zu, wurzel}], nr: Zahl der gewachsenen Ebenen, gesetzt: Zahl der Arme, neu: Strecken der letzten Ebene} */
  function wachstumBeginn(G, wurzeln, B) {
    return { G, B, ebene: B.wurzeln.map((w, i) => ({ k: w, e: null, pos: wurzeln[i] != null ? wurzeln[i] : -1, zu: false, wurzel: true })), nr: 0, gesetzt: 0, neu: [] };
  }
  /** Eine Ebene des Instruktionsbaums wachsen lassen: die Knoten der nächsten Ebene der Reihe nach (alle Wurzeln verschränkt).
      Ein Knoten wächst vom Endpunkt seines Elternknotens aus, wenn dieser offen ist, dessen Grad unter maxArme liegt und eine
      Lücke ≥ 80° frei ist. opt.stat: Zähler der Ablehnungsgründe; opt.arme: Liste, in die [{a, b, ebene}] in Setzreihenfolge kommt.
      p: {minAbstand, maxArme}. → Zahl der gesetzten Arme */
  function wachstumEbene(W, S, p, opt = {}) {
    const G = W.G, md = Math.max(0, p.minAbstand), maxArme = Math.max(2, Math.round(p.maxArme)), stat = opt.stat, arme = opt.arme;
    const zaehl = k => { if (stat) stat[k] = (stat[k] || 0) + 1; };
    const naechste = [];
    for (const r of W.ebene) for (const c of r.k.kinder) naechste.push({ k: c, e: r, pos: -1, zu: false });
    let n = 0; const k0 = G.E.length;
    for (const c of naechste) {
      const e = c.e;
      if (e.zu || e.pos < 0) { c.zu = true; zaehl("elternZu"); continue; }
      const pv = e.pos, cap = e.wurzel ? INTERN.wurzelMaxArme : e.k.maxArme;
      if (grad(G, pv) >= cap) { e.zu = c.zu = true; zaehl("grad"); continue; }
      const nb = nachbarn(G, pv);
      if (!nb.length) { c.zu = true; continue; }
      let ref = e.e && e.e.pos >= 0 && e.e.pos !== pv ? e.e.pos : nb[0];
      if (nb.length === 1) ref = nb[0];
      const dir = armRichtung(G.P, pv, ref, nb, c.k.teiler);
      if (dir === null) { c.zu = true; zaehl("luecke"); continue; }
      const th = (richtung(G.P[pv], G.P[ref]) + dir + c.k.winkel) * Math.PI / 180;
      const ziel = [G.P[pv][0] + c.k.laenge * Math.cos(th), G.P[pv][1] + c.k.laenge * Math.sin(th)];
      const a = arm(G, S, pv, ziel, md, maxArme);
      if (!a) { c.zu = true; zaehl("abgelehnt"); continue; }
      c.pos = a.v; c.zu = a.zu; n++;
      if (arme) arme.push({ a: G.P[pv].slice(), b: G.P[a.v].slice(), ebene: c.k.ebene });
    }
    W.ebene = naechste; W.nr++; W.gesetzt += n;
    W.neu = G.E.slice(k0).filter(e => e.lebt && e.art === ART.NEU).map(e => [G.P[e.a], G.P[e.b]]);
    return n;
  }
  /** lebende Kanten des Wachstumsgraphen als Strecken */
  const segmenteVon = G => G.E.filter(e => e.lebt).map(e => [G.P[e.a], G.P[e.b]]);
  /** Baum B in der Szene S ganz wachsen lassen (alle Ebenen). opt wie wachstumEbene; opt.arme = true sammelt die Arme.
      → {G, segmente: [[a, b]], art: [ART] je Segment, arme: [{a, b, ebene}] (nur mit opt.arme), gesetzt} */
  function wachse(B, S, p, opt = {}) {
    const { G, wurzeln } = grundnetz(S), W = wachstumBeginn(G, wurzeln, B), arme = opt.arme ? [] : null;
    while (W.ebene.length) wachstumEbene(W, S, p, { stat: opt.stat, arme });
    const segmente = [], art = [];
    for (const e of G.E) if (e.lebt) { segmente.push([G.P[e.a], G.P[e.b]]); art.push(e.art); }
    return { G, segmente, art, arme, gesetzt: W.gesetzt };
  }

  /* ================================================================ Slicing Tree (STreeExtended) und Parcels (PG) */
  /** „quasi-kollinear“ (rad) */
  const WINKEL_TOL = 0.01;
  /** Punkt p um c drehen (Winkel w, Bogenmaß) */
  const dreh = (p, c, w) => { const co = Math.cos(w), si = Math.sin(w), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + co * x - si * y, c[1] + si * x + co * y]; };
  /** Winkel, um den das Polygon zu drehen ist, damit die lange Seite seines kleinsten umschließenden Rechtecks waagrecht liegt */
  function rechteckWinkel(poly) {
    const H = Geo.konvexeHuelle(poly);
    let best = { A: Infinity, w: 0 };
    for (let i = 0; i < H.length; i++) {
      const a = H[i], b = H[(i + 1) % H.length], phi = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const Q = H.map(p => dreh(p, [0, 0], -phi)), bb = Geo.bbox(Q), A = bb.b * bb.h;
      if (A < best.A - 1e-9) best = { A, w: bb.b >= bb.h ? -phi : -phi + Math.PI / 2 };
    }
    return best.w;
  }
  /** Kanten eines Polygons → [{a, b, l, i}] */
  function kantenVon(poly) { return poly.map((a, i) => { const b = poly[(i + 1) % poly.length]; return { a, b, l: abstand(a, b), i }; }); }
  /** Winkelunterschied zweier Richtungen ohne Vorzeichen der Richtung (0 … π/2) */
  const winkelDiff = (u, v) => { let d = Math.abs(Math.atan2(u[1], u[0]) - Math.atan2(v[1], v[0])) % Math.PI; return Math.min(d, Math.PI - d); };
  /** Straßenkante: quasi-kollinear (Winkel < 0,01 rad, Abstand der Mitte < skal) mit einer Kante des Wurzelblocks */
  function istStrasse(k, wurzel, skal = 1) {
    const m = Geo.lerp(k.a, k.b, 0.5), d = sub(k.b, k.a);
    return wurzel.some(r => winkelDiff(d, sub(r.b, r.a)) < WINKEL_TOL && Geo.abstandSegment(m, r.a, r.b).d < skal);
  }
  /** Kanten eines Teils in Straßen- und Innenkanten, je nach Länge absteigend */
  function teileKanten(poly, wurzel, skal = 1) {
    const K = kantenVon(poly).filter(k => k.l > 1e-9), strasse = [], innen = [];
    for (const k of K) (istStrasse(k, wurzel, skal) ? strasse : innen).push(k);
    strasse.sort((x, y) => y.l - x.l); innen.sort((x, y) => y.l - x.l);
    return { strasse, innen };
  }
  /** „senkrecht“ im gedrehten Rahmen: 45° < |Winkel| < 135° */
  const senkrecht = k => { const w = Math.abs(Math.atan2(k.b[1] - k.a[1], k.b[0] - k.a[0])) * 180 / Math.PI; return w > 45 && w < 135; };
  const beruehren = (k, e, tol = 1e-6) => [k.a, k.b].some(p => Geo.abstandSegment(p, e.a, e.b).d < tol) || [e.a, e.b].some(p => Geo.abstandSegment(p, k.a, k.b).d < tol);
  /** Abstand zweier (fast) paralleler Kanten: Abstand der Mitte der einen von der Geraden der anderen; nicht parallel → −1 */
  function parallelAbstand(k, e) {
    if (winkelDiff(sub(k.b, k.a), sub(e.b, e.a)) >= WINKEL_TOL) return -1;
    const n = norm([-(e.b[1] - e.a[1]), e.b[0] - e.a[0]]);
    return Math.abs(dot(sub(Geo.lerp(k.a, k.b, 0.5), e.a), n));
  }

  /** Teilungsregel eines Teils (im gedrehten Rahmen). q = {breite (parcelWidth), teilung (splitRate), skalierung (scalingFactor),
      minAbstand (minDistance), variante}. Ohne Straßenkante: Blatt (null).
      variante "stx" (Slicing Tree Structure for Parcels, STreeExtended): Kandidaten = Straßenkanten, bei durchgehenden Streifen
        zusätzlich die längste Innenkante („Rücken an Rücken“: Abstand der beiden längsten Innenkanten ≥ minAbstand · teilung,
        Straße auch gegenüber, Innenkante > 2 · breite); erste Kante mit teilung · |e| > breite.
      variante "pg" (Komponente Parcels, PlotWidthThreshold = breite): Rücken an Rücken mit Abstand ≥ breite, dann beide langen
        Innenkanten in die nach Länge sortierte Liste; erste Kante mit teilung · |e| ≥ breite.
      Schnitt senkrecht zur gewählten Kante bei bbox.min + teilung · bbox.größe. → {op: "V"|"H", x|y, kante, ruecken} oder null */
  function sliceRegel(poly, wurzel, q) {
    const { strasse, innen } = teileKanten(poly, wurzel, q.skalierung);
    if (!strasse.length) return null;                                   // Restfläche ohne Straße: Blatt
    let kandidaten = strasse.slice(), ruecken = null;
    const pg = q.variante === "pg";
    if (strasse.length >= 2 && innen.length >= 2) {                      // Rücken an Rücken bei durchgehenden Streifen
      const [i1, i2] = innen, abst = parallelAbstand(i2, i1);
      const gegenueber = strasse.some(k => !beruehren(k, strasse[0]));
      if (pg) { if (abst >= q.breite && gegenueber && i1.l > 2 * q.breite) { kandidaten = kandidaten.concat([i2, i1]).sort((x, y) => y.l - x.l); ruecken = [i1, i2]; } }
      else if (abst >= q.minAbstand * q.teilung && gegenueber && i1.l > 2 * q.breite) { ruecken = [i1]; kandidaten.push(i1); }
    }
    const e = pg ? kandidaten.find(k => q.teilung * k.l >= q.breite) : kandidaten.find(k => q.teilung * k.l > q.breite);
    if (!e) return null;
    const bb = Geo.bbox(poly), op = senkrecht(e) ? "H" : "V", r = !!ruecken && ruecken.includes(e);
    return op === "V" ? { op, x: bb.x0 + q.teilung * bb.b, kante: e, ruecken: r } : { op, y: bb.y0 + q.teilung * bb.h, kante: e, ruecken: r };
  }
  /** Polygon an der achsparallelen Geraden der Regel r teilen → {kinder: [kleinere Koordinate, größere], linie} oder null */
  function sliceTeile(poly, r) {
    const p = r.op === "V" ? [r.x, 0] : [0, r.y], n = r.op === "V" ? [1, 0] : [0, 1];
    const a = Geo.bereinige(Geo.schneideHalbebene(poly, p, n), 1e-7), b = Geo.bereinige(Geo.schneideHalbebene(poly, p, [-n[0], -n[1]]), 1e-7);
    const A = Geo.flaeche(poly);
    if (a.length < 3 || b.length < 3 || Geo.flaeche(a) < 1e-6 * A || Geo.flaeche(b) < 1e-6 * A) return null;
    const S = r.op === "V" ? Geo.geradeSchnittPoly(poly, [r.x, 0], [0, 1]) : Geo.geradeSchnittPoly(poly, [0, r.y], [1, 0]);
    const linie = r.op === "V" ? [[r.x, S[0]], [r.x, S[S.length - 1]]] : [[S[0], r.y], [S[S.length - 1], r.y]];
    return { kinder: [a, b], linie };
  }
  /** Slicing Tree eines Blocks: Block so drehen, dass die lange Seite seines kleinsten umschließenden Rechtecks waagrecht liegt,
      dann rekursiv teilen (Tiefe höchstens q.maxEbene, Voreinstellung 40). q wie sliceRegel, Voreinstellungen teilung 0,5,
      skalierung 1, minAbstand 1, variante "stx".
      → Knotenliste in Tiefensuche {id, poly (Weltkoordinaten), ebene, eltern, kinder: [id, id] | null, op, linie, ruecken} */
  function sliceBaum(block, param) {
    const q = Object.assign({ teilung: 0.5, skalierung: 1, minAbstand: 1, maxEbene: 40, variante: "stx" }, param);
    const c = Geo.schwerpunkt(block), w = rechteckWinkel(block);
    const wurzelPoly = block.map(x => dreh(x, c, w)), wurzel = kantenVon(wurzelPoly), K = [];
    const zurueck = P => P.map(x => dreh(x, c, -w));
    (function teileRek(poly, ebene, eltern) {
      const kn = { id: K.length, poly: zurueck(poly), ebene, eltern, kinder: null, op: null, linie: null, ruecken: false };
      K.push(kn);
      const r = ebene < q.maxEbene ? sliceRegel(poly, wurzel, q) : null, s = r && sliceTeile(poly, r);
      if (s) {
        kn.op = r.op; kn.linie = zurueck(s.linie); kn.ruecken = r.ruecken;
        kn.kinder = s.kinder.map(x => teileRek(x, ebene + 1, kn.id));
      }
      return kn.id;
    })(wurzelPoly, 0, -1);
    return K;
  }
  /** Blätter (Parzellen) einer Knotenliste in Baumreihenfolge */
  const sliceBlaetter = K => K.filter(k => !k.kinder);

  return { INTERN, ART, netzNeu, knotenNeu, kanteNeu, gegenueber, grad, nachbarn, verbunden, amRand, kanteTeilen, naechsterKnoten, naechsteKante,
           ersterSchnitt, knotenAnStrecke, fuegeStreckeEin, grundnetz, imAussenrand, arm, richtung, armRichtung, gene, baum,
           wachstumBeginn, wachstumEbene, segmenteVon, wachse,
           WINKEL_TOL, dreh, rechteckWinkel, kantenVon, winkelDiff, istStrasse, teileKanten, senkrecht, beruehren, parallelAbstand,
           sliceRegel, sliceTeile, sliceBaum, sliceBlaetter };
});
