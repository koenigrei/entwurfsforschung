/* Stadtsynthese · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0
   Zeichenfläche: links der Plan von oben (Umgebung, Gebiet, Stufen der Kette), rechts (schmal: darunter) eine einfache
   Axonometrie der Baukörper im Gebiet – Parallelprojektion aus _gemeinsam/axonometrie.js (Axo), Zeichenreihenfolge von hinten nach vorn. */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => (isFinite(v) ? v : 0).toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });
  const D2R = Math.PI / 180, NEIGUNG_GRAD = 38, NEIGUNG = NEIGUNG_GRAD * D2R;
  let zug = -1;                                                // gezogene Ecke des Gebiets

  /** Aufteilung der Zeichenfläche (Modelleinheiten; der Plan ist 900 × 640 m): breit nebeneinander, schmal untereinander */
  function lage() {
    if (window.innerWidth < 760) return { b: 900, h: 1300, axo: { x: 0, y: 660, w: 900, h: 640 } };
    return { b: 1560, h: 640, axo: { x: 920, y: 0, w: 640, h: 640 } };
  }
  /** Farben der Gebäudetypen (lesbar auf hell und dunkel) */
  const TYP_FARBE = [[245, 163, 0], [86, 138, 232], [214, 69, 122]];
  const rgb = (c, a = 1) => (a < 1 ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : `rgb(${c[0]},${c[1]},${c[2]})`);
  const schatten = (c, f) => c.map(x => Math.round(x * f));
  const GRUEN = F => (F.dunkel ? "rgba(84,150,96,0.42)" : "rgba(120,180,120,0.45)");
  const skala = F => (F.dunkel ? "spektral" : [[43, 131, 186], [92, 168, 98], [222, 172, 20], [240, 112, 36], [215, 25, 28]]);

  /** viele Polygone als ein Pfad (ein fill/stroke für alle) */
  function pfade(ctx, L) {
    ctx.beginPath();
    for (const P of L) { P.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); }
  }

  /* ---------------------------------------------------------------- Plan */
  function plan(ctx, z, p, F) {
    const px = F.px, Sz = z.S, st = z.stufe;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // Umgebung: Park, Hochschule, Gebäude, Straßen, Haltestelle
    if (Sz.park) Karte.poly(ctx, Sz.park, GRUEN(F), null);
    pfade(ctx, Sz.gebaeude); ctx.fillStyle = F.dunkel ? "#2a2a30" : "#dcdce2"; ctx.fill();
    if (Sz.hochschule) Karte.poly(ctx, Sz.hochschule, null, F.tinte2, px * 1.6);
    Karte.segmente(ctx, Sz.umgebung, F.dunkel ? "#55555e" : "#a6a6b0", px * 1.4);
    if (Sz.haltestelle) Karte.punkt(ctx, Sz.haltestelle, 5 * px, F.papier, F.tinte2, px * 1.6);
    // Gebiet
    Karte.poly(ctx, Sz.rand, F.dunkel ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.025)", F.tinte2, px * 1.2);
    // Blöcke, Plätze, Parzellen, Baufenster
    if (st >= 4) {
      for (const pl of z.plaetze) Karte.poly(ctx, pl, GRUEN(F), null);
      for (const b of z.bloecke) Karte.poly(ctx, b.poly, F.dunkel ? "#202026" : "#ececf1", F.dunkel ? "#4a4a54" : "#b9b9c4", px * 0.9);
    }
    if (st >= 5 && p.zeigeParzellen) {
      pfade(ctx, z.parzellen.map(q => q.poly));
      ctx.strokeStyle = F.dunkel ? "rgba(200,200,215,0.42)" : "rgba(60,60,80,0.38)"; ctx.lineWidth = px * 0.7; ctx.stroke();
    }
    if (st >= 6 && st < 7) {
      ctx.setLineDash([3 * px, 2.5 * px]); pfade(ctx, z.parzellen.filter(q => q.ba).map(q => q.ba));
      ctx.strokeStyle = F.akzent; ctx.lineWidth = px * 0.9; ctx.stroke(); ctx.setLineDash([]);
    }
    // Gebäude (Grundrisse, nach Typ)
    if (st >= 7) for (const g of z.gebaeude) for (const t of g.teile) Karte.poly(ctx, t, rgb(TYP_FARBE[g.typ], F.dunkel ? 0.85 : 0.8), F.dunkel ? "#0b0b0e" : "#ffffff", px * 0.5);
    // Straßennetz
    if (st >= 1 && st < 2) {
      Karte.segmente(ctx, Modell.segmenteVon(z.G), F.tinte, px * 1.5);
      if (z.letzteNeu.length) Karte.segmente(ctx, z.letzteNeu, F.akzent, px * 3);
    }
    if (st >= 2) {
      const N = z.N, zentral = st >= 3 && p.zeigeZentralitaet;
      if (zentral) {
        const ord = [...N.kanten.keys()].sort((a, b) => z.farbwert[a] - z.farbwert[b]);
        for (const k of ord) {
          const e = N.kanten[k], w = st === 3 ? Math.max(px * 1.5, 2 * Math.pow(z.bc[k], p.expSkalierung) * p.linSkalierung) : px * 1.8;
          ctx.beginPath(); ctx.moveTo(N.knoten[e.a][0], N.knoten[e.a][1]); ctx.lineTo(N.knoten[e.b][0], N.knoten[e.b][1]);
          ctx.strokeStyle = Karte.farbe(z.farbwert[k], skala(F), st === 3 ? 0.9 : 1); ctx.lineWidth = w; ctx.stroke();
        }
      } else Karte.segmente(ctx, N.kanten.map(e => [N.knoten[e.a], N.knoten[e.b]]), st >= 4 ? F.gedaempft : F.tinte, px * (st >= 4 ? 1 : 1.5));
      if (st === 2 && z.weg.length) { ctx.setLineDash([4 * px, 3 * px]); Karte.segmente(ctx, z.weg, "#e0413a", px * 2); ctx.setLineDash([]); }
    }
    // Anschlussstraßen (IniStreets) und Ecken des Gebiets (Griffe)
    Karte.segmente(ctx, Sz.start.map(pl => [pl[0], pl[1]]), F.akzent, px * 3);
    for (const q of Sz.rand) { const r = 4 * px; ctx.beginPath(); ctx.rect(q[0] - r, q[1] - r, 2 * r, 2 * r); ctx.fillStyle = F.papier; ctx.fill(); ctx.strokeStyle = F.tinte; ctx.lineWidth = px * 1.2; ctx.stroke(); }
    // Beschriftung der Ziele
    const t = (s, q) => Karte.text(ctx, s, q, F.tinte2, px, 11, "center");
    if (Sz.park) t(de() ? "Park" : "Park", Geo.schwerpunkt(Sz.park));
    if (Sz.hochschule) t(de() ? "Hochschule" : "University", Geo.schwerpunkt(Sz.hochschule));
    if (Sz.haltestelle) t(de() ? "Haltestelle" : "Transit stop", [Sz.haltestelle[0], Sz.haltestelle[1] - 13 * px]);
    // Stufe
    const s = Modell.STUFEN[z.stufe];
    Karte.text(ctx, `${z.stufe}/8 · ${de() ? s.de : s.en}${z.stufe === 1 && z.W ? ` · ${de() ? "Ebene" : "level"} ${z.W.nr}` : ""}`, [14 * px, 16 * px], F.tinte, px, 12);
  }

  /* ---------------------------------------------------------------- Axonometrie (_gemeinsam/axonometrie.js) */
  function ansicht(z, p, A) {
    const R = z.S.rand, c = Geo.schwerpunkt(R), sp = Math.sin(NEIGUNG), cp = Math.cos(NEIGUNG);
    let r = 0; for (const q of R) r = Math.max(r, Geo.abstand(q, c));
    const k = Math.min(A.w * 0.92 / (2 * r), A.h * 0.86 / (2 * r * sp + p.maxHoehe * cp + 1));
    const my = A.y + A.h / 2 + (p.maxHoehe * cp * k) / 2;
    return Axo.ansicht({ drehung: p.drehung, neigung: NEIGUNG_GRAD, mitte: c, k, ox: A.x + A.w / 2, oy: my });
  }
  function flach(ctx, V, P, fuell, strich, lw) {
    ctx.beginPath(); P.forEach((q, i) => { const s = V.p(q[0], q[1]); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }); ctx.closePath();
    if (fuell) { ctx.fillStyle = fuell; ctx.fill(); } if (strich) { ctx.strokeStyle = strich; ctx.lineWidth = lw; ctx.stroke(); }
  }
  /** Baukörper: sichtbare Wände (Außennormale zum Betrachter) von hinten nach vorn, Licht von Westen, dann das Dach */
  function prisma(ctx, V, P, h, farbe, kante, lw) {
    Axo.prisma(ctx, V, P, { h1: h, kurz: 1e-6, schwelle: 0, sortiere: "nah", join: "round", kante, lw, dach: rgb(farbe),
      seite: w => rgb(schatten(farbe, Math.max(0.35, Math.min(0.95, 0.55 + 0.3 * (w.d[0] / w.l) * 0.5 + 0.15 * w.vb)))) });
  }
  function axonometrie(ctx, z, p, F, A) {
    const px = F.px, V = ansicht(z, p, A), st = z.stufe;
    ctx.save(); ctx.beginPath(); ctx.rect(A.x, A.y, A.w, A.h); ctx.clip();
    ctx.strokeStyle = F.linie; ctx.lineWidth = px; ctx.strokeRect(A.x + px / 2, A.y + px / 2, A.w - px, A.h - px);
    flach(ctx, V, z.S.rand, F.dunkel ? "#17171c" : "#f2f2f6", F.tinte2, px);
    if (st >= 4) {
      for (const pl of z.plaetze) flach(ctx, V, pl, GRUEN(F), null);
      for (const b of z.bloecke) flach(ctx, V, b.poly, F.dunkel ? "#25252c" : "#e2e2e8", F.dunkel ? "#4a4a54" : "#b9b9c4", px * 0.7);
    }
    if (st >= 5 && p.zeigeParzellen) for (const q of z.parzellen) flach(ctx, V, q.poly, null, F.dunkel ? "rgba(200,200,215,0.3)" : "rgba(60,60,80,0.28)", px * 0.6);
    const netz = st >= 2 ? z.N.kanten.map(e => [z.N.knoten[e.a], z.N.knoten[e.b]]) : st >= 1 ? Modell.segmenteVon(z.G) : [];
    ctx.beginPath(); for (const s of netz) { const a = V.p(s[0][0], s[0][1]), b = V.p(s[1][0], s[1][1]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.strokeStyle = F.gedaempft; ctx.lineWidth = px * 0.9; ctx.stroke();
    if (st >= 7) {
      const T = [];
      for (const g of z.gebaeude) for (const t of g.teile) T.push({ t, h: g.hoehe, typ: g.typ });
      const L = Axo.maler(T, x => { let mx = -Infinity; for (const q of x.t) mx = Math.max(mx, V.v(q[0], q[1])); return mx; });
      const kante = F.dunkel ? "rgba(0,0,0,0.55)" : "rgba(40,40,50,0.55)";
      for (const x of L) prisma(ctx, V, x.t, x.h, TYP_FARBE[x.typ], kante, px * 0.5);
    }
    Karte.text(ctx, de() ? "Axonometrie der Baukörper" : "Axonometric view of the buildings", [A.x + 14 * px, A.y + 16 * px], F.tinte, px, 12);
    ctx.restore();
  }

  /* ---------------------------------------------------------------- Rahmen */
  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 5, wert: 1 },
    parameter: [
      { id: "baumtiefe", gruppe: { de: "1 Straßennetz (Street Network Synthesis)", en: "1 Street network synthesis" }, name: { de: "Baumtiefe (TreeDepth)", en: "Tree depth (TreeDepth)" }, min: 0, max: 20, schritt: 1, wert: S.baumtiefe },
      { id: "minLaenge", name: { de: "kleinste Länge (MinLength) m", en: "Minimum length (MinLength), m" }, min: 0, max: 100, schritt: 1, wert: S.minLaenge },
      { id: "maxLaenge", name: { de: "Längenspanne (MaxLength) m", en: "Length range (MaxLength), m" }, min: 0, max: 120, schritt: 1, wert: S.maxLaenge },
      { id: "zufallsWinkel", name: { de: "Zufallswinkel (RandomAngle) °", en: "Random angle (RandomAngle), °" }, min: 0, max: 60, schritt: 1, wert: S.zufallsWinkel },
      { id: "minAbstand", name: { de: "Fangabstand (MinDist) m", en: "Snap distance (MinDist), m" }, min: 1, max: 50, schritt: 1, wert: S.minAbstand },
      { id: "maxArme", name: { de: "Arme je Kreuzung (MaxArms)", en: "Arms per crossing (MaxArms)" }, min: 2, max: 8, schritt: 1, wert: S.maxArme },
      { id: "saatStrassen", name: { de: "Zufallssaat (SeedForRandom)", en: "Seed (SeedForRandom)" }, min: 0, max: 100, schritt: 1, wert: S.saatStrassen },
      { id: "anschluss", name: { de: "Anschlussstücke ins Gebiet m", en: "Connecting stubs into the site, m" }, min: 10, max: 100, schritt: 1, wert: S.anschluss },
      { id: "sackgassen", name: { de: "Sackgassen entfernen (Iterations)", en: "Cul-de-sac removal (iterations)" }, min: 0, max: 5, schritt: 1, wert: S.sackgassen },
      { id: "expSkalierung", gruppe: { de: "2 Straßenbreite aus der Zentralität", en: "2 Street width from centrality" }, name: { de: "Exponent (ExpScaling)", en: "Exponent (ExpScaling)" }, min: 0, max: 1, schritt: 0.1, wert: S.expSkalierung },
      { id: "linSkalierung", name: { de: "Faktor (LinearScaling)", en: "Factor (LinearScaling)" }, min: 0, max: 1, schritt: 0.01, wert: S.linSkalierung },
      { id: "minBlock", name: { de: "kleinster Block (MinBlockSize) m²", en: "Minimum block (MinBlockSize), m²" }, min: 0, max: 10000, schritt: 100, wert: S.minBlock },
      { id: "vereinfachen", name: { de: "Vereinfachen (Simplify Tolerance) m", en: "Simplify tolerance, m" }, min: 0, max: 15, schritt: 1, wert: S.vereinfachen },
      { id: "parzellenModus", gruppe: { de: "3 Parzellen (Slicing Tree)", en: "3 Parcels (slicing tree)" }, art: "auswahl", name: { de: "Parzellenbreite (parcelWidth)", en: "Parcel width (parcelWidth)" }, wert: S.parzellenModus,
        optionen: [{ wert: "zentralitaet", name: { de: "aus der Zentralität: √BC / Teiler", en: "from centrality: √BC / divisor" } }, { wert: "fest", name: { de: "fest (Regler)", en: "fixed (slider)" } }] },
      { id: "teiler", name: { de: "Teiler (√BC / x)", en: "Divisor (√BC / x)" }, min: 1, max: 10, schritt: 0.1, wert: S.teiler },
      { id: "parzellenBreite", name: { de: "feste Breite (parcelWidth) m", en: "Fixed width (parcelWidth), m" }, min: 5, max: 100, schritt: 1, wert: S.parzellenBreite },
      { id: "rStrasse", gruppe: { de: "4 Baufenster (Buildable Area)", en: "4 Buildable area" }, name: { de: "Rücksprung Straße (RoadSetback) m", en: "Road setback, m" }, min: 0, max: 20, schritt: 0.5, wert: S.rStrasse },
      { id: "rSeite", name: { de: "Rücksprung Seite (SideSetback) m", en: "Side setback, m" }, min: 0, max: 20, schritt: 0.5, wert: S.rSeite },
      { id: "rHinten", name: { de: "Rücksprung hinten (BackSetback) m", en: "Back setback, m" }, min: 0, max: 20, schritt: 0.5, wert: S.rHinten },
      { id: "tiefe", gruppe: { de: "5 Gebäude (Building Generation)", en: "5 Building generation" }, name: { de: "Gebäudetiefe (BuildingDepth) m", en: "Building depth, m" }, min: 4, max: 40, schritt: 1, wert: S.tiefe },
      { id: "laenge", name: { de: "Gebäudelänge (BuildingLength) m", en: "Building length, m" }, min: 5, max: 100, schritt: 1, wert: S.laenge },
      { id: "gfzFaktor", name: { de: "GFZ-Faktor (FAR = Zentralität × x)", en: "FAR factor (FAR = centrality × x)" }, min: 0, max: 10, schritt: 0.1, wert: S.gfzFaktor },
      { id: "maxHoehe", name: { de: "größte Höhe (BHMax) m", en: "Maximum height (BHMax), m" }, min: 3, max: 100, schritt: 1, wert: S.maxHoehe },
      { id: "minGrundflaeche", name: { de: "kleinste Grundfläche (min building area) m²", en: "Minimum footprint, m²" }, min: 0, max: 1000, schritt: 10, wert: S.minGrundflaeche },
      { id: "geschaeft", gruppe: { de: "Kennzahlen und Darstellung", en: "Measures and display" }, name: { de: "Geschäftsstraße ab Anteil der größten BC", en: "Shopping street from share of max BC" }, min: 0, max: 1, schritt: 0.05, wert: S.geschaeft },
      { id: "zeigeZentralitaet", art: "schalter", name: { de: "Betweenness farbig", en: "Colour betweenness" }, wert: S.zeigeZentralitaet },
      { id: "zeigeParzellen", art: "schalter", name: { de: "Parzellen zeigen", en: "Show parcels" }, wert: S.zeigeParzellen },
      { id: "drehung", name: { de: "Drehung der Axonometrie °", en: "Rotation of the axonometry °" }, min: -180, max: 180, schritt: 5, wert: S.drehung }
    ],
    groesse: () => { const L = lage(); return { b: L.b, h: L.h }; },
    klick(z, p, x, y, taste, phase) {
      if (phase === "ziehen") { if (zug >= 0) Modell.verschiebe(z, p, zug, [x, y]); return; }
      zug = -1;
      if (x > z.S.b || y > z.S.h) return;
      const cv = document.getElementById("leinwand"), px = lage().b / cv.getBoundingClientRect().width;
      zug = Modell.griffBei(z, [x, y], Math.max(14, 10 * px));
    },
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      plan(ctx, z, p, F);
      axonometrie(ctx, z, p, F, lage().axo);
    },
    legende(F, p, z) {
      const L = [[F.akzent, { de: "Anschlussstraßen (IniStreets)", en: "Connecting streets (IniStreets)" }]];
      if (z.stufe >= 3 && p.zeigeZentralitaet) L.push([Karte.farbe(0, skala(F)), { de: "Betweenness niedrig", en: "Low betweenness" }], [Karte.farbe(1, skala(F)), { de: "hoch", en: "high" }]);
      else L.push([F.tinte, { de: "Straßennetz", en: "Street network" }]);
      if (z.stufe === 2) L.push(["#e0413a", { de: "entfernte Sackgassen", en: "Removed cul-de-sacs" }]);
      if (z.stufe >= 6 && z.stufe < 7) L.push([F.akzent, { de: "Baufenster", en: "Buildable area" }]);
      if (z.stufe >= 7) Modell.TYPEN.forEach((t, i) => L.push([rgb(TYP_FARBE[i]), t]));
      L.push([GRUEN(F), { de: "Park, Plätze", en: "Park, squares" }]);
      return L;
    },
    kennzahlen(z, p) {
      const K = Modell.kennzahlen(z, p), s = Modell.STUFEN[z.stufe], m = " m", leer = "–";
      const w = (v, f) => (v == null || !isFinite(v) ? leer : f(v));
      return [
        [{ de: "Stufe", en: "Stage" }, { de: `${z.stufe}/8 ${s.de}`, en: `${z.stufe}/8 ${s.en}` }],
        [{ de: "Netzlänge (Infrastrukturkosten)", en: "Network length (infrastructure cost)" }, w(K.netzLaenge, v => zahl(v) + m)],
        [{ de: "Segmente · T- zu X-Kreuzungen", en: "Segments · T to X crossings" }, K.segmente == null ? leer : `${K.segmente} · ${K.t}:${K.x}${isFinite(K.verhaeltnis) ? " = " + zahl(K.verhaeltnis, 2) : ""}`],
        [{ de: "Länge Geschäftsstraßen", en: "Shopping street length" }, w(K.geschaeft, v => zahl(v) + m)],
        [{ de: "Blöcke · Parzellen · Gebäude", en: "Blocks · parcels · buildings" }, `${K.bloecke == null ? leer : K.bloecke} · ${K.parzellen == null ? leer : K.parzellen} · ${K.gebaeude == null ? leer : K.gebaeude}`],
        [{ de: "Geschossfläche", en: "Gross floor area" }, w(K.geschossflaeche, v => zahl(v) + " m²")],
        [{ de: "GRZ · GFZ (Bauland)", en: "Site coverage · FAR (plots)" }, K.grz == null ? leer : `${zahl(K.grz, 2)} · ${zahl(K.gfz, 2)}`],
        [{ de: "öffentlich : privat", en: "Public : private" }, w(K.oeffentlichPrivat, v => zahl(v, 2))],
        [{ de: "relative Integration (NAIN mit/ohne)", en: "Relative integration (NAIN with/without)" }, w(K.relIntegration, v => zahl(v, 3))],
        [{ de: "relative Konnektivität (Kanten/Knoten)", en: "Relative connectivity (edges/nodes)" }, w(K.relKonnektivitaet, v => zahl(v, 3))],
        [{ de: "mittlerer Weg zur Hochschule", en: "Mean distance to university" }, w(K.wegBildung, v => zahl(v) + m)],
        [{ de: "mittlerer Weg zur Haltestelle", en: "Mean distance to transit" }, w(K.wegOepnv, v => zahl(v) + m)],
        [{ de: "mittlerer Weg zum Freiraum", en: "Mean distance to open space" }, w(K.wegFreiraum, v => zahl(v) + m)]
      ];
    }
  });
})();
