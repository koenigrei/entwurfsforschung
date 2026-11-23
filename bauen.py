"""Baut entwurfsforschung.de nach site/ (Aufruf: python bauen.py [--alt URL]).

Seiten: Lab (Startseite, projekte.json), Archiv (archiv.json + archiv_inhalte/ aus konvertiere.py) mit Einzelseiten, Impressum (Platzhalter,
bis die Angaben aus dem Impressum-Generator vorliegen). Alle Seiten teilen vorlage.html ({{MAIN}}).
--alt: Adresse der alten Website; seit 22.11.2026 ohne Wirkung (WordPress gelöscht, der Link „Alte Website“ ist aus vorlage.html entfernt).
Schrift: Geist (SIL Open Font License) aus den lokal installierten Windows-Schriften, selbst ausgeliefert (keine Google Fonts).
"""
import html, json, os, re, shutil, sys
from PIL import Image

HIER = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HIER, "site")
SCHRIFTEN = ["Geist-Light.ttf", "Geist-Regular.ttf", "Geist-Medium.ttf", "Geist-SemiBold.ttf", "Geist-Bold.ttf", "GeistMono-Regular.ttf", "GeistMono-Medium.ttf", "GeistMono-SemiBold.ttf"]
GEIST_CSS = "".join(f'@font-face{{font-family:"{f}";font-weight:{w};font-style:normal;font-display:swap;src:url("{d}.ttf") format("truetype")}}\n'
                    for f, w, d in [("Geist", 300, "Geist-Light"), ("Geist", 400, "Geist-Regular"), ("Geist", 500, "Geist-Medium"), ("Geist", 600, "Geist-SemiBold"),
                                    ("Geist", 700, "Geist-Bold"), ("Geist Mono", 400, "GeistMono-Regular"), ("Geist Mono", 500, "GeistMono-Medium"), ("Geist Mono", 600, "GeistMono-SemiBold")])
THREE = ["https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"]
SCHRIFT_QUELLEN = [os.path.join(os.environ.get("WINDIR", "C:/Windows"), "Fonts"),
                   os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "Windows", "Fonts")]
WEITER = '<!doctype html><meta charset="utf-8"><title>{t}</title><meta http-equiv="refresh" content="0; url={z}"><link rel="canonical" href="{z}">{q}<a href="{z}">{t}</a>\n'
KRUEMEL = re.compile(r"\\{1,2}\s*<a[^>]*>\s*(?:Entwurfsforschung|Räumliche\s+Prozesse|Zelluläre\s+Automaten)\s*</a>")

FILTER = '''<main id="{id}">
  <div class="filter">
    <label class="suche"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8.5" cy="8.5" r="6"/><path d="m13 13 5 5"/></svg><input id="suche" type="search" data-tp="suche" placeholder="Suche" aria-label="Suche"></label>
    <div class="feld mono"><label for="kat" data-t="kategorie">Kategorie</label><select id="kat"></select></div>
    <div class="feld mono"><label for="sort" data-t="sortierung">Sortierung</label><select id="sort">{folge}<option value="neu" data-t="neueste">Neueste</option><option value="alt" data-t="aelteste">Älteste</option><option value="titel" data-t="titel">Titel</option></select></div>
    <button class="schalter mono" type="button" id="vorschau" aria-pressed="true"><span data-t="vorschautext">Vorschautext</span><span class="knopf" aria-hidden="true"></span></button>
  </div>
  <div class="raster" id="raster"></div>
</main>
<script>const DATA = {daten};</script>'''
UEBER = '''<section class="ueber" id="ueber">
  <div><h2 data-t="nav_ueber">Über</h2></div>
  <div>
    <p data-t="ueber_1">Das KI Lab sammelt Experimente mit künstlicher Intelligenz in Architektur und Städtebau.</p>
    <p data-t="ueber_2">Alle Projekte entstehen in Zusammenarbeit von Prof. Dr. Reinhard König und Claude von Anthropic.</p>
    <p><a href="https://lernwerkstatt-apps-409c53.pages.uni-weimar.de/" data-t="lernlabor">KI Lernlabor der Bauhaus-Universität Weimar</a></p>
  </div>
</section>'''


def schrift(name):
    for d in SCHRIFT_QUELLEN:
        if os.path.exists(os.path.join(d, name)):
            return os.path.join(d, name)
    raise FileNotFoundError(f"Schrift {name} nicht installiert")


def vq(datei):
    """?v=<Inhaltskennung> für Bilder in den Kacheldaten (Cloudflare-Cache, 21.11.2026)."""
    import hashlib
    return "?v=" + hashlib.sha1(open(datei, "rb").read()).hexdigest()[:10]


def kachelbild(quelle, ziel):
    im = Image.open(quelle)
    if getattr(im, "is_animated", False):
        im.seek(0)
    im = im.convert("RGB")
    if im.width > 900:
        im = im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS)
    im.save(ziel, "WEBP", quality=84, method=6)
    return im.width, im.height


def titelbild(titel, ziel):
    """Schwarzes Kachelbild mit Titel in Geist Light, für Einträge ohne eigenes Bild."""
    from PIL import ImageDraw, ImageFont
    im = Image.new("RGB", (900, 600), "#000000"); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(schrift("Geist-Light.ttf"), 92)
    zeilen, z = [], ""
    for w in titel.upper().split():
        if d.textlength((z + " " + w).strip(), font=f) > 780 and z:
            zeilen.append(z); z = w
        else:
            z = (z + " " + w).strip()
    zeilen.append(z)
    y = 300 - len(zeilen) * 55
    for zl in zeilen:
        d.text((60, y), zl, font=f, fill="#ffffff"); y += 110
    fk = ImageFont.truetype(schrift("Geist-Light.ttf"), 34); bw = d.textlength("ARCHIV", font=fk)
    d.rounded_rectangle((60, 500, 60 + bw + 52, 548), radius=24, outline="#9ea0f3", width=2)
    d.text((86, 504), "ARCHIV", font=fk, fill="#9ea0f3")
    im.save(ziel, "WEBP", quality=88, method=6)
    return im.width, im.height


RUECKWEG = ('<nav class="ef-zurueck" aria-label="Entwurfsforschung" style="display:flex;align-items:center;min-height:34px;padding:0 16px;margin:0;'
            'background:#000;border-bottom:1px solid #2a2a2e;position:relative;z-index:2147483000;font:500 12px/1 Geist Mono,ui-monospace,monospace;'
            'letter-spacing:.06em;text-transform:uppercase"><a href="{z}" style="color:#fff;text-decoration:none" '
            'title="Zurück zum KI Lab auf entwurfsforschung.de · Back to the AI Lab">← Entwurfsforschung · KI Lab</a></nav>')


def rueckweg(z, methode=None):
    """Rückweg-Leiste; mit methode (Adresse der Methodenseite) rechts der Link „Methode · Method“ (23.11.2026)."""
    t = RUECKWEG.format(z=z)
    if methode:
        t = t.replace("</a></nav>", f'</a><a href="{methode}" style="margin-left:auto;color:#9ea0f3;text-decoration:none" '
                                    f'title="Wie das Projekt arbeitet · How the project works">Methode · Method</a></nav>')
    return t


def versionieren(t, ordner):
    """Lokale src/href (js, css, Bilder) bekommen ?v=<Inhaltskennung>: Cloudflare vor dem Webspace cacht statische Dateien 4 h (21.11.2026)."""
    import hashlib
    def ersetze(m):
        attr, url = m.group(1), m.group(2)
        if "://" in url or url.startswith(("#", "data:", "mailto:")) or "?" in url:
            return m.group(0)
        f = os.path.normpath(os.path.join(ordner, url))
        if not os.path.isfile(f):
            return m.group(0)
        return f'{attr}="{url}?v={hashlib.sha1(open(f, "rb").read()).hexdigest()[:10]}"'
    return re.sub(r'(src|href)="([^"]+\.(?:js|css|webp|png|jpg|jpeg|gif|svg|ttf|woff2?|zip))"', ersetze, t)


