# Methode: Wissensbasis

Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · Stand 25.11.2026 · Lizenz CC BY 4.0

**Seite:** https://entwurfsforschung.de/lab/wissensbasis/ · **Quellcode:** `wissensbasis/` im Repo entwurfsforschung (`paket.py` baut das Paket, `seite.de.md` und `seite.en.md` sind die Texte der Seite, `vorlagen/` die Startdateien, `skills/` die eigenen Skills, `kachelbild.py` das Kachelbild), gebaut von `bauen.py` · **Einstieg für Agenten:** im Paket `AGENTS.md`

## Frage

Wie wird die Vorarbeit des KI Lab – Methoden, Erfahrungen, Prüfer, Abläufe – für neue Projekte nutzbar, sodass ein Mensch mit einem Coding-Agenten dort anknüpft, statt neu anzufangen?

## Vorbild und Quellen

- AGENTS.md, ein offenes Format für Anweisungen an Coding-Agenten, unterstützt u. a. von Codex, Gemini CLI, Cursor und GitHub Copilot: https://agents.md/
- Claude Code: CLAUDE.md mit Import `@AGENTS.md` (https://code.claude.com/docs/en/memory) und Skills unter `.claude/skills/<name>/SKILL.md` (https://code.claude.com/docs/en/skills).
- Eigene Vorarbeit: Methodenkatalog und METHODE.md je Projekt (seit 23.11.2026), Kapitel „Weiterarbeiten mit einem Coding-Agenten“ in den Apps des KI Lernlabors (seit 20.11.2026), Rezepte der Frühen Simulationen (21.11.2026) und des Parametric Planning Catalogue (23.11.2026).

## Darstellung

Markdown-Dateien in fester Ordnerlage. Das Wissen liegt in drei Schichten: Katalog (Index, Vergleich, Wissen über alle Studien), METHODE.md je Projekt (ein Raster für alle) und Skills (Abläufe für Aufgabenarten); dazu Rezepte für Serien gleichartiger Apps. Die Startdatei `AGENTS.md` sagt, was zuerst zu lesen ist; `CLAUDE.md` importiert sie. `PROJEKTE.md` verbindet jedes Projekt mit App, Methode und Quellcode-Paket.

## Korpus

Die METHODE.md aller Projekte des Lab (am 25.11.2026 zehn und diese), der Methodenkatalog mit Vorlage, drei Skills, zwei Rezepte und das Konzept des Coding-Agent-Kapitels. Kein Korpus von außen.

## Generator

Kein Generator im Sinn der Studien. `paket.py` stellt das Paket bei jedem Bau der Website aus dem aktuellen Stand der Quellen zusammen, passt interne Stellen in der Kopie an (Liste `anpassungen()`), erzeugt `PROJEKTE.md` aus `projekte.json` und dem Bau und schreibt das ZIP mit fester Zeit (gleicher Inhalt → gleiches Paket).

## Prüfer

- Datenschutz beim Bau (`privat_befunde`): jede Datei gegen Muster für private Pfade, E-Mail-Adressen, Zugangsschlüssel und -daten, Gedächtnisdateien, interne Abläufe und verbotene Dateinamen (BKI-Kennwerte, `.env`). Ein Befund bricht den Bau ab, ebenso eine Anpassung, die nicht mehr greift.
- `pruefe.py` (`pruefe_wissensbasis`): Paket vollständig (alle METHODE.md aus `projekte.json`, Skills mit Name und Beschreibung, Rezepte, Lizenz und Namensnennung), Einzeldateien und Links der Seite vorhanden, Seite deutsch und englisch, nur eine Kachel mit Rang „anfang“.
- Ob ein Agent mit dem Paket besser startet als ohne, ist nicht gemessen: noch offen.

## Handschrift

Die Arbeitsweise des Lab – erst Maßstab und Prüfer, Saat, jeder Wunsch ein Test, Quellen belegen, offen veröffentlichen – steckt als Arbeitsregeln in `AGENTS.md` und als Abläufe in den Skills. Die entwerferische Handschrift bleibt in den Projekten und ihren METHODE.md.

## Was trägt

- **Ein Raster für alle METHODE.md** macht Projekte vergleichbar und für Agenten schnell lesbar (`methoden/VORLAGE_METHODE.md`).
- **Eine Startdatei für alle Agenten:** `AGENTS.md`; `CLAUDE.md` importiert sie, kein doppelter Text.
- **Paket aus den Quellen beim Bau** statt Kopie von Hand: veraltet nicht (`paket.py`, `baue_paket`).
- **Anpassungen als Liste, die greifen muss:** Ändert sich eine Quelle, fällt der Bau auf, statt interne Stellen still zu veröffentlichen.

## Stolperfallen

- **Punktordner** `.claude/` liefern manche Webserver nicht aus, und Dateimanager verstecken ihn: Einzeldateien liegen unter `dateien/skills/`, im Paket unter `.claude/skills/`; LIESMICH.md und Seite weisen auf den versteckten Ordner hin.
- **Skills mit internen Pfaden** (Tutorial-Seite) sind außerhalb nicht verständlich: weglassen statt halb anpassen.
- **Pfade der Quell-Repos** in den METHODE.md: in LIESMICH.md erklärt; die veröffentlichten Teile stehen in den Quellcode-Paketen.

## Offen

Test mit einem frischen Agenten an einer echten neuen Studie; englische Fassung von Katalog und Skills; Weg und Prüfung für METHODE.md, die von außen zurückkommen; Repo der Website öffentlich machen, damit die Rezepte mit ihren Werkzeugen nutzbar sind.
