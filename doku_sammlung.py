"""Sammelseite der Dokumentationen: lab/doku/ (Wunsch Reinhard 26.11.2026).

Jede App mit Dokumentation (projekte.json „doku“: Ordner und Kennung, z. B. „doku/#kremlas“) baut ihre Dokumentation wie bisher selbst (doku_bauen.py des Projekts,
Vorlage Tutorials/_werkzeuge/mockup/page.html, Modus „apps“, ein Eintrag in DATA.apps). bauen.py kopiert sie nach lab/<app>/doku/; danach
setzt sammle() alle Einträge zu einer Seite lab/doku/index.html zusammen:
  - Übersicht lab/doku/#  zeigt alle Dokumentationen, jede ist direkt lab/doku/#<id> (z. B. #kremlas, #proceduralcities, #bergdoerfer)
  - Bilder nach lab/doku/img/<id>/, Links der Einträge („App öffnen“, ../…) auf lab/doku/ umgerechnet
  - die Leiste oben führt je nach geöffneter Dokumentation zurück zu deren App, dazu KI Lab und Methode
  - lab/<app>/doku/ wird eine Weiterleitung nach lab/doku/#<id> (Sprungmarken gehen mit), die Bilder dort entfallen
  - in den HTML-Seiten der App zeigen Links „doku/#…“ direkt auf ../doku/#… (die Weiterleitung fängt Links aus Skripten ab)
Englisch (27.11.2026, mit Design Explorations): Hat eine Dokumentation daneben eine en.html (Lernbereiche des KI Lernlabors), entsteht
lab/doku/en.html mit allen Einträgen, englisch, wo es eine Übersetzung gibt; der Umschalter DE/EN (DATA.lang mit „apps“) ist bei
Dokumentationen ohne Übersetzung grau, en.html#<id> ohne Übersetzung springt auf die deutsche Fassung.
Dokumentation im Ordner der App selbst („doku“: „#<id>“, Design Explorations, Wunsch Reinhard 27.11.2026): index.html und en.html dort
werden Weiterleitungen, die übrigen Dateien (Downloads wie das Startpaket) bleiben liegen und die Downloads der Dokumentation zeigen dorthin.
Die Sammelseite hat keine Kachel; man erreicht sie über die Apps (Entscheidung Reinhard 26.11.2026).
Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 26.11.2026
"""
import json, os, posixpath, re, shutil, sys

ZIEL = "lab/doku/"


def adresse(p, zur_lab):
    """Adresse der Dokumentation eines Projekts in der Sammelseite, von einer Seite aus, die zur_lab (z. B. „../../“) unter lab/ liegt."""
    return f"{zur_lab}doku/#{p['doku'].split('#', 1)[1]}" if p.get("doku") and "#" in p["doku"] else None


def _lies_data(html):
    i = html.index("const DATA = ") + len("const DATA = ")
    data, ende = json.JSONDecoder().raw_decode(html, i)
    return data


def _umrechnen(wert, alt_ordner, pid, geschwister=False, schluessel=None):
    """Pfade im Eintrag: img/… → img/<pid>/…; ../… (relativ zum alten Ordner lab/<app>/doku/) → relativ zu lab/doku/.
    geschwister: Die übrigen Dateien des alten Ordners bleiben liegen; relative Downloads („href“: „Paket.zip“) zeigen dann dorthin."""
    def pfad(u):
        if u.startswith("img/"):
            return f"img/{pid}/" + u[4:]
        if u.startswith("../"):
            pfad_neu = posixpath.relpath(posixpath.normpath(posixpath.join(alt_ordner, u)), ZIEL.rstrip("/"))
            return pfad_neu + "/" if u.endswith("/") else pfad_neu
        if geschwister and schluessel in ("href", "open") and u and not re.match(r"^(?:[a-z][a-z0-9+.-]*:|#|/)", u, re.I):
            return posixpath.relpath(posixpath.join(alt_ordner, u), ZIEL.rstrip("/"))
        return u
    def text(s):
        s = pfad(s)
        return re.sub(r'((?:src|href)=["\']|\]\()((?:\.\./)+[^"\')\s]*|img/[^"\')\s]*)', lambda m: m.group(1) + pfad(m.group(2)), s)
    if isinstance(wert, dict):
        return {k: _umrechnen(v, alt_ordner, pid, geschwister, k) for k, v in wert.items()}
    if isinstance(wert, list):
        return [_umrechnen(v, alt_ordner, pid, geschwister, schluessel) for v in wert]
    if isinstance(wert, str):
        return text(wert)
    return wert