def lokal(pfad, zur_wurzel, methode=None):
    """Google Fonts und three.js vom CDN in einer App-Datei durch Kopien auf dem eigenen Server ersetzen (keine Inhalte Dritter);
    oben die Rückweg-Leiste, mit methode auch der Link zur Methodenbeschreibung."""
    t = open(pfad, encoding="utf-8").read()
    t = re.sub(r'<link[^>]+href="https://fonts\.(?:googleapis|gstatic)\.com"[^>]*>\s*', "", t)
    t = re.sub(r'<link[^>]+href="https://fonts\.googleapis\.com/css2[^"]*"[^>]*>', f'<link rel="stylesheet" href="{zur_wurzel}schrift/geist.css">', t)
    for u in THREE:
        t = t.replace(u, f"{zur_wurzel}vendor/three.r128.min.js")
    t = versionieren(t, os.path.dirname(pfad))
    if "ef-zurueck" not in t:                                         # Rückweg ins Lab in jeder App (Nutzer 21.11.2026)
        t = re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + rueckweg(zur_wurzel, methode), t, count=1)   # sichtbare Leiste oben (22.11.2026, vorher kleines Etikett unten links)
    elif methode and methode not in t:                                 # eigener Rückweg der App (z. B. Palladio): Methodenlink gleich dahinter
        m = re.search(r'<a\b[^>]*class="[^"]*ef-zurueck[^"]*"[^>]*>.*?</a>', t, flags=re.S)
        if m:
            t = t[:m.end()] + (f' <a class="ef-methode" href="{methode}" style="margin-left:1em;color:#9ea0f3;text-decoration:none;font:500 12px/1 Geist Mono,ui-monospace,monospace;'
                               f'letter-spacing:.06em;text-transform:uppercase" title="Wie das Projekt arbeitet · How the project works">Methode · Method</a>') + t[m.end():]
    open(pfad, "w", encoding="utf-8").write(t)


def lernbereich(p, z, Q, methode=None, methode_datei=None):
    """Baut einen Lernbereich des KI Lernlabors (Planungsgrundlagen/Apps/<p["lernbereich"]>) mit dessen eigenem Werkzeug
    (Apps/_werkzeuge/build_apps.py, Modus LERNLABOR_EINZELN) nach z: index.html, en.html, img/ und die App-Dateien daneben.
    Die App-Dateien bekommen den Rückweg zur Beschreibung, die Beschreibung den Rückweg ins Lab (Nutzer 23.11.2026)."""
    import subprocess, tempfile
    zur_wurzel = "../" * p["ziel"].strip("/").count("/") + "../"
    tmp = tempfile.mkdtemp(prefix="lernbereich_")
    try:
        umg = dict(os.environ, LERNLABOR_EINZELN=p["lernbereich"], LERNLABOR_OUT=tmp, LERNLABOR_ZURUECK=zur_wurzel, PYTHONIOENCODING="utf-8")
        r = subprocess.run([sys.executable, os.path.join(Q, "Apps", "_werkzeuge", "build_apps.py")], env=umg,
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode or not os.path.isfile(os.path.join(tmp, "index.html")):
            sys.exit(f"{p['id']}: Lernbereich {p['lernbereich']} nicht gebaut\n{(r.stdout + r.stderr)[-1500:]}")
        shutil.copytree(tmp, z, dirs_exist_ok=True)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    for f in sorted(os.listdir(z)):                                    # lizenzierte BKI-Werte nie veröffentlichen (Reinhard 23.11.2026)
        if f.lower().endswith(".zip"):
            bki_aus_zip(os.path.join(z, f))
    if methode_datei:                                                  # vor dem Versionieren (?v= hängt am Inhalt der Pakete)
        methode_in_zips(z, methode_datei)
    zur_beschreibung = (rueckweg("index.html", methode).replace("← Entwurfsforschung · KI Lab", f"← {html.escape(p['titel']['de'])} · Beschreibung")
                        .replace("Zurück zum KI Lab auf entwurfsforschung.de · Back to the AI Lab", "Zurück zur Beschreibung · Back to the description"))
    for f in sorted(os.listdir(z)):
        if not f.endswith(".html"):
            continue
        pfad = os.path.join(z, f)
        if f not in ("index.html", "en.html"):                         # App und Programmversionen: Rückweg zur Beschreibung
            t = open(pfad, encoding="utf-8").read()
            if "ef-zurueck" not in t:
                open(pfad, "w", encoding="utf-8").write(re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + zur_beschreibung, t, count=1))
        lokal(pfad, zur_wurzel, methode)


def seite(vorlage, pfad, main, base, titel, seite_, alt):
    h = (vorlage.replace("{{MAIN}}", main).replace("{{BASE}}", base).replace("{{ALT}}", alt)
         .replace("{{TITEL}}", html.escape(titel)).replace("{{SEITE}}", seite_))
    os.makedirs(os.path.dirname(pfad), exist_ok=True)
    open(pfad, "w", encoding="utf-8").write(h)


LINKS_EN = {"Video auf Vimeo ansehen": "Watch video on Vimeo", "Auf SoundCloud anhören": "Listen on SoundCloud",
            "Dokument auf Yumpu ansehen": "View document on Yumpu", "Sammlung auf issuu (eingebettetes Regal nicht mehr verfügbar)":
            "Collection on issuu (embedded shelf no longer available)", "Externen Inhalt öffnen": "Open external content"}


def englisch_links(h):
    """Beschriftungen der Link-Knöpfe aus konvertiere.py in der englischen Fassung übersetzen."""
    for de, en in LINKS_EN.items():
        h = h.replace(de, en)
    return h


def zwei(de, en, tag="span"):
    """Zweisprachiger Text: beide Fassungen, sichtbar ist die gewählte Sprache (CSS html[lang] .nur-de/.nur-en)."""
    if not en or en == de:
        return html.escape(de)
    return f'<{tag} class="nur-de">{html.escape(de)}</{tag}><{tag} class="nur-en">{html.escape(en)}</{tag}>'


def webapps(pfad, base):
    """Kasten oben auf einer Archivseite: Programme dieser Seite (simulationen/bestand.json „archiv“), die als Web-App umgesetzt sind.
    Auf einer Hauptseite (z. B. strukturexperimente/) zählen auch die Programme ihrer Unterseiten, mit Link dorthin. (Nutzer 22.11.2026)"""
    B = json.load(open(os.path.join(SIM, "bestand.json"), encoding="utf-8"))["programme"]
    U = sorted((e for e in B if e.get("status") == "umgesetzt" and e.get("app") and e.get("archiv")), key=lambda e: (e.get("jahr") or 0, e.get("reihenfolge") or 0))
    hier = [e for e in U if e["archiv"] == pfad]
    unter = [e for e in U if e["archiv"] != pfad and e["archiv"].startswith(pfad)]
    if not hier and not unter:
        return ""
    sim = f"{base}lab/simulationen/"
    t = f'<aside class="webapps"><div class="mono">{zwei("Jetzt als Web-App", "Now available as web apps")}</div>'
    if hier:
        n = len(hier)
        t += ("<p>" + (zwei("Dieses Programm läuft jetzt als Neuumsetzung direkt im Browser, im KI Lab unter „Frühe Simulationen“:",
                            "This program now runs as a re-implementation directly in the browser, in the AI Lab under “Early Simulations”:") if n == 1 else
                       zwei(f"Für {n} Programme dieser Seite gibt es jetzt Neuumsetzungen, die direkt im Browser laufen, im KI Lab unter „Frühe Simulationen“:",
                            f"{n} programs on this page now run as re-implementations directly in the browser, in the AI Lab under “Early Simulations”:")) + "</p>")
        t += '<ul>' + "".join(f'<li><a href="{sim}{e["app"]}/">{zwei(e["titel"], e.get("titel_en"))}</a></li>' for e in hier) + "</ul>"
    if unter:
        seiten = {}
        for e in unter:
            seiten.setdefault(e["archiv"], []).append(e)
        t += ("<p>" + zwei(f"Für {len(unter)} Programme aus den Unterseiten gibt es Web-Apps:", f"{len(unter)} programs from the subpages are available as web apps:") + "</p><ul>"
              + "".join(f'<li><a href="{base}archiv/{a}">{html.escape(a.rstrip("/").split("/")[-1])}</a> · {zwei(f"{len(L)} Apps", f"{len(L)} apps") if len(L) > 1 else zwei("1 App", "1 app")}</li>' for a, L in seiten.items())
              + "</ul>")
    return t + f'<a class="mono alle" href="{sim}">→ {zwei("Alle Frühen Simulationen", "All Early Simulations")}</a></aside>'


