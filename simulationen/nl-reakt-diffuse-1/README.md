# 03 reakt diffuse

Flächenteilung durch Ausbreitung als Web-App: Farbige Keime breiten sich Patch für Patch aus, wo zwei Farben aufeinandertreffen, entsteht eine weiße Grenze. Mit der Fassung „04 repel and reakt diffuse“, in der sich anziehende und abstoßende turtles die Keime setzen. Neuumsetzung der NetLogo-Modelle `reaktDiffuse02.nlogo` und `reaktDiffuse03.nlogo` von Reinhard König (2005), nach einem Skript von Paul Coates.

Online: https://entwurfsforschung.de/lab/simulationen/nl-reakt-diffuse-1/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/nl-reakt-diffuse-1/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Zeichnen, Legende, Kennzahlen |
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
