# 2Dwachstum 01–03 – Wanderwürfel

Würfel wandern per Zufallsgenerator in der Ebene und stapeln sich zu Strukturen. Neuumsetzung der AutoCAD-VBA-Skripte `experiment01.htm` (zehn Ebenen, Würfel überschneiden sich), `experiment02.htm` (Ebenenwechsel nach Doppelbelegung) und `experiment03.htm` (Wanderwürfel ohne Doppelbelegung) von Reinhard König (Februar 2004), wählbar als Fassung. Darstellung als schattierte Würfel in Axonometrie, drehbar per Ziehen.

Online: https://entwurfsforschung.de/lab/simulationen/vba-2dwachstum-1/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/vba-2dwachstum-1/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Richtung, Würfel, checkList der Fassungen 02/03) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Axonometrie mit Zeichenreihenfolge von hinten nach vorn, AutoCAD-Farbindex, Ziehen zum Drehen, Legende, Kennzahlen |
| `../_gemeinsam/sim.js`, `sim.css`, `zufall.js` | gemeinsamer Rahmen aller Frühen Simulationen (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests der Modellregeln |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Archivseite, `repo`) |
| `QUELLE.md` | Originalprogramm, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`).
