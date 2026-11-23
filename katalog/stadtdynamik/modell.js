/* Stadtdynamik · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung der vier Grasshopper-Modelle von „Urban Simulation with Grasshopper for Rhino3D“ aus dem DeCodingSpaces Lab
   (Reinhard König, Martin Bielik, Sven Schneider, SimAUD 2018).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Standortmodelle (03_GridCity/052_GridCity.gh, 04_NetCityModel/065_RealCityNet_largeNet.gh): Orte sind die 12 × 8 Zellen eines
   Rasters (Manhattan-Distanz, „C#_Distances“) oder Parzellen einer Netzstadt (Distanz über kürzeste Wege im Straßennetz, „CityGraph“).
   Je Iteration (Anemone-Schleife) berechnet „C#_Attractivity“ für jeden Ort die Attraktivität für Wohnen und Arbeit aus den normierten
   Distanzen und der Wahrnehmung p = (1 − d)^a mit Schwelle; „C#_Grow&Move“ sperrt volle Orte (Einwohner + Arbeitsplätze ≥ maxDensity)
   und verteilt neue Einwohner und Arbeitsplätze per Roulette-Rad; „C#_Traffic“ schätzt die Wegelängen, „C#_Recorder“ schreibt Zeitreihen.
   Systemdynamik (01_WolvesSheep/02_WolvesSheep_AnemoneLoop.gh, 02_Abstract-urban-dynamics-model/035_SimpleUrbanSystem_dynamic_Anemone.gh):
   Bestände und Flüsse als Folge von Evaluate-Ausdrücken bzw. C#-Skripten, ein Schritt = eine Iteration. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Beziehungen der Attraktivitätsfunktionen: Wohnen ← Wohnen (pp), Wohnen ← Arbeit (pw), Arbeit ← Wohnen (wp), Arbeit ← Arbeit (ww).
      Je Beziehung: Exponent a der Wahrnehmung (1 − d)^a, Schwelle (darunter 0), Art „sucht“ (Summand p) oder „meidet“ (Summand 1 − p), Gewicht. */
  const BEZIEHUNGEN = ["pp", "pw", "wp", "ww"];

  /** Voreinstellungen je Modell (Auswahl „Modell“). Rasterstadt = 052_GridCity.gh, Netzstadt = 065_RealCityNet_largeNet.gh. */
  const FASSUNGEN = {
    raster: {
      iterationen: 100, neuWohnen: 10, neuArbeit: 10,
      // curPopAttract += (1 − p7) · curPop  mit p7 = (1 − d)^7, < 0,4 → 0   („people DON'T like to be close to other people“)
      ppExp: 7, ppSchwelle: 0.4, ppArt: "meidet", ppGewicht: 1,
      // im Original auskommentiert: weightImportWork 0,3 · (1 − d)^2 · curWork – hier mit Gewicht 0
      pwExp: 2, pwSchwelle: 0, pwArt: "sucht", pwGewicht: 0,
      // curWorkAttract += (1 − d)^2 · curPop   („workplaces like to be close to population“)
      wpExp: 2, wpSchwelle: 0, wpArt: "sucht", wpGewicht: 1,
      wwExp: 7, wwSchwelle: 0.5, wwArt: "sucht", wwGewicht: 0
    },
    netz: {
      iterationen: 100, neuWohnen: 50, neuArbeit: 50,
      // curPopAttract += p7 · curPop + 0,1 · p3 · curWork   (p7 < 0,5 → 0, p3 < 0,15 → 0)
      ppExp: 7, ppSchwelle: 0.5, ppArt: "sucht", ppGewicht: 1,
      pwExp: 3, pwSchwelle: 0.15, pwArt: "sucht", pwGewicht: 0.1,
      // curWorkAttract += (1 − p3) · curPop + 0,5 · p7 · curWork
      wpExp: 3, wpSchwelle: 0.15, wpArt: "meidet", wpGewicht: 1,
      wwExp: 7, wwSchwelle: 0.5, wwArt: "sucht", wwGewicht: 0.5
    },
    wolfschaf: { iterationen: 299 },     // Loop Start: Repeat 299 [−2..1000]
    stadtsystem: { iterationen: 90 }     // Loop Start: Repeat 90 [−2..1000]
  };

  const STANDARD = Object.assign({
    modell: "raster",
    maxDichte: 100,                       // Schieberegler maxDensity 100 [0..100]
    laengeKoeff: 0.2, winkelKoeff: 0.8,   // CityGraph: Length Coefficient 0,2, Angular Coefficient 0,8 [0..1]
    parzellenBreite: 25,                  // Parcels: PlotWidthThreshold (Original 50 bei den größeren Blöcken Weimars)
    darstellung: "saeulen",                // Säulen (Extrude) oder Farbflächen (Custom Preview mit Gradient)
    // Wolf-Schaf: Initial Sheep Stock 104 [0..1000], Initial Wolves Stock 30 [0..100], Sheep Birth Rate 0,06 [0..0,1],
    // Predation Rate 0,0005 [0..0,001], Predator Efficiency 1,5 [0..2], WolfDeathRate 0,38 [0..1]
    schafe0: 104, woelfe0: 30, geburtSchafe: 0.06, rissRate: 0.0005, effizienz: 1.5, sterbeWoelfe: 0.38,
    // Stadtsystem: Initial Population 1000, Initial Jobs 30, Initial Food 100, CitySize 100, IndustrySize 45, AgricultureSize 70,
    // DensityWeight 0,51 [0,01..1], JobDenseEff 0,5 [0..1]
    p0: 1000, j0: 30, f0: 100, wohnGroesse: 100, industrieGroesse: 45, agrarGroesse: 70, dichteGewicht: 0.51, jobDichteEff: 0.5
  }, FASSUNGEN.raster);

  const RASTER_NX = 12, RASTER_NY = 8;            // Square: Extent X 12, Extent Y 8, Size 1
  const RASTER_REF = [3.62498764447101, 2.46747501237716];   // Point „Pt“ (RefPoint) der .gh-Datei
  const istStandort = m => m === "raster" || m === "netz";

  /* ---------------------------------------------------------------- Wahrnehmung und Attraktivität */

  /** Wahrnehmung einer normierten Distanz d ∈ [0, 1]: p = (1 − d)^a, unter der Schwelle abgeschnitten (C#_Attractivity) */
  function wahrnehmung(d, a, schwelle) {
    const p = Math.pow(1 - d, a);
    return p < schwelle ? 0 : p;
  }
  /** Summand einer Beziehung: „sucht“ → p, „meidet“ → 1 − p */
  const summand = (p, art) => art === "meidet" ? 1 - p : p;

  /** Matrizen der Summanden je Beziehung aus den normierten Distanzen (n × n, Float32) */
  function wahrnehmungsMatrizen(Dn, n, p) {
    const out = {};
    for (const b of BEZIEHUNGEN) {
      const a = p[b + "Exp"], s = p[b + "Schwelle"], art = p[b + "Art"], m = new Float32Array(n * n);
      for (let i = 0; i < n * n; i++) m[i] = summand(wahrnehmung(Dn[i], a, s), art);
      out[b] = m;
    }
    return out;
  }

  /** Normierung wie im Original: (v − min) · 1 / max (nicht durch max − min); max = 0 → alles 0 */
  function normiere(v) {
    let mn = Infinity, mx = -Infinity;
    for (const x of v) { if (x < mn) mn = x; if (x > mx) mx = x; }
    const out = new Float64Array(v.length);
    if (!(mx > 0)) return out;
    for (let i = 0; i < v.length; i++) out[i] = (v[i] - mn) * (1 / mx);
    return out;
  }

  /** Attraktivität aller Orte für Wohnen und Arbeit (C#_Attractivity):
      Wohnen_i = Σ_k g_pp·f_pp(d_ik)·P_k/maxP + g_pw·f_pw(d_ik)·W_k/maxP,  Arbeit_i = Σ_k g_wp·f_wp·P_k/maxP + g_ww·f_ww·W_k/maxP.
      Wie im Original wird auch W durch maxP geteilt („curWork = WorkDistrib[k] / maxPop“). Danach normiert. */
  function attraktivitaet(Wm, n, P, W, g) {
    let maxP = 0; for (let k = 0; k < n; k++) if (P[k] > maxP) maxP = P[k];
    const q = maxP > 0 ? 1 / maxP : 0, aP = new Float64Array(n), aW = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sp = 0, sw = 0; const o = i * n;
      for (let k = 0; k < n; k++) {
        const cp = P[k] * q, cw = W[k] * q;
        if (cp === 0 && cw === 0) continue;
        sp += g.pp * Wm.pp[o + k] * cp + g.pw * Wm.pw[o + k] * cw;
        sw += g.wp * Wm.wp[o + k] * cp + g.ww * Wm.ww[o + k] * cw;
      }
      aP[i] = sp; aW[i] = sw;
    }
    return { roh: { P: aP, W: aW }, P: normiere(aP), W: normiere(aW) };
  }

  /** Roulette-Rad (C#_Grow&Move): Zufallswert r ∈ [0, 1) · Summe; erster Ort, bei dem die laufende Summe den Wert übersteigt; sonst −1 */
  function roulette(att, summe, r) {
    const ziel = r * summe; let s = 0;
    for (let k = 0; k < att.length; k++) { s += att[k]; if (s > ziel) return k; }
    return -1;
  }

  /** Verkehrsschätzung (C#_Traffic): Σ_i Σ_k d_ik · P_i · W_k / ΣW mit ungenormten Distanzen */
  function verkehr(D, n, P, W) {
    let sW = 0; for (let k = 0; k < n; k++) sW += W[k];
    if (!(sW > 0)) return 0;
    let s = 0;
    for (let i = 0; i < n; i++) {
      if (!P[i]) continue; const o = i * n; let r = 0;
      for (let k = 0; k < n; k++) if (W[k]) r += D[o + k] * W[k];
      s += P[i] * r;
    }
    return s / sW;
  }

  /* ---------------------------------------------------------------- Orte und Distanzen */

  /** Rasterstadt: 12 × 8 Zellen der Größe 1, Zellmitten in der Reihenfolge des Grasshopper-Rasters (Spalte für Spalte: i = x · 8 + y),
      Umrisse um 0,15 nach innen versetzt (Offset −0,15). Gezeichnet wird mit y nach unten, Norden (Rhino +y) oben. */
  function rasterOrte() {
    const orte = [];
    for (let x = 0; x < RASTER_NX; x++) for (let y = 0; y < RASTER_NY; y++) {
      const X = x, Y = RASTER_NY - 1 - y;
      orte.push({ gh: [x + 0.5, y + 0.5], mitte: [X + 0.5, Y + 0.5], poly: [[X + 0.15, Y + 0.15], [X + 0.85, Y + 0.15], [X + 0.85, Y + 0.85], [X + 0.15, Y + 0.85]] });
    }
    return orte;
  }
  /** Manhattan-Distanzen aller Zellmitten (C#_Distances) */
  function manhattan(orte) {
    const n = orte.length, D = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) D[i * n + k] = Math.abs(orte[k].gh[0] - orte[i].gh[0]) + Math.abs(orte[k].gh[1] - orte[i].gh[1]);
    return D;
  }

  /** Block in Parzellen teilen: so lange quer zur längeren Ausdehnung (bezogen auf die längste Kante) halbieren, bis beide Seiten
      höchstens „breite“ messen. Ersatz für die kompilierte Komponente „Parcels“. */
  function parzelliere(block, breite, out = []) {
    let lmax = 0, d = [1, 0];
    for (let i = 0; i < block.length; i++) {
      const a = block[i], b = block[(i + 1) % block.length], l = Geo.abstand(a, b);
      if (l > lmax) { lmax = l; d = Geo.norm(Geo.sub(b, a)); }
    }
    const nrm = [-d[1], d[0]];
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const q of block) { const u = Geo.dot(q, d), v = Geo.dot(q, nrm); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const L = u1 - u0, B = v1 - v0;
    if ((L <= breite && B <= breite) || out.length > 5000) { if (Geo.flaeche(block) > 1) out.push(block); return out; }
    const [a, r] = L >= B ? [Geo.add(Geo.mul(d, (u0 + u1) / 2), Geo.mul(nrm, v0)), nrm] : [Geo.add(Geo.mul(d, u0), Geo.mul(nrm, (v0 + v1) / 2)), d];
    for (const teil of Geo.teilePolygon(block, a, r)) if (teil.length >= 3) parzelliere(Geo.bereinige(teil), breite, out);
    return out;
  }

  /** Netzstadt: verzogenes Straßenraster (Szenen.stadt), Blöcke (Street Blocks, Offset 6 = halbe Straßenbreite) in Parzellen geteilt,
      jede Parzelle dem nächsten Straßensegment zugeordnet (Curve Closest Point, Sort List, List Item 0). */
  function netzStadt(zufall, p) {
    const S = Szenen.stadt(zufall, { b: 420, h: 300, nx: 8, ny: 6, jitter: 0.26, strasse: 12, zusammen: 0.22, platz: false, kirche: false, gebaeude: false });
    const N = Geo.netz(S.strassen, 0.01), orte = [];
    for (const bl of S.bloecke) for (const poly of parzelliere(bl, p.parzellenBreite)) {
      const mitte = Geo.schwerpunkt(poly);
      orte.push({ poly, mitte, seg: Geo.naechstesSegment(N, mitte), flaeche: Geo.flaeche(poly) });
    }
    return { b: S.b, h: S.h, N, orte, strassen: S.strassen };
  }

  /** Distanzen zwischen Straßensegmenten (CityGraph: Wegewahl nach Länge und Winkel, gemessen wird die Länge des gewählten Wegs).
      Gerichteter Segmentgraph wie die DeCodingSpaces-Komponenten 2018 (Normierung „dcs2020“); Länge von Segmentmitte zu Segmentmitte. */
  function segmentDistanzen(N, kL, kW) {
    const G = Geo.richtungsGraph(N, { kL, kW, norm: "dcs2020" }), m = G.n, Ds = new Float64Array(m * m);
    for (let s = 0; s < m; s++) {
      const A = Geo.segmentAbstaende(G, Geo.zustandsSuche(G, s));
      for (let t = 0; t < m; t++) Ds[s * m + t] = s === t ? 0 : A.meter[t];
    }
    return Ds;
  }
  /** Distanzmatrix der Parzellen aus den Segmentdistanzen (C#_Distances der Netzstadt: gleiche Segmente → 0); unerreichbar → größte Distanz */
  function netzDistanzen(orte, Ds, m) {
    const n = orte.length, D = new Float64Array(n * n);
    let mx = 0; for (const v of Ds) if (isFinite(v) && v > mx) mx = v;
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
      const v = Ds[orte[i].seg * m + orte[k].seg]; D[i * n + k] = isFinite(v) ? v : mx;
    }
    return D;
  }
  /** normierte Distanzen d / d_max (d_max = größter Eintrag der Matrix) */
  function normierteDistanzen(D) {
    let mx = 0; for (const v of D) if (v > mx) mx = v;
    const Dn = new Float64Array(D.length);
    if (mx > 0) for (let i = 0; i < D.length; i++) Dn[i] = D[i] / mx;
    return { Dn, dmax: mx };
  }

  /* ---------------------------------------------------------------- Systemdynamik */

  /** Wolf-Schaf (Evaluate-Ausdrücke SheepBirths, WolfBirths, WolfDeaths, SheepDeaths in dieser Reihenfolge der Verdrahtung) */
  function wolfSchafSchritt(S, W, p) {
    const S1 = S + p.geburtSchafe * S;                    // Sheep + (SBirthRate * Sheep)
    const W1 = W + W * p.rissRate * p.effizienz * S1;     // Wolves + (Wolves * PredRate * PredEff * Sheep)
    const W2 = W1 - W1 * p.sterbeWoelfe;                  // Wolves - (Wolves * DeathRate)
    const S2 = S1 - S1 * p.rissRate * W2;                 // SheepStock - (SheepStock * PredationRate * Wolves)
    return [S2, W2];
  }
  /** Mangelfaktor der C#-Skripte: 1 − ((−1 / (x + 1)²) + 1) = 1 / (x + 1)² */
  const mangel = x => 1 - ((-1 / Math.pow(x + 1, 2)) + 1);
  /** Stadtsystem mit Beständen Bevölkerung P, Arbeitsplätze J, Nahrung F; Flächen = Quadrate der Größen (Rectangle → Area) */
  function stadtSystemSchritt(P, J, F, p) {
    const aW = p.wohnGroesse * p.wohnGroesse, aI = p.industrieGroesse * p.industrieGroesse, aA = p.agrarGroesse * p.agrarGroesse;
    const P1 = P + (P * p.dichteGewicht * (1 - (P / aW)));          // PopulationGrowth
    const J1 = J + (J * (1 - J / P1));                               // IndustryGrowth
    const F1 = F + (1 - 1 / P1) * aA;                                // FoodGrowth
    const F2 = (F1 - P1) <= 0 ? 0.01 : F1 - P1;                      // FoodDecline
    const J2 = J1 - J1 * mangel(aI / J1) * p.jobDichteEff;           // C#_IndustryDecline
    const P2 = P1 - P1 * mangel(J2 / P1) * mangel(F2 / P1);          // C#_PopulationDecl
    return [P2, J2, F2];
  }

  /* ---------------------------------------------------------------- Zustand */

  const gewichte = p => ({ pp: p.ppGewicht, pw: p.pwGewicht, wp: p.wpGewicht, ww: p.wwGewicht });
  const summe = a => { let s = 0; for (const v of a) s += v; return s; };

  /** Neuer Zustand. zufall: Funktion () => [0, 1) (Saat) – nie Math.random(). */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, modell: p.modell, zufall, verlauf: [], fehl: 0 };
    if (p.modell === "wolfschaf") { z.S = p.schafe0; z.W = p.woelfe0; z.verlauf.push([z.S, z.W]); return z; }
    if (p.modell === "stadtsystem") { z.P = p.p0; z.J = p.j0; z.F = p.f0; z.verlauf.push([z.P, z.J, z.F]); return z; }
    if (p.modell === "netz") {
      const st = netzStadt(zufall, p);
      Object.assign(z, { b: st.b, h: st.h, orte: st.orte, N: st.N, strassen: st.strassen });
      z.Ds = segmentDistanzen(st.N, p.laengeKoeff, p.winkelKoeff);
      z.D = netzDistanzen(z.orte, z.Ds, st.N.kanten.length);
      z.ref = naechsterOrt(z, [st.b / 2, st.h / 2]);
    } else {
      z.orte = rasterOrte(); z.b = RASTER_NX; z.h = RASTER_NY;
      z.D = manhattan(z.orte);
      z.ref = rasterRef(z.orte, RASTER_REF);
    }
    z.n = z.orte.length;
    const nd = normierteDistanzen(z.D); z.Dn = nd.Dn; z.dmax = nd.dmax;
    z.Wm = wahrnehmungsMatrizen(z.Dn, z.n, p);
    anfang(z, p);
    return z;
  }

  /** nächste Zellmitte zum RefPoint (in Grasshopper-Koordinaten, C#_Initial) */
  function rasterRef(orte, q) {
    let best = 0, bd = Infinity;
    orte.forEach((o, i) => { const d = Geo.abstand(o.gh, q); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  /** Ort, dessen Mitte dem Punkt q (Zeichenkoordinaten) am nächsten liegt */
  function naechsterOrt(z, q) {
    let best = 0, bd = Infinity;
    z.orte.forEach((o, i) => { const d = Geo.abstand(o.mitte, q); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  /** Anfangsverteilung (C#_Initial): 1 Einwohner am Referenzort; Arbeit Raster: 1 an Ort 1, Netz: 3 an Ort n/2 − 3 */
  function anfang(z, p) {
    z.P = new Int32Array(z.n); z.W = new Int32Array(z.n);
    z.P[z.ref] = 1;
    if (p.modell === "netz") z.W[Math.max(0, Math.floor(z.n / 2) - 3)] = 3;
    else z.W[1] = 1;
    z.t = 0; z.fehl = 0; z.voll = 0;
    rechneAttraktivitaet(z, p);
    z.verlauf = [[summe(z.P), summe(z.W), verkehr(z.D, z.n, z.P, z.W)]];
  }
  function rechneAttraktivitaet(z, p) {
    const a = attraktivitaet(z.Wm, z.n, z.P, z.W, gewichte(p));
    z.attP = a.P; z.attW = a.W;
  }

  /** neue Einheiten per Roulette-Rad verteilen; summen = P + W vom Beginn des Schritts (wie sumList im Original) */
  function verteile(z, att, ziel, anzahl, summen, maxD) {
    const s = summe(att);
    for (let i = 0; i < anzahl; i++) {
      const slot = roulette(att, s, z.zufall());
      if (slot !== -1 && summen[slot] < maxD) ziel[slot] += 1;
      else z.fehl++;                      // Original: Print("SOMETHING WENT WRONG …"), Runde übersprungen
    }
  }

  /** Ein Schritt = eine Iteration der Anemone-Schleife; erhöht z.t */
  function schritt(z, p) {
    if (z.modell === "wolfschaf") {
      [z.S, z.W] = wolfSchafSchritt(z.S, z.W, p); z.verlauf.push([z.S, z.W]);
    } else if (z.modell === "stadtsystem") {
      [z.P, z.J, z.F] = stadtSystemSchritt(z.P, z.J, z.F, p); z.verlauf.push([z.P, z.J, z.F]);
    } else {
      const n = z.n, summen = new Int32Array(n), aP = Float64Array.from(z.attP), aW = Float64Array.from(z.attW);
      let voll = 0;
      for (let i = 0; i < n; i++) {
        summen[i] = z.P[i] + z.W[i];
        if (summen[i] >= p.maxDichte) { voll++; aP[i] = 0; aW[i] = 0; }   // volle Zellen: Attraktivität 0
      }
      z.voll = voll;
      verteile(z, aP, z.P, Math.round(p.neuWohnen), summen, p.maxDichte);
      verteile(z, aW, z.W, Math.round(p.neuArbeit), summen, p.maxDichte);
      rechneAttraktivitaet(z, p);
      z.verlauf.push([summe(z.P), summe(z.W), verkehr(z.D, n, z.P, z.W)]);
    }
    z.t++;
    return z;
  }

  /** Parameter ohne Neustart übernehmen (Wahrnehmung, Gewichte; Länge/Winkel rechnen die Netzdistanzen neu) */
  function aendere(z, p, id) {
    if (!istStandort(z.modell) || !id) return;
    if (id === "laengeKoeff" || id === "winkelKoeff") {
      if (z.modell !== "netz") return;
      z.Ds = segmentDistanzen(z.N, p.laengeKoeff, p.winkelKoeff);
      z.D = netzDistanzen(z.orte, z.Ds, z.N.kanten.length);
      const nd = normierteDistanzen(z.D); z.Dn = nd.Dn; z.dmax = nd.dmax;
      z.Wm = wahrnehmungsMatrizen(z.Dn, z.n, p);
      rechneAttraktivitaet(z, p);
      return;
    }
    if (/^(pp|pw|wp|ww)(Exp|Schwelle|Art)$/.test(id)) { z.Wm = wahrnehmungsMatrizen(z.Dn, z.n, p); rechneAttraktivitaet(z, p); }
    else if (/^(pp|pw|wp|ww)Gewicht$/.test(id)) rechneAttraktivitaet(z, p);
  }

  /** Referenzort (RefPoint) versetzen und von vorn beginnen; q in Zeichenkoordinaten */
  function setzeStart(z, p, q) {
    if (!istStandort(z.modell)) return false;
    z.ref = naechsterOrt(z, q);
    anfang(z, p);
    return true;
  }

  /** Ende: Iterationen der Anemone-Schleife (Repeat) erreicht */
  const fertig = (z, p) => z.t >= p.iterationen;

  /** Kennwerte der Standortmodelle: Summen, Verkehr, mittlere Wegelänge, volle Orte, Schwerpunkte von Wohnen und Arbeit */
  function bilanz(z, maxD = 100) {
    const sP = summe(z.P), sW = summe(z.W), v = z.verlauf[z.verlauf.length - 1][2];
    const sp = [0, 0], sw = [0, 0];
    z.orte.forEach((o, i) => { sp[0] += o.mitte[0] * z.P[i]; sp[1] += o.mitte[1] * z.P[i]; sw[0] += o.mitte[0] * z.W[i]; sw[1] += o.mitte[1] * z.W[i]; });
    let besetzt = 0, voll = 0, mx = 0;
    for (let i = 0; i < z.n; i++) { const s = z.P[i] + z.W[i]; if (s > 0) besetzt++; if (s > mx) mx = s; }
    for (let i = 0; i < z.n; i++) if (z.P[i] + z.W[i] >= maxD) voll++;
    // mittlere Entfernung der Einwohner bzw. Arbeitsplätze von der Mitte der Stadt (Zeichenkoordinaten)
    const c = [z.b / 2, z.h / 2]; let eP = 0, eW = 0;
    z.orte.forEach((o, i) => { const d = Geo.abstand(o.mitte, c); eP += d * z.P[i]; eW += d * z.W[i]; });
    return { einwohner: sP, arbeit: sW, verkehr: v, weg: sP ? v / sP : 0, besetzt, voll, max: mx,
             zentralP: sP ? eP / sP : 0, zentralW: sW ? eW / sW : 0,
             schwerP: sP ? [sp[0] / sP, sp[1] / sP] : null, schwerW: sW ? [sw[0] / sW, sw[1] / sW] : null };
  }

  return { STANDARD, FASSUNGEN, BEZIEHUNGEN, RASTER_NX, RASTER_NY, RASTER_REF, erzeuge, schritt, aendere, fertig, setzeStart, naechsterOrt,
           wahrnehmung, summand, wahrnehmungsMatrizen, normiere, attraktivitaet, roulette, verkehr, rasterOrte, manhattan, rasterRef,
           parzelliere, netzStadt, segmentDistanzen, netzDistanzen, normierteDistanzen, wolfSchafSchritt, mangel, stadtSystemSchritt, bilanz, istStandort };
});
