# Quelle · Wachstum im Diffusionsfeld

| | |
|---|---|
| Originalprogramm | `31_diffusionGrowth` („Growth in a Diffusion-Field“, Projekt `ZA03_diffusion.dpr`, Units `CellForm.pas`, `cell_P.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2006 – Programmkopf „January 2006, Last Update Jan-28, 2006“; neueste Quelltextdatei im ZIP `CellForm.pas`/`.dfm` vom 01.03.2006; Download auf der alten Seite „Source - 060305“ |
| Vorbild | Michael Batty: *Cities and Complexity* (2005), Kapitel 3 |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi) – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm#diffuseGrowth |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/31_diffusionGrowth.zip` (nur gelesen; die .exe wurde nicht ausgeführt) |
| Fassungen | In `bestand.json` als Duplikat geführt: `06_growth.exe` der „Stadt der Agenten“ (gleiches Modell, ohne Quelltext) |

## Übernommen

- **Ablauf je Schritt** aus `TForm1.Timer1Timer`: `ageCheck` → `infl_Field` → zweimal `equiPot` → `dev_Cell` → `paint_Field`/`plot` → `steps + 1`.
- **infl_Field** (`einfluss`): jede Zelle mit `dist > rDist + rSize · cellScal` bekommt `Pot := 1`. `dist` = gerundete Entfernung der Zellmitte zur Mitte (Zelle 50, 50) in Bildpunkten, `rDist` = größte `dist` einer entwickelten Zelle (Start: `cellScal` = 4), `rSize` = „Sphere of Influence“ in Zellen.
- **equiPot** (`ausgleich`): für jede unentwickelte Zelle `limboPot := Σ Pot` der vier von-Neumann-Nachbarn `/ 4` (Torus, Reihenfolge K/I+1, K/I−1, K+1/I, K−1/I), dann für alle Zellen `Pot := limboPot` – also gleichzeitig. Entwickelte Zellen behalten `limboPot = 0` (gesetzt in `dev_Cell`) und haben damit `Pot = 0`.
- **dev_Cell** (`entwickle`): unter allen Zellen mit `state = 0` und mindestens einem entwickelten von-Neumann-Nachbarn (`checkNei`) die mit dem größten `Pot + random · noise`; Suche zeilenweise von oben links, strenger Vergleich `>` (bei Gleichstand gewinnt die erste). Die Zelle bekommt `state 1`, `Pot 0`, `birth := steps`; `rDist` wächst mit.
- **ageCheck** (`altern`, nur mit „activate aging“): `age := steps − birth`; `age > die with age` → `age 0`, `Pot 0`, `state 0`.
- **Feld**: ZeichenPanel 404 × 404 px, `cellScal 4` → 101 × 101 Zellen, Torus; eine Saat in Zelle (50, 50) (`round(101/2)` rundet in Delphi auf die gerade Zahl 50).
- **Parameter und Voreinstellungen** aus `CellForm.dfm`: „Sphere of Influence“ 20, „Noise“ 5, „activate aging“ aus, „Die with age“ 500. Das Original hat Eingabefelder ohne Grenzen; die Regler hier: R 1–60, Noise 0–50, Die with age 10–1000.
- **Halt** bei `steps = Die with age` (wie im Original, dort zugleich Abbruchbedingung und Achsenlänge des Diagramms); erneutes Start läuft weiter.
- **Grauwerte** aus `paint_Field`: entwickelte Zellen `0,5 · age` (schwarz, mit aging heller werdend), übrige `(Pot + 0,5) · 170` – dunkelgrau bei P = 0 bis weiß bei P = 1.
- **Diagramm** „number of developed cells“ (RChart1, rote Linie, y bis 600, x bis „Die with age“) als Option „Verlauf zeigen“.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`. Das Original rief `Randomize` in `dev_Cell` sogar für jede Zelle neu auf (Saat aus der Systemuhr); hier liefert eine Zufallsfolge mit fester Saat die Werte.
- **Altern nur für entwickelte Zellen**: `ageCheck` lief im Original über alle Zellen; weil unentwickelte Zellen `birth = 0` haben, hätte es nach „die with age“ Schritten das Potential des ganzen Feldes in jedem Schritt auf 0 gesetzt. Das ist ein Programmfehler, kein Teil des Modells.
- **Mit „activate aging“ kein Halt**: Im Original endete der Lauf genau bei Schritt = „Die with age“ – das Altern konnte so nie wirken. Mit eingeschaltetem Altern läuft die App weiter (Pause von Hand).
- **Keine Randzelle über 0**: Ist kein `Pot + ε` größer als 0 (nur bei noise 0 ganz am Anfang möglich), griff das Original auf eine nicht gesetzte Position zu. Hier wird dann die erste Randzelle entwickelt; gibt es gar keine (alle Zellen gestorben), wächst nichts.
- **Dunkle Darstellung**: weißer Cluster, Feld von schwarz (P = 0) bis mittelgrau (P = 1), damit der Cluster sich abhebt; hell wie im Original.
- **Diagramm** ist voreingestellt aus (die Kurve ist ohne Altern eine Gerade, eine Zelle je Schritt); die y-Achse wächst über 600 hinaus mit.
- **Kennzahlen neu**: Clusterradius (rDist in Zellen), Rand der Sphere of Influence (Radius + R) und Dichte = entwickelte Zellen / Kreisfläche mit dem Clusterradius. Sie zeigt den Satz der Beschreibung „unterschiedlich dichte oder lineare Strukturen“: Voreinstellung ≈ 0,1, noise 0,5 ≈ 0,04, noise 50 ≈ 0,4 (Tests und `pruef_ausdruck` prüfen das).
- Nicht übernommen: die ungenutzten Felder des Formulars (`AgentList`, `limboWorld`, `probab`) und die Unit `Cell.pas`/`agenten.pas`/`Node.pas`, die das Programm nicht verwendet.
