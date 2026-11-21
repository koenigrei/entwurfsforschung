# Einfaches Wachstum

Probabilistischer zellulärer Automat nach Michael Batty (*Cities and Complexity*, Kapitel 2) als Web-App: Eine Zelle wird mit der Wahrscheinlichkeit p entwickelt, wenn eine Nachbarzelle (Moore) entwickelt ist; das Alter erscheint als Grauwert, die Lebensdauer erzeugt Entwicklungswellen. Neuumsetzung des Delphi-Programms `28_probabCA` von Reinhard König (2006).

Online: https://entwurfsforschung.de/lab/simulationen/einfaches-wachstum/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/einfaches-wachstum/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Nachbarschaft, Entwicklung mit Wahrscheinlichkeit, Altern) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Zeichnen, Verlaufsdiagramm, Legende, Kennzahlen |
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
