/* Wasserleitung: Druck und Durchfluss · Bedienung und Darstellung (Modelllogik in modell.js, Löser in ../_gemeinsam/hydraulik.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const en = () => document.documentElement.lang === "en";
  const zahl = (v, n = 0) => v == null || !isFinite(v) ? "–" : v.toLocaleString(en() ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  const B = 1000, HH = 640;                                         // Zeichenfläche in Einheiten
  const PROFIL = { x0: 80, x1: 930, y0: 95, y1: 440 };              // Bereich des Höhenprofils
  const GM = { x: 690, y: 478, b: 250, h: 136 };                     // Graph Mapper
  const KV = { x: 70, y: 490, b: 330, h: 110 };                      // Konvergenzbild
  const ROHR = { q: { de: "Durchfluss (Flow rate) L/s", en: "Flow rate (L/s)", n: 0 }, v: { de: "Geschwindigkeit (Flow velocity) m/s", en: "Flow velocity (m/s)", n: 2 },
                 verlust: { de: "Verlust (Head loss) m/km, Pumpe −m", en: "Head loss (m/km, pump −m)", n: 2 }, status: { de: "Status (Actual link status) 1 = offen", en: "Actual link status (1 = open)", n: 0 },
                 C: { de: "Rauheit (Roughness)", en: "Roughness", n: 0 }, energie: { de: "Energie (Energy expended) kW", en: "Energy expended (kW)", n: 2 } };
  const KNOTEN = { bedarf: { de: "Entnahme (Actual demand) L/s", en: "Actual demand (L/s)", n: 0 }, kopf: { de: "Druckhöhe (Hydraulic head) m", en: "Hydraulic head (m)", n: 1 },
                   druck: { de: "Druck (Pressure) m", en: "Pressure (m)", n: 1 } };
  const lila = F => F.dunkel ? "#c39bff" : "#7b3fc4";
  const cyan = F => F.dunkel ? "#4fd0ea" : "#0b7d97";
  const GRUEN = "#2fb84f", PINK = "#ff4fa8";
  const rohrFarbe = (t, F) => { const c = Karte.farbeRGB(1 - t, "spektral"); const k = F.dunkel ? 1 : 0.8; return `rgb(${c.map(v => Math.round(v * k)).join(",")})`; };
  let zug = -1;                                                       // gezogener Stützpunkt des Graph Mappers

  /** Maßstab des Profils: waagerecht Länge → Breite; senkrecht wahre Größe, außer das Profil wäre zu flach oder zu hoch (Überhöhung) */
  function massstab(z, p) {
    const xs = p.laenge > 0 ? (PROFIL.x1 - PROFIL.x0) / p.laenge : 0;
    const zs = z.P.map(q => q.z), oben = Math.max(...zs, z.P[0].z + p.tankHoehe), unten = Math.min(...zs), sp = Math.max(oben - unten, 1e-6);
    const hoch = PROFIL.y1 - PROFIL.y0;
    let sz = xs > 0 ? xs : hoch / sp;
    if (sp * sz > hoch) sz = hoch / sp;
    if (sp * sz < 0.4 * hoch) sz = 0.4 * hoch / sp;
    const y0 = PROFIL.y0 + (hoch - sp * sz) / 2;
    return { X: x => PROFIL.x0 + x * xs, Y: h => y0 + (oben - h) * sz, xs, sz, ueber: xs > 0 ? sz / xs : 1 };
  }

  function zeichneGraphMapper(ctx, z, F) {
    const px = F.px, g = GM;
    ctx.fillStyle = F.flaeche; ctx.fillRect(g.x, g.y, g.b, g.h);
    ctx.strokeStyle = F.linie; ctx.lineWidth = px; ctx.strokeRect(g.x, g.y, g.b, g.h);
    const gx = u => g.x + u * g.b, gy = v => g.y + g.h - v * g.h;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const u = i / 60, x = gx(u), y = gy(Modell.graphMapper(z.kurve, u)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = F.tinte; ctx.lineWidth = px * 1.6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx(z.kurve[0][0]), gy(z.kurve[0][1])); ctx.lineTo(gx(z.kurve[1][0]), gy(z.kurve[1][1]));
    ctx.moveTo(gx(z.kurve[3][0]), gy(z.kurve[3][1])); ctx.lineTo(gx(z.kurve[2][0]), gy(z.kurve[2][1]));
    ctx.strokeStyle = F.gedaempft; ctx.lineWidth = px; ctx.setLineDash([3 * px, 3 * px]); ctx.stroke(); ctx.setLineDash([]);
    z.kurve.forEach((q, k) => Karte.punkt(ctx, [gx(q[0]), gy(q[1])], px * (zug === k ? 6 : 4.5), F.akzent, F.papier, px * 1.2));
    Karte.text(ctx, "GRAPH MAPPER", [g.x + 6 * px, g.y + 9 * px], F.tinte2, px, 10);
  }

  function zeichneKonvergenz(ctx, z, F) {
    const px = F.px, k = KV, V = z.verlauf || [];
    const lg = v => Math.max(-15, Math.min(1, Math.log10(Math.max(v, 1e-16))));
    const gy = v => Math.min(k.y + k.h - 2 * px, k.y + k.h * (1 - (lg(v) + 15) / 16));
    ctx.strokeStyle = F.linie; ctx.lineWidth = px; ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x, k.y + k.h); ctx.lineTo(k.x + k.b, k.y + k.h); ctx.stroke();
    const ya = gy(Hydraulik.GENAUIGKEIT);
    ctx.beginPath(); ctx.moveTo(k.x, ya); ctx.lineTo(k.x + k.b, ya); ctx.setLineDash([4 * px, 3 * px]); ctx.strokeStyle = F.gedaempft; ctx.stroke(); ctx.setLineDash([]);
    Karte.text(ctx, "0.001", [k.x - 4 * px, ya], F.gedaempft, px, 9, "right");
    const n = Math.max(8, V.length), dx = k.b / n;
    V.forEach((v, i) => { const y = gy(v); ctx.fillStyle = v <= Hydraulik.GENAUIGKEIT ? F.akzent : F.tinte2; ctx.fillRect(k.x + i * dx + dx * 0.15, y, dx * 0.7, k.y + k.h - y); });
    Karte.text(ctx, en() ? "Σ|ΔQ| / Σ|Q| PER ITERATION (LOG)" : "Σ|ΔQ| / Σ|Q| JE ITERATION (LOG)", [k.x, k.y - 10 * px], F.tinte2, px, 10);
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "segmente", gruppe: { de: "Leitung (Range, Graph Mapper)", en: "Pipeline (Range, Graph Mapper)" }, name: { de: "Abschnitte (NetworkSegments)", en: "NetworkSegments" }, min: 0, max: 100, schritt: 1, wert: S.segmente },
      { id: "laenge", name: { de: "Länge (NetworkLength) m", en: "NetworkLength (m)" }, min: 0, max: 1000, schritt: 1, wert: S.laenge },
      { id: "hoehe", name: { de: "Höhenunterschied (NetworkHeight) m", en: "NetworkHeight (m)" }, min: 0, max: 100, schritt: 1, wert: S.hoehe },
      { id: "durchmesser", name: { de: "Durchmesser (LineDiameter) m", en: "LineDiameter (m)" }, min: 0, max: 10, schritt: 0.1, wert: S.durchmesser },
      { id: "rauheit", name: { de: "Rauheit Hazen-Williams (LineRoughness)", en: "LineRoughness (Hazen-Williams C)" }, min: 120, max: 160, schritt: 1, wert: S.rauheit },
      { id: "tankHoehe", gruppe: { de: "Hochbehälter (Tank)", en: "Water tank" }, name: { de: "Wasserstand (TankHeight) m", en: "TankHeight (m)" }, min: 0, max: 10, schritt: 1, wert: S.tankHoehe },
      { id: "tankVolumen", name: { de: "Volumen (TankVolume) m³", en: "TankVolume (m³)" }, min: 0, max: 1000, schritt: 1, wert: S.tankVolumen },
      { id: "bedarf", gruppe: { de: "Verbraucher und Pumpe", en: "Consumers and pump" }, name: { de: "Bedarf je Verbraucher (Demand) L/s", en: "Demand (litres per second)" }, min: 0, max: 1000, schritt: 1, wert: S.bedarf },
      { id: "minDruck", name: { de: "Mindestdruck (Min Pressure) m", en: "Min pressure (m)" }, min: 0, max: 100, schritt: 1, wert: S.minDruck },
      { id: "pumpe", name: { de: "Pumpenleistung (Pump Power) kW", en: "Pump power (kW)" }, min: 1, max: 20, schritt: 0.1, wert: S.pumpe },
      { id: "pumpenIndex", name: { de: "Lage der Pumpe (Pump Index)", en: "Pump index" }, min: 0, max: 0.99, schritt: 0.01, wert: S.pumpenIndex },
      { id: "rohrWert", gruppe: { de: "Darstellung (Value Lists)", en: "Display (value lists)" }, art: "auswahl", name: { de: "Leitungen (Pipe values)", en: "Pipe values" }, wert: S.rohrWert,
        optionen: Modell.ROHRWERTE.map(w => ({ wert: w, name: { de: ROHR[w].de, en: ROHR[w].en } })) },
      { id: "knotenWert", art: "auswahl", name: { de: "Knoten (Node values)", en: "Node values" }, wert: S.knotenWert,
        optionen: Modell.KNOTENWERTE.map(w => ({ wert: w, name: { de: KNOTEN[w].de, en: KNOTEN[w].en } })) },
      { id: "iterativ", gruppe: { de: "Erweiterung", en: "Extension" }, art: "schalter", name: { de: "Versorgung iterativ prüfen", en: "Check supply iteratively" }, wert: S.iterativ }
    ],
    groesse: () => ({ b: B, h: HH }),
    klick(z, p, x, y, taste, phase) {
      const u = (x - GM.x) / GM.b, v = 1 - (y - GM.y) / GM.h;
      if (phase === "unten") {
        zug = -1; let bd = 0.09;
        z.kurve.forEach((q, k) => { const d = Math.hypot((q[0] - u) * GM.b / GM.h, q[1] - v); if (d < bd) { bd = d; zug = k; } });
        if (zug < 0) return;
      }
      if (zug >= 0) Modell.setzeKurve(z, p, zug, u, v);
    },
    aktionen: [
      { name: { de: "Rechnen", en: "Compute" }, tue: (z, p) => { Modell.rechneAlles(z, p); } },
      { name: { de: "Kurve ↺", en: "Curve ↺" }, tue: (z, p) => { z.kurve = Modell.KURVE.map(q => q.slice()); Modell.aendere(z, p, "kurve"); } }
    ],
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px, M = massstab(z, p), P = z.P, N = P.length - 1;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (N < 1) { Karte.text(ctx, en() ? "No pipeline (NetworkSegments = 0)" : "Keine Leitung (NetworkSegments = 0)", [B / 2, 260], F.tinte2, px, 13, "center"); zeichneGraphMapper(ctx, z, F); return; }
      // Bezugslinie: Höhe des Behälters
      const yb = M.Y(P[0].z);
      ctx.beginPath(); ctx.moveTo(PROFIL.x0, yb); ctx.lineTo(PROFIL.x1, yb); ctx.setLineDash([2 * px, 4 * px]); ctx.strokeStyle = F.linie; ctx.lineWidth = px; ctx.stroke(); ctx.setLineDash([]);
      // Wasserspiegel des Behälters (Druckhöhe) als Bezug für den Druck
      const yw = M.Y(P[0].z + p.tankHoehe);
      ctx.beginPath(); ctx.moveTo(PROFIL.x0, yw); ctx.lineTo(PROFIL.x1, yw); ctx.setLineDash([6 * px, 4 * px]); ctx.strokeStyle = F.dunkel ? "rgba(79,208,234,0.35)" : "rgba(11,125,151,0.35)"; ctx.stroke(); ctx.setLineDash([]);
      // Drucklinie (Hydraulic head) – zeigt den Druck als Abstand über der Leitung
      if (z.erg) {
        ctx.beginPath();
        z.erg.knoten.forEach((k, i) => { const x = M.X(P[i].x), y = M.Y(k.kopf); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.strokeStyle = cyan(F); ctx.lineWidth = px * 1.2; ctx.setLineDash([1.5 * px, 3 * px]); ctx.stroke(); ctx.setLineDash([]);
      }
      // Leitungen: Farbe nach dem gewählten Wert (Remap auf 0…1, Gradient: hoch blau, niedrig rot wie im Katalogbild)
      const art = p.rohrWert, werte = z.netz.leitungen.map((l, k) => Modell.rohrWert(z, k, art));
      const def = werte.filter(v => v != null && isFinite(v)), mn = Math.min(...def), mx = Math.max(...def);
      const ip = Modell.pumpenLinie(p), schritt = Math.max(1, Math.ceil(N / 14));
      for (let k = 0; k < N; k++) {
        const a = [M.X(P[k].x), M.Y(P[k].z)], b = [M.X(P[k + 1].x), M.Y(P[k + 1].z)];
        const v = k < werte.length ? werte[k] : null, t = v == null || !isFinite(v) ? 0.5 : mx - mn > 1e-9 ? (v - mn) / (mx - mn) : 0.5;
        const farbe = k >= z.netz.leitungen.length ? F.linie : z.erg ? rohrFarbe(t, F) : F.gedaempft;
        if (k === ip) {
          // Pumpe als Kegel in Fließrichtung
          const d = Geo.norm(Geo.sub(b, a)), nn = [-d[1], d[0]], l = Geo.abstand(a, b), r = Math.min(16 * px, l * 0.45);
          ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(a[0] + nn[0] * r, a[1] + nn[1] * r); ctx.lineTo(a[0] - nn[0] * r, a[1] - nn[1] * r); ctx.closePath();
          ctx.fillStyle = farbe; ctx.fill(); ctx.strokeStyle = F.tinte; ctx.lineWidth = px * 0.8; ctx.stroke();
        } else Karte.linie(ctx, [a, b], farbe, px * 5);
        if (z.erg && v != null && k < werte.length && (k % schritt === 0)) {
          const m = Geo.lerp(a, b, 0.5), d = Geo.norm(Geo.sub(b, a)), o = Geo.add(m, Geo.mul([-d[1], d[0]], -13 * px));
          Karte.text(ctx, zahl(v, ROHR[art].n), o, lila(F), px, 11, "center");
        }
      }
      // Behälter: Zylinder mit Durchmesser aus Volumen und Höhe (im Profil als Rechteck), Wasser bis TankHeight
      const dT = Modell.tankDurchmesser(p.tankVolumen, p.tankHoehe), w = Math.max(18 * px, Math.min(120, dT * M.xs)), x0 = M.X(0) - w / 2;
      const hT = Math.max(3 * px, p.tankHoehe * M.sz);
      ctx.fillStyle = F.dunkel ? "rgba(79,160,234,0.55)" : "rgba(40,120,200,0.45)"; ctx.fillRect(x0, yb - hT, w, hT);
      ctx.strokeStyle = F.tinte; ctx.lineWidth = px * 1.2; ctx.strokeRect(x0, yb - hT - 4 * px, w, hT + 4 * px);
      Karte.text(ctx, en() ? "Water tank" : "Hochbehälter", [Math.max(4 * px, x0), yb - hT - 14 * px], F.tinte, px, 12);
      // Knoten: grün = genug Druck, pink = unter Mindestdruck, grau = (noch) ohne Ergebnis bzw. ohne Wasser
      const nArt = p.knotenWert, schrittK = Math.max(1, Math.ceil(N / 14));
      for (let i = 1; i <= N; i++) {
        const q = [M.X(P[i].x), M.Y(P[i].z)], hat = z.erg && i < z.erg.knoten.length;
        const ok = hat && z.erg.knoten[i].druck >= p.minDruck && z.versorgt[i];
        Karte.punkt(ctx, q, px * 4.5, hat ? (ok ? GRUEN : PINK) : F.flaeche, F.tinte, px);
        if (hat && i % schrittK === 0) Karte.text(ctx, zahl(Modell.knotenWert(z, i, nArt), KNOTEN[nArt].n), [q[0], q[1] + 14 * px], cyan(F), px, 11, "center");
        else if (!hat && z.t > 0) Karte.text(ctx, "–", [q[0], q[1] + 14 * px], F.gedaempft, px, 11, "center");
      }
      // Beschriftung der Werte, Überhöhung
      Karte.text(ctx, (en() ? ROHR[art].en : ROHR[art].de).toUpperCase(), [PROFIL.x0 - 50, 30], lila(F), px, 11);
      Karte.text(ctx, (en() ? KNOTEN[nArt].en : KNOTEN[nArt].de).toUpperCase(), [PROFIL.x0 - 50, 50], cyan(F), px, 11);
      const breit = B / px > 760;
      if (Math.abs(M.ueber - 1) > 0.05 && breit) Karte.text(ctx, (en() ? "vertical exaggeration × " : "Überhöhung × ") + zahl(M.ueber, 1), [PROFIL.x1, 30], F.gedaempft, px, 10, "right");
      if (z.t === 0 && breit) Karte.text(ctx, en() ? "Start: one iteration of the gradient method per step" : "Start: eine Iteration des Gradientenverfahrens je Schritt", [PROFIL.x1, 50], F.tinte2, px, 11, "right");
      zeichneKonvergenz(ctx, z, F);
      zeichneGraphMapper(ctx, z, F);
    },
    legende: F => [[rohrFarbe(1, F), { de: "Leitung: hoher Wert", en: "Pipe: high value" }], [rohrFarbe(0, F), { de: "niedriger Wert", en: "low value" }],
      [GRUEN, { de: "Verbraucher mit genug Druck", en: "Consumer with enough pressure" }], [PINK, { de: "unter Mindestdruck", en: "below min pressure" }],
      [F.dunkel ? "#4fa0ea" : "#2878c8", { de: "Hochbehälter", en: "Water tank" }]],
    kennzahlen(z, p) {
      const b = Modell.bilanz(z, p), N = z.P.length - 1;
      return [
        [{ de: "Iteration", en: "Iteration" }, zahl(b.iter) + (p.iterativ ? (en() ? " · pass " : " · Durchgang ") + zahl(b.durchgang) : "") + (z.fertig && z.S ? " ✓" : "")],
        [{ de: "relative Änderung", en: "Relative change" }, z.S && z.S.iter ? b.fehler.toExponential(1) : "–"],
        [{ de: "Zufluss aus dem Behälter", en: "Outflow of the tank" }, b.zufluss != null ? zahl(b.zufluss) + " L/s" : "–"],
        [{ de: "Druck min … max", en: "Pressure min … max" }, b.druckMin != null ? zahl(b.druckMin, 1) + " … " + zahl(b.druckMax, 1) + " m" : "–"],
        [{ de: "Verbraucher unter Mindestdruck", en: "Consumers below min pressure" }, b.zuWenig != null ? zahl(b.zuWenig) + " / " + zahl(N) : "–"],
        [{ de: "versorgte Verbraucher", en: "Supplied consumers" }, b.versorgt != null ? zahl(b.versorgt) + " / " + zahl(N) : "–"],
        [{ de: "Pumpe: Linie · Förderhöhe", en: "Pump: line · head" }, N > 0 ? zahl(Modell.pumpenLinie(p)) + " · " + (b.foerderhoehe != null ? zahl(b.foerderhoehe, 1) + " m" : "–") : "–"],
        [{ de: "größte Geschwindigkeit", en: "Max. velocity" }, b.vMax != null ? zahl(b.vMax, 2) + " m/s" : "–"],
        [{ de: "Leitungslänge", en: "Pipeline length" }, zahl(b.laenge || 0, 1) + " m"],
        [{ de: "Behälterdurchmesser", en: "Tank diameter" }, zahl(Modell.tankDurchmesser(p.tankVolumen, p.tankHoehe), 2) + " m"]
      ];
    }
  });
})();
