/* Regenwasserabfluss (Raster) · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const ROT = "#e0393e";
  const en = () => document.documentElement.lang === "en";
  const zahl = (v, n = 0) => v.toLocaleString(en() ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  const wasser = F => F.dunkel ? "rgba(120,190,240,0.95)" : "rgba(24,94,170,0.92)";
  /** Farbe eines Einzugsgebiets: Grasshopper-Gradient (Karte „spektral“) in gemischter Reihenfolge, im Hellen abgedunkelt */
  const gebietRGB = (z, g, F) => { const c = Karte.farbeRGB(z.farbe[g], "spektral"); return F.dunkel ? c : c.map(v => Math.round(v * 0.72)); };
  const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  /** Himmelsrichtung (0° = Norden = oben, 90° = Osten) */
  const azimut = d => ((Math.atan2(d[0], -d[1]) * 180 / Math.PI) + 360) % 360;
  const KOMPASS = { de: ["N", "NO", "O", "SO", "S", "SW", "W", "NW"], en: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] };

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "aufloesung", gruppe: { de: "Analyse (Flow Paths)", en: "Analysis (Flow Paths)" }, name: { de: "Auflösung (Resolution)", en: "Resolution" }, min: 0, max: 100, schritt: 1, wert: S.aufloesung },
      { id: "glaettung", name: { de: "Glättung (Smooth) · 0 = glatt, 1 = genau", en: "Smooth · 0 = smooth, 1 = precise" }, min: 0, max: 1, schritt: 0.1, wert: S.glaettung },
      { id: "abstand", gruppe: { de: "Einzugsgebiete (Point Groups)", en: "Watersheds (Point Groups)" }, name: { de: "Gruppierungsabstand (Distance) m", en: "Grouping distance (m)" }, min: 0, max: 200, schritt: 0.1, wert: S.abstand },
      { id: "pfeil", gruppe: { de: "Lokale Analyse", en: "Local analysis" }, name: { de: "Pfeillänge (Vektor × 300) m", en: "Arrow length (vector × 300) m" }, min: 0, max: 1000, schritt: 10, wert: S.pfeil },
      { id: "zeigeKurz", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "Kurze Fließwege (Flow Paths Short)", en: "Short flow paths" }, wert: S.zeigeKurz },
      { id: "zeigeGebiete", art: "schalter", name: { de: "Einzugsgebiete einfärben", en: "Colour watersheds" }, wert: S.zeigeGebiete }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y) { Modell.setzePunkt(z, [x, y]); },
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px, m = z.m, d = z.d, N = z.nach;
      const X = k => (k % m) * d, Y = k => Math.floor(k / m) * d;
      Karte.gelaende(ctx, z.G, F, { hoehenlinien: 20 });
      // Einzugsgebiete: jede Rasterzelle in der Farbe ihres Gebiets
      if (z.gruppiert && p.zeigeGebiete) {
        const C = Array.from({ length: z.anzahlGebiete }, (_, g) => gebietRGB(z, g, F)), a = F.dunkel ? 48 : 70;
        Sim.raster(ctx, m, m, D => { for (let k = 0; k < m * m; k++) { const c = C[z.gebiet[k]]; D[4 * k] = c[0]; D[4 * k + 1] = c[1]; D[4 * k + 2] = c[2]; D[4 * k + 3] = a; } }, -d / 2, -d / 2, m * d, m * d);
      }
      // kurze Fließwege: jeder Rasterpunkt → steilster Nachbar
      if (p.zeigeKurz) {
        if (z.gruppiert) {
          for (let g = 0; g < z.anzahlGebiete; g++) {
            ctx.beginPath();
            for (let k = 0; k < N.length; k++) if (N[k] >= 0 && z.gebiet[k] === g) { ctx.moveTo(X(k), Y(k)); ctx.lineTo(X(N[k]), Y(N[k])); }
            ctx.strokeStyle = css(gebietRGB(z, g, F), 0.9); ctx.lineWidth = px * 0.9; ctx.stroke();
          }
        } else {
          ctx.beginPath();
          for (let k = 0; k < N.length; k++) if (N[k] >= 0) { ctx.moveTo(X(k), Y(k)); ctx.lineTo(X(N[k]), Y(N[k])); }
          ctx.strokeStyle = F.dunkel ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.2)"; ctx.lineWidth = px * 0.7; ctx.stroke();
        }
      }
      // durchflossene Abschnitte: Breite wächst mit der Zahl der Tropfen, die durchgelaufen sind (Abflussmenge)
      ctx.lineCap = "round";
      for (let k = 0; k < N.length; k++) {
        const c = z.durch[k]; if (!c) continue;
        ctx.beginPath(); ctx.moveTo(X(k), Y(k)); ctx.lineTo(X(N[k]), Y(N[k]));
        ctx.strokeStyle = z.gruppiert ? css(gebietRGB(z, z.gebiet[k], F).map(v => F.dunkel ? v : v * 0.8)) : wasser(F);
        ctx.lineWidth = px * Math.min(7, 0.5 + 0.4 * Math.sqrt(c)); ctx.stroke();
      }
      // Tropfen unterwegs: aktueller Abschnitt wächst um teil/TEILE
      if (z.aktiv > 0 && z.t > 0) {
        const da = new Uint8Array(N.length); for (let k = 0; k < z.pos.length; k++) if (N[z.pos[k]] >= 0) da[z.pos[k]] = 1;
        const f = z.teil / Modell.TEILE, kopf = [];
        ctx.beginPath();
        for (let k = 0; k < N.length; k++) if (da[k]) {
          const q = [X(k) + (X(N[k]) - X(k)) * f, Y(k) + (Y(N[k]) - Y(k)) * f];
          ctx.moveTo(X(k), Y(k)); ctx.lineTo(q[0], q[1]); kopf.push(q);
        }
        ctx.strokeStyle = wasser(F); ctx.lineWidth = px * 1.3; ctx.stroke();
        ctx.fillStyle = F.akzent; ctx.beginPath();
        for (const q of kopf) { ctx.moveTo(q[0] + px * 1.3, q[1]); ctx.arc(q[0], q[1], px * 1.3, 0, 2 * Math.PI); }
        ctx.fill();
      }
      ctx.lineCap = "butt";
      // Senken (Endpunkte der langen Fließwege)
      if (z.gruppiert) for (const k of z.senken) Karte.punkt(ctx, [X(k), Y(k)], px * 3.2, F.papier, F.tinte, px * 1.2);
      // lokale Analyse
      const L = Modell.lokal(z, z.punkt);
      if (p.pfeil > 0 && L.gefaelle > 1e-9) Karte.pfeil(ctx, z.punkt, L.richtung, p.pfeil, ROT, px * 2.4);
      Karte.punkt(ctx, z.punkt, px * 5, ROT, F.papier, px * 1.5);
      Karte.text(ctx, `${zahl(L.neigung, 1)}°`, [z.punkt[0] + px * 9, z.punkt[1] - px * 10], F.tinte, px, 12);
    },
    legende: (F, p, z) => [[wasser(F), { de: "Fließwege (Abfluss)", en: "Flow paths (runoff)" }],
      [Karte.farbe(0.15, "spektral"), { de: "Einzugsgebiete", en: "Watersheds" }], [F.tinte, { de: "Senke / Endpunkt", en: "Sink / end point" }], [ROT, { de: "Analysepunkt", en: "Analysis point" }]],
    kennzahlen(z, p) {
      const L = Modell.lokal(z, z.punkt), a = azimut(L.richtung), l = en() ? "en" : "de";
      const groesste = z.gruppiert && z.anzahlGebiete ? Math.max(...z.groesseGebiet) / (z.m * z.m) * 100 : 0;
      return [
        [{ de: "Rasterpunkte", en: "Grid points" }, `${z.m} × ${z.m}`],
        [{ de: "Feldgröße", en: "Cell size" }, zahl(z.d, 1) + " m"],
        [{ de: "Glättungsdurchgänge", en: "Smoothing passes" }, String(Modell.durchgaenge(p.glaettung))],
        [{ de: "Abschnitt", en: "Segment" }, `${z.abschnitte} / ${z.maxLaenge}`],
        [{ de: "Tropfen unterwegs", en: "Drops moving" }, zahl(z.aktiv)],
        [{ de: "Senken (Endpunkte)", en: "Sinks (end points)" }, zahl(z.senken.length)],
        [{ de: "Einzugsgebiete", en: "Watersheds" }, z.gruppiert ? zahl(z.anzahlGebiete) : { de: "nach dem Lauf", en: "after the run" }],
        [{ de: "größtes Gebiet", en: "Largest watershed" }, z.gruppiert ? zahl(groesste, 1) + " %" : "–"],
        [{ de: "längster Fließweg", en: "Longest flow path" }, `${z.maxLaenge} ${en() ? "segments" : "Abschnitte"}`],
        [{ de: "Punkt: Höhe", en: "Point: elevation" }, zahl(L.hoehe, 1) + " m"],
        [{ de: "Punkt: Neigung", en: "Point: slope" }, zahl(L.neigung, 1) + "°"],
        [{ de: "Punkt: Fließrichtung", en: "Point: flow direction" }, L.gefaelle > 1e-9 ? `${zahl(a)}° ${KOMPASS[l][Math.round(a / 45) % 8]}` : "–"]
      ];
    }
  });
})();