def md_html(md):
    """Kleines Markdown → HTML für die Methodenbeschreibungen (METHODE.md): Überschriften, Absätze, Listen (auch verschachtelt und
    nummeriert), Tabellen, Code, fett/kursiv, Links. Kein externes Paket (auf dem Rechner nicht installiert)."""
    def inline(s):
        codes = []
        s = re.sub(r"`([^`]+)`", lambda m: codes.append(m.group(1)) or f"\x00{len(codes) - 1}\x00", s)
        s = html.escape(s, quote=False)
        s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: f'<a href="{html.escape(m.group(2))}">{m.group(1)}</a>', s)
        s = re.sub(r"(?<![\"'=>])(https?://[^\s<)]+[^\s<).,;:])", r'<a href="\1">\1</a>', s)
        s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
        s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", s)
        return re.sub(r"\x00(\d+)\x00", lambda m: f"<code>{html.escape(codes[int(m.group(1))])}</code>", s)
    out, absatz, i = [], [], 0
    zeilen = md.replace("\r\n", "\n").split("\n")
    def fertig():
        if absatz:
            out.append("<p>" + inline(" ".join(absatz)) + "</p>"); absatz.clear()
    while i < len(zeilen):
        z = zeilen[i]
        if z.startswith("```"):
            fertig(); j = i + 1
            while j < len(zeilen) and not zeilen[j].startswith("```"):
                j += 1
            out.append("<pre><code>" + html.escape("\n".join(zeilen[i + 1:j])) + "</code></pre>"); i = j + 1; continue
        m = re.match(r"(#{1,6})\s+(.*)", z)
        if m:
            fertig(); n = max(2, len(m.group(1)))                       # # und ## → h2: das h1 ist der Titel in der Seitenleiste
            out.append(f"<h{n}>{inline(m.group(2).strip())}</h{n}>"); i += 1; continue
        if z.lstrip().startswith("|") and i + 1 < len(zeilen) and re.match(r"^\s*\|?\s*:?-{2,}", zeilen[i + 1]):
            fertig(); zellen = lambda r: [c.strip() for c in r.strip().strip("|").split("|")]
            kopf = zellen(z); j = i + 2; reihen = []
            while j < len(zeilen) and zeilen[j].lstrip().startswith("|"):
                reihen.append(zellen(zeilen[j])); j += 1
            out.append('<div class="tabelle"><table><thead><tr>' + "".join(f"<th>{inline(c)}</th>" for c in kopf) + "</tr></thead><tbody>"
                       + "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in reihen) + "</tbody></table></div>")
            i = j; continue
        if re.match(r"^\s*([-*]|\d+\.)\s+", z):
            fertig(); stapel = []                                     # [(tiefe, tag)]
            while i < len(zeilen) and (re.match(r"^\s*([-*]|\d+\.)\s+", zeilen[i]) or (zeilen[i].startswith("  ") and zeilen[i].strip() and stapel)):
                m = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)", zeilen[i])
                if not m:                                              # Fortsetzungszeile eines Listenpunkts
                    out[-1] = out[-1][:-5] + " " + inline(zeilen[i].strip()) + "</li>"; i += 1; continue
                tiefe, tag = len(m.group(1).replace("\t", "  ")) // 2, "ol" if m.group(2)[0].isdigit() else "ul"
                while stapel and stapel[-1][0] > tiefe:
                    out.append(f"</{stapel.pop()[1]}>")
                if not stapel or stapel[-1][0] < tiefe:
                    out.append(f"<{tag}>"); stapel.append((tiefe, tag))
                out.append(f"<li>{inline(m.group(3))}</li>"); i += 1
            while stapel:
                out.append(f"</{stapel.pop()[1]}>")
            continue
        if not z.strip():
            fertig()
        elif z.startswith(">"):
            fertig(); out.append(f"<blockquote><p>{inline(z.lstrip('> '))}</p></blockquote>")
        elif re.match(r"^\s*(-{3,}|\*{3,})\s*$", z):
            fertig(); out.append("<hr>")
        else:
            absatz.append(z.strip())
        i += 1
    fertig()
    return "\n".join(out)


def methode_quelle(p, Q):
    """Pfad der METHODE.md eines Projekts: „methode“ in projekte.json, relativ zu diesem Repo oder zu quelle_basis."""
    m = p.get("methode")
    if not m:
        return None
    for basis in (HIER, Q):
        if os.path.isfile(os.path.join(basis, m)):
            return os.path.join(basis, m)
    sys.exit(f"{p['id']}: METHODE.md nicht gefunden ({m})")


BKI_SYSTEME = ("holzrahmen", "bsp")   # Bauweisen in systeme.json, deren Kosten aus BKI-Kennwerten abgeleitet sind (K17, K21, K31)


def bki_aus_zip(pfad):
    """In einem veröffentlichten Paket die BKI-abgeleiteten Kosten in jeder systeme.json leeren (kosten → null); die Quelle im
    Repo bleibt. Das Kette-Paket (make_kette_paket.py) macht es schon selbst; hier für das Quellcode-Paket der Konzeptstudie."""
    import zipfile
    with zipfile.ZipFile(pfad) as zf:
        namen = [n for n in zf.namelist() if n.rsplit("/", 1)[-1] == "systeme.json"]
        if not namen:
            return
        eintraege = [(i, zf.read(i.filename)) for i in zf.infolist()]
    neu, geaendert = [], 0
    for info, daten in eintraege:
        if info.filename in namen:
            d = json.loads(daten.decode("utf-8"))
            S = d.get("systeme", d) if isinstance(d, dict) else d
            for k, s in (S.items() if isinstance(S, dict) else ((x.get("id"), x) for x in S)):
                if k in BKI_SYSTEME and isinstance(s, dict) and s.get("kosten") is not None:
                    s["kosten"] = None; geaendert += 1
            daten = json.dumps(d, ensure_ascii=False, indent=1).encode("utf-8")
        neu.append((info, daten))
    if not geaendert:
        return
    with zipfile.ZipFile(pfad, "w", zipfile.ZIP_DEFLATED) as zf:
        for info, daten in neu:
            zf.writestr(info, daten, compress_type=zipfile.ZIP_DEFLATED)


