/* Isovist entlang eines Weges · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Isovist On Path“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Bielik, Ekaterina Fuchkina).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie in der .gh-Datei: „Evaluate Curve“ wertet den Weg (Walking Path) beim Anteil „Point On Curve“ (0…1, Voreinstellung 0,274)
   aus und liefert Punkt und Tangente. Der Punkt ist der Standpunkt (Vantage Point), die Tangente die Blickrichtung (Viewing Direction)
   der Komponente „Isovist“ mit Blickwinkel (Viewing Angle 0…360), Reichweite (Viewing Range 1…200) und Strahlen (Precision 1…720);
   Hindernisse sind die Gebäudekanten. „List Item“ wählt eine der 17 Kenngrößen. Das Katalogbild „Isovist Statistics“ zeigt den
   Verlauf der Kenngrößen entlang des Weges – die App rechnet dafür das Profil an 201 Stellen. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Point On Curve 0,274 (0…1), Viewing Angle 360 (0…360), Viewing Range 100 (1…200), Rays 360 (1…720), Liste „Area“;
      schrittweite: Anteil des Weges je Schritt, amEnde: „anhalten“ oder „vonVorn“ (nur in der App) */
  const STANDARD = { anteil: 0.274, winkel: 360, reichweite: 100, strahlen: 360, kenngroesse: "area", schrittweite: 0.004, amEnde: "anhalten" };
  const KENNGROESSEN = Geo.ISOVIST_MASSE.map(m => m[0]);
  /** Zahl der Abschnitte des Profils (201 Stellen von 0 bis 1) */
  const PROFIL_N = 200;

  /* Schneller Isovist über ein Segmentraster: Geo.segmentRechteck, Geo.segmentRaster, Geo.isovistRaster (../_gemeinsam/geo.js) */
  const { segmentRechteck, segmentRaster, isovistRaster } = Geo;

  /* ---------------------------------------------------------------- Weg durch die Stadt */
  /** Ecken einer Polylinie abrunden (Geo.rundeEcken, ../_gemeinsam/geo.js) */
  const rundeEcken = Geo.rundeEcken;

  /** Weg der Beispielstadt auf den Straßenmitten (ohne die Randstraßen): von der ersten inneren Kreuzung im Westen (Knotenreihe
      unter dem Platz) auf dem kürzesten Weg zur Südwestecke des Platzes, über einen Punkt unterhalb der Kirche quer über den Platz
      zur Südostecke, weiter zur letzten inneren Kreuzung im Osten;
      Ecken mit 4 m abgerundet. (Szenen.stadt().pfad schneidet bei manchen Saaten Gebäude und die Kirche.) */
  function wegDurchStadt(szene) {
    const o = szene.opt, K = szene.knoten, id = (i, j) => j * o.nx + i;
    const pi = Math.floor((o.nx - 1) / 2), pj = Math.min(o.ny - 1, Math.floor((o.ny - 1) / 2) + 1);
    // nur Straßen im Inneren: Kanten auf dem Rand der Szene entfallen (dort blickt man ins Leere)
    const amRand = q => Math.abs(q[0] - o.rand) < 1e-6 || Math.abs(q[1] - o.rand) < 1e-6 || Math.abs(q[0] - (o.b - o.rand)) < 1e-6 || Math.abs(q[1] - (o.h - o.rand)) < 1e-6;
    const N = Geo.netz(szene.strassen.filter(s => !(amRand(s[0]) && amRand(s[1])))), adj = Geo.adjazenz(N);
    const knoten = q => { let b = -1, bd = Infinity; N.knoten.forEach((k, i) => { const d = Geo.abstand(k, q); if (d < bd) { bd = d; b = i; } }); return b; };
    const nachbarn = i => adj[i].map(e => [e.j, N.kanten[e.k].l]);
    const strecke = (a, b) => { const r = Geo.dijkstra(N.knoten.length, nachbarn, a, b); return r.dist[b] < Infinity ? Geo.weg(r.vor, b).map(i => N.knoten[i]) : [N.knoten[a], N.knoten[b]]; };
    const W = knoten(K[id(Math.min(1, pi), pj)]), SW = knoten(K[id(pi, pj)]), SO = knoten(K[id(pi + 1, pj)]), O = knoten(K[id(Math.max(pi + 1, o.nx - 2), pj)]);
    let P = strecke(W, SW);
    if (szene.platz) { const c = Geo.schwerpunkt(szene.platz), bb = Geo.bbox(szene.platz); P.push([c[0], c[1] + bb.h * 0.33]); }
    P = P.concat(strecke(SO, O));
    return rundeEcken(P.map(q => q.slice()), 4, 4);
  }

  /* ---------------------------------------------------------------- Weg */
  /** Anteil t ∈ [0, 1] des Punkts auf der Polylinie P, der q am nächsten liegt; Länge der Polylinie (Geo, ../_gemeinsam/geo.js) */
  const naechsterAnteil = Geo.naechsterAnteil, laenge = Geo.polylinienLaenge;

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  /** Neuer Zustand: Beispielstadt mit einem Weg von West nach Ost über den Platz (wegDurchStadt) */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = Szenen.stadt(zufall);
    const z = { t: 0, szene, b: szene.b, h: szene.h, pfad: wegDurchStadt(szene), segRaster: segmentRaster(szene.hindernisse, 5),
                anteil: Math.max(0, Math.min(1, p.anteil)), profil: null, zeichnung: null };
    rechne(z, p);
    return z;
  }

  const isoOpt = (p, richtung) => ({ winkel: p.winkel, reichweite: p.reichweite, strahlen: p.strahlen, richtung });
  /** Isovist am Anteil a des Weges: Evaluate Curve → Punkt und Tangente → Isovist → {o, richtung, iso, masse} */
  function isovistBei(z, p, a) {
    const e = Szenen.aufPolylinie(z.pfad, a);
    const iso = isovistRaster(e.p, z.szene.hindernisse, z.segRaster, isoOpt(p, e.richtung));
    return { o: e.p, richtung: e.richtung, laenge: e.laenge, iso, masse: Geo.isovistMasse(iso) };
  }
  /** Isovist am aktuellen Anteil neu berechnen */
  function rechne(z, p) {
    const r = isovistBei(z, p, z.anteil);
    z.o = r.o; z.richtung = r.richtung; z.laenge = r.laenge; z.iso = r.iso; z.masse = r.masse;
    return z;
  }
  /** Profil der 17 Kenngrößen an PROFIL_N + 1 Stellen des Weges (wird erst bei Bedarf gerechnet und nach Änderungen verworfen).
      → {n, werte: {key: Float64Array}, min, max} */
  function profil(z, p) {
    if (z.profil) return z.profil;
    const n = PROFIL_N, werte = {}, min = {}, max = {};
    for (const k of KENNGROESSEN) { werte[k] = new Float64Array(n + 1); min[k] = Infinity; max[k] = -Infinity; }
    for (let i = 0; i <= n; i++) {
      const m = isovistBei(z, p, i / n).masse;
      for (const k of KENNGROESSEN) { const v = m[k]; werte[k][i] = v; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
    }
    z.profil = { n, werte, min, max };
    return z.profil;
  }

  /** am Ende angekommen (nur bei „anhalten“) */
  const amZiel = (z, p) => (p.amEnde || STANDARD.amEnde) !== "vonVorn" && z.anteil >= 1 - 1e-12;

  /** Ein Schritt: der Standpunkt wandert um „schrittweite“ (Anteil der Weglänge) weiter; am Ende anhalten oder von vorn; erhöht z.t */
  function schritt(z, p) {
    const d = p.schrittweite == null ? STANDARD.schrittweite : p.schrittweite;
    if (!amZiel(z, p)) {
      let a = z.anteil + d;
      if (a > 1 + 1e-12) a = (p.amEnde === "vonVorn") ? (z.anteil >= 1 - 1e-12 ? 0 : 1) : 1;
      z.anteil = Math.min(1, a);
      rechne(z, p);
    }
    z.t++;
    return z;
  }

  /** Parameter ohne Neustart: „anteil“ setzt den Standpunkt, Isovist-Parameter rechnen Isovist und Profil neu, die Kenngröße nur die Anzeige */
  function aendere(z, p, id) {
    if (id === "anteil") { z.anteil = Math.max(0, Math.min(1, p.anteil)); rechne(z, p); }
    else if (id === "winkel" || id === "reichweite" || id === "strahlen") { z.profil = null; rechne(z, p); }
  }

  /** liegt der Punkt in einem Gebäude? */
  function imGebaeude(z, q) { return z.szene.gebaeude.some(g => Geo.punktInPoly(q, g)); }
  /** Standpunkt auf den Weg setzen: nächster Punkt zu q */
  function geheZu(z, p, q) { z.anteil = naechsterAnteil(z.pfad, q); rechne(z, p); return z.anteil; }
  /** eigenen Weg setzen (mindestens zwei Punkte, mindestens 5 m lang); Standpunkt an den Anfang, Profil neu; true, wenn gesetzt */
  function setzePfad(z, p, P) {
    if (!P || P.length < 2 || laenge(P) < 5) return false;
    z.pfad = P.map(q => [q[0], q[1]]); z.anteil = 0; z.profil = null; rechne(z, p); return true;
  }
  /** Weg mit der Maus zeichnen: beginnen, Punkt anhängen (Mindestabstand 3 m, nicht in Gebäuden, nicht außerhalb) */
  function zeichneBeginn(z, q) { z.zeichnung = imGebaeude(z, q) ? [] : [[q[0], q[1]]]; }
  function zeichneWeiter(z, p, q) {
    if (!z.zeichnung) return false;
    if (q[0] < 0 || q[1] < 0 || q[0] > z.b || q[1] > z.h || imGebaeude(z, q)) return false;
    const L = z.zeichnung;
    if (L.length && Geo.abstand(L[L.length - 1], q) < 3) return false;
    L.push([q[0], q[1]]);
    return L.length >= 2 ? setzePfad(z, p, L) : false;
  }
  /** Weg der Beispielstadt wiederherstellen */
  function pfadZurueck(z, p) { z.zeichnung = null; z.pfad = wegDurchStadt(z.szene); z.anteil = 0; z.profil = null; rechne(z, p); }

  /** Fünf Kenngrößen ohne prüfbare Definition in der DeCodingSpaces-Toolbox v2 (dort gestrichen) werden nach eigenen Definitionen
      gerechnet (siehe QUELLE.md) und mit „*“ gekennzeichnet – Liste, Fußnote und Namen stehen in ../_gemeinsam/geo.js */
  const EIGENE_DEFINITION = Geo.ISOVIST_EIGENE_DEFINITION, FUSSNOTE = Geo.ISOVIST_FUSSNOTE;
  const kenngroesseName = Geo.isovistMassName, kenngroesseOption = Geo.isovistMassOption;

  return { STANDARD, EIGENE_DEFINITION, FUSSNOTE, kenngroesseName, kenngroesseOption, KENNGROESSEN, PROFIL_N, segmentRechteck, segmentRaster, isovistRaster, rundeEcken, wegDurchStadt, naechsterAnteil, laenge,
           erzeuge, isovistBei, rechne, profil, amZiel, schritt, aendere, imGebaeude, geheZu, setzePfad, zeichneBeginn, zeichneWeiter, pfadZurueck };
});
