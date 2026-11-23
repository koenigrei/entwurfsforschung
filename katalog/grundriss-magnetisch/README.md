# Magnetischer Grundrissgenerator

Räume docken nacheinander an ein wachsendes Flursystem an, geforderte Nachbarn liegen nah beieinander, eine quasi-evolutionäre Suche verbessert die fünf besten Grundrisse. Neuumsetzung des Werkzeugs „Magnetizing Floor Plan Generator“ aus dem [DeCodingSpaces Lab](https://toolbox.decodingspaces.net/magnetizing-floor-plan-generator/) (Egor Gavrilov; Betreuung Reinhard König, Sven Schneider, Martin Dennemark; 2019) – nach Beschreibung, Beispieldatei und Paper, ohne Code des (lizenzlosen) Originals.

Online: https://entwurfsforschung.de/lab/parametric-planning-catalogue/grundriss-magnetisch/

## Starten

- Mit lokalem Server aus dem Ordner, der `katalog/` und `simulationen/` enthält (so liegt `quellcode.zip` entpackt vor):
  `python -m http.server 8000` → http://localhost:8000/katalog/grundriss-magnetisch/
- Doppelklick auf `index.html` geht ebenfalls (klassische Skripte, keine Module, kein Build); außerhalb der Website fehlen nur die Schriften Geist und Geist Mono.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Zeichnen, Legende, Kennzahlen |
| `../_gemeinsam/geo.js`, `szenen.js`, `karte.js` | Geometrie und Graphen, Beispielszenen (Stadt, Gelände), Zeichenhilfen – gemeinsam für alle Apps des Katalogs |
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

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`). Vorbild: Magnetizing Floor Plan Generator (DeCodingSpaces Lab, ohne Lizenzangabe) – Neuumsetzung, kein Code übernommen.
