"""Wissensbasis des KI Lab: Paket KI-Lab_Wissensbasis.zip und Einzeldateien zum Ansehen (Nutzer 25.11.2026).

bauen.py ruft baue_paket() am Ende des Baus auf. Das Paket entsteht immer aus dem aktuellen Stand der Quellen:
- METHODE.md aller Projekte aus projekte.json („methode“), Methodenkatalog und Vorlage aus Planungsgrundlagen/Apps/_methoden/,
- Skills: generative-studie aus Planungsgrundlagen/.claude/skills/ (angepasst) und die eigenen Skills in wissensbasis/skills/,
- Rezepte simulationen/REZEPT.md und katalog/REZEPT.md, Konzept des Coding-Agent-Kapitels (gekürzt),
- AGENTS.md, CLAUDE.md, LIESMICH.md aus wissensbasis/vorlagen/, PROJEKTE.md aus projekte.json und dem Bau in site/.

Datenschutz: Jede Datei geht vor der Aufnahme durch privat_befunde(); ein Befund bricht den Bau ab. Interne Stellen werden
in der Paketkopie angepasst (ANPASSUNGEN); jede Anpassung muss greifen, sonst bricht der Bau ab – dann hat sich die Quelle
geändert und die Liste hier ist nachzuziehen. Nicht ins Paket: Skill tutorial-erstellen (ohne interne Pfade nicht verständlich),
Gedächtnisdateien, Zugangsdaten, Daten Studierender, BKI-Kennwerte.
"""
import datetime, os, re, sys, zipfile

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
WURZEL = "KI-Lab_Wissensbasis"
ZIP = WURZEL + ".zip"
WEB = "https://entwurfsforschung.de/"
ATTRIBUTION = "Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic"

# ------------------------------------------------------------------ Datenschutz und Sicherheit
PRIVAT = [
    (r"(?i)\b[a-z]:[\\/]+users[\\/]", "privater Pfad (Benutzerordner)"),
    (r"(?i)(?<![\w.])/(?:home|users)/[a-z]", "privater Pfad (Benutzerordner)"),
    (r"(?i)appdata|localonlydata|\bkoeni\b", "privater Pfad"),
    (r"(?i)[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}", "E-Mail-Adresse"),
    (r"\b(?:sk-[A-Za-z0-9_-]{16,}|sk-ant-[A-Za-z0-9_-]+|glpat-[A-Za-z0-9_-]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|xox[abpr]-[A-Za-z0-9-]+)",
     "Zugangsschlüssel"),
    (r"(?i)\b(?:api[_-]?key|token|passwor[dt]|kennwort|secret)\b[\"']?\s*[:=]\s*[\"']?[A-Za-z0-9_\-./+]{8,}", "Zugangsdaten"),
    (r"-----BEGIN [A-Z ]*PRIVATE KEY", "privater Schlüssel"),
    (r"(?i)\.claude[\\/]projects|\bMEMORY\.md\b", "Gedächtnisdatei"),
    (r"(?i)planungsgrundlagen-ce|deploy\.local\.json", "interne Arbeitsabläufe"),
    (r"(?i)matrikel", "Daten Studierender"),
]
VERBOTENE_NAMEN = {"kosten_kennwerte.json", ".env", "deploy.local.json", "memory.md"}


def privat_befunde(name, text):
    """→ Liste der Befunde für eine Paketdatei (leer = in Ordnung). Auch pruefe.py benutzt diese Prüfung."""
    b = []
    if os.path.basename(name).lower() in VERBOTENE_NAMEN:
        b.append(f"{name}: Dateiname nicht erlaubt")
    for muster, was in PRIVAT:
        m = re.search(muster, text)
        if m:
            b.append(f"{name}: {was} („{m.group(0)[:40]}“)")
    return b


# ------------------------------------------------------------------ Anpassungen in der Paketkopie
def _ordner_zu_id(cfg):
    """Ordnername der METHODE.md → Projekt-id (Apps/malagueira/METHODE.md → duarte-siza), aus projekte.json."""
    return {os.path.basename(os.path.dirname(p["methode"])): p["id"] for p in cfg["projekte"] if p.get("methode")}


