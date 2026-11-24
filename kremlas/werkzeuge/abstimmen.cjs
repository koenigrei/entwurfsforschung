/* Abstimmung der Vorbilder: sucht je Vorbild die Einstellungen des evolutionären Grundrissgenerators, mit denen die Rekonstruktion
   (Nähe zum Vorbild 1) am besten gelingt, und schreibt sie nach werkzeuge/abstimmung.json. Die Übersetzer
   (vorbilder_palladio.cjs, vorbilder_siza.cjs) übernehmen sie als Voreinstellung der jeweiligen Fassung.
   Aufruf (im Ordner kremlas/):  node werkzeuge/abstimmen.cjs [Fassung,Fassung,…] [Ausgabe.jsonl]
   ohne Angaben: alle Vorbilder nacheinander; mit Ausgabe: Zeilen anhängen (zum Verteilen auf mehrere Prozesse), danach
   node werkzeuge/abstimmen.cjs --zusammenfassen <Ausgabe.jsonl …> → abstimmung.json.
   Gitter: starre Raumform (aus/an) × Federrunden (2, 5, 10) × Belegung (94, 96, 98 %); je Kombination höchstens 8 Läufe zu
   400 Generationen ab Saat 1. Maß: beste Ähnlichkeit eines gültigen Plans; bei Gleichstand mehr Treffer, dann weniger Zeit.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 24.11.2026 · CC BY 4.0 */
"use strict";
const fs = require("fs"), path = require("path");
const ZIEL = path.join(__dirname, "abstimmung.json");
if (process.argv[2] === "--zusammenfassen") {
  const Z = process.argv.slice(3).flatMap(f => fs.readFileSync(f, "utf-8").split("\n").filter(Boolean).map(l => JSON.parse(l)));
  const best = {};
  for (const e of Z) {
    const b = best[e.f], besser = !b || e.best > b.best + 1e-9 || (Math.abs(e.best - b.best) < 1e-9 && (e.treffer > b.treffer || (e.treffer === b.treffer && e.s < b.s)));
    if (besser) best[e.f] = e;
  }
  const out = {};
  for (const [f, e] of Object.entries(best).sort()) out[f] = { starr: e.starr, federRunden: e.federRunden, belegung: e.belegung, aehnlichkeit: Math.round(e.best * 1000) / 1000, treffer: e.treffer, laeufe: e.laeufe };
  fs.writeFileSync(ZIEL, JSON.stringify(out, null, 1) + "\n");
  console.log(Object.keys(out).length + " Vorbilder → " + ZIEL);
  process.exit(0);
}
const M = require("../modell.js"), Zf = require("../../simulationen/_gemeinsam/zufall.js");
for (const D of ["../vorbilder_palladio.js", "../vorbilder_siza.js"]) M.registriere(require(D));
const liste = process.argv[2] ? process.argv[2].split(",") : Object.keys(M.FASSUNGEN).filter(f => /^(pal|sz)_/.test(f));
const aus = process.argv[3] || path.join(__dirname, "abstimmung_roh.jsonl");
for (const f of liste) for (const starr of [false, true]) for (const federRunden of [2, 5, 10]) for (const belegung of [0.94, 0.96, 0.98]) {
  const q = { starr, federRunden, belegung, naehe: 1 };
  const p = Object.assign({}, M.STANDARD, ...M.REGLER.map(k => ({ [k]: M.FASSUNGEN[f][k] })), { fassung: f }, q);
  const t0 = Date.now(), S = M.sucheNeu(p, Zf.zufall, { anzahl: 1, ziel: 3, saat: 1, laeufe: 8, generationen: 400 });
  while (!S.fertig) M.sucheWeiter(S, 400);
  const A = S.treffer.map(t => M.aehnlichkeit(t.ind, t.programm).mittel);
  fs.appendFileSync(aus, JSON.stringify({ f, ...q, treffer: S.treffer.length, laeufe: S.laeufe, best: A.length ? Math.max(...A) : 0, s: (Date.now() - t0) / 1000 }) + "\n");
}
