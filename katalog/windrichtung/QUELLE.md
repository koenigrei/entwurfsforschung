# Quelle · Windrichtung und Luftbelastung

| | |
|---|---|
| Original | Grasshopper-Modul „Wind Direction“ (`WindDirection.gh`, v. 1.0, GhPython-Skript von „MartinD“, 28.04.2020) |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Dennemark |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/WindDirection/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/WindDirection/`: `WindDirection.gh`, `WindDirection.zip`, `WindDirection.gif`, `DownloadData.png`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Verdrahtung (mit Graft/Flatten), Schieberegler (Wert, Bereich), Panels und das GhPython-Skript gelesen; `WindDirection.zip` entpackt (enthält nur `WindDirection.gh` und `DownloadData.png`); nichts ausgeführt |

Das Modul benutzt keine DeCodingSpaces-Komponenten, nur Grasshopper-Standardbausteine und ein kurzes GhPython-Skript. Ein Abgleich mit dem Quelltext der DeCodingSpaces-Toolbox war daher nicht nötig; kein Code übernommen.

## Übernommen

- **Windrose lesen** wie das GhPython-Skript: aus `windFrequencyRose.json` je Eintrag `value` (Häufigkeit) und `center_degrees`; `angles = center_degrees − 180`, dazu die kleinste `center_degrees` (`roseAusJSON`). „Remap Numbers“ bezieht die Häufigkeiten auf den größten Sektor (0…1).
- **Vektoren** „Wind From“ → „Wind To“ zwischen den Parzellenschwerpunkten (Area → Centroid, Vector 2Pt mit Länge); Wind From ist die Parzelle „Parcel Index“ (List Item mit Wrap), Wind To sind alle Parzellen.
- **Sektorprüfung** wie in den Panels der Datei: „check angle to each wind direction“ (Angle, Degrees; Vector A gegraftet, also jede Parzelle gegen jeden Sektor), „check if angle is within wind sector“ (Smaller Than … or Equal to gegen `Sektorbreite · Faktor / 2`), „wind sector * factor, to increase possible wind angle – if angle is between two wind directions, it will take both and calculate average“ (Faktor 1,25, Regler 0…10).
- **Wert je Parzelle**: „create weighted average of wind directions“ – Weighted Average der getroffenen Häufigkeiten mit denselben Häufigkeiten als Gewicht, also `Σ f² / Σ f`. Für die Luftbelastung („multiply with falloff function. pollution gets less over distance“) werden die Häufigkeiten vorher mit `Exp(−0.02·x)` (Panel „Distance Falloff“) der Entfernung multipliziert. Ohne getroffenen Sektor (und für die gewählte Parzelle selbst, Nullvektor) gibt es keinen Wert – Grasshopper färbt sie dann nicht, die App zeigt sie grau wie im Katalogbild.
- **Umschalter** „windDirection: false pollution: true“ (Voreinstellung false = Windrichtung) mit beiden Stream Filtern: Werte und Obergrenze der Farbe („Max“ = 1 bzw. Abfall bei der Reichweite *Falloff Radius* 432, Regler 0…1000).
- **Farben** des Gradient-Bausteins (fünf Griffe #003D59, #009BB4, #94C11C, #F39A00, #B71A49) von 0 bis Max, Werte darüber in der höchsten Farbe.
- **Windrose**: Radial-Raster mit *Extent R* 5 Ringen (Size = 1/5) und so vielen Speichen wie Sektoren, um eine halbe Sektorbreite gedreht; je Sektor ein Keil (Point Cylindrical in einer Ebene mit X = Norden, Y = Osten, also Peilung im Uhrzeigersinn) mit der bezogenen Häufigkeit als Radius, skaliert mit *WindRoseScale* 400 (0…1000); Beschriftung N/O/S/W; Lage der Rose frei wählbar („8. Set location of additional wind rose“).
- **Quick Graph** der Abfallfunktion über `Range(0 … Falloff Radius, 10 Schritte)` als kleiner Graph bei der Luftbelastung.
- **„Flip Wind From and To inputs to do the opposite and see how other parcels pollute the selected one“** als Schalter „Wind From ↔ Wind To tauschen“.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit 59 Parzellenflächen aus einer Rhino-Datei auf einem Gelände. Die App erzeugt mit fester Saat etwa 50 Parzellen (Blöcke eines verzogenen Straßenrasters, `Szenen.stadt`) auf einem Gelände (`Szenen.gelaende`, nur Hintergrund – wie im Original fließt die Höhe nicht in die Rechnung ein). Eine andere Saat ergibt eine andere Szene.
- **Windrose als Beispiel, keine Messdaten**: Das Modul enthält keine `windFrequencyRose.json` (die Datei lag beim Autor lokal; `WindDirection.zip` enthält nur die .gh-Datei und eine Bildanleitung zum Download). Die Daten des Global Wind Atlas (DTU mit der Weltbankgruppe) werden in den Datenkatalogen der Weltbank unter CC BY 4.0 geführt, wären also mit Namensnennung weitergebbar; da aber keine Datei vorliegt und die App keine Daten von fremden Servern abruft, liefert sie drei **selbst festgelegte Beispiel-Windrosen** im Aufbau der Datei mit (`ROSEN` in `modell.js`): „West/Südwest (Weimar-typisch)“ mit 12 Sektoren und Hauptwind aus SW (16 %), „gleichverteilt“ und „Nordost, 16 Sektoren“. Diese Zahlen sind ausgedacht, nicht gemessen. Über den Knopf „JSON…“ lässt sich der Inhalt einer echten `windFrequencyRose.json` einfügen (wird nur im Browser gelesen, nichts übertragen).
- **Sektorbreite = 360° / Zahl der Sektoren**: Das Skript nimmt die kleinste `center_degrees` als Sektorbreite („angle“). Das stimmt nur, wenn die Mitten bei w, 2w, …, 360° liegen; bei Mitten ab 0° (Nordsektor = 0°) wäre die Breite 0 und kein Sektor träfe. Der Aufbau der Datei des Global Wind Atlas war nicht prüfbar (keine Datei im Modul), deshalb rechnet die App mit 360°/n; `roseAusJSON` gibt die kleinste Mitte trotzdem aus (`kleinster`).
- **Wirkrichtung**: In der Datei zeigt Sektor *i* nach `angles + (Regler 180 − angle) = center_degrees − kleinste Mitte`; bei Mitten ab w wäre das die Herkunftsrichtung um einen Sektor versetzt, und die gewählte Parzelle würde Parzellen *im Luv* belasten – im Widerspruch zur Notiz, die Voreinstellung zeige die Belastung *durch* die gewählte Parzelle. Die App rechnet die Richtung, in die der Wind weht, als `center_degrees + Drehung` (Regler „Drehung (Number Slider 180)“, 0…360° statt 0…1000; Voreinstellung 180 = wohin der Wind weht). Die Windrose zeichnet sie wie üblich in Herkunftsrichtung (`center_degrees + Drehung − 180`).
- **Farbskala bei der Belastung**: Die Obergrenze „Max“ ist in der Datei der Abfall bei der Reichweite (`Exp(−0.02·432) ≈ 1,8·10⁻⁴`). Damit erscheinen alle Parzellen mit irgendeinem getroffenen Sektor bis etwa zur Reichweite voll belastet; die Richtung zeigt sich nur am Rand – das ist so im Katalogbild zu sehen und bleibt Voreinstellung. Zusätzlich kann die Farbskala bis zum größten Wert reichen („Farbskala bis: größter Wert“), dann wird die Abhängigkeit von der Windrichtung sichtbar.
- **Abfallfunktion**: Das Panel erlaubt einen beliebigen Ausdruck; die App bietet den Ausdruck der Datei `Exp(−k·x)` mit einstellbarem k (0…0,1, Voreinstellung 0,02).
- **Ringe** *Extent R* ab 1 statt 0 (bei 0 teilt die Datei durch null).
- **Parcel Index**: Regler 0…100 mit Wrap wie in der Datei; zusätzlich wählt ein Klick die Parzelle (statt Index zu suchen). Der Regler bleibt dabei stehen.
- **Abspielen**: Grasshopper hat keinen Zeitablauf. „Start“ addiert die Sektoren nacheinander (in der Reihenfolge der Datei, ab Nord im Uhrzeigersinn); je Sektor laufen „Schritte je Sektor“ (Voreinstellung 6) Schritte, in denen ein Suchkegel (Richtung ± Grenzwinkel) von der gewählten Parzelle wächst. Nach allen Sektoren ist das Ergebnis das der Datei; der Knopf „Alle“ springt dorthin.
- **Die Gruppe „Industry Pollution“** der Datei (Verweis auf eine Industriefläche) ist in der App nicht eigens nachgebildet – jede Parzelle kann Quelle sein.

## Literatur und Daten

- Global Wind Atlas 3.0, Technical University of Denmark (DTU) mit der Weltbankgruppe (World Bank Group, ESMAP), https://globalwindatlas.info/ – Daten laut World Bank Data Catalog unter CC BY 4.0 (https://datacatalog.worldbank.org/search/dataset/0038957); in der App nicht enthalten.
- Davis, N. N., Badger, J., Hahmann, A. N., et al. (2023): The Global Wind Atlas: A high-resolution dataset of climatologies and associated web-based application. *Bulletin of the American Meteorological Society* 104(8), E1507–E1525. https://doi.org/10.1175/BAMS-D-21-0075.1
