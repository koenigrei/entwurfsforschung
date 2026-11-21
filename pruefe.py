"""Prüft den Bau in site/ (Aufruf: python pruefe.py). Exit 1 bei Befunden.

- Startseite vorhanden, Daten aller Projekte eingesetzt, keine externen Schriften (Google Fonts) und keine Platzhalter
- Dunkel ist Voreinstellung (Papier schwarz ohne data-theme), Umschalter vorhanden
- je Projekt: Kachelbild, Zielordner mit index.html und Startdatei, alle Dateien und Ordner aus projekte.json
- Frühe Simulationen (simulationen/bestand.json): je App mit Status „umgesetzt“ index.html, modell.js, README, AGENTS, QUELLE, LICENSE,
  quellcode.zip (App + _gemeinsam), Pflichtlinks und Hinweise im <head>, Archivlink gültig, modell.js ohne DOM, Tests grün (node --test)
"""
import json, os, re, subprocess, sys, zipfile

HIER = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HIER, "site")


def pruefe(site=SITE, projekte=None):
    P = projekte or json.load(open(os.path.join(HIER, "projekte.json"), encoding="utf-8"))["projekte"]
    b = []
    idx = os.path.join(site, "index.html")
    if not os.path.exists(idx):
        return ["index.html fehlt"]
    h = open(idx, encoding="utf-8").read()
    if "fonts.googleapis" in h or "fonts.gstatic" in h:
        b.append("externe Schrift (Google Fonts) in index.html")
    if "{{" in h:
        b.append("Platzhalter {{…}} in index.html")
    if not re.search(r":root\s*\{[^}]*--paper:\s*#000(000)?\b", h):
        b.append("Dunkel ist nicht Voreinstellung (:root --paper #000)")
    if 'id="theme"' not in h:
        b.append("Umschalter Hell/Dunkel fehlt")
    for f in re.findall(r"url\((?:'|\")?(schrift/[^)'\"]+)", h):
        if not os.path.exists(os.path.join(site, f)):
            b.append(f"Schrift fehlt: {f}")
    for p in P:
        if f'"{p["id"]}"' not in h:
            b.append(f"{p['id']}: nicht in den Daten der Startseite")
        if not os.path.exists(os.path.join(site, "bilder", p["id"] + ".webp")):
            b.append(f"{p['id']}: Kachelbild fehlt")
        z = os.path.join(site, p["ziel"])
        for f in ["index.html", p["start"], *p.get("dateien", {})]:
            if not os.path.exists(os.path.join(z, f)):
                b.append(f"{p['id']}: {p['ziel']}{f} fehlt")
        for o in p.get("ordner", {}):
            if not os.path.isdir(os.path.join(z, o)) or not os.listdir(os.path.join(z, o)):
                b.append(f"{p['id']}: Ordner {p['ziel']}{o}/ fehlt oder leer")
    for e in json.load(open(os.path.join(HIER, "archiv.json"), encoding="utf-8"))["eintraege"]:   # Archiv (21.11.2026)
        d = os.path.join(site, "archiv", e["id"])
        if not os.path.exists(os.path.join(d, "index.html")):
            b.append(f"archiv/{e['id']}/index.html fehlt"); continue
        t = open(os.path.join(d, "index.html"), encoding="utf-8").read()
        if "et_pb_" in t or "mso-" in t or re.search(r"\\?\s*<a[^>]*>Entwurfsforschung", t):
            b.append(f"archiv/{e['id']}: Reste der alten Seite (Shortcodes, Office, Brotkrumen)")
        for src in re.findall(r'(?:src|href)="(medien/[^"]+)"', t):
            if not os.path.exists(os.path.join(d, src)):
                b.append(f"archiv/{e['id']}: {src} fehlt")
        if "<iframe" in t:
            b.append(f"archiv/{e['id']}: eingebetteter fremder Inhalt (iframe)")
    b += pruefe_archivlinks(site)
    a = os.path.join(site, "archiv", "index.html")
    if not os.path.exists(a):
        b.append("archiv/index.html fehlt")
    elif open(a, encoding="utf-8").read().count('"href"') < 10:
        b.append("archiv/index.html: weniger als 10 Kacheln")
    if not os.path.exists(os.path.join(site, "impressum", "index.html")):
        b.append("impressum/index.html fehlt")
    for f in ("index.html", os.path.join("archiv", "index.html")):
        if os.path.exists(os.path.join(site, f)) and open(os.path.join(site, f), encoding="utf-8").read().count("const DATA") != 1:
            b.append(f"{f}: DATA nicht genau einmal deklariert")
    for wurzel, _, dateien in os.walk(site):                          # keine Inhalte fremder Server (Datenschutz, 21.11.2026)
        for f in dateien:
            if f.endswith(".html"):
                t = open(os.path.join(wurzel, f), encoding="utf-8", errors="replace").read()
                for host in ("fonts.googleapis", "fonts.gstatic", "cdnjs.cloudflare", "cdn.jsdelivr", "<iframe"):
                    if host in t:
                        b.append(f"{os.path.relpath(os.path.join(wurzel, f), site)}: {host}")
    b += pruefe_simulationen(site)
    imp = os.path.join(site, "impressum", "index.html")
    if os.path.exists(imp):
        t = open(imp, encoding="utf-8").read()
        if "koenig@entwurfsforschung.de" in t:
            b.append("impressum: E-Mail-Adresse steht im Klartext (Spamschutz)")
        for muss in ("Windischenstr. 20", "99423 Weimar", "§ 18 Abs. 2 MStV", "Datenschutz"):
            if muss not in t:
                b.append(f"impressum: „{muss}“ fehlt")
    return b


