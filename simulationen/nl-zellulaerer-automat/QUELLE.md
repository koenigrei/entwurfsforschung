# Quelle · 02 Zellulärer Automat

| | |
|---|---|
| Originalprogramm | `celluAutomata03.nlogo` („02_cellular Automata“, 02.01.2005); Fassung `CA_buildingStructure.nlogo` („12_Buildings Structure“, 06.02.2007) |
| Sprache | NetLogo 2.1.0 bzw. 3.0.2 (Applets auf der alten Website) |
| Autor | Reinhard König |
| Jahr | 2005 (Datum auf der alten NetLogo-Seite „- 050102“); Fassung 12: 2007 („- 070206“) |
| Seite der alten Website | Strukturexperimente › Experimente mit NetLogo – https://www.entwurfsforschung.de/alt/Strukturfor/netlogo/CA01.html (12: …/CA_buildingStructureA.html) |
| Archivseite | [Strukturexperimente › Experimente mit NetLogo](../../../archiv/strukturexperimente/netlogo/) |
| Quelle im Repo | `alt_inhalte/cache/alt/Strukturfor/netlogo/celluAutomata03.nlogo`, `CA_buildingStructure.nlogo` (nur gelesen) |
| Zusammengeführt | `nl-gebaeudestruktur` aus `bestand.json` ist hier die Fassung „12 Buildings Structure“ (gleicher Code mit geänderter Todesregel, anderen Voreinstellungen und Kennzahlen) |

## Übernommen

- **„to go“** (`schritt`): erst `ask patches [set counter sum values-from neighbors [state]]`, dann `ask patches [ifelse state = 1 [Tod?] [Geburt?]]` – also synchron; `neighbors` = acht Patches, Rand als Torus.
- **Todesregel 02**: `if counter >= genA and counter <= genB [cell-death]`; **Todesregel 12**: `if counter >= genA or counter <= genB [cell-death]`; **Geburt** (beide): `if counter >= genC and counter <= genD [cell-birth]`.
- **setup-random**: `ifelse random-float 1.0 < initial-density [cell-birth] [cell-death]`; **setup-blank**: alle leer, `ask patch 0 0 [cell-birth]`.
- **Welt** aus dem GRAPHICS-WINDOW: 02 `screen-edge 40` → 81 × 81 Patches (Patchgröße 6), 12 `screen-edge 20` → 41 × 41 (Patchgröße 10).
- **Schieberegler** (SLIDER-Blöcke): `initial-density` 0–1, Schritt 0,01 · `genA`, `genB`, `genC`, `genD` je 0–8. Voreinstellungen 02: 0,01 · 1 · 8 · 1 · 8; 12: 0,5 · 7 · 0 · 1 · 3.
- **Kennzahlen aus 12** (`calc-ratio`, MONITOR): `greens` (state 0), `blues` (state 1), `ratio` = greens / blues, `ratio-blue` = blues / alle Zellen. Die Namen stammen aus den ursprünglichen Farben (lime/blue), die im Code schon auskommentiert sind.
- **Farben**: 02 besetzt weiß auf schwarz, 12 besetzt schwarz auf weiß.

## Eigenheiten, die bleiben

- **Regeltext und Code**: Kommentare und Info-Text beschreiben genA als „Mindestzahl der Nachbarn zum Überleben“ und genB als „Höchstzahl, über der die Zelle stirbt“. Der Code tötet aber eine Zelle, deren counter **zwischen** genA und genB liegt. Übernommen ist der Code – er erzeugt das Labyrinth vom Bild der alten Seite. In Fassung 12 passt die „oder“-Regel zur Beschreibung, wenn man genA als Überfüllung und genB als Vereinzelung liest.
- Der Info-Text nennt in beiden Fassungen „state 0 = schwarz, state 1 = weiß“; in 12 sind die Farben im Code vertauscht.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt NetLogos Zufall ohne Saat. „Zurück“ = das gewählte setup; ein Schritt = ein `go`.
- **Eine App, zwei Fassungen**: Die Auswahl „Fassung“ setzt Todesregel, Voreinstellungen und Weltgröße der Fassung; alle Regler bleiben frei kombinierbar. Die Todesregel („und“/„oder“) ist zusätzlich einzeln wählbar, die Weltgröße als Regler `screen-edge` (5–60).
- **Zellen per Maus setzen** (Klick) und löschen (Rechts- oder Umschalt-Klick) – im Original nicht vorhanden; nützlich, um Muster von Hand zu stören.
- **Farben über die Darstellung**: besetzte Zellen in der Tintenfarbe, leere in der Flächenfarbe. Dunkel entspricht das Fassung 02 (weiß auf schwarz), hell Fassung 12 (schwarz auf weiß).
- **Kennzahlen** in beiden Fassungen, dazu neu „Schritte (go)“ und „geändert im letzten Schritt“ (zeigt, ob das Muster zur Ruhe gekommen ist – in 12 nach wenigen Schritten, in 02 nie).
