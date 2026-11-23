# AGENTS.md · Hochwasser: steigender Pegel

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung der „Spatial Resilience Toolbox – Flooding“ (SRTF) nach dem Paper von Morschek, König und Schneider (SimAUD 2019; Eintrag im DeCodingSpaces Lab: https://toolbox.decodingspaces.net/spatial-resilience-towards-flooding-hazards/). Kern: steigende Wasserebene in Schritten von 8 cm, Gebäude überflutet ab Sockeloberkante, Tiefenstufen bis 24 cm, Straßen nach dem tiefsten Punkt, mittleres Risiko über alle Pegel; dazu ein Regenmodus mit Partikeln und Maßnahmen. Die Grasshopper-Dateien sind nicht öffentlich – maßgeblich ist das Paper (siehe `QUELLE.md`).

## Aufbau

```
simulationen/_gemeinsam/   Rahmen aller Lab-Apps (nicht pro App kopieren)
  zufall.js                Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b)
  sim.js                   Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css                  Gestaltung wie das KI Lab
katalog/_gemeinsam/        gemeinsam für die Apps des Katalogs
  geo.js                   Geo: Polygone, Abstand Punkt–Segment, Heap
  szenen.js                Szenen: Stadt, Rauschen, Höhe/Gefälle auf dem Höhenraster
  karte.js                 Karte: Farbskalen, Gelände mit Schummerung und Höhenlinien
katalog/hochwasser-pegel/
  index.html               statische Seite; lädt die Rahmen-Skripte, modell.js, app.js
  modell.js                reine Logik, kein DOM
  app.js                   Sim.starte({...}): Parameter, zeichne (Gelände vorgezeichnet), Kurve, legende, kennzahlen, klick, aktionen
  test/*.test.mjs          node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten außer `../_gemeinsam/geo.js` und `szenen.js`. Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes.
5. **Texte** auf Deutsch, Bedienung zweisprachig: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über `sim.css` und die Farben im Objekt `F` (wechselt mit Hell/Dunkel); Farbskalen aus `Karte`.
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0; Vorbild (SRTF, Morschek, König, Schneider 2019) nennen.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z`: Tal `z.G` (Höhen `h`, Rinne `fluss`), Gebäude, Straßensegmente, Überlaufhöhe `z.W`, Pegelstufen, Regenpartikel; `t = 0` |
| `schritt(z, param)` | Pegelmodus: Pegel + Schrittweite (`z.k`); Regenmodus: ein Partikelschritt; erhöht `z.t` |
| `aendere(z, param, id)` | Sockel → neu auswerten; Pegelbereich, Modus, Partikel → Lauf neu (Maßnahmen bleiben); Umkreis → Regenrisiko neu |
| `tal(zufall)` | Gelände 400 × 400 m mit Fluss, Uferwall, Nordhang |
| `ueberlauf(G)` | Überlaufhöhe je Gitterpunkt (Priority-Flood vom Fluss aus): Wasser bei Pegel L, wo W < L |
| `stadt(zufall, G)`, `gebaeudeMaske(G, gebaeude)` | Beispielstadt am Hang (Fußpunkt, Fläche, Proben der Straßen); Gitterpunkte in Gebäuden |
| `pegelStufen(p)`, `pegelBei(S, k)`, `pegel(z)` | Pegelstände L_k = Start + k · dz, k = 0 … N |
| `ersterSchritt(S, F)`, `ersterSchrittZelle(S, W)` | erster Schritt mit L ≥ F (Gebäude, Straßen) bzw. L > W (Gelände) |
| `gebaeudeHoehe(z, g, p)`, `strassenHoehe(z, s)`, `oberkante(g, p)` | Überflutungshöhe: max(Sockeloberkante, W am Fußpunkt); tiefster W einer Straße |
| `rechnePegel(z, p)` | erste Überflutungsschritte `z.kGeb`, `z.kStr` und Kurve `z.kurve` (überflutete Gebäude je Pegelstand) |
| `tiefenStufe(kE, k, p)`, `mittleresRisiko(kE, N)` | Tiefenstufe 1 … K+1 (K = 24 cm / 8 cm); Anteil überfluteter Pegelstände |
| `auswertung(z, p)`, `regenAuswertung(z)` | Kennzahlen beim aktuellen Pegel bzw. im Regen |
| `regenPartikel`, `bewege`, `regenRisiko`, `markiereErosion`, `abstandPoly` | Regen: Partikel verteilen, bewegen (Gebäude als Hindernis, Wald bremst), Risiko je Gebäude/Segment, Erosion |
| `hebeAn(z, p, q, zurueck)`, `graben(z, p, q, neu)`, `grabe(z, p, a, b)`, `forste(z, q)`, `massnahmenWeg(z, p)` | Maßnahmen |
| `fertig(z, p)` | Höchstpegel erreicht bzw. alle Regenschritte gerechnet |

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("modus", "regen")`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&maxpegel=5`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py hochwasser-pegel` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Drei Entwurfsvarianten nebeneinander vergleichen wie im Paper (Stadtlayout als Auswahl, gleiche Kennzahlen).
- Dämme und Brücken als Maßnahmen; Damm „offen/geschlossen“ wie Abb. 5 des Papers.
- Partikel mit gegenseitiger Abstoßung (Volumen), damit sich Wasser vor Gebäuden aufstaut; Kopplung Regen → Pegel.
- Eigenes Gelände und Gebäude laden (GeoTIFF/GeoJSON).
- Erosionsfläche wie im Paper als Hülle benachbarter schneller Fließwege.