def methode_in_zips(ordner, quelle, namen=None):
    """METHODE.md in die Quellcode-Pakete eines Projektordners legen (Nutzer 23.11.2026: jedes Projekt bringt seine Methode mit)."""
    import zipfile
    for f in sorted(namen if namen is not None else os.listdir(ordner)):
        pfad = os.path.join(ordner, f)
        if f.lower().endswith(".zip") and ("quellcode" in f.lower() or "source" in f.lower()) and os.path.isfile(pfad):
            with zipfile.ZipFile(pfad, "a", zipfile.ZIP_DEFLATED) as zf:
                if not any(n.rsplit("/", 1)[-1] == "METHODE.md" for n in zf.namelist()):
                    zf.write(quelle, "METHODE.md")


def methode_seite(vorlage, alt, pid, titel, quelle, zurueck_href, autoren, jahr):
    """lab/methode/<pid>/: METHODE.md als lesbare Seite (Gestaltung des Archivs) und als Rohdatei daneben (für Agenten)."""
    d = os.path.join(SITE, "lab", "methode", pid); os.makedirs(d, exist_ok=True)
    shutil.copy(quelle, os.path.join(d, "METHODE.md"))
    text = open(quelle, encoding="utf-8").read()
    text = re.sub(r"\A#\s+[^\n]*\n", "", text)                        # Titel steht in der Seitenleiste
    kasten = (f'<aside class="webapps"><div class="mono">{zwei("Methode", "Method")}</div>'
              f'<p>{zwei("Wie das Projekt arbeitet: Frage, Vorbilder und Quellen, Darstellung, Korpus, Generator, Prüfer, Grenzen. Die Datei liegt auch im Quellcode-Paket.", "How the project works: question, precedents and sources, representation, corpus, generator, checks, limits (in German). The file is also part of the source package.")}</p>'
              f'<ul><li><a href="METHODE.md">METHODE.md</a> · {zwei("Rohtext für Agenten", "raw text for agents")}</li>'
              f'<li><a href="{zurueck_href}">→ {zwei(titel["de"], titel.get("en"))}</a></li>'
              f'<li><a href="../">→ {zwei("Alle Methoden", "All methods")}</a></li></ul></aside>')
    e = {"titel": {"de": "Methode: " + titel["de"], "en": "Method: " + titel.get("en", titel["de"])}, "kategorie": {"de": "Methode", "en": "Method"},
         "jahr": jahr, "autoren": autoren}
    seite(vorlage, os.path.join(d, "index.html"),
          artikel(e, md_html(text), "../../../", eltern=(titel["de"], titel.get("en")), eltern_href=zurueck_href, kasten=kasten),
          "../../../", f"Methode: {titel['de']} · Entwurfsforschung", "lab", alt)
    open(os.path.join(SITE, "lab", "methode", ".htaccess"), "w", encoding="utf-8").write('AddType "text/plain; charset=utf-8" .md\n')


def methoden_uebersicht(vorlage, alt, liste):
    """lab/methode/: alle Methodenbeschreibungen mit Link zur Seite, zur Rohdatei und zum Projekt."""
    zeilen = "".join(f'<li><a href="{pid}/">{zwei(t["de"], t.get("en"))}</a> · <a class="mono" href="{pid}/METHODE.md">METHODE.md</a> · '
                     f'<a class="mono" href="{z}">{zwei("Projekt", "Project")}</a></li>' for pid, t, z in liste)
    inhalt = (f'<p>{zwei("Jedes Projekt im KI Lab beschreibt seine Methode nach demselben Raster: Frage, Vorbild und Quellen, Darstellung, Korpus, Generator, Prüfer und was offen ist. Die Beschreibungen sind für Menschen und für Coding-Agenten geschrieben, die an einem Projekt weiterarbeiten.", "Every project in the AI Lab describes its method along the same outline: question, precedents and sources, representation, corpus, generator, checks and open points. The descriptions (in German) are written for people and for coding agents who continue a project.")}</p>'
              f"<ul>{zeilen}</ul>")
    e = {"titel": {"de": "Methoden", "en": "Methods"}, "kategorie": {"de": "Methode", "en": "Method"}, "jahr": "2026", "autoren": "R. König · Claude"}
    seite(vorlage, os.path.join(SITE, "lab", "methode", "index.html"),
          artikel(e, inhalt, "../../", eltern=("KI Lab", "AI Lab"), eltern_href="../../"), "../../", "Methoden · Entwurfsforschung", "lab", alt)


def artikel(e, inhalt, base, unterseiten=None, eltern=None, zu_unter="", eltern_href="../", inhalt_en=None, kasten=""):
    """unterseiten: Liste, die in der Seitenleiste steht; zu_unter: Weg von dieser Seite zu den Unterseiten-Ordnern ("" oder "../");
    eltern/eltern_href: Rückweg zur übergeordneten Seite (Eintrag oder Unterseite). inhalt_en: englische Fassung (archiv_uebersetzung/)."""
    t = e["titel"]; k = e["kategorie"]
    meta = (f'<div class="meta mono"><span data-t="kategorie">Kategorie</span><b>{zwei(k["de"], k.get("en"))}</b>'
            f'<span>{zwei("Jahr", "Year")}</span><b>{e["jahr"]}</b><span>{zwei("Autor", "Author")}</span><b>{html.escape(e["autoren"])}</b></div>')
    liste = ""
    if unterseiten:
        liste = ('<div class="unterseiten"><span class="mono" data-t="unterseiten">Seiten</span>'
                 + "".join(f'<a href="{zu_unter}{u["id"]}/">{zwei(u["titel"], u.get("titel_en"))}</a>' for u in unterseiten) + "</div>")
    zurueck = (f'<a class="zurueck mono" href="{eltern_href}">← {zwei(eltern[0], eltern[1]) if isinstance(eltern, tuple) else html.escape(eltern)}</a>' if eltern
               else f'<a class="zurueck mono" href="{base}archiv/" data-t="zurueck">Zurück zum Archiv</a>')
    text = KRUEMEL.sub("", inhalt)
    if inhalt_en:
        text = f'<div class="nur-de" lang="de">{text}</div><div class="nur-en" lang="en">{englisch_links(KRUEMEL.sub("", inhalt_en))}</div>'
    return f'<main class="artikel"><aside><h1>{zwei(t["de"], t.get("en"))}</h1>{meta}{liste}{zurueck}</aside><div class="text">{kasten}{text}</div></main>'



