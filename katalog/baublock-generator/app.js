/* Baublock-Generator (DigiWo) · Bedienung und Darstellung (Modelllogik in modell.js)
   Links der Lageplan (Grundstück, Abstandsfläche, Baukörper nach Geschossen), rechts eine Axonometrie der Baukörper
   (Parallelprojektion aus _gemeinsam/axonometrie.js, Zeichenreihenfolge von hinten nach vorn, drehbar per Ziehen).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, D2R = Math.PI / 180, ORANGE = [245, 163, 0];
  const en = () => document.documentElement.lang === "en";
  const zahl = (v, n = 0) => v.toLocaleString(en() ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  const tx = o => (en() ? o.en : o.de);

  /* ---------------------------------------------------------------- Aufteilung der Zeichenfläche */
  let L = null;   // {b, h, plan: [x, y, w, h], axo: [x, y, w, h]}
  function aufteilung() {
    const c = document.getElementById("leinwand"), breit = (c && c.parentElement ? c.parentElement.clientWidth : 1000) >= 640;
    L = breit ? { b: 1000, h: 560, plan: [0, 0, 480, 560], axo: [500, 0, 500, 560] } : { b: 600, h: 1160, plan: [0, 0, 600, 560], axo: [0, 580, 600, 580] };
    return L;
  }
  /** Ausschnitt des Lageplans: fest je Zustand (Rahmen um das Ausgangsgrundstück), damit Ziehen nicht die Ansicht verschiebt */
  function bereich(z, p) {
    if (!z._bb) { const b = Geo.bbox(z.plot), r = Math.max(b.b, b.h) * 0.16 + p.strasse / 2; z._bb = { x0: b.x0 - r, y0: b.y0 - r, x1: b.x1 + r, y1: b.y1 + r }; }
    return z._bb;
  }
  function planTrafo(z, p) {
    const bb = bereich(z, p), [x, y, w, h] = L.plan, k = Math.min(w / (bb.x1 - bb.x0), h / (bb.y1 - bb.y0));
    const ox = x + (w - k * (bb.x1 - bb.x0)) / 2 - k * bb.x0, oy = y + (h - k * (bb.y1 - bb.y0)) / 2 - k * bb.y0;
    return { k, hin: q => [ox + k * q[0], oy + k * q[1]], her: (sx, sy) => [(sx - ox) / k, (sy - oy) / k] };
  }

  /* ---------------------------------------------------------------- Farben */
  const masse = F => F.rgb.akzent || [70, 73, 225];
  const geschossFarbe = (g, a = 1) => Karte.farbe(0.08 + 0.92 * Math.min(1, (g - 1) / 11), "wasser", a);
  const schriftAuf = g => (Math.min(1, (g - 1) / 11) > 0.4 ? "#fff" : "#111");
  const ABSTAND = "rgba(232,72,85,0.16)", ABSTAND_LINIE = "rgba(232,72,85,0.85)";

  /* ---------------------------------------------------------------- Lageplan */
  function zeichnePlan(ctx, z, p, F) {
    const T = planTrafo(z, p), px = F.px, H = P => P.map(T.hin);
    ctx.save(); ctx.beginPath(); ctx.rect(...L.plan); ctx.clip();
    const n = z.plot.length;
    // Straßen: Band bis zur Straßenmitte, Mittellinie gestrichelt
    z.plot.forEach((a, j) => {
      if (z.arten[j] !== "strasse") return;
      const b = z.plot[(j + 1) % n], f = Modell.rahmen(a, b, 0), w = p.strasse / 2;
      Karte.poly(ctx, H([a, b, Modell.punktUV(f, f.L, -w), Modell.punktUV(f, 0, -w)]), F.dunkel ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.045)", null);
      Karte.linie(ctx, H([Modell.punktUV(f, -w, -w), Modell.punktUV(f, f.L + w, -w)]), F.gedaempft, px * 0.8, [6 * px, 5 * px]);
    });
    // Abstandsfläche zwischen Grundstück und Umriss
    if (p.zeigeAbstand && z.umriss.length) {
      ctx.beginPath(); H(z.plot).forEach((q, i) => i ? ctx.lineTo(...q) : ctx.moveTo(...q)); ctx.closePath();
      H(z.umriss).reverse().forEach((q, i) => i ? ctx.lineTo(...q) : ctx.moveTo(...q)); ctx.closePath();
      ctx.fillStyle = ABSTAND; ctx.fill();
      Karte.linie(ctx, H(z.umriss.concat([z.umriss[0]])), ABSTAND_LINIE, px * 1, [4 * px, 3 * px]);
    }
    // Grundstückskanten nach Art
    z.plot.forEach((a, j) => {
      const b = z.plot[(j + 1) % n], art = z.arten[j];
      Karte.linie(ctx, H([a, b]), art === "baulinie" ? F.akzent : F.tinte, px * (art === "nachbar" ? 2.2 : 1.2), art === "baulinie" ? [7 * px, 3 * px] : null);
    });
    // Baukörper
    for (const st of z.st) {
      Karte.poly(ctx, H(st.poly), geschossFarbe(st.g, st.art === "hof" ? 0.75 : 1), F.dunkel ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)", px * 0.6);
      for (const d of st.dach) Karte.poly(ctx, H(d), null, F.dunkel ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.6)", px * 0.9);
    }
    for (const st of z.st) if (st.markiert) { if (st.markiert === "dach") st.dach.forEach(d => Karte.poly(ctx, H(d), "rgba(245,163,0,0.35)", Sim.css(ORANGE), px * 1.6)); else Karte.poly(ctx, H(st.poly), null, Sim.css(ORANGE), px * 2); }
    for (const w of z.weg) Karte.linie(ctx, H(w.concat([w[0]])), Sim.css(ORANGE), px * 1.2, [3 * px, 3 * px]);
    // Geschosszahlen je Fragment
    if (p.zeigeZahlen) {
      const T2 = {};
      for (const st of z.st) { const a = Geo.flaeche(st.poly); if (!T2[st.teil + st.g] || a > T2[st.teil + st.g].a) T2[st.teil + st.g] = { a, st }; }
      for (const k in T2) {
        const { st, a } = T2[k]; if (a < 40) continue;
        Karte.text(ctx, String(st.g) + (st.dach.length ? "+D" : ""), T.hin(Geo.schwerpunkt(st.poly)), schriftAuf(st.g), px, 10, "center");
      }
    }
    // charakteristische Kanten (Zeilen)
    z.ck.forEach((k, i) => {
      const f = Modell.rahmen(k.a, k.b, 0), q = Modell.punktUV(f, f.L / 2, -6 - p.strasse * 0.1);
      Karte.linie(ctx, H(k.kette), F.akzent, px * 2.4);
      Karte.text(ctx, String(i + 1), T.hin(q), F.akzent, px, 12, "center");
    });
    // Ecken des Grundstücks (ziehbar) und Attraktor
    for (const q of z.plot) { const s = T.hin(q); ctx.fillStyle = F.papier; ctx.strokeStyle = F.tinte; ctx.lineWidth = px; ctx.fillRect(s[0] - 3.5 * px, s[1] - 3.5 * px, 7 * px, 7 * px); ctx.strokeRect(s[0] - 3.5 * px, s[1] - 3.5 * px, 7 * px, 7 * px); }
    const genutzt = Modell.folge(p).some(a => p[Modell.AKTIONEN[a].attr]), s = T.hin(z.attraktor);
    Karte.punkt(ctx, s, 5.5 * px, genutzt ? "rgb(228,40,60)" : null, genutzt ? F.papier : F.gedaempft, px * 1.4);
    Karte.text(ctx, tx({ de: "Attraktor", en: "Attractor" }), [s[0] + 8 * px, s[1]], genutzt ? F.tinte : F.gedaempft, px, 10);
    // Maßstab 20 m
    const m20 = 20 * T.k, x0 = L.plan[0] + 14 * px, y0 = L.plan[1] + L.plan[3] - 14 * px;
    Karte.linie(ctx, [[x0, y0], [x0 + m20, y0]], F.tinte, px * 2);
    Karte.text(ctx, "20 m", [x0 + m20 + 6 * px, y0], F.tinte, px, 10);
    Karte.text(ctx, tx({ de: "LAGEPLAN", en: "SITE PLAN" }), [L.plan[0] + 14 * px, L.plan[1] + 14 * px], F.gedaempft, px, 10);
    ctx.restore();
  }

  /* ---------------------------------------------------------------- Axonometrie (_gemeinsam/axonometrie.js) */
  function ansicht(z, p) {
    const ph = p.neigung * D2R, cp = Math.cos(ph), sp = Math.sin(ph);
    const bb = Geo.bbox(z._plot0 || (z._plot0 = z.plot.map(q => q.slice()))), mx = (bb.x0 + bb.x1) / 2, my = (bb.y0 + bb.y1) / 2, r = Math.hypot(bb.b, bb.h) / 2 * 1.05;
    const [x, y, w, h0] = L.axo, h = h0 - 96, hz = 40;            // unten Platz für die Variantenreihe
    const k = Math.min(w * 0.94 / (2 * r), (h - 30) / (2 * r * sp + hz * cp));
    return Axo.ansicht({ drehung: p.drehung, neigung: p.neigung, mitte: [mx, my], k, ox: x + w / 2, oy: y + 24 + (h - 24) / 2 + k * (hz * cp) / 2 });
  }
  /** Teil eines Baukörpers für die Zeichenreihenfolge in Stücke ≤ 9 m entlang seiner Kante zerlegen; innere Schnittkanten merken */
  function stuecke(z, poly, fi) {
    if (fi == null || !z.rahmen[fi]) return [{ P: poly, innen: () => false }];
    const f = z.rahmen[fi], [ua, ub] = Modell.uBereich(f, poly), n = Math.max(1, Math.ceil((ub - ua) / 9));
    if (n === 1) return [{ P: poly, innen: () => false }];
    const out = [], d = (ub - ua) / n;
    for (let j = 0; j < n; j++) {
      const a = ua + j * d, b = a + d, P = Modell.clip(poly, [Modell.uMin(f, a), Modell.uMax(f, b)]);
      if (!P.length) continue;
      const auf = (q, c) => Math.abs(Modell.uv(f, q)[0] - c) < 1e-6;
      out.push({ P, innen: (q1, q2) => (j > 0 && auf(q1, a) && auf(q2, a)) || (j < n - 1 && auf(q1, b) && auf(q2, b)) });
    }
    return out;
  }
  const schatte = (c, f) => Sim.css(c.map(x => Math.max(0, Math.min(255, Math.round(x * f)))));
  /** Prisma von z0 bis z1: Seiten, die zum Betrachter zeigen (Licht von Nordwesten), Dach; innere Schnittkanten ohne Linie */
  function prisma(ctx, A, P, innen, z0, z1, farbe, kante, lw) {
    Axo.prisma(ctx, A, P, { h0: z0, h1: z1, ohne: innen, join: "round", kante, lw, dach: Sim.css(farbe),
      seite: w => schatte(farbe, 0.58 + 0.2 * (w.n[0] * 0.6 - w.n[1] * 0.8 + 1) / 2) });
  }
  function zeichneAxo(ctx, z, p, F) {
    const A = ansicht(z, p), px = F.px, gh = p.gh;
    ctx.save(); ctx.beginPath(); ctx.rect(...L.axo); ctx.clip();
    const boden = (P, fuell, strich, lw, gestr) => { const Q = P.map(q => A.p(q[0], q[1], 0)); Karte.poly(ctx, Q, fuell, null); if (strich) Karte.linie(ctx, Q.concat([Q[0]]), strich, lw, gestr); };
    boden(z.plot, F.dunkel ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", F.gedaempft, px * 0.8);
    if (p.zeigeAbstand && z.umriss.length) boden(z.umriss, null, ABSTAND_LINIE, px * 0.9, [4 * px, 3 * px]);
    const basis = masse(F), dachF = Sim.mische(basis, [255, 255, 255], 0.28), kante = F.dunkel ? "rgba(10,10,20,0.55)" : "rgba(10,10,40,0.45)";
    const teile = [];
    for (const st of z.st) {
      const fi = st.rahmen.length === 1 ? st.rahmen[0] : null, farbe = st.markiert && st.markiert !== "dach" ? ORANGE : st.art === "hof" ? Sim.mische(basis, F.dunkel ? [120, 200, 190] : [20, 140, 130], 0.35) : basis;
      for (const s of stuecke(z, st.poly, fi)) {
        const dach = st.dg ? st.dach.flatMap(d => Modell.schnitt(d, s.P).length ? [Modell.schnitt(d, s.P)] : []) : [];
        teile.push({ s, st, farbe, dach });
      }
    }
    for (const t of Axo.maler(teile, t => { const c = Geo.schwerpunkt(t.s.P); return A.v(c[0], c[1]); })) {
      prisma(ctx, A, t.s.P, t.s.innen, 0, t.st.g * gh, t.farbe, kante, px * 0.6);
      for (const d of t.dach) prisma(ctx, A, d, () => false, t.st.g * gh, (t.st.g + t.st.dg) * gh, t.st.markiert === "dach" ? ORANGE : dachF, kante, px * 0.6);
    }
    Karte.text(ctx, tx({ de: "AXONOMETRIE · ZIEHEN DREHT", en: "AXONOMETRY · DRAG TO ROTATE" }), [L.axo[0] + 14 * px, L.axo[1] + 14 * px], F.gedaempft, px, 10);
    ctx.restore();
    zeichneReihe(ctx, z, p, F);
  }

  /* ---------------------------------------------------------------- Variantenreihe: GFZ je Variante (ein Punkt je Variante) */
  function reiheFeld() { const [x, y, w, h] = L.axo; return [x + 44, y + h - 74, w - 64, 52]; }
  function reihe(z, p) { const R = z.varianten.filter(r => r.v !== z.v), fo = Modell.folge(p); if (Modell.lage(z, p).k === fo.length) R.push({ v: z.v, GFZ: z.kz.GFZ }); return R; }
  function zeichneReihe(ctx, z, p, F) {
    const N = Math.max(1, p.varianten | 0); if (N < 2) return;
    const [x, y, w, h] = reiheFeld(), px = F.px, R = reihe(z, p), ow_ = Modell.GEBIETE[p.gebiet].gfz;
    const top = Math.max(3.5, ow_ + 0.5, ...R.map(r => r.GFZ + 0.2)), Y = g => y + h - g / top * h, X = v => x + (N === 1 ? w / 2 : v / (N - 1) * w);
    Karte.linie(ctx, [[x, y + h], [x + w, y + h]], F.linie, px);
    Karte.linie(ctx, [[x, Y(ow_)], [x + w, Y(ow_)]], F.gedaempft, px, [3 * px, 3 * px]);
    Karte.text(ctx, (en() ? "guide value " : "Orientierungswert ") + zahl(ow_, 1), [x + w, Y(ow_) - 7 * px], F.gedaempft, px, 9, "right");
    Karte.text(ctx, tx({ de: `GFZ JE VARIANTE · ${z.v + 1}/${N}` + (L.b > L.h ? " · KLICK ZEIGT SIE" : ""), en: `FAR PER VARIANT · ${z.v + 1}/${N}` + (L.b > L.h ? " · CLICK SHOWS IT" : "") }), [x, y - 9 * px], F.gedaempft, px, 9);
    for (const r of R) Karte.punkt(ctx, [X(r.v), Y(r.GFZ)], 3 * px, F.tinte2 || F.tinte, F.papier, px);
    Karte.punkt(ctx, [X(z.v), Y(z.kz.GFZ)], 5 * px, Sim.css(ORANGE), F.papier, px * 1.5);
  }

  /* ---------------------------------------------------------------- Maus */
  let zug = null;
  function klick(z, p, x, y, taste, phase) {
    const [ax, ay, aw, ah] = L.axo, imAxo = x >= ax && x <= ax + aw && y >= ay && y <= ay + ah;
    if (phase === "unten") {
      zug = null;
      const [rx, ry, rw, rh] = reiheFeld(), N = Math.max(1, p.varianten | 0);
      if (N > 1 && x >= rx - 6 && x <= rx + rw + 6 && y >= ry - 6 && y <= ry + rh + 6) {
        const v = Math.round((x - rx) / rw * (N - 1)), fertigeV = reihe(z, p).map(r => r.v);
        if (fertigeV.includes(v)) Modell.zeigeVariante(z, p, v);
        return;
      }
      if (imAxo) { zug = { art: "drehen", x, y, d: p.drehung, n: p.neigung }; return; }
      const T = planTrafo(z, p), q = T.her(x, y);
      const pxM = 1 / (document.getElementById("leinwand")._cssK * T.k);     // Meter je Bildschirmpixel
      if (taste === "rechts") {
        let best = -1, bd = 14 * pxM;
        z.plot.forEach((a, j) => { const d = Geo.abstandSegment(q, a, z.plot[(j + 1) % z.plot.length]).d; if (d < bd) { bd = d; best = j; } });
        if (best >= 0) Modell.wechsleKante(z, p, best);
        return;
      }
      let ecke = -1, bd = 12 * pxM;
      z.plot.forEach((a, i) => { const d = Geo.abstand(a, q); if (d < bd) { bd = d; ecke = i; } });
      zug = ecke >= 0 ? { art: "ecke", i: ecke } : { art: "attraktor" };
      if (zug.art === "attraktor") Modell.setzeAttraktor(z, p, q);
      return;
    }
    if (!zug) return;
    if (zug.art === "drehen") {
      if (!window.SIM) return;
      const r = Axo.drehen(zug, x, y, { fd: 0.4, fn: 0.25, nMin: 15 });
      if (r.drehung !== p.drehung) window.SIM.setze("drehung", r.drehung);
      if (r.neigung !== p.neigung) window.SIM.setze("neigung", r.neigung);
      return;
    }
    const T = planTrafo(z, p), q = T.her(x, y), bb = bereich(z, p);
    const qq = [Math.max(bb.x0, Math.min(bb.x1, q[0])), Math.max(bb.y0, Math.min(bb.y1, q[1]))];
    if (zug.art === "ecke") Modell.verschiebeEcke(z, p, zug.i, qq);
    else Modell.setzeAttraktor(z, p, qq);
  }

  /* ---------------------------------------------------------------- Parameter */
  const AK = Modell.AKTIONEN;
  const AKT_OPT = [{ wert: "keine", name: { de: "–", en: "–" } }].concat(Object.keys(AK).map(k => ({ wert: k, name: { de: AK[k].de, en: AK[k].en } })));
  const folgeVon = (...a) => { const o = {}; Modell.SLOTS.forEach((s, i) => { o[s] = a[i] || "keine"; }); return o; };
  const VORLAGEN = [
    { wert: "alle", name: { de: "Rundgang (sechs Aktionen)", en: "Tour (six actions)" }, f: folgeVon("durch", "rsKante", "hoehe", "turm", "hof", "dach") },
    { wert: "p1", name: { de: "Paper, Vorschlag 1: Durchgänge → Türme", en: "Paper, proposal 1: breaks → towers" }, f: folgeVon("durch", "turm") },
    { wert: "p2", name: { de: "Paper, Vorschlag 2: breite Durchgänge → Türme", en: "Paper, proposal 2: broad breaks → towers" }, f: Object.assign(folgeVon("durch", "turm"), { zdEinzel: 14, zdFlaeche: 4000 }) },
    { wert: "p3", name: { de: "Paper, Vorschlag 3: Durchgänge → Hofgebäude", en: "Paper, proposal 3: breaks → yard buildings" }, f: folgeVon("durch", "hof") },
    { wert: "offen", name: { de: "Offener Block", en: "Open block" }, f: folgeVon("kanten", "eck", "turm", "dach") },
    { wert: "ecken", name: { de: "Ecken und Rücksprünge", en: "Corners and setbacks" }, f: folgeVon("rsEcke", "rsKante", "eck", "dach") }
  ];
  const G = (de, en_) => ({ de, en: en_ }), opt = O => Object.keys(O).map(k => ({ wert: k, name: { de: O[k].de, en: O[k].en } }));
  const saat = (id, g) => ({ id, gruppe: g, name: G("Saat (seed)", "Seed"), min: 1, max: 99, wert: S[id] });
  const attr = (id, g) => ({ id, gruppe: g, art: "schalter", name: G("am Attraktor (attractor)", "At attractor"), wert: S[id] });
  const GG = G("Grundstück und Abstandsflächen", "Plot and spacing"), GB = G("Grundform", "Basic form"), GZ = G("Zeilen (slabs)", "Slabs"), GF = G("Aktionsfolge", "Sequence of actions");
  const g = k => G(AK[k].de, AK[k].en);
  const PARAMETER = [
    { id: "form", gruppe: GG, art: "auswahl", name: G("Grundstück (plot)", "Plot"), wert: S.form, neustart: true, optionen: opt(Modell.GRUNDSTUECKE) },
    { id: "land", gruppe: GG, art: "auswahl", name: G("Land (Bundesland)", "State (Bundesland)"), wert: S.land, optionen: opt(Modell.LAENDER) },
    { id: "gebiet", gruppe: GG, art: "auswahl", name: G("Baugebiet", "Zoning (Baugebiet)"), wert: S.gebiet, optionen: opt(Modell.GEBIETE) },
    { id: "strasse", gruppe: GG, name: G("Straßenbreite (dist to public streets ×2) m", "Street width m"), min: 6, max: 40, wert: S.strasse },
    { id: "typ", gruppe: GB, art: "auswahl", name: G("Typologie", "Typology"), wert: S.typ, optionen: [{ wert: "block", name: G("Blockrand (block)", "Perimeter block") }, { wert: "zeilen", name: G("Zeilen (slabs)", "Slabs") }] },
    { id: "tiefe", gruppe: GB, name: G("Gebäudetiefe (building depth) m", "Building depth m"), min: 8, max: 20, schritt: 0.5, wert: S.tiefe },
    { id: "gMin", gruppe: GB, name: G("Geschosse von (floor count)", "Floors from"), min: 1, max: 12, wert: S.gMin },
    { id: "gMax", gruppe: GB, name: G("Geschosse bis", "Floors to"), min: 1, max: 12, wert: S.gMax },
    { id: "gh", gruppe: GB, name: G("Geschosshöhe m", "Floor height m"), min: 2.6, max: 4, schritt: 0.05, wert: S.gh },
    { id: "zFolge", gruppe: GZ, art: "auswahl", name: G("Reihenfolge der Kanten", "Order of edges"), wert: S.zFolge,
      optionen: ["1234", "2341", "3412", "4123", "1324", "2413", "4321"].map(w => ({ wert: w, name: G(w.split("").join("–"), w.split("").join("–")) })) },
    { id: "zR1", gruppe: GZ, name: G("Zeilen an Kante 1", "Slab rows at edge 1"), min: 0, max: 4, wert: S.zR1 },
    { id: "zR2", gruppe: GZ, name: G("Zeilen an Kante 2", "Slab rows at edge 2"), min: 0, max: 4, wert: S.zR2 },
    { id: "zR3", gruppe: GZ, name: G("Zeilen an Kante 3", "Slab rows at edge 3"), min: 0, max: 4, wert: S.zR3 },
    { id: "zR4", gruppe: GZ, name: G("Zeilen an Kante 4", "Slab rows at edge 4"), min: 0, max: 4, wert: S.zR4 },
    { id: "zLaenge", gruppe: GZ, name: G("Zeilenlänge höchstens m", "Max slab length m"), min: 15, max: 100, wert: S.zLaenge },
    { id: "vorlage", gruppe: GF, art: "auswahl", name: G("Vorlage", "Preset"), wert: "alle", optionen: VORLAGEN.map(v => ({ wert: v.wert, name: v.name })),
      folgen: Object.fromEntries(VORLAGEN.map(v => [v.wert, v.f])) },
    ...Modell.SLOTS.map((s, i) => ({ id: s, gruppe: GF, art: "auswahl", name: G(`Aktion ${i + 1}`, `Action ${i + 1}`), wert: S[s], optionen: AKT_OPT })),
    { id: "varianten", gruppe: GF, name: G("Varianten (Nr of options)", "Variants (Nr of options)"), min: 1, max: 100, wert: S.varianten },
    // Kanten löschen
    { id: "kStart", gruppe: g("kanten"), name: G("Startkante (0 = Zufall)", "Start edge (0 = random)"), min: 0, max: 8, wert: S.kStart },
    { id: "kAnzahl", gruppe: g("kanten"), name: G("Anzahl Kanten", "Number of edges"), min: 1, max: 3, wert: S.kAnzahl },
    saat("kSaat", g("kanten")), attr("kAttr", g("kanten")),
    // Rücksprünge an Kanten
    { id: "rkLmin", gruppe: g("rsKante"), name: G("Länge von m", "Length from m"), min: 5, max: 60, wert: S.rkLmin },
    { id: "rkLmax", gruppe: g("rsKante"), name: G("Länge bis m", "Length to m"), min: 5, max: 60, wert: S.rkLmax },
    { id: "rkTmin", gruppe: g("rsKante"), name: G("Tiefe von m", "Depth from m"), min: 1, max: 12, schritt: 0.5, wert: S.rkTmin },
    { id: "rkTmax", gruppe: g("rsKante"), name: G("Tiefe bis m", "Depth to m"), min: 1, max: 12, schritt: 0.5, wert: S.rkTmax },
    { id: "rkAnzahl", gruppe: g("rsKante"), name: G("Anzahl", "Number"), min: 1, max: 4, wert: S.rkAnzahl },
    saat("rkSaat", g("rsKante")), attr("rkAttr", g("rsKante")),
    // Rücksprünge an Ecken
    { id: "reMin", gruppe: g("rsEcke"), name: G("Maß von m", "Size from m"), min: 2, max: 15, schritt: 0.5, wert: S.reMin },
    { id: "reMax", gruppe: g("rsEcke"), name: G("Maß bis m", "Size to m"), min: 2, max: 15, schritt: 0.5, wert: S.reMax },
    { id: "reAnzahl", gruppe: g("rsEcke"), name: G("Anzahl Ecken", "Number of corners"), min: 1, max: 6, wert: S.reAnzahl },
    saat("reSaat", g("rsEcke")), attr("reAttr", g("rsEcke")),
    // Eckdurchgänge
    { id: "ebBreite", gruppe: g("eck"), name: G("Breite (width) m", "Width m"), min: 3, max: 15, schritt: 0.5, wert: S.ebBreite },
    { id: "ebRichtung", gruppe: g("eck"), art: "auswahl", name: G("Schnittrichtung", "Cut direction"), wert: S.ebRichtung,
      optionen: [{ wert: "zufall", name: G("Zufall", "Random") }, { wert: "davor", name: G("in der Kante davor", "In the edge before") }, { wert: "danach", name: G("in der Kante danach", "In the edge after") }, { wert: "beide", name: G("beide (freie Ecke)", "Both (free corner)") }] },
    { id: "ebAnzahl", gruppe: g("eck"), name: G("Anzahl Ecken (0 = alle)", "Corners (0 = all)"), min: 0, max: 6, wert: S.ebAnzahl },
    saat("ebSaat", g("eck")), attr("ebAttr", g("eck")),
    // Zufallsdurchgänge
    { id: "zdModus", gruppe: g("durch"), art: "auswahl", name: G("Vorgabe", "Target"), wert: S.zdModus,
      optionen: [{ wert: "flaeche", name: G("abzuziehende Fläche (subtract area)", "Area to subtract") }, { wert: "breite", name: G("Gesamtbreite (total width)", "Total width") }] },
    { id: "zdFlaeche", gruppe: g("durch"), name: G("Fläche (BGF) m²", "Area (GFA) m²"), min: 0, max: 8000, schritt: 100, wert: S.zdFlaeche },
    { id: "zdBreite", gruppe: g("durch"), name: G("Gesamtbreite m", "Total width m"), min: 4, max: 80, wert: S.zdBreite },
    { id: "zdEinzel", gruppe: g("durch"), name: G("Breite je Durchgang m", "Width per passage m"), min: 3, max: 20, schritt: 0.5, wert: S.zdEinzel },
    saat("zdSaat", g("durch")), attr("zdAttr", g("durch")),
    // Höhe reduzieren
    { id: "rhFlaeche", gruppe: g("hoehe"), name: G("abzuziehende BGF m²", "GFA to subtract m²"), min: 0, max: 10000, schritt: 100, wert: S.rhFlaeche },
    { id: "rhMin", gruppe: g("hoehe"), name: G("Mindestgeschosse", "Min floors"), min: 1, max: 6, wert: S.rhMin },
    saat("rhSaat", g("hoehe")), attr("rhAttr", g("hoehe")),
    // Türme
    { id: "tuAnzahl", gruppe: g("turm"), name: G("Anzahl Türme", "Number of towers"), min: 1, max: 2, wert: S.tuAnzahl },
    { id: "tuFlaeche", gruppe: g("turm"), name: G("Fläche je Turm m²", "Area per tower m²"), min: 80, max: 800, schritt: 10, wert: S.tuFlaeche },
    { id: "tuMax", gruppe: g("turm"), name: G("Zusatzgeschosse höchstens", "Max extra floors"), min: 1, max: 15, wert: S.tuMax },
    saat("tuSaat", g("turm")), attr("tuAttr", g("turm")),
    // Hofgebäude
    { id: "hoTiefe", gruppe: g("hof"), name: G("Tiefe (yards depth) m", "Yards depth m"), min: 6, max: 20, schritt: 0.5, wert: S.hoTiefe },
    { id: "hoGmin", gruppe: g("hof"), name: G("Geschosse von (yards floor cnt)", "Floors from"), min: 1, max: 8, wert: S.hoGmin },
    { id: "hoGmax", gruppe: g("hof"), name: G("Geschosse bis", "Floors to"), min: 1, max: 8, wert: S.hoGmax },
    { id: "hoAnzahl", gruppe: g("hof"), name: G("Anzahl Achsen", "Number of axes"), min: 1, max: 3, wert: S.hoAnzahl },
    { id: "hoRichtung", gruppe: g("hof"), art: "auswahl", name: G("Achse", "Axis"), wert: S.hoRichtung,
      optionen: [{ wert: "laengs", name: G("längs zur längsten Kante", "Along the longest edge") }, { wert: "quer", name: G("quer dazu", "Across it") }] },
    { id: "hoZuschneiden", gruppe: g("hof"), art: "schalter", name: G("zuschneiden (cut the yard slabs?)", "Cut the yard slabs?"), wert: S.hoZuschneiden },
    saat("hoSaat", g("hof")), attr("hoAttr", g("hof")),
    // Dachgeschosse
    { id: "daTiefe", gruppe: g("dach"), name: G("Tiefe (depth) m", "Depth m"), min: 3, max: 14, schritt: 0.5, wert: S.daTiefe },
    { id: "daAusrichtung", gruppe: g("dach"), art: "auswahl", name: G("bündig zu", "Flush with"), wert: S.daAusrichtung,
      optionen: [{ wert: "hof", name: G("Hof (Terrasse zur Straße)", "Yard (terrace to the street)") }, { wert: "strasse", name: G("Straße (Terrasse zum Hof)", "Street (terrace to the yard)") }] },
    { id: "daAnteil", gruppe: g("dach"), name: G("Anteil (amount) %", "Amount %"), min: 10, max: 100, schritt: 5, wert: S.daAnteil },
    saat("daSaat", g("dach")), attr("daAttr", g("dach")),
    // Darstellung
    { id: "drehung", gruppe: G("Darstellung", "Display"), name: G("Drehung", "Rotation"), min: 0, max: 359, wert: 30, format: v => v + "°" },
    { id: "neigung", gruppe: G("Darstellung", "Display"), name: G("Neigung", "Elevation"), min: 15, max: 90, wert: 38, format: v => v + "°" },
    { id: "zeigeAbstand", gruppe: G("Darstellung", "Display"), art: "schalter", name: G("Abstandsfläche zeigen", "Show spacing"), wert: true },
    { id: "zeigeZahlen", gruppe: G("Darstellung", "Display"), art: "schalter", name: G("Geschosszahlen zeigen", "Show floor counts"), wert: true }
  ];

  const ow = (w, grenze) => zahl(w, 2) + (w > grenze + 1e-9 ? " ↑ " : " ") + "(" + (en() ? "guide " : "OW ") + zahl(grenze, 1) + ")";
  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 3, wert: 1 },
    parameter: PARAMETER,
    groesse: () => { aufteilung(); return { b: L.b, h: L.h }; },
    ende: (z, p) => Modell.fertig(z, p),
    klick,
    zeichne(ctx, z, p, F) {
      if (!L) aufteilung();
      ctx.fillStyle = F.papier; ctx.fillRect(0, 0, L.b, L.h);
      zeichnePlan(ctx, z, p, F);
      zeichneAxo(ctx, z, p, F);
      Karte.linie(ctx, L.b > L.h ? [[490, 20], [490, L.h - 20]] : [[20, 570], [L.b - 20, 570]], F.linie, F.px);
    },
    legende: (F) => [[geschossFarbe(2), { de: "Lageplan: 2 Geschosse", en: "Site plan: 2 floors" }], [geschossFarbe(6), { de: "6", en: "6" }], [geschossFarbe(12), { de: "12 und mehr", en: "12 and more" }],
      [Sim.css(ORANGE), { de: "letzte Aktion", en: "last action" }], [ABSTAND_LINIE, { de: "Abstandsfläche", en: "Spacing (Abstandsfläche)" }], ["rgb(228,40,60)", { de: "Attraktor", en: "Attractor" }]],
    kennzahlen(z, p) {
      const K = z.kz, fo = Modell.folge(p), Gb = Modell.GEBIETE[p.gebiet], st = z.stand;
      const naechste = z.t < fo.length ? AK[fo[z.t]] : { de: "– (fertig)", en: "– (done)" };
      const letzte = z.log.length ? z.log[z.log.length - 1] : { de: "–", en: "–" };
      return [
        [G("Nächste Aktion", "Next action"), z.t < fo.length ? { de: `${z.t + 1}/${fo.length} ${naechste.de}`, en: `${z.t + 1}/${fo.length} ${naechste.en}` } : naechste],
        [G("Letzter Schritt", "Last step"), letzte],
        [G("Variante", "Variant"), `${z.v + 1}/${Math.max(1, p.varianten | 0)}`],
        [G("Grundstück", "Plot"), zahl(K.A) + " m²"],
        [G("Grundfläche (GR)", "Footprint"), zahl(K.GR) + " m²"],
        [G("Bruttogeschossfläche (BGF)", "Gross floor area (GFA)"), zahl(K.BGF) + " m²"],
        [G("GRZ (§ 19 BauNVO)", "Site coverage (GRZ)"), ow(K.GRZ, Gb.grz)],
        [G("GFZ (§ 20, Vollgeschosse)", "FAR (GFZ, full storeys)"), ow(K.GFZ, Gb.gfz)],
        [G("Geschosse", "Floors"), K.stuecke ? `${K.gmin}–${K.gmax}` : "–"],
        [G("Höhe H der Grundform", "Height H of basic form"), zahl(z.H, 1) + " m (" + z.G + " × " + zahl(p.gh, 2) + " m)"],
        [G("Abstandsfläche T", "Spacing depth T"), `${zahl(z.T, 2)} m = max(${zahl(st.min, 1)}; ${zahl(st.f, 3)} · H)`],
        [G("Baukörper (Fragmente)", "Volumes (fragments)"), String(K.teile)]
      ];
    }
  });
})();
