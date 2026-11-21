# Quelle · Mietpreisdynamik und Straßen

| | |
|---|---|
| Originalprogramme | `550_Mietpreisdynamik` (Projekt `segregation_rentScape.dpr`, Units `CellForm.pas`/`.dfm`, `agenten.pas`, `cell_P.pas`, `ToleranZ.pas`, `GroupSizes.pas` und Analysefenster `Analyse`, `AnaStability`, `AnaStreets`, `AnaLandsc3D`, `AnalyseGrowth`, `Parameterspace`) und als Fassung `580_Wirkung_StrassenSegregat` (Projekt `segregation_streets.dpr`, gleiche Units ohne Mietlandschaft, Toleranzen und Stabilitätsanalyse). Kopf beider `CellForm.pas`: „Segregation - Streets, Version 1.0, Okt-20, 2006“ |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 550: Entstehungsdatum 20.06.2007 (neueste Quelldateien `CellForm.pas` 19.06.2007, `CellForm.dfm` 20.06.2007); 580: 16.11.2006 (neueste Quelldatei `CellForm.dfm`) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 5.5 „Einbeziehung der Mietpreisdynamik“ und 5.8 „Wirkung von Straßen auf die Segregation“; Liste der Programme auf https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008) 5.5 und 5.8](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `archiv_medien/raumprozesse/550_Mietpreisdynamik.zip`, `alt_inhalte/cache/alt/RaumProzesse/DSVPro/580_Wirkung_StrassenSegregat.zip` (nur gelesen; keine .exe ausgeführt) |

## Warum eine App für zwei Programme

`550_Mietpreisdynamik` ist aus `580_Wirkung_StrassenSegregat` hervorgegangen: Alle Prozeduren von 580 stehen unverändert oder erweitert in 550 (Vergleich der Units), dazu kommen Mietlandschaft (`diffuseIn`, `diffuseField`, `rentGroupsCreate`), individuelle Toleranzen (`ToleranZ.pas`), Gruppengrößen und die Stabilitätsanalyse. Die Auswahl „Fassung“ stellt die Voreinstellungen von 580 (Radius 5, Schwellenwert 30 %, gleiche Toleranz, ohne Mieten, Vergleich „größer als“) oder 550 her.

## Übernommen

- **Feld**: 116 × 116 Zellen (`ZeichenPanel` 694 × 694 px, `Edit_cellSiz` 6); Umzug über den Rand (Torus), Nachbarschaft ohne Torus (`wrap`: Zellen außerhalb fehlen).
- **Setup** (`setupAgents`): 12000 Agenten (`Edit_anzAg`) auf zufälligen freien Zellen ohne Straße (höchstens 1000 Versuche), Gruppe `random(Gruppen) + 1` mit 6 Gruppen (`Edit_anzGr`), Budget `mieteMin + Gruppe · (mieteMax − mieteMin) / Gruppen` (mit Mietlandschaft, sonst `mieteMax`). Farben der Gruppen aus `chooseCol` (Rot → Gelb → Grün → Cyan → Blau → Magenta).
- **Nachbarschaft** (`checkNei`, `testLocation`): Quadrat mit Radius `Edit_nRad` (550: 2, 580: 5), die eigene Zelle zählt mit.
  - Gleiche Toleranz: gewichtete Summen gleicher und anderer Agenten, `satisfied = gleich / (gleich + anders) · 100`; freie Zellen nach `RadioGroup1` nicht, als anders oder als gleich gezählt (je 1, ungewichtet).
  - Individuelle Toleranzen (550, `cb_individTol` an): Zählung je Gruppe einschließlich freier Zellen, Toleranz `tol = n − round(Abneigung/100 · n)` mit `n = (2r+1)²` (`ToleranZ.setTolGroup`), Abneigung nach `setValues` „version 2“: gegenüber einer um `d` Stufen niedrigeren Gruppe `d · 20 %` (`UpD_toInfer −20`), gegenüber höheren `d · 0 %` (`UpD_toSuper 0`), gegenüber sich selbst und freien Zellen 0; `satisfied = (Summe − Überschuss) / Summe · 100`.
- **Zufrieden** (`calcAgents`): 550 `satisfied ≥ Schwellenwert` und `Miete < Budget` (Schwellenwert `TrB_thresh` 100), 580 `satisfied > Schwellenwert` (30). Agenten auf Straßenzellen sind nie zufrieden.
- **Umzug** (`calcAgents`, `TAgent.ChangeHeading`): Sprung um `rndN(−d−1, d)` Zellen je Achse (`Edit_mDist` 54), bis eine freie Zelle ohne Straße gefunden ist (höchstens 1000 Versuche); umziehen, wenn die Zufriedenheit dort größer ist oder (550) die Miete dort kleiner. Die Agenten werden in Listenreihenfolge nacheinander bewegt.
- **Mietlandschaft** (550, `cb_actiRentLand` an): beim Einzug erhält die Zelle die Miete der Gruppe, gleichmäßig von `E_rentMin` −1 bis `E_rentMax` +1 (`diffuseIn`, `rentGroupsCreate`); nach jedem Schritt wird jede Miete durch das Mittel der acht Nachbarn ersetzt (`diffuseField`, synchron, Torus). Darstellung als Grauwert `round((Miete + 1) · 127)` (`CB_showRentSc`).
- **Straßen**: sechs Typen −3 … +3 mit den Farben und Gewichten des Originals (`SG_weight`: 0, 0,33, 0,67, 1, 2, 4, 8). Kommunikative Straßen setzen das Gewicht der Moore-Nachbarzellen auf 2/4/8 (`checkStreets`), Barrieren gelten zwischen zwei Zellen, deren Verbindungsstrecke die Straße schneidet (`testLines`, `Intersect`; der kleinste Typ zählt). Übertragung einer Linie in das Raster wie `transLine` (direkte Nachbarzellen in der Richtung, die dem Ziel am nächsten kommt). Vorlagen „Raster“ (`rasterStreets`: je 4 Linien bei 5 Reihen und Spalten) und „Zufällig“ (`randStreets`: 19 Linien), beide mit zufälligen Typen (`CB_rndTyp`). Straßen bleiben bei einem neuen Setup erhalten (`preserveStreets`).
- **Wachstum** (`CB_actiGrow`, aus): 100 Agenten zu Beginn (`E_startGrowWith`), 10 je Schritt (`E_growRate`).
- **Halt** nach Schritt 500 (`E_stopT`).
- **Segregationsindex** (`countInTiles`, `IDissimilar`): je Gruppe `½ Σ |Anteil der Gruppe − Anteil der übrigen|` über Kacheln von 20 × 20 Zellen (`E_nbSize`), hier als Mittel über die Gruppen.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`. „Zurück“ entspricht „new Setup“.
- **Fassung** als Auswahl (siehe oben); ein Wechsel setzt neu auf.
- **Straßengewichte wirken sofort**: Im Original hängt `lookForStreets` die Gewichte an eine Liste je Zelle an, ohne sie zu leeren; `checkNei` liest aber vom Anfang der Liste. Neu gezeichnete Straßen wirkten deshalb erst nach „new Setup“ auf die Nachbarschaft. Ebenso galten Barrieren erst ab zwei gezeichneten Linien (`high(lineList) > 0`). Hier gelten beide sofort.
- **Alter Ort beim Probewohnen**: Das Original setzt beim Prüfen eines neuen Ortes den alten nur auf „Gruppe 0“, lässt ihn aber besetzt; er zählte dann als „anderer“ Nachbar. Hier gilt er als frei.
- **Kein Platz gefunden**: Nach 1000 vergeblichen Versuchen bleibt ein Agent stehen (550) bzw. wird ein neuer Agent nicht gesetzt; das Original setzte ihn in 580 und beim Wachstum auf die zuletzt gewürfelte, möglicherweise besetzte Zelle.
- **Miete beim Vergleich**: `oldRent` wurde im Original nur für unzufriedene Agenten gesetzt; Agenten auf Straßen verglichen mit dem Wert eines anderen Agenten. Hier ist es immer die Miete der eigenen Zelle.
- **Straßen zeichnen**: zwei Klicks statt Ziehen mit gedrückter Maustaste; wie im Original wird vom zweiten Punkt (Loslassen) zum ersten (Drücken) übertragen. Rechtsklick entfernt die letzte Straße. Eine Übertragung bricht nach `Spalten + Zeilen` Schritten ab (im Original konnte die Rekursion über den Torus ohne gültigen Nachbarn weiterlaufen).
- **Ende**: zusätzlich zum Halt nach Schritt 500 hält der Lauf an, wenn kein Agent mehr umziehen will (Kennzahl „Ruhe nach Schritt“).
- **Diagramm**: Anteil der angehaltenen (zufriedenen) Agenten je Gruppe in den Gruppenfarben und gestrichelt der mittlere Segregationsindex; das Original zeigte in einem eigenen Fenster den Anteil mit `satisfied ≥ 100` je Gruppe, den Index je Gruppe und die Zahl der Umzugswilligen.
- **Darstellung**: Agenten als kleine Kreuze im Rasterbild (drei Bildpunkte je Zelle) statt Kreisen; ohne Mietlandschaft Zellen in der Flächenfarbe der Seite, Zellen neben kommunikativen Straßen etwas abgesetzt (im Original weiß und hellgrau 232).
- **Regler** mit Grenzen statt freier Zahlenfelder: Agenten 500–13000, Gruppen 2–6 (die Mieteingabe des Originals gab es nur für sechs Gruppen), Radius 1–6, Umzugsweite 2–116. Die Abneigungen sind als positive Prozentwerte eingestellt (`UpD_toInfer −20` → „nach unten 20 %“).
- **Nicht übernommen**: Analysefenster (Cluster, Dissimilaritätsmatrix, Parameterraum, Wachstum, Straßen, Stabilität, 3D-Fläche), Speichern von Bildern und Tabellen, Gruppengrößen je Gruppe (`cb_indiGroups`), Toleranzmatrix von Hand (`Form8`), „allow street occupation“ (`CB_strOcc`, aus), Zellgröße und Agentengröße.
