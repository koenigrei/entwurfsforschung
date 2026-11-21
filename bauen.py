"""Baut entwurfsforschung.de nach site/ (Aufruf: python bauen.py [--alt URL]).

Seiten: Lab (Startseite, projekte.json), Archiv (archiv.json + archiv_inhalte/ aus konvertiere.py) mit Einzelseiten, Impressum (Platzhalter,
bis die Angaben aus dem Impressum-Generator vorliegen). Alle Seiten teilen vorlage.html ({{MAIN}}).
--alt: Adresse der alten Website (kleiner Link unten); Voreinstellung "/" (solange die neue Seite unter /neu/ liegt, ist "/" das alte WordPress).
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
WEITER = '<!doctype html><meta charset="utf-8"><title>{t}</title><meta http-equiv="refresh" content="0; url={z}"><link rel="canonical" href="{z}"><a href="{z}">{t}</a>\n'
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


RUECKWEG = ('<a class="ef-zurueck" href="{z}" style="position:fixed;left:12px;bottom:12px;z-index:2147483000;font:500 11px/1 Geist Mono,ui-monospace,monospace;'
            'letter-spacing:.04em;text-transform:uppercase;text-decoration:none;color:#fff;background:rgba(0,0,0,.78);border:1px solid #3a3a3e;'
            'border-radius:999px;padding:7px 12px" title="Zurück zum KI Lab auf entwurfsforschung.de">← Lab</a>')


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
    return re.sub(r'(src|href)="([^"]+\.(?:js|css|webp|png|jpg|jpeg|gif|svg|ttf|woff2?))"', ersetze, t)


def lokal(pfad, zur_wurzel):
    """Google Fonts und three.js vom CDN in einer App-Datei durch Kopien auf dem eigenen Server ersetzen (keine Inhalte Dritter)."""
    t = open(pfad, encoding="utf-8").read()
    t = re.sub(r'<link[^>]+href="https://fonts\.(?:googleapis|gstatic)\.com"[^>]*>\s*', "", t)
    t = re.sub(r'<link[^>]+href="https://fonts\.googleapis\.com/css2[^"]*"[^>]*>', f'<link rel="stylesheet" href="{zur_wurzel}schrift/geist.css">', t)
    for u in THREE:
        t = t.replace(u, f"{zur_wurzel}vendor/three.r128.min.js")
    t = versionieren(t, os.path.dirname(pfad))
    if "ef-zurueck" not in t:                                         # Rückweg ins Lab in jeder App (Nutzer 21.11.2026)
        t = t.replace("</body>", RUECKWEG.format(z=zur_wurzel) + "</body>", 1)
    open(pfad, "w", encoding="utf-8").write(t)


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


def artikel(e, inhalt, base, unterseiten=None, eltern=None, zu_unter="", eltern_href="../", inhalt_en=None):
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
    return f'<main class="artikel"><aside><h1>{zwei(t["de"], t.get("en"))}</h1>{meta}{liste}{zurueck}</aside><div class="text">{text}</div></main>'



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
    lab = []
    for p in cfg["projekte"]:
        eigen = os.path.join(HIER, "bilder", p["id"] + ".png")         # Kachelbild aus kachelbilder.py (dunkel), sonst Bild aus projekte.json
        if os.path.exists(eigen) or p.get("bild"):
            w, h = kachelbild(eigen if os.path.exists(eigen) else os.path.join(Q, p["bild"]), os.path.join(SITE, "bilder", p["id"] + ".webp"))
        else:                                                          # noch kein Kachelbild (z. B. Frühe Simulationen vor pruefe_apps.py)
            w, h = titelbild(p["titel"]["de"], os.path.join(SITE, "bilder", p["id"] + ".webp"))
        z = os.path.join(SITE, p["ziel"]); os.makedirs(z, exist_ok=True)
        for ziel, quelle in p.get("dateien", {}).items():
            shutil.copy(os.path.join(Q, quelle), os.path.join(z, ziel))
            if ziel.endswith(".html"):
                lokal(os.path.join(z, ziel), "../" * p["ziel"].strip("/").count("/") + "../")
        for ziel, quelle in p.get("ordner", {}).items():
            shutil.copytree(os.path.join(Q, quelle), os.path.join(z, ziel))
        if p["start"] != "index.html":
            open(os.path.join(z, "index.html"), "w", encoding="utf-8").write(WEITER.format(t=p["titel"]["de"], z=p["start"]))
        lab.append({k: p[k] for k in ("id", "titel", "autoren", "kategorie", "jahr", "datum")} | {"vorschau": p.get("vorschau"), "href": p["ziel"], "bild": f"bilder/{p['id']}.webp" + vq(os.path.join(SITE, "bilder", p["id"] + ".webp")), "w": w, "h": h})
    seite(vorlage, os.path.join(SITE, "index.html"), FILTER.format(id="lab", folge='<option value="folge" data-t="reihenfolge">Reihenfolge</option>', daten=json.dumps({"projekte": lab}, ensure_ascii=False)) + "\n" + UEBER,
          "", "Entwurfsforschung · KI Lab", "lab", alt)

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
        seite(vorlage, os.path.join(d, "index.html"), artikel(e, inhalt_de, "../../", kinder(None), inhalt_en=inhalt_en), "../../", f"{e['titel']['de']} · Entwurfsforschung", "archiv", alt)
        for u in alle:
            uu = UU.get(u["id"], {})
            ude, uen = fassungen(u["inhalt"], uu.get("inhalt"), uu.get("original", U.get("original", "de")))
            ue = dict(e, titel={"de": u["titel"], "en": u.get("titel_en") or u["titel"]})
            el = nach_id.get(u.get("eltern"))
            seite(vorlage, os.path.join(d, u["id"], "index.html"),
                  artikel(ue, ude, "../../../", kinder(u["id"]), eltern=(el["titel"], el.get("titel_en")) if el else (e["titel"]["de"], e["titel"].get("en")), zu_unter="../",
                          eltern_href=f"../{el['id']}/" if el else "../", inhalt_en=uen), "../../../",
                  f"{u['titel']} · Entwurfsforschung", "archiv", alt)
        karten.append({"id": e["id"], "titel": e["titel"], "autoren": e["autoren"], "kategorie": e["kategorie"], "jahr": e["jahr"], "datum": e["datum"],
                       "vorschau": {"de": e["vorschau"], "en": vorschau_en or e["vorschau"]}, "href": f"{e['id']}/",
                       "bild": f"../bilder/archiv_{e['id']}.webp" + vq(os.path.join(SITE, "bilder", f"archiv_{e['id']}.webp")), "w": w, "h": h})
    seite(vorlage, os.path.join(SITE, "archiv", "index.html"),
          FILTER.format(id="archiv", folge='<option value="folge" data-t="reihenfolge">Reihenfolge</option>', daten=json.dumps({"projekte": karten}, ensure_ascii=False)),
          "../", "Archiv · Entwurfsforschung", "archiv", alt)

    # ---------------------------------------------------------------- Frühe Simulationen (simulationen/, 21.11.2026)
    nsim = simulationen(vorlage, alt)

    # ---------------------------------------------------------------- Impressum (Platzhalter)
    seite(vorlage, os.path.join(SITE, "impressum", "index.html"),
          open(os.path.join(HIER, "impressum.html"), encoding="utf-8").read(),
          "../", "Impressum · Entwurfsforschung", "", alt)
    n = sum(len(f) for _, _, f in os.walk(SITE))
    print(f"site/ gebaut: {len(lab)} Projekte, {len(karten)} Archiveinträge, {nsim} Simulationen, {n} Dateien")


SIM = os.path.join(HIER, "simulationen")
SIM_NICHT = shutil.ignore_patterns("node_modules", ".git", "__pycache__", "_pruefung", "*.local.*", "quellcode.zip")
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
                  f'<p><a href="../../archiv/raumprozesse/simulationsprogramme/"><span class="nur-de">Originale im Archiv</span><span class="nur-en">Originals in the archive</span></a></p></div></section>')
    seite(vorlage, os.path.join(ziel, "index.html"),
          FILTER.format(id="simulationen", folge="", daten=json.dumps({"projekte": karten}, ensure_ascii=False)) + "\n" + einleitung,
          "../../", "Frühe Simulationen · Entwurfsforschung", "lab", alt)
    return len(karten)


if __name__ == "__main__":
    a = sys.argv
    bauen(a[a.index("--alt") + 1] if "--alt" in a else "/")
