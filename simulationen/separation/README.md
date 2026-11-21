# Separation durch Standortpräferenzen

Separation durch Standortpräferenzen als Web-App: Agenten zweier Nutzungen (Gewerbe blau, Wohnen gelb) markieren ihre Umgebung, meiden die Flächen der anderen und lagern sich getrennt an die roten Knoten eines zufälligen Erschließungsgraphen an. Neuumsetzung des Delphi-Programms `421_Separation` von Reinhard König (2005, Dissertation 2008, Kapitel 4.2.1).

Online: https://entwurfsforschung.de/lab/simulationen/separation/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/separation/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Zellmarkierung, Standortregel, Anlagern, Bewegung) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Knöpfe „+ 50 Blau/Gelb“, Zeichnen, Legende, Kennzahlen, Klick |
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
