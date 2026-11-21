# Verteilung verschiedener Flächennutzungen

Dynamische Entwicklung verschiedener Flächennutzungen als Web-App: Wohnen, Dienstleistung und Industrie siedeln sich über drei gekoppelte Potentialfelder an; Agenten pendeln zu den Ressourcen und bilden ein Wegenetz; eine Rang-Größen-Analyse misst die Siedlungscluster. Neuumsetzung des Delphi-Programms `422_Flaechenverteilung` („Settlement Patterns 5.0“) von Reinhard König (2006, Dissertation 2008, Kapitel 4.2.2).

Online: https://entwurfsforschung.de/lab/simulationen/flaechenverteilung/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/flaechenverteilung/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Potentialfelder, neue Nutzungen, Agenten, Spuren, Migration, Rang-Größe) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Feld, Rang-Größen- und Verlaufsdiagramm, Legende, Kennzahlen, Hindernisse zeichnen |
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
