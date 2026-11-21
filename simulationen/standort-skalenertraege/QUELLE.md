# Quelle · Interaktionsmodell Standortwahl und Skalenerträge

| | |
|---|---|
| Originalprogramm | `570_Interakt_Standort_Skalenertr` „Segregation and Economies of Scale“ (Projekt `segregation04_scale.dpr`, Units `CellForm.pas`/`.dfm`, `agenten.pas`, `cell_P.pas`); gleicher Quellcode wie `35_segregation_04_scalen` im Laboratorium für räumliche Prozesse |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2006; Entstehungsdatum 25.03.2006 (neueste Quelldateien im ZIP; alte Seite „060322“) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 5.7 „Interaktionsmodell Standortwahl und Skalenerträge“; Beschreibung „Skalenerträge und Segregation“ (#Segregation04) auf https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm; Liste der Programme auf https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008) 5.7](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `alt_inhalte/cache/alt/RaumProzesse/DSVPro/570_Interakt_Standort_Skalenertr.zip` (nur gelesen; keine .exe ausgeführt) |

## Übernommen

- **Feld**: 40 × 40 Zellen (`ZeichenPanel` 404 × 404 px, `cellScal = 10`), Torus für Umzug und Nachbarschaft; zehn Märkte auf zufälligen Zellen (`setupCells`), Entfernungen euklidisch in Zellen ohne Torus (`CalcDistance`, hier wie dort als Gleitkommazahl).
- **Angebotspreis** (`calcBidPrice`): `P = Kunden / Kunden^S · Produktionskosten`, ohne Kunden `P = Produktionskosten`.
- **Ortspreis und Einzugsgebiet** (`setLocP`, `changeArea`): je Zelle der kleinste Wert `P_j + d_ij · Fahrtkosten`, bei Gleichstand der Markt mit der kleineren Nummer; ein Agent auf der Zelle ist Kunde dieses Marktes. Zu Beginn gehört jede Zelle zum nächstgelegenen Markt (`bestMarket`).
- **Setup** (`setupAgents`): 800 Agenten (`Edit_anzAg`) auf freien Zellen, Typ `random(2)`, alle zu Beginn angehalten (`Stopped := true`).
- **Umzug** (`calcAgents`): unzufriedene Agenten springen um `random(20) − 10` Zellen je Achse (−10 … +9), bis eine freie Zelle gefunden ist (höchstens 100 Versuche).
- **Segregation** (`calcCells`, Schalter „activate: segregation“, an): Anteil gleicher Nachbarn in der Moore-Nachbarschaft `> Position · 12,5 %` → angehalten; Schwellenwert `TrB_thresh` 0–8, Position 3.
- **Suche nach günstigeren Orten** (`compareLoc`, Schalter „activate: look for centers“, an): angehaltene Agenten prüfen bis zu zehn Orte mit demselben Sprung und ziehen auf den ersten freien mit kleinerem Ortspreis.
- **Ablauf** (`execPerStep`): Angebotspreise, Ortspreise, Umzug, Segregation, Suche; ohne Ende (die Abbruchbedingung ist im Original auskommentiert).
- **Parameter** (`CellForm.dfm`): Produktionskosten `SB_ProdKost` 1–500, 100; Fahrtkosten `SB_FahrtKost · 2/100` 0,02–2, 1; Skalenertrag `1 + SB_Skalen/1000 − 0,1` 0,9–1,3, 1,0. Alle wirken ohne Neustart.
- **Darstellung** (`TCell.Paint`, `TAgent.Paint`, Schalter „show catchment areas“, „show local price scape“, „gray cells“): Einzugsgebiete in den zehn Farben des Originals (clSkyBlue, clBlue, clYellow, clGreen, clTeal, clOlive, clLime, clFuchsia, clAqua, clPurple), Ortspreise als Graustufen oder graue Zellen; Märkte mit rotem Rand, Agenten schwarz und weiß. Die Farben bleiben in heller und dunkler Darstellung gleich.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`. „Zurück“ entspricht „new Setup“.
- **Höchstens ein Agent je Zelle**: Nach 100 vergeblichen Versuchen sprang ein Agent im Original auf die zuletzt gewürfelte, möglicherweise besetzte Zelle; hier bleibt er stehen. Höchstens 1500 Agenten.
- **Märkte auf verschiedenen Zellen**: Im Original konnten zwei Märkte auf dieselbe Zelle fallen und teilten sich dann den Kundenzähler der Zelle.
- **Kunden** werden nach jedem Teilschritt aus den Einzugsgebieten neu gezählt, statt sie mit `changeArea` fortzuschreiben – das Ergebnis ist dasselbe, kann aber nicht auseinanderlaufen.
- **Segregation aus**: Alle Agenten gelten als angehalten. Im Original behielten sie den letzten Zustand, sodass Unzufriedene ziellos weitersprangen.
- **Ortspreise als Graustufen** zwischen kleinstem und größtem Wert (im Original `RGB(round(locPrice · 9))`, das ab einem Preis von 28 überläuft).
- **Diagramm**: Kunden aller zehn Märkte in ihren Farben (im Original nur Kunden und Angebotspreis des gelben Marktes Nr. 2, mit neuem Diagramm alle 500 Schritte); x-Achse bis 100, dann mitwachsend. Auf breiten Bildschirmen rechts neben dem Feld, sonst darunter; abschaltbar.
- **Kennzahlen** neu: Märkte mit Kunden, größter Markt mit Anteil und Angebotspreis, mittlerer Ortspreis der Agenten, angelagerte Agenten, gleiche Nachbarn.
- Die Schrittweite der Regler entspricht dem Original (Fahrtkosten 0,02, Skalenertrag 0,001); Fahrtkosten, Produktionskosten und Skalenertrag berechnen Preise und Einzugsgebiete sofort neu, damit das Bild der Einstellung folgt.
