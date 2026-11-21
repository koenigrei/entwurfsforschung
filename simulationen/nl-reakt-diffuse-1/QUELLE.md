# Quelle · 03 reakt diffuse

| | |
|---|---|
| Originalprogramm | `reaktDiffuse02.nlogo` („03_reakt diffuse“, 03.01.2005); Fassung `reaktDiffuse03.nlogo` („04_repel and reakt diffuse“, 04.01.2005) |
| Sprache | NetLogo 2.1.0 (Applets auf der alten Website) |
| Autor | Reinhard König; das leak-Verfahren „is taken from a script of paul coates at cesa“ (Paul Coates, CECA, University of East London) |
| Jahr | 2005 (Daten auf der alten NetLogo-Seite „- 050103“ und „- 050104“) |
| Seite der alten Website | Strukturexperimente › Experimente mit NetLogo – https://www.entwurfsforschung.de/alt/Strukturfor/netlogo/reakt_diffuse01.html (04: …/reakt_diffuse02.html) |
| Archivseite | [Strukturexperimente › Experimente mit NetLogo](../../../archiv/strukturexperimente/netlogo/) |
| Quelle im Repo | `alt_inhalte/cache/alt/Strukturfor/netlogo/reaktDiffuse02.nlogo`, `reaktDiffuse03.nlogo` (nur gelesen) |
| Zusammengeführt | `nl-reakt-diffuse-2` aus `bestand.json` ist hier die Fassung „04 repel and reakt diffuse“ (gleiches leak-Verfahren, Keime aus beweglichen turtles statt zufällig) |

## Übernommen

- **setup 03**: `crt seed`, `setxy random(screen-size-x) random(screen-size-y)` (ganzzahlig, über den Rand gewickelt, also gleich verteilt), `stamp green + who`, `die`. Jede turtle hinterlässt die Farbnummer 55 + who.
- **leak** (beide Fassungen): `ask patches [if not boundary [checkdiffuse]]`, danach `ask patches [ifelse boundary [set pcolor white set s1 0] [if s1 > 0 [set pcolor s1]]]`.
- **checkdiffuse**: nur für `pcolor = 0`: `s1 = sum values-from neighbors [pcolor]`, `s2 = count neighbors with [pcolor > 0]`; bei `s2 > 0`: `ifelse (int(s1 / s2) * s2) = s1 [set s1 (s1 / s2)] [set boundary true]`. Weil `white` die Farbnummer 9.9 hat, macht jede Grenze ihre schwarzen Nachbarn ebenfalls zur Grenze; ganzzahlige Mittelwerte verschiedener Farben ergeben eine Mischfarbe. Beides bleibt.
- **setup 04**: `crt density`, `setxy random-int-or-float screen-size-x …`, `while [any? other-turtles-here] [fd 1]` – nacheinander, die noch nicht verteilten turtles stehen dabei am Ursprung; turtles weiß, Form „circle“.
- **attract**: `set heading towardsxy 0 0`, `ifelse (distancexy 0 0) < radius [bk 1] [fd 1]`.
- **repel**: `set closest-turtle min-one-of turtles with [self != myself] [distance myself]`, `set heading towards closest-turtle`, `bk repel-strength` – nacheinander, jede sieht die schon verschobenen; Abstand und Richtung über den Rand (Torus) wie in NetLogo 2.x.
- **stamp-agents**: `ask patches [set boundary false]`, `ask turtles [stamp green + who die]`.
- **Welt** aus dem GRAPHICS-WINDOW: 03 `screen-edge 80` → 161 × 161 Patches, 04 `screen-edge 100` → 201 × 201; Torus.
- **Schieberegler** (SLIDER-Blöcke): `seed` 0–100, 50 (03) · `density` 0–300, 61 · `radius` 0–130, 33 · `repel-strength` 0–5, Schritt 0,2, 0,8 (04).
- **Farben**: NetLogo-Farbnummern über die 14 Grundfarben mit Schattierung (0 schwarz, 5 Grundfarbe, 9,9 weiß); Grenzen weiß, unerreichte Patches schwarz.

## NetLogo-Eigenheiten und ihre Übersetzung

- `ask turtles`/`ask patches` → zufällige Reihenfolge mit der Saat, wo sie zählt (Verteilen, Stempeln, repel); das leak-Verfahren ist von der Reihenfolge unabhängig, weil erst alle rechnen und dann alle färben.
- Koordinaten stetig, Patch eines Punkts = gerundete Koordinate, heading 0 = Norden im Uhrzeigersinn.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt NetLogos Zufall ohne Saat. Der Lauf endet, wenn leak nichts mehr ändert (Kennzahl „fertig bei Schritt“).
- **Eine App, zwei Fassungen** statt zwei Apps; ein Regler „seed (03) · density (04)“ (0–300) für die Zahl der Keime, die Fassung setzt 50 bzw. 61.
- **Ablauf in Fassung 04**: Im Original drückt man die forever-Knöpfe attract und repel (auch beide zugleich, dann wechseln sie sich ab), danach stamp-agents und leak. Hier macht jeder Schritt vor dem Einprägen attract und dann repel (je abschaltbar); stamp-agents gibt es als Knopf und automatisch nach einem Schritt (Regler „stamp-agents nach Schritt“, voreingestellt 150, 0 = nur von Hand). Danach läuft leak.
- **Sonderfälle ohne Laufzeitfehler**: Steht eine turtle genau in der Mitte oder auf ihrer nächsten Nachbarin, behält sie ihre Richtung (NetLogo bricht mit „no heading“ ab). Das Verteilen im setup bricht nach einigen hundert Versuchen ab.
- **Darstellung**: unerreichte Patches in der Flächenfarbe, Grenzen in der Tintenfarbe (dunkel wie im Original: schwarz und weiß; hell umgekehrt); die Farben der Regionen bleiben in beiden Darstellungen.
- **Kennzahlen neu**: Phase, Zahl der Keime, Anteile Regionen und boundary, Zahl der Farben (davon Mischfarben), fertig bei Schritt.
