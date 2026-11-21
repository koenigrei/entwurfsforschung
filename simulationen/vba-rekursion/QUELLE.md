# Quelle · Rekursive Strukturen 01 – Verzweigungsstrukturen

| | |
|---|---|
| Originalprogramm | `iteration01.htm` (AutoCAD-VBA-Skript: `Sub main`, `create`, `setzeQuad`, `draw_line`); Fassungen `iteration02.htm`, `iteration03.htm` |
| Sprache | AutoCAD-VBA (Visual Basic for Applications in AutoCAD) |
| Autor | Reinhard König |
| Jahr | undatiert; spätestens 2004 – die Übersichtsseite `vbaIndex.htm` nennt die VBA-Experimente „Grundlage zu der Arbeit ‚Computergenerierte Stadtstrukturen‘“ (Bauriedel/König 2004). `app.json` und `bestand.json` tragen deshalb `jahr: 2004`. |
| Seite der alten Website | Strukturexperimente › AutoCAD-VBA-Experimente – https://www.entwurfsforschung.de/alt/Strukturfor/vba/iteration01.htm (Übersicht `vbaIndex.htm`) |
| Archivseite | [Strukturexperimente › AutoCAD-VBA-Experimente](../../../archiv/strukturexperimente/autocad-vba/) |
| Quelle im Repo | `alt_inhalte/cache/alt/Strukturfor/vba/iteration01.htm`, `iteration02.htm`, `iteration03.htm`; Bilder `alt_inhalte/cache/alt/Strukturfor/bilder/iteration_01.jpg`, `iteration02–05.jpg`, `rekursion_02-*.jpg` (nur gelesen) |

## Übernommen

