# Quelle · Sichtbarkeit von Objekten

| | |
|---|---|
| Original | Grasshopper-Modul „Isovist Object Visibility“ (`IsovistObjectVisibility.gh`), v. 1.0 |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Bielik, Ekaterina Fuchkina |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/IsovistObjectVisibility/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/IsovistObjectVisibility/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Verdrahtung, Schieberegler (Wert, Bereich), Farbverläufe und Notizen gelesen, Katalog-GIF angesehen; nichts ausgeführt |

## Übernommen

- **Verfahren** der Verdrahtung: Gebäudeumrisse (obstacles polylines) → Explode → Obstacle Lines der Komponente **Isovist**; deren Ausgang **Obstacle Visibility** (Treffer je Kante) geht in zwei Gruppen:
  - „Normalizing the number of ray hits by the length of the obstacle“: **Length** und **Division** (Treffer ÷ Kantenlänge) → Bounds → **Gradient** → Färbung der Kanten.
  - „Obstacle Visibility Tree“: **Unflatten Tree** (Guide: die Kanten je Gebäude) und Cluster „shift paths“ ordnen die Treffer den Gebäuden zu, **Mass Addition** summiert je Gebäude, **Division** durch die Grundfläche (**Boundary Surfaces** → **Area**) → Bounds → **Gradient** → Färbung der Gebäude.
- **Blickrichtung** wie in der Datei: Unit Y, gedreht (Rotate, Bogenmaß) um „Angle Direction“ – 0 = Norden, gegen den Uhrzeigersinn.
- **Parameter und Voreinstellungen**: Angle Direction 0 (0–6,28 rad), Viewing Range 100 (1–200), Viewing Angle 360 (0–360°), Precision/Rays 360 (1–720).
- **Farbverlauf** beider Gradient-Komponenten: dunkelblau (0, 0, 139) – blau (50, 178, 206) – grün (87, 166, 31) – gelb (255, 215, 0) – rot (255, 0, 0) an den Griffen 0 / 0,034 / 0,098 / 0,198 / 0,561 (darüber rot), gespannt von 0 bis zum größten Wert. Im GIF zu sehen: unsichtbare Gebäude dunkelblau, gesehene gelb bis rot.
- **Isovist** wie in der App „Isovist von einem Punkt“ (`Geo.isovist`; `treffer[i]` ist der Index der getroffenen Kante).

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Gebäuden aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Stadt mit fester Saat (`../_gemeinsam/szenen.js`); die Kirche auf dem Platz ist das letzte Gebäude der Liste.
- **Ganzzahl-Rundung weggelassen**: In der Datei landet „Treffer ÷ Länge“ in einem Integer-Parameter („object visibility normalized Int“) und wird dadurch gerundet; bei kurzen Kanten entstehen so nur wenige Stufen. Die App färbt mit dem ungerundeten Wert – die Rundung wirkt wie ein Nebeneffekt der Parameterwahl, nicht wie Absicht.
- **Teiler wählbar**: Voreinstellung ist die Grundfläche wie in der Datei. Zusätzlich lässt sich durch den Umfang teilen (Treffer je Meter Fassade), weil eine Fläche große Blöcke benachteiligt, deren Tiefe man vom Standpunkt aus gar nicht sieht.
- **Zeitablauf**: Grasshopper hat keinen Zeitablauf; im GIF wird der Standpunkt mit der Maus verschoben. In der App wandert der Standpunkt bei „Start“ einen geschlossenen Rundweg um den Platz entlang (`rundweg`, Straßenmitten ohne Randstraßen, Ecken mit 4 m gerundet); Klick oder Ziehen setzt ihn frei, der nächste Schritt geht vom nächsten Wegpunkt weiter. Rechtsklick stellt die Blickrichtung ein (im Original der Regler).
- **Dunkle Darstellung**: Das Dunkelblau des untersten Griffs ist auf Schwarz kaum zu sehen; dort wird es leicht aufgehellt. Gesehene Kanten bekommen bei gefärbten Gebäuden einen Rand in der Hintergrundfarbe.

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext; kein Code übernommen. Gelesen (23.11.2026) wurde die DeCodingSpaces-Toolbox, GitHub Bauhaus-InfAU/decoding-spaces-toolbox, Lizenz **GPL-3.0**. Aus dem Quelltext und der Doku wurden nur Definitionen, Formeln, Parameter und Randfälle abgelesen und in eigenem Code umgesetzt (diese App steht unter CC BY 4.0).

