/* Versuch 6 (28.11.2026): Verbessert die verschachtelte dichte Packung (verschachtelt.js) die Rekonstruktion der Vorbilder Palladio und
   Duarte/Siza? Gleiche Saaten, gleiches Zeitbudget je Fassung, Voreinstellungen der App – vergleichbar mit Versuch 5
   (werkzeuge/hierarchisch_vorbilder.cjs --modus basis).
   Aufruf (im Ordner kremlas/):
     node werkzeuge/verschachtelt_vorbilder.cjs <Fassung,…> <ausgabe.jsonl> [--sekunden 60] [--saaten 1,2,3,4,5] [--naehe 1]
          [--verfeinern 20] [--verfahren graph,eigenschaft] [--auch-gueltig]
   --verfeinern 0   ohne Verfeinerung des Gesamtplans (nur die Verschachtelung selbst)
   --auch-gueltig   auch gültige zusammengesetzte Pläne verfeinern (Rekonstruktion: ähnlichster gültiger Plan, wie die App mit Nähe > 0)
   --naehe 0        ohne Zug zum Vorbild (wie bei einer künftigen Aufgabe)
   --basis          Vergleich: Lösungssuche wie in der App (wie hierarchisch_vorbilder.cjs --modus basis), z. B. mit --naehe 0
   Ausgabe je Fassung und Saat: gültig, Treffer, Zeit bis zum ersten gültigen Plan (gesamt und direkt aus der Verschachtelung), beste
   Ähnlichkeit (aehnlichkeit) eines gültigen Plans, Statistik der Ebenen, Gruppen und Plan des besten Treffers.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 28.11.2026 · CC BY 4.0 */
"use strict";
const fs = require("fs");
const M = require("../modell.js"), V = require("../verschachtelt.js"), Zf = require("../../simulationen/_gemeinsam/zufall.js");
for (const D of ["../vorbilder_palladio.js", "../vorbilder_siza.js"]) M.registriere(require(D));
const argv = process.argv.slice(2), wert = k => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null), flag = k => argv.includes(k);
const liste = argv[0].split(","), aus = argv[1], BUDGET = (+(wert("--sekunden") || 60)) * 1000;
const SAATEN = (wert("--saaten") || "1,2,3,4,5").split(",").map(Number), NAEHE = wert("--naehe") == null ? null : +wert("--naehe");
const VERF = wert("--verfeinern") == null ? 20 : +wert("--verfeinern"), VERFAHREN = wert("--verfahren") ? wert("--verfahren").split(",") : null;
const progVon = f => M.FASSUNGEN[f].programm || f;
const paramVon = (f, extra) => Object.assign({}, M.STANDARD, ...M.REGLER.map(k => ({ [k]: M.FASSUNGEN[f][k] })), { fassung: f }, NAEHE != null ? { naehe: NAEHE } : {}, extra || {});
const aehnlich = (ind, f) => { const a = M.aehnlichkeit(ind, progVon(f)); return a ? a.mittel : 0; };

function basis(f, saat) {
  const p = paramVon(f), t0 = Date.now();
  const S = M.sucheNeu(p, Zf.zufall, { anzahl: 1, ziel: 3, saat, laeufe: 100000, generationen: 400 });
  let tErster = null;
  while (!S.fertig && Date.now() - t0 < BUDGET) { M.sucheWeiter(S, 25); if (tErster == null && S.treffer.length) tErster = (Date.now() - t0) / 1000; }
  M.erzeuge(p, Zf.zufall(1));
  const A = S.treffer.map(t => aehnlich(t.ind, f));
  return { f, saat, modus: "basis" + (NAEHE === 0 ? "-n0" : ""), sekunden: BUDGET / 1000, s: +((Date.now() - t0) / 1000).toFixed(1), gueltig: S.treffer.length > 0, treffer: S.treffer.length,
    t_erster: tErster == null ? null : +tErster.toFixed(1), best: A.length ? +Math.max(...A).toFixed(3) : null, laeufe: S.laeufe };
}

for (const f of liste) for (const saat of SAATEN) {
  if (flag("--basis")) { const z = basis(f, saat); fs.appendFileSync(aus, JSON.stringify(z) + "\n"); console.log(f, saat, z.treffer, z.best); continue; }
  const t0 = Date.now(), naehe = NAEHE != null ? NAEHE : M.FASSUNGEN[f].naehe || 0;
  const r = V.loese(M, f, { budget: BUDGET, saat, param: paramVon, zufall: Zf.zufall, naehe, verfeinern: VERF, verfeinernAuchGueltig: flag("--auch-gueltig"), verfahren: VERFAHREN });
  const A = r.treffer.map(t => aehnlich(t.ind, f)), bi = A.length ? A.indexOf(Math.max(...A)) : -1, T = bi >= 0 ? r.treffer[bi] : null;
  const k = M.PX_M, plan = T ? T.plan.map(q => ({ r: q.r, x1: +(q.x1 / k).toFixed(3), y1: +(q.y1 / k).toFixed(3), x2: +(q.x2 / k).toFixed(3), y2: +(q.y2 / k).toFixed(3), z: !!q.zusatz })) : null;
  fs.appendFileSync(aus, JSON.stringify({ f, saat, modus: "verschachtelt" + (VERF ? "" : "-ohneVerf") + (NAEHE === 0 ? "-n0" : "") + (VERFAHREN ? "-" + VERFAHREN.join("+") : ""),
    sekunden: BUDGET / 1000, s: +((Date.now() - t0) / 1000).toFixed(1), gueltig: r.treffer.length > 0, treffer: r.treffer.length,
    t_erster: r.tErster == null ? null : +r.tErster.toFixed(1), t_direkt: r.tErsterDirekt == null ? null : +r.tErsterDirekt.toFixed(1),
    best: A.length ? +Math.max(...A).toFixed(3) : null, laeufe: r.runden, stat: r.stat,
    quellen: r.treffer.map(t => t.quelle), verfahren: T ? T.verfahren : null, gplan: T ? T.gplan : null, plan }) + "\n");
  console.log(f, saat, r.treffer.length, A.length ? Math.max(...A).toFixed(3) : "-", JSON.stringify(r.stat));
}
