# Agentenbasiertes Interaktionsmodell (Interaction Pattern)

Agenten erkunden vom Ursprungsort aus ein Zellenfeld und markieren den Rückweg von gefundenen Zielorten; Nachfolgende folgen der intensivsten Markierung. Stark markierte Pfade entstehen, die Agenten „lernen“, wo die Zielorte liegen, und Zufallsfehler halten die Suche offen (Batty, Kap. 5). Neuumsetzung von `320_AgInteraktModell` („Interaction Patterns“, Delphi, 2006) von Reinhard König.

Online: https://entwurfsforschung.de/lab/simulationen/interaktionsmodell/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/interaktionsmodell/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Zielorte, Sichtfeld, Erkunden, Rückweg, Markieren, Verfall, Kennzahlen) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Regler, Zeichnen, Gravitationslinien, Diagramm, Legende, Kennzahlen |
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
