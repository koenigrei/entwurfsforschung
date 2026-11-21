# Wachstum mit räumlicher Umorganisation

Zellulärer Automat nach Michael Batty (*Cities and Complexity*, Kapitel 2) als Web-App: Einfaches Wachstum mit der Wahrscheinlichkeit p, kombiniert mit Segregation durch Eigenschaftsanpassung. Zellen innerhalb des Radius r werden eher Typ 1 (grau), außerhalb eher Typ 2 (weiß); nach jedem Schritt übernimmt jede Zelle den Typ der Mehrheit ihrer Nachbarn. Inseln entstehen, mit Altern und q < 50 % stülpen sich die Bereiche um. Neuumsetzung des Delphi-Programms `29_groupGrow` von Reinhard König (2006).

Online: https://entwurfsforschung.de/lab/simulationen/wachstum-umorganisation/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/wachstum-umorganisation/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Wachstum, Typregel, Abstimmung, Altern) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Zeichnen, Radius, Verlaufsdiagramm, Legende, Kennzahlen |
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
