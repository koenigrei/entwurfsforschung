# Quelle · Modell „Circle City“

| | |
|---|---|
| Originalprogramm | `590_Circle_City` „Circle City“ (Projekt `HieNet_5.dpr`, Units `Main.pas`/`.dfm`, `CreateStructure.pas`, `calc_AStern.pas`, `Node.pas`, `Agent.pas`, `ColourSelect.pas`, Analysefenster `basicAnalysis`, `advancedAnalysis`, `phaseTransAna`, `spatialAnalysis`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2008; Entstehungsdatum 08.02.2008 (neueste Quelldateien `basicAnalysis.pas`/`.dfm`, `HieNet_5.dpr`; Hauptunit `Main.pas` 19.06.2007) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 5.9 „Modell Circle City“; Liste der Programme auf https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008) 5.9](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `alt_inhalte/cache/alt/RaumProzesse/DSVPro/590_Circle_City.zip` (nur gelesen; keine .exe ausgeführt) |

## Übernommen

- **Netz** (`CreateNetwork`): Bildfläche 766 × 766 px, Mitte (383, 383). Straßen auf dem Kreis mit Radius 240 (`CreateSNodes`), Häuser in drei Ringen 40/80/120 px weiter außen mit 3, 4 und 6 Plätzen je Straße (`CreateHNodes`; ab dem 14. Haus übernimmt das Original die letzte Lage), Wohnungen im Kreis mit Radius 13 um ihr Haus (`CreateFNodes`). Straßen mit `round(Straßenverbindungen / 2)` Nachbarn beiderseits verbunden (`AssignNeighb`, Ring mit `Torus`).
- **Voreinstellungen** (`Main.dfm`): 12 Straßen, 12 Häuser je Straße, 12 Wohnungen je Haus, 6 Straßenverbindungen, 3 Gruppen, 5 % frei (→ 1642 Agenten), `weigthStreets` 0,5, `weigthHouses` 1,0, `leavePlace` 0,33, `settleDown` 0,33, 5 Verbindungen je Löschen.
- **Agenten** (`AgentsCreate`): jeder auf einer zufälligen freien Wohnung (Position in der Liste der freien Wohnungen), Gruppe `random(NGroups)`; Farben aus `ColPalet` (clRed, clLime, clBlue, clYellow, clPurple, clAqua, …).
- **Wege** (`StreetPathes`, `calc_AStern`): kürzeste Wege zwischen allen Straßen über die Straßenverbindungen mit gerundeten euklidischen Abständen.
- **Gewichte** (`NeighPathes`, `CalcWeights`, `SetWeights`): eigenes Haus `weigthHouses`; eigene Straße `weigthHouses² · weigthStreets`; jede andere Straße `weigthStreets^n · weigthHouses²` mit n Straßenknoten auf dem Weg. Gezählt werden die Agenten je Gruppe in Haus und Straße (`AggregateFractions`), die eigene Wohnung und das eigene Haus eingeschlossen (das eigene Haus zählt so in Haus und Straße).
- **Zufriedenheit** (`AgentNeighInflu`, `CalcFraction`): Anteil gleicher = gewichtete Summe gleicher / gewichtete Summe aller, ohne Nachbarn 1; Agenten in zufälliger Reihenfolge, unzufrieden bei Anteil < `leavePlace`.
- **Umzug** (`SearchNewHome`, `MoveToNewLocation`): jeder Unzufriedene prüft die freien Wohnungen in der Reihenfolge der Liste und zieht in die erste mit Anteil > `settleDown` und > seinem bisherigen Anteil; die alte Wohnung wird ans Ende der Liste gehängt. Alle Bewertungen eines Schritts beruhen auf den Zählungen zu Beginn des Schritts (wie im Original, das erst im nächsten `Execute` neu zählt).
- **Verbindungen löschen** (`DeleteConnection`, `ConnectionDeleteAuto`): zufällige Straße, zufällige ihrer Verbindungen; würde das Netz zerfallen, wird die Verbindung wiederhergestellt und das Löschen beendet.
- **Segregationsindex** (`IDissimilar`): auf Straßenebene je Gruppe `½ Σ |Anteil der Gruppe − Anteil der übrigen|`, hier als Mittel über die Gruppen; **mittlere Weglänge** (`GraphConnectivity`).
- **Darstellung** (`DrawLinks`, `TNode.Paint`, `TAgent.Paint`): Verbindungen Straße–Straße 3 px, nicht benachbarte als Bogen zur Mitte (`BowWth 0,7`), Straße–Haus 2 px, Haus–Wohnung 1 px; Straßen gefüllt (Größe 8), Häuser hell mit Rand (4), freie Wohnungen silbern (4), belegte in der Farbe der Gruppe.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`. „Zurück“ entspricht „Setup Structure“ und „New Agents“.
- **Kürzeste Wege** mit Dijkstra statt A*: gleiche Abstände, gleiche Wege; bei gleich langen Wegen zählt der mit weniger Straßenknoten (die Reihenfolge des A* im Original kann dort anders entscheiden).
- **Ende** (neu): Der Lauf hält an, sobald in einem Schritt niemand umzieht – danach ändert sich nichts mehr. Nach einer Änderung an Gewichten, Schwellen oder Verbindungen läuft er mit Start weiter.
- **Verbindungen löschen** ohne Rückfrage: Würde das Netz zerfallen, endet das Löschen (wie `ConnectionDeleteAuto`; die Rückfrage „Retry/Cancel“ des Knopfes entfällt).
- **Farben** der Verbindungen, Straßen und Häuser folgen der hellen oder dunklen Darstellung (im Original grau und schwarz auf weiß); die Gruppenfarben bleiben.
- **Diagramm**: Anteil der Unzufriedenen (rot) und Umziehenden (grün) wie `Ser_happy`/`Ser_moving` im Fenster „Basic Plots“, dazu gestrichelt der mittlere Segregationsindex; die Schwellen als Linien entfallen.
- **Regler** mit Grenzen: Straßen 5–24, Häuser 1–13 (mehr Häuser hätten im Original keine eigene Lage), Wohnungen 1–20, Verbindungen 2–12, Gruppen 2–13 (Farbtafel), frei 1–50 %.
- **Nicht übernommen**: „New Weigths“ (die Gewichte gelten hier sofort), „draw random path“, Analysefenster (erweiterte Analyse, Phasenübergang, räumliche Effekte), Fortschrittsanzeige.
