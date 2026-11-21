/* Verteilung verschiedener Flächennutzungen · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const AUF = { de: "Aufbau", en: "Setup" }, GEW = { de: "Gewichte der Potentialfelder", en: "Weights of the potential fields" },
        AG = { de: "Agenten", en: "Agents" }, DARST = { de: "Darstellung", en: "Display" };
  const FELD = 404, LUECKE = 16, RECHTS = 300, UNTEN = 330;
  const quer = () => window.innerWidth > 900;
  const en = () => document.documentElement.lang === "en";
  const zahl = (v, n = 1) => isNaN(v) ? "–" : v.toLocaleString(en() ? "en" : "de", { maximumFractionDigits: n, minimumFractionDigits: n });

  // Farben wie im Original (cell_P.rePaint): Wohnen clGreen, Ziele clLime, Dienstleistung clRed, Industrie clHotLight, Hindernis clNavy
  const farben = F => ({ 2: F.dunkel ? [40, 170, 60] : [0, 128, 0], 3: [0, 255, 0], 4: [230, 30, 30], 5: F.dunkel ? [40, 130, 255] : [0, 102, 204], 1: F.dunkel ? [90, 90, 200] : [0, 0, 128] });
  const gw = (id, de, en_, wert) => ({ id, gruppe: GEW, name: { de, en: en_ }, min: -1, max: 2, schritt: 0.1, wert });

  function diagramme(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, hh = (h - LUECKE) / 2;
    ctx.save(); ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
    const achsen = (o, titel) => {
      const l = x0 + 2.6 * fs, r = x0 + w - 4, u = o + hh - 2.6 * fs, ob = o + 2.4 * fs;
      ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.beginPath(); ctx.moveTo(l, ob); ctx.lineTo(l, u); ctx.lineTo(r, u); ctx.stroke();
      ctx.fillStyle = F.tinte2; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillText(titel, x0, o + fs);
      return { l, r, u, o: ob };
    };
    // Rang-Größen-Diagramm (Form2, C_RankSize): log10(Rang) gegen log10(bebaute Zellen je Kachel), mit Trendlinie
    const a = achsen(y0, en() ? "rank-size (log-log), tiles of 20 cells" : "Rang-Größe (log–log), Kacheln zu 20 Zellen");
    const rg = z.rangGroesse, sx = v => a.l + (a.r - a.l) * v / 2, sy = v => a.u - (a.u - a.o) * v / 2.7;
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(en() ? "log rank" : "log Rang", (a.l + a.r) / 2, a.u + 3 * F.px);
    ctx.fillText("0", a.l, a.u + 3 * F.px); ctx.fillText("2", a.r - 4 * F.px, a.u + 3 * F.px);
    ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText("0", a.l - 3 * F.px, a.u); ctx.fillText(en() ? "2.7" : "2,7", a.l - 3 * F.px, a.o);
    if (rg) {
      ctx.fillStyle = F.tinte; for (const [x, y] of rg.pkt) { ctx.fillRect(sx(x) - 1.5 * F.px, sy(y) - 1.5 * F.px, 3 * F.px, 3 * F.px); }
      if (!isNaN(rg.steigung)) {
        ctx.strokeStyle = F.akzentText; ctx.lineWidth = 1.5 * F.px; ctx.beginPath(); ctx.moveTo(sx(0), sy(rg.achse)); ctx.lineTo(sx(2), sy(rg.achse + 2 * rg.steigung)); ctx.stroke();
        ctx.fillStyle = F.akzentText; ctx.textAlign = "right"; ctx.textBaseline = "top";
        ctx.fillText(`${en() ? "slope" : "Steigung"} ${zahl(rg.steigung, 2)} · r² ${zahl(rg.r2, 2)}`, a.r, a.o);
      }
    } else { ctx.fillStyle = F.gedaempft; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(en() ? "first analysis after 100 steps" : "erste Analyse nach 100 Schritten", (a.l + a.r) / 2, (a.o + a.u) / 2); }
    // Verlauf (Chart1 „average values“): erfolgreiche, heimkehrende, migrierte Agenten in %, mittlere Reisezeit
    const b = achsen(y0 + hh + LUECKE, en() ? "average values over time" : "Mittelwerte über die Zeit"), V = z.verlauf, T = Math.max(100, V.length);
    const tx = t => b.l + (b.r - b.l) * t / T;
    let rmax = 1; for (const v of V) if (v[1] > rmax) rmax = v[1];
    const linie = (farbe, f, strich) => { ctx.strokeStyle = farbe; ctx.lineWidth = 1.5 * F.px; ctx.setLineDash(strich || []); ctx.beginPath(); V.forEach((v, t) => { const y = b.u - (b.u - b.o) * f(v); t ? ctx.lineTo(tx(t), y) : ctx.moveTo(tx(t), y); }); ctx.stroke(); ctx.setLineDash([]); };
    linie(F.tinte2, v => v[1] / (rmax * 1.25), [3 * F.px, 2 * F.px]);
    linie(F.dunkel ? "#4cc764" : "#2b8a3e", v => v[0] / 100);
    linie("#e5484d", v => v[3] / 100);
    linie(F.akzentText, v => v[2] / 100);
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("0", b.l, b.u + 3 * F.px);
    ctx.textAlign = "right"; ctx.fillText(String(T), b.r, b.u + 3 * F.px);
    ctx.textBaseline = "middle"; ctx.fillText("100", b.l - 3 * F.px, b.o);
    ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText((en() ? "dashed: travel time, max " : "gestrichelt: Reisezeit, max ") + zahl(rmax, 0), b.r, b.o);
    ctx.restore();
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 2 },
    parameter: [
      { id: "agenten", gruppe: AUF, name: { de: "Anzahl Agenten (Wohnstandorte)", en: "Number of agents (homes)" }, min: 300, max: 4800, schritt: 300, wert: S.agenten, neustart: true },
      { id: "stopp", gruppe: AUF, name: { de: "Stopp nach Schritten", en: "Stop after steps" }, min: 100, max: 3000, schritt: 100, wert: S.stopp },
      { id: "rauschW", gruppe: AUF, name: { de: "Rauschen Wohnen", en: "Noise housing" }, min: 0, max: 12, schritt: 0.1, wert: S.rauschW },
      { id: "rauschD", gruppe: AUF, name: { de: "Rauschen Dienstleistung", en: "Noise services" }, min: 0, max: 12, schritt: 0.1, wert: S.rauschD },
      { id: "rauschI", gruppe: AUF, name: { de: "Rauschen Industrie", en: "Noise industry" }, min: 0, max: 12, schritt: 0.1, wert: S.rauschI },
      gw("wWW", "Wohnfeld ← Wohnen", "housing field ← housing", S.wWW), gw("wWD", "Wohnfeld ← Dienstleistung", "housing field ← services", S.wWD), gw("wWI", "Wohnfeld ← Industrie", "housing field ← industry", S.wWI),
      gw("wDW", "Dienstl.-Feld ← Wohnen", "services field ← housing", S.wDW), gw("wDD", "Dienstl.-Feld ← Dienstleistung", "services field ← services", S.wDD), gw("wDI", "Dienstl.-Feld ← Industrie", "services field ← industry", S.wDI),
      gw("wIW", "Industriefeld ← Wohnen", "industry field ← housing", S.wIW), gw("wID", "Industriefeld ← Dienstleistung", "industry field ← services", S.wID), gw("wII", "Industriefeld ← Industrie", "industry field ← industry", S.wII),
      { id: "heimweg", gruppe: AG, name: { de: "Rückweg", en: "Return mode" }, art: "auswahl", wert: S.heimweg,
        optionen: [{ wert: "spuren", name: { de: "vorhandene Spuren nutzen", en: "use existing tracks" } }, { wert: "direkt", name: { de: "direkter Weg", en: "direct way" } }] },
      { id: "wahl", gruppe: AG, name: { de: "Spurwahl", en: "Track choice" }, art: "auswahl", wert: S.wahl,
        optionen: [{ wert: "berg", name: { de: "Hill Climbing", en: "hill climbing" } }, { wert: "roulette", name: { de: "Roulette Wheel", en: "roulette wheel" } }] },
      { id: "zugriff", gruppe: AG, name: { de: "Zugriffswahrscheinlichkeit ρ", en: "Access probability ρ" }, min: 0.01, max: 1, schritt: 0.01, wert: S.zugriff },
      { id: "horizont", gruppe: AG, name: { de: "Blickwinkel (Grad)", en: "View angle (degrees)" }, min: 0, max: 180, wert: S.horizont },
      { id: "wackeln", gruppe: AG, name: { de: "Abweichung auf Spuren (Grad)", en: "Wiggle on tracks (degrees)" }, min: 0, max: 180, wert: S.wackeln },
      { id: "migration", gruppe: AG, name: { de: "Migration", en: "Migration" }, art: "schalter", wert: S.migration },
      { id: "migSchwelle", gruppe: AG, name: { de: "Migrationsschwelle ξ", en: "Migration threshold ξ" }, min: 1, max: 8, wert: S.migSchwelle },
      { id: "verfall", gruppe: AG, name: { de: "Spurverfall", en: "Track decay" }, art: "schalter", wert: S.verfall },
      { id: "anzeige", gruppe: DARST, name: { de: "Anzeige", en: "Show" }, art: "auswahl", wert: S.anzeige,
        optionen: [{ wert: "nutzungen", name: { de: "nur Nutzungen", en: "land uses only" } }, { wert: "heimwege", name: { de: "Heimwege", en: "return tracks" } },
                   { wert: "wege", name: { de: "alle Wege", en: "all tracks" } }, { wert: "feld0", name: { de: "Potentialfeld Wohnen", en: "potential field housing" } },
                   { wert: "feld1", name: { de: "Potentialfeld Dienstleistung", en: "potential field services" } }, { wert: "feld2", name: { de: "Potentialfeld Industrie", en: "potential field industry" } }] },
      { id: "agentenZeigen", gruppe: DARST, name: { de: "Agenten zeigen", en: "Show agents" }, art: "schalter", wert: S.agentenZeigen }
    ],
    groesse: z => quer() ? { b: z.breite + LUECKE + RECHTS, h: z.hoehe } : { b: z.breite, h: z.hoehe + LUECKE + UNTEN },
    ende: (z, p) => z.t >= p.stopp,                             // E_stop: Timer aus nach 800 Schritten
    klick(z, p, x, y, taste) { if (x < z.breite && y < z.hoehe) Modell.hindernis(z, x, y, taste !== "rechts"); },
    zeichne(ctx, z, p, F) {
      const FA = farben(F), leer = F.rgb.flaeche, tinte = F.rgb.tinte;
      let wert = null;
      if (p.anzeige === "heimwege") wert = z.markB; else if (p.anzeige === "wege") wert = z.markA;
      else if (p.anzeige.startsWith("feld")) wert = z.pot[+p.anzeige[4]];
      let lo = Infinity, hi = -Infinity;                        // findMaxMin über die freien Zellen
      if (wert) for (let c = 0; c < wert.length; c++) if (z.zustand[c] === 0) { if (wert[c] > hi) hi = wert[c]; if (wert[c] < lo) lo = wert[c]; }
      if (hi < 0.1) hi = 0.1;
      Sim.raster(ctx, z.spalten, z.zeilen, d => {
        for (let c = 0; c < z.zustand.length; c++) {
          const s = z.zustand[c];
          const f = s ? FA[s] : wert ? Sim.mische(leer, tinte, Math.min(1, Math.max(0, (wert[c] - lo) / (hi - lo)))) : leer;
          d[4 * c] = f[0]; d[4 * c + 1] = f[1]; d[4 * c + 2] = f[2]; d[4 * c + 3] = 255;
        }
      }, 0, 0, z.breite, z.hoehe);
      if (p.agentenZeigen) for (const m of [0, 1]) {            // TAgent.Paint: suchend rot, heimkehrend hellgrün
        ctx.fillStyle = m ? "#7cff4c" : "#ff3b30"; ctx.beginPath();
        for (const a of z.ag) if (a.modus === m) ctx.rect(a.x * 2, a.y * 2, 2, 2);
        ctx.fill();
      }
      if (ctx.canvas.width > ctx.canvas.height * 1.3) diagramme(ctx, z, F, z.breite + LUECKE, 0, RECHTS, z.hoehe);
      else diagramme(ctx, z, F, 0, z.hoehe + LUECKE, z.breite, UNTEN);
    },
    legende(F) {
      const FA = farben(F), c = k => Sim.css(FA[k]);
      return [[c(2), { de: "Wohnen", en: "housing" }], [c(4), { de: "Dienstleistung", en: "services" }], [c(5), { de: "Industrie", en: "industry" }],
              [c(3), { de: "Ressourcen", en: "resources" }], [c(1), { de: "Hindernis", en: "obstacle" }],
              [F.dunkel ? "#4cc764" : "#2b8a3e", { de: "erfolgreich %", en: "successful %" }], ["#e5484d", { de: "Rückweg %", en: "returning %" }],
              [F.akzentText, { de: "migriert %", en: "migrated %" }]];
    },
    kennzahlen(z) {
      const v = z.verlauf[z.verlauf.length - 1] || [0, 0, 0, 0], rg = z.rangGroesse, a = z.anzahl;
      return [
        [{ de: "Wohnen · Dienstl. · Industrie", en: "Housing · services · industry" }, `${a[2]} · ${a[4]} · ${a[5]}`],
        [{ de: "Agenten", en: "Agents" }, String(z.ag.length)],
        [{ de: "erfolgreiche Agenten", en: "successful agents" }, zahl(v[0]) + " %"],
        [{ de: "auf dem Rückweg", en: "returning" }, zahl(v[3]) + " %"],
        [{ de: "mittlere Reisezeit", en: "average travel time" }, zahl(v[1], 0)],
        [{ de: "migriert", en: "migrated" }, zahl(v[2]) + " %"],
        [{ de: "Rang-Größe: Steigung · r²", en: "Rank-size: slope · r²" }, rg ? `${zahl(rg.steigung, 2)} · ${zahl(rg.r2, 2)}` : "–"]
      ];
    }
  });
})();
