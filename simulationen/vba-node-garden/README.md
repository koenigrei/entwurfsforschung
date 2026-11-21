# nodeGarden – Interaktion von Nodes

Zehn Kugeln (nodes) bewegen sich in einem Rahmen; kommen sich zwei näher als maxDist = 30, ändern beide ihre Bahn aufeinander zu und bremsen ab (· 0,98). Nach einiger Zeit stehen sie in Gruppen. Neuumsetzung des AutoCAD-VBA-Makros „nodeGarden“ (spätestens 2004) von Reinhard König.

Online: https://entwurfsforschung.de/lab/simulationen/vba-node-garden/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/vba-node-garden/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Start, Vergleich, run, Spur) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Draufsicht mit schattierten Kugeln und Bahnen, AutoCAD-Farbindex, Kennzahlen |
| `../_gemeinsam/sim.js`, `sim.css`, `zufall.js` | gemeinsamer Rahmen aller Frühen Simulationen (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests der Modellregeln |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Datum, Archivseite, `repo`) |
| `QUELLE.md` | Originalprogramm, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`).
