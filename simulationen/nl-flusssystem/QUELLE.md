# Quelle · 08 flusssystem

| | |
|---|---|
| Originalprogramm | `05_wegesys_attrakt.nlogo` („08_flusssystem“, 26.02.2005), nach einer Arbeit von Tomor Elezkurtaj (iemar, TU Wien) |
| Sprache | NetLogo 2.1 (Applet auf der alten Website) |
| Autor | Reinhard König |
| Jahr | 2005 (Datum aus der Liste auf netLogo.htm: „08_flusssystem - 050226“) |
| Seite der alten Website | Strukturexperimente › Experimente mit NetLogo – https://www.entwurfsforschung.de/alt/Strukturfor/netlogo/flusssystem.html |
| Archivseite | [Strukturexperimente › Experimente mit NetLogo](../../../archiv/strukturexperimente/netlogo/) |
| Quelle im Repo | `alt_inhalte/cache/alt/Strukturfor/netlogo/05_wegesys_attrakt.nlogo` (nur gelesen), Bild `archiv_medien/strukturexperimente/08_fluss.gif` |

## Übernommen

- **setup**: `ca`, `deletePath` (alle Patches weiß), `crt density`, `setxy random-int-or-float screen-size-x random-int-or-float screen-size-y` → ganzzahlige Zufallskoordinaten 0…200, im Torus über das ganze Feld verteilt; turtles schwarz, Form „circle“. Zielpunkt `hx`, `hy` anfangs (0, 0) (Globale ohne Wert).
- **attract** (`attract`):
  1. `ask turtles [set ownDist distancexy hx hy]` – erst für alle.
  2. Je turtle `goto-turtle = min-one-of (turtles with [self != myself] with [ownDist < value-from myself [ownDist]]) [distance myself]` (`naechsteNaeher`, bei Gleichstand die erste).
  3. Ist es `nobody`: `set heading towardsxy hx hy`, `if distancexy hx hy > point-dist [makeStep]`; sonst `set heading towards goto-turtle`, `if distance goto-turtle > point-dist [makeStep]`.
  4. `makeStep`: `fd 1`, mit `leavePath` `stamp orange` (in NetLogo 2.x färbt `stamp` den Patch unter der turtle).
- **repel** (`repel`): `closest-turtle = min-one-of other turtles [distance myself]`, `set heading towards closest-turtle`, `bk repel-strength`.
- **Maus**: `if mouse-down? [set hx mouse-xcor set hy mouse-ycor]` – Klicken oder Ziehen setzt den Zielpunkt.
- **deletePath** als Knopf.
- **Welt** aus dem GRAPHICS-WINDOW: `screen-edge-x/y 100` → Patches −100…100 (201 × 201), Rand als Torus; `distance`, `distancexy`, `towards` rechnen wie in NetLogo 2.x über den Rand. Patch eines Punkts = gerundete Koordinate.
- **Schieberegler und Schalter** (aus den SLIDER/SWITCH-Blöcken): `density` 0–500, 146 · `point-dist` 0–10, 3 · `repel-strength` 0–3, 0,2, Schritt 0,1 · `leavePath` an.
- **Farben**: Patches weiß, Spur orange (NetLogo-Farbe 25), turtles schwarz.

## NetLogo-Eigenheiten und ihre Übersetzung

- **turtles** haben stetige Koordinaten (`Float64Array`), Schritt = Einheitsvektor zum Gegenüber auf dem kürzesten Weg im Torus.
- **`ask turtles`** → alle turtles nacheinander, je tick in zufälliger Reihenfolge (Fisher-Yates mit der Saat); jede sieht die schon bewegten Vorgänger, aber die zu Beginn berechneten `ownDist` (wie im Original, wo `ownDist` in einem eigenen `ask` vorab gesetzt wird). NetLogo 2.x ließ `ask` quasi gleichzeitig laufen; das ändert die Bilder nicht wesentlich.
- **forever-Knöpfe** `attract` und `repel` → Schalter; ein „Schritt“ = ein Durchlauf von attract (und repel, wenn eingeschaltet). Ein tick-Zähler kommt hinzu.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt NetLogos Zufall ohne Saat. „Zurück“ = `setup`.
- **Keine Laufzeitfehler bei gleicher Position**: `towards` auf eine turtle an derselben Stelle bricht in NetLogo mit einem Fehler ab (möglich bei `point-dist` 0 oder nach repel); hier macht die turtle dann keinen Schritt. `repel` mit nur einer turtle (`nobody`) tut nichts.
- **Zielpunkt sichtbar** als Ring in der Akzentfarbe (Radius `point-dist`, mindestens 2 Patches); im Original war er unsichtbar.
- **Dunkle Darstellung**: Fläche dunkel, turtles hell, Spur orange wie im Original; hell wie im Original. turtles mindestens 3 Bildschirmpixel groß.
- **Kennzahlen neu** (nicht im Original): ticks; Anteil angekommener turtles (Gegenüber höchstens `point-dist` entfernt – dann bleibt sie stehen); mittlerer Abstand zum Ziel; Anteil oranger Patches; **Bündelung** = 1 − orange Patches / Summe der Abstände aller turtles zum Ziel beim Setzen des Ziels (0: jede ginge allein geradeaus, nahe 1: wenige gemeinsame Stränge). Mit den Voreinstellungen ≈ 0,7, mit mehr turtles höher. Nach `deletePath` bezieht sie sich nur auf die neuen Spuren. Tests und `pruef_ausdruck` nutzen sie.