def anpassungen(cfg):
    """paket_pfad → [(muster, ersatz, beschreibung)]; muster ist ein regulärer Ausdruck, ersatz Text oder Funktion."""
    ids = _ordner_zu_id(cfg)
    def link(m):
        if m.group(2) not in ids:
            sys.exit(f"wissensbasis: Methodenkatalog verlinkt {m.group(0)}, kein Projekt in projekte.json – ANPASSUNGEN in wissensbasis/paket.py nachziehen")
        return f"[{ids[m.group(2)]}](projekte/{ids[m.group(2)]}/METHODE.md)"
    return {
        "methoden/README.md": [
            (r"\[([^\]]+)\]\(\.\./(?:\.\./)?([A-Za-z_]+)/METHODE\.md\)", link, "Links auf die METHODE.md der Projekte zeigen auf methoden/projekte/<id>/"),
            (r"`entwurfsforschung/simulationen/METHODE\.md` \(eigenes Repo\)", "[simulationen](projekte/simulationen/METHODE.md)", "METHODE.md der Frühen Simulationen liegt im Paket"),
            (r"\s*\(DFG-Antragskonzept[^)]*\)", "", "Hinweis auf eine interne Planung entfernt"),
            (r"(?m)^- [^\n]*planungsgrundlagen-ce[^\n]*\n", "", "offene Aufgabe zum internen Bauablauf entfernt"),
            (r"dem lokalen Skill `generative-studie` \(Ablauf\)", "dem Skill `generative-studie` (Ablauf, `.claude/skills/generative-studie/SKILL.md`)", "Ort des Skills im Paket"),
        ],
        ".claude/skills/generative-studie/SKILL.md": [
            (r"Stil-Nachbildung eines Büros \(DFG-Antrag\), neue App für entwurfsforschung\.de/lab",
             "Stil-Nachbildung eines Büros, neue App nach dem Muster des KI Lab (entwurfsforschung.de/lab)", "Hinweis auf eine interne Planung entfernt"),
            (r"`Apps/_methoden/README\.md`", "`methoden/README.md`", "Pfade des Methodenkatalogs auf das Paket umgestellt"),
            (r"`Apps/_methoden/VORLAGE_METHODE\.md`", "`methoden/VORLAGE_METHODE.md`", "Pfad der Vorlage auf das Paket umgestellt"),
            (r"die `METHODE\.md` der ein bis drei nächstverwandten Projekte",
             "die `METHODE.md` der ein bis drei nächstverwandten Projekte (`methoden/projekte/<id>/METHODE.md`, Übersicht in `PROJEKTE.md`)", "Ort der METHODE.md im Paket"),
            (r"\(superpowers:brainstorming\)", "(im Gespräch mit dem Menschen, der das Projekt verantwortet; ein Brainstorming-Skill hilft, falls vorhanden)",
             "Verweis auf ein Plugin, das nicht jeder hat, allgemein gefasst"),
            (r";\s*Deploy auf entwurfsforschung\.de[^.]*\.", ".", "Hinweis auf den internen Deploy-Ablauf entfernt"),
            (r"Autorenzeile „Prof\. Dr\. Reinhard König in Zusammenarbeit mit Claude von Anthropic“;",
             f"Autorenzeile des eigenen Projekts; wer Inhalte aus dem KI Lab übernimmt, nennt „{ATTRIBUTION}“ (CC BY 4.0);",
             "Autorenzeile für eigene Projekte allgemein gefasst"),
        ],
        "konzepte/KONZEPT_Coding_Agent_Kapitel.md": [
            (r"\(`Apps/malagueira/lernbereich\.py`[^)]*\)",
             f"(Paket {WEB}lab/formgrammatik/Studie_Formgrammatik_Quellcode.zip mit README.md, AGENTS.md, Quellen, Tests; Duarte/Siza unter konzepte/2026-11-20_Experiment_Siza_Malagueira/)", "interner Pfad durch das öffentliche Paket ersetzt"),
            (r"(?s)## Umfang\n.*?(?=\n## )", "", "Abschnitt „Umfang“ (Arbeitsliste des KI Lernlabors) entfernt"),
            (r"(?m)^- [^\n]*(?:en_apps\.py|GROSSE_DOWNLOADS)[^\n]*\n", "", "Hinweise auf interne Bauwerkzeuge des KI Lernlabors entfernt"),
        ],
    }


def anpassen(pfad, text, regeln):
    """Wendet die Anpassungen an; eine Regel, die nicht greift, bricht den Bau ab (die Quelle hat sich geändert)."""
    for muster, ersatz, was in regeln:
        text, n = re.subn(muster, ersatz, text)
        if not n:
            sys.exit(f"wissensbasis: Anpassung „{was}“ greift in {pfad} nicht mehr – Quelle geändert? ANPASSUNGEN in wissensbasis/paket.py nachziehen")
    return re.sub(r"\n{3,}", "\n\n", text)                              # Leerzeilen entfernter Abschnitte


