/* Serpentinen · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const WEG = "#e0452b", STEIL = "rgba(215,25,28,0.24)";
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });

  /** Gelände einmal je Größe und Darstellung in ein Bild rechnen und danach nur noch einsetzen (Karte.gelaendeGespeichert) */
  const gelaende = (ctx, G, F) => Karte.gelaendeGespeichert(ctx, G, F, { hoehenlinien: 10 });

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 2 },
    parameter: [
      { id: "teilung", gruppe: { de: "Gitter und Kosten", en: "Grid and costs" }, name: { de: "Gitterteilung U = V (Divide Surface)", en: "Grid divisions U = V (Divide Surface)" }, min: 2, max: 100, schritt: 1, wert: S.teilung },
      { id: "grad", name: { de: "Schwelle Steilheit (Degree Steepness) °", en: "Degree steepness °" }, min: 0, max: 100, schritt: 1, wert: S.grad },
      { id: "gewicht", name: { de: "Gewicht (Weight Steepness): 0 nur Steilheit · 1 nur Länge", en: "Weight steepness: 0 only steepness · 1 only shortest path" }, min: 0, max: 1, schritt: 0.01, wert: S.gewicht },
      { id: "glaetten", name: { de: "Glätten (Smooth)", en: "Smooth" }, min: 1, max: 10, schritt: 1, wert: S.glaetten },
      { id: "expansionen", gruppe: { de: "Abspielen", en: "Playback" }, name: { de: "Knoten je Schritt (Dijkstra)", en: "Nodes per step (Dijkstra)" }, min: 1, max: 200, schritt: 1, wert: S.expansionen },
      { id: "zeigeSteil", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "Kanten über der Schwelle zeigen", en: "Show edges above threshold" }, wert: true },
      { id: "zeigeSuche", art: "schalter", name: { de: "Suche (besuchte Knoten) zeigen", en: "Show search (visited nodes)" }, wert: true }
    ],
    aktionen: [{ name: { de: "Suche abspielen", en: "Replay search" }, tue: (z, p) => Modell.abspielen(z, p) }],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste, phase) { Modell.ziehe(z, p, [x, y], phase); },
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px, N = z.N, E = z.E, Q = z.Q;
      gelaende(ctx, z.G, F);
      if (p.zeigeSuche) {
        let mx = 0; for (let k = 0; k < Q.dist.length; k++) if (Q.fertig[k] && Q.dist[k] > mx) mx = Q.dist[k];
        const h = N.s / 2, r = Math.max(N.s * 0.18, px * 1.6);
        for (let k = 0; k < Q.dist.length; k++) {
          if (Q.fertig[k]) { ctx.fillStyle = Karte.farbe(mx ? Q.dist[k] / mx : 0, "wasser", z.weg ? 0.16 : 0.38); ctx.fillRect(N.x[k] - h, N.y[k] - h, N.s, N.s); }
        }
        if (!z.weg) {                                   // Suchfront: Knoten mit vorläufiger Entfernung
          ctx.beginPath();
          for (let k = 0; k < Q.dist.length; k++) if (!Q.fertig[k] && Q.dist[k] < Infinity) { ctx.moveTo(N.x[k] + r * 1.3, N.y[k]); ctx.arc(N.x[k], N.y[k], r * 1.3, 0, 2 * Math.PI); }
          ctx.strokeStyle = F.akzent; ctx.lineWidth = px * 1.2; ctx.stroke();
        }
      }
      if (p.zeigeSteil) {
        ctx.beginPath();
        for (let e = 0; e < E.n; e++) if (z.K.ueber[e]) { ctx.moveTo(N.x[E.a[e]], N.y[E.a[e]]); ctx.lineTo(N.x[E.b[e]], N.y[E.b[e]]); }
        ctx.strokeStyle = STEIL; ctx.lineWidth = px * 0.6; ctx.stroke();
      }
      if (z.weg) {
        Karte.linie(ctx, z.roh, F.tinte2, px * 0.9, [px * 3, px * 3]);
        Karte.linie(ctx, z.weg, F.dunkel ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)", px * 5.5);
        Karte.linie(ctx, z.weg, WEG, px * 3);
      }
      for (const [q, n] of [[z.start, { de: "Start", en: "Start" }], [z.ziel, { de: "Ziel", en: "End" }]]) {
        Karte.punkt(ctx, q, px * 6, WEG, F.tinte, px * 1.5);
        Karte.text(ctx, de() ? n.de : n.en, [q[0] + px * 10, q[1] - px * 10], F.tinte, px, 12);
      }
    },
    legende: F => [[WEG, { de: "Weg (geglättet)", en: "Path (smoothed)" }], [STEIL, { de: "Kante steiler als die Schwelle", en: "Edge steeper than threshold" }],
                   [Karte.farbe(0.2, "wasser"), { de: "besucht (nah)", en: "visited (near)" }], [Karte.farbe(1, "wasser"), { de: "besucht (fern)", en: "visited (far)" }], [F.akzent, { de: "Suchfront", en: "Search front" }]],
    kennzahlen(z, p) {
      const pr = z.prof, pg = z.profGitter, k = [];
      k.push([{ de: "Schwelle", en: "Threshold" }, `${zahl(Math.round(p.grad))}° ≙ ${zahl(Math.tan(Math.min(89.9, Math.round(p.grad)) * Math.PI / 180) * 100, 1)} %`]);
      k.push([{ de: "Gitterpunkte · Kanten", en: "Grid points · edges" }, `${zahl(z.N.m * z.N.m)} · ${zahl(z.E.n)}`]);
      k.push([{ de: "Besuchte Knoten", en: "Visited nodes" }, zahl(z.Q.besucht)]);
      if (!pr) { k.push([{ de: "Weg", en: "Path" }, { de: "Suche läuft …", en: "searching …" }]); return k; }
      k.push([{ de: "Länge (3D, geglättet)", en: "Length (3D, smoothed)" }, zahl(pr.laenge) + " m"]);
      k.push([{ de: "Luftlinie", en: "Beeline" }, zahl(Math.hypot(z.ziel[0] - z.start[0], z.ziel[1] - z.start[1])) + " m"]);
      k.push([{ de: "Höhenunterschied", en: "Height difference" }, zahl(pr.hoehe) + " m"]);
      k.push([{ de: "Max. Steigung (Gitterweg)", en: "Max. gradient (grid path)" }, zahl(pg.maxSteigung * 100, 1) + " %"]);
      k.push([{ de: "Mittlere Steigung", en: "Mean gradient" }, zahl(pg.mittel * 100, 1) + " %"]);
      k.push([{ de: "Max. Steigung (geglättet)", en: "Max. gradient (smoothed)" }, zahl(pr.maxSteigung * 100, 1) + " %"]);
      k.push([{ de: "Kanten über der Schwelle", en: "Edges above threshold" }, `${zahl(z.ueber)} / ${zahl(z.kantenWeg)}`]);
      return k;
    }
  });
})();
