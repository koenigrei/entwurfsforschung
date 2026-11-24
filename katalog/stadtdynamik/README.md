# Stadtdynamik

Wo ziehen Einwohner hin, wo entstehen Arbeitsplätze? Rasterstadt (12 × 8, Manhattan-Distanz) und Netzstadt (kürzeste Wege im Straßennetz) verteilen Iteration für Iteration neue Einheiten per Roulette-Rad nach Attraktivität und Distanz; dazu die Systemdynamik-Modelle Wolf-Schaf und Stadtsystem (Bevölkerung, Arbeitsplätze, Nahrung). Neuumsetzung der vier Grasshopper-Modelle von „Urban Simulation with Grasshopper for Rhino3D“ aus dem [DeCodingSpaces Lab](https://toolbox.decodingspaces.net/urban-simulation-with-grasshopper/) (Reinhard König, Martin Bielik, Sven Schneider, SimAUD 2018).

Online: https://entwurfsforschung.de/lab/parametric-planning-catalogue/stadtdynamik/

## Starten

- Mit lokalem Server aus dem Ordner, der `katalog/` und `simulationen/` enthält (so liegt `quellcode.zip` entpackt vor):
  `python -m http.server 8000` → http://localhost:8000/katalog/stadtdynamik/
- Doppelklick auf `index.html` geht ebenfalls (klassische Skripte, keine Module, kein Build); außerhalb der Website fehlen nur die Schriften Geist und Geist Mono.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Zeichnen, Legende, Kennzahlen |
| `../_gemeinsam/geo.js`, `szenen.js`, `karte.js` | Geometrie und Graphen, Beispielszenen (Stadt, Gelände), Zeichenhilfen – gemeinsam für alle Apps des Katalogs |
| `../_gemeinsam/axonometrie.js` | Prismen-Axonometrie für app.js: Projektion, Malerverfahren, Prisma zeichnen, Drehen (Axo) – gemeinsam für mehrere Apps des Katalogs |
| `../../simulationen/_gemeinsam/sim.js`, `sim.css`, `zufall.js` | Rahmen der Lab-Apps (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests des Modells |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Eintrag im DeCodingSpaces Lab) |
| `QUELLE.md` | Original, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`). Vorbild: DeCodingSpaces Lab, „Urban Simulation with Grasshopper for Rhino3D“ (Seite ohne Lizenzangabe; DeCodingSpaces-Toolbox GPL-3.0); Neuumsetzung, kein Code übernommen.
