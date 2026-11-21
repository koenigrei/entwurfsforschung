# Quelle · 2Dwachstum 01–03 – Wanderwürfel

| | |
|---|---|
| Originalprogramm | `experiment01.htm` – „2Dwachstum01 – erste Versuche zu Wachstumsstrukturen“ (AutoCAD-VBA-Skript: `Sub main`, `setzeQuad`, `random`, `pi`); Fassungen `experiment02.htm` („2Dwachstum02 – weiterbearbeitete Struktur“) und `experiment03.htm` („2Dwachstum03 – wander Würfel“) |
| Sprache | AutoCAD-VBA (Visual Basic for Applications in AutoCAD) |
| Autor | Reinhard König |
| Datum | Februar 2004 – die Seiten sind undatiert; das EXIF-Datum (Photoshop 7.0) der Bilder zu den Skripten: `2Dwachstum.jpg` 26.02.2004 15:27 (01), `2Dwachstum2.jpg` 26.02.2004 22:40 (02), `2Dwachstum3.jpg`/`2Dwachstum4.jpg` 27.02.2004 (03). `app.json` trägt `datum: 2004-02-26`. Die Übersicht `vbaIndex.htm` nennt die VBA-Experimente „Grundlage zu der Arbeit ‚Computergenerierte Stadtstrukturen‘“. |
| Seite der alten Website | Strukturexperimente › AutoCAD-VBA-Experimente – https://www.entwurfsforschung.de/alt/Strukturfor/vba/experiment01.htm, `experiment02.htm`, `experiment03.htm` (Übersicht `vbaIndex.htm`) |
| Archivseite | [Strukturexperimente › AutoCAD-VBA-Experimente](../../../archiv/strukturexperimente/autocad-vba/) |
| Quelle im Repo | `alt_inhalte/cache/alt/Strukturfor/vba/experiment01.htm`, `experiment02.htm`, `experiment03.htm`; Bilder `alt_inhalte/cache/alt/Strukturfor/bilder/2Dwachstum.jpg`, `2Dwachstum2.jpg`, `2Dwachstum3.jpg`, `2Dwachstum4.jpg` (nur gelesen) |

## Übernommen

- **Würfel** (`setzeQuad`): Kante 10 (`length = width = 10`, `height = elevation = 10`), Mitte `elevation / 2` unter dem übergebenen Punkt; Farbe `random(1, 255)` (01, 02) bzw. `random(0, 255)` (03) mit `random = Int((upper − lower + 1) · Rnd + lower)`.
- **Richtung**: `angle = Round((Rnd() · num + 1)) · oneSlice`, `oneSlice = 2π / num`, `num = 4`; Sprung `Cos(angle) · 11`, `Sin(angle) · 11`. VBA-`Round` rundet .5 zur geraden Zahl; k = 1 und k = num + 1 zeigen in dieselbe Richtung, so kommen alle Richtungen gleich oft vor.
- **Fassung 01**: `For u = 1 To 10` Ebenen, je `loops = 100` Würfel ab (0, 0), Würfeloberseite auf `u · 10`; Koordinaten ungerundet; keine Prüfung. Reihenfolge der Zufallszahlen je Würfel: Richtung, dann Farbe.
- **Fassung 02**: `loops = 200`, Koordinaten mit `Round(…, 0)` gerundet. In jedem Durchgang `i` wird `mitte` – der Platz des zuletzt gesetzten Würfels – mit `checkList(0 … i − 1)` verglichen; danach `checkList(i) = mitte`. Bei einem Treffer `etage = etage + random(−1, 1) · 10` für den nächsten Würfel. `checkList(0) = (1, 0, 0)` (Platzhalter). Weil `mitte` anfangs (0, 0, 0) ist und der erste Würfel dort steht, gilt schon der erste Würfel als Treffer. Doppelbelegungen bleiben, wie die alte Seite bemerkt.
- **Fassung 03**: `loops = 400`. Geprüft wird der nächste Platz; für **jeden** Treffer in der `checkList` `etage = etage + random(−1, 1) · 10` (wiederholte Einträge zählen mehrfach), dann nur `mitte(2) = etage` und `checkList(i) = checkList(i − 1)` – kein Würfel in diesem Durchgang. Ist der Platz frei: Richtung, `checkList(i) = mitte`, Würfel setzen, nächsten Platz berechnen. Ergebnis: keine Doppelbelegung (Test „03: keine Doppelbelegung“).
- **num**: „Verändert man die Variable ‚num‘ – hier auf den Wert 3 gesetzt, verschiebt das System seine 3-dimensionale Rasterung.“ Als Regler 2–8.

## Bewusst geändert

- **Drei Skripte, eine App**: Die drei Seiten sind Stufen desselben Experiments (die Seiten verweisen mit „weiter“ aufeinander); 02 und 03 stehen unter „Fassung“ mit ihren eigenen `loops`.
- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe; im Original gab es keine Saat (alle drei Skripte ohne `Randomize`, also in jeder AutoCAD-Sitzung dieselbe Folge). Ein Schritt = ein Durchgang der Schleife `For i` (in 03 auch ein Durchgang ohne Würfel); das Original läuft in einem Stück bis `ZoomAll`.
- **Parameter** neu als Regler: `loops` 1–1000, Ebenen (nur 01) 1–20, `num` 2–8. Im Original standen die Werte im Code.
- **Farbe 0** (`random(0, 255)` in 03, in AutoCAD „VONBLOCK“) erscheint wie Farbe 7 weiß bzw. schwarz. Sehr dunkle AutoCAD-Farben werden im Dunkeln etwas aufgehellt, sehr helle im Hellen etwas abgedunkelt. Wahlweise Grautöne nach Höhe, damit die Geschosse lesbar werden.
- **Darstellung**: eigene Parallelprojektion statt AutoCAD-Ansichtsfenster (wie in der App „Rekursive Strukturen“), drehbar per Ziehen oder Regler (Voreinstellung 30° / 35°), schattierte Würfel von hinten nach vorn gezeichnet, eingepasst wie `ZoomAll`. Würfel auf demselben Platz liegen deckungsgleich übereinander; „Doppelbelegung markieren“ umrandet jeden Würfel, dessen Platz schon besetzt war. Der jüngste Würfel ist während des Wachstums umrandet.
- **Kennzahlen** neu: Würfel, Durchgang, Ebene (01), doppelt belegt, belegte Plätze, Geschosse, Ebenenwechsel (02/03), Durchgänge ohne Würfel (03).
- **Nicht übernommen**: die unbenutzten Variablen `entscheid`, `etage` in 01 und die auskommentierte JavaScript-Zeile `Math.floor(Math.random()*num+1)`.
