/* KREMLAS · Verschachtelte dichte Packung (Versuch 6, 28.11.2026; Idee Reinhard König): erst Raumgruppen in der umgebenden Form packen,
   dann in jeder Gruppenfläche die Räume der Gruppe. Beide Ebenen rechnet KREMLAS selbst (modell.js, sucheNeu/sucheWeiter) – anders als die
   Grammatik (grammatik.js), deren Zonen aus Regeln kommen, findet hier die dichte Packung die Lage der Gruppen.
   Allgemein für jede Bauaufgabe: keine Raumnamen, nur das Programm (Flächen, Mindestbreiten, Nachbarschaften, Eigenschaften opt.fassade,
   opt.aussen, opt.fest, opt.erschliessung, Symmetrie, Vorbild).
   Ablauf (loese):
   1. gruppierungen(): Gruppen aus dem Nachbarschaftsgraphen (gierige Zusammenfassung stark verbundener Räume, Zielgröße 3–5 Räume) oder aus
      Eigenschaften (bediente Räume mit Fassadenbedarf, dienende, Erschließung; je Klasse wieder nach dem Graphen geteilt); die Erschließung
      wahlweise als eigene Gruppe; mit Spiegelachse paarweise gespiegelte Gruppen und Achsgruppen; feste Räume bleiben einzeln und fest.
   2. gruppenprogramm(): Gruppen als Räume eines KREMLAS-Programms (Fläche = Summe der Räume mit Wand, Mindestbreite = größte der Gruppe,
      Nachbarschaft, wenn ein Raumpaar die Gruppen verbindet, Fassadenbedarf, Feld wie das Original) → obere Packung.
   3. zonen() und teilprogramm(): jede Gruppenfläche des oberen Plans wird ein Teilfeld (Umriss = Feld ∩ Gruppenrechteck mit den
      Fassadenkanten des Felds); Nachbarschaften über die Gruppengrenze werden Anschlüsse: Vorräume außen an der gemeinsamen Kante mit der
      Nachbargruppe (feld.anschluesse, Nachbarn −2, −3, … im Modell), der Eingang bleibt der Vorraum vor der Tür.
   4. Die Lösungen der Teilfelder werden zusammengesetzt (Grammatik.zusammensetzen) und am ganzen Programm geprüft; scheitert eine Gruppe,
      sucht die obere Ebene die nächste Lage (Rückkopplung); optional kurze Verfeinerung des Gesamtplans (dichte Packung des ganzen Programms,
      die Hälfte der Eltern startet im zusammengesetzten Plan).
   Ohne DOM, ohne Math.random: Zufall nur über die übergebene Fabrik (gleiche Saat → gleiche Folge von Läufen; die Zeitscheiben folgen der
   Uhr wie in der Lösungssuche der App). Quellen: D. Donath, R. König, F. Petzold (Hrsg.) (2012): KREMLAS, Weimar,
   urn:nbn:de:gbv:wim2-20120509-16504; Zusammenfassen nach Verbundenheit ähnlich M. E. J. Newman (2004), Fast algorithm for detecting
   community structure in networks, Phys. Rev. E 69, 066133, doi:10.1103/PhysRevE.69.066133.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 28.11.2026 · CC BY 4.0 */
