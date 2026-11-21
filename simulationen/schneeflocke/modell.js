/* Schneeflocken-Wachstum · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 32_snowFlake (Delphi 2005, Reinhard König, Projekt ZA_snowFlakeGrowth, Unit CellForm.pas, 07.03.2006),
   nach dem lokalen zellulären Modell für Schneekristalle von Clifford A. Reiter (2005).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (TForm1.Timer1Timer → equiPot, dev_Cell):
     1. receptive / nonreceptive: Eine Zelle ist „receptive“, wenn sie entwickelt ist oder eine entwickelte Zelle in ihrer
        Moore-Nachbarschaft hat. Dann P_rec = P, P_nonRec = 0, sonst P_rec = 0, P_nonRec = P.
     2. Diffusion nur des nichtrezeptiven Teils: P_nonRec(t+1) = P_nonRec(t) + Σ w_k (P_k,nonRec(t) − P_i,nonRec(t)), für alle
        Zellen gleichzeitig (auch die rezeptiven bekommen so Zufluss von außen); Gewichte w_k summieren sich zu 1.
     3. Rezeptive Zellen erhalten den konstanten Zuwachs γ (nur wenn P_rec > 0): P_rec = P_rec + γ.
     4. P = P_rec + P_nonRec; P ≥ 1 → entwickelt (D = 1).
   Das Original wiederholt equiPot fünfmal je Schritt, setzt aber jedes Mal P_rec/P_nonRec neu aus dem unveränderten P –
   die fünf Durchgänge sind gleich, wirksam ist einer. Das bleibt so (es bestimmt die Wachstumsgeschwindigkeit).
   Gewichte im Programm: orthogonale Nachbarn 1/12, diagonale 1/6 (ergibt die X-förmigen Kristalle der alten Seite);
   die Beschreibung auf der Seite nennt es umgekehrt (orthogonal 1/6, diagonal 1/12) – wählbar über „Gewichte“.
   Feld: ZeichenPanel 404 × 404 px, cellScal 4 → 101 × 101 Zellen, Torus, Saat in Zelle (50, 50). Kein Zufall. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const S = 101, MITTE = 50;

  /** Voreinstellungen wie im Original (CellForm.dfm: E_beta 0,3, E_gamma 0,002; Halt bei 500 Schritten) */
  const STANDARD = { beta: 0.3, gamma: 0.002, gewichte: "programm", verlauf: true };
  const HALT = 500;
  /** [orthogonal, diagonal] */
  const GEWICHTE = { programm: [1 / 12, 1 / 6], beschreibung: [1 / 6, 1 / 12] };

  /** Moore-Nachbarn je Zelle in der Reihenfolge von checkPot: 4 orthogonale, dann 4 diagonale, Torus */
  const NB = new Int32Array(8 * S * S);
  const D8 = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, -1], [-1, 1]];   // [dK, dI]
  for (let i = 0; i < S; i++) for (let k = 0; k < S; k++)
    D8.forEach(([dk, di], v) => { NB[8 * (i * S + k) + v] = ((i + di + S) % S) * S + (k + dk + S) % S; });

  /** setupCells: alle Zellen P = β, D = 0; Saat in der Mitte mit P = 1, D = 1 */
  function erzeuge(param) {
    const p = Object.assign({}, STANDARD, param), N = S * S;
    const z = { t: 0, S, breite: S, hoehe: S, state: new Uint8Array(N), pot: new Float64Array(N).fill(p.beta),
                rec: new Float64Array(N), non: new Float64Array(N), limbo: new Float64Array(N), anzahl: 1, verlauf: [1] };
    const c = MITTE * S + MITTE; z.state[c] = 1; z.pot[c] = 1;
    return z;
  }

  /** Regel 1: rezeptiv, wenn entwickelt oder eine entwickelte Zelle in der Moore-Nachbarschaft (checkNei: sumState > 0) */
  function rezeptiv(z, n) {
    const s = z.state; if (s[n]) return true;
    for (let v = 0; v < 8; v++) if (s[NB[8 * n + v]]) return true;
    return false;
  }

  /** equiPot (ein wirksamer Durchgang): Aufteilung, Diffusion von P_nonRec, Zuwachs γ */
  function ausgleich(z, p) {
    const { pot, rec, non, limbo } = z, N = pot.length, [wo, wd] = GEWICHTE[p.gewichte] || GEWICHTE.programm;
    for (let n = 0; n < N; n++) { if (rezeptiv(z, n)) { non[n] = 0; rec[n] = pot[n]; } else { non[n] = pot[n]; rec[n] = 0; } }
    for (let n = 0; n < N; n++) {
      const a = non[n], b = 8 * n; let l = 0;
      for (let v = 0; v < 4; v++) l += wo * (non[NB[b + v]] - a);
      for (let v = 4; v < 8; v++) l += wd * (non[NB[b + v]] - a);
      limbo[n] = l;
    }
    for (let n = 0; n < N; n++) { non[n] += limbo[n]; if (rec[n] > 0) rec[n] += p.gamma; }
  }

  /** dev_Cell: P = P_rec + P_nonRec; P ≥ 1 → entwickelt. Gibt die Zahl der neuen Zellen zurück. */
  function entwickle(z) {
    const { pot, rec, non, state } = z; let neu = 0;
    for (let n = 0; n < pot.length; n++) { pot[n] = non[n] + rec[n]; if (pot[n] >= 1 && !state[n]) { state[n] = 1; neu++; } }
    return neu;
  }

  /** Ein Schritt (Timer1Timer): equiPot, dev_Cell, Zählen (paint_Field/plot) */
  function schritt(z, p) {
    ausgleich(z, p);
    z.anzahl += entwickle(z);
    z.verlauf.push(z.anzahl);
    z.t++;
    return z;
  }

  /** Grauwert des Originals 0…255 (paint_Field): entwickelt 255 − 25 · P (weiß), sonst 125 · P */
  function grau(z, n) {
    const g = z.state[n] ? 255 - Math.round(25 * z.pot[n]) : Math.round(125 * z.pot[n]);
    return g < 0 ? 0 : g > 255 ? 255 : g;
  }

  /** Kennzahlen (neu): Ausdehnung längs der Diagonalen und längs der Achsen (entwickelte Zellen in Folge ab der Mitte)
      und Symmetrie (Anteil der Zellen, die beim Drehen um 90° und Spiegeln gleich bleiben) */
  function auswertung(z) {
    const s = z.state, at = (k, i) => s[((i + S) % S) * S + (k + S) % S];
    let achse = 0, diag = 0;
    while (achse < MITTE && at(MITTE + achse + 1, MITTE)) achse++;
    while (diag < MITTE && at(MITTE + diag + 1, MITTE + diag + 1)) diag++;
    let gleich = 0;
    for (let i = 0; i < S; i++) for (let k = 0; k < S; k++) {
      const v = s[i * S + k];
      if (v === s[k * S + (S - 1 - i)] && v === s[i * S + (S - 1 - k)] && v === s[k * S + i]) gleich++;
    }
    return { achse, diagonale: diag, symmetrie: gleich / (S * S) };
  }

  /** γ und die Gewichte wirken im nächsten Schritt; β nur beim Neustart (setupCells) */
  function aendere() {}

  return { STANDARD, HALT, GEWICHTE, S, MITTE, NB, erzeuge, rezeptiv, ausgleich, entwickle, schritt, grau, auswertung, aendere };
});
