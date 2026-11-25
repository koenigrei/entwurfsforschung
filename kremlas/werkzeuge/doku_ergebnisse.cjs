/* Ergebnisse für die Dokumentation: je Vorbild eine Rekonstruktion (Nähe 1) und eine freie Variante (Nähe 0) mit den abgestimmten
   Voreinstellungen, je vier Suchreihen (Saat 1, 51, 101, 151) zu höchstens 6 Läufen à 400 Generationen. Gespeichert werden die
   Planrechtecke des besten Treffers (in m) und die Messwerte. Aufruf (im Ordner kremlas/): node werkzeuge/doku_ergebnisse.cjs <Fassung> <Ausgabe.jsonl>
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 24.11.2026 · CC BY 4.0 */
"use strict";
const fs = require("fs");
const M = require("../modell.js"), Z = require("../../simulationen/_gemeinsam/zufall.js");
for (const D of ["../vorbilder_palladio.js", "../vorbilder_siza.js"]) M.registriere(require(D));
const f = process.argv[2], aus = process.argv[3], erg = { f, titel: M.PROGRAMME[M.FASSUNGEN[f].programm].titel, modi: {} };
for (const naehe of [1, 0]) {
  const reihen = []; let bester = null;
  for (const saat of [1, 51, 101, 151]) {
    const p = Object.assign({}, M.STANDARD, ...M.REGLER.map(k => ({ [k]: M.FASSUNGEN[f][k] })), { fassung: f, naehe });
    const t0 = Date.now(), S = M.sucheNeu(p, Z.zufall, { anzahl: 1, ziel: 3, saat, laeufe: 6, generationen: 400 });
    while (!S.fertig) M.sucheWeiter(S, 400);
    const A = S.treffer.map(t => ({ t, a: M.aehnlichkeit(t.ind, t.programm) }));
    const b = A.sort((x, y) => y.a.mittel - x.a.mittel)[0];
    reihen.push({ saat, treffer: S.treffer.length, laeufe: S.laeufe, best: b ? b.a.mittel : 0, s: (Date.now() - t0) / 1000 });
    if (b && (!bester || b.a.mittel > bester.a.mittel)) {
      const R = M.grundriss(b.t.ind, 300, M.TEILE_PX), k = M.PX_M;
      bester = { a: b.a, saat, t: b.t.t, plan: R.map(q => [q.r, +(q.x1 / k).toFixed(3), +(q.y1 / k).toFixed(3), +(q.x2 / k).toFixed(3), +(q.y2 / k).toFixed(3)]),
                 tueren: M.tueren(R, b.t.paare, M.TUER_PX).length, paare: b.t.paare.length, gueltig: b.t.wert.gueltig };
    }
  }
  erg.modi[naehe] = { reihen, bester: bester && { aehnlichkeit: bester.a.mittel, je: bester.a.je, gespiegelt: bester.a.gespiegelt, saat: bester.saat, generation: bester.t, plan: bester.plan, tueren: bester.tueren, paare: bester.paare } };
}
fs.appendFileSync(aus, JSON.stringify(erg) + "\n");
