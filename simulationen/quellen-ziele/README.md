# Quellen und Ziele der Bewegungen (Path System 02)

Zehn Home Cells und eine Center Cell: Agenten suchen das Zentrum und kehren markierend heim, Nachfolgende folgen den Spuren; es entsteht ein relativ stabiles Netz aus rund 400 Zellen zwischen Quellen und Ziel. Neuumsetzung von `332_Quellen_Ziele` („Path System 02“, Delphi, 2006) von Reinhard König.

Online: https://entwurfsforschung.de/lab/simulationen/quellen-ziele/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/quellen-ziele/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Setup, Sichtfeld, Stepping, Markieren, Verdunstung, Diffusion, Kennzahlen) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Regler, Maus, Zeichnen, Diagramm, Legende, Kennzahlen |
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