WEITER = ('<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><title>{titel} · Dokumentation</title><meta name="robots" content="noindex">\n'
          '<link rel="canonical" href="{z}#{pid}"><meta http-equiv="refresh" content="0; url={z}#{pid}">\n'
          '<script>/* Seit 26.11.2026 liegen alle Dokumentationen unter lab/doku/ (Wunsch Reinhard); Sprungmarken gehen mit */\n'
          '/* Anker ohne Kennung (z. B. #k11 aus der alten Einzelseite) bekommen sie vorn: #{pid}-k11 (Kapitel-IDs gibt es in der Sammlung mehrfach, Befund planungsgrundlagen-36) */\n'
          'var h = location.hash.slice(1); location.replace("{z}#" + (!h ? "{pid}" : h.split("-")[0] === "{pid}" ? h : "{pid}-" + h));</script>\n'
          '</head><p>Die Dokumentation liegt jetzt unter <a href="{z}#{pid}">lab/doku/#{pid}</a> · The documentation has moved to '
          '<a href="{z}#{pid}">lab/doku/#{pid}</a>.</p></html>\n')

# Ordner einer App, die direkt startet (Gartenatelier, Wunsch Reinhard 27.11.2026): ohne Anker zur App, mit Anker (alte Links) zur Dokumentation
WEITER_APP = ('<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><title>{titel}</title>\n'
              '<script>/* Die Adresse startet die App; alte Sprungmarken der Beschreibung führen zur Dokumentation auf lab/doku/ (27.11.2026) */\n'
              'var h = location.hash.slice(1); location.replace(!h ? "{app}" : "{z}#" + (h.split("-")[0] === "{pid}" ? h : "{pid}-" + h));</script>\n'
              '<noscript><meta http-equiv="refresh" content="0; url={app}"></noscript>\n'
              '</head><p><a href="{app}">{titel}</a> · <a href="{z}#{pid}">Dokumentation · Documentation</a></p></html>\n')

LEISTE = ('<nav class="ef-zurueck" style="position:relative;z-index:31;background:#000;padding:8px 16px;font:500 12px/1 Geist Mono,ui-monospace,monospace;'
          'letter-spacing:.06em;text-transform:uppercase;display:flex;flex-wrap:wrap;gap:4px 0;align-items:center">'
          '<a id="ef-app" href="../../" style="color:#fff;text-decoration:none">← Entwurfsforschung · KI Lab</a>'
          '<a id="ef-lab" href="../../" style="color:#9ea0f3;text-decoration:none;margin-left:1.5em" hidden>KI Lab</a>'
          '<a id="ef-methode" href="../methode/" style="color:#9ea0f3;text-decoration:none;margin-left:1.5em" hidden>Methode · Method</a>'
          '<span id="ef-stand" style="margin-left:auto;color:#8a8a8f" title="Stand der Dokumentation und der App · Documentation and app as of"></span></nav>\n'
          '<script>/* Leiste je nach geöffneter Dokumentation: zurück zu deren App (Wunsch Reinhard 26.11.2026) */\n'
          'function efLeiste() {{ const L = {leiste}, id = location.hash.replace(/^#/, "").split("-")[0], e = L[id], $ = i => document.getElementById(i);\n'
          '  $("ef-app").textContent = e ? "← " + e.name + " · App" : "← Entwurfsforschung · KI Lab"; $("ef-app").href = e ? e.app : "../../";\n'
          '  $("ef-lab").hidden = !e; $("ef-methode").hidden = !(e && e.methode); if (e && e.methode) $("ef-methode").href = e.methode;\n'
          '  $("ef-stand").textContent = e && e.stand ? e.stand : ""; }}\n'
          'efLeiste(); window.addEventListener("hashchange", efLeiste);</script>\n')

LEISTE_EN = [("← Entwurfsforschung · KI Lab", "← Entwurfsforschung · AI Lab"), (">KI Lab</a>", ">AI Lab</a>"), (">Methode · Method</a>", ">Method</a>")]