ALT_LINK = re.compile(r"""(?i)^(?:(?:https?:)?//(?:www\.)?entwurfsforschung\.de)?/(?:alt(?:/|$)|indexC\.htm|Diss(?:/|$)|wp-|\?p=|\?page_id=)""")
NEU_PFAD = re.compile(r"(?i)^/(?:archiv|lab|impressum|neu|schrift|bilder|vendor)(?:/|$)|^/?$")


def pruefe_archivlinks(site=SITE):
    """Archiv (21.11.2026): kein Link in site/archiv/ zeigt auf die alte Website (/alt/…, /indexC.htm, /Diss, WordPress-Adressen) –
    außer den Adressen in archiv_offen.json (NetLogo/VBA, werden als Web-Apps umgehängt). Unterseiten: verlinkte Medien vorhanden."""
    b, offen = [], set()
    pfad = os.path.join(HIER, "archiv_offen.json")
    if os.path.exists(pfad):
        offen = {l["alt"].lower().replace("://www.", "://") for l in json.load(open(pfad, encoding="utf-8")).get("links", [])}
    wurzel_a = os.path.join(site, "archiv")
    for wurzel, _, dateien in os.walk(wurzel_a):
        if "index.html" not in dateien:
            continue
        rel = os.path.relpath(os.path.join(wurzel, "index.html"), site).replace(os.sep, "/")
        t = open(os.path.join(wurzel, "index.html"), encoding="utf-8").read()
        for ziel in re.findall(r'(?:href|src)="([^"]+)"', t):
            z = ziel.replace("&amp;", "&")
            m = re.match(r"(?i)^(?:https?:)?//(?:www\.)?entwurfsforschung\.de(/[^#]*)?", z)
            if m or ALT_LINK.match(z):
                pfad_ = (m.group(1) or "/") if m else z
                if z.split("#")[0].lower().replace("://www.", "://") in offen:
                    continue
                if m and NEU_PFAD.match(pfad_) and not ALT_LINK.match(pfad_):
                    continue
                if not m and not ALT_LINK.match(z):
                    continue
                b.append(f"{rel}: Link auf die alte Website {ziel}")
            elif "medien/" in z and "://" not in z and not os.path.exists(os.path.normpath(os.path.join(wurzel, z.split("#")[0]))):
                b.append(f"{rel}: {z} fehlt")
    return b


SIM_PFLICHT =["index.html", "modell.js", "app.js", "app.json", "README.md", "AGENTS.md", "QUELLE.md", "LICENSE.md", "quellcode.zip"]
SIM_STATUS = {"umgesetzt", "in_arbeit", "geplant", "aufgenommen", "nur_beschreibung", "nur_bilder", "zurueckgestellt"}


