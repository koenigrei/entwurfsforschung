# Optimiertes Wegesystem (Evolutionary Network)

Path System 02 mit Energiehaushalt: Jeder Agent trägt angle und wiggle threshold als Chromosom; wer seine Energie verbraucht hat, wird mit den gekreuzten Werten der erfolgreichsten Agenten seiner Familie wiedergeboren – ein genetischer Algorithmus, dessen Fitness die gefundenen Wege sind. Neuumsetzung von `333_OptiWege` („Network 01“, Delphi, 2006) von Reinhard König.

Online: https://entwurfsforschung.de/lab/simulationen/optimiertes-wegesystem/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/optimiertes-wegesystem/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Path System 02, Energie, Chromosom, Kreuzung, Mutation, Kennzahlen) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Regler, Lage der Home Cells, Maus, Zeichnen, Diagramm, Legende, Kennzahlen |
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
