"""Sammelseite der Dokumentationen: lab/doku/ (Wunsch Reinhard 26.11.2026).

Jede App mit Dokumentation (projekte.json „doku“: Ordner und Kennung, z. B. „doku/#kremlas“) baut ihre Dokumentation wie bisher selbst (doku_bauen.py des Projekts,
Vorlage Tutorials/_werkzeuge/mockup/page.html, Modus „apps“, ein Eintrag in DATA.apps). bauen.py kopiert sie nach lab/<app>/doku/; danach
setzt sammle() alle Einträge zu einer Seite lab/doku/index.html zusammen:
  - Übersicht lab/doku/#  zeigt alle Dokumentationen, jede ist direkt lab/doku/#<id> (z. B. #kremlas, #proceduralcities, #bergdoerfer)
  - Bilder nach lab/doku/img/<id>/, Links der Einträge („App öffnen“, ../…) auf lab/doku/ umgerechnet
  - die Leiste oben führt je nach geöffneter Dokumentation zurück zu deren App, dazu KI Lab und Methode
  - lab/<app>/doku/ wird eine Weiterleitung nach lab/doku/#<id> (Sprungmarken gehen mit), die Bilder dort entfallen
  - in den HTML-Seiten der App zeigen Links „doku/#…“ direkt auf ../doku/#… (die Weiterleitung fängt Links aus Skripten ab)
Die Sammelseite hat keine Kachel; man erreicht sie über die Apps (Entscheidung Reinhard 26.11.2026).
Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 26.11.2026
"""
import json, os, posixpath, re, shutil

ZIEL = "lab/doku/"


def adresse(p, zur_lab):
    """Adresse der Dokumentation eines Projekts in der Sammelseite, von einer Seite aus, die zur_lab (z. B. „../../“) unter lab/ liegt."""
    return f"{zur_lab}doku/#{p['doku'].split('#', 1)[1]}" if p.get("doku") and "#" in p["doku"] else None


def _lies_data(html):
    i = html.index("const DATA = ") + len("const DATA = ")
    data, ende = json.JSONDecoder().raw_decode(html, i)
    return data


def _umrechnen(wert, alt_ordner, pid):
    """Pfade im Eintrag: img/… → img/<pid>/…; ../… (relativ zum alten Ordner lab/<app>/doku/) → relativ zu lab/doku/."""
    def pfad(u):
        if u.startswith("img/"):
            return f"img/{pid}/" + u[4:]
        if u.startswith("../"):
            pfad_neu = posixpath.relpath(posixpath.normpath(posixpath.join(alt_ordner, u)), ZIEL.rstrip("/"))
            return pfad_neu + "/" if u.endswith("/") else pfad_neu
        return u
    def text(s):
        s = pfad(s)
        return re.sub(r'((?:src|href)=["\']|\]\()((?:\.\./)+[^"\')\s]*|img/[^"\')\s]*)', lambda m: m.group(1) + pfad(m.group(2)), s)
    if isinstance(wert, dict):
        return {k: _umrechnen(v, alt_ordner, pid) for k, v in wert.items()}
    if isinstance(wert, list):
        return [_umrechnen(v, alt_ordner, pid) for v in wert]
    if isinstance(wert, str):
        return text(wert)
    return wert


WEITER = ('<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><title>{titel} · Dokumentation</title><meta name="robots" content="noindex">\n'
          '<link rel="canonical" href="{z}#{pid}"><meta http-equiv="refresh" content="0; url={z}#{pid}">\n'
          '<script>/* Seit 26.11.2026 liegen alle Dokumentationen unter lab/doku/ (Wunsch Reinhard); Sprungmarken gehen mit */\n'
          'location.replace("{z}" + (location.hash.length > 1 ? location.hash : "#{pid}"));</script>\n'
          '</head><p>Die Dokumentation liegt jetzt unter <a href="{z}#{pid}">lab/doku/#{pid}</a> · The documentation has moved to '
          '<a href="{z}#{pid}">lab/doku/#{pid}</a>.</p></html>\n')

