# Quelle · Einfaches Wachstum

| | |
|---|---|
| Originalprogramm | `28_probabCA` „ZA-Growth with Probability“, Version 1.0 vom 20.01.2006 (Projekt `ZA01_probGrowth.dpr`, Units `CellForm.pas`/`.dfm`, `cell_P.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Datum | 20.01.2006 (neueste Quelltextdatei im ZIP); alte Seite: „Source - 060302“ |
| Vorbild | M. Batty (2005): *Cities and Complexity*, Kapitel 2 |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi) – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm (#probabGrowth) |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/28_probabCA.zip` (nur gelesen; keine .exe ausgeführt); Formeln `28_probabGrow_f1.gif`, `28_probabGrow_f2.gif`, Bild `28_probabGrow.gif`. Das „Beispielprogramm“ `28_growth.exe` liegt nur als .exe vor; sein deterministisches Wachstum entspricht hier p = 100 %. |

## Übernommen

- **Feld**: 101 × 101 Zellen (`ZeichenPanel` 404 × 404 px, `cellScal = 4`), Rand als Torus; Samen in der Zelle `round(101 / 2)` = 50 (Delphi rundet auf die gerade Zahl), wahlweise 21 weitere zufällige Samen (`Cb_rnd` „random distributed cells“).
- **Nachbarschaft** (`checkNei`): Summe der Zustände in der 3 × 3-Moore-Nachbarschaft ohne die Zelle selbst; `limboWorld = 1` bei mindestens einem entwickelten Nachbarn; erst für alle Zellen, dann Zustandswechsel (synchron).
- **Zustandswechsel** (`Timer1Timer`, Zellen zeilenweise): Alter `steps − birth`; über der Lebensdauer stirbt die Zelle (`state = 0`, `probab = p`). Bei `limboWorld = 1`: `Random() < probab` → entwickelt (Geburtszeit nur, wenn sie vorher unentwickelt war); sonst beim ersten Misserfolg (`probab = p`) Geburtszeit setzen und `probab := probab²`. Diese Eigenheit gilt wie im Original auch für schon entwickelte Zellen, die so verjüngt werden.
- **Parameter** (`CellForm.dfm`): „Probability in %“ 50, „die with age“ 30; die Lebensdauer wird in jedem Schritt gelesen (Änderung ohne Neustart).
- **Farbe** `state · (255 − 5 · age)`; Diagramm „number of cells“ in Rot, x-Achse 200 Schritte.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize` (das Original ruft es sogar in jedem Schritt auf). „Zurück“ entspricht „new Setup“.
- **Grauwert begrenzt**: Bei einer Lebensdauer über 51 wird `255 − 5 · age` negativ; Windows nahm davon nur das unterste Byte, alte Zellen leuchteten wieder auf. Hier bleibt der Grauwert bei 0 stehen.
- **Wahrscheinlichkeit setzt zurück**: Das Original vergibt p beim Setup an jede Zelle, liest das Feld aber auch in jedem Schritt; eine Änderung während des Laufs wirkte deshalb nur auf gestorbene Zellen und verwirrte den Vergleich `probab = p`. Hier startet eine Änderung von p neu.
- **Lebensdauer** als Regler 1–100, Wahrscheinlichkeit 0–100 % (im Original freie Eingabefelder).
- **Helle Darstellung**: Farben aus dem Thema (neu entwickelt = Schriftfarbe, unentwickelt = Flächenfarbe), also im Hellen dunkle Zellen auf hellem Grund.
- **Diagramm** neben dem Feld (schmale Bildschirme: darunter), wächst nach 200 Schritten mit, abschaltbar. **Kennzahlen** neu: Zahl und Anteil entwickelter Zellen, neue Zellen im Schritt.
