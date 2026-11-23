# Straßenwachstum nach dem Wasserabfluss

Ein Straßennetz wächst Segment für Segment über ein Gelände, längs und quer zur Fließrichtung des Regenwassers, mit Abzweigen nach jeder Blockkante – innerhalb einer Wachstumsgrenze aus Neigung, Höhe und Nähe zum Zentrum. Verfahren nach „Procedural Cities“ (Parish & Müller 2001; phiresky 2015), mit dem Gelände als festem Graustufenbild statt Perlin-Rauschen. Neuumsetzung des Grasshopper-Moduls „Waterbased Street Growth“ aus dem [Parametric Planning Catalogue](https://infar-buw.github.io/parametric-planning-catalogue/docs/WaterBasedStreetGrowth/) (DeCodingSpaces – Martin Dennemark).

Online: https://entwurfsforschung.de/lab/parametric-planning-catalogue/wasserbasiertes-wachstum/

## Starten

- Mit lokalem Server aus dem Ordner, der `katalog/` und `simulationen/` enthält (so liegt `quellcode.zip` entpackt vor):
  `python -m http.server 8000` → http://localhost:8000/katalog/wasserbasiertes-wachstum/
- Doppelklick auf `index.html` geht ebenfalls (klassische Skripte, keine Module, kein Build); außerhalb der Website fehlen nur die Schriften Geist und Geist Mono.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Zeichnen, Legende, Kennzahlen |
| `../_gemeinsam/geo.js`, `szenen.js`, `karte.js` | Geometrie und Graphen, Beispielszenen (Stadt, Gelände), Zeichenhilfen – gemeinsam für alle Apps des Katalogs |
| `../../simulationen/_gemeinsam/sim.js`, `sim.css`, `zufall.js` | Rahmen der Lab-Apps (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests des Modells |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Katalogeintrag) |
| `QUELLE.md` | Original, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`). Vorbild: Parametric Planning Catalogue, MIT-Lizenz.
