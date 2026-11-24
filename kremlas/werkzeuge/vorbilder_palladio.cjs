/* Vorbilder Palladio für KREMLAS: übersetzt die acht Villen der Konzeptstudie Palladio (Grammatik nach Stiny & Mitchell 1978,
   Raumaufteilungen nach Stiny & Gips 1978) in Raumprogramme für die dichte Packung und schreibt kremlas/vorbilder_palladio.js.
   Aufruf (im Ordner kremlas/):  node werkzeuge/vorbilder_palladio.cjs [Pfad zu prototyp/kern.js der Konzeptstudie Palladio]
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 23.11.2026 · CC BY 4.0

   Übersetzung:
   - Raum = Vereinigung seiner Rasterzellen samt der Wände zwischen ihnen, nach außen um eine halbe Wandstärke (1 Fuß) erweitert;
     so füllen die Räume das Innere der Außenwand lückenlos (Feld = Villa ohne halbe Außenwand ringsum).
   - Zusammengesetzte Säle (Kreuz, T, I) zeilenweise in Rechtecke zerlegt, gleiche Zeilen zusammengelegt; Hauptteil ist der Teil,
     der alle anderen berührt; zwei Teile, die an einem Ende gleich abschließen (L-Form), müssen bündig liegen.
   - Loggien (Typ L der Grammatik) sind nach außen offen: Nachbar −1 (Eingang).
   - Maße in Meter: Vicentiner Fuß = 0,357 m (Palladio, Quattro Libri; übliche Umrechnung 35,7 cm).
   - Nachbarschaften = Türen der Grammatik (Paare a–b, Tür nach außen = Nachbar −1), ohne Doppelungen.
   - Mindestbreite je Raum = 0,8 · kürzeste Seite seines kleinsten Teils im Vorbild (Annahme: Spielraum für Varianten).
   - Symmetrie: Räume, deren Mittelpunkt auf der Achse liegt, sind Achsenräume; die übrigen bilden Spiegelpaare. */
"use strict";
const fs = require("fs"), path = require("path");
const KERN = process.argv[2] || "C:/LocalOnlyData/GitHub/Planungsgrundlagen/_prozess/konzepte/2026-11-22_Palladio_Grammatik/prototyp/kern.js";
const P = require(path.resolve(KERN));
const FUSS = 0.357, WAND = P.WAND, H = WAND / 2;

function zerlege(raum, C, L) {
  // Zellen je Zeile zu waagerechten Balken, dann gleiche Balken übereinanderliegender Zeilen zusammenlegen
  const zeilen = {};
  for (const c of raum.zellen) { const i = c % C, j = (c - i) / C; (zeilen[j] = zeilen[j] || []).push(i); }
  const balken = [];
  for (const j of Object.keys(zeilen).map(Number).sort((a, b) => a - b)) {
    const I = zeilen[j].sort((a, b) => a - b);
    let s = I[0];
    for (let k = 1; k <= I.length; k++) if (k === I.length || I[k] !== I[k - 1] + 1) { balken.push({ i0: s, i1: I[k - 1], j0: j, j1: j }); s = I[k]; }
  }
  const T = [];
  for (const b of balken) {
    const vorher = T.find(t => t.i0 === b.i0 && t.i1 === b.i1 && t.j1 === b.j0 - 1);
    if (vorher) vorher.j1 = b.j1; else T.push(Object.assign({}, b));
  }
  return T.map(t => ({ x0: L.X0[t.i0] - H, x1: L.X1[t.i1] + H, y0: L.Y0[t.j0] - H, y1: L.Y1[t.j1] + H }));
}
const beruehrt = (a, b) => {
  const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return (Math.abs(ox) < 1e-6 && oy > 0) || (Math.abs(oy) < 1e-6 && ox > 0);
};

