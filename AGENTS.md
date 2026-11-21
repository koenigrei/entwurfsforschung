# Hinweise für Coding-Agenten

1. Lies README.md und KONZEPT.md (Entscheidungen des Nutzers, nicht neu verhandeln).
2. Bauen mit `python bauen.py`, danach immer `python pruefe.py` – es muss „ok“ melden.
3. Neue Lab-Kacheln: Eintrag in `projekte.json`; neue Archiv-Einträge: `archiv.json` + `python konvertiere.py`.
4. Alte Simulationen als Web-Apps: siehe `simulationen/REZEPT.md` (je App eigener Ordner, Modelllogik in `modell.js` mit `node --test`).
5. Keine Inhalte fremder Server (keine CDNs, keine Google Fonts, keine iframes). Dunkel ist Voreinstellung.
6. Nicht deployen ohne Auftrag; `deploy.local.json` (Server-Zugang) nie ins Repo.