LEISTE = ('<nav class="ef-zurueck" style="position:sticky;top:0;z-index:50;background:#000;padding:8px 16px;font:500 12px/1 Geist Mono,ui-monospace,monospace;'
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


def sammle(site, projekte, Q, methode_ids, stand_von=None):
    """site: Ausgabeordner; projekte: Liste aus projekte.json; Q: quelle_basis (Planungsgrundlagen, für page.html);
    methode_ids: Projekt-ids mit Methodenseite. Gibt die gesammelten Einträge als [(projekt-id, doku-id)] zurück."""
    ziel = os.path.join(site, *ZIEL.strip("/").split("/"))
    if os.path.exists(ziel):
        shutil.rmtree(ziel)
    os.makedirs(os.path.join(ziel, "img"))
    progs, leiste, liste = [], {}, []
    for p in projekte:
        if not p.get("doku") or p.get("nur_kachel"):
            continue
        ordner, _, kennung = p["doku"].partition("#")
        alt_ordner = posixpath.join(p["ziel"].rstrip("/"), ordner.strip("/"))           # z. B. lab/kremlas/doku
        alt = os.path.join(site, *alt_ordner.split("/"))
        seite = os.path.join(alt, "index.html")
        if not os.path.isfile(seite):
            raise SystemExit(f"{p['id']}: Dokumentation {alt_ordner}/index.html fehlt (projekte.json „doku“)")
        html = open(seite, encoding="utf-8").read()
        data = _lies_data(html)
        m = re.search(r'class="ef-stand"[^>]*>\s*(?:Stand\s+)?Dokumentation\s+([0-9.]+)\s*·\s*(?:Stand\s+)?App\s+([0-9.]+)', html)
        if kennung and [e["id"] for e in data["apps"]] != [kennung]:
            raise SystemExit(f"{p['id']}: projekte.json „doku“ nennt #{kennung}, die Dokumentation hat {[e['id'] for e in data['apps']]}")
        for e in data["apps"]:
            pid = e["id"]
            e = _umrechnen(e, alt_ordner, pid)
            if m and not e.get("standDoku"):
                e["standDoku"], e["standApp"] = m.group(1), m.group(2)
            progs.append(e)
            app = e.get("open") or posixpath.relpath(p["ziel"].rstrip("/"), ZIEL.rstrip("/")) + "/"
            stand = " · ".join(x for x in [f"Dokumentation {e['standDoku']}" if e.get("standDoku") else "", f"App {e['standApp']}" if e.get("standApp") else ""] if x)
            leiste[pid] = {"name": p["titel"]["de"], "app": app, "methode": f"../methode/{p['id']}/" if p["id"] in methode_ids else "", "stand": stand}
            liste.append((p["id"], pid))
        if os.path.isdir(os.path.join(alt, "img")):
            shutil.copytree(os.path.join(alt, "img"), os.path.join(ziel, "img", data["apps"][0]["id"]))
        # alter Ordner: nur noch die Weiterleitung
        shutil.rmtree(alt)
        os.makedirs(alt)
        z = posixpath.relpath(ZIEL.rstrip("/"), alt_ordner) + "/"
        open(os.path.join(alt, "index.html"), "w", encoding="utf-8", newline="\n").write(WEITER.format(titel=p["titel"]["de"], z=z, pid=data["apps"][0]["id"]))
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
    data = {"mode": "apps", "programs": [], "soon": [], "apps": progs, "tutorialsUrl": None, "card": {"lines": 5, "topics": 6},
            "labels": {"open": "App öffnen", "bereich": "Dokumentation"},
            "hero": {"label": "KI Lab · Dokumentationen", "h1": "Wie die Apps <em>arbeiten</em>.",
                     "p": "Die Dokumentationen der Apps im KI Lab von entwurfsforschung.de: Herkunft und Vorarbeiten, eigene Umsetzung, Prüfungen und Ergebnisse. "
                          "Jede App öffnet ihre Dokumentation über den Knopf „Dokumentation“.",
                     "progLabel": "Dokumentationen", "zaehl": ["Dokumentation", "Dokumentationen"], "soon": ["Dokumentation", "Weitere"]}}
    mock = os.path.join(Q, "Tutorials", "_werkzeuge", "mockup")
    page = open(os.path.join(mock, "page.html"), encoding="utf-8").read()
    logo = open(os.path.join(mock, "logo.svg"), encoding="utf-8").read()
    uni = open(os.path.join(mock, "uni_logo.svg"), encoding="utf-8").read().split("-->\n", 1)[1]
    for a, b in (("/*__DATA__*/", "const DATA = " + json.dumps(data, ensure_ascii=False) + ";"), ("<!--__LOGO__-->", logo), ("<!--__UNI__-->", uni),
                 ("/*__ISSUES__*/null", "null"), ('<meta name="claude:viewport-fit-sides" content="cover">\n', ""),
                 ("<title>InfAU Tutorials</title>", "<title>Dokumentationen · KI Lab · Entwurfsforschung</title>"),
                 ('aria-label="Tutorials Übersicht"><span', 'aria-label="Dokumentationen im KI Lab"><span'),
                 ('<span class="label">Tutorials</span></a>', '<span class="label">KI Lab · Dokumentationen</span></a>')):
        assert a in page, a
        page = page.replace(a, b)
    page = re.sub(r'<link[^>]+href="https://fonts\.(?:googleapis|gstatic)\.com"[^>]*>\s*', "", page)
    page = re.sub(r'<link[^>]+href="https://fonts\.googleapis\.com/css2[^"]*"[^>]*>', '<link rel="stylesheet" href="../../schrift/geist.css">', page)
    assert "fonts.googleapis" not in page and "fonts.gstatic" not in page
    head, rest = page.split("<header", 1)
    html = ('<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<meta name="description" content="Dokumentationen der Apps im KI Lab von entwurfsforschung.de.">\n'
            + head + "</head>\n<body>\n" + LEISTE.format(leiste=json.dumps(leiste, ensure_ascii=False)) + "<header" + rest + "\n</body>\n</html>\n")
    assert not re.search(r"(src|href)=\"https?://(?!doi\.org)[^\"]*\.(js|css|woff2?)", html), "Inhalte fremder Server"
    open(os.path.join(ziel, "index.html"), "w", encoding="utf-8", newline="\n").write(html)
    return liste
