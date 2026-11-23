/* Isovist 3D · Bedienung und Darstellung (Modelllogik in modell.js)
   Stadt in eigener Axonometrie (Parallelprojektion, drehbar per Ziehen), Prismen von hinten nach vorn gezeichnet, Strahlen nach
   Kategorie gefärbt darüber; kleine Draufsicht unten rechts zum Setzen des Standpunkts.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const B = 1000, H = 720, D2R = Math.PI / 180;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 1) => isFinite(v) ? v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n }) : "–";
  const css = (c, a) => a == null ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mal = (c, f) => [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)];

  /** Farben der Strahlkategorien 0 Himmel, 1 Hindernis, 2 Boden – je Darstellung */
  const STRAHL = { dunkel: [[92, 200, 255], [255, 79, 154], [226, 176, 74]], hell: [[24, 136, 204], [209, 0, 106], [160, 112, 22]] };
  const strahlFarbe = (k, F) => (F.dunkel ? STRAHL.dunkel : STRAHL.hell)[k];
  /** Farbe eines Gebäudes: t < 0 nicht gesehen (Swatch grau), sonst Gradient der Datei oder der gelbe Swatch; im Dunkeln das Dunkelblau etwas heller */
  function gebFarbe(t, p, F) {
    if (t < 0) return F.dunkel ? [150, 150, 154] : Modell.GRAU;
    if (p.faerbung === "gelb") return Modell.GELB;
    const c = Modell.verlauf(t);
    return F.dunkel && t <= 0.0341 ? c.map((v, i) => Math.round(v + [40, 55, 50][i] * (1 - t / 0.0341))) : c;
  }

  /* ---------------------------------------------------------------- Draufsicht (Einsatz unten rechts) */
  function einsatz(z) {
    const w = 270, k = w / z.b, h = z.h * k, kopf = 22;
    return { x: B - w - 14, y: H - h - 14, w, h, k, kopf };
  }
  const imEinsatz = (E, x, y) => x >= E.x && x <= E.x + E.w && y >= E.y && y <= E.y + E.h;
  const ausEinsatz = (E, x, y) => [(x - E.x) / E.k, (y - E.y) / E.k];
  const inEinsatz = (E, q) => [E.x + q[0] * E.k, E.y + q[1] * E.k];

  /* ---------------------------------------------------------------- Projektion */
  /** Ansicht: Drehung θ um die Hochachse, Neigung φ; x nach Osten, y nach Süden, z nach oben. Bei φ = 90° ist es der Plan. */
  function ansicht(z, p) {
    const th = p.drehung * D2R, ph = p.neigung * D2R, c = Math.cos(th), s = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
    const zoom = p.zoom || 1, f = Math.min(1, (zoom - 1) / 2);
    const mx = z.b / 2 + (z.o[0] - z.b / 2) * f, my = z.h / 2 + (z.o[1] - z.h / 2) * f, mz = 10;
    const r = Math.hypot(z.b, z.h) / 2;
    const k = Math.min((B * 0.94) / (2 * r), (H * 0.9) / (2 * r * sp + 50 * cp)) * zoom;
    const cx = B / 2 - 70, cy = H / 2 - 10;
    return {
      c, s, cp, sp, k,
      /** Bildpunkt [x, y] eines Raumpunkts */
      p(x, y, q) { const dx = x - mx, dy = y - my, u = dx * c - dy * s, w = dx * s + dy * c; return [cx + k * u, cy + k * (w * sp - (q - mz) * cp)]; },
      /** Tiefe (größer = weiter hinten) */
      tiefe(x, y, q) { const dx = x - mx, dy = y - my, w = dx * s + dy * c; return -(w * cp + (q - mz) * sp); },
      /** zeigt eine waagerechte Normale [nx, ny] zum Betrachter? */
      vorn(nx, ny) { return nx * s + ny * c > 1e-9; }
    };
  }

  function flaeche(ctx, P, fuell, strich, lw) {
    ctx.beginPath(); P.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
    if (fuell) { ctx.fillStyle = fuell; ctx.fill(); }
    if (strich) { ctx.strokeStyle = strich; ctx.lineWidth = lw; ctx.stroke(); }
  }

  /** Ein Prisma: sichtbare Seitenflächen (nach Tiefe sortiert), dann das Dach */
  function zeichnePrisma(ctx, A, q, farbe, F) {
    const P = q.poly, n = P.length, ccw = Geo.flaecheS(P) > 0, kante = css(mal(farbe, F.dunkel ? 0.42 : 0.55)), lw = 0.6 * F.px;
    const seiten = [];
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey) || 1;
      // Außennormale: bei positiver Fläche (flaecheS > 0) ist es (ey, −ex), sonst (−ey, ex)
      const nx = (ccw ? ey : -ey) / l, ny = (ccw ? -ex : ex) / l;
      if (!A.vorn(nx, ny)) continue;
      seiten.push([A.tiefe((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, q.H / 2), a, b, nx, ny]);
    }
    seiten.sort((u, v) => v[0] - u[0]);
    for (const [, a, b, nx, ny] of seiten) {
      const licht = 0.5 + 0.3 * (nx * -0.6 + ny * -0.8 + 1) / 2;     // Licht von Nordwesten, Dach am hellsten
      flaeche(ctx, [A.p(a[0], a[1], 0), A.p(b[0], b[1], 0), A.p(b[0], b[1], q.H), A.p(a[0], a[1], q.H)], css(mal(farbe, licht)), kante, lw);
    }
    flaeche(ctx, P.map(v => A.p(v[0], v[1], q.H)), css(farbe), kante, lw);
  }

  /* ---------------------------------------------------------------- Ziehen dreht die Ansicht, Klick in der Draufsicht setzt den Standpunkt */
  let zug = null;
  function klick(z, p, x, y, taste, phase) {
    const E = einsatz(z);
    if (phase === "unten") zug = imEinsatz(E, x, y) ? { art: "plan" } : y >= E.y - E.kopf && x >= E.x ? null : { art: "drehen", x, y, d: p.drehung, n: p.neigung };
    if (!zug) return;
    if (zug.art === "plan") {
      const q = ausEinsatz(E, Math.max(E.x, Math.min(E.x + E.w, x)), Math.max(E.y, Math.min(E.y + E.h, y)));
      if (taste === "rechts") { if (window.SIM) window.SIM.setze("richtung", Math.round(Modell.richtungZu(z.o, q))); }
      else Modell.setzeStandpunkt(z, p, q);
      return;
    }
    if (phase === "unten" || !window.SIM) return;
    const d = Math.round(((zug.d - (x - zug.x) * 0.3) % 360 + 360) % 360), n = Math.round(Math.max(10, Math.min(90, zug.n + (y - zug.y) * 0.15)));
    if (d !== p.drehung) window.SIM.setze("drehung", d);
    if (n !== p.neigung) window.SIM.setze("neigung", n);
  }

  const ISO = { de: "Isovist 3D", en: "Isovist 3D" }, GEB = { de: "Gebäude", en: "Buildings" }, ABL = { de: "Abspielen", en: "Playback" }, ANS = { de: "Ansicht", en: "View" };
  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "reichweite", gruppe: ISO, name: { de: "Reichweite (Viewing Range) m", en: "Viewing range (m)" }, min: 0, max: 360, schritt: 1, wert: S.reichweite },
      { id: "praezision", name: { de: "Strahlen je Richtung (Precision)", en: "Rays per direction (precision)" }, min: 1, max: 400, schritt: 1, wert: S.praezision },
      { id: "hwinkel", name: { de: "Horizontaler Blickwinkel (Horizontal Viewing Angle) °", en: "Horizontal viewing angle °" }, min: 0, max: 360, schritt: 1, wert: S.hwinkel },
      { id: "vwinkel", name: { de: "Vertikaler Blickwinkel (Vertical Viewing Angle) °", en: "Vertical viewing angle °" }, min: 0, max: 180, schritt: 1, wert: S.vwinkel },
      { id: "versatz", name: { de: "Vertikaler Versatz (Vertical Angle Offset) °", en: "Vertical angle offset °" }, min: -100, max: 100, schritt: 1, wert: S.versatz },
      { id: "richtung", name: { de: "Blickrichtung (Viewing Direction) °", en: "Viewing direction °" }, min: 0, max: 360, schritt: 1, wert: S.richtung },
      { id: "augenhoehe", name: { de: "Augenhöhe m", en: "Eye height (m)" }, min: 0, max: 60, schritt: 0.1, wert: S.augenhoehe },
      { id: "boden", art: "schalter", name: { de: "Boden bei z = 0 (Ground at zero)", en: "Ground at zero" }, wert: S.boden },
      { id: "geometrie", art: "schalter", name: { de: "Isovist-Geometrie (Calculate Isovist Geometry)", en: "Calculate isovist geometry" }, wert: S.geometrie },
      { id: "filter", art: "auswahl", name: { de: "Strahlen zeigen (Filter rays)", en: "Show rays (filter)" }, wert: "alle",
        optionen: [{ wert: "alle", name: { de: "alle", en: "all" } }, { wert: "0", name: { de: "0 = Himmel", en: "0 = sky" } },
                   { wert: "1", name: { de: "1 = Hindernis", en: "1 = obstacle" } }, { wert: "2", name: { de: "2 = Boden", en: "2 = floor" } },
                   { wert: "keine", name: { de: "keine", en: "none" } }] },
      { id: "faerbung", gruppe: GEB, art: "auswahl", name: { de: "Färbung", en: "Colouring" }, wert: "verlauf",
        optionen: [{ wert: "verlauf", name: { de: "Verlauf (Gradient)", en: "gradient" } }, { wert: "gelb", name: { de: "gesehen gelb (Swatch)", en: "seen in yellow (swatch)" } }] },
      { id: "mass", art: "auswahl", name: { de: "Maß (Object Visibility)", en: "Measure (object visibility)" }, wert: "treffer",
        optionen: [{ wert: "treffer", name: { de: "Strahltreffer (Original)", en: "ray hits (original)" } }, { wert: "huelle", name: { de: "Treffer je 100 m² Hüllfläche", en: "hits per 100 m² envelope" } }] },
      { id: "ablauf", gruppe: ABL, art: "auswahl", name: { de: "Ein Schritt", en: "One step" }, wert: S.ablauf,
        optionen: [{ wert: "drehen", name: { de: "Blickrichtung dreht", en: "view direction turns" } }, { wert: "wandern", name: { de: "Standpunkt wandert", en: "viewpoint walks" } }] },
      { id: "drehschritt", name: { de: "Drehung je Schritt °", en: "Turn per step °" }, min: 0.5, max: 15, schritt: 0.5, wert: S.drehschritt },
      { id: "schrittweite", name: { de: "Weg je Schritt (Anteil)", en: "Path per step (fraction)" }, min: 0.001, max: 0.02, schritt: 0.001, wert: S.schrittweite },
      { id: "drehung", gruppe: ANS, name: { de: "Drehung", en: "Rotation" }, min: 0, max: 359, wert: 25, format: v => v + "°" },
      { id: "neigung", name: { de: "Neigung", en: "Elevation" }, min: 10, max: 90, wert: 42, format: v => v + "°" },
      { id: "zoom", name: { de: "Vergrößerung", en: "Zoom" }, min: 1, max: 3, schritt: 0.1, wert: 1.3 }
    ],
    groesse: () => ({ b: B, h: H }),
    klick,
    zeichne(ctx, z, p, F) {
      const A = ansicht(z, p), Er = z.E, W = Modell.gebaeudeWerte(Er, z.S, p.mass), e = Math.max(0, p.augenhoehe), px = F.px;
      // Boden: Stadtfläche, Platz
      flaeche(ctx, [[0, 0], [z.b, 0], [z.b, z.h], [0, z.h]].map(q => A.p(q[0], q[1], 0)), F.dunkel ? "#101013" : "#f2f2f4", F.linie, px);
      if (z.szene.platz) flaeche(ctx, z.szene.platz.map(q => A.p(q[0], q[1], 0)), F.dunkel ? "#18181d" : "#e6e6ea", null);
      // Gebäude von hinten nach vorn
      const ord = z.S.prismen.map((q, i) => { const c = Geo.schwerpunkt(q.poly); return [A.tiefe(c[0], c[1], q.H / 2), i]; }).sort((u, v) => v[0] - u[0]);
      for (const [, i] of ord) { const q = z.S.prismen[i]; zeichnePrisma(ctx, A, q, gebFarbe(W.t[q.obj], p, F), F); }
      // Strahlen nach Kategorie (je Kategorie ein Pfad). Gezeichnet wird ein Raster aus höchstens etwa 50 × 50 Strahlen (jede
      // k-te Spalte und Zeile), damit die Gebäude darunter lesbar bleiben; gerechnet wird mit allen.
      const o3 = A.p(z.o[0], z.o[1], e), sk = Math.max(1, Math.round(Math.max(Er.nh, Er.nv) / 50));
      const zeige = r => (Math.floor(r / Er.nv) % sk === 0) && ((r % Er.nv) % sk === 0);
      if (p.filter !== "keine") for (let k = 0; k < 3; k++) {
        if (p.filter !== "alle" && +p.filter !== k) continue;
        ctx.beginPath();
        for (let r = 0; r < Er.n; r++) if (Er.kat[r] === k && zeige(r)) { const q = A.p(Er.end[3 * r], Er.end[3 * r + 1], Er.end[3 * r + 2]); ctx.moveTo(o3[0], o3[1]); ctx.lineTo(q[0], q[1]); }
        ctx.strokeStyle = css(strahlFarbe(k, F), 0.4); ctx.lineWidth = 0.6 * px; ctx.stroke();
      }
      // Isovist-Geometrie: Endpunkte aller Strahlen
      if (p.geometrie) for (let k = 0; k < 3; k++) {
        if (p.filter !== "alle" && p.filter !== "keine" && +p.filter !== k) continue;
        ctx.fillStyle = css(strahlFarbe(k, F)); const d = 1.4 * px;
        for (let r = 0; r < Er.n; r++) if (Er.kat[r] === k) { const q = A.p(Er.end[3 * r], Er.end[3 * r + 1], Er.end[3 * r + 2]); ctx.fillRect(q[0] - d / 2, q[1] - d / 2, d, d); }
      }
      // Standpunkt: Lot vom Boden zum Auge, Blickrichtung
      const g0 = A.p(z.o[0], z.o[1], 0), u = Modell.grundrichtung(z.blick), pf = A.p(z.o[0] + u[0] * 14, z.o[1] + u[1] * 14, e);
      ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(o3[0], o3[1]); ctx.strokeStyle = F.tinte; ctx.lineWidth = 1.2 * px; ctx.stroke();
      Karte.pfeil(ctx, o3, [pf[0] - o3[0], pf[1] - o3[1]], Math.hypot(pf[0] - o3[0], pf[1] - o3[1]), F.tinte, 1.6 * px);
      Karte.punkt(ctx, o3, 4.5 * px, F.akzent, F.tinte, 1.2 * px);

      // Draufsicht
      const E = einsatz(z);
      ctx.save();
      flaeche(ctx, [[E.x, E.y - E.kopf], [E.x + E.w, E.y - E.kopf], [E.x + E.w, E.y + E.h], [E.x, E.y + E.h]], F.papier, F.linie, px);
      ctx.beginPath(); ctx.rect(E.x, E.y, E.w, E.h); ctx.clip();
      // Grundriss-Isovist in Augenhöhe: Endpunkte der Zeile mit der kleinsten Neigung, ins Waagerechte gelegt
      let jm = 0; for (let j = 1; j < Er.nv; j++) if (Math.abs(Er.B.neigung[j]) < Math.abs(Er.B.neigung[jm])) jm = j;
      const fan = [inEinsatz(E, z.o)];
      for (let i = 0; i < Er.nh; i++) { const r = i * Er.nv + jm; fan.push(inEinsatz(E, [Er.end[3 * r], Er.end[3 * r + 1]])); }
      if (p.hwinkel < 360) fan.push(fan[0]); else fan.shift();
      for (const q of z.S.prismen) flaeche(ctx, q.poly.map(v => inEinsatz(E, v)), css(gebFarbe(W.t[q.obj], p, F)), null);
      flaeche(ctx, fan, css(F.rgb.akzent || [70, 73, 225], 0.28), F.akzent, 1 * px);
      if (p.ablauf === "wandern") Karte.linie(ctx, z.pfad.map(v => inEinsatz(E, v)), F.dunkel ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)", px, [3 * px, 3 * px]);
      const oi = inEinsatz(E, z.o);
      Karte.pfeil(ctx, oi, u, 12 * px, F.tinte, 1.4 * px);
      Karte.punkt(ctx, oi, 3.5 * px, F.akzent, F.tinte, px);
      ctx.restore();
      // Kopfzeile: auf schmalen Bildschirmen (px groß) nur der Nordpfeil, sonst passt der Text nicht in den Rahmen
      const ts = Math.min(px, 1.1);
      if (px <= 1.6) Karte.text(ctx, de() ? "DRAUFSICHT · KLICK: STANDPUNKT" : "PLAN · CLICK: VIEWPOINT", [E.x + 6, E.y - E.kopf / 2], F.tinte2 || F.tinte, ts, 10);
      Karte.text(ctx, "N ↑", [E.x + E.w - 6, E.y - E.kopf / 2], F.tinte2 || F.tinte, px <= 1.6 ? ts : E.kopf * 0.6 / 10, 10, "right");
    },
    legende: (F, p) => {
      const L = [[css(strahlFarbe(0, F)), { de: "0 Himmel", en: "0 sky" }], [css(strahlFarbe(1, F)), { de: "1 Hindernis", en: "1 obstacle" }],
                 [css(strahlFarbe(2, F)), { de: "2 Boden", en: "2 floor" }], [css(gebFarbe(-1, p, F)), { de: "nicht gesehen", en: "not seen" }]];
      if (p.faerbung === "gelb") L.push([css(Modell.GELB), { de: "gesehen", en: "seen" }]);
      else { const V = Modell.VERLAUF.faktoren; V.forEach((f, i) => L.push([css(gebFarbe(f, p, F)), i === 0 ? { de: "wenig", en: "little" } : i === V.length - 1 ? { de: "stark gesehen", en: "highly visible" } : ""])); }
      return L.concat([[F.akzent, { de: "Standpunkt", en: "Viewpoint" }]]);
    },
    kennzahlen: (z, p) => {
      const Er = z.E, A = z.A, L = z.L, a = Modell.auswertung(z), pr = x => zahl(100 * x, 1) + " %";
      const K = [
        [{ de: "Strahlen", en: "Rays" }, `${Er.n} (${Er.nh} × ${Er.nv})`],
        [{ de: "0 Himmel", en: "0 sky" }, `${pr(A.anteil[0])} · ${A.zahl[0]}`],
        [{ de: "1 Hindernis", en: "1 obstacle" }, `${pr(A.anteil[1])} · ${A.zahl[1]}`],
        [{ de: "2 Boden", en: "2 floor" }, `${pr(A.anteil[2])} · ${A.zahl[2]}`],
        [{ de: "Himmel nach Raumwinkel", en: "Sky by solid angle" }, pr(A.raum[0])],
        [{ de: "Strahllänge min · max", en: "Ray length min · max" }, `${zahl(L.min)} · ${zahl(L.max)} m`],
        [{ de: "… Mittel · Median", en: "… mean · median" }, `${zahl(L.mittel)} · ${zahl(L.median)} m`],
        [{ de: "… Standardabweichung", en: "… standard deviation" }, zahl(L.std) + " m"],
        [{ de: "… Summe", en: "… sum" }, zahl(L.summe, 0) + " m"],
        [{ de: "gesehene Gebäude", en: "Buildings seen" }, `${a.sichtbar} / ${a.gebaeude}`]
      ];
      if (a.bester >= 0) K.push([{ de: "meistgesehen", en: "Most seen" }, (z.S.objekte[a.bester].name === "kirche" ? (de() ? "Kirche" : "church") : z.S.objekte[a.bester].name) + " · " + Er.treffer[a.bester]]);
      if (z.szene.kirche) K.push([{ de: "Kirche: Treffer", en: "Church: hits" }, String(a.kirche)]);
      K.push([{ de: "Blickrichtung", en: "View direction" }, zahl(z.blick, 0) + "°"]);
      if (p.geometrie) K.push([{ de: "Isovist-Volumen", en: "Isovist volume" }, zahl(z.V, 0) + " m³"]);
      return K;
    }
  });
  // Beschriftungen im Canvas hängen an der Sprache: nach dem Sprachwechsel neu zeichnen
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => { if (window.SIM) window.SIM.zeichne(); }));
})();
