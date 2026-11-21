/* Mietpreisdynamik und Straßen · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const FASSUNG = { de: "Fassung", en: "Version" };
  const MODELL = { de: "Segregation", en: "Segregation" };
  const MIETE = { de: "Miete und Wachstum", en: "Rent and growth" };
  const STRASSE = { de: "Straßen", en: "Streets" };
  const DARST = { de: "Darstellung", en: "Display" };

  // Straßenfarben wie im Original (setupFields: colCode1–7) für die Typen −3 … +3
  const STRF = { "-3": [125, 38, 205], "-2": [171, 130, 255], "-1": [224, 102, 255], "1": [255, 127, 0], "2": [205, 102, 0], "3": [205, 0, 0] };
  const STRN = { "-3": { de: "Barriere −3", en: "barrier −3" }, "-2": { de: "Barriere −2", en: "barrier −2" }, "-1": { de: "Barriere −1", en: "barrier −1" },
                 "1": { de: "kommunikativ +1", en: "communicative +1" }, "2": { de: "kommunikativ +2", en: "communicative +2" }, "3": { de: "kommunikativ +3", en: "communicative +3" } };
  const K = 3;                                  // Bildpunkte je Zelle im Rasterbild (Agenten als kleine Kreuze, fast rund)
  const UNTEN = 38, RECHTS = 86, LUECKE = 5;
  const quer = () => window.innerWidth > 900;
  const pz = v => (100 * v).toFixed(1).replace(".", ",") + " %";
  const zahl = (v, n = 2) => v.toFixed(n).replace(".", ",").replace("-", "−");
  let anfang = null;                            // erster Klick einer neuen Straße

  const modell = Object.assign({}, Modell, {
    aendere(z, p, id) { Modell.aendere(z, p, id); if (id === "verlauf") window.dispatchEvent(new Event("resize")); }
  });
  function neueLinien(z, p, linien) { p.linien = linien; Modell.aendere(z, p, "linien"); }
  function zufallsTyp(z) { const t = z.zufall.ganz(6) + 1; return t > 3 ? t - 7 : t; }   // random(6) + 1; > 3 → −3 … −1

  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, b = x0 + w, o = y0 + fs * 1.6, u = y0 + h - fs * 1.4, hh = u - o;
    const X = Math.max(100, z.t), sx = t => l + w * t / X, sy = v => u - hh * v;
    const T = z.verlauf.length, sch = Math.max(1, Math.ceil(T / 600)), farben = Modell.farbband(z.gruppen);
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(b, o); ctx.stroke(); ctx.setLineDash([]);
    const linie = (farbe, wert, strich) => {
      ctx.strokeStyle = farbe; ctx.lineWidth = 1.5 * F.px; ctx.setLineDash(strich || []); ctx.beginPath();
      for (let t = 0; ; t = Math.min(T - 1, t + sch)) { const x = sx(t), y = sy(wert(z.verlauf[t])); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); if (t === T - 1) break; }
      ctx.stroke(); ctx.setLineDash([]);
    };
    for (let g = 0; g < z.gruppen; g++) linie(Sim.css(F.dunkel ? farben[g] : Sim.mische(farben[g], [0, 0, 0], 0.2)), v => v[0][g]);
    linie(F.tinte, v => v[1] / 100, [3 * F.px, 2 * F.px]);
    const en = document.documentElement.lang === "en";
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText("100 %", l + 3 * F.px, o - 4 * F.px);
    ctx.fillText("0", l + 3 * F.px, u + fs * 1.15);
    ctx.textAlign = "right"; ctx.fillText(String(X), b, u + fs * 1.15);
    ctx.fillText(en ? "settled per group · dashed: segregation index" : "angehalten je Gruppe · gestrichelt: Segregationsindex", b, o - 4 * F.px);
    ctx.restore();
  }

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "fassung", gruppe: FASSUNG, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true,
        optionen: [{ wert: "miete", name: { de: "550 Miete (2007)", en: "550 rent (2007)" } }, { wert: "strassen", name: { de: "580 Straßen (2006)", en: "580 streets (2006)" } }],
        folgen: { miete: { radius: 2, schwelle: 100, toleranz: "individuell", miete: true, mieteZeigen: true },
                  strassen: { radius: 5, schwelle: 30, toleranz: "gleich", miete: false, mieteZeigen: false } } },
      { id: "anzahl", gruppe: MODELL, name: { de: "Anzahl Agenten", en: "Number of agents" }, min: 500, max: 13000, schritt: 100, wert: S.anzahl, neustart: true },
      { id: "gruppen", gruppe: MODELL, name: { de: "Anzahl Gruppen", en: "Number of groups" }, min: 2, max: 6, schritt: 1, wert: S.gruppen, neustart: true },
      { id: "radius", gruppe: MODELL, name: { de: "Radius Nachbarschaft", en: "Neighbourhood radius" }, min: 1, max: 6, schritt: 1, wert: S.radius, neustart: true },
      { id: "weite", gruppe: MODELL, name: { de: "Umzugsweite (Zellen)", en: "Move distance (cells)" }, min: 2, max: 116, schritt: 1, wert: S.weite },
      { id: "schwelle", gruppe: MODELL, name: { de: "Schwellenwert (Zufriedenheit)", en: "Threshold (satisfaction)" }, min: 0, max: 100, schritt: 1, wert: S.schwelle, format: v => v + " %" },
      { id: "toleranz", gruppe: MODELL, name: { de: "Toleranz", en: "Tolerance" }, art: "auswahl", wert: S.toleranz,
        optionen: [{ wert: "individuell", name: { de: "individuell je Gruppe", en: "individual per group" } }, { wert: "gleich", name: { de: "gleich für alle (gewichtet)", en: "equal for all (weighted)" } }] },
      { id: "abneigungUnten", gruppe: MODELL, name: { de: "Abneigung je Stufe nach unten", en: "Aversion per level downwards" }, min: 0, max: 100, schritt: 5, wert: S.abneigungUnten, format: v => v + " %" },
      { id: "abneigungOben", gruppe: MODELL, name: { de: "Abneigung je Stufe nach oben", en: "Aversion per level upwards" }, min: 0, max: 100, schritt: 5, wert: S.abneigungOben, format: v => v + " %" },
      { id: "freie", gruppe: MODELL, name: { de: "freie Zellen (gleiche Toleranz)", en: "empty cells (equal tolerance)" }, art: "auswahl", wert: S.freie,
        optionen: [{ wert: "nicht", name: { de: "nicht zählen", en: "do not count" } }, { wert: "anders", name: { de: "als andere zählen", en: "count as different" } }, { wert: "gleich", name: { de: "als gleiche zählen", en: "count as similar" } }] },
      { id: "miete", gruppe: MIETE, name: { de: "Mietlandschaft aktiv", en: "Rent landscape active" }, art: "schalter", wert: S.miete },
      { id: "wachstum", gruppe: MIETE, name: { de: "Wachstum (100 + 10 je Schritt)", en: "Growth (100 + 10 per step)" }, art: "schalter", wert: S.wachstum, neustart: true },
      { id: "stopp", gruppe: MIETE, name: { de: "Halt nach Schritt", en: "Stop after step" }, min: 50, max: 2000, schritt: 50, wert: S.stopp },
      { id: "strassentyp", gruppe: STRASSE, name: { de: "Straßentyp zum Zeichnen", en: "Street type for drawing" }, art: "auswahl", wert: "3",
        optionen: ["3", "2", "1", "-1", "-2", "-3"].map(t => ({ wert: t, name: STRN[t] })) },
      { id: "mieteZeigen", gruppe: DARST, name: { de: "Mietlandschaft zeigen", en: "Show rent landscape" }, art: "schalter", wert: true },
      { id: "verlauf", gruppe: DARST, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: true }
    ],
    aktionen: [
      { name: { de: "Raster", en: "Grid" }, tue(z, p) {               // rasterStreets: 5 × 5, zufällige Typen
        const L = (p.linien || []).slice(), d = Math.round(z.zeilen / 5);
        for (let i = 1; i < 5; i++) L.push({ a: [i * d - 1, 0], b: [i * d - 1, z.zeilen - 1], typ: zufallsTyp(z) });
        for (let i = 1; i < 5; i++) L.push({ a: [0, i * d - 1], b: [z.spalten - 1, i * d - 1], typ: zufallsTyp(z) });
        neueLinien(z, p, L);
      } },
      { name: { de: "Zufällig", en: "Random" }, tue(z, p) {         // randStreets: 19 Straßen, zufällige Typen
        const L = (p.linien || []).slice();
        for (let i = 1; i < 20; i++) L.push({ a: [z.zufall.ganz(z.spalten), z.zufall.ganz(z.zeilen)], b: [z.zufall.ganz(z.spalten), z.zufall.ganz(z.zeilen)], typ: zufallsTyp(z) });
        neueLinien(z, p, L);
      } },
      { name: { de: "Löschen", en: "Clear" }, tue(z, p) { anfang = null; neueLinien(z, p, []); } }
    ],
    groesse: (z, p) => !p.verlauf ? { b: z.breite, h: z.hoehe } : quer() ? { b: z.breite + LUECKE + RECHTS, h: z.hoehe } : { b: z.breite, h: z.hoehe + UNTEN },
    ende: (z, p) => z.t >= p.stopp || z.fertig != null,
    klick(z, p, x, y, taste, phase) {
      if (phase !== "unten" || x >= z.breite || y >= z.hoehe) return;
      const c = [Math.floor(x), Math.floor(y)];
      if (taste === "rechts") { if (anfang) anfang = null; else neueLinien(z, p, (p.linien || []).slice(0, -1)); return; }
      if (!anfang) { anfang = c; return; }
      // wie im Original: Ziel ist der erste Punkt (Maus gedrückt), übertragen wird vom zweiten Punkt (Maus losgelassen) aus
      neueLinien(z, p, (p.linien || []).concat([{ a: c, b: anfang, typ: Number(p.strassentyp) }]));
      anfang = null;
    },
    zeichne(ctx, z, p, F) {
      const S = z.spalten, Z = z.zeilen, farben = Modell.farbband(z.gruppen), fl = F.rgb.flaeche;
      const nah = Sim.mische(fl, F.rgb.tinte, 0.14);
      Sim.raster(ctx, S * K, Z * K, d => {
        const W = S * K;
        for (let y = 0; y < Z; y++) for (let x = 0; x < S; x++) {
          const c = y * S + x, st = z.strasse[c];
          let f;
          if (st) f = STRF[st];
          else if (p.mieteZeigen) { const g = Math.max(0, Math.min(254, Math.round((z.miete[c] + 1) * 127))); f = [g, g, g]; }   // col := round((rent + 1) · 127)
          else f = z.gewicht[c] > 1 ? nah : fl;
          const a = z.zelle[c], ag = a >= 0 ? farben[z.typ[a] - 1] : null;
          for (let v = 0; v < K; v++) for (let u = 0; u < K; u++) {
            const q = ag && (u === 1 || v === 1) ? ag : f, o = 4 * ((y * K + v) * W + x * K + u);
            d[o] = q[0]; d[o + 1] = q[1]; d[o + 2] = q[2]; d[o + 3] = 255;
          }
        }
      }, 0, 0, z.breite, z.hoehe);
      if (anfang) {
        ctx.strokeStyle = Sim.css(STRF[p.strassentyp]); ctx.lineWidth = 2.5 * F.px;
        ctx.beginPath(); ctx.arc(anfang[0] + 0.5, anfang[1] + 0.5, 2, 0, 2 * Math.PI); ctx.stroke();
      }
      if (p.verlauf) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, z.breite + LUECKE, 0, RECHTS, z.hoehe);
        else diagramm(ctx, z, F, 0, z.hoehe, z.breite, UNTEN);
      }
    },
    legende(F, p, z) {
      const G = z ? z.gruppen : Math.round(p.gruppen), f = Modell.farbband(G);
      const L = f.map((c, g) => [Sim.css(c), { de: "Gruppe " + (g + 1), en: "Group " + (g + 1) }]);
      if (p.mieteZeigen) L.push(["#fefefe", { de: "hohe Miete", en: "high rent" }], ["#000000", { de: "niedrige Miete", en: "low rent" }]);
      if (z) for (const t of [...new Set(z.linien.map(l => l.typ))].sort((a, b) => b - a)) L.push([Sim.css(STRF[t]), STRN[t]]);
      return L;
    },
    kennzahlen(z, p) {
      const n = Math.max(1, z.n), h = z.halt.reduce((s, v, i) => i < z.n ? s + v : s, 0);
      const L = [
        [{ de: "Agenten", en: "Agents" }, String(z.n)],
        [{ de: "angehalten (zufrieden)", en: "settled (satisfied)" }, `${h} · ${pz(h / n)}`],
        [{ de: "umzugswillig · umgezogen", en: "willing to move · moved" }, `${z.umzugswillig} · ${z.umzuege}`],
        [{ de: "Segregationsindex (Mittel)", en: "Segregation index (mean)" }, z.verlauf[z.verlauf.length - 1][1].toFixed(1).replace(".", ",") + " %"],
        [{ de: "Straßenzellen", en: "Street cells" }, String(z.strasse.reduce((s, v) => s + (v !== 0), 0))]
      ];
      if (p.miete) { const m = Modell.mieteJeGruppe(z); L.push([{ de: "Miete Gruppe 1 … " + z.gruppen, en: "Rent group 1 … " + z.gruppen }, m.map(v => zahl(v)).join(" · ")]); }
      L.push([{ de: "Ruhe nach Schritt", en: "At rest after step" }, z.fertig != null ? String(z.fertig) : "–"]);
      return L;
    }
  });
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
