# AGENTS.md · Magnetischer Grundrissgenerator

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Werkzeugs „Magnetizing Floor Plan Generator“ aus dem DeCodingSpaces Lab (Egor Gavrilov; Betreuung Reinhard König, Sven Schneider, Martin Dennemark; 2019; https://toolbox.decodingspaces.net/magnetizing-floor-plan-generator/; Paper https://doi.org/10.1016/j.promfg.2020.02.214). Maßgeblich sind Verfahren, Parameter und Begriffe (siehe `QUELLE.md`). **Das Repository des Originals (hellguz/Magnetizing_FloorPlanGenerator) hat keine Lizenz: dort keinen Code abschreiben oder übersetzen**, nur das Verfahren nachlesen.

## Aufbau

```
simulationen/_gemeinsam/   Rahmen aller Lab-Apps (nicht pro App kopieren)
  zufall.js                Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b)
  sim.js                   Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css                  Gestaltung wie das KI Lab
katalog/_gemeinsam/        gemeinsam für die Apps des Parametric Planning Catalogue
  geo.js                   Geo: Polygone, Strahlen, Isovist, Voronoi, Netze, Dijkstra, Floyd–Warshall, Betweenness
  szenen.js                Szenen: Stadt (Straßen, Blöcke, Gebäude, Platz) und Gelände (Höhenraster) mit fester Saat
  karte.js                 Karte: Farbskalen, Polygone, Pfeile, Gelände mit Schummerung und Höhenlinien
katalog/grundriss-magnetisch/
  index.html               statische Seite; lädt die Rahmen-Skripte, modell.js, app.js
  modell.js                reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js                   Sim.starte({...}): Parameter, zeichne, legende, kennzahlen, klick, aktionen
  test/*.test.mjs          node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten (braucht weder `geo.js` noch `szenen.js`). Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes.
5. **Texte** auf Deutsch, Bedienung zweisprachig: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über `sim.css` und die Farben im Objekt `F` (wechselt mit Hell/Dunkel); Farbskalen aus `Karte`.
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0; Vorbild Magnetizing Floor Plan Generator (DeCodingSpaces Lab; Gavrilov, Schneider, Dennemark, König) nennen.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z` (enthält `t` = Schrittzahl) |
| `schritt(z, param)` | ein Schritt; erhöht `z.t` |
| `aendere(z, param, id)` | ohne Neustart: `nachbearbeitung` (neu berechnen), `iterationen` (weiterrechnen oder beenden) |
| `BEISPIELE`, `programm(k)` | Raumprogramme der Beispieldatei (Name, Fläche, Typ, Verbindungen, Umriss, Eingangspunkt) → `{raeume, kanten, nachbarn, eingang, N, flaeche}` |
| `grundraster(W, H, form, gesperrt)` | Int16Array: `FREI` 0, `FLUR` −1, `AUSSEN` −2 (Form L/Innenhof, gesperrte Zellen); Räume tragen `r + 1` |
| `abmessungen(A, maxRatio, zufall)` | Seiten aus Fläche und zufälligem Seitenverhältnis 1 … MaxRatio, zufällig gedreht |
| `schablone(a, b, modus, zusatz, halle, zufall)` | Raum mit Flurstreifen `{w, h, flur(i, j)}`, Ecke (0, 0) ist Flur |
| `flurAbstand(g, W, H, wert, kasten, maxD)` | Abstand von einem Raum über Flurzellen (8er-Nachbarschaft, √2), Map Zelle → m |
| `andockzellen(g, W, H, felder, maxD)` | freie Zellen am Flur, die alle Nachbarbedingungen erfüllen |
| `tabellen`, `bewerteLage`, `kastenVon` | Summentabellen; „Magnet“-Wert einer Lage (belegte Zellen in Verlängerung der Kanten) |
| `platziere(L, W, H, prog, r, p, zufall)` | Raum r in Lösung L setzen (beste Lage, Gleichstand zufällig); false, wenn kein Platz |
| `naechsterRaum(prog, L, zufall)` | Eingang zuerst, dann meiste Verbindungen zu Platzierten, sonst meiste insgesamt |
| `leereLoesung`, `entferneLetzte(L, W, k)` | neue Lösung (Startzelle als Flur); letzte k Räume samt Flur entfernen (einer bleibt) |
| `wert`, `besser`, `fehlendeNachbarn` | Bewertung [Zahl, Fläche] bzw. [Fläche, Zahl]; fehlende Nachbarn je Raum |
| `entferneSackgassen`, `alleFlureZuRaeumen`, `nachbearbeite` | Nachbearbeitung der besten Lösung (neues Gitter) |
| `erschliessung(g, W, H, L, prog)` | Prüfgröße: Netz zusammenhängend? Räume ohne Zugang? Flurzellen |
| `graphLage(k)` | feste Lage des Nachbarschaftsgraphen (Stress-Majorisierung) in [0, 1]² |
| `raumSchritt`, `anzeige(z, p)` | ein Raum (bzw. Abschluss einer Lösung); gezeigte Lösung (am Ende die beste, nachbearbeitet) |
| `malen(z, p, x, y, phase)`, `setzeEingang`, `sperrenLoeschen` | Maus: Zellen sperren/freigeben, Eingangspunkt; gespeichert in `p.sperre`, `p.eingangsPunkt` (gelten nur für denselben Umriss) |

Zustand `z`: `W, H, basis, start, eingangsPunkt, prog, it` (Iteration), `slot` (Lösung 0–4), `lauf` (entstehende Lösung), `letzte`, `best` (Bestenliste), `verlauf` (Bestwert je Iteration), `bewertet`, `verbessert`, `fertig`. Eine Lösung `L`: `gitter, kasten[r] = [x, y, w, h], anker, folge` (Reihenfolge), `art` („neu“/„verbessern“), `wert`.

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py grundriss-magnetisch` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Beliebiger Umriss als Polygon (Rhino-Kurve) mit Drehung auf das kleinste umschließende Rechteck wie im Plugin; Zellgröße (CellSize) einstellbar.
- Mehrere Geschosse mit Treppen als gemeinsamer Zelle; eigene Raumprogramme im Bedienfeld eingeben (Tabelle Name, Fläche, Nachbarn) und als JSON laden/speichern.
- Federsystem `SpringSystem_ES` der Beispieldatei: den Rastergrundriss als Blasendiagramm mit Flächen- und Proportionsausgleich nachbewegen.
- Bewertung erweitern: fehlende Nachbarschaften, Flurfläche, Kompaktheit; Pareto-Front statt einer Bestenliste.
- Vergleich mit den Packungs-Apps (KREMLAS, dichte Packungen) des Lab.
