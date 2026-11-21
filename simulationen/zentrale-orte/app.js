/* Zentralität und zentrale Orte · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const G = [{ de: "Rot · Rang 1", en: "Red · rank 1" }, { de: "Blau · Rang 2", en: "Blue · rank 2" }, { de: "Gelb · Rang 3", en: "Yellow · rank 3" }];
  const AUF = { de: "Aufbau", en: "Setup" }, DARST = { de: "Darstellung", en: "Display" };
  const N = ["Rot", "Blau", "Gelb"];
  const grenzen = [{ dist: [5, 200], n: 50 }, { dist: [5, 120], n: 90 }, { dist: [5, 120], n: 90 }];
  const regler = [];
  N.forEach((n, j) => regler.push(
    { id: "dist" + n, gruppe: G[j], name: { de: "Anlagerungsdistanz", en: "Attachment distance" }, min: grenzen[j].dist[0], max: grenzen[j].dist[1], wert: S["dist" + n] },
    { id: "repel" + n, gruppe: G[j], name: { de: "Abstoßdistanz", en: "Repel distance" }, min: 1, max: 30, wert: S["repel" + n] },
    { id: "bind" + n, gruppe: G[j], name: { de: "Bindungen", en: "Bonds" }, min: 1, max: 10, wert: S["bind" + n] },
    { id: "anzahl" + n, gruppe: G[j], name: { de: "Anzahl", en: "Number" }, min: 0, max: 300, wert: S["anzahl" + n], neustart: j === 0 }));

  // Farben wie im Original (clRed, clBlue, clYellow), etwas aufgehellt bzw. für die helle Darstellung abgedunkelt
  const farben = F => F.dunkel ? ["#ff3b30", "#4d7bff", "#ffe600"] : ["#d92d20", "#1f4fe0", "#b89600"];
  const zahl = v => isNaN(v) ? "–" : v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 2 },
    parameter: [
      { id: "aufbau", gruppe: AUF, name: { de: "Aufbau", en: "Setup" }, art: "auswahl", wert: S.aufbau, neustart: true,
        optionen: [{ wert: "nacheinander", name: { de: "nacheinander", en: "in turn" } },
                   { wert: "hand", name: { de: "von Hand", en: "by hand" } },
                   { wert: "alle", name: { de: "alle gleichzeitig", en: "all at once" } }] },
      { id: "minAbstand", gruppe: AUF, name: { de: "Mindestabstand", en: "Minimum distance" }, min: 1, max: 50, wert: S.minAbstand },
      { id: "verbindungen", gruppe: DARST, name: { de: "Verbindungslinien", en: "Connecting lines" }, art: "schalter", wert: S.verbindungen },
      { id: "radien", gruppe: DARST, name: { de: "Anlagerungsradien zeigen", en: "Show attachment radii" }, art: "schalter", wert: S.radien },
      { id: "zellen", gruppe: DARST, name: { de: "Zellen markieren", en: "Mark cells" }, art: "schalter", wert: S.zellen },
      ...regler
    ],
    aktionen: [0, 1, 2].map(r => ({ name: [{ de: "+ Rot", en: "+ red" }, { de: "+ Blau", en: "+ blue" }, { de: "+ Gelb", en: "+ yellow" }][r],
                                    tue: (z, p) => { Modell.hinzufuegen(z, p, r, p["anzahl" + N[r]]); if (r === 1) z.blau = true; if (r === 2) z.gelb = true; } })),
    groesse: z => ({ b: z.breite, h: z.hoehe }),
    ende: (z, p) => z.t > 0 && z.bewegt === 0 && (p.aufbau !== "nacheinander" || z.gelb),   // System in Ruhe
    klick(z, p, x, y, taste, phase) { if (phase === "unten") Modell.neuerAgent(z, x, y, 0); },  // ImagePaintClick: roter Agent
    zeichne(ctx, z, p, F) {
      const FA = farben(F);
      if (p.zellen) {
        Sim.raster(ctx, z.spalten, z.zeilen, d => {
          for (let n = 0; n < z.zellen.length; n++) {
            const v = z.zellen[n], u = Math.min(255, Math.abs(v)) / 255;
            const c = v < 0 ? Sim.mische(F.rgb.flaeche, [0, 0, 255], u) : v > 0 ? Sim.mische(F.rgb.flaeche, [255, 255, 0], u) : F.rgb.flaeche;
            d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255;
          }
        }, 0, 0, z.spalten * z.zelle, z.zeilen * z.zelle);
      }
      const ag = z.ag, W = z.breite, H = z.hoehe;
      const linie = (a, b) => { if (Math.abs(a.x - b.x) > W / 2 || Math.abs(a.y - b.y) > H / 2) return; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); };
      if (p.verbindungen) {                                     // Verbinden: Linien in der Farbe des Agenten zu seinen Bindungen
        ctx.lineWidth = F.px;
        for (let r = 0; r < 3; r++) {
          ctx.strokeStyle = FA[r]; ctx.beginPath();
          for (const a of ag) if (a.rang === r) { for (const k of a.bindSelf) linie(a, ag[k]); for (const k of a.bindOther) linie(a, ag[k]); }
          ctx.stroke();
        }
      }
      if (p.radien) {                                           // RegionPaint: Anlagerungsdistanz und Distanz − Abstoßdistanz, gepunktet
        ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.lineWidth = F.px; ctx.globalAlpha = 0.6;
        for (let r = 0; r < 3; r++) {
          const d = p["dist" + N[r]], q = d - p["repel" + N[r]];
          ctx.strokeStyle = FA[r]; ctx.beginPath();
          for (const a of ag) if (a.rang === r) { ctx.moveTo(a.x + d, a.y); ctx.arc(a.x, a.y, d, 0, 2 * Math.PI); if (q > 0) { ctx.moveTo(a.x + q, a.y); ctx.arc(a.x, a.y, q, 0, 2 * Math.PI); } }
          ctx.stroke();
        }
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      const rad = [4, 3.2, 2.6];
      for (let r = 0; r < 3; r++) {                             // Agenten: gefüllte Kreise mit feinem Rand
        ctx.fillStyle = FA[r]; ctx.strokeStyle = F.papier; ctx.lineWidth = 0.8 * F.px; ctx.beginPath();
        for (const a of ag) if (a.rang === r) { ctx.moveTo(a.x + rad[r], a.y); ctx.arc(a.x, a.y, rad[r], 0, 2 * Math.PI); }
        ctx.fill(); ctx.stroke();
      }
    },
    legende(F, p) {
      const FA = farben(F);
      const L = [[FA[0], { de: "Zentrum Rang 1", en: "centre rank 1" }], [FA[1], { de: "Rang 2", en: "rank 2" }], [FA[2], { de: "Rang 3", en: "rank 3" }]];
      if (p.zellen) L.push(["#0000ff", { de: "Zelle: blau überwiegt", en: "cell: blue dominates" }], ["#ffff00", { de: "gelb überwiegt", en: "yellow dominates" }]);
      return L;
    },
    kennzahlen(z) {
      const c = Modell.zaehle(z);
      return [
        [{ de: "Agenten rot · blau · gelb", en: "Agents red · blue · yellow" }, c.n.join(" · ")],
        [{ de: "angelagert blau → rot", en: "attached blue → red" }, c.n[1] ? `${c.an[1]} / ${c.n[1]}` : "–"],
        [{ de: "angelagert gelb → blau", en: "attached yellow → blue" }, c.n[2] ? `${c.an[2]} / ${c.n[2]}` : "–"],
        [{ de: "Verbindungen rot – rot", en: "Links red – red" }, String(c.rotRot)],
        [{ de: "Abstand rot – nächstes Rot", en: "Distance red – nearest red" }, zahl(Modell.rotAbstand(z))],
        [{ de: "in Bewegung", en: "moving" }, z.t ? String(z.bewegt) : "–"]
      ];
    }
  });
})();
