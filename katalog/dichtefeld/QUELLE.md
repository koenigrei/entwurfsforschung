# Quelle · Dichtefeld

| | |
|---|---|
| Original | Grasshopper-Skript „Building coverage Density“ (`GSI Density Grid_2018-12-05.gh`) |
| Eintrag | „Discovering Cities Workshop \| Amman“ im DeCodingSpaces Lab – https://toolbox.decodingspaces.net/discovering-cities-workshop-amman/ |
| Art | Workshop (DAAD-Projekt, German Jordanian University, SABE, Amman), 5. Dezember 2018 |
| Autorinnen und Autoren | DeCodingSpaces / Bauhaus-Universität Weimar (die Workshopleitung ist auf der Seite nicht namentlich genannt) |
| Download | http://decodingspaces-toolbox.org/wp-content/uploads/2018/12/DiscoverignCities/GSI%20Density%20Grid_2018-12-05.gh |
| Lizenz des Originals | Die Seite nennt keine Lizenz. Die DeCodingSpaces Toolbox, zu der die übrigen Workshop-Dateien gehören, steht heute unter GPL-3.0 (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox); dieses Skript benutzt nur Grasshopper-Standardkomponenten. Diese App ist eine Neuumsetzung, kein Code übernommen; sie steht unter CC BY 4.0. |
| Gelesen | `.gh` in XML gewandelt; Komponenten, Verdrahtung, Schieberegler (Wert, Bereich) und Farbverlauf gelesen; nichts ausgeführt |

## Übernommen

- **Verfahren** der Komponentenkette: „Divide Domain²“ + „Isotrim“ teilen die Analysefläche in U × V Zellen (U = Länge der ersten Kante / *Grid X Dimension*, V = Länge der zweiten Kante / *Grid Y Dimension*, als ganze Zahl); „Area“ liefert Mittelpunkt jeder Zelle sowie Grundfläche und Schwerpunkt jedes Gebäudeumrisses; „Distance“ → „Smaller Than“ (streng kleiner als der Suchradius) → „Cull Pattern“ → „Mass Addition“ summiert die Grundflächen; „Square“ · „Pi“ → „Division“: `GSI = Σ Grundflächen / (π · R²)`.
- **Parameter und Voreinstellungen**: Grid X Dimension 50, Grid Y Dimension 50 (Regler 0…100), Search Redius 150 (0…1000; Schreibweise des Reglers).
- **Farbverlauf** der Komponente „Gradient“ mit den fünf Griffen der Datei (dunkles Petrol 0/61/89, 0/155/180, Grün 148/193/28, Orange 243/154/0, Rot 183/26/73 bei 0, 0,25, 0,5, 0,75, 1; nicht linear), Bereich 0…1 (Lower/Upper limit 0 und 1 wie in der Datei).
- **Eigenheiten**: Es zählt der Schwerpunkt, nicht der Flächenanteil im Kreis – ein großes Gebäude zählt ganz oder gar nicht, bei kleinem Radius kann der Wert über 1 liegen. Am Rand ragt der Kreis über das Gebiet hinaus und der Wert fällt ab. Beides wie im Original.

## Bewusst geändert

- **Beispielstadt statt Rhino-Modell**: Das Skript rechnet mit den Gebäudeumrissen des Rhino-Modells von Jabal Al Hussain (Amman), das die App nicht übernimmt. Sie erzeugt eine Stadt von 1000 × 700 m mit fester Saat (Straßenraster und Blöcke aus `../_gemeinsam/szenen.js`); der Blockrand ist zur Mitte hin tiefer und geschlossener, nach außen flacher, lückenhafter und mit Grünflächen, einzelne Blöcke im Zentrum sind ganz bebaut. So entsteht ein Dichtegefälle, an dem der Einfluss des Radius sichtbar wird. Andere Saat, andere Stadt.
- **Zweiter Radius zum Vergleich**: Im Original gibt es einen Radius; die App zeigt auf Wunsch (Voreinstellung) eine zweite Karte mit eigenem Radius (400 m) daneben, weil der Workshoptext gerade die Abhängigkeit vom Radius betont („The setting of the diameter influence if the density captures just close surrounding area of given location or larger neighborhood“).
- **Reglerbereiche**: Zellmaß ab 5 m und Radius ab 10 m statt ab 0 – bei 0 teilt die .gh-Datei durch null.
- **Rundung der Zellzahl**: Grasshopper wandelt die Kommazahl Länge / Zellmaß beim Eingang „U Count“ in eine ganze Zahl; die App rundet (mindestens 1 Zelle). Die Zellen sind daher nicht genau 50 m groß, sondern Länge / Zellzahl (bei 1000 m: 20 Zellen zu 50 m, bei 700 m: 14 Zellen zu 50 m).
- **Ablauf und Klick**: Grasshopper rechnet alles auf einmal. „Start“ rechnet Zeile für Zeile (ein Schritt = eine Rasterzeile, beide Radien), ein Klick auf eine Zelle zeigt den Suchkreis, die gezählten Gebäude und die Rechnung. Ein geänderter Radius rechnet die fertigen Zeilen sofort neu, ein geändertes Zellmaß beginnt von vorn.
- **Farbskala wahlweise bis zum größten Wert** (Auswahl „Farbskala“), weil die GSI-Werte einer Stadt selten über 0,6 liegen; Voreinstellung bleibt 0…1 wie in der Datei.
- **Nicht übernommen**: die beiden anderen Workshop-Skripte (Straßenzentralität R600/Rn, Verhalten gegen Zentralität mit R) – die Zentralität zeigen die Apps „Straßenhierarchie“ und „Kürzester Weg“, für die Regression fehlen echte Zählungen.

## Literatur

- Berghauser Pont, M., Haupt, P. (2010): *Spacematrix: Space, Density and Urban Form*. NAi Publishers, Rotterdam (GSI als Kennwert der Bebauungsdichte).
