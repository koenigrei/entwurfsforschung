/* KREMLAS · Dichte Packung · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  // Seite (neu, 23.11.2026): "packung" (lab/kremlas/) oder "palladio" (lab/kremlas/palladio/, Vorbilder aus vorbilder_palladio.js)
  const SEITE = window.KREMLAS_SEITE || "packung", FA = Modell.FASSUNGEN;
  const VORBILDER = Object.keys(FA).filter(f => f.startsWith(SEITE === "palladio" ? "pal_" : SEITE === "siza" ? "sz_" : "§") && !FA[f].versteckt);   // Siza: Häuser (EG + OG), das OG läuft versteckt mit
  const START = VORBILDER.includes("pal_emo") ? "pal_emo" : VORBILDER[0];   // Villa Emo: schon ein einzelner Lauf wird gültig (Saat 1: 97 % Ähnlichkeit); Siza: Typ Ab, Erdgeschoss
  const S = SEITE !== "packung" && VORBILDER.length
    ? Object.assign({}, Modell.STANDARD, ...Modell.REGLER.map(k => ({ [k]: FA[START][k] })), { fassung: START, plan: true, topo: false, vorbild: true })
    : Object.assign({ vorbild: false }, Modell.STANDARD);
  // Feld je Zustand (Vorbilder haben eigene Maße): vor dem Zeichnen setzen, B und H danach lesen
  let B = Modell.BREITE, H = Modell.HOEHE;
  const feld = z => { Modell.setzeFeld(z && z.feld); B = Modell.BREITE; H = Modell.HOEHE; };
  const mitVorbild = z => !!(z && z.programm && Modell.PROGRAMME[z.programm].vorbild);
  const G_F = { de: "Fassung", en: "Version" }, G_ES = { de: "Evolutionsstrategie", en: "Evolution strategy" },
        G_K = { de: "Kollisionserkennung", en: "Collision detection" }, G_T = { de: "Topologie", en: "Topology" }, G_D = { de: "Darstellung", en: "Display" };
  const en = () => document.documentElement.lang === "en";
  const zahl = v => Math.round(v).toLocaleString(en() ? "en" : "de");
  const proz = v => Math.round(v * 100) + " %";
  // Farben: Räume grau mit dunklen Wänden wie im Original (Color.Gray, Pen Black), Nachbarschaften orange (Color.Orange)
  const ORANGE = "#f08c00", GRUEN = F => F.dunkel ? "#40c057" : "#2b8a3e", BLAU = F => F.dunkel ? "#748ffc" : "#3b5bdb";
  const raumFarbe = F => F.dunkel ? "#6f6f74" : "#9b9b9f";
  const RECHTS = 170, UNTEN = 110, LUECKE = 14;
  const GESCHOSS = 36, UNTERSCHRIFT = 24;                              // Haus (neu): Abstand zwischen EG und OG, Zeile für die Geschossnamen
  const haus = z => !!(z && z.og);
  const breiteVon = z => haus(z) ? 2 * B + GESCHOSS : B, hoeheVon = z => haus(z) ? H + UNTERSCHRIFT : H;
  const quer = () => window.innerWidth > 900;
  const mitTopo = z => z.ablauf === "topologie";

  /** Verlauf: kleinste Überlappung Sg (grün) und in den Fassungen mit Topologie die Distanzen f2 (blau, gestrichelt), logarithmisch */
  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, r = x0 + w, o = y0 + fs * 1.8, u = y0 + h - fs * 1.6, hh = u - o;
    const V = z.verlauf, D = z.verlaufD, topo = mitTopo(z);
    const vmax = Math.max(1000, ...V.slice(0, 50)), lg = v => Math.log10(Math.max(1, v));
    const X = Math.max(100, (V.length - 1) * z.dichte), sx = i => l + w * i * z.dichte / X;
    const sy = v => u - hh * Math.min(1, lg(v) / lg(vmax));
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(r, u); ctx.stroke();
    const linie = (L, farbe, strich) => {
      ctx.strokeStyle = farbe; ctx.lineWidth = 1.5 * F.px; ctx.setLineDash(strich ? [4 * F.px, 3 * F.px] : []); ctx.beginPath();
      const s = Math.max(1, Math.floor(L.length / 400));
      for (let i = 0; i < L.length; i += s) { const x = sx(i), y = sy(L[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      if (L.length) ctx.lineTo(sx(L.length - 1), sy(L[L.length - 1]));
      ctx.stroke(); ctx.setLineDash([]);
    };
    linie(V, GRUEN(F), false);
    if (topo) linie(D, BLAU(F), true);
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText(zahl(vmax), l + 3 * F.px, o - 4 * F.px);
    ctx.fillText("0", l, u + fs * 1.2);
    ctx.textAlign = "right"; ctx.fillText(zahl(X), r, u + fs * 1.2);
    ctx.fillText(en() ? (topo ? "Sg · f2 (log)" : "overlap Sg (log)") : (topo ? "Sg · f2 (log)" : "Überlappung Sg (log)"), r, o - 4 * F.px);
    ctx.restore();
  }

  /* ---------- Grundrissansicht: Räume wachsen in die Restflächen (Modell.grundriss), Wände, Türen, Namen, m² ---------- */
  // Türbreite 0,9 m, folgt dem Maßstab des Feldes (Modell.TUER_PX)
  const planFarbe = F => F.dunkel ? "#2b2b30" : "#fbfaf7", hofFarbe = F => F.dunkel ? "#23362a" : "#e3efe2", restFarbe = F => F.dunkel ? "#4a4a50" : "#c9c7c0";
  const raumName = (z, id) => { const r = Modell.PROGRAMME[z.programm].raeume[id]; return r ? (en() ? r[1] : r[0]) : String(id); };
  const qm = a => (a / (Modell.PX_M * Modell.PX_M)).toLocaleString(en() ? "en" : "de", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " m²";
  function gefuellt(R) {                                               // Anteil des Feldes, der von Räumen bedeckt ist (Raster 5 px)
    let k = 0, n = 0;
    for (let y = 2.5; y < H; y += 5) for (let x = 2.5; x < B; x += 5) { n++; if (R.some(r => x > r.x1 && x < r.x2 && y > r.y1 && y < r.y2)) k++; }
    return k / n;
  }
  /** Plan einer Lösung: mit Mindestmaßen werden kleine Überlappungen geteilt (wie in der Prüfung) */
  const planVon = (z, b) => Modell.grundriss(b, 300, z.mindest ? Modell.TEILE_PX : 0);
  const pruefungVon = (z, b) => z.mindest ? Modell.planPruefung(b, z.paare, z.programm, 300) : null;
  /** Treppe (neu, 25.11.2026): Stufen und Lauflinie mit Punkt am Antritt und Pfeil am Austritt; gerade Treppe (I) längs, zweiläufige
      (U) mit Wendepodest an der Seite gegenüber dem Antritt. tp: {typ, antritt, austritt, halb}, Kanten x0, x1, y0, y1 */
  function zeichneTreppe(ctx, r, tp, F) {
    const k = Modell.PX_M, tritt = 0.27 * k, w = r.x2 - r.x1, h = r.y2 - r.y1;
    ctx.save(); ctx.strokeStyle = F.tinte; ctx.fillStyle = F.tinte; ctx.lineWidth = 1 * F.px;
    const punkt = (x, y) => { ctx.beginPath(); ctx.arc(x, y, 3 * F.px, 0, 2 * Math.PI); ctx.fill(); };
    const pfeil = (x, y, dx, dy) => { const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, e = 7 * F.px; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - ux * e - uy * e * 0.5, y - uy * e + ux * e * 0.5); ctx.lineTo(x - ux * e + uy * e * 0.5, y - uy * e - ux * e * 0.5); ctx.closePath(); ctx.fill(); };
    const stufen = (x1, y1, x2, y2, laengs) => {                       // Stufenlinien quer zur Laufrichtung
      ctx.beginPath();
      if (laengs === "y") { const n = Math.max(2, Math.round((y2 - y1) / tritt)); for (let i = 1; i < n; i++) { const y = y1 + (y2 - y1) * i / n; ctx.moveTo(x1, y); ctx.lineTo(x2, y); } }
      else { const n = Math.max(2, Math.round((x2 - x1) / tritt)); for (let i = 1; i < n; i++) { const x = x1 + (x2 - x1) * i / n; ctx.moveTo(x, y1); ctx.lineTo(x, y2); } }
      ctx.stroke();
    };
    const mitte = { x0: [r.x1, (r.y1 + r.y2) / 2], x1: [r.x2, (r.y1 + r.y2) / 2], y0: [(r.x1 + r.x2) / 2, r.y1], y1: [(r.x1 + r.x2) / 2, r.y2] };
    const rein = 0.15 * k;
    if (tp.typ === "U") {
      const quer = tp.antritt[0] === "y", tief = (quer ? w : h) / 2 * 0.85, an = tp.antritt;   // Wendepodest gegenüber dem Antritt
      const lauf = (halb) => quer ? (halb === "x0" ? [r.x1, r.x1 + w / 2] : [r.x1 + w / 2, r.x2]) : (halb === "y0" ? [r.y1, r.y1 + h / 2] : [r.y1 + h / 2, r.y2]);
      const andere = tp.halb === (quer ? "x0" : "y0") ? (quer ? "x1" : "y1") : (quer ? "x0" : "y0");
      const [a1, a2] = lauf(tp.halb), [b1, b2] = lauf(andere);
      if (quer) {
        const yw = an === "y1" ? r.y1 + tief : r.y2 - tief, ya = an === "y1" ? r.y2 : r.y1;
        stufen(a1, Math.min(yw, ya), a2, Math.max(yw, ya), "y"); stufen(b1, Math.min(yw, ya), b2, Math.max(yw, ya), "y");
        ctx.beginPath(); ctx.moveTo(r.x1 + w / 2, Math.min(yw, ya)); ctx.lineTo(r.x1 + w / 2, Math.max(yw, ya)); ctx.moveTo(r.x1, yw); ctx.lineTo(r.x2, yw); ctx.stroke();
        const s = an === "y1" ? -1 : 1, xa = (a1 + a2) / 2, xb = (b1 + b2) / 2, y0 = ya + s * rein, ym = (an === "y1" ? r.y1 : r.y2) - s * tief / 2;
        ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(xa, y0); ctx.lineTo(xa, ym); ctx.lineTo(xb, ym); ctx.lineTo(xb, y0); ctx.stroke(); punkt(xa, y0); pfeil(xb, y0, 0, -s);
      } else {
        const xw = an === "x1" ? r.x1 + tief : r.x2 - tief, xa0 = an === "x1" ? r.x2 : r.x1;
        stufen(Math.min(xw, xa0), a1, Math.max(xw, xa0), a2, "x"); stufen(Math.min(xw, xa0), b1, Math.max(xw, xa0), b2, "x");
        ctx.beginPath(); ctx.moveTo(Math.min(xw, xa0), r.y1 + h / 2); ctx.lineTo(Math.max(xw, xa0), r.y1 + h / 2); ctx.moveTo(xw, r.y1); ctx.lineTo(xw, r.y2); ctx.stroke();
        const s = an === "x1" ? -1 : 1, ya = (a1 + a2) / 2, yb = (b1 + b2) / 2, x0 = xa0 + s * rein, xm = (an === "x1" ? r.x1 : r.x2) - s * tief / 2;
        ctx.beginPath(); ctx.moveTo(x0, ya); ctx.lineTo(xm, ya); ctx.lineTo(xm, yb); ctx.lineTo(x0, yb); ctx.stroke(); punkt(x0, ya); pfeil(x0, yb, -s, 0);
      }
    } else {
      const laengs = h >= w ? "y" : "x"; stufen(r.x1, r.y1, r.x2, r.y2, laengs);
      const A = mitte[tp.antritt], E = mitte[tp.austritt], dx = Math.sign(E[0] - A[0]), dy = Math.sign(E[1] - A[1]);
      const a = [A[0] + dx * rein, A[1] + dy * rein], e = [E[0] - dx * rein, E[1] - dy * rein];
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); punkt(a[0], a[1]); pfeil(e[0], e[1], dx, dy);
    }
    ctx.restore();
  }
  function zeichnePlan(ctx, z, p, F, b) {
    const R = planVon(z, b), T = Modell.tueren(R, z.paare, Modell.TUER_PX), wand = 3 * F.px, W = pruefungVon(z, b);
    // Restflächen schraffiert: erst alles grau, dann die Räume darüber
    ctx.fillStyle = restFarbe(F); ctx.fillRect(0, 0, B, H);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, B, H); ctx.clip(); ctx.strokeStyle = F.dunkel ? "#5c5c63" : "#b3b0a8"; ctx.lineWidth = 1;
    ctx.beginPath(); for (let d = -H; d < B; d += 8) { ctx.moveTo(d, H); ctx.lineTo(d + H, 0); } ctx.stroke(); ctx.restore();
    const raumVon = r => r.r == null ? r.id : r.r;                      // L-Räume: Schenkel gehört zum Raum r
    for (const r of R) { ctx.fillStyle = z.programm && ["Court", "Open to sky"].includes(Modell.PROGRAMME[z.programm].raeume[raumVon(r)][1]) ? hofFarbe(F) : planFarbe(F); ctx.fillRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1); }
    ctx.fillStyle = F.akzent; ctx.globalAlpha = 0.6;                   // verbliebene Überlappungen
    for (let i = 0; i < R.length; i++) for (let k = i + 1; k < R.length; k++) {
      const x1 = Math.max(R[i].x1, R[k].x1), x2 = Math.min(R[i].x2, R[k].x2), y1 = Math.max(R[i].y1, R[k].y1), y2 = Math.min(R[i].y2, R[k].y2);
      if (x2 > x1 && y2 > y1) ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = F.tinte; ctx.lineWidth = wand; ctx.lineCap = "square";
    for (const r of R) ctx.strokeRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1);
    // L-Räume: keine Wand zwischen Hauptteil und Schenkel
    ctx.strokeStyle = planFarbe(F); ctx.lineWidth = wand + 1.5 * F.px; ctx.lineCap = "butt";
    for (const S of R) {
      if (raumVon(S) === S.id) continue;
      const Hp = R.find(q => q.id === raumVon(S)); if (!Hp) continue;
      const y1 = Math.max(Hp.y1, S.y1) + wand, y2 = Math.min(Hp.y2, S.y2) - wand, x1 = Math.max(Hp.x1, S.x1) + wand, x2 = Math.min(Hp.x2, S.x2) - wand;
      ctx.beginPath();
      if (Math.abs(Hp.x2 - S.x1) <= 2 || Math.abs(S.x2 - Hp.x1) <= 2) { const x = Math.abs(Hp.x2 - S.x1) <= 2 ? (Hp.x2 + S.x1) / 2 : (S.x2 + Hp.x1) / 2; if (y2 > y1) { ctx.moveTo(x, y1); ctx.lineTo(x, y2); } }
      else if (Math.abs(Hp.y2 - S.y1) <= 2 || Math.abs(S.y2 - Hp.y1) <= 2) { const y = Math.abs(Hp.y2 - S.y1) <= 2 ? (Hp.y2 + S.y1) / 2 : (S.y2 + Hp.y1) / 2; if (x2 > x1) { ctx.moveTo(x1, y); ctx.lineTo(x2, y); } }
      ctx.stroke();
    }
    ctx.strokeStyle = F.tinte; ctx.lineWidth = wand; ctx.lineCap = "square";
    // Türen: Wand öffnen, Türblatt und Schwenkbereich in den erschlossenen Raum (beim Eingang in den Flur)
    const mitte = id => { const r = R.find(q => q.id === id); return r ? [(r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2] : [B / 2, H / 2]; };
    ctx.lineCap = "butt";
    for (const t of T) {
      const h = t.l / 2, ziel = mitte(t.b === -1 ? t.a : t.b);
      ctx.strokeStyle = planFarbe(F); ctx.lineWidth = wand + 3 * F.px; ctx.beginPath();
      if (t.senkrecht) { ctx.moveTo(t.x, t.y - h); ctx.lineTo(t.x, t.y + h); } else { ctx.moveTo(t.x - h, t.y); ctx.lineTo(t.x + h, t.y); }
      ctx.stroke();
      if (t.treppe) continue;                                          // Treppe: offener Zugang über die ganze Breite, kein Türblatt
      ctx.strokeStyle = F.tinte; ctx.lineWidth = 1.2 * F.px; ctx.beginPath();
      if (t.senkrecht) {
        const s = ziel[0] >= t.x ? 1 : -1, y0 = t.y - h;               // Angel oben, Blatt in den Zielraum
        ctx.moveTo(t.x, y0); ctx.lineTo(t.x + s * t.l, y0);
        ctx.moveTo(t.x + s * t.l, y0); ctx.arc(t.x, y0, t.l, s > 0 ? 0 : Math.PI, Math.PI / 2, s < 0);
      } else {
        const s = ziel[1] >= t.y ? 1 : -1, x0 = t.x - h;
        ctx.moveTo(x0, t.y); ctx.lineTo(x0, t.y + s * t.l);
        ctx.moveTo(x0, t.y + s * t.l); ctx.arc(x0, t.y, t.l, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0, s > 0);
      }
      ctx.stroke();
      if (t.b === -1) {                                               // Eingang: kleiner Pfeil von außen
        ctx.fillStyle = F.akzentText; ctx.beginPath();
        const e = 9 * F.px;
        if (t.senkrecht) { const s = t.x < B / 2 ? 1 : -1, x = t.x + s * 3; ctx.moveTo(x, t.y); ctx.lineTo(x + s * e, t.y - e * 0.6); ctx.lineTo(x + s * e, t.y + e * 0.6); }
        else { const s = t.y < H / 2 ? 1 : -1, y = t.y + s * 3; ctx.moveTo(t.x, y); ctx.lineTo(t.x - e * 0.6, y + s * e); ctx.lineTo(t.x + e * 0.6, y + s * e); }
        ctx.fill();
      }
    }
    // Treppen mit Stufen und Lauflinie (neu)
    if (z.programm) for (const r of R) { const tp = r.tr && Modell.treppeVon(z.programm, raumVon(r)); if (tp) zeichneTreppe(ctx, r, Object.assign({}, tp, b.spiegel ? spiegleTreppe(tp, b.spiegel) : {}), F); }
    // Beschriftung: Name und Fläche im Grundriss (ohne Raumprogramm: Raumnummer)
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = F.tinte;
    for (const r of R) {
      if (raumVon(r) !== r.id) continue;
      if (r.tr) {                                                      // Treppe: Name klein am Rand, die Stufen bleiben lesbar
        ctx.font = `${9 * F.px}px "Geist Mono", ui-monospace, monospace`; ctx.fillStyle = F.gedaempft;
        ctx.save(); ctx.translate((r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2); if (r.y2 - r.y1 > r.x2 - r.x1) ctx.rotate(-Math.PI / 2);
        ctx.fillText(raumName(z, r.id), 0, 0); ctx.restore(); ctx.fillStyle = F.tinte; continue;
      }                                 // Schenkel: Beschriftung steht im Hauptteil
      const cx = (r.x1 + r.x2) / 2, cy = (r.y1 + r.y2) / 2, teile = R.filter(q => raumVon(q) === r.id);
      const A = W ? W.raeume.find(q => q.id === r.id).flaeche * Modell.PX_M * Modell.PX_M : teile.reduce((q, t) => q + (t.x2 - t.x1) * (t.y2 - t.y1), 0);
      const M2 = W && W.raeume.filter(q => q.raum === r.id), m = M2 && { zuSchmal: M2.some(q => q.zuSchmal), zuKlein: M2.some(q => q.zuKlein) }, mangel = m && (m.zuSchmal || m.zuKlein);
      ctx.font = `${12 * F.px}px "Geist", system-ui, sans-serif`; ctx.fillStyle = mangel ? F.akzentText : F.tinte;
      ctx.fillText(z.programm ? raumName(z, r.id) : (en() ? "Room " : "Raum ") + r.id, cx, cy - 7 * F.px);
      ctx.font = `${10 * F.px}px "Geist Mono", ui-monospace, monospace`; ctx.fillStyle = mangel ? F.akzentText : F.gedaempft;
      ctx.fillText(qm(A), cx, cy + 8 * F.px);
      if (mangel) ctx.fillText(m.zuSchmal ? (en() ? "too narrow" : "zu schmal") : (en() ? "too small" : "zu klein"), cx, cy + 21 * F.px);
      ctx.fillStyle = F.tinte;
    }
    ctx.textBaseline = "alphabetic";
  }

  /** Vorbild (neu): Räume des Vorbilds gestrichelt über dem Plan, in der Spiegelung mit der größten Ähnlichkeit */
  function zeichneVorbild(ctx, z, F, b) {
    const V = Modell.PROGRAMME[z.programm].vorbild, A = Modell.aehnlichkeit(b, z.programm), k = Modell.PX_M;
    const sx = A && A.gespiegelt.x, sy = A && A.gespiegelt.y;
    ctx.save(); ctx.strokeStyle = F.akzentText; ctx.lineWidth = 2 * F.px; ctx.setLineDash([6 * F.px, 4 * F.px]);
    for (const raum of V) for (const t of raum) {
      let x1 = t[0] * k, y1 = t[1] * k, x2 = t[2] * k, y2 = t[3] * k;
      if (sx) [x1, x2] = [B - x2, B - x1];
      if (sy) [y1, y2] = [H - y2, H - y1];
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    }
    ctx.restore();
  }

  /** Vorbild als eigener Plan unter dem erzeugten Grundriss (neu, Wunsch Reinhard 24.11.2026): gleicher Maßstab, so ausgerichtet
      (gespiegelt), wie es dem erzeugten Plan am besten entspricht; Wände, Türen, Namen und Flächen wie oben */
  const spiegleKante = (k, sp) => (sp.x && k[0] === "x") || (sp.y && k[0] === "y") ? k[0] + (k[1] === "0" ? "1" : "0") : k;
  const spiegleTreppe = (tp, sp) => ({ antritt: spiegleKante(tp.antritt, sp), austritt: spiegleKante(tp.austritt, sp), halb: tp.halb && spiegleKante(tp.halb, sp) });
  /** Vorbild eines Programms als Individuum (gespiegelt wie angegeben), Treppen mit Zugangskante */
  function vorbildInd(programm, sx, sy) {
    const P = Modell.PROGRAMME[programm], k = Modell.PX_M, n = P.raeume.length; let weiter = n;
    const I = { g: [], fo: 0, fd: 0, spiegel: { x: sx, y: sy } };
    P.vorbild.forEach((teile, raum) => teile.forEach((t, j) => {
      let x1 = t[0] * k, y1 = t[1] * k, x2 = t[2] * k, y2 = t[3] * k;
      if (sx) [x1, x2] = [B - x2, B - x1];
      if (sy) [y1, y2] = [H - y2, H - y1];
      const g = Modell.gen(j ? weiter++ : raum, (x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1, null, 0.4, 0, raum);
      const tp = Modell.treppeVon(programm, raum); if (tp) { g.tr = true; g.zg = spiegleKante(tp.kante, { x: sx, y: sy }); }
      I.g.push(g);
    }));
    return I;
  }
  function zeichneVorbildPlan(z, p, F, b) {
    const fig = document.getElementById("k-vorbild"); if (!fig) return;
    const zeigen = !!(p.plan && mitVorbild(z));
    if (fig.hidden !== !zeigen) fig.hidden = !zeigen;
    if (!zeigen) return;
    const P = Modell.PROGRAMME[z.programm], A = Modell.aehnlichkeit(b, z.programm), sx = A.gespiegelt.x, sy = A.gespiegelt.y;
    const I = vorbildInd(z.programm, sx, sy);                            // Haus: beide Geschosse in derselben Spiegelung (die des EG)
    const lw = document.getElementById("leinwand"), cssK = parseFloat(lw.style.width) / lw._b;   // CSS-Pixel je Modellpixel wie oben
    const c = document.getElementById("vorbild-leinwand"), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(breiteVon(z) * cssK), h = Math.round(hoeheVon(z) * cssK);
    if (c.style.width !== w + "px") { c.style.width = w + "px"; c.style.height = h + "px"; c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext("2d"); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
    ctx.setTransform(cssK * dpr, 0, 0, cssK * dpr, 0, 0);
    const Fv = Object.assign({}, F, { px: 1 / cssK });
    zeichnePlan(ctx, Object.assign({}, z, { mindest: false }), p, Fv, I);
    ctx.strokeStyle = F.tinte; ctx.lineWidth = 6; ctx.strokeRect(0, 0, B, H);
    let am = A.mittel;
    if (haus(z)) {
      const O = z.og, Io = vorbildInd(O.programm, sx, sy), Ao = Modell.aehnlichkeit(Modell.beste(O), O.programm);
      ctx.save(); ctx.translate(B + GESCHOSS, 0); zeichnePlan(ctx, Object.assign({}, O, { mindest: false }), p, Fv, Io); ctx.strokeStyle = F.tinte; ctx.lineWidth = 6; ctx.strokeRect(0, 0, B, H); ctx.restore();
      geschossNamen(ctx, Fv); am = (A.mittel + Ao.mittel) / 2;
    }
    const titel = document.getElementById("k-vorbild-titel"), sp = sx || sy, ti = haus(z) ? hausTitel(P, true) : (en() ? P.titel_en || P.titel : P.titel);
    const t = en() ? `Model: ${ti}` + (sp ? " (mirrored to match the plan above)" : "") + ` · similarity ${proz(am)}`
                   : `Vorbild: ${ti}` + (sp ? " (gespiegelt wie der Plan oben)" : "") + ` · Ähnlichkeit ${proz(am)}`;
    if (titel.textContent !== t) titel.textContent = t;
  }

  /** Haus: Titel ohne Geschoss, Namen der Geschosse unter den Plänen */
  const hausTitel = (P, mitEn) => ((mitEn && en() ? P.titel_en || P.titel : P.titel) || "").replace(/ · .*$/, "");
  function geschossNamen(ctx, F) {
    ctx.save(); ctx.fillStyle = F.gedaempft; ctx.font = `${11 * F.px}px "Geist Mono", ui-monospace, monospace`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(en() ? "GROUND FLOOR" : "ERDGESCHOSS", 0, H + 17 * F.px); ctx.fillText(en() ? "UPPER FLOOR" : "OBERGESCHOSS", B + GESCHOSS, H + 17 * F.px);
    ctx.restore();
  }
  /** Nachbarschaften (DrawConnections): Linien zwischen den Mittelpunkten, erfüllte durchgezogen, offene gestrichelt;
      der Eingang (Nachbar −1) als Linie zur nächsten Feldkante. Im Grundriss gelten die Rechtecke der Packung. */
  function zeichneNachbarn(ctx, z, p, F, G) {
    ctx.strokeStyle = ORANGE; ctx.fillStyle = ORANGE; ctx.lineWidth = 1.5 * F.px;
    for (const [a, c] of z.paare) {
      const A = G.find(q => q.id === a); if (!A) continue;
      const C = c === -1 ? Modell.aussen(A) : G.find(q => q.id === c); if (!C) continue;
      const ziel = c !== -1 ? [C.x, C.y] : C.x < 0 ? [0, A.y] : C.x > B ? [B, A.y] : C.y < 0 ? [A.x, 0] : [A.x, H];
      ctx.setLineDash(Modell.paarDistanz(A, C, p.rlap) < 1 ? [] : [4 * F.px, 3 * F.px]);
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(ziel[0], ziel[1]); ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const g of G) { ctx.beginPath(); ctx.arc(g.x, g.y, 2.5 * F.px, 0, 2 * Math.PI); ctx.fill(); }
  }
  /** Die Wahl der Nachbarschaften (Stern/Wohnung), die Mindestmaße und die Lösungssuche wirken nur mit Raumprogramm: sonst ausblenden */
  function auswahlGrundriss(z, p) {
    const d = z.programm ? "" : "none";                                 // style statt hidden: .zeile setzt display selbst
    const sichtbar = { "p-grundrissTopo": !!z.programm && !mitVorbild(z), "p-mindest": !!z.programm, "p-naehe": mitVorbild(z), "p-vorbild": mitVorbild(z), "p-starr": mitVorbild(z), "p-cluster": !!z.programm, "p-wand": !!z.programm,
                       "p-raeume": !z.programm };
    for (const [id, an] of Object.entries(sichtbar)) {
      const e = document.getElementById(id), zeile = e && e.closest(".zeile"), dd = an ? "" : "none";
      if (zeile && zeile.style.display !== dd) zeile.style.display = dd;
    }
    const L = document.getElementById("loesungen");
    if (L && L.hidden !== !z.programm) L.hidden = !z.programm;
    lWahl(z, p);
  }
  /** L-förmige Räume wählbar je Raum (neu): Kästchen unter „Mindestmaße“; der Wert steckt im verborgenen Regler lform (Bitmaske, in der Adresse) */
  let lSchluessel = "";
  function lWahl(z, p) {
    const lz = document.getElementById("p-lform"), zl = lz && lz.closest(".zeile");
    if (zl && zl.style.display !== "none") zl.style.display = "none";
    const mz = document.getElementById("p-mindest"), mzeile = mz && mz.closest(".zeile"); if (!mzeile) return;
    let box = document.getElementById("l-wahl");
    if (!box) { box = document.createElement("div"); box.id = "l-wahl"; box.className = "l-wahl"; mzeile.after(box); }
    const zeigen = !!z.programm && !mitVorbild(z), d = zeigen ? "" : "none";   // in allen Grundriss-Fassungen sichtbar (nicht bei Vorbildern); ohne Mindestmaße ausgegraut
    if (box.style.display !== d) box.style.display = d;
    if (!zeigen) return;
    const maske = (p && p.lform) || 0, k = [z.programm, maske, en(), !!z.mindest].join("|");
    if (k === lSchluessel) return;
    lSchluessel = k;
    const R = Modell.PROGRAMME[z.programm].raeume;
    box.innerHTML = `<div class="l-titel">${en() ? "L-shaped rooms" : "L-förmige Räume"}</div><div class="l-hinweis">${z.mindest
        ? (en() ? "Tick the rooms that may become L-shaped (made of two rectangles). Greyed out: too small for two legs of minimum width." : "Räume ankreuzen, die L-förmig werden dürfen (aus zwei Rechtecken). Grau: zu klein für zwei Schenkel mit Mindestbreite.")
        : (en() ? "Only with minimum dimensions (switch above)." : "Nur mit Mindestmaßen (Schalter darüber).")}</div>` + R.map((q, i) => {
      const ok = z.mindest && Modell.lMoeglich(z.programm, i), an = ok && Math.floor(maske / 2 ** i) % 2 === 1;
      return `<label class="${ok ? "" : "aus"}" title="${ok ? "" : (en() ? "too small for two legs of minimum width" : "zu klein für zwei Schenkel mit Mindestbreite")}"><input type="checkbox" data-raum="${i}"${an ? " checked" : ""}${ok ? "" : " disabled"}> ${en() ? q[1] : q[0]}</label>`;
    }).join("");
    box.querySelectorAll("input").forEach(e => e.addEventListener("change", () => {
      let m = 0; box.querySelectorAll("input:checked").forEach(c => { m += 2 ** +c.dataset.raum; });
      SIM.setze("lform", m);
    }));
  }

  const fassungen = Object.keys(FA);
  const folgen = {};
  fassungen.forEach(f => { folgen[f] = { topo: FA[f].ablauf === "topologie" && !FA[f].programm, plan: !!FA[f].programm }; Modell.REGLER.forEach(k => { folgen[f][k] = FA[f][k]; }); });   // show topology: im Original aus

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 30, wert: 1 },
    parameter: [
      { id: "fassung", gruppe: G_F, name: SEITE === "palladio" ? { de: "Villa (Vorbild)", en: "Villa (model)" } : SEITE === "siza" ? { de: "Haus (Vorbild, Erd- und Obergeschoss)", en: "House (model, ground and upper floor)" } : { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true, folgen,
        optionen: SEITE !== "packung" ? VORBILDER.map(f => { const P = Modell.PROGRAMME[FA[f].programm], h = !!FA[f].og; return { wert: f, name: { de: h ? P.titel.replace(/ · .*$/, "") : P.titel, en: h ? (P.titel_en || P.titel).replace(/ · .*$/, "") : P.titel_en || P.titel } }; }) : [{ wert: "einpassung", name: { de: "Einpassung (ohne Topologie)", en: "Fitting (no topology)" } },
                   { wert: "kollision", name: { de: "Kollision allein", en: "Collision only" } },
                   { wert: "topologie", name: { de: "Topologie: Stern", en: "Topology: star" } },
                   { wert: "gang", name: { de: "Topologie: Gang", en: "Topology: corridor" } },
                   { wert: "grundriss6", name: { de: "Grundriss: 6 Räume", en: "Floor plan: 6 rooms" } },
                   { wert: "grundriss8", name: { de: "Grundriss: 8 Räume", en: "Floor plan: 8 rooms" } },
                   { wert: "grundriss10", name: { de: "Grundriss: 10 Räume", en: "Floor plan: 10 rooms" } }] },
      { id: "belegung", gruppe: G_F, name: { de: "Belegung des Umgebungsrechtecks", en: "Coverage of the bounding rectangle" }, min: 0.3, max: 1, schritt: 0.01, wert: S.belegung, format: proz, neustart: true },
      { id: "minSeite", gruppe: G_F, name: { de: "Kürzeste Seite (· √Fläche)", en: "Shortest side (· √area)" }, min: 0.3, max: 1, schritt: 0.05, wert: S.minSeite, format: v => v.toLocaleString(en() ? "en" : "de", { minimumFractionDigits: 2 }), neustart: true },
      { id: "grundrissTopo", gruppe: G_F, name: { de: "Nachbarschaften im Grundriss", en: "Adjacencies in the floor plan" }, art: "auswahl", wert: S.grundrissTopo, neustart: true,
        optionen: [{ wert: "stern", name: { de: "Stern: alle am Flur (Buch)", en: "Star: all at the hall (book)" } },
                   { wert: "wohnung", name: { de: "Wohnung mit Eingang (angenommen)", en: "Flat with entrance (assumed)" } }] },
      { id: "lform", gruppe: G_F, name: { de: "L-förmige Räume (Bitmaske)", en: "L-shaped rooms (bit mask)" }, min: 0, max: 1023, wert: S.lform, neustart: true },
      { id: "naehe", gruppe: G_F, name: { de: "Nähe zum Vorbild (0 = freie Varianten, 1 = rekonstruieren; neu)", en: "Closeness to the model (0 = free variants, 1 = reconstruct; new)" }, min: 0, max: 1, schritt: 0.1, wert: S.naehe || 0, format: proz },
      { id: "starr", gruppe: G_F, name: { de: "Starre Raumform (zusammengesetzte Räume wie im Vorbild; neu)", en: "Rigid room shape (composite rooms as in the model; new)" }, art: "schalter", wert: !!S.starr, neustart: true },
      { id: "wand", gruppe: G_F, name: { de: "Wände am fertigen Plan verschieben (Nachbesserung; neu)", en: "Shift walls of the finished plan (local search; new)" }, art: "schalter", wert: !!S.wand },
      { id: "mindest", gruppe: G_F, name: { de: "Mindestmaße (Breite, Fläche; neu)", en: "Minimum dimensions (width, area; new)" }, art: "schalter", wert: S.mindest, neustart: true },
      { id: "raeume", gruppe: G_ES, name: { de: "Räume (Rooms, nicht im Grundriss)", en: "Rooms (not in floor plan)" }, min: 2, max: 40, wert: S.raeume, neustart: true },
      { id: "mu", gruppe: G_ES, name: { de: "Eltern μ (Population)", en: "Parents μ (population)" }, min: 1, max: 30, wert: S.mu, neustart: true },
      { id: "druck", gruppe: G_ES, name: { de: "Druck (Pressure) λ ≈ μ · Druck", en: "Pressure λ ≈ μ · pressure" }, min: 1, max: 20, wert: S.druck },
      { id: "plus", gruppe: G_ES, name: { de: "(μ+λ)-ES (aus: (μ,λ))", en: "(μ+λ)-ES (off: (μ,λ))" }, art: "schalter", wert: S.plus },
      { id: "elite", gruppe: G_ES, name: { de: "Elite", en: "Elite" }, art: "schalter", wert: S.elite },
      { id: "kreuzung", gruppe: G_ES, name: { de: "Rekombination (Crossover)", en: "Recombination (crossover)" }, art: "schalter", wert: S.kreuzung },
      { id: "cluster", gruppe: G_ES, name: { de: "Raumgruppe spiegeln: Rate (nach EPSAP; neu)", en: "Mirror room cluster: rate (after EPSAP; new)" }, min: 0, max: 0.1, schritt: 0.01, wert: S.cluster || 0, format: proz },
      { id: "kreuzRate", gruppe: G_ES, name: { de: "Rekombinationsrate", en: "Crossover rate" }, min: 0, max: 1, schritt: 0.01, wert: S.kreuzRate, format: proz },
      { id: "repForce", gruppe: G_K, name: { de: "Abstoßen: Kraft β", en: "Repel force β" }, min: 0, max: 1, schritt: 0.01, wert: S.repForce, format: proz },
      { id: "repRate", gruppe: G_K, name: { de: "Abstoßen: Rate ρL", en: "Repel rate ρL" }, min: 0, max: 1, schritt: 0.01, wert: S.repRate, format: proz },
      { id: "propForce", gruppe: G_K, name: { de: "Proportion: Kraft α", en: "Proportion force α" }, min: 0, max: 1, schritt: 0.01, wert: S.propForce, format: proz },
      { id: "propRate", gruppe: G_K, name: { de: "Proportion: Rate ρG", en: "Proportion rate ρG" }, min: 0, max: 1, schritt: 0.01, wert: S.propRate, format: proz },
      { id: "daempfung", gruppe: G_T, name: { de: "Federdämpfung (spring Damp)", en: "Spring damping" }, min: -1, max: 1, schritt: 0.01, wert: S.daempfung, format: proz },
      { id: "rlap", gruppe: G_T, name: { de: "Durchgangsbreite (Rooms Overlap)", en: "Passage width (rooms overlap)" }, min: 0, max: 100, wert: S.rlap },
      { id: "federRunden", gruppe: G_T, name: { de: "Federrunden je Kind (Original 2)", en: "Spring rounds per child (original 2)" }, min: 1, max: 20, wert: S.federRunden },
      { id: "topo", gruppe: G_D, name: { de: "Topologie zeigen", en: "Show topology" }, art: "schalter", wert: S.topo },
      { id: "plan", gruppe: G_D, name: { de: "Grundriss ableiten (Wände, Türen)", en: "Derive floor plan (walls, doors)" }, art: "schalter", wert: S.plan },
      { id: "vorbild", gruppe: G_D, name: { de: "Vorbild zeigen (gestrichelt)", en: "Show model (dashed)" }, art: "schalter", wert: S.vorbild },
      { id: "nummern", gruppe: G_D, name: { de: "Raumnummern", en: "Room numbers" }, art: "schalter", wert: S.nummern },
      { id: "verlauf", gruppe: G_D, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf, groesseNeu: true }
    ],
    groesse: (z, p) => (feld(z), !p.verlauf) ? { b: breiteVon(z), h: hoeheVon(z) } : quer() ? { b: breiteVon(z) + LUECKE + RECHTS, h: hoeheVon(z) } : { b: breiteVon(z), h: hoeheVon(z) + UNTEN },
    klick(z, p, x, y, taste, phase) { if (taste === "links" && (x <= B || phase !== "unten")) Modell.ziehe(z, Math.min(x, B), y, phase); },   // Haus: gezogen wird im EG
    zeichne(ctx, z, p, F) {
      feld(z);
      const b = Modell.beste(z), G = b.g;
      ctx.fillStyle = F.dunkel ? F.flaeche : F.papier; ctx.fillRect(0, 0, B, H);
      auswahlGrundriss(z, p);
      zeichneVorbildPlan(z, p, F, b);
      if (p.plan) {
        zeichnePlan(ctx, z, p, F, b); if (p.vorbild && mitVorbild(z)) zeichneVorbild(ctx, z, F, b); if (p.topo) zeichneNachbarn(ctx, z, p, F, G); ctx.strokeStyle = F.tinte; ctx.lineWidth = 6; ctx.strokeRect(0, 0, B, H);
        if (haus(z)) {                                                   // Haus (neu): Obergeschoss rechts daneben, Treppe und Hof aus dem EG
          const O = z.og, bo = Modell.beste(O);
          ctx.fillStyle = F.dunkel ? F.flaeche : F.papier; ctx.fillRect(B, 0, GESCHOSS + B, hoeheVon(z)); ctx.fillRect(0, H, B, UNTERSCHRIFT);
          ctx.save(); ctx.translate(B + GESCHOSS, 0);
          zeichnePlan(ctx, O, p, F, bo); if (p.vorbild) zeichneVorbild(ctx, O, F, bo); if (p.topo) zeichneNachbarn(ctx, O, p, F, bo.g);
          ctx.strokeStyle = F.tinte; ctx.lineWidth = 6; ctx.strokeRect(0, 0, B, H); ctx.restore();
          geschossNamen(ctx, F);
        }
        const bw = breiteVon(z);
        if (p.verlauf) { if (quer()) diagramm(ctx, z, F, bw + LUECKE, 0, RECHTS, H); else diagramm(ctx, z, F, 0, hoeheVon(z) + 8, bw, UNTEN - 8); }
        return;
      }
      // Räume der besten Lösung (PhenotypeGdi): grau, Wände in Papierfarbe (dunkel) bzw. schwarz (hell)
      ctx.lineWidth = 2; ctx.strokeStyle = F.dunkel ? F.papier : F.tinte;
      for (const g of G) {
        ctx.fillStyle = raumFarbe(F); ctx.fillRect(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h);
        ctx.strokeRect(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h);
      }
      // Überlappungen
      ctx.fillStyle = F.akzent; ctx.globalAlpha = 0.75;
      for (let i = 0; i < G.length; i++) for (let k = i + 1; k < G.length; k++) {
        const r = Modell.schnittRechteck(G[i], G[k]); if (r) ctx.fillRect(r.x1, r.y1, r.w, r.h);
      }
      ctx.globalAlpha = 1;
      if (z.gesperrt >= 0) {
        const g = G.find(q => q.id === z.gesperrt);
        if (g) { ctx.strokeStyle = F.akzentText; ctx.lineWidth = 3; ctx.strokeRect(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h); }
      }
      // Nachbarschaften (DrawConnections): Linien zwischen den Mittelpunkten, erfüllte durchgezogen, offene gestrichelt
      if (p.topo) zeichneNachbarn(ctx, z, p, F, G);
      if (p.nummern || z.programm) {
        ctx.font = `${11 * F.px}px "Geist Mono", ui-monospace, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = F.dunkel ? F.tinte : F.papier;
        for (const g of G) ctx.fillText(z.programm ? raumName(z, g.r == null ? g.id : g.r) + (g.r != null && g.r !== g.id ? " (L)" : "") : String(g.id), g.x + (z.programm ? 0 : 8 * F.px), g.y - 8 * F.px);
        ctx.textBaseline = "alphabetic";
      }
      // Umgebungsrechteck (dicker Rahmen wie im Original)
      ctx.strokeStyle = F.tinte; ctx.lineWidth = 4; ctx.strokeRect(0, 0, B, H);
      if (p.verlauf) {
        if (quer()) diagramm(ctx, z, F, B + LUECKE, 0, RECHTS, H);
        else diagramm(ctx, z, F, 0, H + 8, B, UNTEN - 8);
      }
    },
    legende: (F, p, z) => {
      const vb = p.vorbild && mitVorbild(z) ? [[F.akzentText, { de: "Vorbild (gestrichelt)", en: "Model (dashed)" }]] : [];
      const L = p.plan ? [[planFarbe(F), { de: "Raum", en: "Room" }], ...(z && z.programm ? [[hofFarbe(F), { de: "Hof", en: "Court" }]] : []), [F.tinte, { de: "Wand, Tür", en: "Wall, door" }], [restFarbe(F), { de: "Restfläche", en: "Leftover space" }], [F.akzent, { de: "Überlappung", en: "Overlap" }]]
                       : [[raumFarbe(F), { de: "Raum", en: "Room" }], [F.akzent, { de: "Überlappung", en: "Overlap" }]];
      if (p.plan) L.push(...vb);
      if (p.topo) L.push([ORANGE, { de: "Nachbarschaft (gestrichelt: offen)", en: "Adjacency (dashed: open)" }]);
      if (p.verlauf) { L.push([GRUEN(F), { de: "Verlauf Sg", en: "chart Sg" }]); if (z && mitTopo(z)) L.push([BLAU(F), { de: "Verlauf f2", en: "chart f2" }]); }
      return L;
    },
    kennzahlen(z, p) {
      feld(z);
      const b = Modell.beste(z), m = z.paare.length;
      const k = [[{ de: "Generation", en: "Generation" }, zahl(z.t)],
                 [{ de: "Überlappung Sg (f1)", en: "Overlap Sg (f1)" }, zahl(b.fo)],
                 [{ de: "Distanzen f2", en: "Distances f2" }, zahl(b.fd)],
                 [{ de: "Nachbarschaften erfüllt", en: "Adjacencies satisfied" }, `${Modell.erfuellt(b, z.paare, p.rlap)} / ${m}`],
                 [{ de: "Selektion", en: "Selection" }, `(${z.mu}${p.plus ? "+" : ","}λ)`],
                 [{ de: "Kinder je Generation", en: "Children per generation" }, zahl(z.kinder)]];
      if (z.aufteilung) k.push([{ de: "Auswahl nach f1 · f2", en: "Selected by f1 · f2" }, `${z.aufteilung[0]} · ${z.aufteilung[1]}`]);
      k.push([{ de: "Belegung", en: "Coverage" }, proz(z.belegung)]);
      if (p.plan) {
        const R = planVon(z, b), T = Modell.tueren(R, z.paare, Modell.TUER_PX);
        k.push([{ de: "Türen im Grundriss", en: "Doors in the plan" }, `${T.length} / ${m}`]);
        k.push([{ de: "Grundriss gefüllt", en: "Plan filled" }, proz(gefuellt(R))]);
      }
      if (z.mindest) {
        const W = Modell.planPruefung(b, z.paare, z.programm, 300), n = q => new Set(W.raeume.filter(r => r[q]).map(r => r.raum)).size;
        k.push([{ de: "Zu schmal · zu klein", en: "Too narrow · too small" }, `${n("zuSchmal")} · ${n("zuKlein")}`]);
        k.push([{ de: "Plan gültig", en: "Plan valid" }, W.gueltig ? { de: "ja", en: "yes" } : { de: "nein", en: "no" }]);
        if (haus(z)) {
          const O = z.og, bo = Modell.beste(O), Wo = Modell.planPruefung(bo, O.paare, O.programm, 300);
          k.push([{ de: "Obergeschoss gültig", en: "Upper floor valid" }, Wo.gueltig ? { de: "ja", en: "yes" } : { de: "nein", en: "no" }]);
          k.push([{ de: "Treppe: Antritt · Austritt", en: "Stair: start · arrival" }, { de: `${W.treppe < 0.05 ? "frei" : "verstellt"} · ${Wo.treppe < 0.05 ? "frei" : "verstellt"}`, en: `${W.treppe < 0.05 ? "clear" : "blocked"} · ${Wo.treppe < 0.05 ? "clear" : "blocked"}` }]);
          feld(z);
        }
        if (mitVorbild(z)) {
          const A = Modell.aehnlichkeit(b, z.programm), sp = A.gespiegelt.x || A.gespiegelt.y;
          if (haus(z)) { const Ao = Modell.aehnlichkeit(Modell.beste(z.og), z.og.programm); k.push([{ de: "Ähnlichkeit EG · OG", en: "Similarity GF · UF" }, `${proz(A.mittel)} · ${proz(Ao.mittel)}`]); }
          k.push([{ de: "Ähnlichkeit zum Vorbild", en: "Similarity to the model" }, { de: proz(A.mittel) + (sp ? " (gespiegelt)" : ""), en: proz(A.mittel) + (sp ? " (mirrored)" : "") }]);
        }
      }
      if (z.gesperrt >= 0) k.push([{ de: "Gezogen", en: "Dragged" }, { de: `Raum ${z.gesperrt}`, en: `room ${z.gesperrt}` }]);
      return k;
    }
  });

  /* ---------- Lösungen: gültige Grundrisse suchen, als Karten zeigen, per Klick in die Einzelansicht laden (neu, 23.11.2026) ---------- */
  const $ = id => document.getElementById(id);
  const ZEIT_MAX = 90000, ZEIT_MAX_HAUS = 300000;                      // Suche endet spätestens nach 90 s, beim Haus (EG + OG) nach 5 min
  let suche = null, karten = [], gewaehlt = -1, schluessel = "";
  const schluesselVon = p => [p.fassung, p.grundrissTopo, p.belegung, p.minSeite, p.mindest, p.rlap, p.federRunden, p.mu, p.lform, p.naehe, p.starr, p.cluster, p.wand].join("|");
  const text = o => en() ? o.en : o.de;
  function status(t) { $("l-status").textContent = t; }
  function zeichneKarten() {
    const box = $("l-karten"); box.innerHTML = "";
    const F = Sim.farben();
    feld(window.SIM && SIM.zustand);
    karten.forEach((T, i) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "l-karte"; b.setAttribute("aria-pressed", i === gewaehlt);
      const bw = T.og ? 2 * B + GESCHOSS : B, c = document.createElement("canvas"), w = T.og ? 300 : 240, dpr = Math.min(window.devicePixelRatio || 1, 2), k = w / bw;
      c.style.width = w + "px"; c.style.height = Math.round(H * k) + "px"; c.width = Math.round(w * dpr); c.height = Math.round(H * k * dpr);
      const ctx = c.getContext("2d"); ctx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
      const zk = { programm: T.programm, paare: T.paare, mindest: true }, Fk = Object.assign({}, F, { px: 1 / k * 0.75 });
      zeichnePlan(ctx, zk, {}, Fk, T.ind);
      ctx.strokeStyle = F.tinte; ctx.lineWidth = 6; ctx.strokeRect(0, 0, B, H);
      if (T.og) { ctx.save(); ctx.translate(B + GESCHOSS, 0); zeichnePlan(ctx, { programm: T.og.programm, paare: T.og.paare, mindest: true }, {}, Fk, T.og.ind); ctx.strokeStyle = F.tinte; ctx.lineWidth = 6; ctx.strokeRect(0, 0, B, H); ctx.restore(); }
      const t = Modell.tueren(planVon(zk, T.ind), T.paare, Modell.TUER_PX).length;
      const u = document.createElement("span"); u.className = "mono";
      u.textContent = `${i + 1} · ${text({ de: "Saat", en: "seed" })} ${T.saat} · ${text({ de: "Generation", en: "generation" })} ${T.t}` +
        ` · ${text({ de: "Türen", en: "doors" })} ${t}/${T.paare.length}` + (T.nachgebessert ? ` · ${text({ de: "nachgebessert", en: "refined" })}` : "") +
        (Modell.PROGRAMME[T.programm].vorbild ? ` · ${text({ de: "Ähnlichkeit", en: "similarity" })} ${proz(T.og ? (Modell.aehnlichkeit(T.ind, T.programm).mittel + Modell.aehnlichkeit(T.og.ind, T.og.programm).mittel) / 2 : Modell.aehnlichkeit(T.ind, T.programm).mittel)}` + (T.og ? text({ de: " (EG + OG)", en: " (GF + UF)" }) : "") : "");
      b.append(c, u);
      b.addEventListener("click", () => {
        const p = SIM.param, z = Modell.zustandAusTreffer(p, T, Zufall.zufall(T.saat * 7919 + T.t));
        gewaehlt = i; SIM.lade(z, T.saat); zeichneKarten();
        $("leinwand").scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      box.append(b);
    });
  }
  function ende(abgebrochen) {
    const S = suche, n = S.anzahl, dt = ((performance.now() - S.t0) / 1000).toLocaleString(en() ? "en" : "de", { maximumFractionDigits: 1 });
    karten = Modell.waehleVerschiedene(S.S.treffer, n); gewaehlt = -1; zeichneKarten();
    const h = S.S.treffer.length;
    const gleich = S.S.doppelt ? text({ de: ` ${S.S.doppelt} weitere Treffer waren gleich (auch gespiegelt).`, en: ` ${S.S.doppelt} further hits were the same (also mirrored).` }) : "";
    status(h >= n ? text({ de: `${karten.length} Grundrisse aus ${h} Treffern in ${S.S.laeufe} Läufen (${dt} s), möglichst verschieden gewählt.${gleich} Klick lädt einen in die Ansicht oben.`,
                             en: `${karten.length} floor plans from ${h} hits in ${S.S.laeufe} runs (${dt} s), chosen to differ as much as possible.${gleich} Click one to load it above.` })
          : h && S.S.doppelt ? text({ de: `${h} verschiedene${h === 1 ? "r" : ""} Grundriss${h === 1 ? "" : "e"} in ${S.S.laeufe} Läufen (${dt} s).${gleich} Für Varianten die Nähe zum Vorbild senken. Klick lädt einen in die Ansicht oben.`,
                                    en: `${h} different floor plan${h === 1 ? "" : "s"} in ${S.S.laeufe} runs (${dt} s).${gleich} For variants, lower the closeness to the model. Click one to load it above.` })
                  : text({ de: `${abgebrochen ? "Abgebrochen" : "Zeit oder Läufe aufgebraucht"}: ${h} gültige Grundrisse in ${S.S.laeufe} Läufen (${dt} s).` + (h ? " Klick lädt einen in die Ansicht oben." : " Mehr Räume oder Sterntopologie machen es schwerer; im Stern mit zehn Räumen reicht die Wandlänge des Flurs kaum für alle Mindestbreiten."),
                           en: `${abgebrochen ? "Stopped" : "Time or runs used up"}: ${h} valid floor plans in ${S.S.laeufe} runs (${dt} s).` + (h ? " Click one to load it above." : " More rooms or the star topology make it harder; with ten rooms in a star, the hall's walls are barely long enough for every minimum width.") }));
    $("l-suche").disabled = false; $("l-stopp").disabled = true; suche = null;
  }
  function takt() {
    if (!suche) return;
    const S = suche, t0 = performance.now();
    while (performance.now() - t0 < 30 && !S.S.fertig) Modell.sucheWeiter(S.S, 5);
    const h = S.S.treffer.length;
    if (h !== karten.length) { karten = S.S.treffer.slice(); zeichneKarten(); }
    const L = S.S.lauf, ph = L && L.og ? text({ de: ` · EG gültig, Obergeschoss: Lauf ${L.og.versuch}, Generation ${L.og.z.t}`, en: ` · ground floor valid, upper floor: run ${L.og.versuch}, generation ${L.og.z.t}` }) : L && L.z.og ? text({ de: ` · Erdgeschoss: Generation ${L.z.t}`, en: ` · ground floor: generation ${L.z.t}` }) : "";
    status(text({ de: `Suche … Lauf ${S.S.laeufe} · ${h} von ${S.S.ziel} Treffern`, en: `Searching … run ${S.S.laeufe} · ${h} of ${S.S.ziel} hits` }) + ph);
    if (S.S.fertig || performance.now() - S.t0 > (S.haus ? ZEIT_MAX_HAUS : ZEIT_MAX)) ende(false); else setTimeout(takt, 0);
  }
  $("l-suche").addEventListener("click", () => {
    const z = SIM.zustand; if (!z.programm) return;
    if (!z.mindest) { status(text({ de: "Die Suche braucht die Mindestmaße (Schalter unter Fassung).", en: "The search needs the minimum dimensions (switch under Version)." })); return; }
    const n = Math.max(1, Math.min(12, parseInt($("l-anzahl").value, 10) || 3)); $("l-anzahl").value = n;
    SIM.pause();
    const p = Object.assign({}, SIM.param);
    suche = { anzahl: n, haus: haus(z), t0: performance.now(), S: Modell.sucheNeu(p, Zufall.zufall, { anzahl: n, saat: SIM.saat, ziel: Math.max(n + 2, Math.ceil(n * 1.5)), laeufe: 400, generationen: mitVorbild(z) ? 400 : 200 }) };
    schluessel = schluesselVon(p); karten = []; gewaehlt = -1; zeichneKarten();
    $("l-suche").disabled = true; $("l-stopp").disabled = false;
    takt();
  });
  $("l-stopp").addEventListener("click", () => { if (suche) ende(true); });
  // Karten gehören zu den Einstellungen, mit denen gesucht wurde: ändern sich Fassung, Topologie oder Regler, verschwinden sie
  setInterval(() => { if (!suche && karten.length && schluesselVon(SIM.param) !== schluessel) { karten = []; gewaehlt = -1; zeichneKarten(); status(""); } }, 500);
  document.querySelectorAll(".sprache, #theme").forEach(e => e.addEventListener("click", () => setTimeout(zeichneKarten, 0)));

  // Maustaste los (pictureBox1_MouseUp): Sperre des gezogenen Raums aufheben
  const los = () => { if (window.SIM && SIM.zustand) { Modell.loslassen(SIM.zustand); SIM.zeichne(); } };
  const c = document.getElementById("leinwand");
  c.addEventListener("pointerup", los); c.addEventListener("pointercancel", los);
})();
