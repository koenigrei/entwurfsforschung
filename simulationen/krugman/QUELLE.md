# Quelle · Krugmans Modell

| | |
|---|---|
| Originalprogramm | `26_Krugman_Model` (Projekt `krugman.dpr`, Units `CellForm.pas`, `cell_P.pas`; `Cell.pas`, `Node.pas`, `agenten.pas` liegen bei, werden aber nicht benutzt) |
| Sprache | Delphi 2005 (Object Pascal), Windows; Diagramm mit der Komponente `RChart` (SDL) |
| Autor | Reinhard König |
| Jahr | 2005 (Kopf: „Version 1.0, December 2005, Last Update: Dec-22, 2005“; neueste Quelltextdatei `CellForm.pas` vom 22.12.2005) |
| Vorlage | P. R. Krugman (1996): *The Self-Organizing Economy*; Darstellung nach M. Batty: *Cities and Complexity*, Kapitel 1 |
| Seite der alten Website | https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm#Krugman („26_Krugman's Model / Source - 051222“, mit den drei Formeln) |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/26_Krugman_Model.zip` (nur gelesen; keine .exe ausgeführt) |

## Übernommen

- **Orte** aus `CreateRaster`: 24 Orte bei `round(sin(i · 2π/24) · 100 + 200)`, `round(cos(…) · 100 + 200)`; Entfernungen aus diesen gerundeten Lagen auf den Einheitskreis umgerechnet (`setDist`) – die Rundung bricht die Symmetrie leicht, wie im Original.
- **Startverteilung** aus `setupCells`: 23 Orte `random · 2/24`, der letzte bekommt den Rest bis 1; ist er negativ, wird neu gewürfelt.
- **Regeln** aus `calcCells`: `V_i = K1 · Σ P_k · exp(−α d_ki) − K2 · Σ P_k · exp(−β d_ki)`; mittleres Potential `Σ P_i · V_i / 24` (durch die Zahl der Orte geteilt, wie im Programm); `P_i ← Wachstum · (P_i + (V_i − V̄) · P_i)` für alle Orte mit denselben Potentialen (synchron).
- **Voreinstellungen** aus `CellForm.dfm`: K1 = 0,2, K2 = 1,0, α = 0,3, β = 0,05, Wachstumsrate 2,0.
- **Darstellung**: Orte als Kreise in Graustufen, `round(P · round(255 / P_max))`; Diagramm `y = log(100 · Bevölkerung)` über `x = Nr. des Ortes` im Bereich −30 bis 5, alle 1000 Schritte ein Profil übereinander (`MoveTo(0, Ort 24)`, `DrawTo(M + 1, Ort M)`), höchstens etwa 38 Profile (Testversion des Diagramms bis 970 Punkte).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: Das Original würfelt mit `Randomize` („new Setup“) und rechnet per Timer. Hier ist jeder Lauf mit derselben Saat wiederholbar; ein Schritt = ein Durchlauf von `calcCells`. „Schritte je Bild“ (bis 500) ersetzt den 1-ms-Timer, damit die Zentrenbildung nach einigen tausend Schritten in Sekunden sichtbar wird.
- **Parameter wirken sofort**: Im Original werden die Eingabefelder nur bei „new Setup“ gelesen; hier wirken die Regler ab dem nächsten Schritt.
- **Keine negative Bevölkerung**: Bei extremen Parametern kann `1 + V − V̄` negativ werden; das Original rechnet dann mit negativer Bevölkerung weiter (Logarithmus undefiniert). Hier wird auf 0 begrenzt.
- **Startverteilung**: Im Original ist die Summe `cSum` nicht initialisiert (in der Praxis 0); hier ausdrücklich 0. Das erste Profil wird schon zu Beginn gezeichnet (im Original nach dem ersten Schritt).
- **Diagramm**: zusätzlich das aktuelle Profil in der Akzentfarbe; auf schmalen Bildschirmen unter statt neben den Orten. Ortsnummern 1–24 am Kreis.
- **Kennzahlen** neu: Zahl und Lage der Zentren (lokale Maxima mit mindestens 1 % der größten Bevölkerung), ihr Anteil, Gesamtbevölkerung, mittleres Potential.
