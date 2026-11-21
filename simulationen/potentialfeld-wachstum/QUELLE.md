# Quelle · Growth in a Potential-Field

| | |
|---|---|
| Originalprogramm | `30_potDevProb` (Fenster „CA-Growth with Probability and Segregateion“, aus `29_groupGrow` weiterentwickelt; Projekt `ZA02_potDevProb.dpr`, Units `CellForm.pas`/`.dfm`, `cell_P.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Datum | 24.01.2006 (neueste Quelltextdatei im ZIP); alte Seite: „Source - 060304“ |
| Vorbild | M. Batty (2005): *Cities and Complexity*, Kapitel 3 |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi) – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm (#potDevProb) |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/30_potDevProb.zip` (nur gelesen; keine .exe ausgeführt); Formeln `formel_00_thresh.gif`, `30_potDev_f1.gif`, `30_potDev_f2.gif`, Bild `30_potDev.gif`. Das Grundmodell `30_potDev.exe` („Potential and Development“) liegt nur als .exe vor und ist nicht umgesetzt; ohne Rauschen (Regler auf 0) zeigt die App die deterministische Grundregel. |

## Übernommen

- **Feld**: 101 × 101 Zellen (`cellScal = 4`), Rand als Torus; Anfang `D = 0`, `P = 0`, `P = 1` in Zelle 50/50; wahlweise 11 zufällige Samen mit `P = 1` (`Cb_rnd`).
- **Ablauf** (`Timer1Timer`): `ageCheck`; dann für jede unentwickelte Zelle Geburtszeit setzen und bei `Pot > thresh` entwickeln; dann für Zellen mit `Pot = 0` und mindestens einem entwickelten Nachbarn `limboWorld = Σ Pot_Nachbar / 9` (`checkPot`, acht Nachbarn, geteilt durch 9); dann `Pot := limboWorld + random(noise) / 1000`, höchstens 1, entwickelte Zellen `Pot = 0`.
- **Parameter** (`CellForm.dfm`): „Develop-Threshold %“ 20 (`thresh = 0,2`), „Noise in %“ 27 (`noise = 10 · 27`, Rauschen in [0; 0,27)), „die with age“ 50, „activate aging“ an. Eine neue Schwelle setzt das Rauschen auf Schwelle + 7 (`E_probabChange`).
- **Altern**: Alter `steps − birth`; über der Lebensdauer `pot = 0`, `state = 0`.
- **Farbe** `state · (255 − colM · age)` mit `colM = trunc(255 / die with age)`; Diagramm „number of cells“ in Rot, x-Achse bis zur Lebensdauer.
- **Ende** bei `steps = die with age` („stop condition“); „start / stop“ setzt fort.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize` (im Original in jedem Schritt).
- **Rauschen statt Wahrscheinlichkeit**: Die alte Seite beschreibt `random(p) < p` als Bedingung der Entwicklung; im Quelltext ist diese Bedingung auskommentiert und das Rauschen wird zum Potential addiert. Die App folgt dem Quelltext.
- **Anzeige „Potentialfeld“** neu (im Quelltext als auskommentierte Zeile `colr := round(Pot · 4 · 255)` vorhanden).
- **Grauwert begrenzt** auf 0–255 (bei Alter über der Lebensdauer ohne Altern sonst negativ).
- **Regler** statt Eingabefelder: Schwelle 1–100 %, Rauschen 0–100 %, Lebensdauer 5–200.
- **Diagramm**: y-Achse passt sich der Zellenzahl an (Original fest bis 10 301), wächst nach der Lebensdauer mit; neben dem Feld (schmale Bildschirme: darunter), abschaltbar.
- **Helle Darstellung**: Farben aus dem Thema (neu entwickelt = Schriftfarbe, unentwickelt = Flächenfarbe).
- **Kennzahlen** neu: entwickelte Zellen, Zellen mit Potential > 0.
