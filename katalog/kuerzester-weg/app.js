/* Kürzester Weg im Straßennetz · Bedienung und Darstellung (Modelllogik in modell.js)
   Rechenzeiten werden nur hier gemessen (performance.now), nicht im Modell.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });
  const ms = v => v == null ? "–" : (v < 0.01 ? zahl(v * 1000, 2) + " µs" : v < 0.1 ? zahl(v * 1000, 0) + " µs" : zahl(v, v < 10 ? 2 : 1) + " ms");
  const NAME = { einfach: { de: "1. Simple (CityGraph)", en: "1. Simple (CityGraph)" }, dijkstra: { de: "2. Dijkstra", en: "2. Dijkstra" }, floyd: { de: "3. Floyd–Warshall", en: "3. Floyd–Warshall" } };
  const CYAN = [46, 196, 214], LILA = [155, 48, 255], FRONT = "#f5a300";
  const R_GRIFF = 15;
  let zug = null, zeit = null;

  /** Zeit je Aufruf: wiederholt fn, bis mindestens 15 ms vergangen sind (so werden auch Bruchteile einer Millisekunde messbar) */
  function messe(fn) {
    let n = 0; const t0 = performance.now(); let t = t0;
    do { fn(); n++; t = performance.now(); } while (t - t0 < 15 && n < 200000);
    return (t - t0) / n;
  }
  /** alle drei Verfahren für Ursprung und Ziel messen; Floyd–Warshall getrennt nach Vorbereitung (alle Paare) und Abfrage */
  function vergleiche(z) {
    const G = z.G, a = z.so, b = z.sd, fw = Modell.neueMatrix(G); Modell.loese(G, Modell.neueSuche(G, "floyd", a, b, fw));
    z.vergleich = {
      einfach: messe(() => Modell.kuerzesterWeg(G, "einfach", a, b)),
      dijkstra: messe(() => Modell.kuerzesterWeg(G, "dijkstra", a, b)),
      vorbereitung: messe(() => Modell.loese(G, Modell.neueSuche(G, "floyd", a, b, Modell.neueMatrix(G)))),
      abfrage: messe(() => Modell.kuerzesterWeg(G, "floyd", a, b, fw))
    };
  }
  const gemessen = (z, art, f) => { const t0 = performance.now(); f(); zeit = { ms: performance.now() - t0, art, vorbereitet: z.vorbereitet }; };

  // Modell mit Zeitmessung für Änderungen im Bedienfeld
  const modell = Object.assign({}, Modell, {
    erzeuge(p, zufall) { zeit = null; const z = Modell.erzeuge(p, zufall); vergleiche(z); return z; },
    aendere(z, p, id) { gemessen(z, p.verfahren, () => Modell.aendere(z, p, id)); if (id !== "verfahren" && id !== "betweenness" && id !== "gebaeude") z.vergleich = null; }
  });

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "verfahren", gruppe: { de: "Verfahren", en: "Method" }, art: "auswahl", name: { de: "Kürzester Weg", en: "Shortest path" }, wert: S.verfahren,
        optionen: [{ wert: "einfach", name: { de: "1. Shortest Path Simple – langsam", en: "1. Shortest Path Simple – slow" } },
                   { wert: "dijkstra", name: { de: "2. Shortest Path Dijkstra – schnell für wenige Wege", en: "2. Shortest Path Dijkstra – fast for few paths" } },
                   { wert: "floyd", name: { de: "3. Floyd Warshal – langsame Vorbereitung, dann schnell", en: "3. Floyd Warshal – slow preparation, then fast" } }] },
      { id: "kosten", gruppe: { de: "Kosten (2. BuildGraph)", en: "Costs (2. BuildGraph)" }, art: "auswahl", name: { de: "Kostenart", en: "Cost type" }, wert: S.kosten,
        optionen: [{ wert: "winkel", name: { de: "winkelbasiert (Angular)", en: "angular" } }, { wert: "metrisch", name: { de: "metrisch (Length)", en: "metric (length)" } },
                   { wert: "gemischt", name: { de: "gemischt", en: "mixed" } }],
        folgen: { winkel: { kL: 0, kW: 1 }, metrisch: { kL: 1, kW: 0 }, gemischt: { kL: 0.5, kW: 0.5 } } },
      { id: "kL", name: { de: "Längenkoeffizient (Length Coefficient)", en: "Length coefficient" }, min: 0, max: 1, schritt: 0.05, wert: S.kL },
      { id: "kW", name: { de: "Winkelkoeffizient (Angular Coefficient)", en: "Angular coefficient" }, min: 0, max: 1, schritt: 0.05, wert: S.kW },
      { id: "betweenness", gruppe: { de: "Analyse", en: "Analysis" }, art: "schalter", name: { de: "Betweenness rechnen (Run Calculation)", en: "Compute betweenness (Run Calculation)" }, wert: S.betweenness },
      { id: "gebaeude", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "Gebäude zeigen", en: "Show buildings" }, wert: S.gebaeude }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste, phase) {
      const q = [Math.max(0, Math.min(z.b, x)), Math.max(0, Math.min(z.h, y))];
      if (phase === "unten") {
        const dO = Geo.abstand(q, z.o), dD = Geo.abstand(q, z.d);
        zug = Math.min(dO, dD) <= R_GRIFF ? (dO <= dD ? "o" : "d") : (taste === "rechts" ? "d" : "o");
      }
      if (zug) gemessen(z, p.verfahren, () => Modell.setzePunkt(z, p, zug, q));
    },
    aktionen: [
      { name: { de: "Suchen", en: "Search" }, tue: (z, p) => { Modell.starteSuche(z, p, true); zeit = null; } },
      { name: { de: "Messen", en: "Time it" }, tue: z => vergleiche(z) }
    ],
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px, N = z.N, Su = z.suche;
      if (p.gebaeude) { const c = F.dunkel ? "#1b1b20" : "#e9e9ed"; for (const g of z.szene.gebaeude) Karte.poly(ctx, g, c, c, px * 0.8); }
      ctx.lineCap = "round";
      const kante = (k, farbe, lw) => { const e = N.kanten[k], a = N.knoten[e.a], b = N.knoten[e.b];
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = farbe; ctx.lineWidth = lw; ctx.stroke(); };
      // Netz grau oder nach Betweenness gefärbt
      if (z.bc) {
        // wie Logarithm → Bounds → Remap: log(bc) zwischen kleinstem und größtem Wert > 0 auf 0…1
        let mn = Infinity, mx = -Infinity; for (const v of z.bc) if (v > 0) { const l = Math.log(v); if (l < mn) mn = l; if (l > mx) mx = l; }
        const w = k => z.bc[k] > 0 && mx > mn ? (Math.log(z.bc[k]) - mn) / (mx - mn) : 0;
        [...N.kanten.keys()].sort((a, b) => z.bc[a] - z.bc[b]).forEach(k => kante(k, Karte.farbe(w(k), "spektral"), px * (1 + 2.6 * w(k))));
      } else for (let k = 0; k < N.kanten.length; k++) kante(k, F.dunkel ? "#5c5c64" : "#a8a8b0", px * 1.2);
      // Suchfront: feste Knoten (Dijkstra) bzw. vom Ursprung schon erreichbare Segmente (Floyd–Warshall nach k Runden)
      // (nach dem Ende nur, wenn keine Betweenness gezeigt wird)
      if (!(z.bc && Su.fertig)) {
        const D = Modell.bekannt(z), fest = Su.fest;
        ctx.globalAlpha = Su.fertig ? 0.55 : 0.9;
        for (let k = 0; k < N.kanten.length; k++) {
          if (D[k] === Infinity) continue;
          if (fest && !fest[k]) kante(k, FRONT, px * 2);
          else kante(k, F.akzent, px * 2.2);
        }
        ctx.globalAlpha = 1;
      }
      if (!Su.fertig && Su.art === "floyd" && Su.fw.k > 0) kante(Su.fw.k - 1, F.tinte, px * 4.5);
      if (!Su.fertig && Su.zuletzt != null) kante(Su.zuletzt, F.tinte, px * 4.5);
      // Weg: Verlauf von Cyan (Ursprung) nach Lila (Ziel) wie im Katalogbild
      const W = Su.weg;
      W.forEach(k => kante(k, F.flaeche, px * 8));
      W.forEach((k, i) => { const t = W.length > 1 ? i / (W.length - 1) : 0; kante(k, Sim.css(Sim.mische(CYAN, LILA, t)), px * 5); });
      // Ursprung und Ziel mit Lot auf ihr Segment
      for (const [art, seg, farbe, txt] of [["o", z.so, Sim.css(CYAN), de() ? "Ursprung" : "Origin"], ["d", z.sd, Sim.css(LILA), de() ? "Ziel" : "Destination"]]) {
        const e = N.kanten[seg], q = z[art], f = Geo.abstandSegment(q, N.knoten[e.a], N.knoten[e.b]).q;
        Karte.linie(ctx, [q, f], F.tinte, px, [3 * px, 3 * px]);
        Karte.punkt(ctx, q, 6.5 * px, farbe, F.tinte, px * 1.4);
        Karte.text(ctx, txt, [q[0] + 10 * px, q[1] - 10 * px], F.tinte, px, 12);
      }
      if (z.t === 0 && !Su.fertig) {
        const lang = de() ? "Start: Suche Schritt für Schritt · Ziehen: Ursprung/Ziel versetzen" : "Start: search step by step · drag: move origin/destination";
        const kurz = de() ? "Start: Suche Schritt für Schritt" : "Start: search step by step";
        ctx.fillStyle = F.flaeche; ctx.globalAlpha = 0.85; ctx.fillRect(0, z.h - 22 * px, z.b, 22 * px); ctx.globalAlpha = 1;
        Karte.text(ctx, lang.length * 7.4 < z.b / px - 24 ? lang : kurz, [z.b / 2, z.h - 11 * px], F.tinte2, px, 12, "center");
      }
    },
    legende: (F, p, z) => [[Sim.css(Sim.mische(CYAN, LILA, 0.5)), { de: "kürzester Weg", en: "shortest path" }], [F.akzent, { de: "Suche: fest", en: "search: settled" }],
      [FRONT, { de: "Suchfront", en: "search front" }]].concat(z && z.bc ? Karte.skalenLegende("spektral", { de: "Betweenness gering", en: "low betweenness" }, { de: "hoch", en: "high" }) : []),
    kennzahlen(z, p) {
      const Su = z.suche, K = Su.fertig && Su.weg.length ? Modell.wegKosten(z.G, Su.weg, p.kL, p.kW) : null, V = z.vergleich;
      const ids = Su.weg.length > 8 ? Su.weg.slice(0, 4).join(", ") + ", …, " + Su.weg.slice(-2).join(", ") : Su.weg.join(", ");
      const zeilen = [
        [{ de: "Verfahren", en: "Method" }, NAME[Su.art]],
        [{ de: "Ursprung → Ziel (Segment)", en: "Origin → destination (segment)" }, z.so + " → " + z.sd],
        [{ de: "Expansionsschritte", en: "Expansion steps" }, Su.art === "floyd" ? zahl(Su.fw.k) + " / " + zahl(Su.n) + (de() ? " Runden k" : " rounds k") : zahl(Su.schritte)],
        [{ de: "Status", en: "Status" }, Su.fertig ? (Su.weg.length ? { de: "Weg gefunden", en: "path found" } : { de: "kein Weg", en: "no path" })
          : Su.schritte === 0 && !(Su.fw && Su.fw.k) ? { de: "bereit (Start)", en: "ready (Start)" } : { de: "sucht …", en: "searching …" }],
        [{ de: "shortest path segment IDs", en: "shortest path segment IDs" }, K ? ids : "–"],
        [{ de: "shortest path custom costs", en: "shortest path custom costs" }, K ? zahl(K.kosten, 3) : "–"],
        [{ de: "shortest path metric costs", en: "shortest path metric costs" }, K ? zahl(K.meter, 0) + " m" : "–"],
        [{ de: "Richtungsänderung Σ", en: "Turning Σ" }, K ? zahl(K.grad, 0) + "°" : "–"],
        [{ de: "Rechenzeit letzte Suche", en: "Time of last search" }, zeit ? ms(zeit.ms) + (zeit.vorbereitet ? (de() ? " (mit Vorbereitung)" : " (incl. preparation)") : "") : "–"]
      ];
      const v = k => V ? ms(V[k]) : { de: "– (Messen)", en: "– (Time it)" };
      zeilen.push(
        [{ de: "Zeit 1. Simple", en: "Time 1. Simple" }, v("einfach")],
        [{ de: "Zeit 2. Dijkstra", en: "Time 2. Dijkstra" }, v("dijkstra")],
        [{ de: "Zeit 3. FW Vorbereitung", en: "Time 3. FW preparation" }, v("vorbereitung")],
        [{ de: "Zeit 3. FW je Weg", en: "Time 3. FW per path" }, v("abfrage")]);
      return zeilen;
    }
  });
})();
