# Sichttiefe (Visibility Step Depth)

Wie oft muss man abbiegen, um von einem Ort aus jeden anderen zu sehen? Breitensuche im Sichtbarkeitsgraphen eines Zellrasters, Stufe für Stufe. Neuumsetzung des Grasshopper-Snippets „Visual Distance“ aus dem Eintrag [Grasshopper snippets for Urban Design and Analysis](https://toolbox.decodingspaces.net/grasshopper-snippets-for-urban-design-and-analysis/) im DeCodingSpaces Lab (Bauhaus-Universität Weimar, 2018; im Original mit SpiderWeb von Richard Schaffranek).

Online: https://entwurfsforschung.de/lab/parametric-planning-catalogue/sichttiefe/

## Starten

- Mit lokalem Server aus dem Ordner, der `katalog/` und `simulationen/` enthält (so liegt `quellcode.zip` entpackt vor):
  `python -m http.server 8000` → http://localhost:8000/katalog/sichttiefe/
- Doppelklick auf `index.html` geht ebenfalls (klassische Skripte, keine Module, kein Build); außerhalb der Website fehlen nur die Schriften Geist und Geist Mono.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM – in Node testbar (Raster, symmetrisches Shadowcasting, Breitensuche) |
| `app.js` | Bedienung und Darstellung: Parameter, Zeichnen, Legende, Kennzahlen |
| `../_gemeinsam/geo.js`, `szenen.js`, `karte.js` | Geometrie, Beispielszenen (Stadt), Zeichenhilfen – gemeinsam für alle Apps des Katalogs |
| `../_gemeinsam/raster.js` | Rasterverfahren, hier symmetrisches Shadowcasting (Sichtbarkeit zwischen Zellen) – gemeinsam mit anderen Apps, Tests in `../_gemeinsam/test/raster.test.mjs` |
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

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`). Vorbild: DeCodingSpaces Lab, „Grasshopper snippets for Urban Design and Analysis“ (Seite ohne Lizenzangabe); Neuumsetzung, kein Code übernommen.
