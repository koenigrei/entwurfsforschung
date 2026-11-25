// KREMLAS · Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0
// Inselmodell für die Haussuche (Test, 25.11.2026): K Inseln laufen im Gleichschritt, jede mit eigener Saatfolge (R Läufe),
// alle `intervall` Generationen wandert der beste Elter jeder Insel in die nächste (Ring) und ersetzt dort den schlechtesten.
// Aufruf (im Ordner werkzeuge): node inseln.cjs <Haus> <Ausgabe> <unabh|ring|mix|mixunabh> <Basissaat> [R=6] [K=4] [intervall=25]
const M = require("../modell.js"), Z = require("../../simulationen/_gemeinsam/zufall.js");
M.registriere(require("../vorbilder_siza.js"));
const [f, aus, art, basisS] = process.argv.slice(2, 6), R = +(process.argv[6] || 6), K = +(process.argv[7] || 4), IV = +(process.argv[8] || 25);
const basis = Object.assign({}, M.STANDARD, ...M.REGLER.map(k => ({ [k]: M.FASSUNGEN[f][k] })), { fassung: f });
const mix = art === "mix" || art === "mixunabh", wandern = art === "ring" || art === "mix";
// gemischte Strategien: Voreinstellung, starre Raumform umgedreht, Wände verschieben umgedreht, beides umgedreht
const varianten = [{}, { starr: !basis.starr }, { wand: !basis.wand }, { starr: !basis.starr, wand: !basis.wand }];
const S = [...Array(K)].map((_, k) => M.sucheNeu(Object.assign({}, basis, mix ? varianten[k % 4] : {}), Z.zufall,
  { anzahl: 50, saat: +basisS + k * R, laeufe: R, generationen: 400 }));
const t0 = Date.now(); let schritt = 0, wanderungen = 0;
const egPhase = s => s.lauf && !s.lauf.og && s.lauf.z && s.lauf.z.t > 0;
while (S.some(s => !s.fertig)) {
  for (const s of S) if (!s.fertig) M.sucheWeiter(s, 1);
  schritt++;
  if (wandern && schritt % IV === 0) {
    const beste = S.map(s => egPhase(s) ? M.kopie(s.lauf.z.eltern.reduce((a, b) => (b.f3 < a.f3 ? b : a))) : null);
    S.forEach((s, k) => {
      const m = beste[(k + K - 1) % K]; if (!m || !egPhase(s)) return;
      const E = s.lauf.z.eltern; let wi = 0; E.forEach((e, i) => { if (e.f3 > E[wi].f3) wi = i; });
      if (m.f3 < E[wi].f3) { E[wi] = m; wanderungen++; }
    });
  }
}
// Treffer aller Inseln zusammen, fast gleiche Pläne (auch über Inseln hinweg) nur einmal
const alle = [];
for (const s of S) for (const t of s.treffer) if (!alle.some(u => M.planAbstand(u.plan, t.plan) < 0.3)) alle.push(t);
const A = alle.map(t => ((M.aehnlichkeit(t.ind, t.programm).mittel + (t.og ? M.aehnlichkeit(t.og.ind, t.og.programm).mittel : 0)) / 2).toFixed(2));
require("fs").appendFileSync(aus, JSON.stringify({ f, art, saat: +basisS, K, R, IV, laeufe: S.reduce((a, s) => a + s.laeufe, 0), haeuser: alle.length,
  roh: S.map(s => s.treffer.length), A, wanderungen, s: Math.round((Date.now() - t0) / 1000) }) + "\n");