def bauen(alt="/"):
    cfg = json.load(open(os.path.join(HIER, "projekte.json"), encoding="utf-8"))
    Q = cfg["quelle_basis"]
    vorlage = open(os.path.join(HIER, "vorlage.html"), encoding="utf-8").read()
    if os.path.exists(SITE):
        shutil.rmtree(SITE)
    os.makedirs(os.path.join(SITE, "schrift")); os.makedirs(os.path.join(SITE, "bilder"))
    for s in SCHRIFTEN:
        shutil.copy(schrift(s), os.path.join(SITE, "schrift", s))
    open(os.path.join(SITE, "schrift", "geist.css"), "w", encoding="utf-8").write(GEIST_CSS)
    for f in ("favicon.svg", "favicon.ico", "apple-touch-icon.png"):   # Logo/Favicon (marke/, 21.11.2026)
        shutil.copy(os.path.join(HIER, "marke", f), os.path.join(SITE, f))
    os.makedirs(os.path.join(SITE, "vendor")); shutil.copy(os.path.join(HIER, "vendor", "three.r128.min.js"), os.path.join(SITE, "vendor", "three.r128.min.js"))
    open(os.path.join(SITE, "schrift", "LIZENZ.txt"), "w", encoding="utf-8").write(
        "Geist und Geist Mono: Copyright Vercel, SIL Open Font License 1.1 – https://openfontlicense.org\n")

    # ---------------------------------------------------------------- Lab
    lab, methoden = [], []
    for p in cfg["projekte"]:
        eigen = os.path.join(HIER, "bilder", p["id"] + ".png")         # Kachelbild aus kachelbilder.py (dunkel), sonst Bild aus projekte.json
        if os.path.exists(eigen) or p.get("bild"):
            w, h = kachelbild(eigen if os.path.exists(eigen) else os.path.join(Q, p["bild"]), os.path.join(SITE, "bilder", p["id"] + ".webp"))
        else:                                                          # noch kein Kachelbild (z. B. Frühe Simulationen vor pruefe_apps.py)
            w, h = titelbild(p["titel"]["de"], os.path.join(SITE, "bilder", p["id"] + ".webp"))
        z = os.path.join(SITE, p["ziel"])
        zur_wurzel = "../" * p["ziel"].strip("/").count("/") + "../"
        mq = methode_quelle(p, Q)                                      # Methodenbeschreibung (Nutzer 23.11.2026: jedes Projekt bekommt eine)
        mhref = f"{zur_wurzel}lab/methode/{p['id']}/" if mq else None
        if mq:
            methoden.append((p, mq))
        if p.get("nur_kachel"):                                        # nur Kachel, Inhalt pflegt ein anderes Werkzeug (Design Explorer: sync.py).
            if os.path.exists(z):                                      # Kein Ordner in site/, sonst ersetzt deploy.py den Ordner auf dem Server.
                sys.exit(f"{p['ziel']}: Projekt ist nur_kachel, darf in site/ nicht vorkommen")
            lab.append({k: p[k] for k in ("id", "titel", "autoren", "kategorie", "jahr", "datum")} | {"vorschau": p.get("vorschau"), "zuletzt": bool(p.get("zuletzt")), "vorletzt": bool(p.get("vorletzt")), "zuerst": bool(p.get("zuerst")), "href": p["ziel"], "bild": f"bilder/{p['id']}.webp" + vq(os.path.join(SITE, "bilder", p["id"] + ".webp")), "w": w, "h": h})
            continue
        os.makedirs(z, exist_ok=True)
        if p.get("lernbereich"):                                       # Lernbereich des KI Lernlabors als eigene Seite (Konzeptstudie, Nutzer 23.11.2026)
            lernbereich(p, z, Q, mhref, mq)
        for ziel, quelle in p.get("dateien", {}).items():
            shutil.copy(os.path.join(Q, quelle), os.path.join(z, ziel))
        for ziel, quelle in p.get("ordner", {}).items():
            shutil.copytree(os.path.join(Q, quelle), os.path.join(z, ziel))
        if mq and p.get("dateien"):                                    # Methode ins Quellcode-Paket, vor dem Versionieren
            methode_in_zips(z, mq, list(p["dateien"]))
        for ziel in p.get("dateien", {}):                              # erst alles kopieren, dann versionieren (?v= braucht die Zieldateien)
            if ziel.endswith(".html"):
                lokal(os.path.join(z, ziel), zur_wurzel, mhref)
        if p["start"] != "index.html":
            open(os.path.join(z, "index.html"), "w", encoding="utf-8").write(WEITER.format(t=p["titel"]["de"], z=p["start"], q=(f'<link rel="code-repository" href="{p["quellcode"]}"><link rel="license" href="https://creativecommons.org/licenses/by/4.0/">' if p.get("quellcode") else "")))
        lab.append({k: p[k] for k in ("id", "titel", "autoren", "kategorie", "jahr", "datum")} | {"vorschau": p.get("vorschau"), "zuletzt": bool(p.get("zuletzt")), "vorletzt": bool(p.get("vorletzt")), "zuerst": bool(p.get("zuerst")), "href": p["ziel"], "bild": f"bilder/{p['id']}.webp" + vq(os.path.join(SITE, "bilder", p["id"] + ".webp")), "w": w, "h": h})
    seite(vorlage, os.path.join(SITE, "index.html"), FILTER.format(id="lab", folge='<option value="folge" data-t="reihenfolge">Reihenfolge</option>', daten=json.dumps({"projekte": lab}, ensure_ascii=False)) + "\n" + UEBER,
          "", "Entwurfsforschung · KI Lab", "lab", alt)
    for p, mq in methoden:                                             # lab/methode/<id>/ und die Übersicht lab/methode/
        methode_seite(vorlage, alt, p["id"], p["titel"], mq, f"../../../{p['ziel']}", p["autoren"], p["jahr"])
    methoden_uebersicht(vorlage, alt, [(p["id"], p["titel"], f"../../{p['ziel']}") for p, _ in methoden])
    METHODEN.clear(); METHODEN.update({p["id"]: mq for p, mq in methoden})   # für Simulationen und Katalog

    # ---------------------------------------------------------------- Archiv
    arch = json.load(open(os.path.join(HIER, "archiv.json"), encoding="utf-8"))
    karten = []
    for e0 in arch["eintraege"]:
        e = json.load(open(os.path.join(HIER, "archiv_inhalte", e0["id"] + ".json"), encoding="utf-8"))
        up = os.path.join(HIER, "archiv_uebersetzung", e0["id"] + ".json")   # Übersetzung (Agenten 21.11.2026): andere Sprache als das Original
        U = json.load(open(up, encoding="utf-8")) if os.path.exists(up) else {}
        def fassungen(original, ue, orig_sprache):
            """→ (deutsch, englisch) aus Original und Übersetzung; ohne Übersetzung (original, None)."""
            if not ue:
                return original, None
            return (original, ue) if orig_sprache == "de" else (ue, original)
        if U:
            e["titel"] = U.get("titel", e["titel"]); e["vorschau"] = U.get("vorschau", {}).get("de") or e["vorschau"]
            vorschau_en = U.get("vorschau", {}).get("en")
        else:
            vorschau_en = None
        d = os.path.join(SITE, "archiv", e["id"])
        shutil.copytree(os.path.join(HIER, "archiv_medien", e["id"]), os.path.join(d, "medien"))
        bild = e.get("bild")
        if bild:
            w, h = kachelbild(os.path.join(d, bild), os.path.join(SITE, "bilder", f"archiv_{e['id']}.webp"))
        else:
            w, h = titelbild(e["titel"]["de"], os.path.join(SITE, "bilder", f"archiv_{e['id']}.webp"))
        inhalt_de, inhalt_en = fassungen(e["inhalt"], U.get("inhalt"), U.get("original", "de"))
        if bild and bild not in e["inhalt"]:                           # Beitragsbild oben, wenn es nicht schon im Text steht
            inhalt_de = f'<img class="titelbild" src="{bild}" alt="">' + inhalt_de
            inhalt_en = inhalt_en and f'<img class="titelbild" src="{bild}" alt="">' + inhalt_en
        alle = e.get("unterseiten", [])                                # Unterseiten liegen flach unter archiv/<id>/<sid>/, „eltern“ ordnet sie
        nach_id = {u["id"]: u for u in alle}                           # in der Seitenleiste unter einer anderen Unterseite ein (konvertiere.py)
        kinder = lambda sid: [u for u in alle if u.get("eltern") == sid]
        UU = U.get("unterseiten", {})
        for u in alle:                                                  # Titel beider Sprachen an die Unterseiten hängen
            uu = UU.get(u["id"], {})
            if uu.get("titel"):
                u["titel"], u["titel_en"] = uu["titel"].get("de", u["titel"]), uu["titel"].get("en")
        seite(vorlage, os.path.join(d, "index.html"), artikel(e, inhalt_de, "../../", kinder(None), inhalt_en=inhalt_en, kasten=webapps(f"{e['id']}/", "../../")), "../../", f"{e['titel']['de']} · Entwurfsforschung", "archiv", alt)
        for u in alle:
            uu = UU.get(u["id"], {})
            ude, uen = fassungen(u["inhalt"], uu.get("inhalt"), uu.get("original", U.get("original", "de")))
            ue = dict(e, titel={"de": u["titel"], "en": u.get("titel_en") or u["titel"]})
            el = nach_id.get(u.get("eltern"))
            seite(vorlage, os.path.join(d, u["id"], "index.html"),
                  artikel(ue, ude, "../../../", kinder(u["id"]), eltern=(el["titel"], el.get("titel_en")) if el else (e["titel"]["de"], e["titel"].get("en")), zu_unter="../",
                          eltern_href=f"../{el['id']}/" if el else "../", inhalt_en=uen, kasten=webapps(f"{e['id']}/{u['id']}/", "../../../")), "../../../",
                  f"{u['titel']} · Entwurfsforschung", "archiv", alt)
        karten.append({"id": e["id"], "titel": e["titel"], "autoren": e["autoren"], "kategorie": e["kategorie"], "jahr": e["jahr"], "datum": e["datum"],
                       "vorschau": {"de": e["vorschau"], "en": vorschau_en or e["vorschau"]}, "href": f"{e['id']}/",
                       "bild": f"../bilder/archiv_{e['id']}.webp" + vq(os.path.join(SITE, "bilder", f"archiv_{e['id']}.webp")), "w": w, "h": h})
    seite(vorlage, os.path.join(SITE, "archiv", "index.html"),
          FILTER.format(id="archiv", folge='<option value="folge" data-t="reihenfolge">Reihenfolge</option>', daten=json.dumps({"projekte": karten}, ensure_ascii=False)),
          "../", "Archiv · Entwurfsforschung", "archiv", alt)

    # ---------------------------------------------------------------- Frühe Simulationen (simulationen/, 21.11.2026)
    nsim = simulationen(vorlage, alt)

    # ---------------------------------------------------------------- Parametric Planning Catalogue (katalog/, 23.11.2026)
    nkat = katalog(vorlage, alt)

    # ---------------------------------------------------------------- Impressum (Platzhalter)
    seite(vorlage, os.path.join(SITE, "impressum", "index.html"),
          open(os.path.join(HIER, "impressum.html"), encoding="utf-8").read(),
          "../", "Impressum · Entwurfsforschung", "", alt)
    n = sum(len(f) for _, _, f in os.walk(SITE))
    print(f"site/ gebaut: {len(lab)} Projekte, {len(karten)} Archiveinträge, {nsim} Simulationen, {nkat} Katalog-Apps, {n} Dateien")


