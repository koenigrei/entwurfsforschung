# Quelle · Shortest Path with A*

| | |
|---|---|
| Originalprogramm | `13_Pathfinding` „A-Stern Pathfinding“, Version 1.0 vom 16.07.2005, Revision 17.07.2005 „Wände werden nicht diagonal geschnitten“ (Projekt `A_Stern.dpr`, Units `facsSteer.pas`/`.dfm`, `cell.pas`, `calcer.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2005 (Entstehungsdatum 16.07.2005 laut Programmkopf und alter Seite „Source - 050716“; im ZIP zuletzt geändert: `facsSteer.pas` 19.07.2005, `facsSteer.dfm` 17.11.2005) |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi), Abschnitt „Shortest Path with A*“ (#shortPath) – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/13_Pathfinding.zip` (nur gelesen; keine .exe ausgeführt), Bild `13_Pathfinding.gif` |

## Übernommen

- **Feld**: `ImagePaint` 758 × 458 px bei `cellScal = 14` → 54 × 33 Zellen (`FormCreate`, `round`).
- **Ausgangslage** (`RectanglCreate`): Start `cellList[20,5]` (grün), Ziel `cellList[20,50]` (rot), Wand in Spalte 30 von Zeile 10 bis 30 (blau, `State = 999`).
- **findPath**: Startzelle in die offene Liste; solange die Liste nicht leer und das Ziel nicht gefunden ist: letzten Eintrag als expandierten Knoten nehmen und schließen, `checkNeighbour`, Liste mit `compareByF` absteigend nach F sortieren (der letzte Eintrag hat das kleinste F), Knoten aus der Liste entfernen.
- **checkNeighbour**: die 3 × 3 Nachbarn, Zeile außen, Spalte innen; Wände und geschlossene Zellen werden übergangen. Nicht in der offenen Liste → `calcF`, Vorgänger setzen, aufnehmen (außer `cutWall`); das Ziel gilt als gefunden, sobald es aufgenommen ist. Schon offen → neu rechnen und die alten Werte zurücksetzen, wenn `altG < G` oder `cutWall`; sonst (auch bei gleichem G) neuer Vorgänger.
- **calcF**: `G = G(Vorgänger) + 10` waagerecht/senkrecht, `+ 14` diagonal; `H = 10 · (|Δx| + |Δy|)` (Manhattan); `F = G + H`.
- **Kein diagonaler Schnitt** (`cutWall`): Bei einem diagonalen Schritt wird geprüft, ob eine der vier waagerecht/senkrecht benachbarten Zellen der *neuen* Zelle eine Wand ist. Diese strenge Prüfung (sie verbietet auch Diagonalen, deren Wand jenseits der Zielzelle liegt) bleibt erhalten.
- **Eigenheiten, die bleiben**: Abbruch, sobald das Ziel in die offene Liste kommt (nicht erst beim Expandieren); geschlossene Zellen werden nie wieder geöffnet; die Manhattan-Schätzung überschätzt diagonale Wege. Darum findet das Programm nicht immer den kürzesten Weg (Test „Manhattan-Heuristik …“, Kennzahl „Umweg“).
- **Pfad**: Kette der Vorgänger vom Ziel zurück bis vor den Start, in `clLime`; Start und Ziel behalten ihre Farbe.
- **Bedienung**: linke Maustaste Start, rechte Maustaste Ziel, Wand zeichnen und mit Umschalt löschen; nach jeder Änderung wird der Pfad neu gesucht (`ImagePaintMouseUp` → `findPath`); Knopf „find Path“. Ein neuer Start oder ein neues Ziel auf einer Wand nimmt die Wand weg (`State := 1`).
- **Farben**: freie Zellen schwarz, Start grün, Ziel rot, Hindernisse blau, Pfad clLime (in der hellen Darstellung abgedunkelt bzw. Fläche statt Schwarz).

## Bewusst geändert

- **Schrittweise Suche**: Ein Schritt der App ist ein Durchlauf der `while`-Schleife von `findPath` (ein expandierter Knoten). Offene Liste (Akzentfarbe), geschlossene Liste (grau) und der zuletzt expandierte Knoten (Rahmen) werden gezeigt; das Original rechnete ohne Anzeige bis zum Ende. Start/Pause/Schritt steuern die Suche, sie hält am Ende an. „Pfad nach Änderung sofort“ (Voreinstellung an) sucht nach jeder Mausänderung wie das Original sofort ganz; „Suche neu“ setzt die Suche zurück, damit Start sie vorführt.
- **Maus**: Statt mittlerer Maustaste ein Werkzeug „Wand“ (links zeichnen, rechts oder Umschalt löschen) und ein Werkzeug „Start / Ziel“ (links Start, rechts Ziel). Gezogene Wände werden lückenlos von Mauspunkt zu Mauspunkt gesetzt (das Original setzte je Timer-Takt nur die Zelle unter der Maus). Wände lassen sich nicht auf Start oder Ziel zeichnen (dort machte das Original Start/Ziel zur Wand). Neu ist „Wände weg“ (alle Wände entfernen).
- **Sortierung**: `TList.Sort` ist ein Quicksort ohne feste Reihenfolge bei gleichem F; hier wird stabil sortiert. Bei gleich guten Zellen kann deshalb ein anderer, gleich bewerteter Weg herauskommen als im Original.
- **Fehler behoben**: Steht der Start direkt neben dem Ziel, lief die Schleife zum Färben des Pfades über den Start hinaus (Zugriff auf einen fehlenden Vorgänger); hier ist der Pfad dann leer.
- **Kennzahlen neu**: Status („kein Pfad möglich!“ wie im Programm 14), expandierte Knoten, Länge der offenen Liste, abgesuchter Anteil der freien Zellen, Pfadlänge, Kosten G und der Umweg gegenüber dem kürzesten Pfad nach denselben Zugregeln (Dijkstra, nur zum Vergleich).
- **Kein Zufall**: Das Modell ist deterministisch; die Saat des Rahmens hat keine Wirkung. „Zurück“ stellt die Ausgangslage wieder her.
