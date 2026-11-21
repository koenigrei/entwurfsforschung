# Quelle · 07 wegesystem B

| | |
|---|---|
| Originalprogramm | `wegesystem02direction.nlogo` („07_wegesystem B“, 18.02.2005); Option aus `wegesystem04.nlogo` („09_wegesystem B update 1“, 09.03.2005) |
| Sprache | NetLogo 2.1 (Applet auf der alten Website) |
| Autor | Reinhard König |
| Jahr | 2005 |
| Seite der alten Website | Strukturexperimente › Experimente mit NetLogo – https://www.entwurfsforschung.de/alt/Strukturfor/netlogo/wegesystem2.html (update 1: …/wegesystem3.html) |
| Archivseite | [Strukturexperimente › Experimente mit NetLogo](../../../archiv/strukturexperimente/netlogo/) |
| Quelle im Repo | `alt_inhalte/cache/alt/Strukturfor/netlogo/wegesystem02direction.nlogo`, `wegesystem04.nlogo`, zum Vergleich `wegesystem01.nlogo` (nur gelesen) |

## Übernommen

- **Regel „to go“, je turtle** (`bewegeTurtle`):
  1. Markierung der drei Patches vor der turtle lesen: `patch-left-and-ahead (45 − i · 45) 1` für i = 0, 1, 2 → schräg links, geradeaus, schräg rechts; jeweils `· path-attract` (`markTemp`).
  2. Kumulierte Liste `mV = [33 + m₀, 66 + m₀ + m₁, 99 + m₀ + m₁ + m₂]`, skaliert mit `100 / (markEnt + 100)` (`bereiche`).
  3. `randV = random-float 100`; die ifelse-Kette mit strengen Vergleichen: `0 < randV < mV₀` → `heading − 45`, `mV₀ < randV < mV₁` → geradeaus, `mV₁ < randV < mV₂` → `heading + 45`. Trifft nichts (Rest über `mV₂`, anfangs 1 %, oder genau eine Grenze), bleibt die Richtung (`wahl`).
  4. `if mark-of patch-here < max-mark [mark + mark-strenght]` – auf dem Patch, auf dem die turtle **vor** dem Schritt steht; danach `fd 1`.
- **Regel „to go“, Patches** (`verfall`): `mark − decrease-per-tick`, nicht unter 0; danach `ticks + 1` (Kennzahl „Clock (ticks)“).
- **Farbe**: `pcolor = 9.999 − mark · 10 / (max-mark + mark-strenght)`, d. h. Grauwert linear von weiß (mark 0) bis schwarz (`grau`).
- **setup**: alle Patches weiß, `cct num-turtles` am Ursprung, `set heading random 360` (ganze Grad), `fd random 10 + 20` → Ring mit Radius 20–29 um die Mitte; turtles rot (`color 15`).
- **Welt** aus dem GRAPHICS-WINDOW: `screen-edge-x/y 50` → Patches −50…50, 101 × 101; Rand als Torus (in NetLogo 2.x immer).
- **Schieberegler** (Min, Max, Wert, Schritt aus den SLIDER-Blöcken): `num-turtles` 0–500, 100, 1 · `path-attract` 0–50, 50, 0,1 · `mark-strenght` 0–50, 10,8, 0,2 · `max-mark` 0–100, 100, 1 · `decrease-per-tick` 0–0,5, 0,2, 0,01. Schreibweise `mark-strenght` wie im Original.
- **Aus „B update 1“ (`wegesystem04.nlogo`)**, wählbar über „Fassung“:
  - setup mit `set heading 0` ohne `fd` (alle turtles in der Mitte, nach Norden),
  - Voreinstellungen `path-attract` 20 (Regler dort 0–20), `mark-strenght` 5, `decrease-per-tick` 0,11, `show-mark-over` 20,
  - Regler `show-mark-over` 0–100: `ifelse mark > show-mark-over [Grauwert] [weiß]` (in Fassung B steht er auf 0 – dann gleich wie das Original B),
  - Wege einzeichnen: `if mouse-down? [set mark-of patch-at mouse-xcor mouse-ycor 100]`.

## NetLogo-Eigenheiten und ihre Übersetzung

- **Koordinaten**: turtles haben stetige Koordinaten (`Float64Array` x, y); Patchmitten liegen auf ganzen Zahlen, der Patch eines Punkts ist die gerundete Koordinate (`patchKoord`, ⌊x + 0,5⌋ im Torus [−50,5; 50,5)). Im Feld liegen die Zeilen von oben (pycor 50) nach unten, damit das Bild direkt gezeichnet werden kann (`index`).
- **heading** in Grad, 0 = Norden, im Uhrzeigersinn: `dx = sin(heading)`, `dy = cos(heading)` (Tabelle für 0–359°). Weil `heading random 360` beliebige ganze Grad liefert und danach nur ±45° dazukommen, hat jede turtle ihr eigenes Richtungsraster. Diagonal (z. B. 45°) kommt eine turtle mit `fd 1` nur 0,71 Patches je Achse voran und bleibt dabei manchmal im selben Patch – so markiert sie diagonal dichter als ein Weg Patch für Patch. Das bleibt bewusst erhalten (Test „diagonal …“).
- **`random n`** → `zufall.ganz(n)`, **`random-float 100`** → `zufall() · 100`, mit fester Saat.
- **`ask turtles`** → alle turtles nacheinander, je tick in zufälliger Reihenfolge (Fisher-Yates mit der Saat), jede turtle sieht die Markierungen der vorigen; danach `ask patches`.
- **`ticks`/Clock** → `z.t`; ein Klick auf „Schritt“ = ein `go`.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt NetLogos Zufall ohne Saat. „Zurück“ = `setup`.
- **Fassung B update 1 als Option** statt eigener App (siehe `bestand.json`, `nl-wegesystem-b-update`). Die Auswahl startet neu und setzt die Voreinstellungen der Fassung; die Regler behalten die Bereiche von B (path-attract bis 50).
- **Wege einzeichnen** geht in beiden Fassungen und auch im angehaltenen Zustand. Das Original setzte nur einmal je tick den Patch unter der Maus; hier wird die Linie seit dem letzten Mauspunkt lückenlos auf mark 100 gesetzt (bei schneller Maus entstünden sonst Lücken).
- **Dunkle Darstellung**: Grauwerte umgekehrt (Wege hell auf dunkel); hell wie im Original (weiß → schwarz, Fläche in `--surface`).
- **turtles** als kleine rote Pfeile (Form „default“), abschaltbar („turtles zeigen“).
- **Kennzahlen neu** (nicht im Original): Anteil markierter Patches, Wege (mark ≥ max-mark/2), Anteil der turtles auf Wegen, Orthogonalität (von den Wegepatches in geraden Dreierlinien der Anteil waagerechter/senkrechter statt diagonaler; zufällig verteilt ≈ 0,5). Mit den Voreinstellungen steigt sie in einigen tausend ticks von ≈ 0,7 auf ≈ 0,8 – das „relativ orthogonale Hauptwegesystem“ der Beschreibung; Tests und `pruef_ausdruck` prüfen das.
