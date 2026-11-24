/* Vorbilder Siza/Duarte für KREMLAS: übersetzt Häuser der Konzeptstudie Duarte/Siza (Malagueira-Grammatik nach J. P. Duarte 2005,
   eigene Rekonstruktion als Generator) in Raumprogramme für die dichte Packung und schreibt kremlas/vorbilder_siza.js.
   Keine Daten aus Duartes Korpus: alle Häuser erzeugt die eigene Grammatik (Typen wie in der App Duarte/Siza).
   Aufruf (im Ordner kremlas/):  node werkzeuge/vorbilder_siza.cjs [Pfad zu prototyp/kern.js des Experiments Malagueira]
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 24.11.2026 · CC BY 4.0

   Übersetzung je Geschoss:
   - Feld = Grundstück 8 × 12 m; die Räume der Grammatik füllen es (Höfe als Räume „Hof“).
   - Räume gleicher Funktion, die sich berühren (z. B. die Teile des Flurs im OG), bilden einen Raum aus Teilen.
   - Obergeschoss: Treppe und der Luftraum über den Höfen (Grundstück ohne OG-Räume) sind fest an der Stelle des Vorbilds.
   - Nachbarschaften = Türen der Grammatik im Geschoss; die Tür vom Hof zur Straße (Typ „aussen“) ist der Eingang (Nachbar −1);
     im OG die Treppe als Zugang (Treppe–Flur).
   - Mindestbreite je Raum = 0,8 · kürzeste Seite seines kleinsten Teils im Vorbild.
   - Türbreite 0,80 m wie in der Grammatik, ohne Zugabe: Siza setzt Türen in 1,1 m schmale Gänge (sonst wäre das Vorbild selbst ungültig). */
"use strict";
const fs = require("fs"), path = require("path");
const ABSTIMMUNG = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, "abstimmung.json"), "utf-8")); } catch (e) { return {}; } })();
const KERN = process.argv[2] || "C:/LocalOnlyData/GitHub/Planungsgrundlagen/_prozess/konzepte/2026-11-20_Experiment_Siza_Malagueira/prototyp/kern.js";
const S = require(path.resolve(KERN));
const W = S.W, L = S.L;
const EN = { li: "Living", y: "Court", co: "Corridor", be: "Bedroom", ba: "Bathroom", ki: "Kitchen", ts: "Passage", pa: "Pantry", la: "Laundry",
             cl: "Storage", ci: "Hall", st: "Stair", te: "Terrace", ve: "Veranda", luft: "Open to sky" };
