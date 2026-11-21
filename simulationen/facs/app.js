/* FACS – Free Agents in Cellular Space · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, V = Modell.VOR, B = Modell.BREITE, H = Modell.HOEHE, Z = Modell.ZELLE;
  const G1 = { de: "Fassung", en: "Version" }, G2 = { de: "Maus", en: "Mouse" }, G3 = { de: "Schwarm (02, 03)", en: "Swarm (02, 03)" };
  const G4 = { de: "Sichtfeld (03)", en: "Field of view (03)" }, G5 = { de: "Bewegung und Darstellung", en: "Movement and display" };
  // Farben des Originals: Agenten clRed mit Rand clGreen, Zellen clBlue / RGB(125, 165, 255), Raster clGreen,
  // Verbindungslinien RGB(70, 70, 70) (01), clRed (02), Bewegungsvektoren clLime (03)
  const ROT = "#ff0000", GRUEN = "#008000", BLAU = [0, 0, 255], HELLBLAU = [125, 165, 255], LIMETTE = "#00ff00";
  const prozent = v => (100 * v).toFixed(0) + " %";
  const zahl = (v, n = 2) => v.toFixed(n).replace(".", document.documentElement.lang === "en" ? "." : ",");
  const hintergrund = F => F.dunkel ? [0, 0, 0] : F.rgb.flaeche;

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "fassung", gruppe: G1, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true,
        optionen: [{ wert: "01", name: { de: "01 FACS (4.5.2005)", en: "01 FACS (4 May 2005)" } },
                   { wert: "02", name: { de: "02 Einfaches Schwarmverhalten (9.5.2005)", en: "02 Simple swarming (9 May 2005)" } },
                   { wert: "03", name: { de: "03 Schwarmverhalten (10.5.2005)", en: "03 Swarming (10 May 2005)" } }],
        folgen: { "01": V["01"], "02": V["02"], "03": V["03"] } },
      { id: "anzahl", gruppe: G1, name: { de: "Knotenpunkte je „Create Pts“", en: "Nodes per “Create Pts”" }, min: 10, max: 1000, schritt: 10, wert: S.anzahl, neustart: true },
      { id: "mausRadius", gruppe: G2, name: { de: "Mausradius", en: "Mouse radius" }, min: 5, max: 200, wert: S.mausRadius },
      { id: "mausModus", gruppe: G2, name: { de: "Attract/Repel", en: "Attract/Repel" }, art: "auswahl", wert: S.mausModus,
        optionen: [{ wert: "abstossen", name: { de: "abstoßen (Repel)", en: "repel" } }, { wert: "anziehen", name: { de: "anziehen (Attract)", en: "attract" } }] },
      { id: "schwarm", gruppe: G3, name: { de: "Swarming", en: "Swarming" }, art: "schalter", wert: S.schwarm },
      { id: "radius", gruppe: G3, name: { de: "Interaktionsradius", en: "Interaction radius" }, min: 5, max: 200, wert: S.radius },
      { id: "mindest", gruppe: G3, name: { de: "Mindestabstand", en: "Minimum distance" }, min: 1, max: 50, wert: S.mindest },
      { id: "sicht", gruppe: G4, name: { de: "Sichtfeld in °", en: "Field of view in °" }, min: 10, max: 360, wert: S.sicht },
      { id: "arccos", gruppe: G4, name: { de: "Winkel mit ArcCos (statt ArcSin)", en: "Angle with arccos (not arcsin)" }, art: "schalter", wert: S.arccos },
      { id: "vmax", gruppe: G5, name: { de: "Höchstgeschwindigkeit (px)", en: "Maximum speed (px)" }, min: 1, max: 20, schritt: 0.5, wert: S.vmax },
      { id: "zellen", gruppe: G5, name: { de: "Zellen markieren", en: "Mark cells" }, art: "schalter", wert: S.zellen },
      { id: "linien", gruppe: G5, name: { de: "Verbindungslinien / Bewegungsvektoren", en: "Connection lines / motion vectors" }, art: "schalter", wert: S.linien }
    ],
    aktionen: [
      { name: { de: "Create Pts", en: "Create Pts" }, tue(z, p) { Modell.erzeugeAgenten(z, p.anzahl); if (p.zellen && p.fassung !== "03") Modell.markiere(z); } },
      { name: { de: "Delete 100", en: "Delete 100" }, tue(z, p) { Modell.loescheAgenten(z, 100); if (p.zellen && p.fassung !== "03") Modell.markiere(z); } },
      { name: { de: "Cells Black", en: "Cells Black" }, tue(z) { Modell.zellenSchwarz(z); z.marke.fill(0); } }
    ],
    groesse: () => ({ b: B, h: H }),
    zeichne(ctx, z, p, F) {
      const bg = hintergrund(F), drei = p.fassung === "03", ink = F.dunkel ? [255, 255, 255] : F.rgb.tinte;
      // Zellen (RectanglPaint): 01/02 Markierung, 03 Begehung als Grauwert (im Hellen umgekehrt: dunkel = oft begangen)
      Sim.raster(ctx, Modell.SPALTEN, Modell.ZEILEN, d => {
        for (let c = 0; c < Modell.SPALTEN * Modell.ZEILEN; c++) {
          let f = bg;
          if (drei) { const u = z.begangen[c] / 255; if (u) f = [0, 1, 2].map(k => bg[k] + (ink[k] - bg[k]) * u); }
          else if (z.marke[c] === 10) f = BLAU; else if (z.marke[c] === 1) f = HELLBLAU;
          d[4 * c] = f[0]; d[4 * c + 1] = f[1]; d[4 * c + 2] = f[2]; d[4 * c + 3] = 255;
        }
      }, 0, 0, B, H);
      // Raster: Zellen mit grünem Rand (cell.pas: Pen.Color clGreen)
      ctx.strokeStyle = F.dunkel ? "rgba(0,128,0,0.75)" : "rgba(0,128,0,0.28)"; ctx.lineWidth = F.px; ctx.beginPath();
      for (let k = 1; k < Modell.SPALTEN; k++) { ctx.moveTo(k * Z, 0); ctx.lineTo(k * Z, H); }
      for (let r = 1; r < Modell.ZEILEN; r++) { ctx.moveTo(0, r * Z); ctx.lineTo(B, r * Z); }
      ctx.stroke();
      // Linien
      if (p.linien) {
        ctx.lineWidth = 1.2 * F.px; ctx.beginPath();
        if (p.fassung === "01") {                                    // Connect: alle Paare mit distance < 40
          ctx.strokeStyle = F.dunkel ? "rgb(70,70,70)" : "rgba(0,0,0,0.3)";
          for (let i = 0; i < z.n; i++) for (let k = i + 1; k < z.n; k++)
            if (Modell.abstand(z.x[i], z.y[i], z.x[k], z.y[k]) < Modell.LINIE_01) { ctx.moveTo(z.x[i], z.y[i]); ctx.lineTo(z.x[k], z.y[k]); }
        } else if (p.fassung === "02") {                             // Verbinden: zum nächsten Nachbarn, alte Positionen (nur mit Swarming)
          ctx.strokeStyle = ROT;
          if (p.schwarm) for (let j = 0; j < z.n; j++) {
            const k = z.nb[j];
            if (k >= 0 && k < z.n && z.sd[j] < p.radius) { ctx.moveTo(z.ox[j], z.oy[j]); ctx.lineTo(z.ox[k], z.oy[k]); }
          }
        } else {                                                     // BewegVekt: Linie von der Position 7 · round(Step) zurück
          ctx.strokeStyle = F.dunkel ? LIMETTE : "#1f9d1f";
          for (let j = 0; j < z.n; j++) { ctx.moveTo(z.x[j], z.y[j]); ctx.lineTo(z.x[j] - 7 * Modell.rund(z.sx[j]), z.y[j] - 7 * Modell.rund(z.sy[j])); }
        }
        ctx.stroke();
      }
      // Agenten: Kreis mit Size 3, rot mit grünem Rand
      ctx.beginPath();
      for (let i = 0; i < z.n; i++) { ctx.moveTo(z.x[i] + 3, z.y[i]); ctx.arc(z.x[i], z.y[i], 3, 0, 2 * Math.PI); }
      ctx.fillStyle = ROT; ctx.fill(); ctx.strokeStyle = GRUEN; ctx.lineWidth = Math.max(F.px, 0.8); ctx.stroke();
      // Wirkungskreis der Maus (neu, nur Anzeige)
      if (z.maus.aktiv) {
        ctx.save(); ctx.setLineDash([4 * F.px, 4 * F.px]); ctx.strokeStyle = F.akzentText; ctx.lineWidth = F.px;
        ctx.beginPath(); ctx.arc(z.maus.x, z.maus.y, p.mausRadius, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
      }
    },
    legende(F, p) {
      const L = [[ROT, { de: "Agent (Knotenpunkt)", en: "agent (node)" }]];
      if (p.fassung === "03") {
        L.push([F.dunkel ? "#ffffff" : F.tinte, { de: "Zelle oft begangen", en: "cell often passed" }]);
        if (p.linien) L.push([F.dunkel ? LIMETTE : "#1f9d1f", { de: "Bewegungsvektor", en: "motion vector" }]);
      } else {
        L.push([Sim.css(BLAU), { de: "Zelle mit Agent", en: "cell with agent" }], [Sim.css(HELLBLAU), { de: "Moore-Nachbar", en: "Moore neighbour" }]);
        if (p.linien && p.fassung === "01") L.push([F.dunkel ? "rgb(70,70,70)" : "rgba(0,0,0,0.3)", { de: "Abstand < 40 px", en: "distance < 40 px" }]);
        if (p.linien && p.fassung === "02") L.push([ROT, { de: "Linie zum nächsten Nachbarn", en: "line to nearest neighbour" }]);
      }
      return L;
    },
    kennzahlen(z, p) {
      const lok = z.n <= 800 ? Modell.lokaleOrdnung(z, Math.max(p.radius, 40)) : null;
      return [
        [{ de: "Anzahl Knotenpunkte", en: "Number of nodes" }, String(z.n)],
        [{ de: "mittlere Geschwindigkeit", en: "mean speed" }, zahl(Modell.tempo(z)) + " px"],
        [{ de: "Ausrichtung zum nächsten Nachbarn", en: "alignment with nearest neighbour" }, lok == null ? "–" : zahl(lok)],
        [{ de: "Ordnung des ganzen Schwarms", en: "order of the whole swarm" }, zahl(Modell.ordnung(z))],
        [p.fassung === "03" ? { de: "begangene Zellen", en: "cells passed" } : { de: "markierte Zellen", en: "marked cells" },
         p.zellen || p.fassung === "03" ? prozent(Modell.zellAnteil(z, p.fassung)) : "–"]
      ];
    }
  });

  // Maus wie im Original (ImagePaintMouseMove): wirkt beim Überfahren, ohne Klick; mit dem Finger beim Ziehen.
  // Verlässt die Maus die Zeichenfläche, wirkt sie nicht mehr (im Original blieb die letzte Position aktiv).
  const leinwand = document.getElementById("leinwand");
  const ort = e => { const r = leinwand.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * B, (e.clientY - r.top) / r.height * H]; };
  const setze = (e, aktiv) => {
    if (!window.SIM || !SIM.zustand) return;
    const [x, y] = ort(e); Modell.setzeMaus(SIM.zustand, x, y, aktiv);
    if (!SIM.laeuft) SIM.zeichne();
  };
  leinwand.addEventListener("pointermove", e => setze(e, true));
  leinwand.addEventListener("pointerdown", e => setze(e, true));
  leinwand.addEventListener("pointerleave", e => setze(e, false));
  leinwand.addEventListener("pointerup", e => { if (e.pointerType !== "mouse") setze(e, false); });
  leinwand.addEventListener("pointercancel", e => setze(e, false));
})();