HERO = {"de": {"label": "KI Lab · Dokumentationen", "h1": "Wie die Apps <em>arbeiten</em>.",
               "p": "Die Dokumentationen der Apps im KI Lab von entwurfsforschung.de: Herkunft und Vorarbeiten, eigene Umsetzung, Prüfungen und Ergebnisse. "
                    "Jede App öffnet ihre Dokumentation über den Knopf „Dokumentation“.",
               "progLabel": "Dokumentationen", "zaehl": ["Dokumentation", "Dokumentationen"], "soon": ["Dokumentation", "Weitere"]},
        "en": {"label": "AI Lab · Documentation", "h1": "How the apps <em>work</em>.",
               "p": "The documentation of the apps in the AI Lab of entwurfsforschung.de: origins and earlier work, our own implementation, checks and results. "
                    "Every app opens its documentation with the “Documentation” button. Where there is no English version yet, the German one opens.",
               "progLabel": "Documentation", "zaehl": ["documentation", "documentations"], "soon": ["Documentation", "More"]}}


def _seite(Q, data, leiste, en):
    """Seite aus Tutorials/_werkzeuge/mockup/page.html; en: Beschriftungen der Vorlage wie in en_apps.py (Lernlabor) übersetzt."""
    mock = os.path.join(Q, "Tutorials", "_werkzeuge", "mockup")
    page = open(os.path.join(mock, "page.html"), encoding="utf-8").read()
    logo = open(os.path.join(mock, "logo.svg"), encoding="utf-8").read()
    uni = open(os.path.join(mock, "uni_logo.svg"), encoding="utf-8").read().split("-->\n", 1)[1]
    titel = "Documentation · AI Lab · Entwurfsforschung" if en else "Dokumentationen · KI Lab · Entwurfsforschung"
    for a, b in (("/*__DATA__*/", "const DATA = " + json.dumps(data, ensure_ascii=False) + ";"), ("<!--__LOGO__-->", logo), ("<!--__UNI__-->", uni),
                 ("/*__ISSUES__*/null", "null"), ('<meta name="claude:viewport-fit-sides" content="cover">\n', ""),
                 ("<title>InfAU Tutorials</title>", f"<title>{titel}</title>"),
                 ('aria-label="Tutorials Übersicht"><span', 'aria-label="Documentation in the AI Lab"><span' if en else 'aria-label="Dokumentationen im KI Lab"><span'),
                 ('<span class="label">Tutorials</span></a>', '<span class="label">AI Lab · Documentation</span></a>' if en else '<span class="label">KI Lab · Dokumentationen</span></a>')):
        assert a in page, a
        page = page.replace(a, b)
    if en:                                                             # dieselben Tabellen wie die englische Fassung des KI Lernlabors
        sys.path.insert(0, os.path.join(Q, "Apps", "_werkzeuge"))
        import en_apps, vorlage_en
        for a, b in list(vorlage_en.EN) + en_apps.APPS_EN:
            page = page.replace(a, b)
    page = re.sub(r'<link[^>]+href="https://fonts\.(?:googleapis|gstatic)\.com"[^>]*>\s*', "", page)
    page = re.sub(r'<link[^>]+href="https://fonts\.googleapis\.com/css2[^"]*"[^>]*>', '<link rel="stylesheet" href="../../schrift/geist.css">', page)
    assert "fonts.googleapis" not in page and "fonts.gstatic" not in page
    head, rest = page.split("<header", 1)
    nav = LEISTE.format(leiste=json.dumps(leiste, ensure_ascii=False))
    if en:
        for a, b in LEISTE_EN:
            nav = nav.replace(a, b)
    html = (f'<!doctype html>\n<html lang="{"en" if en else "de"}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + ('<meta name="description" content="Documentation of the apps in the AI Lab of entwurfsforschung.de.">\n' if en
               else '<meta name="description" content="Dokumentationen der Apps im KI Lab von entwurfsforschung.de.">\n')
            + head + "</head>\n<body>\n" + nav + "<header" + rest + "\n</body>\n</html>\n")
    if en:
        sys.path.insert(0, os.path.join(Q, "Apps", "_werkzeuge"))
        import vorlage_en
        for a, b in vorlage_en.KOPF:
            html = html.replace(a, b)
    import kopf                                                        # Kopf der Website statt Uni-Wortmarke auf Blau (Wunsch Reinhard 27.11.2026)
    html = kopf.ersetze_kopf(html, Q, "../../", en)
    assert not re.search(r"(src|href)=\"https?://(?!doi\.org)[^\"]*\.(js|css|woff2?)", html), "Inhalte fremder Server"
    return html