const VORLAGEN = [
  { id: "ab", titel: ["Typ Ab (Hof vorn)", "Type Ab (court at the front)"], brief: { t: 3, fam: "vorn", ctx: "a" }, force: { fam: "vorn", muster: "A", d1: 6, t: 3, m: false, ctx: "a", wli: 5.0, wst: 2.9 } },
  { id: "bb", titel: ["Typ Bb (Hof hinten)", "Type Bb (court at the back)"], brief: { t: 3, fam: "hinten", ctx: "a" }, force: { fam: "hinten", muster: "B", t: 3, m: false, ctx: "a" } },
  { id: "dn", titel: ["Duartes neues Haus", "Duarte's new house"], brief: { t: 3, fam: "hinten", ctx: "a" }, force: { fam: "hinten", muster: "NEW", t: 3, m: false, ctx: "a" } },
  { id: "t2", titel: ["Haus mit 2 Zimmern", "House with 2 bedrooms"], brief: { t: 2, fam: "vorn", ctx: "a" }, force: { t: 2, fam: "vorn", m: false, ctx: "a" } },
  { id: "t4", titel: ["Haus mit 4 Zimmern", "House with 4 bedrooms"], brief: { t: 4, fam: "hinten", ctx: "a" }, force: { t: 4, fam: "hinten", m: false, ctx: "a" } },
  { id: "t5", titel: ["Haus mit 5 Zimmern", "House with 5 bedrooms"], brief: { t: 5, fam: "any", ctx: "a" }, force: { t: 5, m: false, ctx: "a" } }
];
const rw = r => r.x1 - r.x0, rh = r => r.y1 - r.y0, ar = r => rw(r) * rh(r);
const beruehrt = (a, b) => {
  const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return (Math.abs(ox) < 1e-6 && oy > 1e-6) || (Math.abs(oy) < 1e-6 && ox > 1e-6);
};
/** Restfläche des Grundstücks ohne die gegebenen Rechtecke, als Rechtecke (Raster aus allen Kanten, Zeilen zusammenlegen) */
function rest(R) {
  const xs = [...new Set([0, W, ...R.flatMap(r => [r.x0, r.x1])])].sort((a, b) => a - b), ys = [...new Set([0, L, ...R.flatMap(r => [r.y0, r.y1])])].sort((a, b) => a - b);
  const frei = (x, y) => !R.some(r => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1);
  const balken = [];
  for (let j = 0; j + 1 < ys.length; j++) {
    const ym = (ys[j] + ys[j + 1]) / 2; let s = null;
    for (let i = 0; i + 1 <= xs.length; i++) {
      const f = i + 1 < xs.length && frei((xs[i] + xs[i + 1]) / 2, ym);
      if (f && s === null) s = i; if (!f && s !== null) { balken.push({ x0: xs[s], x1: xs[i], y0: ys[j], y1: ys[j + 1] }); s = null; }
    }
  }
  const T = [];
  for (const b of balken) { const v = T.find(t => t.x0 === b.x0 && t.x1 === b.x1 && Math.abs(t.y1 - b.y0) < 1e-9); if (v) v.y1 = b.y1; else T.push(Object.assign({}, b)); }
  return T.filter(t => ar(t) > 0.05);
}
/** Räume eines Geschosses: gleiche Funktion + Berührung = ein Raum (Union-Find), Hauptteil = Teil, der alle anderen berührt */
function raeumeAus(F) {
  const g = F.map((_, i) => i), wurzel = i => g[i] === i ? i : (g[i] = wurzel(g[i]));
  for (let i = 0; i < F.length; i++) for (let k = i + 1; k < F.length; k++)
    if (F[i].f === F[k].f && F[i].f !== "be" && beruehrt(F[i].r, F[k].r)) g[wurzel(k)] = wurzel(i);
  const gruppen = {};
  F.forEach((e, i) => (gruppen[wurzel(i)] = gruppen[wurzel(i)] || []).push(i));
  return Object.values(gruppen).map(idx => {
    let teile = idx.map(i => F[i].r);
    let h = teile.findIndex(t => teile.every(u => u === t || beruehrt(t, u))); if (h < 0) h = teile.indexOf(teile.slice().sort((a, b) => ar(b) - ar(a))[0]);
    teile = [teile[h], ...teile.filter((_, i) => i !== h)];
    return { f: F[idx[0]].f, idx, teile };
  });
}
function suche(v) {
  for (let s = 1; s < 4000; s++) { const H = S.generate(Object.assign({ offen: false, amb: true }, v.brief, { force: v.force }), s); if (H.ok) return H; }
  throw new Error(v.id + ": kein gültiges Haus");
}

