/* Wegenutzung und das Finden kürzester Pfade · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, F14 = Modell.FASSUNG14, B = Modell.BREITE, H = Modell.HOEHE;
  const G1 = { de: "Fassung und Knoten", en: "Version and nodes" }, G2 = { de: "Einstellungen Graph", en: "Graph settings" },
        G3 = { de: "Weg-Markierung (15)", en: "Path marking (15)" }, G4 = { de: "Maus", en: "Mouse" };
  // Farben wie im Original: Knoten rot (Start blau, Ziel clLime) mit grünem Rand, Verbindungen clMaroon, Pfad gelb
  const kante = F => F.dunkel ? "#a33a3a" : "#800000", gelb = F => F.dunkel ? "#ffe100" : "#d9a400";
  const START = "#3b6cff", ZIEL = "#46e046", ROT = "#e5484d";

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 30, wert: 1 },
    parameter: [
      { id: "fassung", gruppe: G1, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true,
        optionen: [{ wert: "15", name: { de: "15 Wegenutzung", en: "15 path use" } }, { wert: "14", name: { de: "14 graphPath", en: "14 graphPath" } }],
        folgen: { "15": { anzahl: S.anzahl, anlDist: S.anlDist, repelDist: S.repelDist }, "14": { anzahl: F14.anzahl, anlDist: F14.anlDist, repelDist: F14.repelDist } } },
      { id: "anzahl", gruppe: G1, name: { de: "Knoten (Create Nodes)", en: "Nodes (Create Nodes)" }, min: 0, max: 200, wert: S.anzahl, neustart: true },
      { id: "anlDist", gruppe: G2, name: { de: "Anlager Dist.", en: "Attach distance" }, min: 5, max: 200, wert: S.anlDist },
      { id: "repelDist", gruppe: G2, name: { de: "RepelDist.", en: "Repel distance" }, min: 1, max: 50, wert: S.repelDist },
      { id: "mark", gruppe: G3, name: { de: "Stärke der Weg-Markierung", en: "Strength of path marking" }, min: 1, max: 10, wert: S.mark },
      { id: "decr", gruppe: G3, name: { de: "Verfallsrate Markierungen", en: "Decay rate of marks" }, min: 1, max: 10, wert: S.decr },
      { id: "werkzeug", gruppe: G4, name: { de: "Werkzeug", en: "Tool" }, art: "auswahl", wert: S.werkzeug,
        optionen: [{ wert: "punkte", name: { de: "Start / Ziel", en: "Start / target" } }, { wert: "knoten", name: { de: "Knoten einfügen", en: "Add node" } },
                   { wert: "schieben", name: { de: "Abstoßen / Anziehen", en: "Repel / attract" } }] },
      { id: "mausRad", gruppe: G4, name: { de: "MausRadius", en: "Mouse radius" }, min: 0, max: 200, wert: S.mausRad }
    ],
    aktionen: [
      { name: { de: "Create", en: "Create" }, tue(z, p) { Modell.erstelleKnoten(z, p, p.anzahl); } },
      { name: { de: "Delete 10", en: "Delete 10" }, tue(z) { Modell.loesche10(z); } }
    ],
    groesse: () => ({ b: B, h: H }),
    klick(z, p, x, y, taste, phase) {
      if (p.werkzeug === "schieben") { z.maus = { x, y, dir: taste === "rechts" ? -1 : 1 }; return; }   // Attract/Repel: Dir = ±1
      if (phase !== "unten") return;
      if (p.werkzeug === "knoten") { Modell.neuerKnoten(z, x, y); return; }                              // mittlere Maustaste
      if (z.n < 2) return;
      const k = Modell.naechster(z, x, y);                                                                 // links Start, rechts Ziel
      if (taste === "rechts") z.ziel = k; else z.start = k;
      z.pfad = Modell.findePfad(z, z.start, z.ziel); z.gefunden = z.pfad.length > 0;
    },
    zeichne(ctx, z, p, F) {
      ctx.fillStyle = F.dunkel ? "#000" : F.flaeche; ctx.fillRect(0, 0, B, H);
      const n = z.n, u = z.nutzung, mitNutzung = p.fassung !== "14";
      ctx.strokeStyle = kante(F); ctx.lineCap = "round";
      for (let a = 0; a < n; a++) for (const b of z.nb[a]) {           // Verbindungen an den alten Positionen, Stärke 1 + round(Nutzung)
        ctx.lineWidth = mitNutzung ? 1 + Modell.rundeD(Math.max(0, u[a * n + b])) : 1;
        ctx.beginPath(); ctx.moveTo(z.ox[a], z.oy[a]); ctx.lineTo(z.ox[b], z.oy[b]); ctx.stroke();
      }
      if (z.gefunden) {                                                // Pfad gelb, an den neuen Positionen
        ctx.strokeStyle = gelb(F);
        for (let j = 0; j + 1 < z.pfad.length; j++) {
          const a = z.pfad[j], b = z.pfad[j + 1];
          ctx.lineWidth = mitNutzung ? 1 + Modell.rundeD(u[b * n + a]) : 2;
          ctx.beginPath(); ctx.moveTo(z.x[a], z.y[a]); ctx.lineTo(z.x[b], z.y[b]); ctx.stroke();
        }
      }
      ctx.lineWidth = F.px; ctx.strokeStyle = "#2b8a3e";
      for (let i = 0; i < n; i++) {
        const s = i === z.start ? 1 : i === z.ziel ? 2 : 0, r = s ? 5 : 3;
        ctx.fillStyle = s === 1 ? START : s === 2 ? ZIEL : ROT;
        ctx.beginPath(); ctx.arc(z.x[i], z.y[i], r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      }
      if (z.maus && p.werkzeug === "schieben" && p.mausRad > 0) {
        ctx.strokeStyle = F.akzentText; ctx.lineWidth = F.px; ctx.setLineDash([4 * F.px, 4 * F.px]);
        ctx.beginPath(); ctx.arc(z.maus.x, z.maus.y, p.mausRad, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
      }
    },
    legende(F, p) {
      const L = [[ROT, { de: "Knoten", en: "node" }], [START, { de: "startNode", en: "start node" }], [ZIEL, { de: "zielNode", en: "target node" }], [gelb(F), { de: "Pfad (A*)", en: "path (A*)" }]];
      L.push([kante(F), p.fassung !== "14" ? { de: "Verbindung, Stärke = Nutzung", en: "connection, width = use" } : { de: "Verbindung", en: "connection" }]);
      return L;
    },
    kennzahlen(z, p) {
      const a = Modell.auswertung(z), k = v => v.toFixed(2).replace(".", ",");
      const L = [[{ de: "Anzahl Knotenpunkte", en: "number of nodes" }, String(z.n)],
                 [{ de: "Verbindungen", en: "connections" }, String(a.kanten)],
                 [{ de: "Knoten in Ruhe", en: "nodes at rest" }, Math.round(100 * a.ruhe) + " %"],
                 [{ de: "Pfad", en: "path" }, z.gefunden ? { de: `Pfad erstellt (${z.pfad.length - 1} Abschnitte)`, en: `path created (${z.pfad.length - 1} segments)` } : { de: "kein Pfad möglich!", en: "no path possible!" }]];
      if (p.fassung !== "14") {
        L.push([{ de: "Nutzung Mittel · max", en: "use mean · max" }, `${k(a.mittelNutzung)} · ${k(a.maxNutzung)}`]);
        L.push([{ de: "Abstand der Nutzung zur Mitte", en: "distance of use from centre" }, a.mitte == null ? "–" : k(a.mitte)]);
      }
      return L;
    }
  });

  // Maus losgelassen: Abstoßen/Anziehen endet (der Rahmen meldet nur Drücken und Ziehen)
  const c = document.getElementById("leinwand"), los = () => { if (window.SIM && SIM.zustand) SIM.zustand.maus = null; };
  ["pointerup", "pointercancel", "pointerleave"].forEach(e => c.addEventListener(e, los));
})();
