# 10 territory fight 01

Territorialer Kampf als Web-App: turtles laufen von ihrer Heimat geradeaus durch ihr Territorium und färben die erste fremde Zelle; vierzehn Farben teilen die Fläche und kämpfen an den Grenzen. Neuumsetzung des NetLogo-Modells `07_territoryFight_3.nlogo` („10_territory fight 01“, 11.03.2005) von Reinhard König.

Online: https://entwurfsforschung.de/lab/simulationen/nl-territorien/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/nl-territorien/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Setup der turtles und Farben, Regel je turtle, Torus, Flächenanteile) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Regler, Feld mit turtles, Verlauf der Flächen je Farbe, Legende, Kennzahlen |
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
