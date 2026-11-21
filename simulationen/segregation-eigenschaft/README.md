# Segregation durch Eigenschaftsanpassung

Segregation durch Eigenschaftsanpassung als Web-App: Jede Zelle übernimmt die Eigenschaft (Bier- oder Weintrinker) der Mehrheit ihrer Moore-Nachbarschaft; aus der Zufallsverteilung entstehen stabile Gebiete, die Störungen überstehen. Neuumsetzung des Delphi-Programms `522_SegregationEigenschaft` „Segregation Model“ von Reinhard König (18.12.2005, Dissertation 2008, Kapitel 5.2.2), nach Batty.

Online: https://entwurfsforschung.de/lab/simulationen/segregation-eigenschaft/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/segregation-eigenschaft/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Zählung der Nachbarschaft, Schwellen- und Mehrheitsregel, Störung) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Feld und Diagramm, Störung, Malen mit der Maus, Legende, Kennzahlen |
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
