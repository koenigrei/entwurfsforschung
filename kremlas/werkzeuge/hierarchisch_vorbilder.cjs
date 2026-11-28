/* Versuch 5 (28.11.2026): Verbessert die hierarchische Strategie der Grammatik (grammatik.js) die Rekonstruktion der Vorbilder
   Palladio und Duarte/Siza? Gleiche Saaten, gleiches Zeitbudget je Fassung, Voreinstellungen der App (abstimmung.json über die Fassung).
   Aufruf (im Ordner kremlas/):
     node werkzeuge/hierarchisch_vorbilder.cjs <Fassung,…> <ausgabe.jsonl> --modus basis|hierarchisch [--sekunden 60] [--saaten 1,2,3,4,5] [--symzonen]
   basis         Lösungssuche wie in der App (sucheNeu/sucheWeiter, Ziel 3 Treffer, Läufe zu 400 Generationen) bis Ziel oder Budget
   hierarchisch  Zonierung (G.zonierungen), KREMLAS packt je Zone (ohne Vorbild), Zusammensetzen, Flächenausgleich, Nachbessern; ist der
                 Plan nicht gültig, verfeinert die dichte Packung das ganze Programm (Hälfte der Eltern startet im zusammengesetzten Plan,
                 Nähe zum Vorbild wie in der App) – wie Versuch 4 (Planungsgrundlagen/Grundrisse/sammlung/kremlas_test/versuch4.cjs)
   --fest        feste Räume: das Band meidet sie, ohne Eingang (−1) beginnt es am festen Raum an der Erschließung (Treppe)
   --symzonen    mit Spiegelachse: Zonierung symmetrisch (G.zonierungen o.sym), die Zone rechts der Achse wird aus der linken gespiegelt
   Ausgabe je Fassung und Saat: gültig, Treffer, Zeit bis zum ersten gültigen Plan, beste Ähnlichkeit (aehnlichkeit) eines gültigen Plans.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 28.11.2026 · CC BY 4.0 */
"use strict";
const fs = require("fs"), path = require("path");
const M = require("../modell.js"), G = require("../grammatik.js"), Zf = require("../../simulationen/_gemeinsam/zufall.js");
for (const D of ["../vorbilder_palladio.js", "../vorbilder_siza.js"]) M.registriere(require(D));
M.setzeGrammatik(G);
const argv = process.argv.slice(2), wert = k => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null), flag = k => argv.includes(k);
const liste = argv[0].split(","), aus = argv[1], MODUS = wert("--modus") || "basis", BUDGET = (+(wert("--sekunden") || 60)) * 1000;
const SAATEN = (wert("--saaten") || "1,2,3,4,5").split(",").map(Number), SYMZ = flag("--symzonen"), FEST = flag("--fest");
const progVon = f => M.FASSUNGEN[f].programm || f;
const paramVon = (f, extra) => Object.assign({}, M.STANDARD, ...M.REGLER.map(k => ({ [k]: M.FASSUNGEN[f][k] })), { fassung: f }, extra || {});
const aehnlich = (ind, f) => { const a = M.aehnlichkeit(ind, progVon(f)); return a ? a.mittel : 0; };

function basis(f, saat) {
  const p = paramVon(f), t0 = Date.now();
  const S = M.sucheNeu(p, Zf.zufall, { anzahl: 1, ziel: 3, saat, laeufe: 100000, generationen: 400 });
  let tErster = null;
  while (!S.fertig && Date.now() - t0 < BUDGET) { M.sucheWeiter(S, 25); if (tErster == null && S.treffer.length) tErster = (Date.now() - t0) / 1000; }
  M.erzeuge(p, Zf.zufall(1));
  const A = S.treffer.map(t => aehnlich(t.ind, f));
  return { treffer: S.treffer.length, t_erster: tErster, best: A.length ? Math.max(...A) : null, laeufe: S.laeufe };
}