# ------------------------------------------------------------------ Projekte und ihre Pakete
def projekt_liste(cfg, site):
    """Je Projekt (außer der Wissensbasis): id, Titel, Ziel, METHODE.md im Paket, Pakete im Bau (Pfade relativ zu site/)."""
    L = []
    for p in cfg["projekte"]:
        if p["id"] == "wissensbasis":
            continue
        z = os.path.join(site, p["ziel"])
        pakete, je_app = [], []
        if os.path.isdir(z):
            pakete = [p["ziel"] + f for f in sorted(os.listdir(z)) if f.lower().endswith(".zip")]
            je_app = [p["ziel"] + a + "/quellcode.zip" for a in sorted(os.listdir(z)) if os.path.isfile(os.path.join(z, a, "quellcode.zip"))]
        L.append({"id": p["id"], "titel": p["titel"], "ziel": p["ziel"], "kategorie": p["kategorie"],
                  "methode": f"methoden/projekte/{p['id']}/METHODE.md" if p.get("methode") else None,
                  "pakete": pakete, "je_app": je_app, "offen": os.path.isdir(z) and not pakete and not je_app})
    return L


def projekte_md(liste):
    z = ["# Projekte im KI Lab", "",
         f"Stand des Baus von entwurfsforschung.de. Jede App ist offen weiterentwickelbar; Lizenz CC BY 4.0, Namensnennung „{ATTRIBUTION}“.", "",
         "| Projekt | App | Methode (im Paket) | Quellcode |", "|---|---|---|---|"]
    for e in liste:
        if e["pakete"]:
            q = " · ".join(f"[{os.path.basename(x)}]({WEB}{x})" for x in e["pakete"])
        elif e["je_app"]:
            q = f"je App ein `quellcode.zip` ({len(e['je_app'])} Apps), z. B. [{e['je_app'][0].split('/')[-2]}]({WEB}{e['je_app'][0]})"
        elif e["offen"]:
            q = "kein Paket; die App-Dateien liegen offen im Ordner der App"
        else:
            q = "eigenes Werkzeug, kein Paket veröffentlicht"
        m = f"[METHODE.md]({e['methode']})" if e["methode"] else "–"
        z.append(f"| {e['titel']['de']} | {WEB}{e['ziel']} | {m} | {q} |")
    z += ["", f"Alle Methodenbeschreibungen als Webseiten: {WEB}lab/methode/", ""]
    return "\n".join(z)


# ------------------------------------------------------------------ Paket
def quellen(cfg, methoden):
    """→ [(paket_pfad, quelle)] in fester Reihenfolge."""
    Q = cfg["quelle_basis"]
    L = [("methoden/README.md", os.path.join(Q, "Apps", "_methoden", "README.md")),
         ("methoden/VORLAGE_METHODE.md", os.path.join(Q, "Apps", "_methoden", "VORLAGE_METHODE.md"))]
    L += [(f"methoden/projekte/{pid}/METHODE.md", pfad) for pid, pfad in methoden.items()]
    L += [(".claude/skills/generative-studie/SKILL.md", os.path.join(Q, ".claude", "skills", "generative-studie", "SKILL.md"))]
    eigen = os.path.join(HIER, "skills")
    L += [(f".claude/skills/{s}/SKILL.md", os.path.join(eigen, s, "SKILL.md")) for s in sorted(os.listdir(eigen))]
    L += [("rezepte/simulationen/REZEPT.md", os.path.join(REPO, "simulationen", "REZEPT.md")),
          ("rezepte/katalog/REZEPT.md", os.path.join(REPO, "katalog", "REZEPT.md")),
          ("konzepte/KONZEPT_Coding_Agent_Kapitel.md", os.path.join(Q, "Apps", "_werkzeuge", "KONZEPT_Coding_Agent_Kapitel.md"))]
    for pp, q in L:
        if not os.path.isfile(q):
            sys.exit(f"wissensbasis: Quelle fehlt für {pp}: {q}")
    return L


def web_pfad(paket_pfad):
    """Pfad der Einzeldatei unter lab/wissensbasis/dateien/: .claude/skills/ → skills/ (Punktordner liefert nicht jeder Webserver aus)."""
    return "dateien/" + paket_pfad.replace(".claude/skills/", "skills/")


