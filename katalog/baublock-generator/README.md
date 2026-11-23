# Baublock-Generator (DigiWo)

Baukörper für Mehrfamilienhäuser halbautomatisch erzeugen: Blockrand oder Zeilen nach Abstandsflächenrecht, dann Aktionen wie Durchgänge, Rücksprünge, Türme, Hofgebäude und Dachgeschosse – mit GRZ, GFZ und BGF nach jedem Schritt. Neuumsetzung der Grasshopper-Komponenten „DigiWo – Block Generation Components / Slabs Generation Components“ aus dem [DeCodingSpaces Lab](https://toolbox.decodingspaces.net/digiwo/) (Iuliia Osintseva mit Reinhard König, Sven Schneider, Martin Bielik, Andreas Berst; Paper: SimAUD 2020, S. 211–218, http://simaud.org/2020/proceedings/70.pdf). Die Grasshopper-Dateien sind nicht mehr abrufbar; die App folgt Tutorial, Abbildungen und Paper.

Online: https://entwurfsforschung.de/lab/parametric-planning-catalogue/baublock-generator/

## Starten

- Mit lokalem Server aus dem Ordner, der `katalog/` und `simulationen/` enthält (so liegt `quellcode.zip` entpackt vor):
  `python -m http.server 8000` → http://localhost:8000/katalog/baublock-generator/
- Doppelklick auf `index.html` geht ebenfalls (klassische Skripte, keine Module, kein Build); außerhalb der Website fehlen nur die Schriften Geist und Geist Mono.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Zeichnen, Legende, Kennzahlen |
| `../_gemeinsam/geo.js`, `karte.js` | Geometrie (Polygone, Halbebenen-Schnitt, Versatz) und Zeichenhilfen – gemeinsam für alle Apps des Katalogs |
| `../../simulationen/_gemeinsam/sim.js`, `sim.css`, `zufall.js` | Rahmen der Lab-Apps (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests des Modells |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Katalogeintrag) |
| `QUELLE.md` | Original, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`). Vorbild: DigiWo-Komponenten aus dem DeCodingSpaces Lab (Seite ohne Lizenzangabe); Neuumsetzung, kein Code übernommen.
