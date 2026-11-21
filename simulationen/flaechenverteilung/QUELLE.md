# Quelle · Verteilung verschiedener Flächennutzungen

| | |
|---|---|
| Originalprogramm | `422_Flaechenverteilung` (Projekt `Settlement_Pattern_05.dpr`, „Settlement Patterns Version 5.0“; Units `CellForm.pas`, `agenten.pas`, `cell_P.pas`, `Calcer.pas`, `RankSize.pas`, `AgentData.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows; Diagramme mit TeeChart |
| Autor | Reinhard König |
| Jahr | 2006 (Kopf: Versionen 1.0 vom 11.06.2006 bis 5.0 vom 02.10.2006 „Analysation – Rank Size and Change“; neueste Quelltextdateien `CellForm.pas`/`.dfm` vom 25.02.2007); Programmsammlung zur Dissertation 2008. Vorstufe vermutlich `44_SettlementLandUse.exe` („- 060811“, nur exe) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 4.2.2 „Dynamische Entwicklung verschiedener Flächennutzungen“, Gleichungen 44–47, Abb. 33–35; nach M. Batty (2005): *Cities and Complexity*, S. 241–252 |
| Seite der alten Website | https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm (Vorstufe: https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm#landUseP_01, „Eine detailiertere Beschreibung folgt…“) |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008)](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `archiv_medien/raumprozesse/422_Flaechenverteilung.zip` (nur gelesen; keine .exe ausgeführt) |

## Übernommen

- **Ablauf** aus `calculate`: `diffuse` → neue Nutzungen, solange weniger Agenten als eingestellt → `rescalePot` → `calcAgents` → `rescaleMarks` (bzw. `decayMarks`) → `calcGraph` → alle 100 Schritte `rankSize`; Stopp nach `E_stop` = 800 Schritten.
- **Diffusion** (`diffuse`, `checkNei` in `Calcer.pas`): je Feld Mittel der 8 Nachbarn mit Torus; `P += μ · Mittel + Zufall · ε` mit einer Zufallszahl je Zelle für alle drei Felder; danach jedes Feld auf 0…10 skaliert.
- **Neue Nutzungen** (`CreateAgents`, `setupAgents`, `setOrigins`, `setNewDestinations`, `maxPotPlace`): 3 Wohnstandorte, 1 Dienstleistung, 1 Industrie je Schritt auf der freien Zelle mit dem höchsten Potential ihres Feldes (Zeilenfolge, erster Treffer); jede Nutzung erhöht die drei Felder um ihre Gewichte.
- **Voreinstellungen** aus `setupGrid` und `CellForm.dfm`: μ = 1, 1, 1; Gewichte Wohnfeld 1,0 / 0,5 / 0, Dienstleistungsfeld 0,5 / 1,0 / 0, Industriefeld 0,5 / 0 / 1,0 (je für Wohnen / Dienstleistung / Industrie); Rauschen 6,0 / 5,0 / 4,8; 2400 Agenten; Zellengröße 2 (202 × 202 Zellen im 404 × 404 großen Feld); Blickwinkel 22°, Abweichung 20°, Rauschen der Heimkehr 30°, Zugriffswahrscheinlichkeit 0,1; Rückweg „use existing tracks“, Spurwahl „hill climbing“; Migration aus (Schwelle 2), Spurverfall aus (0,99).
- **Ziele** (`setDestinations`): 10 zufällige Ressourcen aus je 3 × 3 Zellen, Industriefeld dort +1.
- **Agenten** (`calcAgents`, `checkArea`, `TAgent.ChangeHeading`, `hillClimbing`, `rouletteWheel`, `randomWalk`): Blickfeld als Sektoren der 8 Nachbarzellen zwischen Richtung ± Blickwinkel − 22,5°; Gewichte aus den Heimwegspuren plus Rauschen 0,1 · (Zufall − 0,5); ist ihre Summe positiv, wählt der Agent die stärkste Spur (bzw. per Roulette), sonst Zufallsweg; heimkehrend richtet er sich zum Ausgangsort; Heimwege markieren +10; Zugriff auf Ressourcen (Ziele, Dienstleistung, Industrie) mit Wahrscheinlichkeit 0,1; Hindernisse werden nicht betreten.
- **Migration** (`migrationTest`): mindestens ξ weitere Agenten in der Moore-Nachbarschaft und freie Zelle → Ausgangsort hierher, einmal je Agent.
- **Rang-Größen-Analyse** (`rankSize`, Form2): Kacheln zu 20 × 20 Zellen, bebaute Zellen (Zustand > 1 ohne Ziele) je Kachel, absteigend sortiert, log–log mit Trendlinie (Kacheln mit mehr als einer bebauten Zelle).
- **Darstellung** (`cell_P.rePaint`): Wohnen grün, Ressourcen hellgrün, Dienstleistung rot, Industrie blau (clHotLight), Hindernisse dunkelblau; Spuren und Potentialfelder als Graustufe über die freien Zellen; voreingestellt „show no tracks“ (nur Nutzungen); Agenten suchend rot, heimkehrend hellgrün; Verlauf „average values“ (erfolgreiche, heimkehrende, migrierte Agenten, Reisezeit).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe; Saat und Parameter in der Adresse. „new Setup“ = Zurücksetzen.
- **Gewichte und Rauschen als Regler** statt der Tabelle (StringGrid); Diffusionskoeffizienten und Nutzungen je Schritt bleiben fest auf den Werten des Originals. Analyse 1 und 2 (Parameterstudien über Gewichte bzw. Rauschen) sowie Speichern als BMP/XLS entfallen.
- **Migration**: Das Original setzt das alte Potential über einen falschen Index (`potent[oldState − 3]`, für Wohnen außerhalb des Feldes). Hier wird das Potential des alten Ortes um 1 verringert (mindestens 0) und das des neuen um 1 erhöht.
- **Unbestimmte Schrittrichtung**: Findet „hill climbing“ kein positives Gewicht, ist die Richtung im Original undefiniert; hier behält der Agent seinen letzten Schritt.
- **Mittlere Reisezeit** in Schritten (im Original ×100 im Diagramm); der Verlauf ist ins Bild integriert, ebenso das Rang-Größen-Diagramm (rechts bzw. unten; ohne Tabelle der Rangänderungen).
- **Maus**: Ziehen zeichnet Hindernisse (3 × 3 Zellen), Rechtsklick entfernt nur Hindernisse (im Original löscht er jede Nutzung); neue Ziele per Strg-Klick entfallen. „gravity lines“, „all destinations black“, „all cells white“ entfallen.
- **Farben** für helle und dunkle Darstellung lesbar gemacht (Spuren dunkel auf hell bzw. hell auf dunkel).
