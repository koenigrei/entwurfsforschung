# Quelle · Wachstum und räumliche Umverteilung durch Skalenerträge

| | |
|---|---|
| Originalprogramm | `19_Growth_01` „growth with increasing returns“, Version 1.0 vom 13.12.2005 (Projekt `ZelluAuto.dpr`, Units `CellForm.pas`/`.dfm`, `cell_P.pas`) |
| Fassung | `20_Growth_02` „growth with moore neighborhood“ (`CellForm.pas`: „Model for spatial averaging with Moore Neighborhood“, Version 1.0 vom 17.11.2005, Dateien vom 15.12.2005) – als Auswahl „Fassung“ in dieser App |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Datum | 15.12.2005 (neueste Quelltextdatei in beiden ZIPs); alte Seite: „Source - 051212“ bzw. „051213“ |
| Vorbild | M. Batty (2005): *Cities and Complexity*, Kapitel 1 |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi) – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm (#Growth01, #Growth02) |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/19_Growth_01.zip`, `20_Growth_02.zip` (nur gelesen; keine .exe ausgeführt); Formeln `formel_01.gif`, `formel_02.gif`, Bilder `19_Growth01.gif`, `20_Growth02.gif` |

## Übernommen

- **Feld**: 20 × 20 Zellen zu 20 Bildpunkten (`ZeichenPanel` 404 × 404 px, `cellScal = 20`), Anfangswerte `random()` in [0, 1).
- **Regel 19_Growth_01** (`Timer1Timer`): erst Mittelwert `Pges / (reih · spalt)` aller Zellen, dann für jede Zelle `State := Power(State / Pges, alpha)`.
- **Regel 20_Growth_02** (`Timer1Timer`, `checkNei`): Summe der 3 × 3-Moore-Nachbarschaft einschließlich der Zelle (Rand als Torus) in `limboWorld`, dann `State := Power(limboWorld / 9, alpha)`; beides synchron. Stopp, wenn der Höchstwert 0 ist („Stop wenn alles 0“).
- **Exponent α** (`Edit_alpha`, Voreinstellung 1,9; hier Regler 0,1–3).
- **Takt** `Timer1.Interval = 500` ms als Voreinstellung der „Pause je Schritt“.
- **Darstellung**: Grauwert `255 / maxP · State` relativ zum Höchstwert; in 19 Zellen mit grünem Rand und Zustand über 255 rot (`cell_P.Paint`), in 20 die Zelle mit dem Höchstwert grün.

## Bewusst geändert

- **Zwei Programme, eine App**: 20_Growth_02 unterscheidet sich von 19_Growth_01 nur in der Umverteilungsregel (lokales statt globales Mittel); es ist hier die Fassung „20 Moore-Nachbarschaft“.
- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`. „Zurück“ entspricht „new setup“. Im Original startet der Timer sofort und hält bei jeder Änderung von α an; hier wirkt α ohne Neustart im nächsten Schritt.
- **Grauwert**: Das Original teilt in 19 durch den Höchstwert *vor* dem Schritt; neue Werte darüber ergaben Farbwerte über 255, die Windows abschneidet (Farbsprünge). Hier ist der Grauwert relativ zum Höchstwert *nach* dem Schritt und auf 0–255 begrenzt.
- **Ende bei Ruhe**: Der Lauf hält zusätzlich an, wenn sich kein Wert mehr ändert (in 19 nach etwa 20 Schritten: eine Zelle hält alles, `(400)^1,9 ≈ 87 900`); Kennzahl „Ruhe nach Schritt“.
- **Pause je Schritt** (0–1000 ms) als Regler; „Schritt“ und die Prüfschnittstelle rechnen ohne Wartezeit.
- **Helle Darstellung**: hohe Werte dunkel auf hellem Grund (Farben aus dem Thema), Rot und Grün bleiben.
- **Kennzahlen** neu: Höchstwert, Mittelwert, Anteil der größten Zelle, Zellen > 0, Zellen > 255.
- Der Faktor μ aus Battys Formel fehlt wie im Original (μ = 1).
