# Selbstorganisation bei Wegesystemen und Slime Mold

Agenten im Random Walk hinterlassen Markierungen und folgen ihnen im Sichtbereich (angle threshold) per Hill Climbing oder Roulette Wheel; ein Wegesystem organisiert sich selbst (Schweitzer). In der Fassung „Slime Mold“ diffundieren die Markierungen, und es entstehen wandernde, verschmelzende Cluster (Resnick). Neuumsetzung von `331_SelbstorgaWegeSys` (= `36_pathSystem_01`) und `37_slimeMold` (Delphi, 2006) von Reinhard König.

Online: https://entwurfsforschung.de/lab/simulationen/wegesystem-selbstorganisation/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/wegesystem-selbstorganisation/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Agenten, Sichtbereich, Markierung, Verfall, Diffusion – ohne DOM, in Node testbar |
| `app.js` | Bedienung und Darstellung: Fassung, Regler, Zeichnen, Diagramm, Legende, Kennzahlen |
| `../_gemeinsam/sim.js`, `sim.css`, `zufall.js` | gemeinsamer Rahmen aller Frühen Simulationen (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests der Modellregeln |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Datum, Archivseite, `repo`) |
| `QUELLE.md` | Originalprogramme, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`).
