# Hinweise für Coding-Agenten

1. Lies README.md und KONZEPT.md (Entscheidungen des Nutzers, nicht neu verhandeln).
2. Bauen mit `python bauen.py`, danach immer `python pruefe.py` – es muss „ok“ melden.
3. Neue Lab-Kacheln: Eintrag in `projekte.json`; neue Archiv-Einträge: `archiv.json` + `python konvertiere.py`.
4. Alte Simulationen als Web-Apps: siehe `simulationen/REZEPT.md` (je App eigener Ordner, Modelllogik in `modell.js` mit `node --test`).
   Module des Parametric Planning Catalogue als Web-Apps: siehe `katalog/REZEPT.md` (nutzt den Rahmen `simulationen/_gemeinsam/`).
5. Keine Inhalte fremder Server (keine CDNs, keine Google Fonts, keine iframes). Dunkel ist Voreinstellung.
6. Nicht deployen ohne Auftrag; `deploy.local.json` (Server-Zugang) nie ins Repo.
7. Wissensbasis (`lab/wissensbasis/`, erste Kachel über `anfang: true`): Texte in `wissensbasis/seite.de.md` und `seite.en.md`, Paket `KI-Lab_Wissensbasis.zip` aus `wissensbasis/paket.py` (Quellen: METHODE.md aller Projekte, Methodenkatalog und Skill `generative-studie` aus Planungsgrundlagen, eigene Skills in `wissensbasis/skills/`, Rezepte). Jede Paketdatei wird auf private Angaben geprüft; bricht der Bau mit „Anpassung … greift nicht mehr“ ab, hat sich eine Quelle geändert – dann `anpassungen()` in `paket.py` nachziehen, nie die Prüfung abschwächen.
