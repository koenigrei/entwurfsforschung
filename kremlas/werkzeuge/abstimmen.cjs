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
/* Schalter über mehrere Suchreihen (25.11.2026): auf den abgestimmten Voreinstellungen je Fassung Raumgruppe spiegeln (cluster 0 / 2 %)
   × Wände verschieben (wand aus/an), je Kombination vier Suchreihen (Saat 1, 51, 101, 151) zu höchstens 6 Läufen à 400 Generationen.
   node werkzeuge/abstimmen.cjs --schalter <Fassung,…> <Ausgabe.jsonl>
   node werkzeuge/abstimmen.cjs --schalter-zusammenfassen <Ausgabe.jsonl …>  → cluster/wand in abstimmung.json: an nur, wenn das Mittel
   der besten Ähnlichkeit über die vier Reihen um mindestens 2 Prozentpunkte steigt und nicht weniger Reihen einen Treffer haben. */
const SAATEN = [1, 51, 101, 151], KOMBI = [[0, false], [0.02, false], [0, true], [0.02, true]];
if (process.argv[2] === "--schalter-zusammenfassen") {
  const Z = process.argv.slice(3).flatMap(f => fs.readFileSync(f, "utf-8").split("\n").filter(Boolean).map(l => JSON.parse(l)));
  const A = JSON.parse(fs.readFileSync(ZIEL, "utf-8")), je = {};
  for (const e of Z) (je[e.f] = je[e.f] || []).push(e);
  for (const [f, E] of Object.entries(je)) {
    const basis = E.find(e => !e.cluster && !e.wand && (e.starr == null || e.starr === A[f].starr)); if (!basis || !A[f]) continue;
    let wahl = basis;
    const zahl = e => (e.cluster ? 1 : 0) + (e.wand ? 1 : 0) + (e.starr != null && e.starr !== A[f].starr ? 1 : 0);                // weniger Schalter gewinnen bei höchstens 1 Punkt Abstand
    const gut = E.filter(e => e !== basis && e.mittel >= basis.mittel + 0.02 && e.reihen >= basis.reihen).sort((a, b) => b.mittel - a.mittel);
    if (gut.length) { wahl = gut[0]; for (const e of gut) if (zahl(e) < zahl(wahl) && e.mittel >= gut[0].mittel - 0.01) wahl = e; }
    A[f].cluster = wahl.cluster; A[f].wand = wahl.wand; if (wahl.starr != null) A[f].starr = wahl.starr;
    A[f].reihen = { basis: Math.round(basis.mittel * 1000) / 1000, gewaehlt: Math.round(wahl.mittel * 1000) / 1000, treffer: wahl.reihen + "/" + SAATEN.length };
    console.log(f.padEnd(16), "Basis", (basis.mittel * 100).toFixed(1), "→", (wahl.mittel * 100).toFixed(1), "starr", A[f].starr, "cluster", wahl.cluster, "wand", wahl.wand);
  }
  fs.writeFileSync(ZIEL, JSON.stringify(A, null, 1) + "\n");
  process.exit(0);
}
if (process.argv[2] === "--schalter") {
  for (const D of ["../vorbilder_palladio.js", "../vorbilder_siza.js"]) M.registriere(require(D));
  const aus = process.argv[4] || path.join(__dirname, "schalter_roh.jsonl"), umgekehrt = process.argv[5] === "umgekehrt";   // umgekehrt: starre Raumform andersherum als voreingestellt
  for (const f of process.argv[3].split(",")) for (const [cluster, wand] of KOMBI) {
    const starr = umgekehrt ? !M.FASSUNGEN[f].starr : !!M.FASSUNGEN[f].starr;
    const p = Object.assign({}, M.STANDARD, ...M.REGLER.map(k => ({ [k]: M.FASSUNGEN[f][k] })), { fassung: f, cluster, wand, starr });
    const reihen = SAATEN.map(saat => {
      const t0 = Date.now(), S = M.sucheNeu(p, Zf.zufall, { anzahl: 1, ziel: 3, saat, laeufe: 6, generationen: 400 });
      while (!S.fertig) M.sucheWeiter(S, 400);
      const A = S.treffer.map(t => M.aehnlichkeit(t.ind, t.programm)).filter(Boolean).map(a => a.mittel);
      return { saat, treffer: S.treffer.length, laeufe: S.laeufe, best: A.length ? Math.max(...A) : (S.treffer.length ? 1 : 0), s: (Date.now() - t0) / 1000 };
    });
    const r = { f, starr, cluster, wand, mittel: reihen.reduce((a, q) => a + q.best, 0) / reihen.length, reihen: reihen.filter(q => q.treffer).length,
                treffer: reihen.reduce((a, q) => a + q.treffer, 0), laeufe: reihen.reduce((a, q) => a + q.laeufe, 0), s: reihen.reduce((a, q) => a + q.s, 0), je: reihen };
    fs.appendFileSync(aus, JSON.stringify(r) + "\n");
  }
  process.exit(0);
}
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
