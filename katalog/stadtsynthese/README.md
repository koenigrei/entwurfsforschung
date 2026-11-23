# Stadtsynthese

Vom Straßennetz zum Stadtquartier in einer Kette: Straßen wachsen nach einem Instruktionsbaum von den Anschlussstraßen ins Gebiet, ihre Betweenness bestimmt Straßenbreite, Parzellenbreite, Gebäudetyp und Dichte; am Ende stehen die Space-Syntax-Kennzahlen des Workshops (Netzlänge, Geschossfläche, öffentlich/privat, Integration, Konnektivität, Wege). Neuumsetzung der Generierungskette aus dem Workshop „SSS12 Workshop | Parametric urban planning with Space Syntax and DeCodingSpaces-toolbox for Grasshopper“ ([Eintrag im DeCodingSpaces Lab](https://toolbox.decodingspaces.net/sss12-workshop-parametric-urban-planning-with-space-syntax-and-decodingspaces-toolbox-for-grasshopper/)) von Reinhard König, Martin Bielik und Yufan Miao (2019), mit den Kennzahlen des eCAADe-Workshops 2018.

Online: https://entwurfsforschung.de/lab/parametric-planning-catalogue/stadtsynthese/

## Starten

- Mit lokalem Server aus dem Ordner, der `katalog/` und `simulationen/` enthält (so liegt `quellcode.zip` entpackt vor):
  `python -m http.server 8000` → http://localhost:8000/katalog/stadtsynthese/
- Doppelklick auf `index.html` geht ebenfalls (klassische Skripte, keine Module, kein Build); außerhalb der Website fehlen nur die Schriften Geist und Geist Mono.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM – in Node testbar (die ganze Kette, Kennzahlen) |
| `app.js` | Bedienung und Darstellung: Parameter, Plan, Axonometrie, Legende, Kennzahlen |
| `../_gemeinsam/geo.js`, `szenen.js`, `karte.js` | Geometrie und Graphen, Beispielszenen, Zeichenhilfen – gemeinsam für alle Apps des Bereichs |
| `../../simulationen/_gemeinsam/sim.js`, `sim.css`, `zufall.js` | Rahmen der Lab-Apps (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests des Modells |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Lab-Eintrag) |
| `QUELLE.md` | Original, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`). Vorbild: Workshop im DeCodingSpaces Lab (ohne Lizenzangabe); Verfahren abgeglichen mit der DeCodingSpaces-Toolbox (GPL-3.0), kein Code übernommen.
