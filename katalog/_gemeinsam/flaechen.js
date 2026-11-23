/* Parametric Planning Catalogue · Flächen aus Linien und Polygonoperationen (ohne DOM, in Node testbar)
   Bausteine, die vorher in mehreren Apps als Kopie standen (Runde 3, 23.11.2026):
   – Strecken an Schnitten teilen und offene Enden verlängern („Network to Segments“, Split; aus strassen-zu-parzellen, parzellen-versatz, stadtsynthese)
   – geschlossene Flächen eines Liniennetzes („Polygons from lines“; aus strassen-zu-parzellen, parzellen-versatz, stadtsynthese, gebaeude-generierung)
   – Kantenversatz je Kante („Custom offset“; aus parzellen-versatz, stadtsynthese, gebaeude-generierung)
   – einfache Polygone, Enthaltensein, Randabstand (aus gebaeude-generierung, stadtsynthese, parzellen-voronoi)
   – konvexe Polygonoperationen über Halbebenen: beschneiden, abziehen, schneiden (aus baublock-generator, stadtsynthese, gebaeude-generierung)
   Die Verfahren der DeCodingSpaces-Komponenten sind aus Beschreibung und rekonstruiertem Quelltext abgelesen
   (Bauhaus-InfAU/decoding-spaces-toolbox, GPL-3.0; kein Code übernommen). Sutherland–Hodgman nach Sutherland & Hodgman (1974),
   Reentrant polygon clipping, Communications of the ACM 17(1), https://doi.org/10.1145/360767.360802.
   Punkte [x, y], Polygone ohne doppelten Endpunkt, Netze in der Form von Geo.netz: {knoten: [[x, y]], kanten: [{a, b, l}]}.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const F = fabrik(node ? require("./geo.js") : wurzel.Geo);
  if (node) module.exports = F;
  else wurzel.Flaechen = F;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo) {
  "use strict";
  const { sub, add, mul, dot, kreuz, norm, abstand } = Geo;

  /* ---------------------------------------------------------------- Network to Segments */
  /** Strecken an allen Schnitt- und Berührpunkten teilen (Split = true): Kreuzungen und T-Stöße (Endpunkt auf einer anderen
      Strecke). Parallele Strecken schneiden sich nicht. → neue Streckenliste, Teile kürzer als 1e-6 entfallen */
  function teileAnSchnitten(S, eps = 1e-9) {
    const T = S.map(() => []), bb = S.map(s => [Math.min(s[0][0], s[1][0]), Math.min(s[0][1], s[1][1]), Math.max(s[0][0], s[1][0]), Math.max(s[0][1], s[1][1])]);
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const A = bb[i], C = bb[j];
      if (A[0] > C[2] + 1e-6 || C[0] > A[2] + 1e-6 || A[1] > C[3] + 1e-6 || C[1] > A[3] + 1e-6) continue;
      const a = S[i][0], r = sub(S[i][1], a), c = S[j][0], s = sub(S[j][1], c), den = kreuz(r, s);
      if (Math.abs(den) < 1e-12) continue;                                   // parallel: kein Schnittpunkt
      const w = sub(c, a), t = kreuz(w, s) / den, u = kreuz(w, r) / den;
      if (t < -eps || t > 1 + eps || u < -eps || u > 1 + eps) continue;
      if (t > eps && t < 1 - eps) T[i].push(t);
      if (u > eps && u < 1 - eps) T[j].push(u);
    }
    const out = [];
    S.forEach((s, i) => {
      const ts = [0].concat(T[i].sort((x, y) => x - y), [1]);
      for (let k = 0; k < ts.length - 1; k++) {
        const p = Geo.lerp(s[0], s[1], ts[k]), q = Geo.lerp(s[0], s[1], ts[k + 1]);
        if (abstand(p, q) > 1e-6) out.push([p, q]);
      }
    });
    return out;
  }
  /** offene Enden (Endpunkte, an denen keine andere Strecke anschließt; Knoten näher als exakt gelten als einer) um tol
      verlängern, damit knapp verfehlte Anschlüsse die Nachbarstraße noch treffen; Enden an Kreuzungen und Knicken bleiben */
  function verlaengere(S, tol, exakt = 0.01) {
    const N = Geo.netz(S, exakt), grad = new Int32Array(N.knoten.length);
    N.kanten.forEach(e => { grad[e.a]++; grad[e.b]++; });
    const offen = new Set(); N.knoten.forEach((q, v) => { if (grad[v] === 1) offen.add(Math.round(q[0] / exakt) + "," + Math.round(q[1] / exakt)); });
    const istOffen = q => offen.has(Math.round(q[0] / exakt) + "," + Math.round(q[1] / exakt));
    return S.map(s => {
      const d = norm(sub(s[1], s[0]));
      return [istOffen(s[0]) ? sub(s[0], mul(d, tol)) : s[0], istOffen(s[1]) ? add(s[1], mul(d, tol)) : s[1]];
    });
  }

  /* ---------------------------------------------------------------- Polygons from lines */
  /** Geschlossene Flächen eines ebenen Liniennetzes N = {knoten, kanten: [{a, b}]}: Sackgassen werden wiederholt abgeschnitten,
      dann läuft man über Halbkanten und biegt an jedem Knoten in die nächste Kante im Uhrzeigersinn ab (kleinster Zyklus links
      der Laufrichtung). Begrenzte Flächen haben positive Fläche (Geo.flaecheS), der Außenrand jedes Netzteils negative – er entfällt.
      Doppelt durchlaufene Brücken werden aus dem Zyklus genommen.
      → [{poly, kanten}] – kanten[i] = Netzkante unter poly[i] → poly[i+1] (Synchronized values) */
  function flaechenAusLinien(N, minFlaeche = 1e-6) {
    const n = N.knoten.length, m = N.kanten.length, adj = Geo.adjazenz(N), grad = new Int32Array(n), aktiv = new Uint8Array(m).fill(1);
    N.kanten.forEach(e => { grad[e.a]++; grad[e.b]++; });
    const stapel = []; for (let v = 0; v < n; v++) if (grad[v] === 1) stapel.push(v);
    while (stapel.length) {
      const v = stapel.pop(); if (grad[v] !== 1) continue;
      for (const { j, k } of adj[v]) if (aktiv[k]) { aktiv[k] = 0; grad[v]--; grad[j]--; if (grad[j] === 1) stapel.push(j); break; }
    }
    const rund = N.knoten.map((p, v) => adj[v].filter(x => aktiv[x.k]).map(x => ({ j: x.j, k: x.k, w: Math.atan2(N.knoten[x.j][1] - p[1], N.knoten[x.j][0] - p[0]) }))
      .sort((a, b) => a.w - b.w));
    const lage = rund.map(L => { const M = new Map(); L.forEach((x, i) => M.set(x.k, i)); return M; });
    const halb = (u, k) => 2 * k + (N.kanten[k].a === u ? 0 : 1), besucht = new Uint8Array(2 * m), out = [];
    for (let k0 = 0; k0 < m; k0++) {
      if (!aktiv[k0]) continue;
      for (const u0 of [N.kanten[k0].a, N.kanten[k0].b]) {
        if (besucht[halb(u0, k0)]) continue;
        const Z = []; let u = u0, k = k0, sicher = 0;
        do {
          besucht[halb(u, k)] = 1; Z.push({ v: u, k });
          const e = N.kanten[k], v = e.a === u ? e.b : e.a, L = rund[v], nx = L[(lage[v].get(k) - 1 + L.length) % L.length];
          u = v; k = nx.k;
        } while (halb(u, k) !== halb(u0, k0) && ++sicher <= 2 * m);
        // Brücken (Kante hin und gleich zurück) entfernen
        let weiter = true;
        while (weiter && Z.length > 2) {
          weiter = false;
          for (let i = 0; i < Z.length; i++) { const j = (i + 1) % Z.length; if (Z[i].k === Z[j].k) { Z.splice(Math.max(i, j), 1); Z.splice(Math.min(i, j), 1); weiter = true; break; } }
        }
        if (Z.length < 3) continue;
        const poly = Z.map(x => N.knoten[x.v]);
        if (Geo.flaecheS(poly) > minFlaeche) out.push({ poly, kanten: Z.map(x => x.k) });
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- Custom offset */
  /** Custom offset: jede Kante i des Polygons (positive Fläche) um d[i] parallel verschieben – d > 0 nach außen, d < 0 nach innen –
      und benachbarte Kanten schneiden. Laufen Nachbarkanten auseinander (Außenecke beim Vergrößern, Innenecke beim Verkleinern)
      und läge der Schnitt weiter als grenze × Versatz von der Ecke, wird die Ecke abgeschrägt; sind sie parallel (gerade Kante mit
      zwei Werten), entsteht eine Stufe. Kehrt eine versetzte Kante ihre Richtung um, ist sie verschwunden: sie fällt heraus und
      ihre Nachbarn werden neu geschnitten. → Polygon oder null (ganz verschwunden) */
  function versetzeKanten(poly, d, grenze = 4) {
    const n = poly.length;
    let E = [];
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n], t = norm(sub(b, a)), o = [t[1], -t[0]];
      E.push({ p: add(a, mul(o, d[i])), t, o, d: d[i], a, i });
    }
    const fuss = (q, e) => add(e.p, mul(e.t, dot(sub(q, e.p), e.t)));
    const ecke = (e1, e2) => {
      const q = e2.a, cr = kreuz(e1.t, e2.t), f1 = fuss(q, e1), f2 = fuss(q, e2);
      if (Math.abs(cr) < 1e-9) return abstand(f1, f2) < 1e-9 ? [f1] : [f1, f2];
      const s = kreuz(sub(e2.p, e1.p), e2.t) / cr, x = add(e1.p, mul(e1.t, s));
      const auseinander = dot(sub(x, f1), e1.t) > 1e-9;                        // Schnitt liegt hinter dem Fußpunkt: Kanten laufen auseinander
      if (auseinander && abstand(x, q) > grenze * Math.max(Math.abs(e1.d), Math.abs(e2.d), 1e-9)) return [f1, f2];
      return [x];
    };
    for (let runde = 0; runde <= n; runde++) {
      const m = E.length;
      if (m < 3) return null;
      const V = E.map((e, j) => ecke(E[(j + m - 1) % m], e));
      let schlimm = -1, wert = -1e-9;
      for (let j = 0; j < m; j++) {
        const von = V[j][V[j].length - 1], bis = V[(j + 1) % m][0], v = dot(sub(bis, von), E[j].t);
        if (v < wert) { wert = v; schlimm = j; }
      }
      if (schlimm < 0) {
        const P = [].concat(...V);
        return Geo.flaecheS(P) > 1e-6 ? P : null;
      }
      E.splice(schlimm, 1);
    }
    return null;
  }

  /* ---------------------------------------------------------------- Prüfungen */
  /** einfaches Polygon: keine zwei nicht benachbarten Kanten schneiden sich */
  function einfach(P) {
    const n = P.length;
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const s = Geo.segmentSchnitt(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n]);
      if (s && s.t > 1e-7 && s.t < 1 - 1e-7 && s.u > 1e-7 && s.u < 1 - 1e-7) return false;
    }
    return true;
  }
  /** liegt Q (bis auf tol) in P? (alle Ecken innen oder höchstens tol vom Rand) */
  function liegtIn(Q, P, tol = 0.05) {
    return Q.every(q => Geo.punktInPoly(q, P) || P.some((a, i) => Geo.abstandSegment(q, a, P[(i + 1) % P.length]).d <= tol));
  }
  /** kleinster Abstand eines Punktes vom Rand eines Polygons */
  function randAbstand(q, poly) {
    let d = Infinity;
    for (let i = 0; i < poly.length; i++) d = Math.min(d, Geo.abstandSegment(q, poly[i], poly[(i + 1) % poly.length]).d);
    return d;
  }

  /* ---------------------------------------------------------------- Konvexe Polygonoperationen über Halbebenen */
  /** Halbebene {x : (x − p) · n ≤ 0} (n zeigt nach außen) */
  const halbebene = (p, n) => ({ p, n });
  /** die Gegenseite einer Halbebene */
  const gegen = h => halbebene(h.p, [-h.n[0], -h.n[1]]);
  /** Halbebenen eines konvexen Polygons (Innenseite); das Polygon wird bei negativer Fläche umgedreht.
      normiert = true: Außennormale als Einheitsvektor, sonst die um 90° gedrehte Kante (gleiche Halbebene, andere Rundung) */
  function halbebenen(K, normiert = true) {
    const P = Geo.flaecheS(K) < 0 ? K.slice().reverse() : K;
    return P.map((a, i) => {
      const b = P[(i + 1) % P.length];
      if (normiert) { const e = norm(sub(b, a)); return halbebene(a, [e[1], -e[0]]); }
      const d = sub(b, a); return halbebene(a, [d[1], -d[0]]);
    });
  }
  /** Polygon P auf den Schnitt der Halbebenen H beschneiden (Sutherland–Hodgman, P darf konkav sein).
      min: kleinste Fläche des Ergebnisses (null = keine Prüfung). → Polygon oder [] */
  function clip(P, H, min = null) {
    for (const h of H) { if (P.length < 3) return []; P = Geo.schneideHalbebene(P, h.p, h.n); }
    return P.length >= 3 && (min == null || Geo.flaeche(P) > min) ? P : [];
  }
  /** P ohne den Schnitt der Halbebenen H → disjunkte Stücke P ∩ außen(h_i) ∩ innen(h_1 … h_{i−1}).
      min: kleinste Fläche eines Stücks; restMin: kleinste Fläche des Rests (darunter Abbruch; null = nur Eckenzahl) */
  function ohne(P, H, min = null, restMin = min) {
    const out = []; let rest = P;
    for (const h of H) {
      const a = clip(rest, [gegen(h)], min);
      if (a.length) out.push(a);
      rest = clip(rest, [h], restMin);
      if (!rest.length) break;
    }
    return out;
  }
  /** Schnitt A ∩ B für konvexes B */
  const schnitt = (A, B, min = null) => clip(A, halbebenen(B), min);

  return { teileAnSchnitten, verlaengere, flaechenAusLinien, versetzeKanten, einfach, liegtIn, randAbstand,
           halbebene, gegen, halbebenen, clip, ohne, schnitt };
});