def sammle(site, projekte, Q, methode_ids, stand_von=None):
    """site: Ausgabeordner; projekte: Liste aus projekte.json; Q: quelle_basis (Planungsgrundlagen, für page.html);
    methode_ids: Projekt-ids mit Methodenseite. Gibt die gesammelten Einträge als [(projekt-id, doku-id)] zurück."""
    ziel = os.path.join(site, *ZIEL.strip("/").split("/"))
    if os.path.exists(ziel):
        shutil.rmtree(ziel)
    os.makedirs(os.path.join(ziel, "img"))
    progs, progs_en, en_ids, leiste, leiste_en, liste = [], [], [], {}, {}, []
    for p in projekte:
        if not p.get("doku") or p.get("nur_kachel"):
            continue
        ordner, _, kennung = p["doku"].partition("#")
        bleibt = not ordner.strip("/")                                 # Dokumentation im Ordner der App selbst: Downloads bleiben dort
        alt_ordner = posixpath.join(p["ziel"].rstrip("/"), ordner.strip("/")).rstrip("/")   # z. B. lab/kremlas/doku
        alt = os.path.join(site, *alt_ordner.split("/"))
        seite = os.path.join(alt, "index.html")
        if not os.path.isfile(seite):
            raise SystemExit(f"{p['id']}: Dokumentation {alt_ordner}/index.html fehlt (projekte.json „doku“)")
        html = open(seite, encoding="utf-8").read()
        data = _lies_data(html)
        seite_en = os.path.join(alt, "en.html")
        data_en = _lies_data(open(seite_en, encoding="utf-8").read()) if os.path.isfile(seite_en) else None
        m = re.search(r'class="ef-stand"[^>]*>\s*(?:Stand\s+)?Dokumentation\s+([0-9.]+)\s*·\s*(?:Stand\s+)?App\s+([0-9.]+)', html)
        if kennung and [e["id"] for e in data["apps"]] != [kennung]:
            raise SystemExit(f"{p['id']}: projekte.json „doku“ nennt #{kennung}, die Dokumentation hat {[e['id'] for e in data['apps']]}")
        if data_en and [e["id"] for e in data_en["apps"]] != [e["id"] for e in data["apps"]]:
            raise SystemExit(f"{p['id']}: en.html hat andere Einträge als index.html")
        zurueck = p.get("zurueck")                                     # Leiste: zurück zur Seite, von der man kommt (Design Explorations → Design Explorer)
        mid = p.get("methode_von") or p["id"]
        for i, e in enumerate(data["apps"]):
            pid = e["id"]
            e = _umrechnen(e, alt_ordner, pid, bleibt)
            if m and not e.get("standDoku"):
                e["standDoku"], e["standApp"] = m.group(1), m.group(2)
            progs.append(e)
            e_en = _umrechnen(data_en["apps"][i], alt_ordner, pid, bleibt) if data_en else e
            for k in ("standDoku", "standApp"):
                if e.get(k) and not e_en.get(k):
                    e_en[k] = e[k]
            progs_en.append(e_en)
            if data_en:
                en_ids.append(pid)
            app = (posixpath.relpath(zurueck["href"].split("#")[0].rstrip("/"), ZIEL.rstrip("/")) + "/" + ("#" + zurueck["href"].split("#", 1)[1] if "#" in zurueck["href"] else "")
                   if zurueck else e.get("open") or posixpath.relpath(p["ziel"].rstrip("/"), ZIEL.rstrip("/")) + "/")
            stand = " · ".join(x for x in [f"Dokumentation {e['standDoku']}" if e.get("standDoku") else "", f"App {e['standApp']}" if e.get("standApp") else ""] if x)
            methode = f"../methode/{mid}/" if mid in methode_ids else ""
            leiste[pid] = {"name": zurueck["de"] if zurueck else p["titel"]["de"], "app": app, "methode": methode, "stand": stand}
            leiste_en[pid] = {"name": zurueck["en"] if zurueck else p["titel"].get("en") or p["titel"]["de"], "app": app, "methode": methode,
                              "stand": stand.replace("Dokumentation ", "Documentation ")}
            liste.append((p["id"], pid))
        if os.path.isdir(os.path.join(alt, "img")):
            shutil.copytree(os.path.join(alt, "img"), os.path.join(ziel, "img", data["apps"][0]["id"]))
        z = posixpath.relpath(ZIEL.rstrip("/"), alt_ordner) + "/"
        weiter = WEITER.format(titel=p["titel"]["de"], z=z, pid=data["apps"][0]["id"])
        if bleibt and p.get("start", "index.html") != "index.html":
            weiter = WEITER_APP.format(titel=p["titel"]["de"], z=z, pid=data["apps"][0]["id"], app=p["start"])
        if bleibt:                                                     # Ordner der App: nur die Seiten werden Weiterleitungen, Downloads bleiben
            shutil.rmtree(os.path.join(alt, "img"), ignore_errors=True)
            open(seite, "w", encoding="utf-8", newline="\n").write(weiter)
            if data_en:
                w = WEITER_APP if p.get("start", "index.html") != "index.html" else WEITER
                open(seite_en, "w", encoding="utf-8", newline="\n").write(
                    w.format(titel=p["titel"].get("en") or p["titel"]["de"], z=z + "en.html", pid=data["apps"][0]["id"], app=p.get("start")).replace('lang="de"', 'lang="en"'))
            continue
        # alter Ordner: nur noch die Weiterleitung
        shutil.rmtree(alt)
        os.makedirs(alt)
        open(os.path.join(alt, "index.html"), "w", encoding="utf-8", newline="\n").write(weiter)
        if data_en:
            open(os.path.join(alt, "en.html"), "w", encoding="utf-8", newline="\n").write(
                WEITER.format(titel=p["titel"].get("en") or p["titel"]["de"], z=z + "en.html", pid=data["apps"][0]["id"]).replace('lang="de"', 'lang="en"'))
        # Links der App-Seiten direkt auf die Sammelseite
        app_ordner = os.path.join(site, *p["ziel"].strip("/").split("/"))
        doku_rel = ordner.strip("/") + "/"
        for f in os.listdir(app_ordner):
            if f.endswith(".html") and os.path.isfile(os.path.join(app_ordner, f)):
                pf = os.path.join(app_ordner, f); t = open(pf, encoding="utf-8").read()
                neu = re.sub(r'href="' + re.escape(doku_rel) + r'(#[^"]*)?"', lambda mm: f'href="../doku/{mm.group(1) or "#" + data["apps"][0]["id"]}"', t)
                if neu != t:
                    open(pf, "w", encoding="utf-8").write(neu)
    if not progs:
        shutil.rmtree(ziel)
        return []
    def daten(apps, en, lang):
        d = {"mode": "apps", "programs": [], "soon": [], "apps": apps, "tutorialsUrl": None, "card": {"lines": 5, "topics": 6},
             "labels": {"open": "Open app", "bereich": "Documentation"} if en else {"open": "App öffnen", "bereich": "Dokumentation"},
             "hero": HERO["en" if en else "de"]}
        if lang:
            d["lang"] = lang
        return d
    mit_en = bool(en_ids)
    lang_de = {"aktuell": "de", "ziel": "en.html", "en": en_ids, "apps": True, "titel": "English version",
               "fehlt": "Noch keine englische Fassung · No English version yet"} if mit_en else None
    open(os.path.join(ziel, "index.html"), "w", encoding="utf-8", newline="\n").write(_seite(Q, daten(progs, False, lang_de), leiste, False))
    if mit_en:
        lang_en = {"aktuell": "en", "ziel": "index.html", "en": en_ids, "apps": True, "titel": "Zur deutschen Fassung", "fehlt": "Zur deutschen Fassung"}
        open(os.path.join(ziel, "en.html"), "w", encoding="utf-8", newline="\n").write(_seite(Q, daten(progs_en, True, lang_en), leiste_en, True))
    return liste
