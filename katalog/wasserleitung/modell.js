/* Wasserleitung: Druck und Durchfluss · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Water Network Analysis“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie die Schaltung der .gh-Datei: Range (NetworkSegments) und Graph Mapper (Bezier) ergeben das Höhenprofil einer
   Leitung (Cluster) → „Write Hydrology Network“ schreibt ein EPANET-Netz: Behälter am Anfang (TankHeight, TankVolume), an jedem
   weiteren Punkt ein Verbraucher (Demand), alle Linien Rohre (LineDiameter, LineRoughness) bis auf die Linie
   Floor(NetworkSegments · Pump Index), die eine Pumpe ist (Pump Power) → „Analyse Hydrology Network“ (EPANET) → Pipe Values /
   Node Values; Verbraucher unter „Min Pressure“ werden pink. Die Rohrnetzberechnung (Gradientenverfahren wie EPANET) steht in
   ../_gemeinsam/hydraulik.js (gemeinsam mit der App „Wassernetz“); ein Schritt ist eine Iteration dieses Verfahrens. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/hydraulik.js") : wurzel.Hydraulik);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Hydraulik) {
  "use strict";

  /** Voreinstellungen der .gh-Datei (Schieberegler: Wert [Bereich]):
      segmente NetworkSegments 10 [0..100] · laenge NetworkLength 100 [0..1000] m · hoehe NetworkHeight 30 [0..100] m ·
      tankHoehe TankHeight 6 [0..10] m · tankVolumen TankVolume 395 [0..1000] m³ · bedarf Demand (Liter per Second) 100 [0..1000] ·
      durchmesser LineDiameter 0.9 [0..10] m · minDruck Min Pressure 1 [0..100] m · rauheit LineRoughness 120 [120..160] ·
      pumpe Pump Power in kilowatt 1 [1..20] · pumpenIndex Pump Index 0.99 [0..0.99] ·
      rohrWert Value List „Pipe values“ (Flow rate) · knotenWert Value List „Node values“ (Pressure).
      iterativ: Erweiterung (nicht im Original) – Verbraucher ohne ausreichenden Druck entnehmen nichts, hinter negativem Druck
      kommt kein Wasser an; neu rechnen, bis sich nichts mehr ändert. */
  const STANDARD = { segmente: 10, laenge: 100, hoehe: 30, tankHoehe: 6, tankVolumen: 395, bedarf: 100, durchmesser: 0.9, minDruck: 1,
                     rauheit: 120, pumpe: 1, pumpenIndex: 0.99, rohrWert: "q", knotenWert: "druck", iterativ: false };
  /** Graph Mapper der Datei: Bezier-Kurve mit vier Stützpunkten (x, y) im Bereich 0…1 */
  const KURVE = [[0, 0.62137681245803833], [0.23188406229019165, 0.260869562625885], [0.51304340362548828, 1], [1, 0.45507240295410156]];
  const ROHRWERTE = ["q", "v", "verlust", "status", "C", "energie"];        // Flow rate, Flow velocity, Head loss, Actual link status, Roughness, Energy expended
  const KNOTENWERTE = ["bedarf", "kopf", "druck"];                            // Actual demand, Hydraulic head, Pressure

  /** Punkt der kubischen Bezier-Kurve beim Kurvenparameter u */
  const bezier = (K, u, k) => (1 - u) ** 3 * K[0][k] + 3 * (1 - u) ** 2 * u * K[1][k] + 3 * (1 - u) * u * u * K[2][k] + u ** 3 * K[3][k];
  /** Graph Mapper: y zur Stelle x ∈ [0, 1] (x(u) ist monoton, wenn die x-Werte der Stützpunkte steigen; Bisektion nach u) */
  function graphMapper(K, x) {
    let a = 0, b = 1;
    for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (bezier(K, m, 0) < x) a = m; else b = m; }
    return Math.max(0, Math.min(1, bezier(K, (a + b) / 2, 1)));
  }
  /** Stützpunkte gültig halten: Enden bei x = 0 und 1, innere x in [0, 1] und aufsteigend, alle y in [0, 1] */
  function ordneKurve(K) {
    const k = K.map(p => [Math.max(0, Math.min(1, p[0])), Math.max(0, Math.min(1, p[1]))]);
    k[0][0] = 0; k[3][0] = 1; if (k[1][0] > k[2][0]) k[2][0] = k[1][0];
    return k;
  }

  /** Höhenprofil der Leitung (Range → Graph Mapper → Cluster): Punkte i = 0…N bei x = i/N · Länge. Die Höhe wird so umgerechnet,
      dass der Behälter (Punkt 0) auf 0 liegt und der Höhenunterschied zwischen höchstem und tiefstem Punkt NetworkHeight beträgt
      (wie in Testnet.inp: Behälter auf 0, tiefster Punkt auf −NetworkHeight). → [{x, z}] */
  function profil(p, K = KURVE) {
    const N = Math.max(0, Math.round(p.segmente));
    if (N < 1) return [{ x: 0, z: 0 }];
    const g = []; for (let i = 0; i <= N; i++) g.push(graphMapper(K, i / N));
    const mn = Math.min(...g), mx = Math.max(...g), sp = mx - mn;
    return g.map((v, i) => ({ x: i / N * p.laenge, z: sp > 1e-12 ? p.hoehe * (v - g[0]) / sp : 0 }));
  }

  /** Index der Linie, die Pumpe ist: Round.Floor(NetworkSegments · Pump Index) */
  const pumpenLinie = p => Math.floor(Math.max(0, Math.round(p.segmente)) * p.pumpenIndex + 1e-9);

  /** EPANET-Netz wie „Write Hydrology Network“: Knoten 0 = Behälter (Elevation z0, Wasserstand TankHeight), Knoten 1…N Verbraucher
      mit Demand (L/s → m³/s), Linie i von Punkt i nach i + 1 (Länge im Raum); die Pumpenlinie ist eine Pumpe (Pump Power).
      versorgt: optional Bedarf je Knoten (Erweiterung „iterativ“); bis: nur Knoten 0…bis (abgeschnittener Rest). */
  function netzAus(P, p, versorgt = null, bis = P.length - 1) {
    const knoten = [], leitungen = [], ip = pumpenLinie(p);
    for (let i = 0; i <= bis; i++) {
      if (i === 0) knoten.push({ z: P[0].z, behaelter: true, kopf: P[0].z + p.tankHoehe });
      else knoten.push({ z: P[i].z, bedarf: versorgt && !versorgt[i] ? 0 : p.bedarf / 1000 });
    }
    for (let i = 0; i < bis; i++) {
      const L = Math.hypot(P[i + 1].x - P[i].x, P[i + 1].z - P[i].z);
      leitungen.push(i === ip ? { a: i, b: i + 1, art: "pumpe", P: p.pumpe, L } : { a: i, b: i + 1, art: "rohr", L, d: p.durchmesser, C: p.rauheit });
    }
    return { knoten, leitungen };
  }

  /** Durchmesser des Behälters aus Volumen und Höhe (EPANET-Tank: zylindrisch, V = π d² / 4 · h) */
  const tankDurchmesser = (V, h) => h > 0 && V > 0 ? Math.sqrt(4 * V / (Math.PI * h)) : 0;

  /** Neuer Zustand: Profil und Netz aus den Parametern, Löser bereit (t = 0, noch keine Iteration) */
  function erzeuge(param) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, kurve: KURVE.map(q => q.slice()) };
    baue(z, p);
    return z;
  }
  /** Profil, Netz und Löser neu; Analyse leer */
  function baue(z, p) {
    z.P = profil(p, z.kurve);
    z.versorgt = z.P.map(() => true); z.bis = z.P.length - 1; z.durchgang = 1;
    z.netz = netzAus(z.P, p);
    z.S = z.P.length > 1 ? Hydraulik.neu(z.netz) : null;
    z.erg = null; z.fertig = !z.S; z.verlauf = [];
  }

  /** Erweiterung „iterativ“: nach einer fertigen Rechnung Versorgung prüfen. Verbraucher unter Mindestdruck entnehmen nichts;
      am ersten Knoten mit negativem Druck reißt die Leitung ab, dahinter kommt kein Wasser an. → true, wenn sich etwas geändert hat */
  function pruefeVersorgung(z, p) {
    const E = z.erg; let geaendert = false, bis = z.bis;
    for (let i = 1; i <= z.bis; i++) {
      if (E.knoten[i].druck < 0) { bis = i; break; }
    }
    for (let i = 1; i < z.versorgt.length; i++) {
      const aus = i > bis || (i <= z.bis && E.knoten[i].druck < p.minDruck);
      if (aus && z.versorgt[i]) { z.versorgt[i] = false; geaendert = true; }
    }
    if (bis < z.bis) { z.bis = bis; geaendert = true; }
    return geaendert;
  }

  /** Ein Schritt: eine Iteration des Gradientenverfahrens. Ist das Verfahren fertig und „iterativ“ an, prüft der nächste Schritt
      die Versorgung und beginnt, wenn nötig, einen neuen Durchgang. Danach tut er nichts mehr (t zählt weiter). */
  function schritt(z, p) {
    z.t++;
    if (z.fertig) return z;
    if (z.S.fertig) {                                   // nur bei „iterativ“: Versorgung prüfen
      if (p.iterativ && pruefeVersorgung(z, p)) {
        z.netz = netzAus(z.P, p, z.versorgt, z.bis);
        z.S = Hydraulik.neu(z.netz); z.durchgang++;
      } else { z.fertig = true; return z; }
    }
    z.verlauf.push(Hydraulik.iteration(z.netz, z.S));
    z.erg = Hydraulik.ergebnisse(z.netz, z.S);
    if (z.S.fertig && !p.iterativ) z.fertig = true;
    return z;
  }
  const fertig = z => z.fertig;

  /** ganz rechnen (nach einer Änderung, wenn schon gerechnet wurde); t bleibt mindestens so groß wie die Zahl der Iterationen */
  function rechneAlles(z, p) {
    let n = 0;
    while (!z.fertig && n < 1000) { schritt(z, p); n++; }
  }

  /** Parameter ohne Neustart: neu aufbauen; war die Rechnung schon begonnen, sofort ganz rechnen */
  function aendere(z, p, id) {
    if (id === "rohrWert" || id === "knotenWert") return;
    if (id === "minDruck" && !p.iterativ) return;      // färbt nur um
    const t = z.t; baue(z, p);
    if (t > 0) { rechneAlles(z, p); z.t = Math.max(t, z.t); }
  }
  /** Graph Mapper bearbeiten: Stützpunkt k nach (x, y) ∈ [0, 1]²; danach wie aendere */
  function setzeKurve(z, p, k, x, y) {
    const K = z.kurve.map(q => q.slice()); K[k] = [x, y];
    z.kurve = ordneKurve(K);
    aendere(z, p, "kurve");
  }

  /** Wert einer Leitung / eines Knotens nach Auswahl der Wertelisten (null = nicht definiert, z. B. Rauheit einer Pumpe) */
  const rohrWert = (z, k, art) => z.erg ? z.erg.leitungen[k][art] : null;
  const knotenWert = (z, i, art) => z.erg ? z.erg.knoten[i][art] : null;

  /** Verbraucher unter Mindestdruck (Smaller Than → Replace Items: pink) */
  function zuWenigDruck(z, p) {
    if (!z.erg) return [];
    const L = [];
    z.erg.knoten.forEach((k, i) => { if (i > 0 && k.druck < p.minDruck) L.push(i); });
    return L;
  }

  /** Kennzahlen der Rechnung */
  function bilanz(z, p) {
    const E = z.erg, R = { iter: z.S ? z.S.iter : 0, fehler: z.S ? z.S.fehler : 0, durchgang: z.durchgang,
                           laenge: z.netz.leitungen.reduce((s, l) => s + l.L, 0) };
    if (!E) return R;
    const vers = E.knoten.filter((k, i) => i > 0 && k.bedarf > 0).length;
    const dr = E.knoten.slice(1).map(k => k.druck);
    return Object.assign(R, {
      zufluss: -E.knoten[0].bedarf, versorgt: vers, zuWenig: zuWenigDruck(z, p).length,
      druckMin: Math.min(...dr), druckMax: Math.max(...dr),
      foerderhoehe: E.leitungen.filter((l, k) => z.netz.leitungen[k].art === "pumpe").reduce((s, l) => s + l.foerderhoehe, 0),
      vMax: Math.max(...E.leitungen.map(l => l.v))
    });
  }

  return { STANDARD, KURVE, ROHRWERTE, KNOTENWERTE, bezier, graphMapper, ordneKurve, profil, pumpenLinie, netzAus, tankDurchmesser,
           erzeuge, baue, pruefeVersorgung, schritt, fertig, rechneAlles, aendere, setzeKurve, rohrWert, knotenWert, zuWenigDruck, bilanz };
});
