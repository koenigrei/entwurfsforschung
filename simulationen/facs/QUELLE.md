# Quelle · FACS – Free Agents in Cellular Space

| | |
|---|---|
| Originalprogramme | `01_FACS` („FACS“, 04.05.2005), `02_Swarming` („Einfaches Schwarmverhalten“, 09.05.2005), `03_Swarming` („Schwarmverhalten“, 10.05.2005) – drei Stände desselben Delphi-Projekts `FACS.dpr` (Formular `TMovePlate`, Units `facsSteer.pas`/`.dfm`, `agenten.pas`, ab 02 `cell.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2005 (Datum aus den Dateizeiten der ZIPs und den Angaben „Source - 050504/050509/050510“ der alten Seite) |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi), Anker #FACS, #simpleSchwarm, #Schwarm – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/01_FACS.zip`, `02_Swarming.zip`, `03_Swarming.zip` (nur gelesen; keine .exe ausgeführt), Bilder `01_facs.gif`, `02_swarming.gif`, `03_swarming.gif` |
| Bezug | J. Portugali (2000): *Self-Organization and the City*, Springer (Begriff FACS) |

## Zusammenfassung zu einer App

`schwarm-einfach` (02_Swarming) und `schwarmverhalten` (03_Swarming) sind fachlich Fassungen von `facs` (01_FACS): gleiche Projektdatei, gleiche Oberfläche, gleiche Zellen- und Mausregeln, jeweils um Schwarmregeln erweitert. Sie stehen hier als Auswahl „Fassung“ (`p.fassung` = `"01"`, `"02"`, `"03"`); die Auswahl setzt die Voreinstellungen der jeweiligen Fassung (`Modell.VOR`) und die festen Konstanten aus dem Quelltext (`Modell.FASSUNGEN`). Voreingestellt ist 03, die reichste Fassung.

## Übernommen

- **Feld**: `ImagePaint` 800 × 600 px, Zellenraster 80 × 60 (`cellScal = 10`), Agenten mit ganzzahliger Position (`PositionX/Y: Integer`) und stetigem Bewegungsvektor (`StepX/Y: Double`); Bewegung `Position + round(Step)`. `round` ist Delphis Round (bei genau x,5 zur geraden Zahl), Abstände `distance`/`CalcDistance` gerundet.
- **Create Pts** (`Button_CreateClick`): `NUM_BALLS` Agenten (01: 500, 02/03: 100) mit `random(800)`, `250 + random(50)` – ein waagerechtes Band –, Vektor `random(3) − 1` je Achse. **Delete 100 Pts**: die letzten 100 der Liste.
- **Maus** (`ImagePaintMouseMove`, `ScrollBar1`, `Button2` „Attract/Repel“): Agenten mit `distance < Mouse_Rad` (5–200, Voreinstellung 50) bekommen `Step = Dir · round((Position − Maus) · 0,1)`, `Dir = 1` abstoßen, `−1` anziehen. Sonst `Step + (random(3) − 1) · d` je Achse mit d = 0,11 (01), 0,1 (02), 0,28 (03).
- **Rand**: 01 kehrt den Vektor um, wenn die Position außerhalb 5…795 bzw. 5…595 liegt; 02/03 „Randlos Torus“ setzen die Position auf die Gegenseite, **bevor** der Schritt addiert wird (wie im Original, die Agenten können also kurz über den Rand hinaus).
- **Zellen markieren** (`CheckB_Zellen`; 01 an, 02 aus, 03 an):
  - 01/02 (`lookCell`, `cellStates`, `checkNeighbour`): Zelle unter einem Agenten (`round((Pos − 5) / 10)`) blau (`State 10`), Zellen mit einem solchen Moore-Nachbarn hellblau `RGB(125, 165, 255)`; nur innere Zellen (Schleifen von 1 bis `reih − 2`), jede Runde neu (`limboWorld` wird gelöscht).
  - 03: jede Zelle zählt die Agenten, die auf ihr stehen (`Passed + 1`, höchstens 255) und wird `RGB(Passed, Passed, Passed)`; **Cells Black** setzt alle Zähler auf 0.
- **Swarming** (02/03, `CheckB_Verbind`, `Swarming`, `TBaseShape.NeigborCheck`):
  - Nachbarn sind Agenten mit `CalcDistance < Abstand` (Interaktionsradius 5–200, Voreinstellung 40); 02 sucht nur unter den Agenten mit **höherer Listennummer** (`for K := I + 1`), 03 unter allen.
  - Ist der nächste Nachbar weiter als der Mindestabstand (02 fest 5 px, 03 Regler 1–50, `FormCreate` 8), ist `limbo` der Mittelwert der Nachbarvektoren; sonst `SetRndDir` (02: 0,5, 03: 0,15) und `limbo` bleibt der eigene Vektor.
  - Mischung im Idle-Schritt: 02 `Step = 0,5 · (Step + limbo)`, 03 `Step = 1,0035 · (0,9 · Step + 0,1 · limbo)` („Mischverhältnis und Beschleunigungsfaktor“). Erst danach Maus oder Zufallsänderung.
  - **Sichtfeld** (03, `ScrollBar_Sichtfeld` 10–360°, `FormCreate` 140): `Winkel = |ArcSin(a · b / (|a| |b|))|` in Grad, gezählt wird ein Nachbar bei `Winkel < round(Sichtfeld / 2)`. Weil der Arkussinus des Kosinus genommen wird, ist `Winkel = |90° − φ|` (φ = Winkel zwischen den Bewegungsrichtungen): Bei 140° zählen Nachbarn mit 20° < φ < 160°, gleich und entgegengesetzt laufende nicht. Diese Eigenheit bleibt die Voreinstellung.
  - **freieSicht** (03): ein gezählter Nachbar mit `Winkel < 5` verstellt die Sicht (→ `SetRndDir`). Im Original wird `freieSicht` für jeden K neu auf `true` gesetzt; wirksam ist also nur der letzte Agent der Liste. Übernommen.
- **Linien**: 01 „Verbindungslinien“ (`Connect`, aus): alle Paare mit `distance < 40`, `RGB(70, 70, 70)`; 02 (`Verbinden`, mit Swarming): rote Linie zum nächsten Nachbarn, gezeichnet an den Positionen vor dem Schritt (`oldPos`); 03 „Bewegungsvektoren“ (`BewegVekt`, an): `clLime` von der Position nach `Position − 7 · round(Step)`.
- **Ablauf**: ein Durchlauf von `ApplicationEvents1Idle` = ein Schritt: Swarming (alle Agenten nacheinander, Vektoren werden dabei schon verändert), dann Bewegung aller Agenten in Listenreihenfolge, dann Zellen.
- **Darstellung**: schwarzes Feld mit grünem Zellraster, Agenten als rote Kreise (`Size 3`) mit grünem Rand.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Random` ohne Saat. Zu Beginn sind die Agenten der ersten „Create Pts“ schon da (im Original ist das Feld leer, bis man klickt).
- **Höchstgeschwindigkeit** (neu, 1–20 px je Schritt, Voreinstellung 4): Der Vektor wird nach der Zufallsänderung auf diese Länge begrenzt. In 03 wächst er sonst mit dem Faktor 1,0035 je Schritt ohne Ende (nach 4000 Schritten mehrere tausend Pixel je Schritt, die Agenten fliegen aus dem Rechenbereich); in 01/02 driftet er als Zufallsweg langsam nach oben (Test „Höchstgeschwindigkeit …“). Der Mausstoß wird nicht begrenzt.
- **Maus**: wirkt nur, solange sie über der Zeichenfläche ist (mit dem Finger: beim Ziehen). Im Original blieb die letzte Position wirksam, und vor der ersten Mausbewegung lag sie bei (0, 0) – Agenten in der linken oberen Ecke wurden ohne Zutun abgestoßen. Der Wirkungskreis wird gestrichelt angezeigt.
- **Höchstens 2000 Agenten**; „Delete 100 Pts“ geht nicht unter 0 (im Original wurde die Liste negativ und das Programm brach ab).
- **ArcSin geklemmt**: Rundungsfehler können `a · b / (|a| |b|)` knapp über 1 heben; Delphi bricht dann mit einem Gleitkommafehler ab. Hier wird auf −1…1 begrenzt.
- **Schalter „Winkel mit ArcCos“** (neu, aus): misst das Sichtfeld mit dem Winkel zwischen den Bewegungsrichtungen, wie es die Beschriftung „Sichtfeld in °“ nahelegt. Die übrigen Regeln bleiben.
- **Ein Satz Regler für alle Fassungen**: Mindestabstand ist auch in 02 einstellbar (dort im Original fest 5), Swarming, Interaktionsradius und Sichtfeld wirken nur in den Fassungen, die sie kennen (Gruppenüberschriften „02, 03“ bzw. „03“). In 02 hängt die Anzeige der Nachbarlinien an „Verbindungslinien / Bewegungsvektoren“ statt an „Swarming“.
- **Helle Darstellung**: Feld in `--surface` statt schwarz, Raster blasser, Begehung in 03 als Verdunklung; dunkel wie im Original.
- **Kennzahlen neu**: mittlere Geschwindigkeit, Ausrichtung zum nächsten Nachbarn (Mittel des Kosinus zwischen Agent und nächstem Agenten im Radius), Ordnung des ganzen Schwarms (Länge des mittleren Vektors / mittlere Länge), Anteil markierter bzw. begangener Zellen. Im Original stand nur die Anzahl der Knotenpunkte.
