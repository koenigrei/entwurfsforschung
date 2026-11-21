# Quelle · Wegenutzung und das Finden kürzester Pfade

| | |
|---|---|
| Originalprogramm | `342_kuerzestePfade` „Rythmen im städtischen Verkehr“, Version 1.0 vom 26.07.2005 (Projekt `rhythmen.dpr`, Units `facsSteer.pas`/`.dfm`, `agenten.pas`) – gleicher Quellcode wie `15_Wegenutzung` im Laboratorium. Als Fassung enthalten: `14_graphPath` „A* in Graph“ vom 25.07.2005 (`graphTraffic.dpr`), derselbe Graph mit festem Start und Ziel, ohne Nutzungsmarkierung |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2005 (26.07.2005 laut Programmkopf, alter Seite „Source - 050726“ und `agenten.pas` im ZIP; `facsSteer.pas`/`.dfm` wurden am 17.11.2005 noch einmal gespeichert) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 3.4.2 „Wegenutzung und das Finden kürzester Pfade“ (Programmliste https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm); Beschreibungen „Wegenutzung“ (#Wege) und „Pathfinding in unregelmäßigem Graph“ (#Pathfind) auf https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008) 3.4.2](../../../archiv/raumprozesse/simulationsprogramme/), außerdem [Strukturexperimente › Delphi](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/raumprozesse/342_kuerzestePfade.zip`, `archiv_medien/strukturexperimente/15_Wegenutzung.zip` (identisch), `archiv_medien/strukturexperimente/14_graphPath.zip` (nur gelesen; keine .exe ausgeführt); Bilder `342_kuerzestePfade.gif`, `15_Wegenutzung.gif`, `14_GraphPath.gif` |

## Übernommen

- **Zeichenfläche** `ImagePaint` 770 × 451 px; Ränder `LEFT_BORDER = 2`, `TOP_BORDER = 6`, `RIGHT_BORDER = 765`, `BOTTOM_BORDER = 446`; Torus-Prüfung vor der Bewegung (über den Rand → gegenüberliegender Rand).
- **Knoten** (`Button_CreateClick`, `erstelleNode`): „Create Nodes“ legt die eingestellte Anzahl (15: 50, 14: 40) an zufälligen Orten an, Schritt je Achse `random(3) − 1`; Start = erster, Ziel = letzter Knoten. „Delete 10 Pts“ entfernt die letzten zehn. Einzelne Knoten mit der Maus (mittlere Maustaste).
- **Graph** (`NeigborCheck`, `Anlagern`): Nachbarn = alle Knoten mit gerundetem Abstand `< Anlager Dist.` (Kanten); ist der nächste Nachbar näher, hält der Knoten an; ist er näher als `Anlager Dist. − RepelDist.`, wird der Schritt `random(3) − 1 + (eigene − dessen Position) / 20` (je Nachbar neu gezogen, der letzte gilt). Bewegung `Position += round(Schritt)` mit Delphis Rundung (,5 zur geraden Zahl). Eine Änderung von „Anlager Dist.“ setzt alle Knoten mit neuem Zufallsschritt wieder in Bewegung (`ScrollBar_DistRotChange`).
- **Mausinteraktion**: Knoten näher als MausRadius erhalten `Dir · round((Position − Maus) · 0,1)`; „Attract/Repel“ kehrt `Dir` um.
- **Ablauf** (`ApplicationEvents1Idle`): alte Positionen merken und Nachbarn prüfen (`Swarming`), Maus, Torus, Bewegung; dann in 15 zufälliger Start- und Zielknoten (`rndWays`, beide `random(count)`, auch gleich – dann „kein Pfad möglich!“), A* (`findPath`), Zeichnen.
- **A*** wie in `checkNeighbour`/`calcF`: `G = G(Vorgänger) + gerundete Strecke`, `H = gerundete Luftlinie`, offene Liste absteigend nach F sortiert, der letzte Eintrag wird expandiert, das Ziel gilt beim Aufnehmen als gefunden.
- **Wegenutzung** (`Verbinden`): je Abschnitt des Pfades `Usage[Vorgänger → Knoten] + Stärke der Weg-Markierung / 10`, nur solange `Usage < 15`; Verfall je Durchlauf `− Verfallsrate / 100` für jeden positiven Wert (`NeigborCheck`). Linienstärke der Verbindungen `1 + round(Usage)` an den alten Positionen, der Pfad gelb an den neuen.
- **Regler** (Min, Max, Wert aus `facsSteer.dfm`): Anlager Dist. 5–200 (15: 90, 14: 115), RepelDist. 1–50 (15: 20, 14: 30), Stärke der Weg-Markierung 1–10 (3), Verfallsrate Markierungen 1–10 (1), MausRadius 0–200.
- **Farben**: Knoten rot (Radius 3), startNode blau und zielNode clLime (Radius 5), grüner Rand; Verbindungen clMaroon; Pfad gelb; Hintergrund schwarz. Meldung „Pfad erstellt“ / „kein Pfad möglich!“.

## Bewusst geändert

- **Fassungen zusammengelegt**: `14_graphPath` unterscheidet sich von 15 nur durch festen Start/Ziel (per Klick), fehlende Nutzungsmarkierung (Linien 1 bzw. Pfad 2 px) und andere Voreinstellungen; hier als Auswahl „Fassung“ mit eigenen Voreinstellungen.
- **Startzustand**: Das Original begann leer („zuerst mit 'Create Nodes' einen Graphen erstellen“); hier sind die Knoten nach „Zurück“ schon angelegt. Der Knopf „Create“ (Create Nodes) fügt weitere hinzu, „Delete 10“ entspricht „Delete 10 Pts“; der Graph ist schon vor dem ersten Schritt sichtbar.
- **Maus**: Statt linker/rechter/mittlerer Taste und Bewegung ohne Drücken die Werkzeuge „Start / Ziel“ (links/rechts, nächster Knoten), „Knoten einfügen“ und „Abstoßen / Anziehen“ (links gedrückt = Repel, rechts = Attract; nur solange gedrückt, mit gestricheltem Kreis). Das Original wirkte auf die letzte Mausposition, auch nach dem Verlassen der Fläche. MausRadius ist auf 60 voreingestellt (Original 0 = aus), damit das Werkzeug sofort wirkt.
- **Nutzung beim Löschen**: „Delete 10 Pts“ verkleinert auch die Nutzungsmatrix (das Original ließ die alten Einträge stehen).
- **Sortierung** stabil statt Quicksort (bei gleichem F kann ein anderer, gleich langer Weg herauskommen).
- **Start/Pause/Schritt/Zurücksetzen und feste Saat** statt Pause-Knopf und `random` ohne Saat; ein Schritt = ein Idle-Durchlauf.
- **Kennzahlen neu**: Verbindungen, Anteil ruhender Knoten, Pfad mit Zahl der Abschnitte, mittlere und größte Nutzung und der „Abstand der Nutzung zur Mitte“ (nach Nutzung gewichteter mittlerer Abstand der Kantenmitten von der Feldmitte geteilt durch den ungewichteten; unter 1 = Bündelung in der Mitte, wie in der Beschreibung). Tests und `pruef_ausdruck` prüfen das.
- **Darstellung**: hell mit Fläche statt Schwarz, Gelb des Pfades abgedunkelt; Linienenden rund.
