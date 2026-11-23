# Hochwasser: steigender Pegel

Ein Fluss tritt über die Ufer: Der Pegel steigt in Schritten von 8 cm, Gebäude laufen voll, sobald das Wasser die Oberkante ihres Sockels erreicht – mit mittlerem Risiko über alle Pegel, Regenabfluss und Maßnahmen. Neuumsetzung der „Spatial Resilience Toolbox – Flooding“ aus dem Eintrag [Spatial Resilience Towards Flooding Hazards](https://toolbox.decodingspaces.net/spatial-resilience-towards-flooding-hazards/) im DeCodingSpaces Lab (Julius Morschek, Reinhard König, Sven Schneider, SimAUD 2019).

Online: https://entwurfsforschung.de/lab/parametric-planning-catalogue/hochwasser-pegel/

## Starten

- Mit lokalem Server aus dem Ordner, der `katalog/` und `simulationen/` enthält (so liegt `quellcode.zip` entpackt vor):
  `python -m http.server 8000` → http://localhost:8000/katalog/hochwasser-pegel/
- Doppelklick auf `index.html` geht ebenfalls (klassische Skripte, keine Module, kein Build); außerhalb der Website fehlen nur die Schriften Geist und Geist Mono.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM – in Node testbar (Tal mit Fluss, Überlaufhöhe, Pegel, Risiko, Regenpartikel, Maßnahmen) |
| `app.js` | Bedienung und Darstellung: Parameter, Zeichnen, Kurve, Legende, Kennzahlen, Klickwerkzeuge |
| `../_gemeinsam/geo.js`, `szenen.js`, `karte.js` | Geometrie, Heap, Beispielstadt, Gelände-Schummerung – gemeinsam für alle Apps des Katalogs |
| `../../simulationen/_gemeinsam/sim.js`, `sim.css`, `zufall.js` | Rahmen der Lab-Apps (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests des Modells |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Eintrag im DeCodingSpaces Lab) |
| `QUELLE.md` | Original, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`). Vorbild: DeCodingSpaces Lab, SRTF (Seite ohne Lizenzangabe, Paper © SCS 2019); Neuumsetzung, kein Code übernommen.
