# Dichte Packungen I/II

Eine evolutionäre Strategie minimiert die Summe der Überschneidungsflächen zufälliger Rechtecke (nach Elezkurtaj und Franck), bis sie höchstens 100 Pixel beträgt. Neuumsetzung von `06_minUeberschn` („Dichte Packungen I“, Delphi, Reinhard König, Mai 2005) mit `07_packingScale` („Dichte Packungen II“, Version 1.01: vier Lösungspfade, Rechtecke mit variablem Seitenverhältnis bei gleicher Fläche) als Fassung. Verlauf der kleinsten Überlagerungsfläche als Diagramm.

Online: https://entwurfsforschung.de/lab/simulationen/dichte-packungen-1/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/dichte-packungen-1/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Varianten, Fitness, Selectionsort des Originals, optimize beider Fassungen) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter mit Fassungs-Voreinstellungen, beste Variante, Verlaufsdiagramm, Legende, Kennzahlen |
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
