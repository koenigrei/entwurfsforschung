/* Mietpreisdynamik und Straßen · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 550_Mietpreisdynamik (segregation_rentScape, Delphi, Juni 2007) und seiner Vorfassung
   580_Wirkung_StrassenSegregat (segregation_streets, Delphi, November 2006), Reinhard König,
   Kapitel 5.5 und 5.8 der Dissertation „Dynamische Simulation und Visualisierung räumlicher Prozesse“ (2008).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (aus CellForm.pas, ToleranZ.pas, agenten.pas):
   - testLocation/checkNei: Nachbarschaft (2r+1)² ohne Torus (wrap: Zellen außerhalb fehlen), die Zelle selbst zählt mit.
     Gleiche Toleranz (580): gewichtete Anteile gleicher Gruppen, satisfied = gleich / (gleich + anders) · 100;
     Gewicht einer Nachbarzelle = sWeight (Nähe zu kommunikativer Straße +1/+2/+3 → 2/4/8), über eine Barriere
     (Straße −1/−2/−3) hinweg 0,67/0,33/0; freie Zellen nicht, als anders oder als gleich gezählt.
     Individuelle Toleranzen (550): je Gruppe j höchstens tol_j = n − round(Abneigung_j · n) Zellen (n = (2r+1)²);
     satisfied = (Summe − Überschuss) / Summe · 100, Abneigung = 20 % je Stufe gegenüber niedrigeren Gruppen.
   - calcAgents: Agenten in Listenreihenfolge; zufrieden, wenn satisfied ≥ Schwellenwert (580: >) und Miete < Budget.
     Sonst Sprung rndN(−d−1, d) je Achse (Torus) auf eine freie Zelle ohne Straße; umziehen, wenn der neue Ort
     zufriedener macht oder (550) billiger ist. Beim Einzug prägt der Agent der Zelle die Miete seiner Gruppe auf (diffuseIn).
   - diffuseField (550): neue Miete jeder Zelle = Mittel der acht Nachbarn (Torus), synchron.
   - growth: mit „Wachstum“ beginnt der Lauf mit 100 Agenten und erhält je Schritt 10 dazu. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SPALTEN = 116, ZEILEN = 116;   // round(694 / cellScal 6)
  const FREI = -1;
  const VERSUCHE = 1000;               // resc > 1000
  const KACHEL = 20;                   // E_nbSize: Kachelgröße des Segregationsindex
  /** SG_weight (setupFields): Gewichte der Straßentypen −3 … +3 */
  const GEWICHT = { "-3": 0, "-2": 0.33, "-1": 0.67, "0": 1, "1": 2, "2": 4, "3": 8 };

  /** Voreinstellungen der Fassung 550 (CellForm.dfm); die Fassung 580 setzt app.js über „folgen“ */
  const STANDARD = {
    fassung: "miete",
    anzahl: 12000,        // Edit_anzAg
    gruppen: 6,           // Edit_anzGr
    radius: 2,            // Edit_nRad (580: 5)
    weite: 54,            // Edit_mDist
    schwelle: 100,        // TrB_thresh (580: 30)
    toleranz: "individuell",   // cb_individTol (580: gleich)
    abneigungUnten: 20,   // −UpD_toInfer: Abneigung je Stufe gegenüber niedrigeren Gruppen (%)
    abneigungOben: 0,     // −UpD_toSuper: gegenüber höheren Gruppen (%)
    freie: "nicht",       // RadioGroup1: freie Zellen nicht / als andere / als gleiche zählen
    miete: true,          // cb_actiRentLand
    mieteMin: -1, mieteMax: 1,   // E_rentMin, E_rentMax
    wachstum: false,      // CB_actiGrow, E_startGrowWith 100, E_growRate 10
    stopp: 500,           // E_stopT
    linien: []            // Straßen [{a: [x, y], b: [x, y], typ}] – bleiben über ein neues Setup erhalten
  };
  const mitStandard = p => Object.assign({}, STANDARD, p);

  function torus(v, n) { v %= n; return v < 0 ? v + n : v; }
  /** rndN(−d − 1, d) wie TAgent.SetStepX: round((2d + 2) · Random − d − 1) */
  function sprung(zufall, d) { return Math.round((2 * d + 2) * zufall() - d - 1); }

  /** Farbband chooseCol: Rot → Gelb → Grün → Cyan → Blau → Magenta */
  function farbband(n) {
    const f = [], s = 1275 / Math.max(1, n - 1);
    for (let i = 0; i < n; i++) {
      const k = Math.round(i * s); let r = 0, g = 0, b = 0;
      if (k <= 255) { r = 255; g = k; } else if (k <= 510) { r = 510 - k; g = 255; } else if (k <= 765) { g = 255; b = k - 510; }
      else if (k <= 1020) { g = 1020 - k; b = 255; } else { r = Math.min(255, k - 1020); b = 255; }
      f.push([r, g, b]);
    }
    return f;
  }

  /** Miete, die eine Gruppe beim Einzug aufprägt (rentGroupsCreate): gleichmäßig von mieteMin bis mieteMax */
  function gruppenMiete(typ, p) { return p.mieteMin + (p.mieteMax - p.mieteMin) / Math.max(1, p.gruppen - 1) * (typ - 1); }
  /** Budget eines Agenten (setupAgents): mieteMin + typ · (mieteMax − mieteMin) / Gruppen */
  function budget(typ, p) { return p.mieteMin + typ * (p.mieteMax - p.mieteMin) / p.gruppen; }

  /** Toleranztabelle (ToleranZ.setValues/setTolGroup): tol[typ][j], j = 0 freie Zellen, 1 … Gruppen */
  function toleranzen(p) {
    const n = (2 * p.radius + 1) ** 2, tol = [];
    for (let i = 1; i <= p.gruppen; i++) {
      const zeile = [n];                                       // gegenüber freien Zellen: Abneigung 0 → alle erlaubt
      for (let k = 1; k <= p.gruppen; k++) {
        const d = i - k;
        let y = d > 0 ? d * p.abneigungUnten : -d * p.abneigungOben;
        y = Math.max(0, Math.min(100, y));
        zeile.push(n - Math.round(y / 100 * n));
      }
      tol[i] = zeile;
    }
    return tol;
  }

  /** Echter Schnitt zweier Strecken (Intersect): Berührung an Endpunkten und parallele Strecken zählen nicht */
  function schneidet(a1x, a1y, a2x, a2y, b1x, b1y, b2x, b2y) {
    const K1 = b2y - b1y, K2 = a1y - a2y, K3 = a2y - b2y;
    const J = a1x * (b1y - b2y) + a2x * K1 + b1x * (a2y - a1y) + b2x * K2;
    if (J === 0) return false;
    let I = a1x * K3 + a2x * (b2y - a1y) + b2x * K2;
    if (J > 0 ? (I <= 0 || I >= J) : (I >= 0 || I <= J)) return false;
    I = b1x * K3 + b2x * (b1y - a2y) + a2x * K1;
    if (J > 0 ? (I <= 0 || I >= J) : (I >= 0 || I <= J)) return false;
    return true;
  }

  /** Straße in das Raster übertragen (transLine): von a aus schrittweise zur direkten Nachbarzelle, die dem Ziel b
      nicht ferner liegt und deren Richtung zum Ziel der Richtung a → b am nächsten kommt */
  function strassenZellen(a, b, S, Z) {
    const wink = Math.atan2(b[1] - a[1], b[0] - a[0]), zellen = [];
    let x = a[0], y = a[1];
    for (let k = 0; k <= S + Z + 2; k++) {
      zellen.push([x, y]);
      if (x === b[0] && y === b[1]) break;
      let best = null, min = Infinity;
      for (const [nx, ny] of [[x, y + 1], [x, y - 1], [x + 1, y], [x - 1, y]]) {
        if (Math.abs(b[1] - ny) > Math.abs(b[1] - y) || Math.abs(b[0] - nx) > Math.abs(b[0] - x)) continue;
        const d = Math.abs(wink - Math.atan2(b[1] - ny, b[0] - nx));
        if (d < min) { min = d; best = [nx, ny]; }
      }
      if (!best) break;
      x = torus(best[0], S); y = torus(best[1], Z);
    }
    return zellen;
  }

  /** Straßen übernehmen: Straßenzellen, Zellgewichte (checkStreets) und Barrieren zwischen Zellpaaren (testLines) */
  function setzeStrassen(z, linien, p) {
    const S = z.spalten, Z = z.zeilen, N = S * Z;
    z.linien = linien.map(l => ({ a: l.a.slice(), b: l.b.slice(), typ: l.typ }));
    z.strasse.fill(0);
    for (const l of z.linien) for (const [x, y] of strassenZellen(l.a, l.b, S, Z)) z.strasse[y * S + x] = l.typ;
    // checkStreets: Gewicht der Barrierezellen selbst, Gewicht der Zellen neben kommunikativen Straßen
    for (let y = 0; y < Z; y++) for (let x = 0; x < S; x++) {
      const c = y * S + x, st = z.strasse[c];
      let w = st < 0 ? GEWICHT[st] : 1;
      for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) {
        const sv = z.strasse[torus(y + v, Z) * S + torus(x + u, S)];
        if (sv > 0 && st === 0) w = GEWICHT[sv];
      }
      z.gewicht[c] = w;
    }
    // testLines: Barrieren (negative Straßen) zwischen Zelle und Nachbar, je Paar der kleinste Typ
    const r = Math.round(p.radius), D = 2 * r + 1, neg = z.linien.filter(l => l.typ < 0);
    z.barriere = null;
    if (neg.length) {
      const b = new Float32Array(N * D * D).fill(-1);          // Gewicht über die Barriere, −1 = keine Barriere
      for (let y = 0; y < Z; y++) for (let x = 0; x < S; x++) for (let v = -r; v <= r; v++) for (let u = -r; u <= r; u++) {
        const xx = x + u, yy = y + v;
        if (xx < 0 || yy < 0 || xx >= S || yy >= Z) continue;
        let t = 0;
        for (const l of neg) if (l.typ < t && schneidet(x, y, xx, yy, l.a[0], l.a[1], l.b[0], l.b[1])) t = l.typ;
        if (t) b[(y * S + x) * D * D + (v + r) * D + (u + r)] = GEWICHT[t];
      }
      z.barriere = b;
    }
  }

  function erzeuge(param, zufall) {
    const p = mitStandard(param);
    const S = SPALTEN, Z = ZEILEN, N = S * Z;
    const nMax = Math.max(0, Math.min(N - 1, Math.round(p.anzahl)));
    const z = {
      t: 0, zufall, spalten: S, zeilen: Z, breite: S, hoehe: Z, gruppen: Math.max(2, Math.round(p.gruppen)), nMax, n: 0,
      zelle: new Int16Array(N).fill(FREI), zelltyp: new Uint8Array(N), strasse: new Int8Array(N), gewicht: new Float32Array(N).fill(1), barriere: null, linien: [],
      miete: new Float64Array(N), mieteNeu: new Float64Array(N),
      x: new Int16Array(nMax), y: new Int16Array(nMax), typ: new Uint8Array(nMax), budget: new Float32Array(nMax),
      halt: new Uint8Array(nMax), sati: new Float32Array(nMax), umzugswillig: 0, umzuege: 0, verlauf: [], fertig: null
    };
    p.gruppen = z.gruppen;
    z.tol = toleranzen(p);
    setzeStrassen(z, p.linien || [], p);                       // preserveStreets vor dem Setzen der Agenten
    const start = p.wachstum ? Math.min(nMax, 100) : nMax;    // E_startGrowWith
    for (let i = 0; i < start; i++) neuerAgent(z, p);
    z.verlauf.push(messe(z, p));
    return z;
  }

  /** setupAgents: zufällige freie Zelle ohne Straße (höchstens 1000 Versuche), Gruppe random(Gruppen) + 1, Budget */
  function neuerAgent(z, p) {
    if (z.n >= z.nMax) return false;
    const S = z.spalten, Z = z.zeilen;
    for (let k = 0; k < VERSUCHE; k++) {
      const x = z.zufall.ganz(S), y = z.zufall.ganz(Z), c = y * S + x;
      if (z.zelle[c] !== FREI || z.strasse[c] !== 0) continue;
      const i = z.n++;
      z.x[i] = x; z.y[i] = y; z.typ[i] = z.zufall.ganz(z.gruppen) + 1;
      z.budget[i] = p.miete ? budget(z.typ[i], p) : p.mieteMax;
      z.halt[i] = 0; z.sati[i] = 0; z.zelle[c] = i; z.zelltyp[c] = z.typ[i];
      return true;
    }
    return false;
  }

  /** testLocation: Zufriedenheit (0 … 100) eines Agenten der Gruppe typ auf Zelle (x, y); ohne = Zelle, die als frei gilt.
      Der gedachte Ort und der alte Ort werden in z.zelltyp vorübergehend umgesetzt (0 frei, sonst Gruppe). */
  function zufriedenheit(z, p, x, y, typ, ohne = -1) {
    const S = z.spalten, Z = z.zeilen, r = Math.round(p.radius), D = 2 * r + 1, hier = y * S + x, zt = z.zelltyp;
    const altHier = zt[hier], altOhne = ohne >= 0 ? zt[ohne] : 0;
    if (ohne >= 0) zt[ohne] = 0;
    zt[hier] = typ;
    const y0 = Math.max(0, y - r), y1 = Math.min(Z - 1, y + r), x0 = Math.max(0, x - r), x1 = Math.min(S - 1, x + r);
    let ergebnis = 0;
    if (p.toleranz === "individuell") {
      const zahl = z._zahl || (z._zahl = new Int32Array(16)); zahl.fill(0);
      for (let yy = y0; yy <= y1; yy++) for (let c = yy * S + x0, e = yy * S + x1; c <= e; c++) zahl[zt[c]]++;
      const tol = z.tol[typ]; let summe = 0, ueber = 0;
      for (let j = 0; j <= z.gruppen; j++) { summe += zahl[j]; if (zahl[j] > tol[j]) ueber += zahl[j] - tol[j]; }
      ergebnis = summe > 0 ? (summe - ueber) / summe * 100 : 0;
    } else {
      let gleich = 0, anders = 0;
      const b = z.barriere, g = z.gewicht, frei = p.freie === "anders" ? 1 : p.freie === "gleich" ? 2 : 0;
      for (let yy = y0; yy <= y1; yy++) {
        const zb = hier * D * D + (yy - y + r) * D + r - x;     // Index in der Barriere-Tabelle für Spalte xx: zb + xx
        for (let xx = x0; xx <= x1; xx++) {
          const c = yy * S + xx, st = zt[c];
          let w = g[c];
          if (b) { const bw = b[zb + xx]; if (bw >= 0) w = bw; }
          if (st === typ) gleich += w;
          else if (st !== 0) anders += w;
          else if (frei === 1) anders += 1;
          else if (frei === 2) gleich += 1;
        }
      }
      const n = gleich + anders;
      ergebnis = n > 0 ? gleich / n * 100 : 0;
    }
    zt[hier] = altHier;
    if (ohne >= 0) zt[ohne] = altOhne;
    return ergebnis;
  }

  /** Zufrieden-Bedingung (calcAgents): 550 satisfied ≥ Schwellenwert, 580 satisfied > Schwellenwert; mit Miete zusätzlich Miete < Budget */
  function bleibt(sati, miete, budgetWert, p) {
    const ok = p.fassung === "strassen" ? sati > p.schwelle : sati >= p.schwelle;
    return ok && (!p.miete || miete < budgetWert);
  }

  /** calcAgents: alle Agenten in Listenreihenfolge */
  function ziehe(z, p) {
    const S = z.spalten, Z = z.zeilen, d = Math.max(1, Math.round(p.weite));
    let willig = 0, umzuege = 0;
    for (let i = 0; i < z.n; i++) {
      const c = z.y[i] * S + z.x[i];
      if (z.t === 0) z.sati[i] = zufriedenheit(z, p, z.x[i], z.y[i], z.typ[i]);
      let halt = bleibt(z.sati[i], z.miete[c], z.budget[i], p);
      if (z.strasse[c] !== 0) halt = false;                    // Agenten auf Straßen ziehen weg
      z.halt[i] = halt ? 1 : 0;
      if (halt) { z.sati[i] = zufriedenheit(z, p, z.x[i], z.y[i], z.typ[i]); continue; }
      willig++;
      let ziel = -1, tx = 0, ty = 0;
      for (let k = 0; k < VERSUCHE; k++) {
        tx = torus(z.x[i] + sprung(z.zufall, d), S); ty = torus(z.y[i] + sprung(z.zufall, d), Z);
        const t = ty * S + tx;
        if (z.zelle[t] === FREI && z.strasse[t] === 0) { ziel = t; break; }
      }
      const jetzt = zufriedenheit(z, p, z.x[i], z.y[i], z.typ[i]);
      if (ziel < 0) { z.sati[i] = jetzt; continue; }
      const dort = zufriedenheit(z, p, tx, ty, z.typ[i], c);
      if (jetzt < dort || (p.miete && z.miete[ziel] < z.miete[c])) {
        z.zelle[c] = FREI; z.zelle[ziel] = i; z.zelltyp[c] = 0; z.zelltyp[ziel] = z.typ[i]; z.x[i] = tx; z.y[i] = ty; z.sati[i] = dort; umzuege++;
        if (p.miete) z.miete[ziel] = gruppenMiete(z.typ[i], p);   // diffuseIn
      } else z.sati[i] = jetzt;
    }
    z.umzugswillig = willig; z.umzuege = umzuege;
  }

  /** diffuseField: Mittel der acht Nachbarn (Torus), synchron */
  function diffundiere(z) {
    const S = z.spalten, Z = z.zeilen, m = z.miete, n = z.mieteNeu;
    for (let y = 0; y < Z; y++) {
      const o = torus(y - 1, Z) * S, w = y * S, u = torus(y + 1, Z) * S;
      for (let x = 0; x < S; x++) {
        const l = torus(x - 1, S), r = torus(x + 1, S);
        n[w + x] = (m[o + l] + m[o + x] + m[o + r] + m[w + l] + m[w + r] + m[u + l] + m[u + x] + m[u + r]) / 8;
      }
    }
    z.miete = n; z.mieteNeu = m;
  }

  /** Ein Zeitschritt (actions): growth, calcAgents, diffuseField */
  function schritt(z, param) {
    const p = mitStandard(param); p.gruppen = z.gruppen;
    if (p.wachstum) for (let k = 0; k < 10; k++) neuerAgent(z, p);    // E_growRate
    ziehe(z, p);
    if (p.miete) diffundiere(z);
    z.t++;
    z.verlauf.push(messe(z, p));
    if (z.umzugswillig === 0 && z.fertig == null) z.fertig = z.t;
    return z;
  }

  /** Parameter ohne Neustart: Schwellenwert, Abneigung, freie Zellen, Weite, Miete an/aus; Straßen über setzeStrassen */
  function aendere(z, param, id) {
    const p = mitStandard(param); p.gruppen = z.gruppen;
    if (id === "abneigungUnten" || id === "abneigungOben") z.tol = toleranzen(p);
    if (id === "linien") setzeStrassen(z, p.linien || [], p);
    if (id === "miete") for (let i = 0; i < z.n; i++) z.budget[i] = p.miete ? budget(z.typ[i], p) : p.mieteMax;
    z.fertig = null;
  }

  /** Segregationsindex (countInTiles, IDissimilar): je Gruppe ½ Σ_Kacheln |Anteil der Gruppe − Anteil der übrigen| in %, gemittelt */
  function segregationsindex(z) {
    const S = z.spalten, Z = z.zeilen, G = z.gruppen, k = Math.ceil(Z / KACHEL);
    const zahl = new Int32Array(k * k * (G + 1)), gr = new Int32Array(G + 1);
    for (let i = 0; i < z.n; i++) {
      const t = Math.min(k - 1, Math.floor(z.y[i] / KACHEL)) * k + Math.min(k - 1, Math.floor(z.x[i] / KACHEL));
      zahl[t * (G + 1) + z.typ[i]]++; gr[z.typ[i]]++;
    }
    let s = 0, m = 0;
    for (let g = 1; g <= G; g++) {
      if (!gr[g] || gr[g] === z.n) continue;
      let d = 0;
      for (let t = 0; t < k * k; t++) d += Math.abs(zahl[t * (G + 1) + g] / gr[g] - (sumKachel(zahl, t, G) - zahl[t * (G + 1) + g]) / (z.n - gr[g]));
      s += 50 * d; m++;
    }
    return m ? s / m : 0;
  }
  function sumKachel(zahl, t, G) { let s = 0; for (let g = 1; g <= G; g++) s += zahl[t * (G + 1) + g]; return s; }

  /** Anteil der angehaltenen (zufriedenen) Agenten je Gruppe (calcChart zeigte den Anteil mit satisfied ≥ 100) */
  function zufriedenJeGruppe(z) {
    const a = new Array(z.gruppen + 1).fill(0), n = new Array(z.gruppen + 1).fill(0);
    for (let i = 0; i < z.n; i++) { n[z.typ[i]]++; if (z.halt[i]) a[z.typ[i]]++; }
    return a.map((v, g) => n[g] ? v / n[g] : 0).slice(1);
  }

  /** Verlauf je Schritt: [angehalten je Gruppe, Segregationsindex %, Umzugswillige] */
  function messe(z, p) { return [zufriedenJeGruppe(z), segregationsindex(z), z.umzugswillig]; }

  /** Mittlere Miete der Zellen, auf denen Agenten der Gruppe g wohnen */
  function mieteJeGruppe(z) {
    const s = new Array(z.gruppen + 1).fill(0), n = new Array(z.gruppen + 1).fill(0);
    for (let i = 0; i < z.n; i++) { s[z.typ[i]] += z.miete[z.y[i] * z.spalten + z.x[i]]; n[z.typ[i]]++; }
    return s.map((v, g) => n[g] ? v / n[g] : 0).slice(1);
  }

  return { STANDARD, SPALTEN, ZEILEN, FREI, GEWICHT, torus, sprung, farbband, gruppenMiete, budget, toleranzen, schneidet,
           strassenZellen, setzeStrassen, erzeuge, neuerAgent, zufriedenheit, bleibt, ziehe, diffundiere, schritt, aendere,
           segregationsindex, zufriedenJeGruppe, mieteJeGruppe };
});
