# Rezept: eine App des Parametric Planning Catalogue

Die Module des [Parametric Planning Catalogue](https://infar-buw.github.io/parametric-planning-catalogue/) (DecodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020, MIT-Lizenz; Quellen https://github.com/infar-buw/parametric-planning-catalogue) werden als Web-Apps neu umgesetzt. Es gilt sinngemäß `../simulationen/REZEPT.md`; hier nur die Unterschiede.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `bestand.json` | alle 27 Module mit Status (`umgesetzt`, `in_arbeit`, `naechste_runde`, `nicht_umgesetzt` + `grund` DE/EN), App-id, Tags, Autoren, Katalogadresse |
| `_gemeinsam/geo.js` | Geometrie und Graphen (Polygone, Isovist, Voronoi, Netze, Dijkstra, Floyd–Warshall, Betweenness, Segmentgraph) – mit Tests in `_gemeinsam/test/` |
| `_gemeinsam/szenen.js` | Beispielszenen mit fester Saat: Stadt (Straßen, Blöcke, Gebäude, Platz, Kirche) und Gelände (Höhenraster) |
| `_gemeinsam/karte.js` | Zeichenhilfen: Farbskalen, Polygone, Pfeile, Gelände mit Schummerung und Höhenlinien |
| `_vorlage/` | Vorlage einer App; `python katalog/neue_app.py <app-id>` legt eine an (Eintrag mit `"app"` in bestand.json nötig) |
| `pruefe_apps.py` | Browserprüfung (dunkel/hell, 1440/390 px) und Kachelbilder; ohne Argumente alle Apps und Mosaik `bilder/parametric-planning-catalogue.png` |
| `<app-id>/` | eine App wie in den Frühen Simulationen (modell.js ohne DOM + Tests, app.js, index.html, app.json, QUELLE.md, README.md, AGENTS.md, LICENSE.md) |

Die Apps nutzen den Rahmen der Frühen Simulationen über `../../simulationen/_gemeinsam/` (sim.js, sim.css, zufall.js) – dieselbe Tiefe im Repo und auf der Website (`lab/parametric-planning-catalogue/<app>/` → `lab/simulationen/_gemeinsam/`). `quellcode.zip` enthält deshalb `katalog/<app>/`, `katalog/_gemeinsam/` und `simulationen/_gemeinsam/`.

## Quellen lesen

`.gh`-Dateien sind binär. Mit der GH_IO.dll einer Rhino-Installation lassen sie sich ohne Rhino in XML (`.ghx`) wandeln (PowerShell: `Add-Type -Path "C:\Program Files\Rhino 8\Plug-ins\Grasshopper\GH_IO.dll"`, dann `GH_IO.Serialization.GH_Archive` → `ReadFromFile` → `Serialize_Xml`). Daraus: Schieberegler (Wert, Bereich), Wertelisten, Notizen, Verdrahtung, C#-/Python-Skripte. Die DeCodingSpaces-Komponenten sind kompiliert; ihr Verfahren wird nach Beschreibung, Parametern, Notizen und GIF nachgebildet und in `QUELLE.md` offen benannt. Downloads nur außerhalb des Repos, nichts davon einchecken.

## Unterschiede zu den Frühen Simulationen

- Originalzeile und Link führen zum Katalogeintrag (`https://infar-buw.github.io/parametric-planning-catalogue/docs/<Modul>/`), nicht ins Archiv.
- `LICENSE.md` nennt CC BY 4.0 für die Neuumsetzung und die MIT-Lizenz des Katalogs (und ggf. weiterer Vorbilder, z. B. polysplit MIT, Gismo GPL-3 – dann keinen Code übernehmen).
- Grasshopper hat keinen Zeitablauf: Ein „Schritt“ ist ein Rechenschritt des Verfahrens (ein Schnitt, ein Ursprung der Betweenness, ein Abschnitt der Fließwege …); Regler und Klick rechnen wie in Grasshopper sofort.
- Prüfen: `node --test` (auch in `_gemeinsam/`), `py -3.14 katalog/pruefe_apps.py <app-id>`, dann `python bauen.py && python pruefe.py`.