Wichtig zur Einordnung: Der Quelltext der Komponenten von 2020, die das Katalogmodul benutzt (Legacy „Isovist“ mit Strahlenzahl *Precision*, Legacy „Analysis Grid“), ist verloren. Die Toolbox ist eine Neufassung von 2026 („v2“), aus den alten Binärdateien rekonstruiert. Sie rechnet den Isovist exakt mit einem Winkel-Sweep statt mit Strahlen und gibt die alten Zahlen absichtlich nicht wieder. In `docs/migration.md` und `docs/review-2026-11.md` sind die Fehler der alten Fassung beschrieben: „StdDev“ war eine Summe absoluter Abweichungen, Varianz und Schiefe wurden nicht durch *n* geteilt, `AreaDistWeight` gab die Fläche aus. Die App behält das Verfahren des Moduls (Strahlen, Regler *Precision*) und rechnet die Kenngrößen nach den Definitionen der Toolbox v2; die Fehler der alten Fassung übernimmt sie nicht.

Gelesene Dateien:
- `src/DecodingSpaces.Core/Visibility/Isovist.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Visibility/Isovist.cs)
- `src/DecodingSpaces.Core/Visibility/ObstacleField.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Visibility/ObstacleField.cs)
- `src/DecodingSpaces.Grasshopper/Components/Visibility/VisibilityComponents.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Grasshopper/Components/Visibility/VisibilityComponents.cs)
- `src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyVisibilityComponents.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyVisibilityComponents.cs)
- `docs/visibility.md` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/visibility.md)
- `docs/migration.md` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/migration.md)
- `docs/review-2026-11.md` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/review-2026-11.md)

Obstacle Visibility (LegacyVisibilityComponents.cs, VisibilityComponents.cs, docs/migration.md) – alt → jetzt:

- **Strahlen zählen**: Die Legacy-Komponente „Isovist“, die die .gh-Datei benutzt, zählte je Hinderniskante die Strahlen, die auf ihr enden; das bleibt die Voreinstellung (Maß „Strahltreffer (Original)“).
- **Neues Maß in der Toolbox v2**: Sie gibt stattdessen die sichtbare Länge jeder Kante in Metern aus („Obstacle Visibility is now the visible length of each obstacle in metres, not a number of rays“). Die App bietet das jetzt als zweites Maß an („sichtbare Länge (Toolbox v2)“). Mit Strahlen genähert: Zwei Nachbarstrahlen auf derselben Kante tragen den Abstand ihrer Trefferpunkte bei.
- **Normierung**: Mit diesem Maß wird „÷ Länge“ zum sichtbaren Anteil der Kante (0–1), „÷ Umfang“ zum sichtbaren Anteil der Fassade.
- **Strahlstatistik**: Kenngrößen wie in der App „Isovist von einem Punkt“; hier zeigt die App nur die Fläche.
- **Grafit** (GitHub Bauhaus-InfAU/Grafit, MIT): `examples/rhino/Python F13 Isovist 3D.py` zählt beim 3D-Isovist ebenfalls Strahlen je Hindernis (`SumRaysPerObstacle`). Das stützt die Zählung der alten Komponente; für den 2D-Isovist enthält das Beispiel keine weiteren Definitionen.

## Literatur

- Benedikt, M. L. (1979): To take hold of space: isovists and isovist fields. *Environment and Planning B* 6(1), 47–65. https://doi.org/10.1068/b060047
- Turner, A., Doxa, M., O'Sullivan, D., Penn, A. (2001): From isovists to visibility graphs. *Environment and Planning B* 28(1), 103–121. https://doi.org/10.1068/b2684
