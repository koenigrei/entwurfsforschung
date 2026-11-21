# Quelle · Wachstum mit räumlicher Umorganisation

| | |
|---|---|
| Originalprogramm | `29_groupGrow` „group segregation model“ (Fenster „CA-Growth with Probability and Segregateion“), Version 1.0 vom 18.01.2006 (Projekt `ZA01_group.dpr`, Units `CellForm.pas`/`.dfm`, `cell_P.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Datum | 20.01.2006 (neueste Quelltextdatei im ZIP); alte Seite: „Source - 060303“ |
| Vorbild | M. Batty (2005): *Cities and Complexity*, Kapitel 2 |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi) – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm (#groupGrowth) |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/29_groupGrow.zip` (nur gelesen; keine .exe ausgeführt); Bild `29_groupGrow.gif` |

## Übernommen

- **Feld**: 101 × 101 Zellen (`cellScal = 4`), Rand als Torus; Samen Typ 1 in Zelle 50/50, wahlweise 21 zufällige Samen (`Cb_rnd`).
- **Ablauf** (`Timer1Timer`): `checkNei` für alle Zellen (mindestens ein entwickelter Moore-Nachbar), dann `ageCheck`, dann Entwicklung unentwickelter Zellen mit `Random() < probab` (sonst wie in 28 Geburtszeit und `probab²`), dann `segregation`; Stopp bei Schritt 300.
- **Typ bei der Entwicklung**: `dist < 100` (Entfernung zur Mittelzelle in Bildpunkten, also 25 Zellen) → mit `Random() <= statProb` Typ 1, sonst 2; außerhalb umgekehrt.
- **Segregation** (`segregation`, `checkVote`): Zellen zeilenweise und sofort wirksam (spätere Zellen sehen schon die neuen Typen); entwickelte Zelle mit `neighWhite > 4` → Typ 2, sonst mit `neighBlack > 4` → Typ 1.
- **Altern** (`Cb_aging`, Voreinstellung aus): Alter `steps − birth`, über der Lebensdauer `state = 0`.
- **Parameter** (`CellForm.dfm`): „Probability in %“ 100, „die with age“ 30, „State 1/2 Probability in %“ 60; Lebensdauer, q und Altern wirken ohne Neustart.
- **Farbe** `state · (127 − 2 · age)`: Typ 1 grau, Typ 2 weiß; Diagramm „number of cells: red = total | blue = gray | green: white“.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize` (im Original in jedem Schritt). Das Original startet nach „new Setup“ sofort; „start / stop“ setzt auch nach Schritt 300 fort – hier ebenso mit Start.
- **Radius r als Regler** (0–72 Zellen, Voreinstellung 25 = 100 px wie im Quelltext fest eingetragen) und als gestrichelter Kreis abschaltbar eingezeichnet.
- **Wahrscheinlichkeit p setzt zurück**, weil sie beim Setup an jede Zelle vergeben wird (wie bei `einfaches-wachstum`).
- **Grauwert begrenzt**: `127 − 2 · age` wird bei langer Lebensdauer negativ; hier bleibt er bei 0.
- **Zählung** für Diagramm und Kennzahlen nach der Segregation (im Original davor, also einen halben Schritt verspätet).
- **Helle Darstellung**: Farben aus dem Thema (Typ 2 = Schriftfarbe, Typ 1 = halbe Mischung, unentwickelt = Flächenfarbe).
- **Diagramm** neben dem Feld (schmale Bildschirme: darunter), abschaltbar; **Kennzahlen** neu, darunter der Anteil grauer Zellen innerhalb und weißer Zellen außerhalb von r.