(function (wurzel, fabrik) {
  if (typeof module === "object" && module.exports) module.exports = fabrik(require("./grammatik.js"));
  else wurzel.Verschachtelt = fabrik(wurzel.Grammatik);
})(typeof globalThis !== "undefined" ? globalThis : this, function (G) {
  "use strict";

  const feldUmriss = F => F.umriss || [[0, 0], [F.b, 0], [F.b, F.h], [0, F.h]];
  function aufStrecken(a, b, L, tol) {
    let s = 0; const lab = Math.hypot(b[0] - a[0], b[1] - a[1]); if (lab < 1e-9) return 0;
    const ux = (b[0] - a[0]) / lab, uy = (b[1] - a[1]) / lab;
    for (const [c, d] of L) {
      const ab = p => Math.abs((p[0] - a[0]) * uy - (p[1] - a[1]) * ux);
      if (ab(c) > tol || ab(d) > tol) continue;
      const t1 = (c[0] - a[0]) * ux + (c[1] - a[1]) * uy, t2 = (d[0] - a[0]) * ux + (d[1] - a[1]) * uy;
      s += Math.max(0, Math.min(lab, Math.max(t1, t2)) - Math.max(0, Math.min(t1, t2)));
    }
    return s;
  }
  const fassadenStrecken = F => { const U = feldUmriss(F); if (!F.umriss) return [];
    return U.map((p, i) => [p, U[(i + 1) % U.length], (F.kanten || [])[i]]).filter(q => q[2] === "fassade").map(q => [q[0], q[1]]); };

  /* ---------------------------------------------------------------- 1. Gruppen */
  /** Gierige Zusammenfassung: K Knoten, W(a, b) Gewicht, groesse(k) Räume je Knoten, ziel Räume je Gruppe, gesperrt(k) bleibt allein.
      Zusammengefasst wird das Paar mit dem größten Gewicht je √(Größe · Größe), solange die Gruppe höchstens 1,5 · ziel Räume hat;
      unverbundene Gruppen nur, wenn keine verbundenen mehr übrig sind. */
  function clustern(K, W, groesse, ziel, gesperrt) {
    let C = K.map(k => [k]);
    const sz = c => c.reduce((s, k) => s + groesse(k), 0), gesamt = sz(K);
    const nZiel = Math.max(1, Math.round(gesamt / ziel)), maxG = Math.ceil(1.5 * ziel);
    const w = (A, B) => { let s = 0; for (const a of A) for (const b of B) s += W(a, b); return s; };
    while (C.length > nZiel) {
      let best = null;
      for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) {
        if (C[i].some(gesperrt) || C[j].some(gesperrt)) continue;
        const s = sz(C[i]) + sz(C[j]); if (s > maxG) continue;
        const g = w(C[i], C[j]), wert = g > 0 ? g / Math.sqrt(sz(C[i]) * sz(C[j])) - 0.001 * s : -1 - 0.01 * s;
        if (!best || wert > best[0] + 1e-12) best = [wert, i, j];
      }
      if (!best) break;
      const [, i, j] = best; C[i] = C[i].concat(C[j]); C.splice(j, 1);
    }
    return C;
  }

  /** Gruppierungen eines Programms, verschiedene Verfahren; Ergebnis [{verfahren, ziel, erschliessung, gruppen: [{raeume, fest, achse,
      spiegelVon}]}] (spiegelVon: Index der Gruppe, deren Spiegelbild diese ist). */
  function gruppierungen(prog, o) {
    o = Object.assign({ verfahren: ["graph", "eigenschaft"], groessen: [4, 3, 5], erschliessung: ["mit", "eigen"] }, o);
    const E = G.eigenschaften(prog), S = prog.symmetrie, partner = new Map(), achse = new Set(S ? S.achse : []);
    if (S) for (const [a, b] of S.paare) { partner.set(a, b); partner.set(b, a); }
    const rep = k => (partner.has(k) && partner.get(k) < k ? partner.get(k) : k);   // Vertreter eines Spiegelpaars: kleinere Nummer
    const frei = E.filter(e => !e.fest).map(e => e.k), K = [...new Set(frei.map(rep))];
    const groesse = k => (partner.has(k) ? 2 : 1);
    const Wm = new Map(), key = (a, b) => (a < b ? a + "," + b : b + "," + a);
    for (const [a, b] of prog.paare) {
      if (a < 0 || b < 0 || E[a].fest || E[b].fest) continue;
      const ra = rep(a), rb = rep(b); if (ra === rb) continue;
      Wm.set(key(ra, rb), (Wm.get(key(ra, rb)) || 0) + 1);
    }
    const W = (a, b) => Wm.get(key(a, b)) || 0;
    const klasse = (k, er) => { const e = E[k]; return e.erschliessung ? (er === "eigen" ? "e" : "d") : e.fassade || e.aussen ? "f" : "d"; };
    const aus = [], gesehen = new Set();
    for (const verfahren of o.verfahren) for (const ziel of o.groessen) for (const er of o.erschliessung) {
      const gesperrt = k => er === "eigen" && E[k].erschliessung;
      let C;
      if (verfahren === "graph") C = clustern(K, W, groesse, ziel, gesperrt);
      else {
        C = [];
        for (const kl of ["e", "f", "d"]) { const Kk = K.filter(k => klasse(k, er) === kl); if (Kk.length) C = C.concat(clustern(Kk, W, groesse, ziel, gesperrt)); }
      }
      const gruppen = [];
      for (const c of C) {
        const mitAchse = c.some(k => achse.has(k) || !partner.has(k));
        if (!S || mitAchse) gruppen.push({ raeume: S ? c.concat(c.filter(k => partner.has(k)).map(k => partner.get(k))) : c.slice(), achse: !!S });
        else { const i = gruppen.length; gruppen.push({ raeume: c.slice() }, { raeume: c.map(k => partner.get(k)), spiegelVon: i }); }
      }
      for (const e of E) if (e.fest) gruppen.push({ raeume: [e.k], fest: true });
      for (const g of gruppen) g.raeume.sort((a, b) => a - b);
      const sig = gruppen.map(g => g.raeume.join(".")).sort().join("|");
      if (gesehen.has(sig)) continue; gesehen.add(sig);
      if (gruppen.filter(g => !g.fest).length < 2) continue;              // eine Gruppe allein ist keine Verschachtelung
      aus.push({ verfahren, ziel, erschliessung: er, gruppen, rang: o.groessen.indexOf(ziel) * 4 + o.erschliessung.indexOf(er) * 2 + o.verfahren.indexOf(verfahren) });
    }
    return aus.sort((a, b) => a.rang - b.rang);                           // Verfahren abwechselnd: Zielgröße, Erschließung, Verfahren
  }

  /* ---------------------------------------------------------------- 2. Programm der Gruppen (obere Ebene) */
  function gruppenprogramm(prog, grp) {
    const E = G.eigenschaften(prog), F = prog.feld, wand = F.wand || 0, gi = new Map();
    grp.gruppen.forEach((g, i) => g.raeume.forEach(k => gi.set(k, i)));
    const raeume = grp.gruppen.map((g, i) => {
      if (g.fest) return prog.raeume[g.raeume[0]].slice();
      const brutto = g.raeume.reduce((s, k) => s + (Math.sqrt(prog.raeume[k][2]) + wand) ** 2, 0);   // Räume mit halber Wand ringsum
      const A = wand ? (Math.sqrt(brutto) - wand) ** 2 : brutto;          // das Modell legt um die Gruppe wieder die halbe Wand
      const opt = g.raeume.some(k => E[k].fassade || E[k].aussen) ? { fassade: true } : null;
      return ["Gruppe " + (i + 1), "Group " + (i + 1), +A.toFixed(3), +Math.max(0, ...g.raeume.map(k => prog.raeume[k][3] || 0)).toFixed(3), opt];
    });
    const paare = new Set();
    for (const [a, b] of prog.paare) {
      const ga = a < 0 ? -1 : gi.get(a), gb = b < 0 ? -1 : gi.get(b);
      if (ga == null || gb == null || ga === gb) continue;
      if (ga < 0 || gb < 0) paare.add(Math.max(ga, gb) + ",-1"); else paare.add(Math.min(ga, gb) + "," + Math.max(ga, gb));
    }
    const P = { titel: (prog.titel || "") + " · Gruppen", feld: Object.assign({}, F), raeume, paare: [...paare].map(s => s.split(",").map(Number)) };
    if (prog.vorbild) P.vorbild = grp.gruppen.map(g => {
      if (g.fest) return prog.vorbild[g.raeume[0]];
      const R = g.raeume.flatMap(k => prog.vorbild[k] || []);
      return [[Math.min(...R.map(q => q[0])), Math.min(...R.map(q => q[1])), Math.max(...R.map(q => q[2])), Math.max(...R.map(q => q[3]))]];
    });
    if (grp.gruppen.some(g => g.achse || g.spiegelVon != null))
      P.symmetrie = { achse: grp.gruppen.map((g, i) => (g.achse ? i : -1)).filter(i => i >= 0), paare: grp.gruppen.map((g, i) => (g.spiegelVon != null ? [g.spiegelVon, i] : null)).filter(Boolean) };
    return P;
  }

  /* ---------------------------------------------------------------- 3. Teilfelder */
  /** Zonen aus den Gruppenrechtecken des oberen Plans (rects[i] = [x0, y0, x1, y1] in m); Achsgruppen symmetrisch zur Feldmitte,
      gespiegelte Gruppen genau gespiegelt. Ergebnis wie Grammatik.zonierungen (band null), zonen[j].gi = Gruppe. */
  function zonen(prog, grp, rects) {
    const F = prog.feld, U = feldUmriss(F), FS = fassadenStrecken(F), B = F.b, zi = new Map(), Z = [];
    grp.gruppen.forEach((g, i) => {
      if (g.fest || !rects[i]) return;
      let r = rects[i];
      if (g.achse) { const x0 = Math.max(r[0], B - r[2]); r = [x0, r[1], B - x0, r[3]]; }
      if (g.spiegelVon != null && rects[g.spiegelVon]) { const s = rects[g.spiegelVon]; r = [B - s[2], s[1], B - s[0], s[3]]; }
      const P = G.klippe(U, r[0], r[1], r[2], r[3]); if (P.length < 3) return;
      let fl = 0; for (let k = 0; k < P.length; k++) fl += aufStrecken(P[k], P[(k + 1) % P.length], FS, 0.03);
      zi.set(i, Z.length);
      Z.push({ rect: r, poly: P, A: G.flaeche(P), fassade: fl, raeume: g.raeume.slice(), gi: i, achse: !!g.achse, spiegelGruppe: g.spiegelVon });
    });
    for (const z of Z) { z.spiegelVon = z.spiegelGruppe != null && zi.has(z.spiegelGruppe) ? zi.get(z.spiegelGruppe) : null; delete z.spiegelGruppe; }
    return { band: null, zonen: Z };
  }

  /** Streifen außen an der gemeinsamen Kante von A und B (Rechtecke [x0, y0, x1, y1]), Tiefe t; null, wenn kürzer als lmin */
  function streifen(A, B, tol, t, lmin) {
    const K = [];
    if (Math.abs(A[2] - B[0]) <= tol) K.push([A[2], Math.max(A[1], B[1]), A[2] + t, Math.min(A[3], B[3]), "y"]);
    if (Math.abs(B[2] - A[0]) <= tol) K.push([A[0] - t, Math.max(A[1], B[1]), A[0], Math.min(A[3], B[3]), "y"]);
    if (Math.abs(A[3] - B[1]) <= tol) K.push([Math.max(A[0], B[0]), A[3], Math.min(A[2], B[2]), A[3] + t, "x"]);
    if (Math.abs(B[3] - A[1]) <= tol) K.push([Math.max(A[0], B[0]), A[1] - t, Math.min(A[2], B[2]), A[1], "x"]);
    let best = null;
    for (const q of K) { const l = q[4] === "y" ? q[3] - q[1] : q[2] - q[0]; if (l >= lmin && (!best || l > best[0])) best = [l, q.slice(0, 4)]; }
    return best ? best[1] : null;
  }

  /** KREMLAS-Programm einer Zone: Feld = Umgebungsrechteck, Umriss = Feld ∩ Gruppe mit Fassadenkanten, Räume der Gruppe (Vorbild verschoben),
      Nachbarschaften in der Gruppe; über die Grenze: Anschluss je Nachbargruppe bzw. festem Raum (Vorraum außen an der gemeinsamen Kante,
      Nachbar −2 − j), Eingang als Vorraum vor der Tür (wenn er die Zone berührt) bzw. am Feldrand. Symmetrie der Achsgruppe lokal. */
  function teilprogramm(prog, zon, zj, o) {
    o = Object.assign({ tol: 0.15, tolGeloest: 0.4, tiefe: 0.6, lmin: 0.9, geloest: null }, o);
    const F = prog.feld, Z = zon.zonen[zj], [zx0, zy0, zx1, zy1] = Z.rect, FS = fassadenStrecken(F), P = Z.poly;
    const umriss = P.map(([x, y]) => [+(x - zx0).toFixed(3), +(y - zy0).toFixed(3)]);
    const kanten = P.map((p, i) => aufStrecken(p, P[(i + 1) % P.length], FS, 0.03) > 0.5 * Math.hypot(P[(i + 1) % P.length][0] - p[0], P[(i + 1) % P.length][1] - p[1]) ? "fassade" : "innen");
    const abbild = Z.raeume.slice(), idx = new Map(abbild.map((k, i) => [k, i]));
    const lokal = q => [+(q[0] - zx0).toFixed(3), +(q[1] - zy0).toFixed(3), +(q[2] - zx0).toFixed(3), +(q[3] - zy0).toFixed(3)];
    const raeume = abbild.map(k => prog.raeume[k].slice());
    const vorbild = abbild.map(k => (prog.vorbild && prog.vorbild[k] ? prog.vorbild[k] : [[zx0, zy0, zx0 + 1, zy0 + 1]]).map(lokal));
    const zoneVon = new Map(); zon.zonen.forEach((Q, i) => Q.raeume.forEach(k => zoneVon.set(k, i)));
    const paare = new Set(), anschluesse = [], aSchl = new Map(), fehlt = [];
    let eingang = null;
    const anschluss = (schl, rects, tol) => {
      if (aSchl.has(schl)) return aSchl.get(schl);
      let best = null;
      for (const R of rects) { const s = streifen(Z.rect, R, tol || o.tol, o.tiefe, o.lmin); if (s && (!best || Math.max(s[2] - s[0], s[3] - s[1]) > Math.max(best[2] - best[0], best[3] - best[1]))) best = s; }
      const j = best ? anschluesse.push(lokal(best)) - 1 : null; aSchl.set(schl, j); return j;
    };
    for (const [a, b] of prog.paare) {
      const ia = a >= 0 ? idx.get(a) : undefined, ib = b >= 0 ? idx.get(b) : undefined;
      if (ia != null && ib != null) { paare.add(ia < ib ? ia + "," + ib : ib + "," + ia); continue; }
      const x = ia != null ? ia : ib, y = ia != null ? b : a;
      if (x == null) continue;
      if (y < 0) {                                                          // Eingang
        if (F.eingang) {
          const e = F.eingang;
          if (streifen(Z.rect, e, o.tol, o.tiefe, o.lmin)) { eingang = lokal(e); paare.add(x + ",-1"); }
          else fehlt.push([abbild[x], -1]);
        } else {                                                            // ohne Vorraum: Anschluss am Feldrand (längste Kante der Zone dort)
          const rand = [[-1, zy0, 0, zy1], [F.b, zy0, F.b + 1, zy1], [zx0, -1, zx1, 0], [zx0, F.h, zx1, F.h + 1]];
          const j = anschluss("rand", rand.filter(R => streifen(Z.rect, R, 0.05, o.tiefe, o.lmin)));
          if (j != null) paare.add(x + "," + (-2 - j)); else fehlt.push([abbild[x], -1]);
        }
        continue;
      }
      const zy = zoneVon.get(y), E = G.eigenschaften(prog)[y];
      // Nachbargruppe schon gepackt: Anschluss genau dort, wo der Nachbarraum an der gemeinsamen Grenze liegt (der Reihe nach)
      let j = zy != null && o.geloest && o.geloest.has(y) ? anschluss("r" + y, o.geloest.get(y), o.tolGeloest) : null;
      if (j == null) {
        const rects = zy != null ? [zon.zonen[zy].rect] : E && E.fest && prog.vorbild && prog.vorbild[y] ? prog.vorbild[y] : [];
        j = anschluss(zy != null ? "z" + zy : "f" + y, rects);
      }
      if (j != null) paare.add(x + "," + (-2 - j)); else fehlt.push([abbild[x], y]);
    }
    const feld = Object.assign({}, F, { b: +(zx1 - zx0).toFixed(3), h: +(zy1 - zy0).toFixed(3), umriss, kanten });
    if (eingang) feld.eingang = eingang; else delete feld.eingang;
    if (anschluesse.length) feld.anschluesse = anschluesse; else delete feld.anschluesse;
    const T = { titel: (prog.titel || "") + " · Gruppe " + Z.gi, feld, raeume, paare: [...paare].map(s => s.split(",").map(Number)), vorbild };
    if (Z.achse && prog.symmetrie) {                                        // Achsgruppe: Symmetrie innerhalb der Gruppe
      const S = prog.symmetrie;
      T.symmetrie = { achse: S.achse.filter(k => idx.has(k)).map(k => idx.get(k)), paare: S.paare.filter(([p, q]) => idx.has(p) && idx.has(q)).map(([p, q]) => [idx.get(p), idx.get(q)]) };
    }
    return { prog: T, abbild, ursprung: [zx0, zy0], fehlt };
  }

  /* ---------------------------------------------------------------- 4. Lösen */
  /** Verschachtelte Suche für Fassung f im Zeitbudget. o: {budget (ms), param(fassung, extra) → Parameter, zufall (Fabrik), saat, naehe,
      funktion, ziel (Treffer), verfeinern (s, 0 = aus), verfeinernAuchGueltig, verfahren, gruppierungen (Liste statt eigener)}.
      Ergebnis {treffer: [{ind, plan, gruppen, gplan, quelle}], bestInd, tErster, tErsterDirekt, stat} */
  function loese(M, f, o) {
    o = Object.assign({ budget: 60000, saat: 1, ziel: 3, verfeinern: 20, verfeinernAuchGueltig: false, naehe: 0 }, o);
    const progKey = M.FASSUNGEN[f].programm || f, prog = M.PROGRAMME[progKey], t0 = Date.now(), rest = () => o.budget - (Date.now() - t0);
    const pF = o.param(f), zuf = o.zufall, k = () => M.PX_M;
    const grps = o.gruppierungen || gruppierungen(prog, o.verfahren ? { verfahren: o.verfahren } : {});
    const stat = { gruppierungen: grps.length, oben: 0, oben_gueltig: 0, zonen: 0, zonen_gueltig: 0, alle_zonen_gueltig: 0, rueck: 0, direkt: 0, verfeinert: 0, verfeinert_gueltig: 0, fehlt_anschluss: 0, verfahren: {} };
    const reglerF = {}; for (const r of M.REGLER) if (M.FASSUNGEN[f][r] != null) reglerF[r] = M.FASSUNGEN[f][r];
    const treffer = []; let bestInd = null, bestF3 = Infinity, tErster = null, tErsterDirekt = null, runde = 0, lnr = 0;
    const Zs = grps.map(() => null);
    const kopieEltern = (S, b) => { if (S.lauf && S.lauf.z) for (const e of S.lauf.z.eltern) if (e.f3 != null && e.f3 < b.f3) { b.f3 = e.f3; b.ind = M.kopie(e); } };
    if (!grps.length) {                                                     // zu wenige freie Räume für zwei Gruppen: eine Ebene (KREMLAS allein)
      stat.eine_ebene = 1;
      const S = M.sucheNeu(pF, zuf, { anzahl: 1, ziel: o.ziel, saat: o.saat, laeufe: 100000, generationen: 400 }), b0 = { f3: Infinity, ind: null };
      while (!S.fertig && rest() > 0) { M.sucheWeiter(S, 25); kopieEltern(S, b0); if (tErster == null && S.treffer.length) tErster = (Date.now() - t0) / 1000; }
      M.erzeuge(pF, zuf(1));
      return { treffer: S.treffer.map(t => ({ ind: t.ind, plan: M.grundriss(t.ind, 300, M.TEILE_PX), gruppierung: -1, verfahren: "eine Ebene", quelle: "eine Ebene", gplan: [] })),
               bestInd: b0.ind, tErster, tErsterDirekt: null, stat, runden: S.laeufe };
    }
    while (grps.length && rest() > 0 && treffer.length < o.ziel) {
      const gi = runde % grps.length, grp = grps[gi]; runde++;
      let Z = Zs[gi];
      if (!Z) {
        const key = progKey + "~v6~" + o.saat + "~" + gi, gp = gruppenprogramm(prog, grp);
        M.registriere({ programme: { [key]: gp }, fassungen: { [key]: Object.assign({ programm: key }, reglerF, { starr: false, lform: 0 }) } });
        Z = Zs[gi] = { key, gp, S: null, benutzt: 0, neustart: 0, ohne: 0 };
      }
      // obere Packung: nächste Lage der Gruppen
      const pO = o.param(Z.key, { naehe: o.naehe, starr: false, lform: 0, dreh90: false });
      if (!Z.S || (Z.S.fertig && Z.benutzt >= Z.S.treffer.length)) { Z.S = M.sucheNeu(pO, zuf, { anzahl: 1, ziel: 4, saat: 1 + 7919 * Z.neustart + 31 * o.saat, laeufe: 100000, generationen: 300 }); Z.neustart++; Z.benutzt = 0; }
      const tO = Date.now(), bO = Math.min(rest(), 6000 + 1500 * Z.gp.raeume.length), b = { f3: Infinity, ind: null };
      while (!Z.S.fertig && Z.S.treffer.length <= Z.benutzt && Date.now() - tO < bO) { M.sucheWeiter(Z.S, 25); kopieEltern(Z.S, b); }
      stat.oben++;
      let oben = null;
      if (Z.S.treffer.length > Z.benutzt) { oben = Z.S.treffer[Z.benutzt++].ind; stat.oben_gueltig++; Z.ohne = 0; }
      else {                                                                // obere Ebene ohne gültige Lage: erst andere Gruppierungen versuchen,
        oben = b.ind; Z.ohne++; stat.oben_ohne = (stat.oben_ohne || 0) + 1;   // mit der besten (ungültigen) Lage weiter (Messung: Überspringen
        if (o.obenStreng && Z.ohne < 2 && grps.length > 1) continue;       // kostet bei großen Wohnungen das ganze Budget)
      }
      if (!oben) continue;
      M.erzeuge(pO, zuf(1));                                                // Feld der oberen Ebene
      const rects = [];
      for (const q of M.grundriss(oben, 300, M.TEILE_PX)) if (!q.zusatz && q.id === q.r) rects[q.r] = [q.x1 / k(), q.y1 / k(), q.x2 / k(), q.y2 / k()];
      const zon = zonen(prog, grp, rects), teile = [];
      // untere Packung je Gruppe
      let alleGueltig = true;
      const nZ = zon.zonen.length, geloest = new Map(), partner = new Map();
      if (prog.symmetrie) for (const [a, b2] of prog.symmetrie.paare) { partner.set(a, b2); partner.set(b2, a); }
      for (let j = 0; j < nZ; j++) teile.push(null);
      // Reihenfolge: Gruppen mit den meisten Nachbarschaften über die Grenze zuerst, die übrigen passen ihre Anschlüsse an die gepackten an
      const grenz = zon.zonen.map(Q => prog.paare.filter(([a, b2]) => (Q.raeume.includes(a) !== Q.raeume.includes(b2))).length);
      const reihe = zon.zonen.map((Q, j) => j).filter(j => zon.zonen[j].spiegelVon == null).sort((a, b2) => grenz[b2] - grenz[a] || a - b2);
      for (const j of reihe) {
        if (rest() <= 0) { alleGueltig = false; continue; }
        const tp = teilprogramm(prog, zon, j, { geloest }), key2 = Z.key + "~" + (lnr++) + "~" + j;
        stat.fehlt_anschluss += tp.fehlt.length;
        M.registriere({ programme: { [key2]: tp.prog }, fassungen: { [key2]: Object.assign({ programm: key2 }, reglerF) } });
        const sp = o.param(key2, { naehe: o.naehe, dreh90: false });
        const S = M.sucheNeu(sp, zuf, { anzahl: 1, ziel: 1, saat: 1 + 997 * runde + 7 * o.saat + j, laeufe: 100000, generationen: 300 });
        const tz = Date.now(), zb = Math.min(rest(), 2000 + 1200 * tp.prog.raeume.length), bz = { f3: Infinity, ind: null };
        while (!S.fertig && Date.now() - tz < zb) { M.sucheWeiter(S, 25); kopieEltern(S, bz); }
        stat.zonen++;
        const ind = S.treffer.length ? S.treffer[0].ind : bz.ind;
        if (S.treffer.length) stat.zonen_gueltig++;
        else {
          alleGueltig = false;
          if (bz.ind) {                                                     // woran die Gruppe scheitert
            M.setzeFeld(tp.prog.feld); const w0 = M.planPruefung(bz.ind, tp.prog.paare, key2), g = stat.zgrund || (stat.zgrund = { tueren: 0, breite: 0, flaeche: 0, ue: 0, sonst: 0 });
            if (w0.fehlt) g.tueren++; else if (w0.breite >= 0.01) g.breite++; else if (w0.flaeche >= 0.01) g.flaeche++; else if (w0.ue >= 0.05) g.ue++; else g.sonst++;
            const fl = tp.prog.raeume.reduce((q, r) => q + r[2], 0), A = Z.gp && zon.zonen[j].A;   // Füllgrad: Programmfläche / Zonenfläche
            (stat.zfuell || (stat.zfuell = [])).push(+(fl / A).toFixed(2));
          }
        }
        if (!ind) continue;
        M.setzeFeld(tp.prog.feld);
        // Rechtecke des abgeleiteten Plans (im Teilfeld beschnitten und gewachsen), je Gen eines; Teile und Anker wie im Erbgut
        const gen = new Map(ind.g.map(g => [g.id, g]));
        const T = teile[j] = { abbild: tp.abbild, ursprung: tp.ursprung, rechtecke: M.grundriss(ind, 300, M.TEILE_PX).filter(q => !q.zusatz && gen.has(q.id)).map(q => {
          const g = gen.get(q.id); return { r: g.r, id: g.id, an: g.an, bd: g.bd, x1: q.x1 / k(), y1: q.y1 / k(), x2: q.x2 / k(), y2: q.y2 / k() }; }) };
        for (const q of T.rechtecke) {                                      // Lage der Räume (Feld des Ganzen) für die Anschlüsse der übrigen
          if (q.r >= T.abbild.length) continue;
          const r = T.abbild[q.r], R = [q.x1 + T.ursprung[0], q.y1 + T.ursprung[1], q.x2 + T.ursprung[0], q.y2 + T.ursprung[1]];
          (geloest.get(r) || geloest.set(r, []).get(r)).push(R);
          if (zon.zonen.some(Q => Q.spiegelVon === j) && partner.has(r)) { const B = prog.feld.b, p2 = partner.get(r); (geloest.get(p2) || geloest.set(p2, []).get(p2)).push([B - R[2], R[1], B - R[0], R[3]]); }
        }
      }
      if (alleGueltig) stat.alle_zonen_gueltig++;
      if (prog.symmetrie) G.spiegleTeile(prog, zon, teile);
      const zF = M.erzeuge(pF, zuf(1));                                     // ganzes Programm: Feld, feste Räume, Symmetrie
      let I = G.zusammensetzen(M, prog, zon, teile); M.fixiere(I, zF.fest);
      if (zF.sym) M.symmetrisiere(I, zF.sym, -1);
      let w = M.planPruefung(I, prog.paare, progKey), quelle = "direkt";
      const roh = o.diagnose ? { ind: M.kopie(I), wert: w } : null;
      if (!w.gueltig) { const r = M.flaecheAusgleichen(I, prog.paare, progKey, 25); if (r.wert.f3 < w.f3) { I = r.ind; w = r.wert; } }
      if (!w.gueltig && rest() > 0) { const r = M.nachbessern(I, prog.paare, progKey, zuf(runde), 150, zF.sym, zF.fest, zF.starr); if (r.wert.f3 < w.f3) { I = r.ind; w = r.wert; } }
      if (w.gueltig) { stat.direkt++; if (tErsterDirekt == null) tErsterDirekt = (Date.now() - t0) / 1000; }
      else {
        stat.rueck++;
        if (alleGueltig && o.diagnose) o.diagnose({ ind: I, wert: w, zon, teile, progKey, roh });
        if (alleGueltig) {                                                  // alle Gruppen gültig, Gesamtplan nicht: woran es liegt
          const g = stat.grund || (stat.grund = { tueren: 0, breite: 0, flaeche: 0, ue: 0, sonst: 0 });
          if (w.fehlt) g.tueren++; else if (w.breite >= 0.01) g.breite++; else if (w.flaeche >= 0.01) g.flaeche++; else if (w.ue >= 0.05) g.ue++; else g.sonst++;
        }
      }
      if (o.verfeinern > 0 && rest() > 0 && (!w.gueltig || o.verfeinernAuchGueltig)) {
        const fall = [];
        for (const g of I.g.slice().sort((a, b) => (b.id === b.r) - (a.id === a.r))) { const q = M.rechteck(g); (fall[g.r] = fall[g.r] || []).push([q.x1 / k(), q.y1 / k(), q.x2 / k(), q.y2 / k()]); }
        const S2 = M.sucheNeu(Object.assign({}, pF, { impfung: { faelle: [fall], anteil: 0.5, streuung: 0.1 } }), zuf, { anzahl: 1, ziel: 1, saat: 5000 + runde + 100 * o.saat, laeufe: 100000, generationen: 300 });
        const tv = Date.now(), vb = Math.min(rest(), o.verfeinern * 1000), bv = { f3: w.gueltig ? -Infinity : w.f3, ind: null };
        while (!S2.fertig && Date.now() - tv < vb) { M.sucheWeiter(S2, 25); if (!w.gueltig) kopieEltern(S2, bv); }
        stat.verfeinert++;
        M.erzeuge(pF, zuf(1));
        if (S2.treffer.length) {
          stat.verfeinert_gueltig++;
          const J = S2.treffer[0].ind, aeh = X => { const a = prog.vorbild ? M.aehnlichkeit(X, progKey) : null; return a ? a.mittel : 0; };
          if (!w.gueltig || aeh(J) > aeh(I)) { I = J; w = M.planPruefung(I, prog.paare, progKey); quelle = "verfeinert"; }
        } else if (!w.gueltig && bv.ind) { I = bv.ind; w = M.planPruefung(I, prog.paare, progKey); }
      }
      if (w.gueltig) {
        const plan = M.grundriss(I, 300, M.TEILE_PX);
        if (!treffer.some(t => M.planAbstand(t.plan, plan) < 0.3)) {
          treffer.push({ ind: I, plan, gruppierung: gi, verfahren: grp.verfahren + "/" + grp.ziel + "/" + grp.erschliessung, quelle,
            gplan: zon.zonen.map(z => ({ gi: z.gi, rect: z.rect.map(v => +v.toFixed(3)), raeume: z.raeume })) });
          const v = grp.verfahren + "/" + grp.erschliessung; stat.verfahren[v] = (stat.verfahren[v] || 0) + 1;
        }
        if (tErster == null) tErster = (Date.now() - t0) / 1000;
      } else if (w.f3 < bestF3) { bestF3 = w.f3; bestInd = I; }
    }
    M.erzeuge(pF, zuf(1));
    return { treffer, bestInd, tErster, tErsterDirekt, stat, runden: runde };
  }

  return { gruppierungen, clustern, gruppenprogramm, zonen, teilprogramm, streifen, loese };
});
