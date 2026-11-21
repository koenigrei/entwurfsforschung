# Quelle · Überlagerungsflächen

| | |
|---|---|
| Originalprogramm | `05_rechtClipping` (Delphi 2005: `main.pas` mit `Button_createRechtClick`, `schneideRecht`, `sumAreas`, `RechtPaint`; `rechteck.pas` mit `TBaseRecht`); Fassung `04_rechtClipping` (`checkOverlap`, `Schnittpunkt`, `IntToBin`/`BinToInt`) |
| Sprache | Delphi (Object Pascal, Borland Delphi 2005) |
| Autor | Reinhard König |
| Datum | 15.05.2005 – neueste Quelltextdatei im ZIP `05_rechtClipping/main.pas` (15.05.2005 17:02), die alte Seite nennt „050515“. Die Fassung 04 entstand am selben Tag früher (`main.pas` 15.05.2005 13:17). |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi) – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm (Anker `#overlap1`) |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/05_rechtClipping.zip`, `04_rechtClipping.zip`, Bild `05_rechtClip.gif` (nur gelesen; keine .exe ausgeführt) |

## Übernommen

- **Feld** 410 × 394 Pixel (`ImagePaint`), schwarzer Grund, Rechtecke rot (`clRed`), Überlagerungsflächen blau (`clBlue`), Umrisse grün (`Pen.Color := clGreen`).
- **Rechtecke erstellen** (`Button_createRechtClick`): je Klick `numbers` Rechtecke; `PositionX := random(410)`, `PositionY := random(394)`, Ecken `Position − 10 − random(50)` und `Position + 10 + random(50)` – jede der vier Seiten mit eigener Zufallszahl, in der Reihenfolge links, oben, rechts, unten. Rechtecke dürfen über den Rand ragen. `ScrollBar_Numbers`: Min 1, Max 50, Position 10 („generate per Click“).
- **Fassung 05** (`schneideRecht`): für alle Paare `I < K` (`For I … For K := I + 1 …`) `IntersectRect(lapR, rA, rB)`; ist das Ergebnis nicht leer, kommt `lapR` in die `LapsList`. Berührung ergibt wie bei Windows eine leere Fläche und kein Überlagerungsrechteck.
- **Fassung 04** (`checkOverlap`), wörtlich übernommen: Clipcodes der vier Ecken von B relativ zu A als Text `'0000'` (Stelle 1: `y > ymax`, 2: `y < ymin`, 3: `x > xmax`, 4: `x < xmin`; `BinToInt` → 8/4/2/1). Überlagerungsprüfung je Kante: `p0C = 0` oder `p0C OR p1C = 3` oder `= 12`. Fall 0 (`OR` aller Codes = 15, B überdeckt A): Kopie von A. Fälle a (beide innen: Anfangspunkt), b (beide außen auf derselben Seite: Ecke von A nach dem Code `0101`/`0110`/`1010`/`1001` des Endpunkts), c (Kante schneidet A: Anfangspunkt, wenn innen, dazu die Schnittpunkte mit den Kanten von A aus `IntToBin(p0C OR p1C)`). `Schnittpunkt` kennt nur rechte Winkel. Danach Sortieren im Uhrzeigersinn über `tempKoord` und `SetKoordinates(lapKoord[0], lapKoord[2])`. Auch dass `lapKoord` nicht neu belegt wird und Werte aus dem vorigen Paar behält, ist übernommen.
- **Überlagerungsfläche** (`sumAreas`): Summe von `(Points[3,1] − Points[0,1]) · (Points[1,0] − Points[0,0])` über alle Überlagerungsrechtecke. Mehrfach überlagerte Stellen zählen mehrfach (paarweise Summe).
- **Ergebnis der Prüfung**: Über 2000 Läufe mit je 30 Rechtecken ergab die Fassung 04 immer dieselbe Fläche wie 05 (Test „04 und 05 ergeben dieselbe Überlagerungsfläche“) – wie auf der alten Seite: „Die gleiche Berechnung mittels Cohen-Sutherland-Algorithmus“. Nur bei Berührung trägt 04 zusätzlich ein Rechteck der Fläche 0 ein (in rund zwei von drei Läufen mindestens einmal); die App zeichnet es als blaue Linie.
- **Knöpfe**: „Rechtecke erstellen“, „Überlagerungsflächen“, „Rechtecke löschen“ wie im Original (kurz beschriftet: Erstellen, Flächen, Löschen).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt Delphis `random` ohne Saat. Ein Schritt prüft ein Paar; das jeweils geprüfte Paar ist umrandet (A durchgezogen, B gestrichelt), in Fassung 04 mit den vier Clipcodes an den Ecken von B und den Linien der neun Gebiete um A. Sind alle Paare geprüft, hält der Lauf an; der nächste Schritt (oder Start) erzeugt wie ein weiterer Klick `numbers` neue Rechtecke.
- **Überlagerungen sofort**: Im Original rechnet erst der Knopf „Überlagerungsflächen“, und zwar jedes Mal alle Paare von vorn (bis dahin bleiben die blauen Flächen der letzten Rechnung stehen). Hier läuft die Prüfung mit; nach neuen Rechtecken werden nur die Paare mit einem neuen Rechteck geprüft – die Menge der Überlagerungsrechtecke ist dieselbe. Der Knopf „Überlagerungsflächen“ rechnet alle offenen Paare auf einmal. „Überlagerungen zeigen“ blendet die blauen Flächen aus.
- **Fassung umschalten** behält die Rechtecke und rechnet sie von vorn mit dem anderen Verfahren – so lassen sich beide Ergebnisse vergleichen; in Fassung 04 steht die Fläche nach 05 als Kennzahl daneben.
- **Speicherüberlauf in 04**: `lapKoord` hat vier Plätze; mehr als vier Punkte (im Original ein Schreiben über das Feldende hinaus) würden verworfen. In allen Tests kamen nie mehr als vier Punkte vor. Zu Beginn ist `lapKoord` hier mit Nullen belegt (im Original zufälliger Speicherinhalt).
- **Mausklick und Rechtsklick** sind neu: Klick setzt ein Rechteck mit zufälligen Seiten um den Mauspunkt, Rechtsklick (oder Umschalt-Klick) entfernt das oberste Rechteck an der Stelle, danach werden alle Überlagerungen neu berechnet.
- **`numbers`** setzt die App zurück (im Original wirkte der Regler erst beim nächsten Klick).
- **Farben**: Rot, Blau und Grün etwas gedämpft; Grund schwarz bzw. in heller Darstellung hell, damit beide Darstellungen lesbar sind.
- **Kennzahlen** neu: Rechtecke, Paare geprüft, Anzahl der Überlagerungen, Rechteckfläche gesamt, Zustand. Die Überlagerungsfläche stand auch im Original („Überlagerungsfläche:“).
- **Nicht übernommen**: die unbenutzte Unit `umWandler.pas` und die auskommentierten Umwandlungsfunktionen.
