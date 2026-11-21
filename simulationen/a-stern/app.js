/* Shortest Path with A* · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, B = Modell.SPALTEN, H = Modell.ZEILEN;
  // Farben wie im Original: Start grün, Ziel rot, Hindernisse blau, Pfad clLime; freie Zellen schwarz (hell: Fläche)
  const farben = F => ({
    start: F.dunkel ? [40, 190, 70] : [0, 128, 0], ziel: [229, 72, 77], wand: F.dunkel ? [70, 100, 255] : [40, 70, 230],
    pfad: F.dunkel ? [120, 255, 80] : [40, 170, 40], frei: F.dunkel ? [0, 0, 0] : F.rgb.flaeche,
    offen: Sim.mische(F.dunkel ? [0, 0, 0] : F.rgb.flaeche, F.rgb.akzent, F.dunkel ? 0.55 : 0.4),
    zu: Sim.mische(F.dunkel ? [0, 0, 0] : F.rgb.flaeche, F.rgb.tinte, F.dunkel ? 0.2 : 0.14)
  });
  const STATUS = { sucht: { de: "sucht", en: "searching" }, gefunden: { de: "Pfad gefunden", en: "path found" }, keinPfad: { de: "kein Pfad möglich!", en: "no path possible!" } };
  let letzte = -1;                                            // letzte Zelle beim Ziehen (für lückenlose Wände)

  function nachAenderung(z, p) {                              // Original: findPath bei jedem Loslassen der Maus
    Modell.neueSuche(z);
    if (p.sofort) Modell.sucheGanz(z);
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 50, wert: 3 },
    parameter: [
      { id: "werkzeug", gruppe: { de: "Maus", en: "Mouse" }, name: { de: "Werkzeug", en: "Tool" }, art: "auswahl", wert: S.werkzeug,
        optionen: [{ wert: "wand", name: { de: "Wand", en: "Wall" } },
                   { wert: "punkte", name: { de: "Start / Ziel", en: "Start / target" } }] },
      { id: "sofort", gruppe: { de: "Maus", en: "Mouse" }, name: { de: "Pfad nach Änderung sofort", en: "Path right after a change" }, art: "schalter", wert: S.sofort }
    ],
    aktionen: [
      { name: { de: "find Path", en: "find Path" }, tue(z) { Modell.neueSuche(z); Modell.sucheGanz(z); } },
      { name: { de: "Suche neu", en: "New search" }, tue(z) { Modell.neueSuche(z); } },
      { name: { de: "Wände weg", en: "No walls" }, tue(z, p) { Modell.waendeLoeschen(z); nachAenderung(z, p); } }
    ],
    groesse: () => ({ b: B, h: H }),
    ende: z => z.status !== "sucht",
    klick(z, p, x, y, taste, phase) {
      const i = Modell.zelleBei(x, y);
      if (phase === "unten") letzte = -1;
      let geaendert = false;
      if (p.werkzeug === "wand") { geaendert = Modell.wandLinie(z, letzte, i, taste !== "rechts"); letzte = i; }
      else if (phase === "unten") geaendert = taste === "rechts" ? Modell.setzeZiel(z, i) : Modell.setzeStart(z, i);
      if (geaendert) nachAenderung(z, p);
    },
    zeichne(ctx, z, p, F) {
      const c = farben(F), d = z.zelle, pfad = new Uint8Array(d.length);
      for (const k of z.pfad) pfad[k] = 1;
      Sim.raster(ctx, B, H, D => {
        for (let n = 0; n < d.length; n++) {
          const f = n === z.start ? c.start : n === z.ziel ? c.ziel : d[n] ? c.wand : pfad[n] ? c.pfad : z.inOffen[n] ? c.offen : z.geschlossen[n] ? c.zu : c.frei;
          D[4 * n] = f[0]; D[4 * n + 1] = f[1]; D[4 * n + 2] = f[2]; D[4 * n + 3] = 255;
        }
      });
      // Zellenraster (Original: jede Zelle mit schwarzem Rand)
      ctx.strokeStyle = F.dunkel ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"; ctx.lineWidth = F.px; ctx.beginPath();
      for (let k = 1; k < B; k++) { ctx.moveTo(k, 0); ctx.lineTo(k, H); }
      for (let i = 1; i < H; i++) { ctx.moveTo(0, i); ctx.lineTo(B, i); }
      ctx.stroke();
      if (z.status === "sucht" && z.letzte >= 0) {               // zuletzt expandierter Knoten
        ctx.strokeStyle = F.tinte; ctx.lineWidth = 1.5 * F.px;
        ctx.strokeRect(z.letzte % B + 0.1, Math.floor(z.letzte / B) + 0.1, 0.8, 0.8);
      }
    },
    legende(F) {
      const c = farben(F), s = Sim.css;
      return [[s(c.start), { de: "Start", en: "start" }], [s(c.ziel), { de: "Ziel", en: "target" }], [s(c.wand), { de: "Hindernis", en: "obstacle" }],
              [s(c.pfad), { de: "Pfad", en: "path" }], [s(c.offen), { de: "offene Liste", en: "open list" }], [s(c.zu), { de: "geschlossene Liste", en: "closed list" }]];
    },
    kennzahlen(z) {
      const pz = v => (100 * v).toFixed(0) + " %";
      const umweg = z.status === "gefunden" && z.optimum ? ((z.kosten - z.optimum) / z.optimum * 100).toFixed(1).replace(".", ",") + " %" : "–";
      return [[{ de: "Status", en: "Status" }, STATUS[z.status]],
              [{ de: "expandierte Knoten", en: "expanded nodes" }, String(z.iter)],
              [{ de: "offene Liste", en: "open list" }, String(z.offen.length)],
              [{ de: "abgesuchte Zellen", en: "cells searched" }, pz(Modell.abgesucht(z))],
              [{ de: "Pfadlänge (Zellen)", en: "path length (cells)" }, z.status === "gefunden" ? String(z.pfad.length + 1) : "–"],
              [{ de: "Kosten G (10 / 14)", en: "cost G (10 / 14)" }, z.status === "gefunden" ? String(z.kosten) : "–"],
              [{ de: "Umweg zum kürzesten Pfad", en: "detour vs. shortest path" }, umweg]];
    }
  });
})();
