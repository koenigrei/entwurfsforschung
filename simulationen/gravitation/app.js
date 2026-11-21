/* Erreichbarkeit und Gravitationsmodell · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, B = Modell.BREITE, H = Modell.HOEHE;
  const G1 = { de: "Graph", en: "Graph" }, G2 = { de: "Gravitationsmodell", en: "Gravity model" }, G3 = { de: "Maus", en: "Mouse" };
  const ROT = "#e5484d", GELB = "#f5c400";
  const kante = F => F.dunkel ? "#b23b3b" : "#800000";            // clMaroon, im Dunkeln heller
  const komma = v => String(v).replace(".", ",");
  let aktiv = -1;                                                  // gezogener bzw. zum Verbinden gewählter Knoten

  function zeile(z, i) {                                           // ist die Zeile i der Analyse schon fertig?
    const a = z.analyse; return a.n > 1 && a.paar >= (i + 1) * (a.n - 1);
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "knoten", gruppe: G1, name: { de: "Knoten zu Beginn", en: "Nodes at start" }, min: 0, max: 30, wert: S.knoten, neustart: true },
      { id: "stroeme", gruppe: G2, name: { de: "Ströme zeigen", en: "Show flows" }, art: "schalter", wert: S.stroeme },
      { id: "exponent", gruppe: G2, name: { de: "Distanz im Nenner", en: "Distance in denominator" }, art: "auswahl", wert: S.exponent,
        optionen: [{ wert: "1", name: { de: "d (Programm)", en: "d (program)" } }, { wert: "2", name: { de: "d² (Formel)", en: "d² (formula)" } }],
        folgen: { "1": { skala: 0 }, "2": { skala: 2 } } },
      { id: "skala", gruppe: G2, name: { de: "Linienfaktor", en: "Line factor" }, min: -1, max: 3, schritt: 0.1, wert: 0,
        format: v => "× " + komma(+Math.pow(10, v).toPrecision(2)) },
      { id: "werkzeug", gruppe: G3, name: { de: "Werkzeug", en: "Tool" }, art: "auswahl", wert: S.werkzeug,
        optionen: [{ wert: "knoten", name: { de: "Knoten", en: "Nodes" } }, { wert: "verbinden", name: { de: "Verbinden", en: "Connect" } }, { wert: "groesse", name: { de: "Größe P", en: "Size P" } }] },
      { id: "sofort", gruppe: G3, name: { de: "Analyse nach Änderung sofort", en: "Analysis right after a change" }, art: "schalter", wert: S.sofort }
    ],
    aktionen: [
      { name: { de: "fP", en: "fP" }, tue(z) { z.analyse = Modell.neueAnalyse(z); Modell.analyseGanz(z); } },
      { name: { de: "Paare neu", en: "Re-run" }, tue(z) { z.analyse = Modell.neueAnalyse(z); } },
      { name: { de: "Graph weg", en: "Clear" }, tue(z, p) { z.nodes = []; z.kanten = []; aktiv = -1; Modell.geaendert(z, p); } }
    ],
    groesse: () => ({ b: B, h: H }),
    ende: z => z.analyse.paar >= z.analyse.gesamt,
    klick(z, p, x, y, taste, phase) {
      const i = Modell.knotenBei(z, x, y);
      let geaendert = false;
      if (p.werkzeug === "knoten") {
        if (phase === "unten") {
          if (taste === "rechts") { geaendert = Modell.loescheKnoten(z, i); aktiv = -1; }
          else if (i >= 0) aktiv = i;
          else { Modell.neuerKnoten(z, x, y); aktiv = -1; geaendert = true; }
        } else if (aktiv >= 0 && z.nodes[aktiv]) {                  // drag & drop: verschieben
          z.nodes[aktiv].x = Math.round(Math.max(0, Math.min(B, x))); z.nodes[aktiv].y = Math.round(Math.max(0, Math.min(H, y))); geaendert = true;
        }
      } else if (p.werkzeug === "verbinden") {
        if (phase !== "unten") return;
        if (i < 0) aktiv = -1;
        else if (aktiv < 0 || aktiv === i) aktiv = aktiv === i ? -1 : i;
        else { geaendert = taste === "rechts" ? Modell.trenne(z, aktiv, i) : (Modell.verbinde(z, aktiv, i) || Modell.trenne(z, aktiv, i)); aktiv = -1; }
      } else {
        if (phase === "unten") aktiv = i;
        if (aktiv >= 0) Modell.groesse(z, aktiv, y);               // P ändert die Erreichbarkeit nicht, nur die Ströme
      }
      if (geaendert) Modell.geaendert(z, p);
    },
    zeichne(ctx, z, p, F) {
      ctx.fillStyle = F.dunkel ? F.papier : "#fffbf0"; ctx.fillRect(0, 0, B, H);     // TCell: clCream mit weißem Rand
      ctx.strokeStyle = F.dunkel ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"; ctx.lineWidth = F.px; ctx.beginPath();
      for (let x = Modell.ZELLE; x < B; x += Modell.ZELLE) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = Modell.ZELLE; y < H; y += Modell.ZELLE) { ctx.moveTo(0, y); ctx.lineTo(B, y); }
      ctx.stroke();
      const nd = z.nodes, beta = +p.exponent, fak = Math.pow(10, p.skala);
      ctx.strokeStyle = kante(F); ctx.lineCap = "butt";
      for (const [a, b] of z.kanten) {
        ctx.lineWidth = p.stroeme ? Modell.linie(Modell.strom(nd[a], nd[b], beta), fak) : 2;
        ctx.beginPath(); ctx.moveTo(nd[a].x, nd[a].y); ctx.lineTo(nd[b].x, nd[b].y); ctx.stroke();
      }
      const an = z.analyse;                                         // gelb: Pfad des zuletzt berechneten Paares
      if (an.paar < an.gesamt && an.von >= 0 && an.pfad.length && nd[an.von]) {
        ctx.strokeStyle = GELB; ctx.lineWidth = 3; ctx.beginPath();
        ctx.moveTo(nd[an.pfad[0]].x, nd[an.pfad[0]].y);
        for (let k = 1; k < an.pfad.length; k++) ctx.lineTo(nd[an.pfad[k]].x, nd[an.pfad[k]].y);
        ctx.lineTo(nd[an.von].x, nd[an.von].y); ctx.stroke();
      }
      const fs = 11 * F.px;
      ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "middle";
      const aus = Modell.auswertung(z);
      nd.forEach((n, i) => {
        const r = n.P / 2;
        ctx.fillStyle = ROT; ctx.strokeStyle = "#000"; ctx.lineWidth = F.px;
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        if (i === aktiv && p.werkzeug === "verbinden") { ctx.strokeStyle = F.akzentText; ctx.lineWidth = 2 * F.px; ctx.beginPath(); ctx.arc(n.x, n.y, r + 4 * F.px, 0, 2 * Math.PI); ctx.stroke(); }
        if (an.paar < an.gesamt && (i === an.von || i === an.nach)) { ctx.strokeStyle = GELB; ctx.lineWidth = 2 * F.px; ctx.beginPath(); ctx.arc(n.x, n.y, r + 2 * F.px, 0, 2 * Math.PI); ctx.stroke(); }
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(String(i), n.x, n.y);          // setNr
        if (zeile(z, i)) { ctx.fillStyle = F.tinte; ctx.textAlign = "right"; ctx.fillText(String(aus.zeilen[i].summe), n.x - r * 0.7, n.y - r * 0.7 - fs * 0.4); }   // konLabel
      });
    },
    legende(F, p) {
      return [[ROT, { de: "Knoten (Größe = P)", en: "node (size = P)" }],
              [kante(F), p.stroeme ? { de: "Strom F (Linienstärke)", en: "flow F (line width)" } : { de: "Verbindung", en: "connection" }],
              [GELB, { de: "Pfad (A*)", en: "path (A*)" }], [F.tinte, { de: "Zahl: Zeilensumme", en: "number: row sum" }]];
    },
    kennzahlen(z, p) {
      const a = z.analyse, w = Modell.auswertung(z), fertig = a.gesamt > 0 && a.paar >= a.gesamt;
      const L = [[{ de: "Knoten · Verbindungen", en: "nodes · connections" }, `${z.nodes.length} · ${z.kanten.length}`],
                 [{ de: "Paare berechnet", en: "pairs computed" }, `${a.paar} / ${a.gesamt}`],
                 [{ de: "Streuwert (Gesamtsumme)", en: "dispersion (total sum)" }, fertig ? String(w.streuwert) : "–"],
                 [{ de: "mittlere Verbindungslänge", en: "mean connection length" }, fertig ? komma(w.mittel) : "–"]];
      if (p.stroeme && z.kanten.length) {
        const beta = +p.exponent, nd = z.nodes; let s = 0, m = 0;
        for (const [u, v] of z.kanten) { const f = Modell.strom(nd[u], nd[v], beta); s += f; m = Math.max(m, f); }
        L.push([{ de: "Ströme Σ F · max F", en: "flows Σ F · max F" }, `${komma(+s.toPrecision(3))} · ${komma(+m.toPrecision(3))}`]);
      }
      const n = Math.min(z.nodes.length, 16);
      for (let i = 0; i < n; i++) if (zeile(z, i)) L.push([{ de: `Knoten ${i}: Summe · dLänge`, en: `node ${i}: sum · mean length` }, `${w.zeilen[i].summe} · ${komma(w.zeilen[i].dLaenge.toFixed(2))}`]);
      return L;
    }
  });
})();
