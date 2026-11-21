/* Wachstumssimulation urbaner Strukturen · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const G1 = { de: "Feld und Laufart", en: "Field and field type" }, G2 = { de: "Straßennetz (field types)", en: "Street network (field types)" },
        G3 = { de: "Bebauung (development settings)", en: "Development settings" }, G4 = { de: "Bebauungsregel (2D building CA)", en: "Building rule (2D building CA)" },
        G5 = { de: "Darstellung", en: "Display" };
  const en = () => document.documentElement.lang === "en";
  const zahl = (v, n) => v.toLocaleString(en() ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  const prozent = v => zahl(100 * v, 1) + " %";
  const quer = () => window.innerWidth > 900;
  // Darstellung je Fassung (wie „folgen“ beim Wechsel), auch wenn die Fassung aus der Adresse (#fassung=…) kommt
  let fassungAnfang = S.fassung;
  try { fassungAnfang = new URLSearchParams(location.hash.slice(1)).get("fassung") || S.fassung; } catch (e) {}
  const NETZ = fassungAnfang === "netz";
  // Diagramme: breit rechts neben dem Feld, schmal darunter
  const RECHTS = z => Math.round(z.sb * 0.8), UNTEN = z => Math.round(z.sh * 0.5), LUECKE = z => Math.max(2, Math.round(z.sb * 0.03));

  // Farben des Originals (clYellow Straße, clBlue bebaut, clLime grün, clOlive Kanten, clGray Knoten mit clGreen-Rand),
  // in der hellen Darstellung etwas dunkler, damit sie auf hellem Grund lesbar bleiben
  const farben = F => F.dunkel
    ? { strasse: "#ffff00", bebaut: "#4a63ff", gruen: "#00dd00", kante: "#b8b840", knoten: "#8a8a8a", rand: "#22b422" }
    : { strasse: "#d9a800", bebaut: "#0000ff", gruen: "#1fa81f", kante: "#808000", knoten: "#808080", rand: "#008000" };
  // Farbverlauf für die Erreichbarkeit (InitGadient: clBlue → clAqua → clLime → clYellow → clRed)
  const VERLAUF = [[0, 0, 255], [0, 255, 255], [0, 255, 0], [255, 255, 0], [255, 0, 0]];
  function verlaufFarbe(v) {
    const x = Math.max(0, Math.min(1, v)) * 4, i = Math.min(3, Math.floor(x)), t = x - i, a = VERLAUF[i], b = VERLAUF[i + 1];
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  }

  // ---- Zwischenspeicher: Rasterbild, Erreichbarkeit und Kennzahlen nur neu berechnen, wenn sich etwas geändert hat
  const raster = { schl: "", z: null };
  let konn = null, auswert = null;
  function konnektivitaet(z, p) {
    const schl = [p.lokal, p.locRad, p.farbskala].join("|");
    const laeuft = window.SIM && window.SIM.laeuft, jetzt = performance.now();
    // während des Laufs höchstens alle 0,3 s (bei großen Graphen seltener) neu, sonst bei jeder Änderung
    // (sehr große Graphen nur, wenn der Lauf steht, damit die Darstellung flüssig bleibt)
    if (!konn || konn.z !== z || konn.schl !== schl || (konn.version !== z.version && (!laeuft || (konn.dauer < 40 && jetzt - konn.zeit > 300 + konn.dauer * 4)))) {
      konn = { z, schl, version: z.version, zeit: jetzt, t: z.t, k: Modell.konnektivitaet(z, { lokal: p.lokal, locRad: p.locRad, farbskala: p.farbskala }) };
      konn.dauer = performance.now() - jetzt;
    }
    return konn;
  }
  function auswertung(z) {
    if (!auswert || auswert.z !== z || auswert.version !== z.version) auswert = { z, version: z.version, a: Modell.auswertung(z) };
    return auswert.a;
  }

  // ---- Maus: Klick setzt einen Knoten, Ziehen legt eine Straße mit Zwischenknoten (subdivideEdge), rechts wird bebaut
  let ziehen = null;
  function klick(z, p, x, y, taste, phase) {
    if (taste === "rechts") { if (x < z.sb && y < z.sh) Modell.bebaue(z, x, y); return; }
    if (phase === "unten") ziehen = x < z.sb && y < z.sh ? { x0: x, y0: y, x1: x, y1: y } : null;
    else if (ziehen) { ziehen.x1 = Math.max(0, Math.min(z.sb - 0.01, x)); ziehen.y1 = Math.max(0, Math.min(z.sh - 0.01, y)); }
  }

  function diagramme(ctx, z, p, F, x0, y0, w, h) {
    const C = farben(F), font = 10 * F.px, nebeneinander = w > h * 1.3;
    const b1 = nebeneinander ? { x: x0, y: y0, w: w * 0.42, h } : { x: x0, y: y0, w, h: h * 0.42 };
    const b2 = nebeneinander ? { x: x0 + w * 0.5, y: y0, w: w * 0.5, h } : { x: x0, y: y0 + h * 0.5, w, h: h * 0.5 };
    ctx.save();
    ctx.font = `${font}px "Geist Mono", ui-monospace, monospace`;
    const rahmen = (b, titel) => {
      const o = b.y + font * 1.8, u = b.y + b.h - font * 1.6;
      ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
      ctx.beginPath(); ctx.moveTo(b.x, o); ctx.lineTo(b.x, u); ctx.lineTo(b.x + b.w, u); ctx.stroke();
      ctx.fillStyle = F.gedaempft; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText(titel, b.x, b.y + font);
      return { o, u };
    };
    // 1 · Kanten je Knoten (EdgesPerNode)
    const g = Modell.grade(z), gmax = Math.max(1, ...g);
    let r = rahmen(b1, en() ? "edges per node" : "Kanten je Knoten");
    const bw = b1.w / 9;
    ctx.fillStyle = C.kante;
    g.forEach((v, i) => { const hh = (r.u - r.o) * v / gmax; if (v) ctx.fillRect(b1.x + i * bw + bw * 0.15, r.u - hh, bw * 0.7, hh); });
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "center";
    g.forEach((v, i) => ctx.fillText(i === 8 ? "8+" : String(i), b1.x + (i + 0.5) * bw, r.u + font * 1.2));
    ctx.textAlign = "left"; ctx.fillText(String(gmax), b1.x + 3 * F.px, r.o + font * 0.9);
    // 2 · Anteile am feinen Raster über die Zeit (countCellTypes, alle 10 Schritte)
    r = rahmen(b2, en() ? "share of fine grid" : "Anteil am feinen Raster");
    const V = z.verlauf, tmax = Math.max(p.stopAt, V.length ? V[V.length - 1][0] : 1, 10);
    let ymax = 0.05; for (const e of V) ymax = Math.max(ymax, e[1], e[2], e[3]);
    ymax = Math.ceil(ymax * 20) / 20;
    const sx = t => b2.x + b2.w * t / tmax, sy = v => r.u - (r.u - r.o) * v / ymax;
    [[1, C.strasse], [2, C.bebaut], [3, C.gruen]].forEach(([j, f]) => {
      if (!V.some(e => e[j] > 0)) return;
      ctx.strokeStyle = f; ctx.lineWidth = 1.5 * F.px; ctx.beginPath();
      V.forEach((e, i) => { const x = sx(e[0]), y = sy(e[j]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    });
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left"; ctx.fillText("0", b2.x, r.u + font * 1.2);
    ctx.textAlign = "right"; ctx.fillText(String(tmax), b2.x + b2.w, r.u + font * 1.2);
    ctx.textAlign = "left"; ctx.fillText(zahl(100 * ymax, 0) + " %", b2.x + 3 * F.px, r.o + font * 0.9);
    ctx.restore();
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 50, wert: 2 },
    parameter: [
      { id: "fassung", gruppe: G1, name: { de: "Fassung (field type)", en: "Version (field type)" }, art: "auswahl", wert: S.fassung, neustart: true,
        optionen: [{ wert: "netz", name: { de: "network only (3.4.1)", en: "network only (3.4.1)" } },
                   { wert: "boom", name: { de: "boom", en: "boom" } }, { wert: "interlink", name: { de: "interlink", en: "interlink" } },
                   { wert: "cluster", name: { de: "cluster", en: "cluster" } }],
        folgen: { netz: { konnekt: true, zellen: false }, boom: { konnekt: false, zellen: true }, interlink: { konnekt: false, zellen: true }, cluster: { konnekt: false, zellen: true } } },
      { id: "zellgroesse", gruppe: G1, name: { de: "Zellgröße (cell scale)", en: "cell scale" }, min: 6, max: 48, wert: S.zellgroesse, neustart: true, groesseNeu: true,
        format: v => { const f = Modell.feld(v); return `${v} px · ${f.spalt} × ${f.reih}`; } },
      { id: "startknoten", gruppe: G1, name: { de: "Startknoten (start with initial street)", en: "start with initial street" }, art: "schalter", wert: S.startknoten, neustart: true },
      { id: "stopAt", gruppe: G1, name: { de: "Halt bei (auto-stop at)", en: "auto-stop at" }, min: 10, max: 5000, schritt: 10, wert: S.stopAt },
      { id: "minDist", gruppe: G2, name: { de: "min Distance (Interlink)", en: "min distance (interlink)" }, min: 1, max: 20, wert: S.minDist },
      { id: "fieldW", gruppe: G2, name: { de: "Rauschgewicht (noise weight)", en: "noise weight" }, min: 0, max: 1, schritt: 0.01, wert: S.fieldW },
      { id: "nodeThresh", gruppe: G2, name: { de: "Knotenschwelle (grow thresh.)", en: "grow threshold" }, min: 0, max: 1, schritt: 0.01, wert: S.nodeThresh },
      { id: "strStep", gruppe: G2, name: { de: "Knotenabstand (max street step)", en: "max street step" }, min: 1, max: 10, wert: S.strStep },
      { id: "clusterRds", gruppe: G2, name: { de: "Clusterrunden am Anfang", en: "start with cluster rounds" }, min: 0, max: 100, wert: S.clusterRds },
      { id: "w1", gruppe: G3, name: { de: "zentripetal w1", en: "centripetal weight w1" }, min: 0, max: 5, schritt: 0.1, wert: S.w1 },
      { id: "A", gruppe: G3, name: { de: "Maßstab A", en: "x scale A" }, min: 0, max: 5, schritt: 0.1, wert: S.A },
      { id: "w2", gruppe: G3, name: { de: "zentrifugal w2", en: "centrifugal weight w2" }, min: 0, max: 5, schritt: 0.1, wert: S.w2 },
      { id: "B", gruppe: G3, name: { de: "Maßstab B", en: "x scale B" }, min: 0, max: 5, schritt: 0.1, wert: S.B },
      { id: "devThresh", gruppe: G3, name: { de: "Entwicklungsschwelle", en: "development threshold" }, min: 0, max: 1, schritt: 0.01, wert: S.devThresh },
      { id: "gRate", gruppe: G3, name: { de: "Wachstumsrate (growth rate)", en: "growth rate" }, min: 1, max: 50, wert: S.gRate },
      { id: "rndScale", gruppe: G3, name: { de: "Zufallsmaßstab (random scale)", en: "random scale" }, min: 0, max: 3, schritt: 0.1, wert: S.rndScale },
      { id: "autoBuild", gruppe: G4, name: { de: "Bebauungsautomat (auto build)", en: "auto build" }, art: "schalter", wert: S.autoBuild },
      { id: "genA", gruppe: G4, name: { de: "A: bebaut → grün ab", en: "A: built → green from" }, min: 0, max: 8, wert: S.genA },
      { id: "genB", gruppe: G4, name: { de: "B: bebaut → grün bis", en: "B: built → green up to" }, min: 0, max: 8, wert: S.genB },
      { id: "genC", gruppe: G4, name: { de: "C: grün → bebaut ab", en: "C: green → built from" }, min: 0, max: 8, wert: S.genC },
      { id: "genD", gruppe: G4, name: { de: "D: grün → bebaut bis", en: "D: green → built up to" }, min: 0, max: 8, wert: S.genD },
      { id: "konnekt", gruppe: G5, name: { de: "Erreichbarkeit färben (calculate pathes)", en: "colour accessibility (calculate pathes)" }, art: "schalter", wert: NETZ },
      { id: "lokal", gruppe: G5, name: { de: "lokales Maß (use local measure)", en: "use local measure" }, art: "schalter", wert: S.lokal },
      { id: "locRad", gruppe: G5, name: { de: "Radius lokales Maß", en: "local measure radius" }, min: 1, max: 20, wert: S.locRad },
      { id: "farbskala", gruppe: G5, name: { de: "Farbskala (color scale)", en: "color scale" }, min: 0, max: 10, wert: S.farbskala,
        format: v => "colExpo " + zahl(Modell.farbExponent(v), 1) },
      { id: "knotenGroesse", gruppe: G5, name: { de: "Knotengröße (node size)", en: "node size" }, min: 1, max: 12, wert: S.knotenGroesse },
      { id: "knoten", gruppe: G5, name: { de: "Knoten und Kanten (agent layer)", en: "show agent layer" }, art: "schalter", wert: S.knoten },
      { id: "zellen", gruppe: G5, name: { de: "Straßen und Bebauung (cell layer)", en: "show cell layer" }, art: "schalter", wert: !NETZ },
      { id: "potential", gruppe: G5, name: { de: "Potentialfeld unterlegen", en: "underlay potential field" }, art: "schalter", wert: S.potential },
      { id: "verlauf", gruppe: G5, name: { de: "Diagramme zeigen", en: "show charts" }, art: "schalter", wert: S.verlauf, groesseNeu: true }
    ],
    aktionen: [{ name: { de: "Zufällige Bebauung (random build)", en: "random build" }, tue: z => Modell.zufallsBebauung(z) }],
    groesse: (z, p) => !p.verlauf ? { b: z.sb, h: z.sh } : quer() ? { b: z.sb + LUECKE(z) + RECHTS(z), h: z.sh } : { b: z.sb, h: z.sh + UNTEN(z) },
    klick,
    ende: z => z.fertig,
    zeichne(ctx, z, p, F) {
      const C = farben(F), sb = z.sb, sh = z.sh;
      // feines Raster: Straße, bebaut (subState 2), grün (subState 3), frei (auf Wunsch nach Potential getönt);
      // das Bild wird nur neu gefüllt, wenn sich Zustand oder Darstellung geändert haben
      const schl = [z.version, F.dunkel, p.potential, p.zellen].join("|"), neu = raster.schl !== schl || raster.z !== z;
      raster.schl = schl; raster.z = z;
      Sim.raster(ctx, sb, sh, d => {
        if (!neu) return;
        const fl = F.rgb.flaeche, ti = F.rgb.tinte, st = Sim.rgb(C.strasse), be = Sim.rgb(C.bebaut), gr = Sim.rgb(C.gruen);
        for (let i = 0; i < sh; i++) {
          const zr = Math.floor(i / 3) * z.sp;
          for (let k = 0; k < sb; k++) {
            const s = i * sb + k, o = 4 * s;
            const cs = p.zellen ? z.cState[s] : 0;                       // Zellenebene aus: nur Fläche bzw. Potentialfeld
            let c = fl;
            if (cs === 1) c = st;
            else if (cs === 2) c = z.subState[s] === 3 ? gr : be;
            else if (p.potential) {
              const t = 0.6 * z.pot[zr + Math.floor(k / 3)];
              d[o] = fl[0] + (ti[0] - fl[0]) * t; d[o + 1] = fl[1] + (ti[1] - fl[1]) * t; d[o + 2] = fl[2] + (ti[2] - fl[2]) * t; d[o + 3] = 255; continue;
            }
            d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
          }
        }
      });
      if (p.knoten && z.nk.length) {
        // Kanten (DrawConnections, Pen.Width 2 bei cell scale 24) und Knoten (Radius SE_nSz px bei cell scale 24)
        const ein = 3 / 24, X = q => 3 * z.nk[q] + 1.5, Y = q => 3 * z.ni[q] + 1.5;
        ctx.lineCap = "round"; ctx.strokeStyle = C.kante; ctx.lineWidth = Math.max(2 * ein, 1.2 * F.px); ctx.beginPath();
        for (let a = 0; a < z.nb.length; a++) for (const b of z.nb[a]) if (b > a) { ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); }
        ctx.stroke();
        const r = Math.max(p.knotenGroesse * ein, 1.6 * F.px), k = p.konnekt ? konnektivitaet(z, p) : null;
        ctx.lineWidth = Math.max(ein, F.px); ctx.strokeStyle = C.rand;
        for (let q = 0; q < z.nk.length; q++) {
          ctx.beginPath(); ctx.arc(X(q), Y(q), r, 0, 2 * Math.PI);
          ctx.fillStyle = k && q < k.k.wert.length ? verlaufFarbe(k.k.wert[q]) : C.knoten;
          ctx.fill(); ctx.stroke();
        }
      }
      if (ziehen) {                                                          // gezogene Straße als Vorschau
        ctx.save(); ctx.setLineDash([4 * F.px, 3 * F.px]); ctx.strokeStyle = F.tinte; ctx.lineWidth = 1.5 * F.px;
        ctx.beginPath(); ctx.moveTo(ziehen.x0, ziehen.y0); ctx.lineTo(ziehen.x1, ziehen.y1); ctx.stroke(); ctx.restore();
      }
      if (p.verlauf) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramme(ctx, z, p, F, sb + LUECKE(z), sh * 0.04, RECHTS(z), sh * 0.92);
        else diagramme(ctx, z, p, F, 0, sh + LUECKE(z), sb, UNTEN(z) - LUECKE(z));
      }
    },
    legende: (F, p) => {
      const C = farben(F), L = p.zellen ? [[C.strasse, { de: "Straße", en: "street" }], [C.bebaut, { de: "bebaut", en: "built on" }], [C.gruen, { de: "grün", en: "green" }]] : [];
      if (p.knoten) L.push([C.kante, { de: "Kante", en: "edge" }], [p.konnekt ? verlaufFarbe(0) : C.knoten, p.konnekt ? { de: "Knoten: wenig erreichbar", en: "node: low accessibility" } : { de: "Knoten", en: "node" }]);
      if (p.knoten && p.konnekt) L.push([verlaufFarbe(1), { de: "gut erreichbar", en: "high accessibility" }]);
      return L;
    },
    kennzahlen(z, p) {
      const a = auswertung(z), k = p.konnekt && p.knoten && konn && konn.z === z ? konn : null;
      const L = [[{ de: "Zeitschritte", en: "time steps" }, String(z.t)],
                 [{ de: "Knoten · Kanten", en: "nodes · edges" }, `${a.knoten} · ${a.kanten}`],
                 [{ de: "Kanten je Knoten", en: "edges per node" }, zahl(a.grad, 2)],
                 [{ de: "Netzlänge (Zellen)", en: "network length (cells)" }, zahl(a.netzLaenge, 1)],
                 [{ de: "mittlere Weglänge ML (Kanten)", en: "mean path length ML (edges)" }, k ? zahl(k.k.globML, 2) + (k.t !== z.t ? ` (t ${k.t})` : "") : "–"],
                 [{ de: "Straße · bebaut · grün", en: "street · built · green" }, `${prozent(a.anteilStrasse)} · ${prozent(a.anteilBebaut)} · ${prozent(a.anteilGruen)}`]];
      if (z.modus > 1) L.push([{ de: "Cluster · größter (Zellen)", en: "clusters · largest (cells)" }, a.cluster ? `${a.cluster.anzahl} · ${a.cluster.groesster}` : "–"]);
      if (z.fertig) L.push([{ de: "Stand", en: "state" }, z.devList.length === 0 && z.modus === 1 ? { de: "keine Kandidaten mehr", en: "no candidates left" } : { de: "angehalten", en: "stopped" }]);
      return L;
    }
  });

  // Loslassen der linken Maustaste: gleiche Zelle → Knoten, sonst Straße von der Start- zur Endzelle (Panel_PaintMouseUp)
  const leinwand = document.getElementById("leinwand");
  leinwand.addEventListener("pointerup", () => {
    if (!ziehen || !window.SIM) return;
    const f = ziehen; ziehen = null;
    Modell.zieheStrasse(window.SIM.zustand, window.SIM.param, f.x0, f.y0, f.x1, f.y1);
    window.SIM.zeichne();
  });
  leinwand.addEventListener("pointercancel", () => { ziehen = null; });
  // Beschriftung im Diagramm folgt der Sprache
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
