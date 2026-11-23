# Dichtefeld

Grundflächenzahl im Suchradius je Rasterzelle: Wie dicht ist die Stadt um jeden Ort – und wie stark hängt das vom gewählten Radius ab? Neuumsetzung des Grasshopper-Skripts „Building coverage Density“ (GSI Density Grid) aus dem Eintrag [Discovering Cities Workshop | Amman](https://toolbox.decodingspaces.net/discovering-cities-workshop-amman/) im DeCodingSpaces Lab (DeCodingSpaces / Bauhaus-Universität Weimar, 2018).

Online: https://entwurfsforschung.de/lab/parametric-planning-catalogue/dichtefeld/

## Starten

- Mit lokalem Server aus dem Ordner, der `katalog/` und `simulationen/` enthält (so liegt `quellcode.zip` entpackt vor):
  `python -m http.server 8000` → http://localhost:8000/katalog/dichtefeld/
- Doppelklick auf `index.html` geht ebenfalls (klassische Skripte, keine Module, kein Build); außerhalb der Website fehlen nur die Schriften Geist und Geist Mono.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM – in Node testbar (Beispielstadt mit Dichtegefälle, Raster, GSI im Suchradius) |
| `app.js` | Bedienung und Darstellung: zwei Karten nebeneinander, Parameter, Legende, Kennzahlen |
| `../_gemeinsam/geo.js`, `szenen.js`, `karte.js` | Geometrie, Beispielszenen (Stadt), Zeichenhilfen – gemeinsam für alle Apps des Katalogs |
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

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`). Vorbild: DeCodingSpaces Lab, Workshop „Discovering Cities | Amman“ (Seite ohne Lizenzangabe); Neuumsetzung, kein Code übernommen.