METHODEN = {}                       # Projekt-id → Pfad der METHODE.md (bauen() füllt es für simulationen() und katalog())
SIM = os.path.join(HIER, "simulationen")
SIM_NICHT_MUSTER = ("node_modules", ".git", "__pycache__", "_pruefung", "*.local.*", "quellcode.zip")
SIM_NICHT = shutil.ignore_patterns(*SIM_NICHT_MUSTER)
SIM_TEXT = {"de": ("Frühe Simulationen", "Die Simulationsprogramme der alten Website – Delphi, NetLogo, AutoCAD-VBA, entstanden 2005 bis 2008 – neu umgesetzt als Web-Apps. Die Regeln und Parameter folgen den Originalen; jede App verweist auf ihre Archivseite und lässt sich als Quellcode herunterladen und weiterentwickeln.",
                   "Sortiert nach Entstehungsdatum, neueste zuerst; weitere Modelle kommen nach und nach hinzu."),
            "en": ("Early Simulations", "The simulation programs of the old website – Delphi, NetLogo, AutoCAD VBA, written between 2005 and 2008 – re-implemented as web apps. Rules and parameters follow the originals; every app links to its archive page and can be downloaded as source code to develop further.",
                   "Sorted by date of origin, newest first; more models will be added step by step.")}


def simulationen(vorlage, alt):
    """Bereich lab/simulationen/: Übersicht (Kachelraster) und je App mit Status „umgesetzt“ in simulationen/bestand.json
    der App-Ordner, quellcode.zip (App-Ordner + _gemeinsam/) und das Kachelbild aus <id>/vorschau.png."""
    import zipfile
    bestand = json.load(open(os.path.join(SIM, "bestand.json"), encoding="utf-8"))
    gruppen = {g["id"]: g for g in bestand.get("gruppen", [])}
    ziel = os.path.join(SITE, "lab", "simulationen")
    shutil.copytree(os.path.join(SIM, "_gemeinsam"), os.path.join(ziel, "_gemeinsam"), ignore=SIM_NICHT, dirs_exist_ok=True)
    os.makedirs(os.path.join(ziel, "bilder"), exist_ok=True)
    open(os.path.join(ziel, ".htaccess"), "w", encoding="utf-8").write(          # Markdown im Browser lesbar statt Download
        'AddType "text/plain; charset=utf-8" .md\nAddType "text/javascript; charset=utf-8" .mjs\n')
    karten = []
    for e in bestand["programme"]:
        if e.get("status") != "umgesetzt":
            continue
        aid = e["app"]; q = os.path.join(SIM, aid); d = os.path.join(ziel, aid)
        meta = json.load(open(os.path.join(q, "app.json"), encoding="utf-8"))
        shutil.copytree(q, d, ignore=SIM_NICHT, dirs_exist_ok=True)
        with zipfile.ZipFile(os.path.join(d, "quellcode.zip"), "w", zipfile.ZIP_DEFLATED) as zf:
            for basis, name in ((q, aid), (os.path.join(SIM, "_gemeinsam"), "_gemeinsam")):
                for wurzel, ordner, dateien in os.walk(basis):
                    ordner[:] = sorted(o for o in ordner if o not in ("node_modules", ".git", "__pycache__", "_pruefung"))
                    for f in sorted(dateien):
                        if f != "quellcode.zip" and ".local." not in f:
                            zf.write(os.path.join(wurzel, f), os.path.join(name, os.path.relpath(os.path.join(wurzel, f), basis)).replace(os.sep, "/"))
            if METHODEN.get("simulationen"):                           # Methode der Sammlung (23.11.2026)
                zf.write(METHODEN["simulationen"], "METHODE.md")
        bild = os.path.join(q, "vorschau.png")
        if os.path.exists(bild):
            w, h = kachelbild(bild, os.path.join(ziel, "bilder", aid + ".webp"))
        else:
            w, h = titelbild(meta["titel"]["de"], os.path.join(ziel, "bilder", aid + ".webp"))
        g = gruppen.get(e.get("gruppe"), {})
        karten.append({"id": aid, "titel": meta["titel"], "autoren": f"{e['herkunft']} · R. König",
                       "kategorie": g.get("titel", {"de": e["herkunft"], "en": e["herkunft"]}), "jahr": meta.get("jahr", e.get("jahr")),
                       "datum": meta.get("datum") or f"{meta.get('jahr', e.get('jahr'))}-01-01", "vorschau": meta.get("vorschau"), "href": f"{aid}/",
                       "bild": f"bilder/{aid}.webp" + vq(os.path.join(ziel, "bilder", aid + ".webp")), "w": w, "h": h})
    de, en = SIM_TEXT["de"], SIM_TEXT["en"]
    n_alle = len(bestand["programme"])
    einleitung = (f'<style>html[lang="en"] .nur-de, html[lang="de"] .nur-en {{ display: none; }} .feld select {{ max-width: 62%; text-overflow: ellipsis; }}</style>'
                  f'<section class="ueber" id="ueber"><div><h2><span class="nur-de">{html.escape(de[0])}</span><span class="nur-en">{html.escape(en[0])}</span></h2></div>'
                  f'<div><p class="nur-de">{html.escape(de[1])}</p><p class="nur-en">{html.escape(en[1])}</p>'
                  f'<p class="nur-de">{len(karten)} von {n_alle} Programmen sind umgesetzt. {html.escape(de[2])}</p>'
                  f'<p class="nur-en">{len(karten)} of {n_alle} programs are done. {html.escape(en[2])}</p>'
                  f'<p><a href="../../archiv/raumprozesse/simulationsprogramme/"><span class="nur-de">Originale im Archiv</span><span class="nur-en">Originals in the archive</span></a>'
                  + (' · <a href="../../lab/methode/simulationen/"><span class="nur-de">Methode</span><span class="nur-en">Method</span></a>' if METHODEN.get("simulationen") else "")
                  + '</p></div></section>')
    seite(vorlage, os.path.join(ziel, "index.html"),
          FILTER.format(id="simulationen", folge="", daten=json.dumps({"projekte": karten}, ensure_ascii=False)) + "\n" + einleitung,
          "../../", "Frühe Simulationen · Entwurfsforschung", "lab", alt)
    return len(karten)



