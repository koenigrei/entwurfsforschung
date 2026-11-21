/* Modell „Circle City“ · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 590_Circle_City (HieNet_5, Delphi, 2007/08, Reinhard König),
   Kapitel 5.9 der Dissertation „Dynamische Simulation und Visualisierung räumlicher Prozesse“ (2008).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (aus Main.pas, CreateStructure.pas, calc_AStern.pas):
   - Hierarchisches Netz (CreateNetwork): Straßen auf einem Kreis, jede mit den drei nächsten Straßen beiderseits verbunden
     (Ring mit Nachbarschaft 3); an jeder Straße Häuser, in jedem Haus Wohnungen. 95 % der Wohnungen sind belegt,
     jeder Agent gehört zufällig zu einer von drei Gruppen (AgentsCreate).
   - Nachbarschaft einer Wohnung (NeighPathes, SetWeights): das eigene Haus mit Gewicht wH, die eigene Straße mit wH² · wS,
     jede andere Straße mit wS^n · wH², n = Zahl der Straßenknoten auf dem kürzesten Weg im Straßennetz (A*).
     Gezählt werden die Agenten je Gruppe in Haus und Straße (AggregateFractions), die eigene Wohnung eingeschlossen.
   - Anteil gleicher = Σ Gewicht · gleiche / Σ Gewicht · alle (CalcFraction), ohne Nachbarn 1.
   - AgentNeighInflu: in zufälliger Reihenfolge; Anteil < leavePlace → unzufrieden.
   - SearchNewHome: jeder Unzufriedene geht die freien Wohnungen der Reihe nach durch und zieht in die erste, deren Anteil
     > settleDown und größer als sein bisheriger ist; seine alte Wohnung kommt ans Ende der Liste der freien.
     Alle Bewertungen eines Schritts beruhen auf den Zählungen zu Beginn des Schritts.
   - DeleteConnection: Straßenverbindungen zufällig löschen, solange das Netz zusammenhängt. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const BILD = 766;                       // MainImage 766 × 766 px
  const MITTE = Math.round(BILD / 2);     // Pos0
  const R_STRASSE = 240, RING = 40, R_WOHNUNG = 13;   // dist0, ringDist, dist2

  /** Voreinstellungen wie im Original (Main.dfm) */
  const STANDARD = {
    strassen: 12, haeuser: 12, wohnungen: 12, frei: 5, verbindungen: 6, gruppen: 3,
    gewichtStrasse: 0.5, gewichtHaus: 1.0, wegziehen: 0.33, ansiedeln: 0.33, loeschen: 5,
    verlauf: true
  };
  const mitStandard = p => Object.assign({}, STANDARD, p);
  const rad = g => g * Math.PI / 180;

  /** Abstand wie calc_AStern.distance: gerundet */
  function abstand(a, b) { return Math.round(Math.hypot(a[0] - b[0], a[1] - b[1])); }

  /** Geometrie (CreateSNodes, CreateHNodes, CreateFNodes): Straßen, Häuser je Straße, Wohnungen je Haus in Bildpunkten */
  function geometrie(S, H, W) {
    const degP = rad(360 / S), strassen = [], haeuser = [], wohnungen = [];
    for (let i = 0; i < S; i++) strassen.push([Math.round(MITTE + Math.sin(degP * i) * R_STRASSE), Math.round(MITTE + Math.cos(degP * i) * R_STRASSE)]);
    for (let i = 0; i < S; i++) {
      let sx = 0, cy = 0, d1 = R_STRASSE;
      for (let k = 0; k < H; k++) {
        let degH, part, w = null;
        if (k < 3) { degH = degP * 0.6; d1 = R_STRASSE + RING; part = degH / 2; w = degP * i + degH / 2 - k * part; }
        else if (k < 7) { degH = degP * 0.7; d1 = R_STRASSE + RING * 2; part = degH / 3; w = degP * i + degH / 2 - (k - 3) * part; }
        else if (k < 13) { degH = degP * 0.75; d1 = R_STRASSE + RING * 3; part = degH / 4; w = degP * i + degH / 2 - (k - 7) * part; }
        if (w != null) { sx = Math.sin(w); cy = Math.cos(w); }   // ab dem 14. Haus übernimmt das Original die letzte Lage
        haeuser.push({ pos: [Math.round(MITTE + sx * d1), Math.round(MITTE + cy * d1)], strasse: i });
      }
    }
    const degF = rad(360 / W);
    haeuser.forEach((h, j) => {
      for (let k = 0; k < W; k++) wohnungen.push({ pos: [Math.round(h.pos[0] + Math.sin(degF * k) * R_WOHNUNG), Math.round(h.pos[1] + Math.cos(degF * k) * R_WOHNUNG)], haus: j, strasse: h.strasse });
    });
    return { strassen, haeuser, wohnungen };
  }

  /** Straßenverbindungen (AssignNeighb): jede Straße mit round(verbindungen / 2) Nachbarn beiderseits, Ring (Torus) */
  function kanten(S, verbindungen) {
    const nb = Math.round(verbindungen / 2), k = new Set();
    for (let i = 0; i < S; i++) for (let d = 1; d <= nb; d++) {
      const j = ((i + d) % S + S) % S; if (j !== i) k.add(Math.min(i, j) + "-" + Math.max(i, j));
    }
    return [...k].map(s => s.split("-").map(Number));
  }

  /** Zahl der Straßenknoten auf dem kürzesten Weg zwischen allen Straßenpaaren (StreetPathes mit A*; hier Dijkstra mit
      denselben gerundeten Abständen). Unerreichbar: Infinity. */
  function wege(strassen, kantenListe) {
    const S = strassen.length, nb = Array.from({ length: S }, () => []);
    for (const [a, b] of kantenListe) { const d = abstand(strassen[a], strassen[b]); nb[a].push([b, d]); nb[b].push([a, d]); }
    const n = Array.from({ length: S }, () => new Array(S).fill(Infinity));
    for (let s = 0; s < S; s++) {
      const dist = new Array(S).fill(Infinity), knoten = new Array(S).fill(0), fertig = new Array(S).fill(false);
      dist[s] = 0; knoten[s] = 1;
      for (;;) {
        let u = -1; for (let i = 0; i < S; i++) if (!fertig[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0) break;
        fertig[u] = true;
        for (const [v, d] of nb[u]) if (dist[u] + d < dist[v] || (dist[u] + d === dist[v] && knoten[u] + 1 < knoten[v])) { dist[v] = dist[u] + d; knoten[v] = knoten[u] + 1; }
      }
      for (let t = 0; t < S; t++) n[s][t] = fertig[t] ? knoten[t] : Infinity;
    }
    return n;
  }

  function erzeuge(param, zufall) {
    const p = mitStandard(param);
    const S = Math.max(2, Math.round(p.strassen)), H = Math.max(1, Math.round(p.haeuser)), W = Math.max(1, Math.round(p.wohnungen));
    const G = Math.max(2, Math.round(p.gruppen));
    const geo = geometrie(S, H, W), F = geo.wohnungen.length;
    const z = { t: 0, zufall, breite: BILD, hoehe: BILD, mitte: MITTE, S, H, W, G, geo,
                kanten: kanten(S, p.verbindungen), n: null,
                zustand: new Int8Array(F).fill(-1),        // FState je Wohnung: −1 frei, sonst Gruppe
                frei: [], agenten: [], unzufrieden: 0, umzuege: 0, fertig: null, verlauf: [] };
    z.n = wege(geo.strassen, z.kanten);
    for (let f = 0; f < F; f++) z.frei.push(f);              // FreeList in der Reihenfolge der Erzeugung
    const anzahl = Math.round(F * (1 - p.frei / 100));       // NetValues: UpD_nrAgents = round(Wohnungen · (1 − pFree))
    for (let i = 0; i < anzahl && z.frei.length; i++) {      // AgentsCreate
      const k = zufall.ganz(z.frei.length), f = z.frei[k], g = zufall.ganz(G);
      z.zustand[f] = g; z.agenten.push({ wohnung: f, gruppe: g, anteil: 0 });
      z.frei.splice(k, 1);
    }
    z.gruppenGroesse = new Array(G).fill(0); z.agenten.forEach(a => z.gruppenGroesse[a.gruppe]++);
    z.zaehlung = zaehle(z, p);
    z.verlauf.push(messe(z, p, 0, 0));
    return z;
  }

  /** AggregateFractions und gewichtete Summen je Straße: haus[h][g], strasse[s][g], summe[s][g] = Σ_s' Gewicht(s, s') · strasse[s'][g] */
  function zaehle(z, p) {
    const { S, G } = z, wH = p.gewichtHaus, wS = p.gewichtStrasse;
    const haus = Array.from({ length: z.geo.haeuser.length }, () => new Array(G).fill(0));
    const strasse = Array.from({ length: S }, () => new Array(G).fill(0));
    z.geo.wohnungen.forEach((w, f) => { const g = z.zustand[f]; if (g >= 0) { haus[w.haus][g]++; strasse[w.strasse][g]++; } });
    const summe = Array.from({ length: S }, () => new Array(G).fill(0));
    for (let s = 0; s < S; s++) for (let t = 0; t < S; t++) {
      const n = z.n[s][t]; if (n === Infinity) continue;
      const gew = gewicht(n, wH, wS);
      for (let g = 0; g < G; g++) summe[s][g] += gew * strasse[t][g];
    }
    return { haus, strasse, summe };
  }

  /** SetWeights: Gewicht einer Straße mit n Straßenknoten auf dem Weg (eigene Straße n = 1): wS^n · wH² */
  function gewicht(n, wH, wS) { return Math.pow(wS, n) * wH * wH; }

  /** CalcFraction: Anteil gleicher für einen Agenten der Gruppe g in Wohnung f (eigenes Haus mit wH, alle Straßen) */
  function anteil(z, p, f, g) {
    const w = z.geo.wohnungen[f], c = z.zaehlung, wH = p.gewichtHaus;
    let gleich = 0, alle = 0;
    for (let k = 0; k < z.G; k++) {
      const v = wH * c.haus[w.haus][k] + c.summe[w.strasse][k];
      alle += v; if (k === g) gleich += v;
    }
    return alle > 0 ? gleich / alle : 1;
  }

  /** Ein Zeitschritt (Execute): zählen, Zufriedenheit in zufälliger Reihenfolge, Umzüge */
  function schritt(z, param) {
    const p = mitStandard(param);
    z.zaehlung = zaehle(z, p);                                // AggregateFractions, NeighSum
    // AgentNeighInflu: zufällige Reihenfolge (TmpList), Unzufriedene in dieser Reihenfolge
    const reihe = z.agenten.slice(), unz = [];
    while (reihe.length) {
      const a = reihe.splice(z.zufall.ganz(reihe.length), 1)[0];
      a.anteil = anteil(z, p, a.wohnung, a.gruppe);
      if (a.anteil < p.wegziehen) unz.push(a);
    }
    // SearchNewHome
    let umzuege = 0;
    for (const a of unz) {
      for (let k = 0; k < z.frei.length; k++) {
        const f = z.frei[k], q = anteil(z, p, f, a.gruppe);
        if (q > p.ansiedeln && q > a.anteil) {
          a.anteil = q;
          z.zustand[f] = a.gruppe; z.zustand[a.wohnung] = -1;
          z.frei.splice(k, 1); z.frei.push(a.wohnung);
          a.wohnung = f; umzuege++;
          break;
        }
      }
    }
    z.unzufrieden = unz.length; z.umzuege = umzuege;
    z.t++;
    z.verlauf.push(messe(z, p, unz.length, umzuege));
    if (umzuege === 0 && z.fertig == null) z.fertig = z.t;
    return z;
  }

  /** Verbindungen löschen (DeleteConnection, ConnectionDeleteAuto): zufällige Kante; trennt sie das Netz, wird sie
      wiederhergestellt und das Löschen beendet. Liefert die Zahl der gelöschten Kanten. */
  function loesche(z, p) {
    let k = 0;
    for (let i = 0; i < Math.round(p.loeschen); i++) {
      if (!z.kanten.length) break;
      const a = z.zufall.ganz(z.S);
      const eigene = z.kanten.map((e, j) => [e, j]).filter(([e]) => e[0] === a || e[1] === a);
      if (!eigene.length) continue;
      const [, j] = eigene[z.zufall.ganz(eigene.length)];
      const weg = z.kanten.splice(j, 1)[0];
      const n = wege(z.geo.strassen, z.kanten);
      if (n.some(r => r.some(v => v === Infinity))) { z.kanten.splice(j, 0, weg); break; }
      z.n = n; k++;
    }
    z.zaehlung = zaehle(z, p); z.fertig = null;
    return k;
  }

  /** Parameter ohne Neustart: Gewichte und Schwellen gelten ab sofort */
  function aendere(z, param, id) {
    const p = mitStandard(param);
    z.zaehlung = zaehle(z, p);
    if (id !== "verlauf") z.fertig = null;
  }

  /** Segregationsindex auf Straßenebene (IDissimilar): je Gruppe ½ Σ_Straßen |Anteil der Gruppe − Anteil der übrigen| in %, gemittelt */
  function segregationsindex(z) {
    const c = zaehle(z, { gewichtHaus: 1, gewichtStrasse: 0.5 }).strasse, n = z.agenten.length;
    let s = 0, m = 0;
    for (let g = 0; g < z.G; g++) {
      const gg = z.gruppenGroesse[g]; if (!gg || gg === n) continue;
      let d = 0;
      for (const r of c) { const andere = r.reduce((a, b) => a + b, 0) - r[g]; d += Math.abs(r[g] / gg - andere / (n - gg)); }
      s += 50 * d; m++;
    }
    return m ? s / m : 0;
  }

  /** mittlere Weglänge im Straßennetz (Zahl der Kanten, GraphConnectivity) */
  function mittlereWeglaenge(z) {
    let s = 0, k = 0;
    for (let a = 0; a < z.S; a++) for (let b = 0; b < z.S; b++) if (a !== b && z.n[a][b] !== Infinity) { s += z.n[a][b] - 1; k++; }
    return k ? s / k : 0;
  }

  /** mittlerer Anteil gleicher über alle Agenten (Stand der letzten Bewertung bzw. neu berechnet) */
  function mittlererAnteil(z, p) { let s = 0; for (const a of z.agenten) s += anteil(z, mitStandard(p), a.wohnung, a.gruppe); return z.agenten.length ? s / z.agenten.length : 0; }

  /** Verlauf je Schritt: [unzufrieden %, umgezogen %, Segregationsindex %] */
  function messe(z, p, unz, umz) { const n = Math.max(1, z.agenten.length); return [100 * unz / n, 100 * umz / n, segregationsindex(z)]; }

  return { STANDARD, BILD, MITTE, abstand, geometrie, kanten, wege, gewicht, erzeuge, zaehle, anteil, schritt, loesche, aendere,
           segregationsindex, mittlereWeglaenge, mittlererAnteil };
});
