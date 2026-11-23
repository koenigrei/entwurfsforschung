/* Vom Straßennetz zum Gebäude · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0
   Links der Plan (Straßen, Blöcke, Parzellen, Baufenster, Grundflächen), rechts (schmal: darunter) eine einfache Axonometrie der
   Baukörper – eigene Parallelprojektion wie in simulationen/vba-rekursion, drehbar per Ziehen; Zeichenreihenfolge von hinten nach vorn. */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => (isFinite(v) ? v : 0).toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });
  const D2R = Math.PI / 180, ABSTAND = 30;
  let zug = null, pxLetzt = 1;

  /* ---------------------------------------------------------------- Farben (wie im Katalogbild: Straßen und Blöcke violett,
     Baufenster magenta, Baukörper türkis) – in Hell und Dunkel lesbar */
  const FARBE = F => F.dunkel ? {
    strasse: "#b77cff", block: "rgba(183,124,255,0.20)", blockRand: "rgba(183,124,255,0.65)", parzelle: "#a070e8",
    baufenster: "rgba(235,70,175,0.42)", geb: [86, 214, 236], gebRand: "#1f6f80", umgebung: "#34343c", verworfen: "#6a6a74", neu: "#f5a300"
  } : {
    strasse: "#8a2be2", block: "rgba(138,43,226,0.16)", blockRand: "rgba(138,43,226,0.55)", parzelle: "#9b59d6",
    baufenster: "rgba(176,20,120,0.30)", geb: [64, 190, 218], gebRand: "#17606f", umgebung: "#cfcfd6", verworfen: "#9a9aa4", neu: "#e08600"
  };
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`, dunkler = (c, f) => c.map(x => Math.round(x * f));

  /** Aufteilung der Zeichenfläche: breit nebeneinander, schmal untereinander (Modelleinheiten = Meter des Plans) */
  function lage(z) {
    const b = z.b, h = z.h;
    if (window.innerWidth < 900) return { b, h: 2 * h + ABSTAND, plan: { x: 0, y: 0, w: b, h }, axo: { x: 0, y: h + ABSTAND, w: b, h } };
    return { b: 2 * b + ABSTAND, h, plan: { x: 0, y: 0, w: b, h }, axo: { x: b + ABSTAND, y: 0, w: b, h } };
  }
  const drin = (R, x, y) => x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h;

  /* ---------------------------------------------------------------- Inhalt zur Zeit t */
  function inhalt(z) {
    const K = z.K, st = Modell.stand(z), v = s => Modell.sichtbar(z, s);
    const nArme = v(0), nBl = v(1), nPar = v(2), nBf = v(3), nGeb = v(4);
    const strassen = st.stufe === 0
      ? z.S.rand.map((q, i) => [q, z.S.rand[(i + 1) % z.S.rand.length]]).concat(...z.S.start.map(pl => pl.slice(1).map((q, i) => [pl[i], q])), K.strassen.arme.slice(0, nArme).map(a => [a.a, a.b]))
      : K.strassen.segmente;
    return { st, K, strassen, nArme, nBl, nPar, nBf, nGeb, letzterArm: st.stufe === 0 && nArme > 0 ? K.strassen.arme[nArme - 1] : null };
  }

  /* ---------------------------------------------------------------- Plan */
  function zeichnePlan(ctx, z, p, F, I) {
    const C = FARBE(F), px = F.px, K = I.K;
    Karte.segmente(ctx, z.S.umgebung, C.umgebung, px * 1.2);
    for (let i = 0; i < I.nBl; i++) {
      const b = K.bloecke[i];
      if (b.behalten) Karte.poly(ctx, b.poly, C.block, C.blockRand, px * 1.2);
      else Karte.linie(ctx, b.roh.concat([b.roh[0]]), C.verworfen, px, [4 * px, 4 * px]);
    }
    if (I.st.stufe === 1 && I.nBl > 0) { const b = K.bloecke[I.nBl - 1]; Karte.poly(ctx, b.poly || b.roh, null, C.neu, px * 2.6); }
    for (let bi = 0; bi < I.nPar; bi++) for (const par of K.je[bi].parzellen) Karte.poly(ctx, par.poly, null, C.parzelle, px);
    for (let bi = 0; bi < I.nBf; bi++) for (const bf of K.je[bi].baufenster) if (bf.poly) Karte.poly(ctx, bf.poly, C.baufenster, null);
    for (let bi = 0; bi < I.nGeb; bi++) for (const g of K.je[bi].gebaeude) {
      if (!g.behalten) { Karte.linie(ctx, g.aussen.concat([g.aussen[0]]), C.verworfen, px, [3 * px, 3 * px]); continue; }
      ctx.beginPath(); ring(ctx, g.aussen); if (g.loch) ring(ctx, g.loch);
      ctx.fillStyle = css(C.geb); ctx.fill("evenodd"); ctx.strokeStyle = C.gebRand; ctx.lineWidth = px; ctx.stroke();
    }
    const zuletzt = I.st.stufe >= 2 && I.st.stufe <= 4 && I.st.k > 0 ? K.behalten[I.st.k - 1] : null;
    if (zuletzt) Karte.poly(ctx, zuletzt.poly, null, C.neu, px * 2.6);
    Karte.segmente(ctx, I.strassen, C.strasse, px * 1.8);
    if (I.letzterArm) Karte.linie(ctx, [I.letzterArm.a, I.letzterArm.b], C.neu, px * 3.4);
    // Griffe: Randecken und Stützpunkte der Startstraßen (in Rhino verschiebbar)
    for (const q of z.S.rand) Karte.punkt(ctx, q, 4.2 * px, F.dunkel ? "#000" : "#fff", F.tinte, px * 1.4);
    for (const pl of z.S.start) for (const q of pl) Karte.punkt(ctx, q, 3.6 * px, F.akzent, F.dunkel ? "#000" : "#fff", px);
    Karte.text(ctx, de() ? "PLAN" : "PLAN", [12 * px, 14 * px], F.gedaempft, px, 10);
  }
  function ring(ctx, P) { P.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); }

  /* ---------------------------------------------------------------- Axonometrie */
  /** Ansicht: Drehung θ um die Hochachse, Neigung φ; Maßstab drehungsunabhängig (Umkreis des Baufelds) */
  function ansicht(z, p, R) {
    const th = p.drehung * D2R, ph = p.neigung * D2R, c = Math.cos(th), s = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
    const bb = Geo.bbox(z.S.rand), mx = (bb.x0 + bb.x1) / 2, my = (bb.y0 + bb.y1) / 2;
    let r = 0; for (const q of z.S.rand) r = Math.max(r, Math.hypot(q[0] - mx, q[1] - my));
    const hRef = Math.max(40, z.K.summe.maxH);
    const k = Math.min(R.w * 0.94 / (2 * r), R.h * 0.9 / (2 * r * sp + hRef * cp));
    const ox = R.x + R.w / 2, oy = R.y + R.h / 2 + k * hRef * cp / 2;
    return {
      c, s, cp, sp, k,
      /** Bildpunkt eines Raumpunkts (x, y im Plan, q Höhe) */
      p(x, y, q = 0) { const u = (x - mx) * c - (y - my) * s, v = (x - mx) * s + (y - my) * c; return [ox + k * u, oy + k * (v * sp - q * cp)]; },
      /** Tiefe (größer = näher am Betrachter) */
      t(x, y) { return (x - mx) * s + (y - my) * c; }
    };
  }
  function flach(ctx, A, P, fuellung, strich, lw) {
    ctx.beginPath(); P.forEach((q, i) => { const a = A.p(q[0], q[1]); i ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]); }); ctx.closePath();
    if (fuellung) { ctx.fillStyle = fuellung; ctx.fill(); }
    if (strich) { ctx.strokeStyle = strich; ctx.lineWidth = lw; ctx.stroke(); }
  }
  /** Baukörper: sichtbare Wände (Außenring nach außen, Hofring nach innen) von hinten nach vorn, dann das Dach mit Hof */
  function koerper(ctx, A, g, C, lw) {
    const h = g.hoehe, waende = [];
    const nimm = (P, innen) => P.forEach((a, i) => {
      const b = P[(i + 1) % P.length], d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1;
      let n = [d[1] / l, -d[0] / l]; if (innen) n = [-n[0], -n[1]];
      const nv = n[0] * A.s + n[1] * A.c, nu = n[0] * A.c - n[1] * A.s;
      if (nv <= 1e-9) return;
      waende.push({ a, b, nu, t: A.t((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) });
    });
    nimm(g.aussen, false); if (g.loch) nimm(g.loch, true);
    waende.sort((x, y) => x.t - y.t);
    ctx.lineWidth = lw; ctx.strokeStyle = C.gebRand; ctx.lineJoin = "round";
    for (const w of waende) {
      const q = [A.p(w.a[0], w.a[1], h), A.p(w.b[0], w.b[1], h), A.p(w.b[0], w.b[1], 0), A.p(w.a[0], w.a[1], 0)];
      ctx.fillStyle = css(dunkler(C.geb, 0.66 - 0.16 * w.nu));
      ctx.beginPath(); q.forEach((pt, i) => (i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]))); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath();
    for (const P of g.loch ? [g.aussen, g.loch] : [g.aussen]) { P.forEach((q, i) => { const a = A.p(q[0], q[1], h); i ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]); }); ctx.closePath(); }
    ctx.fillStyle = css(C.geb); ctx.fill("evenodd"); ctx.stroke();
  }
  function zeichneAxo(ctx, z, p, F, I, R) {
    const C = FARBE(F), px = F.px, K = I.K, A = ansicht(z, p, R);
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    ctx.strokeStyle = C.umgebung; ctx.lineWidth = px;
    ctx.beginPath(); for (const s of z.S.umgebung) { const a = A.p(s[0][0], s[0][1]), b = A.p(s[1][0], s[1][1]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();
    for (let i = 0; i < I.nBl; i++) { const b = K.bloecke[i]; if (b.behalten) flach(ctx, A, b.poly, C.block, null); }
    for (let bi = 0; bi < I.nPar; bi++) for (const par of K.je[bi].parzellen) flach(ctx, A, par.poly, null, C.parzelle, px * 0.8);
    for (let bi = 0; bi < I.nBf; bi++) for (const bf of K.je[bi].baufenster) if (bf.poly) flach(ctx, A, bf.poly, C.baufenster, null);
    ctx.strokeStyle = C.strasse; ctx.lineWidth = px * 1.4;
    ctx.beginPath(); for (const s of I.strassen) { const a = A.p(s[0][0], s[0][1]), b = A.p(s[1][0], s[1][1]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();
    const G = [];
    for (let bi = 0; bi < I.nGeb; bi++) for (const g of K.je[bi].gebaeude) if (g.behalten) { const m = Geo.schwerpunkt(g.aussen); G.push([A.t(m[0], m[1]), g]); }
    G.sort((x, y) => x[0] - y[0]);
    for (const [, g] of G) koerper(ctx, A, g, C, px * 0.7);
    ctx.restore();
    Karte.text(ctx, de() ? "AXONOMETRIE · ZIEHEN DREHT" : "AXONOMETRY · DRAG TO ROTATE", [R.x + 12 * px, R.y + 14 * px], F.gedaempft, px, 10);
  }

  /* ---------------------------------------------------------------- Bedienung */
  function klick(z, p, x, y, taste, phase) {
    const L = lage(z);
    if (phase === "unten") {
      zug = null;
      if (drin(L.plan, x, y)) { const g = Modell.griffBei(z, [x - L.plan.x, y - L.plan.y], Math.max(14, 10 * pxLetzt)); if (g) zug = { art: "griff", g }; }
      else if (drin(L.axo, x, y)) zug = { art: "dreh", x, y, d: p.drehung, n: p.neigung };
      return;
    }
    if (!zug) return;
    if (zug.art === "griff") { Modell.verschiebe(z, p, zug.g, [x - L.plan.x, y - L.plan.y]); return; }
    if (!window.SIM) return;
    const d = Math.round(((zug.d - (x - zug.x) * 0.3) % 360 + 360) % 360), n = Math.round(Math.max(10, Math.min(90, zug.n + (y - zug.y) * 0.15)));
    if (d !== p.drehung) window.SIM.setze("drehung", d);
    if (n !== p.neigung) window.SIM.setze("neigung", n);
  }

  const G1 = { de: "1. Straßen (Street Network Generator)", en: "1. Streets (Street Network Generator)" };
  const G2 = { de: "2. Blöcke (Blocks)", en: "2. Blocks (Blocks)" };
  const G3 = { de: "3. Parzellen (Parcels)", en: "3. Parcels (Parcels)" };
  const G4 = { de: "4. Baufenster (Buildable Area)", en: "4. Buildable area (Buildable Area)" };
  const G5 = { de: "5. Gebäude (Building Generation)", en: "5. Buildings (Building Generation)" };
  const G6 = { de: "Gebäude aus Vorlagen (Placement on Parcel)", en: "Buildings from templates (Placement on Parcel)" };
  const G7 = { de: "Ansicht", en: "View" };
  const STUFE = Modell.STUFEN.map(s => s.name).concat([{ de: "fertig", en: "complete" }]);

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "baumtiefe", gruppe: G1, name: { de: "Baumtiefe (TreeDepth)", en: "Tree depth (TreeDepth)" }, min: 0, max: 20, schritt: 1, wert: S.baumtiefe },
      { id: "minLaenge", name: { de: "kleinste Länge (MinLength) m", en: "Minimum length (MinLength), m" }, min: 10, max: 100, schritt: 1, wert: S.minLaenge },
      { id: "maxLaenge", name: { de: "Längenspanne (MaxLength) m", en: "Length range (MaxLength), m" }, min: 10, max: 200, schritt: 1, wert: S.maxLaenge },
      { id: "minAbstand", name: { de: "Fangabstand (MinDist) m", en: "Snap distance (MinDist), m" }, min: 0, max: 60, schritt: 1, wert: S.minAbstand },
      { id: "zufallsWinkel", name: { de: "Winkelstreuung (RandomAngle) °", en: "Angle jitter (RandomAngle), °" }, min: 0, max: 90, schritt: 1, wert: S.zufallsWinkel },
      { id: "maxArme", name: { de: "höchste Armzahl (MaxArms)", en: "Maximum arms (MaxArms)" }, min: 2, max: 8, schritt: 1, wert: S.maxArme },
      { id: "minBlockFlaeche", gruppe: G2, name: { de: "kleinste Blockfläche (minBlockArea) m²", en: "Minimum block area (minBlockArea), m²" }, min: 0, max: 10000, schritt: 10, wert: S.minBlockFlaeche },
      { id: "blockVersatz", name: { de: "Blockversatz nach innen (Block Offset → Negative) m", en: "Block inset (Block Offset → Negative), m" }, min: 0, max: 10, schritt: 0.5, wert: S.blockVersatz },
      { id: "parzellenBreite", gruppe: G3, name: { de: "Parzellenbreite (PlotWidthThreshold) m", en: "Plot width (PlotWidthThreshold), m" }, min: 10, max: 100, schritt: 1, wert: S.parzellenBreite },
      { id: "strassenAbstand", gruppe: G4, name: { de: "Abstand zur Straße (RoadSetback) m", en: "Road setback (RoadSetback), m" }, min: 0, max: 10, schritt: 0.5, wert: S.strassenAbstand },
      { id: "seitenAbstand", name: { de: "seitlicher Abstand (SideSetback) m", en: "Side setback (SideSetback), m" }, min: 0, max: 10, schritt: 0.5, wert: S.seitenAbstand },
      { id: "rueckAbstand", name: { de: "hinterer Abstand (BackSetback) m", en: "Back setback (BackSetback), m" }, min: 0, max: 10, schritt: 0.5, wert: S.rueckAbstand },
      { id: "toleranz", name: { de: "Winkeltoleranz (Tolerance) °", en: "Angle tolerance (Tolerance), °" }, min: 1, max: 60, schritt: 1, wert: S.toleranz },
      { id: "typ", gruppe: G5, art: "auswahl", name: { de: "Gebäudetyp (BuildingType)", en: "Building type (BuildingType)" }, wert: S.typ,
        optionen: [{ wert: "0", name: { de: "0 freistehend", en: "0 detached" } }, { wert: "1", name: { de: "1 Zeile", en: "1 row" } }, { wert: "2", name: { de: "2 Blockrand", en: "2 perimeter block" } }] },
      { id: "tiefe", name: { de: "Gebäudetiefe (BuildingDepth) m", en: "Building depth (BuildingDepth), m" }, min: 1, max: 100, schritt: 1, wert: S.tiefe },
      { id: "laenge", name: { de: "Gebäudelänge (BuildingLength) m", en: "Building length (BuildingLength), m" }, min: 5, max: 100, schritt: 1, wert: S.laenge },
      { id: "orientierungAn", art: "schalter", name: { de: "Ausrichtung absolut (Orientation verbunden)", en: "Absolute orientation (Orientation connected)" }, wert: S.orientierungAn },
      { id: "orientierung", name: { de: "Ausrichtung (Orientation) rad", en: "Orientation (Orientation), rad" }, min: 0, max: 1, schritt: 0.05, wert: S.orientierung },
      { id: "gfz", name: { de: "Geschossflächenzahl (FAR)", en: "Floor area ratio (FAR)" }, min: 0, max: 1, schritt: 0.05, wert: S.gfz },
      { id: "geschossHoehe", name: { de: "Geschosshöhe (FloorHeight) m", en: "Floor height (FloorHeight), m" }, min: 2.5, max: 6, schritt: 0.1, wert: S.geschossHoehe },
      { id: "minGrundflaeche", name: { de: "kleinste Grundfläche (MinBuildingFootprintArea) m²", en: "Minimum footprint (MinBuildingFootprintArea), m²" }, min: 0, max: 100, schritt: 1, wert: S.minGrundflaeche },
      { id: "vorlagen", gruppe: G6, art: "schalter", name: { de: "Gebäude aus Vorlagen setzen", en: "Place buildings from templates" }, wert: S.vorlagen },
      { id: "vorlage", art: "auswahl", name: { de: "Vorlage je Parzelle", en: "Template per parcel" }, wert: S.vorlage,
        optionen: [{ wert: "alle", name: { de: "zufällig aus allen (Random)", en: "random from all (Random)" } }]
          .concat(Modell.VORLAGEN.map(v => ({ wert: v.id, name: v.name }))) },
      { id: "drehung", gruppe: G7, name: { de: "Drehung", en: "Rotation" }, min: 0, max: 359, schritt: 1, wert: S.drehung, format: v => v + "°" },
      { id: "neigung", name: { de: "Neigung", en: "Elevation" }, min: 10, max: 90, schritt: 1, wert: S.neigung, format: v => v + "°" }
    ],
    groesse: z => { const L = lage(z); return { b: L.b, h: L.h }; },
    ende: z => Modell.fertig(z),
    klick,
    aktionen: [
      { name: { de: "Stufe ▸", en: "Stage ▸" }, tue: z => Modell.naechsteStufe(z) },
      { name: { de: "Alles ▸▸", en: "All ▸▸" }, tue: z => { z.t = Math.max(z.t, z.T); } }
    ],
    zeichne(ctx, z, p, F) {
      pxLetzt = F.px;
      const L = lage(z), I = inhalt(z);
      ctx.save(); ctx.beginPath(); ctx.rect(L.plan.x, L.plan.y, L.plan.w, L.plan.h); ctx.clip(); ctx.translate(L.plan.x, L.plan.y);
      zeichnePlan(ctx, z, p, F, I); ctx.restore();
      ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
      if (L.axo.x > 0) { ctx.beginPath(); ctx.moveTo(L.axo.x - ABSTAND / 2, 0); ctx.lineTo(L.axo.x - ABSTAND / 2, L.h); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(0, L.axo.y - ABSTAND / 2); ctx.lineTo(L.b, L.axo.y - ABSTAND / 2); ctx.stroke(); }
      zeichneAxo(ctx, z, p, F, I, L.axo);
    },
    legende: F => {
      const C = FARBE(F);
      return [[C.strasse, { de: "Straßen", en: "Streets" }], [C.blockRand, { de: "Block", en: "Block" }], [C.parzelle, { de: "Parzelle", en: "Parcel" }],
              [C.baufenster, { de: "Baufenster", en: "Buildable area" }], [css(C.geb), { de: "Gebäude", en: "Building" }],
              [C.verworfen, { de: "verworfen", en: "discarded" }], [C.neu, { de: "letzter Schritt", en: "last step" }]];
    },
    kennzahlen(z, p) {
      const I = inhalt(z), K = z.K, s = K.summe, st = I.st, ab = x => st.stufe >= x;
      const nBeh = K.behalten.length, nVer = K.bloecke.length - nBeh;
      const k = [
        [{ de: "Stufe", en: "Stage" }, STUFE[st.stufe]],
        [{ de: "Straßenarme", en: "Street arms" }, `${I.nArme} / ${K.strassen.arme.length}`],
        [{ de: "neue Straßen", en: "New streets" }, ab(1) ? zahl(K.strassen.laenge) + " m" : "–"],
        [{ de: "Blöcke (verworfen)", en: "Blocks (discarded)" }, ab(2) ? `${nBeh} (${nVer})` : "–"],
        [{ de: "Parzellen", en: "Parcels" }, ab(3) ? String(s.parzellen) : "–"],
        [{ de: "mittlere Straßenfront", en: "Mean street frontage" }, ab(3) ? zahl(s.front, 1) + " m" : "–"],
        [{ de: "Baufenster", en: "Buildable areas" }, ab(4) ? String(s.baufenster) : "–"],
        [{ de: "Gebäude (aussortiert)", en: "Buildings (culled)" }, ab(5) ? `${s.gebaeude} (${s.aussortiert})` : "–"],
        [{ de: "Geschossfläche (GFA)", en: "Gross floor area (GFA)" }, ab(5) ? zahl(s.gfa) + " m²" : "–"],
        [{ de: "erreichte GFZ (FAR)", en: "Achieved FAR" }, ab(5) ? zahl(s.gfa / Math.max(1, s.flaecheParzellen), 2) : "–"],
        [{ de: "Geschosse höchstens", en: "Max. storeys" }, ab(5) ? `${s.maxN} · ${zahl(s.maxH)} m` : "–"]
      ];
      return k;
    }
  });
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => { if (window.SIM) window.SIM.zeichne(); }));
})();