const programme = {}, fassungen = {}, liste = [];
for (const v of P.PALLADIO) {
  const V = P.erzeuge({ villa: v.id }, 1), L = V.L;
  const x0 = -L.B / 2 + H, y0 = H, Bm = (L.B - WAND) * FUSS, Dm = (L.D - WAND) * FUSS;   // Feld: Innenkante Außenwand + halbe Wand
  const m = (x, y) => [(x - x0) * FUSS, (y - y0) * FUSS];
  const groesse = V.raeume.map(r => r.zellen.length);
  const raeume = V.raeume.map((r, k) => {
    let teile = zerlege(r, V.C, L);
    // Hauptteil zuerst: der Teil, der alle anderen berührt (sonst der größte)
    const flaeche = t => (t.x1 - t.x0) * (t.y1 - t.y0);
    let haupt = teile.findIndex(t => teile.every(u => u === t || beruehrt(t, u)));
    if (haupt < 0) haupt = teile.indexOf(teile.slice().sort((a, b) => flaeche(b) - flaeche(a))[0]);
    teile = [teile[haupt], ...teile.filter((_, i) => i !== haupt)];
    const A = teile.reduce((s, t) => s + flaeche(t), 0) * FUSS * FUSS;
    const kurz = Math.min(...teile.map(t => Math.min(t.x1 - t.x0, t.y1 - t.y0))) * FUSS;
    const mitte = teile.reduce((s, t) => s + (t.x0 + t.x1) / 2 * flaeche(t), 0) / teile.reduce((s, t) => s + flaeche(t), 0);
    // Typ der Grammatik: R Rechteckraum, X/T/I zusammengesetzter Saal, L Loggia (zur Außenseite offen, nicht L-förmig)
    const gross = groesse[k] === Math.max(...groesse);
    const name = r.typ === "L" ? ["Loggia", "Loggia"] : gross && r.typ !== "R" ? ["Sala", "Sala"] : gross && Math.abs(mitte) < 1e-6 ? ["Sala", "Sala"] : kurz < 2.6 ? ["Camerino", "Camerino"] : ["Stanza", "Stanza"];
    // bündig: zwei Teile, die an einem Ende der Kontaktkante gleich abschließen (echtes L); T, Kreuz und I nicht
    const buendig = teile.length === 2 && (() => { const [a, b] = teile, e = (u, v) => Math.abs(u - v) < 1e-6;
      return (e(a.y1, b.y0) || e(b.y1, a.y0)) ? (e(a.x0, b.x0) || e(a.x1, b.x1)) && !(e(a.x0, b.x0) && e(a.x1, b.x1)) : (e(a.y0, b.y0) || e(a.y1, b.y1)) && !(e(a.y0, b.y0) && e(a.y1, b.y1)); })();
    return { k, name, A, mb: Math.round(0.8 * kurz * 100) / 100, typ: r.typ, buendig, mitte,
             teile: teile.map(t => { const [a0, b0] = m(t.x0, t.y0), [a1, b1] = m(t.x1, t.y1); return { x0: a0, y0: b0, x1: a1, y1: b1 }; }) };
  });
  // Stanze nummerieren (links nach rechts, vorn nach hinten), Paare über gespiegelte Mitte
  const nummer = {}; let n = 0;
  raeume.slice().sort((a, b) => (a.teile[0].y0 - b.teile[0].y0) || (a.mitte - b.mitte)).forEach(r => { if (r.name[0] === "Stanza" || r.name[0] === "Camerino") nummer[r.k] = ++n; });
  for (const r of raeume) if (nummer[r.k]) r.name = [`${r.name[0]} ${nummer[r.k]}`, `${r.name[1]} ${nummer[r.k]}`];
  const achse = raeume.filter(r => Math.abs(r.mitte) < 1e-6).map(r => r.k);
  const paare = [];
  for (const r of raeume) {
    if (achse.includes(r.k) || r.mitte > 0) continue;
    const g = raeume.find(q => Math.abs(q.mitte + r.mitte) < 1e-6 && Math.abs(q.teile[0].y0 - r.teile[0].y0) < 1e-6 && Math.abs(q.A - r.A) < 1e-6);
    if (!g) throw new Error(`${v.id}: kein Spiegelraum für ${r.k}`);
    paare.push([r.k, g.k]);
  }
  const nb = new Set();
  for (const t of V.tueren) { const a = t.a, b = t.b == null ? -1 : t.b; if (a == null) continue; const k = b === -1 ? `${a},-1` : `${Math.min(a, b)},${Math.max(a, b)}`; nb.add(k); }
  for (const r of raeume) if (r.typ === "L") nb.add(`${r.k},-1`);        // Loggia: offen nach außen = Eingang
  const pid = "pal_" + v.id;
  programme[pid] = {
    titel: v.name, feld: { b: Bm, h: Dm },
    raeume: raeume.map(r => [r.name[0], r.name[1], Math.round(r.A * 100) / 100, r.mb,
      r.teile.length > 1 ? { teile: r.teile.map(t => (t.x1 - t.x0) * (t.y1 - t.y0) / (r.teile.reduce((s, u) => s + (u.x1 - u.x0) * (u.y1 - u.y0), 0))).map(a => Math.round(a * 1000) / 1000),
                              buendig: r.buendig } : null]),
    paare: [...nb].map(s => s.split(",").map(Number)),
    symmetrie: { achse, paare },
    vorbild: raeume.map(r => r.teile.map(t => [t.x0, t.y0, t.x1, t.y1].map(q => Math.round(q * 1000) / 1000)))
  };
  fassungen[pid] = { programm: pid };
  liste.push(pid);
}
const kopf = `/* Vorbilder Palladio für KREMLAS – erzeugt mit werkzeuge/vorbilder_palladio.cjs (nicht von Hand bearbeiten).
   Quelle: Konzeptstudie Palladio (entwurfsforschung.de/lab/palladio/), Grammatik nach G. Stiny und W. J. Mitchell (1978):
   The Palladian grammar, Environment and Planning B 5(1), 5–18, doi:10.1068/b050005; Raumaufteilungen der Villen nach
   G. Stiny und J. Gips (1978): An evaluation of Palladian plans, Environment and Planning B 5(2), 199–206, doi:10.1068/b050199.
   Maße in Meter (Vicentiner Fuß = 0,357 m). Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
`;
const daten = { programme, fassungen, liste };
const js = kopf + `(function (w) { const D = ${JSON.stringify(daten)};\n  if (typeof module === "object" && module.exports) module.exports = D; else w.KREMLAS_VORBILDER = Object.assign(w.KREMLAS_VORBILDER || {}, { palladio: D });\n})(typeof globalThis !== "undefined" ? globalThis : this);\n`;
fs.writeFileSync(path.join(__dirname, "..", "vorbilder_palladio.js"), js);
for (const pid of liste) { const p = programme[pid]; console.log(pid, p.feld.b.toFixed(1) + "×" + p.feld.h.toFixed(1) + " m", p.raeume.length + " Räume", "Teile " + p.raeume.map(r => r[4] ? r[4].teile.length : 1).join(""), "Paare " + p.paare.length, "Achse " + p.symmetrie.achse.length, "Spiegel " + p.symmetrie.paare.length); }