def baue_paket(ziel, cfg, methoden, site):
    """Schreibt <ziel>/KI-Lab_Wissensbasis.zip und <ziel>/dateien/…; → dict mit Dateiliste, Größe, Anpassungen, Stand."""
    regeln = anpassungen(cfg)
    dateien, angepasst, befunde = {}, [], []
    Lq = quellen(cfg, methoden)
    for pp, q in Lq:
        t = open(q, encoding="utf-8").read().replace("\r\n", "\n")
        if pp in regeln:
            t = anpassen(pp, t, regeln[pp])
            angepasst += [(pp, was) for _, _, was in regeln[pp]]
        dateien[pp] = t
    stand = datetime.date.fromtimestamp(max(os.path.getmtime(q) for _, q in Lq))
    liste = projekt_liste(cfg, site)
    dateien["PROJEKTE.md"] = projekte_md(liste)
    V = os.path.join(HIER, "vorlagen")
    skills = sorted(pp.split("/")[2] for pp in dateien if pp.startswith(".claude/skills/"))
    def beschreibung(s):
        m = re.search(r"(?m)^description:\s*(.+)$", dateien[f".claude/skills/{s}/SKILL.md"])
        if not m:
            sys.exit(f"wissensbasis: Skill {s} ohne description im Kopf")
        return m.group(1).strip()
    nicht = ["Skill `tutorial-erstellen`: ohne die internen Pfade und Werkzeuge der Tutorial-Seite nicht verständlich, deshalb nicht im Paket.",
             "Gedächtnisdateien, Zugangsdaten, Daten von Studierenden und lizenzierte Kennwerte (BKI) gehören nie ins Paket; jede Datei wird beim Bau darauf geprüft."]
    werte = {"STAND": stand.strftime("%d.%m.%Y"), "ATTRIBUTION": ATTRIBUTION, "WEB": WEB,
             "SKILLS": "\n".join(f"- **`{s}`** (`.claude/skills/{s}/SKILL.md`): {beschreibung(s)}" for s in skills),
             "ANPASSUNGEN": "\n".join(f"- `{pp}`: {was}" for pp, was in angepasst) + "\n" + "\n".join(f"- {x}" for x in nicht)}
    for name in ("AGENTS.md", "CLAUDE.md", "LIESMICH.md"):
        t = open(os.path.join(V, name.replace(".md", ".paket.md")), encoding="utf-8").read().replace("\r\n", "\n")
        for k, v in werte.items():
            t = t.replace("{{" + k + "}}", v)
        if "{{" in t:
            sys.exit(f"wissensbasis: Platzhalter in {name} nicht ersetzt")
        dateien[name] = t
    reihenfolge = ["LIESMICH.md", "AGENTS.md", "CLAUDE.md", "PROJEKTE.md"]
    namen = reihenfolge + sorted(n for n in dateien if n not in reihenfolge)
    for n in namen:
        befunde += privat_befunde(n, dateien[n])
    if befunde:
        sys.exit("wissensbasis: Paket enthält private oder geschützte Angaben:\n  " + "\n  ".join(befunde))
    os.makedirs(ziel, exist_ok=True)
    zeit = (stand.year, stand.month, stand.day, 12, 0, 0)                     # feste Zeit: gleicher Inhalt → gleiches ZIP (?v= bleibt)
    with zipfile.ZipFile(os.path.join(ziel, ZIP), "w", zipfile.ZIP_DEFLATED) as zf:
        for n in namen:
            info = zipfile.ZipInfo(f"{WURZEL}/{n}", date_time=zeit)
            info.external_attr = 0o644 << 16; info.compress_type = zipfile.ZIP_DEFLATED
            zf.writestr(info, dateien[n].encode("utf-8"))
    for n in namen:
        p = os.path.join(ziel, *web_pfad(n).split("/"))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "w", encoding="utf-8", newline="\n").write(dateien[n])
    open(os.path.join(ziel, ".htaccess"), "w", encoding="utf-8").write('AddType "text/plain; charset=utf-8" .md\n')
    return {"dateien": [(n, web_pfad(n), len(dateien[n].encode("utf-8"))) for n in namen], "zip": os.path.getsize(os.path.join(ziel, ZIP)),
            "angepasst": angepasst, "nicht": nicht, "stand": stand, "liste": liste}
