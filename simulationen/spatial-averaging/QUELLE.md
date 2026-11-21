# Quelle · Spatial Averaging

| | |
|---|---|
| Originalprogramm | `21_Spatial_Averaging` „Model for spatial averaging“, Version 1.0 vom 14.12.2005 (Projekt `ZelluAuto2.dpr`, Units `CellForm.pas`/`.dfm`, `cell_P.pas`) |
| Fassungen | `21_Averaging_Noise.exe` („Modell mit weißem Rauschen“, nur als .exe erhalten) und `22_Vicsek-Szalay` „Vicsek-Szalay Model“ (Projekt `ZelluAuto3.dpr`, Dateien vom 14./15.12.2005) – als Auswahl „Fassung“ in dieser App |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Datum | 15.12.2005 (neueste Quelltextdatei in beiden ZIPs); alte Seite: „Source - 051214“ bzw. „051215“ |
| Vorbild | M. Batty (2005): *Cities and Complexity*, Kapitel 1; T. Vicsek, A. Szalay (1987): Fractal distribution of galaxies modeled by a cellular-automaton-type stochastic process |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi) – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm (#Spatial_Averaging, #Vicsek-Szalay) |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/21_Spatial_Averaging.zip`, `22_Vicsek-Szalay.zip` (nur gelesen; keine .exe ausgeführt); Formeln `formel_03.gif`, `formel_04.gif`, Bilder `21_Spatial_Averaging.gif`, `22_Vicsek-Szalay.gif` |

## Übernommen

- **Feld**: `ZeichenPanel` 404 × 404 px; 21 mit `cellScal = 6` → 67 × 67 Zellen, 22 mit `cellScal = 3` → 135 × 135 Zellen; Rand als Torus.
- **Anfang** (`RasterCreate`, `setup`): `State := random(2) · 2 − 1`, also nur −1 und 1.
- **Regel 21** (`checkNei`, `Timer1Timer`): Summe über Zelle, links, rechts, oben, unten in `limboWorld`, dann synchron `State := limboWorld / 5`. Stopp, wenn der Maximalwert 0 ist.
- **Regel 22**: `State := limboWorld / 5 + (random(2) · 2 − 1)`; eine Zelle wird weiß und bleibt weiß, sobald `abs(State) > Schwelle` (`Edit_thresh`, Voreinstellung 4,5; der Betrag zählt, also auch stark negative Werte). Zu Beginn sind alle Zellen schwarz.
- **Maximalwert** `maxP`: Wert mit dem größten Betrag (mit Vorzeichen); in 21 die zugehörige Zelle grün; Diagramm `RChart1` „Maximalwert der Zellen“ in Rot.
- **Grauwert** in 21: `255 / (2 |maxP|) · (|maxP| + State)`.

## Bewusst geändert

- **Drei Programme, eine App**: 22_Vicsek-Szalay ist 21_Spatial_Averaging mit Rauschen und Schwellenwert (gleicher Quelltext bis auf diese Zeilen, Zellgröße und Anzeige); 21_Averaging_Noise ist nach der Beschreibung der Zwischenschritt mit Rauschen ohne Schwellenwert. Sie sind hier die Fassungen „21 Spatial Averaging“, „21 mit weißem Rauschen“ und „22 Vicsek-Szalay“. Rauschen, Schwellenwert und Anzeige lassen sich zusätzlich frei kombinieren.
- **21 mit weißem Rauschen**: Von diesem Programm gibt es nur die .exe; die Fassung folgt der Beschreibung auf der alten Seite (Regel von 22, Feld und Grauwerte von 21).
- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`; „Zurück“ entspricht „new setup“.
- **Diagramm**: zeigt den größten (rot) und den kleinsten Wert (gestrichelt) statt `maxP` (Wert mit dem größten Betrag), weil dessen Vorzeichen mit Rauschen ständig springt; `maxP` steht als Kennzahl. Es steht rechts neben dem Feld (schmale Bildschirme: darunter), Achse symmetrisch zum größten bisherigen Betrag statt fest ±3 (21 zeichnete `maxP · 10`) bzw. ±8 (22); nach 100 Schritten wächst die x-Achse mit, statt nach 1000 Schritten aufzuhören. Abschaltbar.
- **Helle Darstellung**: Farben aus dem Thema (positiv bzw. entwickelt = Schriftfarbe, negativ bzw. unentwickelt = Flächenfarbe).
- **Kennzahlen** neu: Mittelwert, Standardabweichung, Anteil entwickelter Zellen.
- Das ungenutzte Eingabefeld „alpha scale“ von 21 entfällt.
