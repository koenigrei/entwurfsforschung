/* Separation durch Standortpräferenzen · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const AUF = { de: "Agenten", en: "Agents" }, ANL = { de: "Anlagerung", en: "Attachment" }, DARST = { de: "Darstellung", en: "Display" };
  // Farben wie im Original (clRed, clBlue, clYellow), für die jeweilige Darstellung lesbar gemacht
  const farben = F => F.dunkel ? ["#ff3b30", "#4d7bff", "#ffe600"] : ["#d92d20", "#1f4fe0", "#b89600"];
  const zahl = v => isNaN(v) ? "–" : v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + " %";

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 2 },
    parameter: [
      { id: "punkte", gruppe: AUF, name: { de: "Punkte (¼ rot, ¼ blau, ½ gelb)", en: "Points (¼ red, ¼ blue, ½ yellow)" }, min: 20, max: 400, schritt: 4, wert: S.punkte, neustart: true },
      { id: "zusatzBlau", gruppe: AUF, name: { de: "weitere Blaue (Gewerbe)", en: "additional blue (industry)" }, min: 0, max: 400, schritt: 50, wert: S.zusatzBlau, neustart: true },
      { id: "zusatzGelb", gruppe: AUF, name: { de: "weitere Gelbe (Wohnen)", en: "additional yellow (housing)" }, min: 0, max: 400, schritt: 50, wert: S.zusatzGelb, neustart: true },
      { id: "distRot", gruppe: ANL, name: { de: "Anlagerungsdistanz Rot", en: "Attachment distance red" }, min: 5, max: 200, wert: S.distRot },
      { id: "distBlau", gruppe: ANL, name: { de: "Anlagerungsdistanz Blau", en: "Attachment distance blue" }, min: 5, max: 100, wert: S.distBlau },
      { id: "distGelb", gruppe: ANL, name: { de: "Anlagerungsdistanz Gelb", en: "Attachment distance yellow" }, min: 5, max: 100, wert: S.distGelb },
      { id: "minAbstand", gruppe: ANL, name: { de: "Mindestabstand", en: "Minimum distance" }, min: 1, max: 50, wert: S.minAbstand },
      { id: "zellen", gruppe: DARST, name: { de: "Zellen markieren (Meiden wirkt)", en: "Mark cells (avoidance active)" }, art: "schalter", wert: S.zellen },
      { id: "verbindungen", gruppe: DARST, name: { de: "Verbindungslinien", en: "Connecting lines" }, art: "schalter", wert: S.verbindungen }
    ],
    aktionen: [{ name: { de: "+ 50 Blau", en: "+ 50 blue" }, tue: z => Modell.hinzufuegen(z, Modell.BLAU) },
               { name: { de: "+ 50 Gelb", en: "+ 50 yellow" }, tue: z => Modell.hinzufuegen(z, Modell.GELB) }],
    groesse: z => ({ b: z.breite, h: z.hoehe }),
    klick(z, p, x, y, taste, phase) { if (phase === "unten") Modell.neuerAgent(z, x, y, Modell.ROT, false); },   // ImagePaintClick: ruhender roter Knoten
    zeichne(ctx, z, p, F) {
      const FA = farben(F);
      Sim.raster(ctx, z.spalten, z.zeilen, d => {            // RectanglPaint: negative Zellen blau, positive gelb, Intensität bis 255
        for (let n = 0; n < z.zellen.length; n++) {
          const v = z.zellen[n], u = Math.min(255, Math.abs(v)) / 255;
          const c = v < 0 ? Sim.mische(F.rgb.flaeche, [0, 0, 255], u) : v > 0 ? Sim.mische(F.rgb.flaeche, F.dunkel ? [255, 255, 0] : [214, 190, 0], u) : F.rgb.flaeche;
          d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255;
        }
      }, 0, 0, z.spalten * z.zelle, z.zeilen * z.zelle);
      const ag = z.ag, W = z.breite, H = z.hoehe;
      if (p.verbindungen) {                                   // Verbinden: Linie in der Farbe des Agenten zu den Roten, an die er gebunden ist
        ctx.lineWidth = F.px;
        for (let r = 0; r < 3; r++) {
          ctx.strokeStyle = FA[r]; ctx.beginPath();
          for (const a of ag) if (a.rang === r) for (const k of a.bind) {
            const b = ag[k]; if (Math.abs(a.x - b.x) > W / 2 || Math.abs(a.y - b.y) > H / 2) continue;
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          }
          ctx.stroke();
        }
      }
      const rad = [3.5, 3, 3];
      for (const r of [1, 2, 0]) {
        ctx.fillStyle = FA[r]; ctx.strokeStyle = F.papier; ctx.lineWidth = 0.8 * F.px; ctx.beginPath();
        for (const a of ag) if (a.rang === r) { ctx.moveTo(a.x + rad[r], a.y); ctx.arc(a.x, a.y, rad[r], 0, 2 * Math.PI); }
        ctx.fill(); ctx.stroke();
      }
    },
    legende(F) {
      const FA = farben(F);
      return [[FA[0], { de: "Knoten (Erschließung)", en: "node (access network)" }], [FA[1], { de: "Gewerbe", en: "industry" }], [FA[2], { de: "Wohnen", en: "housing" }],
              ["#0000ff", { de: "Zelle gewerblich", en: "cell industrial" }], [F.dunkel ? "#ffff00" : "#d6be00", { de: "Zelle Wohnen", en: "cell residential" }]];
    },
    kennzahlen(z) {
      const a = Modell.auswertung(z);
      return [
        [{ de: "Agenten rot · blau · gelb", en: "Agents red · blue · yellow" }, a.n.join(" · ")],
        [{ de: "an Knoten angelagert blau · gelb", en: "attached to nodes blue · yellow" }, `${a.an[1]} · ${a.an[2]}`],
        [{ de: "Verbindungen rot – rot", en: "Links red – red" }, String(a.links)],
        [{ de: "gleichfarbige Nachbarn (30 px)", en: "same-colour neighbours (30 px)" }, zahl(a.gleich)],
        [{ de: "von ihrer Zelle vertrieben", en: "driven off their cell" }, z.t ? String(z.abgewiesen) : "–"]
      ];
    }
  });
})();