KAT = os.path.join(HIER, "katalog")
KAT_TAGS = {"Parcel": ("Parzellen", "Parcels"), "Visibility": ("Sichtbarkeit", "Visibility"), "Street": ("Straßen", "Streets"), "Water": ("Wasser", "Water"),
            "Context": ("Kontext", "Context"), "Land Use": ("Nutzung", "Land use"), "Building": ("Gebäude", "Buildings")}
KAT_STATUS = {"umgesetzt": ("Web-App", "Web app"), "in_arbeit": ("in Arbeit", "in progress"), "naechste_runde": ("nächste Runde", "next round"),
              "nicht_umgesetzt": ("nicht umgesetzt", "not implemented"), "abgedeckt": ("abgedeckt", "covered"), "teil": ("Teil einer App", "part of an app")}


def katalog(vorlage, alt):
    """Bereich lab/parametric-planning-catalogue/ (23.11.2026): Module des Parametric Planning Catalogue (InfAR, Bauhaus-Universität Weimar)
    als Web-Apps. Je Eintrag mit Status „umgesetzt“ in katalog/bestand.json: App-Ordner, quellcode.zip (katalog/<app>/, katalog/_gemeinsam/,
    simulationen/_gemeinsam/ – die Apps nutzen den Rahmen der Frühen Simulationen über ../../simulationen/_gemeinsam/), Kachelbild aus
    <app>/vorschau.png. Die Übersicht listet darunter alle Einträge des Katalogs mit Stand (umgesetzt, nächste Runde, nicht umgesetzt + Grund)."""
    import zipfile
    B = json.load(open(os.path.join(KAT, "bestand.json"), encoding="utf-8"))
    ziel = os.path.join(SITE, "lab", "parametric-planning-catalogue")
    os.makedirs(os.path.join(ziel, "bilder"), exist_ok=True)
    shutil.copytree(os.path.join(KAT, "_gemeinsam"), os.path.join(ziel, "_gemeinsam"), ignore=shutil.ignore_patterns("test", *SIM_NICHT_MUSTER), dirs_exist_ok=True)
    open(os.path.join(ziel, ".htaccess"), "w", encoding="utf-8").write('AddType "text/plain; charset=utf-8" .md\nAddType "text/javascript; charset=utf-8" .mjs\n')
    pakete = [(os.path.join(KAT, "_gemeinsam"), "katalog/_gemeinsam"), (os.path.join(SIM, "_gemeinsam"), "simulationen/_gemeinsam")]
    def app_bauen(e):
        aid = e["app"]; q = os.path.join(KAT, aid); d = os.path.join(ziel, aid)
        meta = json.load(open(os.path.join(q, "app.json"), encoding="utf-8"))
        shutil.copytree(q, d, ignore=SIM_NICHT, dirs_exist_ok=True)
        with zipfile.ZipFile(os.path.join(d, "quellcode.zip"), "w", zipfile.ZIP_DEFLATED) as zf:
            for basis, name in [(q, f"katalog/{aid}")] + pakete:
                for wurzel, ordner, dateien in os.walk(basis):
                    ordner[:] = sorted(o for o in ordner if o not in ("node_modules", ".git", "__pycache__", "_pruefung"))
                    for f in sorted(dateien):
                        if f != "quellcode.zip" and ".local." not in f:
                            zf.write(os.path.join(wurzel, f), name + "/" + os.path.relpath(os.path.join(wurzel, f), basis).replace(os.sep, "/"))
            if METHODEN.get("parametric-planning-catalogue"):            # Methode des Bereichs (23.11.2026)
                zf.write(METHODEN["parametric-planning-catalogue"], "METHODE.md")
        ih = os.path.join(d, "index.html")
        h_ = versionieren(open(ih, encoding="utf-8").read(), d)       # ?v= gegen den Cloudflare-Cache (erst lesen, dann schreiben)
        open(ih, "w", encoding="utf-8").write(h_)
        bild = os.path.join(q, "vorschau.png")
        if os.path.exists(bild):
            w, h = kachelbild(bild, os.path.join(ziel, "bilder", aid + ".webp"))
        else:
            w, h = titelbild(meta["titel"]["de"], os.path.join(ziel, "bilder", aid + ".webp"))
        tag = KAT_TAGS.get(e["tags"][0], (e["tags"][0], e["tags"][0]))
        return {"id": aid, "titel": meta["titel"], "autoren": "Gismo · InfAR" if "Gismo" in e["autoren"] else "DeCodingSpaces · InfAR",
                "kategorie": {"de": tag[0], "en": tag[1]}, "jahr": meta.get("jahr", 2020), "datum": meta.get("datum") or "2020-01-01",
                "vorschau": meta.get("vorschau"), "href": f"{aid}/",
                "bild": f"bilder/{aid}.webp" + vq(os.path.join(ziel, "bilder", aid + ".webp")), "w": w, "h": h}

    fertig = lambda L: [e for e in sorted(L, key=lambda e: e.get("reihenfolge", 0)) if e.get("status") == "umgesetzt" and e.get("app")]
    karten = [app_bauen(e) for e in fertig(B["eintraege"])]
    lab_karten = [app_bauen(e) for e in fertig(B.get("lab", []))]          # DeCodingSpaces Lab (23.11.2026): eigener Abschnitt, Kacheln fest im HTML
    K = B["katalog"]
    def liste(L, eintrag, lab=False):
        z = []
        for e in sorted(L, key=lambda e: e.get("reihenfolge", 0)):
            st = KAT_STATUS.get(e["status"], (e["status"], e["status"]))
            if e["status"] == "teil" and e.get("teil_von"):
                st = (f'Teil von {e["teil_von"]}', f'part of {e["teil_von"]}')
            app = e.get("app") if e["status"] == "umgesetzt" else e.get("teil_von") if e["status"] == "teil" else None
            titel = (f'<a href="{app}/">{zwei(e.get("titel_de") or e["titel"], e.get("titel_en") or e["titel"])}</a>' if app else html.escape(e["titel"]))
            grund = e.get("grund") or {}
            kopf = " · ".join(x for x in ([e.get("art") or "", str(e.get("jahr") or "")] if lab else [" · ".join(e["tags"])]) if x)
            z.append(f'<li><div class="kopfzeile">{titel}<span class="mono status s-{e["status"]}">{zwei(*st)}</span></div>'
                     f'<div class="mono klein">{html.escape(kopf)} · {html.escape(e["autoren"])} · <a href="{html.escape(e["url"])}">{zwei(*eintrag)}</a></div>'
                     + (f'<p class="nur-de">{html.escape(grund["de"])}</p><p class="nur-en">{html.escape(grund.get("en") or grund["de"])}</p>' if grund.get("de") else "") + "</li>")
        return "".join(z)
    zeilen = [liste(B["eintraege"], ("Katalogeintrag", "catalogue entry"))]
    n_alle, n_um = len(B["eintraege"]), len(karten)
    stil = ('<style>html[lang="en"] .nur-de, html[lang="de"] .nur-en { display: none; } .feld select { max-width: 62%; text-overflow: ellipsis; }'
            ' .bestand { list-style: none; margin: 0; padding: 0; } .bestand li { border-top: 1px solid var(--line); padding: 12px 0; }'
            ' .bestand .kopfzeile { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }'
            ' .bestand .status { color: var(--muted); white-space: nowrap; } .bestand .s-umgesetzt { color: var(--accent-text); }'
            ' .bestand .klein { color: var(--muted); margin-top: 4px; text-transform: none; letter-spacing: 0; overflow-wrap: anywhere; } .bestand p { margin: 6px 0 0; font-size: 14px; }</style>')
    einleitung = (f'{stil}<section class="ueber" id="ueber"><div><h2>{html.escape(K["titel"])}</h2></div><div>'
                  f'<p class="nur-de">Der Parametric Planning Catalogue (2020) sammelt Grasshopper-Module für integrierte Planungsstrategien – Parzellierung, Sichtbarkeit, Straßennetze, Wasser, Gelände –, entwickelt bei DecodingSpaces, ECL-AA und der Professur Informatik in der Architektur und Urbanistik (InfAR) der Bauhaus-Universität Weimar. Hier laufen die Module als eigenständige Web-Apps im Browser: Verfahren, Parameter und Begriffe folgen den Grasshopper-Dateien; jede App nennt ihr Original und lässt sich als Quellcode herunterladen und weiterentwickeln.</p>'
                  f'<p class="nur-en">The Parametric Planning Catalogue (2020) collects Grasshopper modules for integrated planning strategies – parcellation, visibility, street networks, water, terrain – developed at DecodingSpaces, ECL-AA and the Chair for Informatics in Architecture and Urbanism (InfAR) at Bauhaus-Universität Weimar. Here the modules run as standalone web apps in the browser: procedures, parameters and terms follow the Grasshopper files; every app names its original and can be downloaded as source code to develop further.</p>'
                  f'<p class="nur-de">{n_um} von {n_alle} Modulen sind umgesetzt; die übrigen stehen unten mit Begründung.</p><p class="nur-en">{n_um} of {n_alle} modules are done; the others are listed below with reasons.</p>'
                  f'<p><a href="{html.escape(K["url"])}">{zwei("Original: Parametric Planning Catalogue", "Original: Parametric Planning Catalogue")}</a> · '
                  f'<a href="{html.escape(K["repo"])}">GitHub infar-buw/parametric-planning-catalogue</a> · {zwei("Lizenz des Katalogs: MIT", "Catalogue license: MIT")}'
                  + (f' · <a href="../../lab/methode/parametric-planning-catalogue/">{zwei("Methode", "Method")}</a>' if METHODEN.get("parametric-planning-catalogue") else "")
                  + '</p></div></section>'
                  f'<section class="ueber" id="bestand"><div><h2>{zwei("Alle Module", "All modules")}</h2></div><div><ul class="bestand">{"".join(zeilen)}</ul></div></section>'
                  + lab_abschnitt(B, lab_karten, liste))
    seite(vorlage, os.path.join(ziel, "index.html"),
          FILTER.format(id="katalog", folge='<option value="folge" data-t="reihenfolge">Reihenfolge</option>', daten=json.dumps({"projekte": karten}, ensure_ascii=False)) + "\n" + einleitung,
          "../../", "Parametric Planning Catalogue · Entwurfsforschung", "lab", alt)
    return len(karten) + len(lab_karten)


