# Modell „Circle City“

Segregation in einem hierarchischen Netz als Web-App: Agenten in Wohnungen, Häusern und Straßen bewerten ihre Nachbarschaft über Wege im Straßennetz und ziehen um, wenn zu wenige Gleiche nahe sind; die Gruppen sortieren sich nach Straßen. Neuumsetzung des Delphi-Programms `590_Circle_City` (HieNet_5) von Reinhard König (2007/2008, Dissertation 2008, Kapitel 5.9).

Online: https://entwurfsforschung.de/lab/simulationen/circle-city/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/circle-city/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Geometrie des Netzes, kürzeste Wege, Gewichte, Anteil gleicher, Umzug, Löschen von Verbindungen) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Netz mit Agenten und Diagramm, Legende, Kennzahlen |
| `../_gemeinsam/sim.js`, `sim.css`, `zufall.js` | gemeinsamer Rahmen aller Frühen Simulationen (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests der Modellregeln |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Archivseite, Entstehungsdatum, `repo`) |
| `QUELLE.md` | Originalprogramm, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`).