const programme = {}, fassungen = {}, liste = [];
for (const v of VORLAGEN) {
  const H = suche(v);
  for (const fl of [1, 2]) {
    const F = (fl === 1 ? H.F1 : H.F2).filter(e => ar(e.r) > 0.05);
    const R = raeumeAus(F);
    const fest = [];
    if (fl === 2) {
      for (const r of R) if (r.f === "st") fest.push(r);
      for (const t of rest(F.map(e => e.r))) R.push({ f: "luft", idx: [], teile: [t], luft: true });
    }
    // Namen: Funktion, gleiche Funktionen nummeriert
    const zahl = {}, je = {};
    R.forEach(r => { zahl[r.f] = (zahl[r.f] || 0) + 1; });
    const raeume = R.map(r => {
      const n = zahl[r.f] > 1 ? " " + (je[r.f] = (je[r.f] || 0) + 1) : "";
      const de = (r.f === "luft" ? "Luftraum" : S.NAME[r.f] || r.f) + n, en = (EN[r.f] || r.f) + n;
      const A = r.teile.reduce((s, t) => s + ar(t), 0), kurz = Math.min(...r.teile.map(t => Math.min(rw(t), rh(t))));
      const fix = r.f === "st" || r.luft;
      // Anker je Teil: Breitensuche über Berührung ab dem Hauptteil (Ketten wie der Flur im OG)
      const anker = r.teile.map(() => null); anker[0] = -1;
      for (let schritt = 0; schritt < r.teile.length; schritt++) r.teile.forEach((t, k) => { if (anker[k] !== null) return; const j = r.teile.findIndex((u, q) => anker[q] !== null && beruehrt(t, u)); if (j >= 0) anker[k] = j; });
      anker.forEach((v, k) => { if (v === null) anker[k] = 0; });
      const opt = r.teile.length > 1 || fix ? Object.assign({}, r.teile.length > 1 ? { teile: r.teile.map(t => Math.round(ar(t) / A * 1000) / 1000), buendig: false, anker } : {}, fix ? { fest: true } : {}) : null;
      return { r, zeile: [de, en, Math.round(A * 1000) / 1000, Math.round(0.8 * kurz * 100) / 100, opt] };
    });
    // Nachbarschaften aus den Türen des Geschosses
    const gleich = (u, v) => Math.abs(u.x0 - v.x0) < 1e-6 && Math.abs(u.y0 - v.y0) < 1e-6 && Math.abs(u.x1 - v.x1) < 1e-6 && Math.abs(u.y1 - v.y1) < 1e-6;
    const raumVon = e => R.findIndex(r => r.idx.some(i => F[i] === e || (F[i] && e && F[i].f === e.f && gleich(F[i].r, e.r))));   // Türen verweisen auf Kopien
    const nb = new Set();
    for (const d of H.doors) {
      if (d.fl !== fl) continue;
      const innen = d.b && typeof d.b === "object";                      // Außentür: b ist die Zeichenkette "aussen"
      const a = raumVon(d.a), b = innen ? raumVon(d.b) : -1;
      if (a < 0 || (innen && b < 0) || a === b) continue;
      nb.add(b === -1 ? `${a},-1` : `${Math.min(a, b)},${Math.max(a, b)}`);
    }
    if (fl === 2) {                                                      // Treppe erschließt den Flur (bzw. den angrenzenden Raum)
      const st = R.findIndex(r => r.f === "st");
      if (st >= 0) for (let k = 0; k < R.length; k++) if (k !== st && R[k].f === "ci" && R[k].teile.some(t => R[st].teile.some(u => beruehrt(t, u)))) nb.add(`${Math.min(st, k)},${Math.max(st, k)}`);
    }
    const pid = `sz_${v.id}_${fl === 1 ? "eg" : "og"}`;
    programme[pid] = {
      titel: `${v.titel[0]} · ${fl === 1 ? "Erdgeschoss" : "Obergeschoss"}`, titel_en: `${v.titel[1]} · ${fl === 1 ? "ground floor" : "upper floor"}`,
      feld: { b: W, h: L, tuer: 0.8, tuerRand: 0 },                    // Türen der Grammatik 0,80 m; gemeinsame Wand mindestens so lang
      raeume: raeume.map(x => x.zeile),
      paare: [...nb].map(s => s.split(",").map(Number)),
      vorbild: raeume.map(x => x.r.teile.map(t => [t.x0, t.y0, t.x1, t.y1].map(q => Math.round(q * 1000) / 1000))),
      saat: H.seed, zimmer: H.g.t, hof: H.g.fam
    };
    fassungen[pid] = Object.assign({ programm: pid }, ABSTIMMUNG[pid] ? { starr: ABSTIMMUNG[pid].starr, federRunden: ABSTIMMUNG[pid].federRunden, belegung: ABSTIMMUNG[pid].belegung } : {});   // Voreinstellung aus werkzeuge/abstimmung.json
    liste.push(pid);
  }
}
const kopf = `/* Vorbilder Siza/Duarte für KREMLAS – erzeugt mit werkzeuge/vorbilder_siza.cjs (nicht von Hand bearbeiten).
   Quelle: Konzeptstudie Duarte/Siza (entwurfsforschung.de/lab/duarte-siza/), eigene Rekonstruktion der Formgrammatik von
   J. P. Duarte (2005): Towards the mass customization of housing: the grammar of Siza's houses at Malagueira.
   Environment and Planning B 32(3), 347–380, doi:10.1068/b31124. Keine Daten aus Duartes Korpus.
   Maße in Meter. Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
`;
const js = kopf + `(function (w) { const D = ${JSON.stringify({ programme, fassungen, liste })};\n  if (typeof module === "object" && module.exports) module.exports = D; else w.KREMLAS_VORBILDER = Object.assign(w.KREMLAS_VORBILDER || {}, { siza: D });\n})(typeof globalThis !== "undefined" ? globalThis : this);\n`;
fs.writeFileSync(path.join(__dirname, "..", "vorbilder_siza.js"), js);
for (const pid of liste) { const p = programme[pid], A = p.raeume.reduce((s, r) => s + r[2], 0);
  console.log(pid, "Saat " + p.saat, p.raeume.length + " Räume", "Fläche " + A.toFixed(2) + "/" + (W * L), "Paare " + p.paare.length, "fest " + p.raeume.filter(r => r[4] && r[4].fest).length, p.raeume.map(r => r[0]).join(", ")); }
