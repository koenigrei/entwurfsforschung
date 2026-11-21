# Quelle · Entropiemessung

| | |
|---|---|
| Originalprogramm | `27_entropyMeasure` „1D CA with entropy measurement“ (Projekt `ZA02_1D.dpr`, Units `CellForm.pas`/`.dfm`, `cell_P.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Datum | 08.02.2006 (neueste Quelltextdatei im ZIP: `CellForm.pas`/`.dfm`); alte Seite: „Source - 060301“ |
| Vorbild | A. W. Hübler (2002): *Statistical Properties of Cellular Automata*, Tutorial UCS 2002 |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi) – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm (#Entropie) |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/27_entropyMeasure.zip` (nur gelesen; keine .exe ausgeführt); Formel `27_Entropie_f2.gif`, Bild `27_Entropie.gif` |

## Übernommen

- **Feld**: 202 × 202 Zellen (`ZeichenPanel` 404 × 404 px, `cellScal = 2`); jede Zeile ist ein Zeitschritt, Rand als Ring.
- **Regel** (`checkNei`): Muster aus linker Zelle, Zelle, rechter Zelle der vorigen Zeile, neuer Zustand aus der passenden Ziffer des Regelcodes (Ziffer 1 für `111` … Ziffer 8 für `000`).
- **Regelcode** `E_Rule` mit Voreinstellung `00011110` (Regel 30) und die vordefinierten Regeln aus `CB_pre`: `10001000`, `00000100`, `01011010`, `00010010`, `00011110`, `01101110`, `01101000`. Eine vordefinierte Regel startet neu (`CB_preChange`); der Regelcode selbst wirkt ohne Neustart ab der nächsten Zeile.
- **Start**: „New Setup“ mit einer Zelle an `round(spalt / 2)` = 101 in der ersten Zeile, „Random Setup“ mit `random(2)` je Zelle der ersten Zeile.
- **Entropie** (`plotEntropy`, `set_binary_list`, `set_an_index`): Teilfolgen aus vier Zellen ab jeder Zelle, ringförmig; `entroTop = 1/4 · log2(Zahl der vorkommenden Teilfolgen)`, `entroMet = −1/4 · Σ p · log2 p`; Diagramm blau topologisch, grün metrisch, x-Achse 200 Schritte.
- **Ende** in der letzten Zeile („stop condition“).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`.
- **Erster Schritt**: Das Original berechnet im ersten Takt die erste Zeile noch einmal aus der (leeren) letzten Zeile und setzt dabei nur Einsen; das Muster beginnt dadurch einen Takt später und wird bei Regeln mit `000 → 1` in der ersten Zeile überschrieben. Hier ist die erste Zeile der Anfangszustand (Schritt 0) und jeder Schritt berechnet die nächste Zeile; die Entropie der ersten Zeile steht im Diagramm bei 0.
- **Nach der letzten Zeile**: Das Original hält an und schreibt nach erneutem Start wieder ab der ersten Zeile über das Bild (nur Einsen). Hier hält der Lauf ebenfalls an; ein erneuter Start rollt das Bild nach oben und rechnet unten weiter, das Diagramm wächst mit.
- **Regel als Regler** 0–255 (Wolfram-Nummer, Code daneben) statt Texteingabe; die vordefinierten Regeln als Auswahl.
- **Farben**: Zustand 1 in Schriftfarbe auf der Flächenfarbe (dunkel: hell auf dunkel wie im Original). Die Altersfärbung `255 − (steps − birth)` des Originals ergibt beim Zeichnen immer 255 und entfällt.
- **Diagramm** neben dem Feld (schmale Bildschirme: darunter), y-Achse 0–1, abschaltbar; **Kennzahlen** neu, darunter das Mittel der metrischen Entropie.
