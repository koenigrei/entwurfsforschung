/* KREMLAS · Grammatik (Versuch 4, 27.11.2026): Regeln über Raumeigenschaften, kombiniert mit der dichten Packung.
   Allgemein für jede Bauaufgabe: Die Regeln kennen keine Raumnamen und keine Wohnungsregeln, nur Eigenschaften aus dem Programm –
   opt.fassade (braucht Fassade bzw. Tageslicht), opt.aussen (Außenraum), opt.fest (fester Raum), opt.erschliessung (erschließt andere
   Räume; fehlt die Angabe, gilt der Raum mit den meisten Nachbarschaften am Eingang, wenn er mindestens drei hat), dienend (alles übrige),
   dazu Fläche, Mindestbreite, Grad im Nachbarschaftsgraphen und der Eingang (Nachbar −1). Was für eine Bauaufgabe gilt (bei Wohnungen
   z. B. Zimmer brauchen Fassade, Flure erschließen), steht in der Programmvorlage, nicht hier.
   Drei Arten der Kombination (Vorbild: J. P. Duarte 2005, diskursive Grammatik, doi:10.1068/b31124; Formgrammatik nach G. Stiny und
   W. J. Mitchell 1978, doi:10.1068/b050005):
   (1) hierarchisch: zonierungen() teilt Feld und Programm in Zonen (Rückgrat der Erschließung vom Eingang aus, Zonen beiderseits, dienende
       Räume innen, bediente an der Fassade), teilprogramm() macht aus jeder Zone ein eigenes KREMLAS-Programm, zusammensetzen() fügt die
       Lösungen zu einem Individuum des ganzen Programms.
   (2) erst Packung, dann Regeln: aufraeumen() verbessert einen fertigen Plan mit einer Regelfolge (Tür herstellen, Wände fluchten,
       Flurstück einziehen, an der Umrisskante abschneiden, Mindestmaß), angenommen wird jede Regelanwendung, die f3 senkt.
   (3) Regeln als Mutation: mutiere() – mit Modell.setzeGrammatik(Grammatik) eingehängt und mit dem Parameter grammatik > 0 je Kind
       mit dieser Wahrscheinlichkeit: Raum an die Fassade tauschen, Raum zum geforderten Nachbarn legen, Raum an der Erschließung spiegeln.
   Ohne DOM, ohne Abhängigkeiten, Zufall nur über die übergebene Funktion (gleiche Saat → gleiches Ergebnis).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 27.11.2026 · CC BY 4.0 */
