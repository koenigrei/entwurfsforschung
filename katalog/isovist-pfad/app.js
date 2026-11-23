/* Isovist entlang eines Weges · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const ORANGE = "#f5a300", ROT = "#e0312b";
  /** Höhe des Verlaufsdiagramms unter dem Plan (Modelleinheiten) */
  const DIAG = 64;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 1) => isFinite(v) ? v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n }) : "–";
  const EINHEIT = { area: " m²", areaDist: " m³", perimeter: " m", occlusivity: " m", minRadial: " m", maxRadial: " m", meanRadial: " m", stdDev: " m", variance: " m²", driftMagnitude: " m", driftAngle: "°" };
  const wert = (k, v) => zahl(v, ["area", "areaDist", "variance"].includes(k) ? 0 : ["compactness", "circularity", "convexDeficiency", "skewness", "dispersion", "elongation"].includes(k) ? 3 : 1) + (isFinite(v) ? EINHEIT[k] || "" : "");
  const name = k => Modell.kenngroesseName(k);   // mit „ *“ bei eigener Definition

  /** Verlauf der gewählten Kenngröße entlang des Weges (wie das Katalogbild „Isovist Statistics“) */
  function diagramm(ctx, z, p, F, x0, y0, w, h) {
    const P = Modell.profil(z, p), k = p.kenngroesse, W = P.werte[k], lo = P.min[k], hi = P.max[k], px = F.px;
    const X = a => x0 + a * w, Y = v => y0 + h - (hi > lo ? (v - lo) / (hi - lo) : 0.5) * h;
    ctx.fillStyle = F.dunkel ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)"; ctx.fillRect(x0, y0, w, h);
    // Gitter: Zehntel des Weges senkrecht, Viertel des Wertebereichs waagerecht
    ctx.beginPath();
    for (let i = 1; i < 10; i++) { ctx.moveTo(X(i / 10), y0); ctx.lineTo(X(i / 10), y0 + h); }
    for (let i = 1; i < 4; i++) { ctx.moveTo(x0, y0 + h * i / 4); ctx.lineTo(x0 + w, y0 + h * i / 4); }
    ctx.strokeStyle = F.linie; ctx.lineWidth = px * 0.6; ctx.stroke();
    ctx.strokeStyle = F.gedaempft; ctx.lineWidth = px * 0.8; ctx.strokeRect(x0, y0, w, h);
    // ganzer Verlauf gedämpft, zurückgelegter Teil kräftig
    const linie = (bis, farbe, lw) => {
      ctx.beginPath(); let erst = true;
      for (let i = 0; i <= P.n && i / P.n <= bis + 1e-9; i++) { const x = X(i / P.n), y = Y(W[i]); if (erst) { ctx.moveTo(x, y); erst = false; } else ctx.lineTo(x, y); }
      if (bis < 1) ctx.lineTo(X(bis), Y(z.masse[k]));
      ctx.strokeStyle = farbe; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.stroke();
    };
    linie(1, F.gedaempft, px * 1);
    linie(z.anteil, ROT, px * 2);
    ctx.beginPath(); ctx.moveTo(X(z.anteil), y0); ctx.lineTo(X(z.anteil), y0 + h); ctx.strokeStyle = F.tinte; ctx.lineWidth = px * 1; ctx.stroke();
    Karte.punkt(ctx, [X(z.anteil), Y(z.masse[k])], 3.5 * px, ROT, F.tinte, px);
    const nm = name(k), fs = 11;
    Karte.text(ctx, `${de() ? nm.de : nm.en} ${de() ? "entlang des Weges" : "along the path"}`, [x0 + 6 * px, y0 + 9 * px], F.tinte, px, fs);
    Karte.text(ctx, wert(k, hi), [x0 + w - 6 * px, y0 + 9 * px], F.gedaempft, px, fs - 1, "right");
    Karte.text(ctx, wert(k, lo), [x0 + w - 6 * px, y0 + h - 8 * px], F.gedaempft, px, fs - 1, "right");
    Karte.text(ctx, `${de() ? "Punkt auf dem Weg" : "Point on path"} ${zahl(z.anteil, 3)}`, [x0 + 6 * px, y0 + h - 8 * px], F.gedaempft, px, fs - 1);
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "anteil", gruppe: { de: "Weg", en: "Path" }, name: { de: "Punkt auf dem Weg (Point On Curve)", en: "Point on curve" }, min: 0, max: 1, schritt: 0.001, wert: S.anteil },
      { id: "winkel", gruppe: { de: "Isovist", en: "Isovist" }, name: { de: "Blickwinkel (Viewing Angle) °", en: "Viewing angle °" }, min: 0, max: 360, schritt: 1, wert: S.winkel },
      { id: "reichweite", name: { de: "Reichweite (Viewing Range) m", en: "Viewing range (m)" }, min: 1, max: 200, schritt: 1, wert: S.reichweite },
      { id: "strahlen", name: { de: "Strahlen (Isovist Rays)", en: "Isovist rays" }, min: 1, max: 720, schritt: 1, wert: S.strahlen },
      { id: "kenngroesse", art: "auswahl", name: { de: "Kenngröße (Isovist Properties)", en: "Isovist property" }, wert: S.kenngroesse,
        optionen: Geo.ISOVIST_MASSE.map(([k]) => Modell.kenngroesseOption(k)) },
      { id: "schrittweite", gruppe: { de: "Abspielen", en: "Playback" }, name: { de: "Weg je Schritt (Anteil)", en: "Path per step (fraction)" }, min: 0.001, max: 0.02, schritt: 0.001, wert: S.schrittweite },
      { id: "amEnde", art: "auswahl", name: { de: "Am Ende des Weges", en: "At the end of the path" }, wert: S.amEnde,
        optionen: [{ wert: "anhalten", name: { de: "anhalten", en: "stop" } }, { wert: "vonVorn", name: { de: "von vorn", en: "start over" } }] },
      { id: "zeigeStrahlen", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "Strahlen zeigen", en: "Show rays" }, wert: true },
      { id: "zeigePolygon", art: "schalter", name: { de: "Isovist-Polygon zeigen", en: "Show isovist polygon" }, wert: true }
    ],
    aktionen: [{ name: { de: "Weg der Stadt", en: "Town path" }, tue: (z, p) => Modell.pfadZurueck(z, p) }],
    groesse: z => ({ b: z.b, h: z.h + DIAG }),
    klick(z, p, x, y, taste, phase) {
      // Klick ins Diagramm: Punkt auf dem Weg wählen (wie den Regler „Point On Curve“ ziehen)
      if (y > z.h) { if (x >= 8 && x <= z.b - 8) window.SIM.setze("anteil", Math.round(Math.max(0, Math.min(1, (x - 8) / (z.b - 16))) * 1000) / 1000); return; }
      if (taste === "rechts") { if (phase === "unten") Modell.zeichneBeginn(z, [x, y]); else Modell.zeichneWeiter(z, p, [x, y]); return; }
      Modell.geheZu(z, p, [x, y]);
    },
    ende: (z, p) => Modell.amZiel(z, p),
    zeichne(ctx, z, p, F) {
      const px = F.px, iso = z.iso;
      // Regler „Point On Curve“ zeigt die Lage des wandernden Standpunkts (der Parameter selbst bleibt der Startwert für „Zurück“)
      const r = document.getElementById("p-anteil"), o = document.getElementById("o-anteil");
      if (r && document.activeElement !== r) { r.value = z.anteil; if (o) o.textContent = zahl(z.anteil, 3); }
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, z.b, z.h); ctx.clip();          // Plan nicht ins Diagramm zeichnen
      for (const g of z.szene.gebaeude) Karte.poly(ctx, g, F.dunkel ? "#2c2c31" : "#d9d9de", F.dunkel ? "#55555d" : "#a9a9b1", px * 0.6);
      if (p.zeigeStrahlen) {
        ctx.beginPath();
        for (const q of iso.punkte) { ctx.moveTo(z.o[0], z.o[1]); ctx.lineTo(q[0], q[1]); }
        ctx.strokeStyle = "rgba(245,163,0,0.40)"; ctx.lineWidth = px * 0.6; ctx.stroke();
      }
      if (p.zeigePolygon) Karte.poly(ctx, Geo.isovistPolygon(iso), "rgba(245,163,0,0.30)", ORANGE, px * 1.4);
      // Weg (Walking Path) wie im Katalogbild rot
      Karte.linie(ctx, z.pfad, ROT, px * 1.6);
      Karte.punkt(ctx, z.pfad[0], 3 * px, null, ROT, px * 1.2);
      Karte.pfeil(ctx, z.o, [Math.cos(z.richtung), Math.sin(z.richtung)], 16 * px, F.tinte, px * 1.6);
      Karte.punkt(ctx, z.o, 4 * px, F.akzent, F.tinte, px * 1.2);
      const k = p.kenngroesse, nm = name(k);
      Karte.text(ctx, `${de() ? nm.de : nm.en}: ${wert(k, z.masse[k])}`, [z.o[0] + 9 * px, z.o[1] - 11 * px], F.tinte, px, 12);
      ctx.restore();
      // Trennlinie und Verlaufsdiagramm
      ctx.beginPath(); ctx.moveTo(0, z.h); ctx.lineTo(z.b, z.h); ctx.strokeStyle = F.linie; ctx.lineWidth = px; ctx.stroke();
      diagramm(ctx, z, p, F, 8, z.h + 6, z.b - 16, DIAG - 12);
    },
    legende: (F, p) => [[F.dunkel ? "#2c2c31" : "#d9d9de", { de: "Gebäude", en: "Buildings" }], [ROT, { de: "Weg", en: "Path" }], ["rgba(245,163,0,0.7)", { de: "Isovist", en: "Isovist" }], [F.akzent, { de: "Standpunkt", en: "Viewpoint" }]].concat((Modell.EIGENE_DEFINITION.includes(p.kenngroesse) ? [["transparent", Modell.FUSSNOTE]] : [])),
    kennzahlen: (z, p) => [
      [{ de: "Punkt auf dem Weg", en: "Point on path" }, `${zahl(z.anteil, 3)} · ${zahl(z.anteil * z.laenge, 0)} m ${de() ? "von" : "of"} ${zahl(z.laenge, 0)} m`],
      [{ de: "Blickrichtung", en: "View direction" }, zahl(((z.richtung * 180 / Math.PI) % 360 + 360) % 360, 0) + "°"]
    ].concat(Geo.ISOVIST_MASSE.map(([k]) => [name(k), (k === p.kenngroesse ? "▸ " : "") + wert(k, z.masse[k])]))
      .concat([[{ de: "*", en: "*" }, { de: "eigene Definition (in Toolbox v2 gestrichen)", en: "own definition (dropped in toolbox v2)" }]])
  });
})();
