# Mietpreisdynamik und Straßen

Segregation mit Mietlandschaft und Straßen als Web-App: 12000 Agenten aus sechs Einkommensgruppen ziehen um, bis ihre Nachbarschaft passt und die Miete ihr Budget nicht übersteigt; die Mieten entstehen durch Einzug und gleichen sich mit den Nachbarzellen aus. Straßen verbinden oder trennen Nachbarschaften. Neuumsetzung der Delphi-Programme `550_Mietpreisdynamik` (Juni 2007, Kapitel 5.5) und – als Fassung – `580_Wirkung_StrassenSegregat` (November 2006, Kapitel 5.8) von Reinhard König.

Online: https://entwurfsforschung.de/lab/simulationen/mietpreisdynamik/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/mietpreisdynamik/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Zufriedenheit mit gleichen oder individuellen Toleranzen, Straßengewichte und Barrieren, Umzug, Mietdiffusion, Wachstum, Segregationsindex) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Fassung, Parameter, Straßen zeichnen, Feld mit Mietlandschaft und Agenten, Diagramm, Legende, Kennzahlen |
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