(function (wurzel, fabrik) {
  const G = fabrik();
  if (typeof module === "object" && module.exports) module.exports = G;
  else wurzel.Grammatik = G;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ---------------------------------------------------------------- Eigenschaften der Räume */
  const CACHE = new WeakMap();
  /** Rollen je Raum aus dem Programm (siehe oben). Ergebnis: [{k, flaeche, mindest, fest, aussen, fassade, erschliessung, dienend, grad,
      nachbarn: Set, amEingang}] */
  function eigenschaften(prog) {
    const c = CACHE.get(prog); if (c) return c;
    const R = prog.raeume, grad = R.map(() => 0), nb = R.map(() => new Set()), eingang = new Set();
    for (const [a, b] of prog.paare) {
      if (b < 0 || a < 0) { const x = a < 0 ? b : a; eingang.add(x); grad[x]++; continue; }
      grad[a]++; grad[b]++; nb[a].add(b); nb[b].add(a);
    }
    const E = R.map((q, k) => { const o = q[4] || {};
      return { k, flaeche: q[2], mindest: q[3] || 0, fest: !!o.fest, aussen: !!o.aussen, fassade: !!o.fassade, erschliessung: !!o.erschliessung }; });
    if (!E.some(e => e.erschliessung)) {
      const kand = E.filter(e => !e.fest && !e.aussen && !e.fassade).sort((x, y) => (eingang.has(y.k) - eingang.has(x.k)) || grad[y.k] - grad[x.k] || y.flaeche - x.flaeche);
      if (kand.length && grad[kand[0].k] >= 3) kand[0].erschliessung = true;
    }
    for (const e of E) { e.grad = grad[e.k]; e.nachbarn = nb[e.k]; e.amEingang = eingang.has(e.k); e.dienend = !e.fest && !e.aussen && !e.fassade && !e.erschliessung; }
    CACHE.set(prog, E);
    return E;
  }

  /* ---------------------------------------------------------------- Geometrie in Metern (y nach unten wie im Modell) */
  function klippe(P, x1, y1, x2, y2) {                                  // Sutherland–Hodgman an einem Rechteck
    let out = P;
    const kanten = [[p => p[0] >= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
                    [p => p[0] <= x2, (a, b) => [x2, a[1] + (b[1] - a[1]) * (x2 - a[0]) / (b[0] - a[0])]],
                    [p => p[1] >= y1, (a, b) => [a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1]],
                    [p => p[1] <= y2, (a, b) => [a[0] + (b[0] - a[0]) * (y2 - a[1]) / (b[1] - a[1]), y2]]];
    for (const [innen, schnitt] of kanten) {
      const inp = out; out = [];
      for (let i = 0; i < inp.length; i++) {
        const a = inp[(i + inp.length - 1) % inp.length], b = inp[i];
        if (innen(b)) { if (!innen(a)) out.push(schnitt(a, b)); out.push(b); }
        else if (innen(a)) out.push(schnitt(a, b));
      }
      if (!out.length) break;
    }
    return out;
  }
  function flaeche(P) { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
  function innenPunkt(P, x, y) {                                        // Punkt im Vieleck (Strahlverfahren)
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  /** Länge, auf der die Strecke s = [a, b] auf einer der Strecken L liegt (kollinear bis tol m) */
  function aufStrecken(a, b, L, tol) {
    let s = 0; const lab = Math.hypot(b[0] - a[0], b[1] - a[1]); if (lab < 1e-9) return 0;
    const ux = (b[0] - a[0]) / lab, uy = (b[1] - a[1]) / lab;
    for (const [c, d] of L) {
      const ab = (p) => Math.abs((p[0] - a[0]) * uy - (p[1] - a[1]) * ux);  // Abstand zur Geraden durch a, b
      if (ab(c) > tol || ab(d) > tol) continue;
      const t1 = (c[0] - a[0]) * ux + (c[1] - a[1]) * uy, t2 = (d[0] - a[0]) * ux + (d[1] - a[1]) * uy;
      s += Math.max(0, Math.min(lab, Math.max(t1, t2)) - Math.max(0, Math.min(t1, t2)));
    }
    return s;
  }
  const gemeinsam = (A, B, tol = 0.02) => {                             // gemeinsame Kante zweier Rechtecke [x0, y0, x1, y1]
    if (Math.abs(A[2] - B[0]) <= tol || Math.abs(B[2] - A[0]) <= tol) return Math.max(0, Math.min(A[3], B[3]) - Math.max(A[1], B[1]));
    if (Math.abs(A[3] - B[1]) <= tol || Math.abs(B[3] - A[1]) <= tol) return Math.max(0, Math.min(A[2], B[2]) - Math.max(A[0], B[0]));
    return 0;
  };
  const feldUmriss = F => F.umriss || [[0, 0], [F.b, 0], [F.b, F.h], [0, F.h]];
  const fassadenStrecken = F => { const U = feldUmriss(F); if (!F.umriss) return [];
    return U.map((p, i) => [p, U[(i + 1) % U.length], (F.kanten || [])[i]]).filter(q => q[2] === "fassade").map(q => [q[0], q[1]]); };

  /* ---------------------------------------------------------------- (1) Zonierung */
  /** Seite des Eingangs-Vorraums, an der das Innere liegt: "oben" heißt, das Innere liegt oberhalb des Vorraums usw. */
  function eingangsSeite(F) {
    const U = feldUmriss(F);
    if (!F.eingang) return { x: F.b / 2, y: 0, innen: "unten", rand: 0 };
    const [x0, y0, x1, y1] = F.eingang, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const proben = [["oben", mx, y0 - 0.15, y0], ["unten", mx, y1 + 0.15, y1], ["links", x0 - 0.15, my, x0], ["rechts", x1 + 0.15, my, x1]];
    const p = proben.find(q => innenPunkt(U, q[1], q[2])) || proben[1];
    return { x: mx, y: my, innen: p[0], rand: p[3] };
  }
  const zuf0 = s => { let a = s >>> 0 || 1; const f = () => { a ^= a << 13; a >>>= 0; a ^= a >> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; }; f.ganz = n => Math.floor(f() * n); return f; };

  /** Zonierungen eines Programms (Regeln Z1–Z3), beste zuerst.
      Z1 Rückgrat: Die erschließenden Räume bilden ein Band der Breite (größte Mindestbreite + Wand), das am Eingang beginnt – quer in das
         Feld hinein ("quer") oder an der Eingangsseite entlang ("laengs"), mittig oder seitlich versetzt; Länge = Fläche / Breite.
         Z1b Mittelflur mit Stich ("T"): Hauptband parallel zur Eingangsseite in der Mitte (bzw. bei 40/60 % der Tiefe), Stich vom Vorraum.
      Z2 Zonen: Feld minus Band in bis zu vier Rechtecke; an Zonen mit dienenden und bedienten Räumen wird eine innere Zone für die dienenden
         Räume am Band abgeteilt (am Anfang oder Ende des Bands), die äußere bekommt dort einen Platzhalter.
      Z3 Zuordnung: feste Räume in ihre Zone, Räume mit Fassade bzw. Außenraum in Zonen mit Fassade, Nachbarn der Erschließung in Zonen am
         Band, sonst nach Nachbarschaften und Füllgrad (mehrere Saaten).
      Bewertung: Über- und Unterfüllung, geforderte Nachbarschaften zwischen nicht benachbarten Zonen, Räume mit Fassade ohne Fassade. */
  function zonierungen(prog, o) {
    o = Object.assign({ anzahl: 10, saaten: 6, saat: 1 }, o);
    const E = eigenschaften(prog), F = prog.feld, U = feldUmriss(F), FS = fassadenStrecken(F), wand = F.wand || 0;
    const ersch = E.filter(e => e.erschliessung), AE = ersch.reduce((s, e) => s + e.flaeche, 0);
    const brutto = e => (Math.sqrt(e.flaeche) + wand) ** 2;                // Fläche mit halber Wand ringsum (wie die Gene im Modell)
    const ohneEingang = !F.eingang && !prog.paare.some(q => q[0] < 0 || q[1] < 0);
    const ein = o.festEingang && ohneEingang ? (festEingang(prog, E) || eingangsSeite(F)) : eingangsSeite(F);
    const festR = o.festMeiden ? E.filter(e => e.fest && prog.vorbild && prog.vorbild[e.k]).flatMap(e => prog.vorbild[e.k]) : [];
    const ueber = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    const ergebnis = [], gesehen = new Set();
    const baender = [];
    if (!ersch.length) for (const t of [0.5, 0.35, 0.65]) for (const ax of ["x", "y"]) baender.push({ ohne: [ax, t] });   // ohne Erschließung: eine Teilung
    else {
      const wB0 = Math.max(1.0, ...ersch.map(e => e.mindest)) + wand + 0.05;
      for (const art of ["quer", "laengs"]) for (const versatz of [0, -0.5, 0.5, -1, 1]) {   // Versatz: das Band berührt den Vorraum (1,2 m) noch auf 0,9 m
        const senkrecht = (ein.innen === "oben" || ein.innen === "unten") === (art === "quer");   // Band in y-Richtung?
        const lMax = senkrecht ? F.h : F.b;
        const wB = Math.max(wB0, AE / Math.max(0.5, lMax - wand) + wand), L = Math.min(lMax, AE / (wB - wand) + wand);   // Innenfläche ≥ Programmfläche
        let x0, y0, x1, y1;
        if (senkrecht) {
          const cx = ein.innen === "links" ? ein.rand - wB / 2 : ein.innen === "rechts" ? ein.rand + wB / 2 : ein.x + versatz * Math.max(0, wB / 2 - 0.3);
          x0 = Math.min(Math.max(0, cx - wB / 2), F.b - wB); x1 = x0 + wB;
          if (ein.innen === "oben") { y1 = ein.innen === "oben" ? ein.rand : F.h; y0 = Math.max(0, y1 - L); y1 = y0 + L; }
          else if (ein.innen === "unten") { y0 = ein.rand; y0 = Math.min(Math.max(0, y0), F.h - L); y1 = y0 + L; }
          else { const cy = ein.y; y0 = Math.min(Math.max(0, cy - L / 2 + versatz * L / 3), F.h - L); y1 = y0 + L; }
        } else {
          const cy = ein.innen === "oben" ? ein.rand - wB / 2 : ein.innen === "unten" ? ein.rand + wB / 2 : ein.y + versatz * Math.max(0, wB / 2 - 0.3);
          y0 = Math.min(Math.max(0, cy - wB / 2), F.h - wB); y1 = y0 + wB;
          if (ein.innen === "links") { x1 = ein.rand; x0 = Math.max(0, x1 - L); x1 = x0 + L; }
          else if (ein.innen === "rechts") { x0 = Math.min(Math.max(0, ein.rand), F.b - L); x1 = x0 + L; }
          else { const cx = ein.x; x0 = Math.min(Math.max(0, cx - L / 2 + versatz * L / 3), F.b - L); x1 = x0 + L; }
        }
        baender.push({ rect: [x0, y0, x1, y1], senkrecht, art, versatz });
      }
      // Versuch 5 (o.sym): Achsenspalte – das Band nimmt nur so viel Länge, dass die übrigen Räume auf der Achse in derselben Spalte Platz
      // finden (Band am Eingang, Achsenräume dahinter)
      if (o.sym && prog.symmetrie && prog.symmetrie.paare) {
        const gepaart = new Set(prog.symmetrie.paare.flat()), achseA = E.filter(e => !e.erschliessung && !gepaart.has(e.k)).reduce((s, e) => s + brutto(e), 0);
        if (achseA > 0 && (ein.innen === "oben" || ein.innen === "unten")) {
          const wB = Math.max(wB0, (AE + achseA) / Math.max(0.5, F.h - wand) + wand), L = Math.min(F.h, AE / (wB - wand) + wand);
          const x0 = Math.min(Math.max(0, F.b / 2 - wB / 2), F.b - wB), y0 = ein.innen === "unten" ? Math.min(Math.max(0, ein.rand), F.h - L) : Math.max(0, ein.rand - L);
          baender.push({ rect: [x0, y0, x0 + wB, y0 + L], senkrecht: true, art: "achse", versatz: 0 });
        }
      }
      // Z1b Mittelflur mit Stich (T): Hauptband mittig parallel zur Eingangsseite, Stich vom Vorraum bis zum Hauptband
      for (const lage of [0.5, 0.4, 0.6]) {
        const vert = ein.innen === "links" || ein.innen === "rechts";      // Eingang an einer Seitenkante → Hauptband senkrecht
        const lMax = vert ? F.h : F.b, tief = vert ? F.b : F.h, wB = wB0;
        const m0 = tief * lage - wB / 2, m1 = m0 + wB;                     // Querlage des Hauptbands
        const stichL = ein.innen === "oben" ? ein.rand - m1 : ein.innen === "unten" ? m0 - ein.rand : ein.innen === "links" ? ein.rand - m1 : m0 - ein.rand;
        if (stichL < 0.5) continue;
        const restA = AE - (wB - wand) * stichL;
        if (restA < (wB - wand) * 2) continue;
        const L = Math.min(lMax, restA / (wB - wand) + wand), c = vert ? ein.y : ein.x, a0 = Math.min(Math.max(0, c - L / 2), lMax - L), a1 = a0 + L;
        const sc = Math.min(Math.max(a0 + wB / 2, c), a1 - wB / 2), s0 = sc - wB / 2, s1 = sc + wB / 2;
        let rect, stich;
        if (!vert) { rect = [a0, m0, a1, m1]; stich = ein.innen === "oben" ? [s0, m1, s1, ein.rand] : [s0, ein.rand, s1, m0]; }
        else { rect = [m0, a0, m1, a1]; stich = ein.innen === "links" ? [m1, s0, ein.rand, s1] : [ein.rand, s0, m0, s1]; }
        baender.push({ rect, stich, senkrecht: vert, art: "T", versatz: lage });
      }
    }
    for (const band0 of baender) {
      const band = band0.ohne ? null : band0, [B, H] = [F.b, F.h];
      // Versuch 5 (o.festMeiden): das Band der Erschließung darf feste Räume (Treppe, Luftraum) nicht überdecken
      if (band && festR.length && festR.some(q => ueber(q, band.rect) > 0.05 || (band.stich && ueber(q, band.stich) > 0.05))) continue;
      // Versuch 5 (o.sym): mit Spiegelachse nur Bänder auf der Achse (x = Feldmitte, wie symmetrisiere im Modell)
      const symProg = o.sym && prog.symmetrie && prog.symmetrie.paare && prog.symmetrie.paare.length ? prog.symmetrie : null;
      if (symProg && (!band || !band.senkrecht || band.stich || Math.abs((band.rect[0] + band.rect[2]) / 2 - B / 2) > 0.05)) continue;
      let zonen;
      if (!band) { const [ax, t] = band0.ohne; zonen = ax === "x" ? [[0, 0, B * t, H], [B * t, 0, B, H]] : [[0, 0, B, H * t], [0, H * t, B, H]]; }
      else {
        const [bx0, by0, bx1, by1] = band.rect;
        zonen = band.senkrecht ? [[0, 0, bx0, H], [bx1, 0, B, H], [bx0, 0, bx1, by0], [bx0, by1, bx1, H]]
                               : [[0, 0, B, by0], [0, by1, B, H], [0, by0, bx0, by1], [bx1, by0, B, by1]];
        if (band.stich) {                                                    // die Hälfte mit dem Stich wird vom Stich geteilt
          const [sx0, sy0, sx1, sy1] = band.stich, aus = [];
          for (const z of zonen) {
            const ox = Math.min(z[2], sx1) - Math.max(z[0], sx0), oy = Math.min(z[3], sy1) - Math.max(z[1], sy0);
            if (ox <= 0.01 || oy <= 0.01) { aus.push(z); continue; }
            if (band.senkrecht) aus.push([z[0], z[1], z[2], sy0], [z[0], sy1, z[2], z[3]]); else aus.push([z[0], z[1], sx0, z[3]], [sx1, z[1], z[2], z[3]]);
          }
          zonen = aus;
        }
      }
      zonen = zonen.map(r => {
        const P = klippe(U, r[0], r[1], r[2], r[3]), A = P.length >= 3 ? flaeche(P) : 0;
        let fl = 0; for (let i = 0; i < P.length; i++) fl += aufStrecken(P[i], P[(i + 1) % P.length], FS, 0.03);
        return { rect: r, poly: P, A, fassade: fl, amBand: band ? gemeinsam(r, band.rect) >= 0.9 || (band.stich && gemeinsam(r, band.stich) >= 0.9) : true };
      }).filter(z => z.A >= 1.0 && Math.min(z.rect[2] - z.rect[0], z.rect[3] - z.rect[1]) >= 0.9);
      if (!zonen.length) continue;
      const nachbarZ = (i, j) => i === j || gemeinsam(zonen[i].rect, zonen[j].rect) >= 0.9;
      if (symProg) { const z = symZonierung(prog, E, zonen, band, symProg, brutto, nachbarZ); if (z) { if (o.festEingang) z.ein = ein; ergebnis.push(z); } continue; }
      const raeume = E.filter(e => !e.erschliessung);
      for (let s = 0; s < o.saaten; s++) {
        const zuf = zuf0(o.saat * 7919 + s * 104729 + baender.indexOf(band0) * 31);
        const order = raeume.slice().sort((x, y) => (y.fest - x.fest) || ((y.fassade || y.aussen) - (x.fassade || x.aussen)) || y.flaeche - x.flaeche);
        for (let i = 1; i < order.length; i++) if (!order[i].fest && !order[i - 1].fest && zuf() < 0.3 * (s > 0)) [order[i], order[i - 1]] = [order[i - 1], order[i]];
        const zu = {}, used = zonen.map(() => 0);   // used: Bruttoflächen
        for (const e of order) {
          let kand = zonen.map((z, i) => i);
          if (e.fest && prog.vorbild && prog.vorbild[e.k]) {
            const q = prog.vorbild[e.k][0], cx = (q[0] + q[2]) / 2, cy = (q[1] + q[3]) / 2;
            const i = zonen.findIndex(z => cx >= z.rect[0] && cx <= z.rect[2] && cy >= z.rect[1] && cy <= z.rect[3]);
            if (i >= 0) kand = [i]; else continue;                          // fester Raum im Band: bleibt an seinem Platz
          } else {
            if (e.fassade || e.aussen) { const k2 = kand.filter(i => zonen[i].fassade >= 1.1); if (k2.length) kand = k2; }
            const brauchtBand = band && ([...e.nachbarn].some(b => E[b].erschliessung) || e.amEingang);
            if (brauchtBand) { const k2 = kand.filter(i => zonen[i].amBand); if (k2.length) kand = k2; }
          }
          let best = -Infinity, bi = kand[0];
          for (const i of kand) {
            const n = [...e.nachbarn].filter(b => zu[b] === i).length, voll = (used[i] + brutto(e)) / (zonen[i].A * 0.97);
            const w = 2 * n - 6 * Math.max(0, voll - 1) - (e.dienend && zonen[i].fassade > 0 ? 0.3 : 0) + (s > 0 ? 0.8 * zuf() : 0);
            if (w > best) { best = w; bi = i; }
          }
          zu[e.k] = bi; used[bi] += brutto(e);
        }
        let wert = 0;
        zonen.forEach((z, i) => { const v = used[i] / (z.A * 0.97); wert += 3 * Math.max(0, v - 1) + 0.5 * Math.max(0, 0.7 - v); });
        for (const [a, b] of prog.paare) {
          if (a < 0 || b < 0) continue;
          const ea = E[a].erschliessung, eb = E[b].erschliessung;
          if (ea && eb) continue;
          if (ea || eb) { const x = ea ? b : a; if (zu[x] != null && !zonen[zu[x]].amBand) wert += 1; continue; }
          if (zu[a] != null && zu[b] != null && !nachbarZ(zu[a], zu[b])) wert += 1;
        }
        for (const e of raeume) if ((e.fassade || e.aussen) && zu[e.k] != null && zonen[zu[e.k]].fassade < 1.1) wert += 1;
        if (band) zonen.forEach((z, i) => {                                  // Anschlusslänge: die Räume einer Zone, die ans Band müssen, brauchen je
          const am = gemeinsam(z.rect, band.rect) + (band.stich ? gemeinsam(z.rect, band.stich) : 0);   // mindestens ihre Mindestbreite + Wand
          const noetig = raeume.filter(e => zu[e.k] === i && ([...e.nachbarn].some(b => E[b].erschliessung) || e.amEingang)).reduce((q, e) => q + Math.max(1.0, e.mindest) + wand, 0);
          if (noetig > 0) wert += 2 * Math.max(0, noetig - am) / Math.max(1, am);
        });
        const sig = (band ? band.rect.map(v => v.toFixed(1)).join(",") : band0.ohne.join("")) + "|" + raeume.map(e => zu[e.k]).join(",");
        if (gesehen.has(sig)) continue; gesehen.add(sig);
        const zon = { band, zonen: zonen.map((z, i) => ({ rect: z.rect, poly: z.poly, A: z.A, fassade: z.fassade, amBand: z.amBand,
                      raeume: raeume.filter(e => zu[e.k] === i).map(e => e.k) })).filter(z => z.raeume.length), wert };
        if (o.festEingang) zon.ein = ein;
        ergebnis.push(zon);
        // Z2: innere Zone für dienende Räume am Band (zwei Lagen), wenn die Zone auch bediente Räume hat
        if (band && !band.stich) for (const lage of ["anfang", "ende"]) { const inn = innereZone(zon, band, E, wand, lage, U, FS); if (inn) ergebnis.push(inn); }
      }
    }
    ergebnis.sort((a, b) => a.wert - b.wert);
    return ergebnis.slice(0, o.anzahl);
  }
  function innereZone(zon, band, E, wand, lage, U, FS) {
    const zi = zon.zonen.findIndex(z => z.amBand && z.raeume.some(k => E[k].dienend) && z.raeume.some(k => E[k].fassade || E[k].aussen));
    if (zi < 0) return null;
    const Z = zon.zonen[zi], dien = Z.raeume.filter(k => E[k].dienend), Ad = dien.reduce((s, k) => s + (Math.sqrt(E[k].flaeche) + wand) ** 2, 0);
    const [bx0, by0, bx1, by1] = band.rect, [zx0, zy0, zx1, zy1] = Z.rect;
    const d = Math.max(1.2, ...dien.map(k => E[k].mindest + wand + 0.05));
    let inner;
    if (band.senkrecht) {                                                  // Zone links oder rechts vom Band, Länge in y
      const links = zx1 <= bx0 + 1e-6, L = Math.min(by1 - by0, Ad / d), ya = lage === "anfang" ? by0 : by1 - L;
      if (L < 1.0 || (zx1 - zx0) - d < 1.5) return null;
      inner = links ? [zx1 - d, ya, zx1, ya + L] : [zx0, ya, zx0 + d, ya + L];
    } else {
      const oben = zy1 <= by0 + 1e-6, L = Math.min(bx1 - bx0, Ad / d), xa = lage === "anfang" ? bx0 : bx1 - L;
      if (L < 1.0 || (zy1 - zy0) - d < 1.5) return null;
      inner = oben ? [xa, zy1 - d, xa + L, zy1] : [xa, zy0, xa + L, zy0 + d];
    }
    const P = klippe(U, ...inner); if (P.length < 3 || flaeche(P) < 0.8 * (inner[2] - inner[0]) * (inner[3] - inner[1])) return null;
    let fl = 0; for (let i = 0; i < P.length; i++) fl += aufStrecken(P[i], P[(i + 1) % P.length], FS, 0.03);
    const zonen = zon.zonen.map(z => Object.assign({}, z, { raeume: z.raeume.slice() }));
    zonen[zi].raeume = Z.raeume.filter(k => !dien.includes(k)); zonen[zi].platzhalter = inner;
    zonen.push({ rect: inner, poly: P, A: flaeche(P), fassade: fl, amBand: true, raeume: dien, innen: true });
    const fuell = Ad / (flaeche(P) * 0.97);
    return { band, zonen, wert: zon.wert + 0.2 + 2 * Math.max(0, fuell - 1) + 0.5 * Math.max(0, 0.7 - fuell), innen: lage };
  }

  /** Versuch 5 (o.festEingang): Programm ohne Eingang (kein Nachbar −1, kein feld.eingang), z. B. ein Obergeschoss – der Zugang ist der
      feste Raum, der an die Erschließung grenzt (Treppe); das Band beginnt an seiner Seite mit dem meisten freien Feld. */
  function festEingang(prog, E) {
    const F = prog.feld, ersch = new Set(E.filter(e => e.erschliessung).map(e => e.k));
    const e = E.find(q => q.fest && prog.vorbild && prog.vorbild[q.k] && [...q.nachbarn].some(b => ersch.has(b)));
    if (!e) return null;
    const R = prog.vorbild[e.k], r = [Math.min(...R.map(q => q[0])), Math.min(...R.map(q => q[1])), Math.max(...R.map(q => q[2])), Math.max(...R.map(q => q[3]))];
    const mx = (r[0] + r[2]) / 2, my = (r[1] + r[3]) / 2;
    const seiten = [["unten", F.h - r[3], { x: mx, y: r[3], rand: r[3] }], ["oben", r[1], { x: mx, y: r[1], rand: r[1] }],
                    ["rechts", F.b - r[2], { x: r[2], y: my, rand: r[2] }], ["links", r[0], { x: r[0], y: my, rand: r[0] }]];
    const s = seiten.reduce((a, b) => (b[1] > a[1] ? b : a));
    return Object.assign({ innen: s[0] }, s[2]);
  }
  /** Versuch 5 (o.sym): symmetrische Zonierung an einer senkrechten Spiegelachse (Feldmitte). Die Paare der Symmetrie werden auf die
      beiden Seiten verteilt (das erste Paar wie angegeben, jedes weitere so, dass die meisten Nachbarschaften auf einer Seite bleiben),
      Räume auf der Achse (außer der Erschließung im Band) und ungepaarte Räume in die Zonen auf der Achse. Die rechte Zone wird nicht
      gepackt, sondern aus der Lösung der linken gespiegelt (spiegleTeile). */
  function symZonierung(prog, E, zonen, band, S, brutto, nachbarZ) {
    const [bx0, , bx1] = band.rect, li = zonen.findIndex(z => z.rect[2] <= bx0 + 1e-6), re = zonen.findIndex(z => z.rect[0] >= bx1 - 1e-6);
    if (li < 0 || re < 0) return null;
    const links = new Set(), partner = new Map();
    S.paare.forEach(([a, b], i) => {
      partner.set(a, b); partner.set(b, a);
      const na = [...E[a].nachbarn].filter(x => links.has(x)).length, nb = [...E[b].nachbarn].filter(x => links.has(x)).length;
      links.add(i === 0 || na >= nb ? a : b);
    });
    const mitte = zonen.map((z, i) => i).filter(i => i !== li && i !== re);
    const rest = E.filter(e => !e.erschliessung && !partner.has(e.k)).map(e => e.k);
    if (rest.length && !mitte.length) return null;
    const zu = {}, used = zonen.map(() => 0);
    for (const k of links) { zu[k] = li; used[li] += brutto(E[k]); }
    for (const k of rest) {                                                  // in die Mittelzone mit den meisten Nachbarn, sonst die leerste
      let bi = mitte[0], bw = -Infinity;
      for (const i of mitte) { const w = 2 * [...E[k].nachbarn].filter(b => zu[b] === i).length - used[i] / zonen[i].A; if (w > bw) { bw = w; bi = i; } }
      zu[k] = bi; used[bi] += brutto(E[k]);
    }
    let wert = 0;
    zonen.forEach((z, i) => { if (i === re || !used[i]) return; const v = used[i] / (z.A * 0.97); wert += 3 * Math.max(0, v - 1) + 0.5 * Math.max(0, 0.7 - v); });
    const seite = k => (zu[k] != null ? zu[k] : partner.has(k) ? re : null);
    for (const [a, b] of prog.paare) {
      if (a < 0 || b < 0 || E[a].erschliessung || E[b].erschliessung) continue;
      const za = seite(a), zb = seite(b); if (za != null && zb != null && !nachbarZ(za, zb)) wert += 1;
    }
    const raus = zonen.map((z, i) => ({ rect: z.rect, poly: z.poly, A: z.A, fassade: z.fassade, amBand: z.amBand,
      raeume: i === re ? [...links].map(k => partner.get(k)) : E.filter(e => zu[e.k] === i).map(e => e.k), spiegelVon: i === re ? li : undefined }));
    const keep = raus.map((z, i) => z.raeume.length > 0), idx = []; let n = 0; keep.forEach((k, i) => { idx[i] = k ? n++ : -1; });
    const out = raus.filter((z, i) => keep[i]); for (const z of out) if (z.spiegelVon != null) z.spiegelVon = idx[z.spiegelVon];
    return { band, zonen: out, wert, sym: true };
  }
  /** Versuch 5: Lösung der linken Zone an der Feldmitte auf die gespiegelte rechte Zone übertragen (Räume über die Paare der Symmetrie). */
  function spiegleTeile(prog, zon, teile) {
    const S = prog.symmetrie, B = prog.feld.b; if (!S) return teile;
    const partner = new Map(); for (const [a, b] of S.paare) { partner.set(a, b); partner.set(b, a); }
    zon.zonen.forEach((Z, j) => {
      if (Z.spiegelVon == null || !teile[Z.spiegelVon]) return;
      const T = teile[Z.spiegelVon], [u0, u1] = T.ursprung;
      teile[j] = { abbild: T.abbild.map(k => (partner.has(k) ? partner.get(k) : k)), ursprung: [0, 0],
        rechtecke: T.rechtecke.map(q => Object.assign({}, q, { x1: B - (q.x2 + u0), x2: B - (q.x1 + u0), y1: q.y1 + u1, y2: q.y2 + u1 })) };
    });
    return teile;
  }

  /** KREMLAS-Programm einer Zone: Feld = Umgebungsrechteck der Zone, Umriss = Feld-Umriss ∩ Zone mit Fassadenkanten, Räume der Zone (feste
      mit ihrer Lage), Nachbarschaften in der Zone; Nachbarn der Erschließung (bzw. des Eingangs) werden Nachbarn −1 eines Vorraums, der die
      ganze gemeinsame Kante zum Band einnimmt. Platzhalter (innere Zone) als fester Raum. Ergebnis {prog, abbild (Teil → Gesamt), herkunft} */
  function teilprogramm(prog, zon, zi) {
    const E = eigenschaften(prog), F = prog.feld, Z = zon.zonen[zi], [zx0, zy0, zx1, zy1] = Z.rect, FS = fassadenStrecken(F);
    const P = Z.poly, umriss = P.map(([x, y]) => [+(x - zx0).toFixed(3), +(y - zy0).toFixed(3)]);
    const kanten = P.map((p, i) => aufStrecken(p, P[(i + 1) % P.length], FS, 0.03) > 0.5 * Math.hypot(P[(i + 1) % P.length][0] - p[0], P[(i + 1) % P.length][1] - p[1]) ? "fassade" : "innen");
    const abbild = Z.raeume.slice(), idx = new Map(abbild.map((k, i) => [k, i]));
    const verschiebe = q => [+(q[0] - zx0).toFixed(3), +(q[1] - zy0).toFixed(3), +(q[2] - zx0).toFixed(3), +(q[3] - zy0).toFixed(3)];
    const raeume = abbild.map(k => prog.raeume[k].slice()), vorbild = abbild.map(k => (prog.vorbild && prog.vorbild[k] ? prog.vorbild[k] : [[zx0, zy0, zx0 + 1, zy0 + 1]]).map(verschiebe));
    if (Z.platzhalter) { const q = Z.platzhalter; raeume.push(["Platzhalter", "placeholder", +(0.9 * (q[2] - q[0]) * (q[3] - q[1])).toFixed(3), 0, { fest: true }]); vorbild.push([verschiebe(q)]); }
    const paare = new Set();
    for (const [a, b] of prog.paare) {
      const ia = idx.get(a), ib = b >= 0 ? idx.get(b) : undefined;
      if (ia != null && ib != null) { paare.add(ia < ib ? ia + "," + ib : ib + "," + ia); continue; }
      const x = ia != null ? ia : ib, y = ia != null ? b : a;
      if (x == null) continue;
      if (y < 0 || (E[y] && E[y].erschliessung)) paare.add(x + ",-1");
    }
    let eingang = null;
    if (zon.band) {                                                         // Vorraum = Streifen außen an der längsten gemeinsamen Kante mit dem Band
      let lang = 0;
      for (const [bx0, by0, bx1, by1] of [zon.band.rect, zon.band.stich].filter(Boolean)) {
        const t = 0.02; let kand = null;
        if (Math.abs(zx1 - bx0) <= t || Math.abs(bx1 - zx0) <= t) { const a = Math.max(zy0, by0), b = Math.min(zy1, by1); if (b - a >= 0.9) kand = [b - a, Math.abs(zx1 - bx0) <= t ? [zx1 - zx0, a - zy0, zx1 - zx0 + 0.6, b - zy0] : [-0.6, a - zy0, 0, b - zy0]]; }
        else if (Math.abs(zy1 - by0) <= t || Math.abs(by1 - zy0) <= t) { const a = Math.max(zx0, bx0), b = Math.min(zx1, bx1); if (b - a >= 0.9) kand = [b - a, Math.abs(zy1 - by0) <= t ? [a - zx0, zy1 - zy0, b - zx0, zy1 - zy0 + 0.6] : [a - zx0, -0.6, b - zx0, 0]]; }
        if (kand && kand[0] > lang) { lang = kand[0]; eingang = kand[1]; }
      }
    } else if (F.eingang) eingang = verschiebe(F.eingang);
    const pl = [...paare].map(s => s.split(",").map(Number)).filter(([a, b]) => b >= 0 || eingang);
    const feld = Object.assign({}, F, { b: +(zx1 - zx0).toFixed(3), h: +(zy1 - zy0).toFixed(3), umriss, kanten });
    if (eingang) feld.eingang = eingang.map(v => +v.toFixed(3)); else delete feld.eingang;
    return { prog: { titel: (prog.titel || "") + " · Zone " + zi, feld, raeume, paare: pl, vorbild }, abbild, ursprung: [zx0, zy0] };
  }

  /** Lösungen der Zonen (je Zone: Liste {r, id, an, bd, x1, y1, x2, y2} in Metern im Teilfeld, r/id/an im Teilprogramm) und das Band zu
      einem Individuum des ganzen Programms; Modell M muss auf das ganze Programm eingestellt sein (setzeFeld). */
  function zusammensetzen(M, prog, zon, teile) {
    const E = eigenschaften(prog), n = prog.raeume.length, k = M.PX_M, G = [];
    let naechste = n;
    const neu = (id, r, q) => M.gen(id, (q[0] + q[2]) / 2 * k, (q[1] + q[3]) / 2 * k, (q[2] - q[0]) * k, (q[3] - q[1]) * k, null, 0.4, 0, r);
    const belegt = new Set();
    teile.forEach((T, zi) => {
      if (!T) return;
      const { abbild, ursprung, rechtecke } = T, ids = new Map();
      for (const q of rechtecke) {
        if (q.r >= abbild.length) continue;                                 // Platzhalter
        const r = abbild[q.r], id = q.id === q.r ? r : naechste++;
        ids.set(q.id, id);
        const g = neu(id, r, [q.x1 + ursprung[0], q.y1 + ursprung[1], q.x2 + ursprung[0], q.y2 + ursprung[1]]);
        g.bd = q.bd; g._an = q.an; G.push(g); belegt.add(r);
      }
      for (const g of G) if (g._an != null && ids.has(g._an)) { g.an = ids.get(g._an); delete g._an; }
    });
    for (const g of G) delete g._an;
    if (zon.band) {                                                         // Band: erschließende Räume nacheinander, der am Eingang zuerst
      const ersch = E.filter(e => e.erschliessung).sort((a, b) => b.amEingang - a.amEingang), A = ersch.reduce((s, e) => s + e.flaeche, 0);
      const [x0, y0, x1, y1] = zon.band.rect, ein = zon.ein || eingangsSeite(prog.feld);
      const umgekehrt = zon.band.senkrecht ? ein.y > (y0 + y1) / 2 : ein.x > (x0 + x1) / 2;
      let t = 0;
      if (zon.band.stich) {                                                  // T: der Raum am Eingang bekommt den Stich (als Teil, bei einem Raum mit dem Hauptband)
        const e0 = ersch[0];
        if (ersch.length === 1) { G.push(neu(e0.k, e0.k, zon.band.rect)); const g = neu(naechste++, e0.k, zon.band.stich); g.an = e0.k; g.bd = false; G.push(g); belegt.add(e0.k); }
        else {
          G.push(neu(e0.k, e0.k, zon.band.stich)); belegt.add(e0.k);
          const rest = ersch.slice(1), Ar = rest.reduce((s, e) => s + e.flaeche, 0); let u0 = 0;
          for (const e of rest) { const u1 = u0 + e.flaeche / Ar, q = zon.band.senkrecht ? [x0, y0 + u0 * (y1 - y0), x1, y0 + u1 * (y1 - y0)] : [x0 + u0 * (x1 - x0), y0, x0 + u1 * (x1 - x0), y1]; G.push(neu(e.k, e.k, q)); belegt.add(e.k); u0 = u1; }
        }
      } else for (const e of ersch) {
        const a = t, b = t + e.flaeche / A; t = b;
        const [s, u] = umgekehrt ? [1 - b, 1 - a] : [a, b];
        const q = zon.band.senkrecht ? [x0, y0 + s * (y1 - y0), x1, y0 + u * (y1 - y0)] : [x0 + s * (x1 - x0), y0, x0 + u * (x1 - x0), y1];
        G.push(neu(e.k, e.k, q)); belegt.add(e.k);
      }
    }
    for (const e of E) if (!belegt.has(e.k) && prog.vorbild && prog.vorbild[e.k] && e.fest) {   // feste Räume außerhalb der Zonen
      prog.vorbild[e.k].forEach((q, j) => G.push(neu(j ? naechste++ : e.k, e.k, q)));
      belegt.add(e.k);
    }
    for (const e of E) if (!belegt.has(e.k)) G.push(neu(e.k, e.k, [0, 0, Math.sqrt(e.flaeche), Math.sqrt(e.flaeche)]));   // nicht zugeordnet (sollte nicht vorkommen)
    return { g: G, fo: 0, fd: 0 };
  }

  /* ---------------------------------------------------------------- (2) Regeln am fertigen Plan */
  /** Regelfolge am Plan eines Individuums, bis budget ms oder keine Regel mehr f3 senkt. Regeln (je Durchgang alle Vorschläge, der beste wird
      angenommen): T Tür herstellen (Kante zum geforderten Nachbarn schieben bzw. die gemeinsame Kante verlängern), F Wände fluchten (fast
      gleiche Kanten verschiedener Räume auf eine Linie), K Flurstück einziehen (dem erschließenden Raum ein Teil bis zum fehlenden Nachbarn),
      U an der Umrisskante abschneiden, M Mindestmaß (zu kleine bzw. zu schmale Räume nach außen schieben).
      Ergebnis {ind, wert, angewandt: {T, F, K, U, M}} */
  function aufraeumen(M, ind, paare, programm, zufall, budget, o) {
    o = Object.assign({ vorschlaege: 60 }, o);
    const t0 = Date.now(), prog = M.PROGRAMME[programm], E = eigenschaften(prog), k = M.PX_M, tol = 2;
    const pruef = (R, I0) => { const I = M.planAlsInd(R, I0 || ind); return { I, w: M.planPruefung(I, paare, programm) }; };
    let R = M.grundriss(ind, 300, M.TEILE_PX).map(q => Object.assign({}, q)), basis = ind, akt = pruef(R);
    const angewandt = { T: 0, F: 0, K: 0, U: 0, M: 0 };
    const door = M.TUER_PX + 0.12 * k;
    while (Date.now() - t0 < budget && !akt.w.gueltig) {
      const V = [];                                                         // [Regel, R'] oder [Regel, R', Zusatzgen]
      const T = M.tueren(R, paare, M.TUER_PX), da = new Set(T.map(t => t.a + "," + t.b));
      const teile = r => R.filter(q => q.r === r);
      for (const [a, b] of paare) {
        if (da.has(a + "," + b)) continue;
        const AA = teile(a), BB = b < 0 ? (M.EINGANG ? [M.rechteck(M.EINGANG)] : []) : teile(b);
        for (const A of AA) for (const B of BB) {
          // T1: Kante von A bis an B schieben (oder B an A), wenn sich die Projektionen genug überdecken
          const ovy = Math.min(A.y2, B.y2) - Math.max(A.y1, B.y1), ovx = Math.min(A.x2, B.x2) - Math.max(A.x1, B.x1);
          if (ovy >= door) { if (B.x1 >= A.x2 - tol) { V.push(["T", M.kanteSchieben(R, A, 1, B.x1 - A.x2)]); if (b >= 0) V.push(["T", M.kanteSchieben(R, B, 3, A.x2 - B.x1)]); }
                             if (A.x1 >= B.x2 - tol) { V.push(["T", M.kanteSchieben(R, A, 3, B.x2 - A.x1)]); if (b >= 0) V.push(["T", M.kanteSchieben(R, B, 1, A.x1 - B.x2)]); } }
          if (ovx >= door) { if (B.y1 >= A.y2 - tol) { V.push(["T", M.kanteSchieben(R, A, 2, B.y1 - A.y2)]); if (b >= 0) V.push(["T", M.kanteSchieben(R, B, 0, A.y2 - B.y1)]); }
                             if (A.y1 >= B.y2 - tol) { V.push(["T", M.kanteSchieben(R, A, 0, B.y2 - A.y1)]); if (b >= 0) V.push(["T", M.kanteSchieben(R, B, 2, A.y1 - B.y2)]); } }
          // T2: berühren sich, aber die gemeinsame Kante ist zu kurz → quer verlängern
          const dx = Math.max(A.x1, B.x1) - Math.min(A.x2, B.x2), dy = Math.max(A.y1, B.y1) - Math.min(A.y2, B.y2);
          if (Math.abs(dx) <= tol && ovy > 0 && ovy < door) { const f = door - ovy + 1; V.push(["T", M.kanteSchieben(R, A, A.y2 < B.y2 ? 2 : 0, A.y2 < B.y2 ? f : -f)]); if (b >= 0) V.push(["T", M.kanteSchieben(R, B, B.y2 < A.y2 ? 2 : 0, B.y2 < A.y2 ? f : -f)]); }
          if (Math.abs(dy) <= tol && ovx > 0 && ovx < door) { const f = door - ovx + 1; V.push(["T", M.kanteSchieben(R, A, A.x2 < B.x2 ? 1 : 3, A.x2 < B.x2 ? f : -f)]); if (b >= 0) V.push(["T", M.kanteSchieben(R, B, B.x2 < A.x2 ? 1 : 3, B.x2 < A.x2 ? f : -f)]); }
          // K: Flurstück – der erschließende Raum bekommt ein Teil, gerade bis zum Nachbarn (Breite = Tür + Wand)
          const eA = E[a] && E[a].erschliessung, eB = b >= 0 && E[b] && E[b].erschliessung;
          if (eA || eB) {
            const X = eA ? A : B, Y = eA ? B : A, w = door, idNeu = Math.max(...R.map(q => q.id)) + 1, r = X.r;
            const ox = [Math.max(X.x1, Y.x1), Math.min(X.x2, Y.x2)], oy = [Math.max(X.y1, Y.y1), Math.min(X.y2, Y.y2)];
            let S = null;
            if (ox[1] - ox[0] >= w) { const m = (ox[0] + ox[1]) / 2; S = Y.y1 >= X.y2 ? [m - w / 2, X.y2, m + w / 2, Y.y1] : Y.y2 <= X.y1 ? [m - w / 2, Y.y2, m + w / 2, X.y1] : null; }
            else if (oy[1] - oy[0] >= w) { const m = (oy[0] + oy[1]) / 2; S = Y.x1 >= X.x2 ? [X.x2, m - w / 2, Y.x1, m + w / 2] : Y.x2 <= X.x1 ? [Y.x2, m - w / 2, X.x1, m + w / 2] : null; }
            if (S && S[2] - S[0] > tol && S[3] - S[1] > tol && Math.max(S[2] - S[0], S[3] - S[1]) < 4 * k) {
              const R2 = R.map(q => Object.assign({}, q));
              R2.push({ id: idNeu, r, x1: S[0], y1: S[1], x2: S[2], y2: S[3], neuAn: X.id });
              V.push(["K", R2]);
            }
          }
        }
      }
      // F: Wände fluchten – Kanten verschiedener Räume, die bis 0,3 m auseinanderliegen und sich überdecken, auf eine Linie
      const fl = [];
      for (let i = 0; i < R.length; i++) for (let j = 0; j < R.length; j++) {
        const A = R[i], B = R[j]; if (i === j || A.r === B.r) continue;
        for (const [sa, ka, kb, quer] of [[1, "x2", "x2", "y"], [3, "x1", "x1", "y"], [0, "y1", "y1", "x"], [2, "y2", "y2", "x"]]) {
          const d = B[kb] - A[ka]; if (Math.abs(d) < tol || Math.abs(d) > 0.3 * k) continue;
          const ov = quer === "y" ? Math.min(A.y2, B.y2) - Math.max(A.y1, B.y1) : Math.min(A.x2, B.x2) - Math.max(A.x1, B.x1);
          if (ov > -0.5 * k) fl.push(["F", A, sa, d]);
        }
      }
      for (let s = 0; s < Math.min(fl.length, 20); s++) { const [, A, sa, d] = fl[zufall.ganz(fl.length)]; V.push(["F", M.kanteSchieben(R, A, sa, d)]); }
      // U: an der Umrisskante abschneiden (Teile, die Hindernisse überdecken)
      for (const A of R) for (const H of M.HINDERNIS) {
        const h = M.rechteck(H), ox = Math.min(A.x2, h.x2) - Math.max(A.x1, h.x1), oy = Math.min(A.y2, h.y2) - Math.max(A.y1, h.y1);
        if (ox <= 0 || oy <= 0) continue;
        if (ox <= oy) V.push(["U", M.kanteSchieben(R, A, A.x1 + A.x2 < h.x1 + h.x2 ? 1 : 3, A.x1 + A.x2 < h.x1 + h.x2 ? -ox : ox)]);
        else V.push(["U", M.kanteSchieben(R, A, A.y1 + A.y2 < h.y1 + h.y2 ? 2 : 0, A.y1 + A.y2 < h.y1 + h.y2 ? -oy : oy)]);
      }
      // M: Mindestmaß – zu kleine/schmale Räume: jede Seite um den Fehlbetrag nach außen
      for (const q of akt.w.raeume) {
        if (!q.zuKlein && !q.zuSchmal) continue;
        const A = R.find(x => x.id === q.id); if (!A) continue;
        const P = prog.raeume[q.raum], fehlA = Math.max(0, P[2] * 0.97 - q.flaeche) * k * k, fehlB = Math.max(0, (P[3] || 0) - q.breite) * k;
        for (const seite of [0, 1, 2, 3]) {
          const l = seite % 2 ? A.y2 - A.y1 : A.x2 - A.x1, d = Math.max(fehlB, l > 0 ? fehlA / l : 0) + 0.5;
          V.push(["M", M.kanteSchieben(R, A, seite, seite === 1 || seite === 2 ? d : -d)]);
        }
      }
      const kand = V.filter(v => v[1]);
      if (!kand.length) break;
      const auswahl = kand.length > o.vorschlaege ? Array.from({ length: o.vorschlaege }, () => kand[zufall.ganz(kand.length)]) : kand;
      let best = null;
      for (const [regel, R2] of auswahl) {
        const I = M.planAlsInd(R2.filter(q => !q.zusatz), basis);
        for (const q of R2) if (q.neuAn != null) { const g = I.g.find(x => x.id === q.id); if (g) { g.an = q.neuAn; g.bd = false; } }
        const w = M.planPruefung(I, paare, programm);
        if (!best || w.f3 < best.w.f3) best = { regel, R2, I, w };
        if (Date.now() - t0 > budget) break;
      }
      if (!best || best.w.f3 >= akt.w.f3 - 1e-6) break;
      angewandt[best.regel]++;
      basis = best.I; akt = { I: best.I, w: best.w };
      R = M.grundriss(best.I, 300, M.TEILE_PX).map(q => Object.assign({}, q));
    }
    const I = akt.I; I.fo = 0; I.f3 = akt.w.f3;
    return { ind: I, wert: akt.w, angewandt };
  }

  /* ---------------------------------------------------------------- (3) Regeln als Mutation */
  const abstandRR = (a, b) => Math.hypot(Math.max(0, a.x1 - b.x2, b.x1 - a.x2), Math.max(0, a.y1 - b.y2, b.y1 - a.y2));
  function verschiebeRaum(c, r, dx, dy, M) {
    for (const g of c.g) if (g.r === r && !M.FEST.has(g.id)) { g.x = Math.min(M.BREITE, Math.max(0, g.x + dx)); g.y = Math.min(M.HOEHE, Math.max(0, g.y + dy)); }
  }
  /** Eine Regel als Mutation (Wahrscheinlichkeit rate je Kind): Raum an die Fassade tauschen, Raum zum geforderten Nachbarn legen, Raum an der
      Erschließung spiegeln. Nur Raumeigenschaften, keine Namen. */
  function mutiere(c, z, P, rate, zuf, M) {
    if (zuf() >= rate) return;
    const prog = M.PROGRAMME[z.programm], E = eigenschaften(prog), haupt = r => c.g.find(g => g.id === r) || c.g.find(g => g.r === r);
    const R = r => { const g = haupt(r); return g ? M.rechteck(g) : null; };
    const fest = r => { const g = haupt(r); return !g || M.FEST.has(g.id); };
    const op = zuf.ganz(3);
    if (op === 0 && M.FASSADE.length) {                                    // an die Fassade tauschen
      const dF = r => { const A = R(r); return Math.min(...M.FASSADE.map(s => abstandRR(A, { x1: Math.min(s[0], s[2]), y1: Math.min(s[1], s[3]), x2: Math.max(s[0], s[2]), y2: Math.max(s[1], s[3]) }))); };
      const A = E.filter(e => (e.fassade || e.aussen) && !fest(e.k) && dF(e.k) > 2);
      if (!A.length) return;
      const a = A[zuf.ganz(A.length)], da = dF(a.k);
      const B = E.filter(e => e.dienend && !fest(e.k) && dF(e.k) < da && e.flaeche > 0.4 * a.flaeche && e.flaeche < 2.5 * a.flaeche);
      if (!B.length) return;
      const b = B[zuf.ganz(B.length)], ga = haupt(a.k), gb = haupt(b.k), dx = gb.x - ga.x, dy = gb.y - ga.y;
      verschiebeRaum(c, a.k, dx, dy, M); verschiebeRaum(c, b.k, -dx, -dy, M);
    } else if (op === 1) {                                                 // zum geforderten Nachbarn legen
      const Q = P.filter(([a, b]) => b >= 0 && !fest(a) && !fest(b));
      if (!Q.length) return;
      const [a, b] = Q[zuf.ganz(Q.length)], ga = haupt(a), gb = haupt(b);
      if (!ga || !gb) return;
      const [m, f] = ga.w * ga.h <= gb.w * gb.h ? [ga, gb] : [gb, ga], k = M.PX_M;
      const dx = m.x - f.x, dy = m.y - f.y;
      let nx = m.x, ny = m.y;
      if (Math.abs(dx) / (f.w + m.w) >= Math.abs(dy) / (f.h + m.h)) { nx = f.x + Math.sign(dx || 1) * (f.w + m.w) / 2; const s = Math.max(0, (f.h + m.h) / 2 - 0.9 * k); ny = Math.min(f.y + s, Math.max(f.y - s, m.y)); }
      else { ny = f.y + Math.sign(dy || 1) * (f.h + m.h) / 2; const s = Math.max(0, (f.w + m.w) / 2 - 0.9 * k); nx = Math.min(f.x + s, Math.max(f.x - s, m.x)); }
      verschiebeRaum(c, m.r, nx - m.x, ny - m.y, M);
    } else {                                                               // an der Erschließung spiegeln
      const e = E.find(x => x.erschliessung); if (!e) return;
      const ge = haupt(e.k), N = [...e.nachbarn].filter(r => !fest(r));
      if (!ge || !N.length) return;
      const x = N[zuf.ganz(N.length)], gx = haupt(x);
      if (ge.w >= ge.h) verschiebeRaum(c, x, 0, 2 * (ge.y - gx.y), M); else verschiebeRaum(c, x, 2 * (ge.x - gx.x), 0, M);
    }
  }

  return { eigenschaften, zonierungen, teilprogramm, zusammensetzen, aufraeumen, mutiere, klippe, flaeche, eingangsSeite, festEingang, spiegleTeile };
});