def pruefe_simulationen(site=SITE, tests=True):
    """Bereich lab/simulationen/ (21.11.2026)."""
    b, quelle = [], os.path.join(HIER, "simulationen")
    try:
        B = json.load(open(os.path.join(quelle, "bestand.json"), encoding="utf-8"))
    except Exception as e:
        return [f"simulationen/bestand.json: {e}"]
    ids = [e.get("id") for e in B["programme"]]
    if len(ids) != len(set(ids)):
        b.append("bestand.json: doppelte id")
    gruppen = {g["id"] for g in B.get("gruppen", [])}
    for e in B["programme"]:
        for k in ("id", "titel", "herkunft", "beschreibung", "umfang", "gruppe", "status", "archiv", "alt_seite"):
            if not e.get(k):
                b.append(f"bestand.json {e.get('id')}: Feld {k} fehlt")
        if e.get("status") not in SIM_STATUS:
            b.append(f"bestand.json {e.get('id')}: unbekannter Status {e.get('status')}")
        if e.get("gruppe") not in gruppen:
            b.append(f"bestand.json {e.get('id')}: unbekannte Gruppe {e.get('gruppe')}")
        if e.get("quellpfad") and not os.path.exists(os.path.join(HIER, e["quellpfad"])):
            b.append(f"bestand.json {e['id']}: Quelle {e['quellpfad']} fehlt")
        if not os.path.exists(os.path.join(site, "archiv", e.get("archiv", "x"), "index.html")):
            b.append(f"bestand.json {e['id']}: Archivseite archiv/{e.get('archiv')} fehlt")
    fertig = [e for e in B["programme"] if e.get("status") == "umgesetzt"]
    uebersicht = os.path.join(site, "lab", "simulationen", "index.html")
    if not os.path.exists(uebersicht):
        return b + ["lab/simulationen/index.html fehlt"]
    u = open(uebersicht, encoding="utf-8").read()
    if u.count("const DATA") != 1 or u.count('"href"') != len(fertig):
        b.append(f"lab/simulationen/index.html: {u.count(chr(34) + 'href' + chr(34))} Kacheln statt {len(fertig)}")
    for f in ("sim.js", "sim.css", "zufall.js"):
        if not os.path.exists(os.path.join(site, "lab", "simulationen", "_gemeinsam", f)):
            b.append(f"lab/simulationen/_gemeinsam/{f} fehlt")
    for e in fertig:
        aid = e.get("app") or e["id"]; d = os.path.join(site, "lab", "simulationen", aid); q = os.path.join(quelle, aid)
        for f in SIM_PFLICHT:
            if not os.path.exists(os.path.join(d, f)):
                b.append(f"simulationen/{aid}: {f} fehlt")
        if not os.path.exists(os.path.join(site, "lab", "simulationen", "bilder", aid + ".webp")):
            b.append(f"simulationen/{aid}: Kachelbild fehlt")
        if not (os.path.isdir(os.path.join(q, "test")) and any(f.endswith(".test.mjs") for f in os.listdir(os.path.join(q, "test")))):
            b.append(f"simulationen/{aid}: keine Tests test/*.test.mjs")
        if os.path.exists(os.path.join(d, "index.html")):
            t = open(os.path.join(d, "index.html"), encoding="utf-8").read()
            for muss, was in (('rel="help" href="AGENTS.md"', "<link rel=help>"), ('name="source" content="quellcode.zip"', "<meta name=source>"),
                              ('href="quellcode.zip"', "Link quellcode.zip"), ('href="AGENTS.md"', "Link AGENTS.md"), ("Weiterentwickeln", "„Quellcode · Weiterentwickeln“"),
                              ("Prof. Dr. Reinhard König", "Namensnennung"), ("../_gemeinsam/sim.js", "gemeinsamer Rahmen")):
                if muss not in t:
                    b.append(f"simulationen/{aid}/index.html: {was} fehlt")
            for a in re.findall(r'href="\.\./\.\./\.\./(archiv/[^"#]*)"', t):
                if not os.path.exists(os.path.join(site, a, "index.html")):
                    b.append(f"simulationen/{aid}/index.html: Archivlink {a} führt ins Leere")
            if "{{" in t or "TODO" in t:
                b.append(f"simulationen/{aid}/index.html: Platzhalter oder TODO")
        if os.path.exists(os.path.join(d, "modell.js")):
            m = re.sub(r"/\*.*?\*/|//[^\n]*", "", open(os.path.join(d, "modell.js"), encoding="utf-8").read(), flags=re.S)
            for wort in ("document.", "window.", "Math.random", "getContext"):
                if wort in m:
                    b.append(f"simulationen/{aid}/modell.js: {wort} (Modell muss ohne DOM und mit fester Saat laufen)")
        for f in ("QUELLE.md", "LICENSE.md", "AGENTS.md", "README.md"):
            p = os.path.join(d, f)
            if os.path.exists(p):
                t = open(p, encoding="utf-8").read()
                if "TODO" in t or "{{" in t:
                    b.append(f"simulationen/{aid}/{f}: Platzhalter oder TODO")
                if f == "LICENSE.md" and ("CC BY 4.0" not in t or "in Zusammenarbeit mit Claude von Anthropic" not in t):
                    b.append(f"simulationen/{aid}/LICENSE.md: CC BY 4.0 oder Namensnennung fehlt")
                if f == "QUELLE.md" and "../../../archiv/" not in t:
                    b.append(f"simulationen/{aid}/QUELLE.md: Link auf die Archivseite fehlt")
        z = os.path.join(d, "quellcode.zip")
        if os.path.exists(z):
            n = set(zipfile.ZipFile(z).namelist())
            for f in [f"{aid}/{x}" for x in SIM_PFLICHT if x != "quellcode.zip"] + ["_gemeinsam/sim.js", "_gemeinsam/zufall.js", "_gemeinsam/sim.css"]:
                if f not in n:
                    b.append(f"simulationen/{aid}/quellcode.zip: {f} fehlt")
            if not any(x.startswith(f"{aid}/test/") for x in n):
                b.append(f"simulationen/{aid}/quellcode.zip: Tests fehlen")
        if tests:
            try:
                r = subprocess.run(["node", "--test"], cwd=q, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=600)
                if r.returncode:
                    b.append(f"simulationen/{aid}: Tests rot – " + " | ".join(z for z in r.stdout.splitlines() if z.startswith("✖"))[:300])
            except FileNotFoundError:
                b.append("node fehlt – Tests der Simulationen nicht ausführbar")
            except subprocess.TimeoutExpired:
                b.append(f"simulationen/{aid}: Tests brauchen länger als 10 min")
    return b


if __name__ == "__main__":
    b = pruefe()
    print("\n".join(b) if b else "ok")
    sys.exit(1 if b else 0)