def lab_abschnitt(B, karten, liste):
    """Abschnitt „DeCodingSpaces Lab“ auf der Katalogseite (23.11.2026): Einleitung, Kacheln der umgesetzten Lab-Apps (fest im HTML, damit DATA
    nur die Katalogkacheln trägt) und Liste aller Lab-Einträge mit Entscheidung und Begründung."""
    L = B.get("lab") or []
    if not L:
        return ""
    I = B.get("lab_info", {})
    kacheln = "".join(
        f'<a class="karte" href="{html.escape(k["href"])}" data-id="{html.escape(k["id"])}"><div class="oben mono"><span>DeCodingSpaces Lab</span><span>{k["jahr"]}</span></div>'
        f'<div class="bild"><img src="{html.escape(k["bild"])}" alt="" loading="lazy" width="{k["w"]}" height="{k["h"]}"></div>'
        + (f'<p class="vorschau">{zwei(k["vorschau"]["de"], k["vorschau"].get("en"))}</p>' if k.get("vorschau") else "")
        + f'<div class="unten"><span class="titel">{zwei(k["titel"]["de"], k["titel"].get("en"))}</span><span class="jahr mono">{k["jahr"]}</span></div></a>' for k in karten)
    n = {s: sum(1 for e in L if e["status"] == s) for s in ("umgesetzt", "in_arbeit", "abgedeckt", "nicht_umgesetzt")}
    return (f'<section class="ueber" id="dcs-lab"><div><h2>DeCodingSpaces Lab</h2></div><div>'
            f'<p class="nur-de">Das DeCodingSpaces Lab der Bauhaus-Universität Weimar (Computational Planning Group, Professur Informatik in der Architektur und Urbanistik) sammelt Forschungsprojekte, Workshops und Werkzeuge, die mit der DeCodingSpaces Toolbox für Grasshopper entstanden sind. Wo ein eigenständiges Modell darin steckt, läuft es hier als Web-App – im gleichen Rahmen wie die Module des Katalogs, mit Original, Autorinnen und Autoren und Lizenzlage in jeder App.</p>'
            f'<p class="nur-en">The DeCodingSpaces Lab of Bauhaus-Universität Weimar (Computational Planning Group, Chair for Informatics in Architecture and Urbanism) collects research projects, workshops and tools built with the DeCodingSpaces Toolbox for Grasshopper. Where they contain a model of their own, it runs here as a web app – in the same frame as the catalogue modules, with original, authors and licence situation in every app.</p>'
            f'<p class="nur-de">{len(L)} Einträge gesichtet: {n["umgesetzt"]} als Web-App umgesetzt, {n["abgedeckt"]} durch vorhandene Apps abgedeckt, {n["nicht_umgesetzt"]} ohne eigenes Modell (Begründung unten).</p>'
            f'<p class="nur-en">{len(L)} entries reviewed: {n["umgesetzt"]} implemented as web apps, {n["abgedeckt"]} covered by existing apps, {n["nicht_umgesetzt"]} without a model of their own (reasons below).</p>'
            f'<p><a href="{html.escape(I.get("url", "https://toolbox.decodingspaces.net/#lab"))}">{zwei("Original: DeCodingSpaces Lab", "Original: DeCodingSpaces Lab")}</a> · '
            f'{zwei("Lizenz: DeCodingSpaces Toolbox GNU GPL v3; die Lab-Seiten nennen keine eigene Lizenz – die Apps sind Neuumsetzungen ohne übernommenen Code", "Licence: DeCodingSpaces Toolbox GNU GPL v3; the Lab pages state no licence of their own – the apps are re-implementations without copied code")}</p></div></section>'
            + (f'<div class="raster" id="raster-lab">{kacheln}</div>' if kacheln else "")
            + f'<section class="ueber" id="lab-bestand"><div><h2>{zwei("Alle Lab-Einträge", "All Lab entries")}</h2></div><div><ul class="bestand">{liste(L, ("Eintrag im Lab", "Lab entry"), lab=True)}</ul></div></section>')


if __name__ == "__main__":
    a = sys.argv
    bauen(a[a.index("--alt") + 1] if "--alt" in a else "/")