function hierarchisch(f, saat) {
  const prog = M.PROGRAMME[progVon(f)], pF = paramVon(f), t0 = Date.now();
  const zons = G.zonierungen(prog, { anzahl: 12, saaten: 6, saat, sym: SYMZ && !!prog.symmetrie, festMeiden: FEST, festEingang: FEST });
  const treffer = [], stat = { zonierungen: zons.length, versucht: 0, zonen: 0, zonen_gueltig: 0, direkt: 0, verfeinert: 0, verfeinert_gueltig: 0 };
  const reglerF = {}; for (const k of M.REGLER) if (M.FASSUNGEN[f][k] != null) reglerF[k] = M.FASSUNGEN[f][k];
  let tErster = null, runde = 0; const cache = new Map();
  while (zons.length && Date.now() - t0 < BUDGET && treffer.length < 3) {
    const zi = runde % zons.length, zon = zons[zi], wdh = Math.floor(runde / zons.length); runde++; stat.versucht++;
    const teile = [];
    for (let j = 0; j < zon.zonen.length; j++) {
      if (zon.zonen[j].spiegelVon != null) { teile.push(null); continue; }  // gespiegelte Zone: nach dem Lösen der linken
      const key = f + "~" + saat + "~" + zi + "~" + j;
      let tp = cache.get(key);
      if (!tp) { tp = G.teilprogramm(prog, zon, j); cache.set(key, tp); M.registriere({ programme: { [key]: tp.prog }, fassungen: { [key]: Object.assign({ programm: key }, reglerF) } }); }
      const rest = BUDGET - (Date.now() - t0); if (rest <= 0) break;
      stat.zonen++;
      const sp = Object.assign({}, M.STANDARD, ...M.REGLER.map(k => ({ [k]: M.FASSUNGEN[key][k] })), { fassung: key, naehe: 0, dreh90: false, starr: false });
      const S = M.sucheNeu(sp, Zf.zufall, { anzahl: 1, ziel: 1, saat: 1 + 997 * wdh + saat * 7, laeufe: 100000, generationen: 300 });
      const tz = Date.now(), zb = Math.min(rest, 2500 + 1500 * tp.prog.raeume.length);
      let bI = null, bF = Infinity;
      while (!S.fertig && Date.now() - tz < zb) { M.sucheWeiter(S, 25); if (S.lauf && S.lauf.z) for (const e of S.lauf.z.eltern) if (e.f3 != null && e.f3 < bF) { bF = e.f3; bI = M.kopie(e); } }
      const ind = S.treffer.length ? S.treffer[0].ind : bI;
      if (S.treffer.length) stat.zonen_gueltig++;
      if (!ind) { teile.push(null); continue; }
      M.setzeFeld(tp.prog.feld);
      const k = M.PX_M;
      teile.push({ abbild: tp.abbild, ursprung: tp.ursprung, rechtecke: ind.g.map(g => { const q = M.rechteck(g); return { r: g.r, id: g.id, an: g.an, bd: g.bd, x1: q.x1 / k, y1: q.y1 / k, x2: q.x2 / k, y2: q.y2 / k }; }) });
    }
    if (SYMZ) G.spiegleTeile(prog, zon, teile);
    const zF = M.erzeuge(pF, Zf.zufall(1));
    let I = G.zusammensetzen(M, prog, zon, teile); M.fixiere(I, zF.fest);
    if (zF.sym) M.symmetrisiere(I, zF.sym, -1);
    let w = M.planPruefung(I, prog.paare, progVon(f));
    if (!w.gueltig) { const r = M.flaecheAusgleichen(I, prog.paare, progVon(f), 25); if (r.wert.f3 < w.f3) { I = r.ind; w = r.wert; } }
    if (!w.gueltig && Date.now() - t0 < BUDGET) { const r = M.nachbessern(I, prog.paare, progVon(f), Zf.zufall(runde), 150, zF.sym, zF.fest, zF.starr); if (r.wert.f3 < w.f3) { I = r.ind; w = r.wert; } }
    if (w.gueltig) stat.direkt++;
    // Verfeinern auch bei gültigem Plan: die Rekonstruktion sucht den ähnlichsten gültigen Plan (wie die App mit Nähe > 0)
    if (Date.now() - t0 < BUDGET) {
      const k = M.PX_M, fall = [];
      for (const g of I.g.slice().sort((a, b) => (b.id === b.r) - (a.id === a.r))) { const q = M.rechteck(g); (fall[g.r] = fall[g.r] || []).push([q.x1 / k, q.y1 / k, q.x2 / k, q.y2 / k]); }
      const S2 = M.sucheNeu(Object.assign({}, pF, { impfung: { faelle: [fall], anteil: 0.5, streuung: 0.1 } }), Zf.zufall, { anzahl: 1, ziel: 1, saat: 5000 + runde + 100 * saat, laeufe: 100000, generationen: 300 });
      const tv = Date.now(), vb = Math.min(BUDGET - (Date.now() - t0), 20000);
      while (!S2.fertig && Date.now() - tv < vb) M.sucheWeiter(S2, 25);
      stat.verfeinert++;
      M.erzeuge(pF, Zf.zufall(1));
      if (S2.treffer.length) { stat.verfeinert_gueltig++; const J = S2.treffer[0].ind; if (!w.gueltig || aehnlich(J, f) > aehnlich(I, f)) { I = J; w = M.planPruefung(I, prog.paare, progVon(f)); } }
    }
    if (w.gueltig) {
      const plan = M.grundriss(I, 300, M.TEILE_PX);
      if (!treffer.some(t => M.planAbstand(t.plan, plan) < 0.3)) treffer.push({ ind: I, plan });
      if (tErster == null) tErster = (Date.now() - t0) / 1000;
    }
  }
  M.erzeuge(pF, Zf.zufall(1));
  const A = treffer.map(t => aehnlich(t.ind, f));
  return { treffer: treffer.length, t_erster: tErster, best: A.length ? Math.max(...A) : null, laeufe: runde, stat };
}

for (const f of liste) for (const saat of SAATEN) {
  const t0 = Date.now();
  const r = MODUS === "hierarchisch" ? hierarchisch(f, saat) : basis(f, saat);
  fs.appendFileSync(aus, JSON.stringify(Object.assign({ f, saat, modus: MODUS + (SYMZ ? "+sym" : "") + (FEST ? "+fest" : ""), sekunden: BUDGET / 1000, s: +((Date.now() - t0) / 1000).toFixed(1),
    gueltig: r.treffer > 0 }, r, { t_erster: r.t_erster == null ? null : +r.t_erster.toFixed(1), best: r.best == null ? null : +r.best.toFixed(3) })) + "\n");
}
