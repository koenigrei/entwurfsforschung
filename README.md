# entwurfsforschung.de · KI Lab

Quellen der Website **https://entwurfsforschung.de** von Prof. Dr. Reinhard König, entstanden in Zusammenarbeit mit Claude von Anthropic.
Alles ist offen: Jede App und jede Seite darf weiterentwickelt werden (Lizenz siehe unten).

| Bereich | Adresse | Quellen hier |
|---|---|---|
| Lab (Startseite) | https://entwurfsforschung.de/ | `projekte.json`, `vorlage.html`, `bauen.py` |
| Lab-Apps | https://entwurfsforschung.de/lab/… | Gartenatelier, Campus, Duarte/Siza, Bergdörfer: gebaute Apps; ihre Quellen und Quellcode-Pakete liegen im KI Lernlabor der Bauhaus-Universität Weimar. Palladio: Quellen im Repo Planungsgrundlagen (`_prozess/konzepte/2026-11-22_Palladio_Grammatik`, Bau mit `Apps/palladio/baue.py`), Quellcode-Paket in der App. `simulationen/`: die alten Simulationsprogramme (Delphi, NetLogo, VBA) als neue Web-Apps |
| Archiv | https://entwurfsforschung.de/archiv/ | `archiv.json` (Einträge, Unterseiten, Linkregeln), `konvertiere.py` (übernimmt die alte Website), `archiv_inhalte/`, `archiv_medien/`, `archiv_offen.json` (alte Links, die noch umgehängt werden) |
| Impressum | https://entwurfsforschung.de/impressum/ | `impressum.html` |

## Bauen und prüfen

```
python bauen.py          # baut site/ (Python 3, Pillow; Schrift Geist muss lokal installiert sein)
python pruefe.py         # prüft den Bau: Bilder, Ziele, keine Inhalte fremder Server, Impressum
python konvertiere.py    # übernimmt Inhalte der alten Website neu (nur bei Bedarf)
py -3.14 kachelbilder.py # Kachelbilder als Screenshots in dunkler Darstellung (Playwright)
```

Veröffentlicht wird mit `python deploy.py --ziel neu` (Vorschau unter /neu/). Der Zugang zum Webspace steht in `deploy.local.json`, die nicht im Repo liegt.

## Grundsätze

- Dunkel (schwarz) als Voreinstellung, Umschalter Hell/Dunkel, Schrift Geist, feine Linien, ein Akzent.
- Keine Inhalte fremder Server: Schriften und Bibliotheken liegen auf dem eigenen Server, Videos sind nur verlinkt, keine Cookies.
- Wer nur den Link zu einer App hat, soll weiterarbeiten können: jede App verlinkt ihren Quellcode, README und AGENTS.md.

## Lizenz

Inhalte und Code: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.de) – Namensnennung: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“.
Schrift Geist / Geist Mono: SIL Open Font License 1.1 (Vercel). three.js: MIT-Lizenz.