- **Samen** (`Sub main`): Würfel der Kantenlänge 10, `startTrip = (0, 0, −10)`, Mitte um `elevation / 2` tiefer → (0, 0, −15).
- **Verzweigung** (`Sub create`): jeder Würfel bekommt `astZahl` Äste (`For m = 0 To astZahl − 1`), jeder Ast geht vom Schwerpunkt (`Centroid`) des Basisastes aus.
- **Richtung**: `angle = Round(Rnd() · num + 1) · oneSlice` mit `num = 4`, `oneSlice = 2π / num`. `Rnd · 4 + 1` liegt in [1, 5); VBA-`Round` rundet .5 zur geraden Zahl. So entsteht k = 1 … 5 mit den Anteilen 1/8, 1/4, 1/4, 1/4, 1/8. k = 1 (90°) und k = 5 (450°) zeigen in dieselbe Richtung – die vier Hauptrichtungen kommen deshalb genau gleich oft vor. Wir übernehmen die Formel wörtlich (`richtungsFaktor`, `vbaRound`).
- **Abstand** `(m + 2) · 11` (22, 33, 44 … je nach Astnummer). Die Koordinaten werden wie im Original mit `Round(…, 0)` gerundet; das entfernt die Rundungsreste von `Cos`/`Sin` (z. B. 6·10⁻¹⁷), sodass alle Würfel auf einem 11er-Raster liegen.
- **Geschosse**: jede Iterationsstufe (`durchlauf`) liegt auf `etage = 22 · durchlauf`, Würfelmitte `etage − 5`. Die Kinder des Samens haben noch `durchlauf 0` (wie der Samen) und liegen direkt auf ihm; erst danach wird `etage + 22` gerechnet. Bei 300 Würfeln und astZahl 3 ergibt das die Stufen 4 · 9 · 27 · 81 · 179 Würfel in Rot, Gelb, Grün, Cyan, Blau – wie auf `iteration_01.jpg`.
- **Farben**: Würfel und Linie bekommen die AutoCAD-Farbnummer `durchlauf + 1` (ACI 1 Rot, 2 Gelb, 3 Grün, 4 Cyan, 5 Blau, 6 Magenta, 7 Weiß/Schwarz, 8/9 Grau, ab 10 die Farbtonreihe der ACI-Tabelle).
- **Verbindungslinien** (`draw_line`): vom Schwerpunkt des Basisastes zum Punkt (x, y, `etage`) – der Mitte der Oberseite des neuen Würfels.
- **Abbruch** (`setzeQuad`: `If f = mengeWuerfel Then End`): nach `mengeWuerfel` Würfeln, der Samen zählt mit. Voreinstellungen der InputBoxen: mengeWuerfel 300, astZahl 3.
- **Index-Mechanismus**: `loser()` speichert die Würfel in Entstehungsreihenfolge, `f` zählt sie, `u` ist die Position des Basisastes innerhalb seiner Stufe, `max = astZahl ^ durchlauf` die Größe der Stufe. Der Aufruf `create(f − ((u · astZahl − u) + max))` ergibt immer genau den nächsten Index i + 1 (nachgerechnet: mit f = 1 + astZahl · (i + 1) und i = 1 + astZahl + … + astZahl^(g−1) + u bleibt i + 1 übrig). Das ist eine **Breitensuche**: Die App führt eine Warteschlange (`z.i` = Basisast, `z.m` = Astnummer); der Test `Index-Mechanismus des Originals = Breitensuche` rechnet die Originalformel wörtlich nach und vergleicht für astZahl 1–5 Basisast und durchlauf jedes Würfels.
- **Fassung 02** (`iteration02.htm`, Auswahl „Fassung“): Würfel 6, Samen (0, 0, 40), Abstand 11, alle Würfel in einer Ebene; ist der Platz besetzt (Prüfung über `checkList`), wird der Ast verworfen (`Ktod`). Linien von Mitte zu Mitte.
- **Fassung 03** (`iteration03.htm`): Würfel 10, Samen (0, 0, 0), Abstand 11. Freier Platz: am Boden setzen, darüber nur, wenn darunter ein Würfel steht. Besetzter Platz: ein Geschoss höher (+ 11), solange unter `geschoss · 11` (4 Geschosse). Keine Linien (`draw_line` ist auskommentiert).
- Für beide Fassungen ergibt die `Ktod`-Rechnung (`create(f − (u · astZahl − Ktod) + u − max)` mit `KtodGesamt`) ebenfalls genau eine Breitensuche über die gesetzten Würfel; verworfene Äste kommen nicht in die Warteschlange (mit einem Skript für astZahl 1–3 und verschiedene Verwerfungsraten nachgerechnet).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: Das Original ruft `Randomize` in jedem Durchgang der Ast-Schleife auf. Ohne Argument nimmt `Randomize` die Systemuhr; innerhalb desselben Uhrtakts bekommt der Zufallsgenerator so immer wieder ähnliche Saaten, die Richtungen folgen also nicht unabhängig aufeinander. Das lässt sich nicht wiederholbar nachbilden. Hier zieht jeder Ast unabhängig aus einem Generator mit fester Saat – gleiche Saat, gleiche Struktur.
- **Ein Schritt = ein neuer Würfel**: Das Original läuft in einem Stück bis `End` (mit `ZoomAll` nach jedem Würfel). In den Fassungen 02/03 überspringt ein Schritt verworfene Äste, bis ein Würfel steht.
- **Letzte Verbindungslinie**: Im Original bricht `End` in `setzeQuad` ab, bevor `draw_line` für den letzten Würfel läuft. Hier bekommt jeder Würfel außer dem Samen seine Linie.
- **Abgestorbene Struktur** (Fassungen 02/03): Ist die Warteschlange leer, weil alle Äste verworfen wurden, zeigt der Index des Originals ins Leere (Laufzeitfehler bei `ObjectIdToObject`). Hier endet das Wachstum mit dem Zustand „abgestorben“.
- **Bereiche**: Die InputBoxen erlaubten beliebige Zahlen. Hier mengeWuerfel 1–1000 und astZahl 1–6 (astZahl 0 hätte im Original eine Endlosrekursion ausgelöst). mengeWuerfel wirkt ohne Neustart; erhöht man den Wert, wächst eine fertige Struktur weiter.
- **Farbnummern über 255** (ab durchlauf 255, z. B. bei astZahl 1) beginnen wieder bei 1. Im Original hätte AutoCAD die Farbe abgelehnt.
- **Fassung 03 in Stufenfarben**: Das veröffentlichte Skript setzt die feste Farbe 151 (`'durchlauf + 1` als Kommentar). Die Bilder `rekursion_02-*.jpg` zeigen aber Stufenfarben – die App zeigt alle Fassungen in Stufenfarben oder Grautönen. Die Fassungen 02/03 schlagen astZahl 2 vor; die App behält beim Umschalten den eingestellten Wert.
- **Darstellung**: eigene Parallelprojektion statt AutoCAD-Ansichtsfenster. Drehung und Neigung sind per Regler oder durch Ziehen auf der Zeichenfläche einstellbar (Voreinstellung 30° / 35°). Die Würfelflächen sind schattiert (Oberseite voll, Seiten dunkler), gezeichnet von hinten nach vorn; Linienstücke im Inneren eines Würfels entfallen. Die Struktur wird wie mit `ZoomAll` eingepasst, unabhängig von der Drehung. Im Dunkeln werden sehr dunkle ACI-Farben (z. B. Blau 5) etwas aufgehellt, im Hellen erscheint ACI 7 schwarz und die Linien etwas dunkler. Der jüngste Würfel ist während des Wachstums im Akzent umrandet.
- **Kennzahlen** neu: Würfel, durchlauf, Geschosse, Verbindungslinien, doppelt belegte Plätze (Fassung 01, keine Belegungsprüfung) bzw. verworfene Äste (02/03), Zustand.
- **Nicht übernommen**: die unbenutzte Funktion `random(lower, upper)` und die auskommentierten Zeilen `ScaleEntity`/`Rotate` der Fassungen 02/03.
