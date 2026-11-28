"""Einheitlicher Kopf aller Seiten von entwurfsforschung.de (Wunsch Reinhard König 27.11.2026).

Vorbild ist der Kopf der Startseite (vorlage.html): links „Entwurfsforschung · KI Lab“, darunter im selben Kasten die Wortmarke der
Bauhaus-Universität Weimar (weiße Schrift auf Schwarz, bei „Hell“ umgekehrt) und das Logo der Professur InfAU; Mitte Lab · Archiv · Über,
rechts DE / EN und Hell/Dunkel.
  - herkunft(Q): die beiden Logos (Quelle: Planungsgrundlagen/Tutorials/_werkzeuge/mockup), für {{HERKUNFT}} in vorlage.html
  - ersetze_kopf(html, Q, zur_wurzel, en): ersetzt in Seiten aus Tutorials/_werkzeuge/mockup/page.html (Dokumentationen auf lab/doku/,
    Lernbereiche) den alten Kopf (Uni-Wortmarke auf Blau, InfAU, Pfad) durch diesen Kopf. Die Bausteine, die page.html braucht, bleiben:
    #crumbs (Pfad, eigene Zeile darunter), #lang (DE / EN), #theme (Hell/Dunkel, jetzt mit dem Speicher der Website, dunkel voreingestellt), #mlink.
Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 27.11.2026
"""
import os, re

UNI_URL = "https://www.uni-weimar.de/"
INFAU_URL = "https://www.uni-weimar.de/de/universitaet/fakultaeten/architektur-und-urbanistik/professuren/infau/news/"


def _svg(Q, name):
    t = open(os.path.join(Q, "Tutorials", "_werkzeuge", "mockup", name), encoding="utf-8").read()
    return t.split("-->\n", 1)[1] if t.lstrip().startswith("<!--") else t


def herkunft(Q):
    """Wortmarke der Bauhaus-Universität (Schrift in currentColor) und Logo InfAU, nebeneinander unter der Marke."""
    uni = _svg(Q, "uni_logo.svg").replace('fill="#ffffff"', 'fill="currentColor"').strip()
    infau = _svg(Q, "logo.svg").replace('class="logo"', 'class="infau-logo"', 1).strip()
    return (f'<div class="herkunft"><a class="uni-wort" href="{UNI_URL}" rel="noopener" title="Bauhaus-Universität Weimar">{uni}</a>'
            f'<a class="infau-wort" href="{INFAU_URL}" rel="noopener" title="Professur Informatik in der Architektur und Urbanistik (InfAU)">{infau}</a></div>')


# CSS der Logos, gleich für vorlage.html und die Seiten aus page.html (Variablen --ink, --paper, --line gibt es in beiden)
HERKUNFT_CSS = """
/* Raster: Zeile 1 Icon · ENTWURFSFORSCHUNG · KI LAB, Zeile 2 die Logos: Bauhaus-Universität und InfAU direkt nebeneinander,
   zusammen mittig unter der ganzen Marke (Wunsch Reinhard König 28.11.2026; 27.11. noch bündig mit Icon und Titel). */
.marke-box { display: grid; grid-template-columns: auto auto auto; column-gap: 12px; row-gap: 7px; align-content: center; justify-content: start;
  padding: 9px var(--g, 16px) 10px; border-right: 1px solid var(--line); flex: 0 0 auto; }
.marke-box a.marke { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; align-items: center; padding: 0; border-right: 0; height: auto; }
.herkunft { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 14px; }
.herkunft a { display: block; line-height: 0; color: var(--ink); }
.uni-wort { background: var(--paper); }   /* weiße Schrift auf Schwarz, bei Hell schwarze Schrift auf Weiß */
.uni-wort .uni-logo { height: 24px; width: auto; display: block; }
.infau-wort .infau-logo { height: 17px; width: auto; display: block; }
.herkunft a:hover { opacity: .75; }
@media (max-width: 900px) { .herkunft { gap: 10px; } .uni-wort .uni-logo { height: 20px; } .infau-wort .infau-logo { height: 14px; } }
"""

KOPF_CSS = """
/* Kopf wie auf der Startseite von entwurfsforschung.de (kopf.py, 27.11.2026) */
:root[data-theme="dark"] { --paper: #000; --line: #2a2a2e; }   /* Schwarz wie Startseite und Apps (AGENTS.md Punkt 10) */
.ef-kopf { position: sticky; top: 0; z-index: 30; background: var(--paper); border-bottom: 1px solid var(--line); --g: max(16px, env(safe-area-inset-left, 0px)); }
.ef-kopf .ef-zeile { display: flex; align-items: stretch; min-height: 64px; }
.ef-kopf .marke { display: flex; align-items: center; gap: 12px; color: var(--ink); text-decoration: none; }
.ef-kopf .marke .logo { width: 30px; height: 30px; display: block; }
.ef-kopf .marke b { font: 300 26px/1.2 var(--sans, "Geist", system-ui, sans-serif); letter-spacing: .01em; text-transform: uppercase; }
.ef-kopf .pill { border: 1px solid var(--accent-text); color: var(--accent-text); border-radius: 999px; padding: 2px 12px; font: 300 18px/1.25 var(--sans, "Geist", system-ui, sans-serif); text-transform: uppercase; }
.ef-kopf .ef-nav { display: flex; flex: 1; justify-content: flex-end; align-items: center; }
.ef-kopf .ef-nav a { font: 300 26px/1.2 var(--sans, "Geist", system-ui, sans-serif); text-transform: uppercase; color: var(--muted); text-decoration: none; padding: 0 clamp(14px, 3vw, 48px); }
.ef-kopf .ef-nav a:hover { color: var(--ink); }
.ef-kopf .werkzeug { display: flex; align-items: center; gap: 14px; padding: 0 var(--g) 0 12px; }
.ef-kopf .lang-sw { font: 300 26px/1.2 var(--sans, "Geist", system-ui, sans-serif); letter-spacing: 0; text-transform: uppercase; color: var(--muted); background: none; border: 0; padding: 0 4px; text-decoration: none; }
.ef-kopf .lang-sw b { font-weight: 300; color: var(--accent-text); }
.ef-kopf .lang-sw.aus { opacity: .45; cursor: not-allowed; }
.ef-kopf .theme-btn { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid var(--line); border-radius: 999px; padding: 6px 12px; cursor: pointer; color: var(--ink);
  font: 400 11px/1.2 var(--mono, "Geist Mono", ui-monospace, monospace); letter-spacing: .04em; text-transform: uppercase; }
.ef-kopf .theme-btn svg { width: 14px; height: 14px; }
.ef-kopf .theme-btn:hover { border-color: var(--ink); }
.ef-kopf .mlink { color: var(--muted); text-decoration: none; }
.ef-kopf .ef-pfad { border-top: 1px solid var(--line); min-height: 36px; display: flex; align-items: center; padding: 0 var(--g); }
.ef-kopf .ef-pfad:has(#crumbs:empty) { display: none; }
.ef-kopf .crumbs { display: flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden; white-space: nowrap; }
@media (max-width: 900px) { .ef-kopf .ef-nav a, .ef-kopf .lang-sw { font-size: 18px; } .ef-kopf .ef-nav a { padding: 0 10px; } .ef-kopf .marke b { font-size: 18px; } .ef-kopf .pill { font-size: 13px; } }
@media (max-width: 600px) {
  .ef-kopf .ef-zeile { flex-wrap: wrap; }
  .ef-kopf .marke-box { border-right: 0; flex: 1; }
  .ef-kopf .ef-nav { order: 3; flex: 1 0 100%; justify-content: flex-start; border-top: 1px solid var(--line); height: 44px; }
  .ef-kopf .ef-nav a { font-size: 16px; padding: 0 var(--g); }
  .ef-kopf .theme-btn .t-txt { display: none; }
}
"""

# Doku = Sammelseite der Dokumentationen lab/doku/ zwischen Archiv und Über (Wunsch Reinhard König 27.11.2026)
NAV = {"de": (("", "Lab"), ("archiv/", "Archiv"), ("lab/doku/", "Doku")),   # ohne „Über“ (Wunsch Reinhard 28.11.2026)
       "en": (("", "Lab"), ("archiv/", "Archive"), ("lab/doku/en.html", "Docs"))}


def ersetze_kopf(html, Q, zur_wurzel, en=False):
    """Alten Kopf einer page.html-Seite durch den Kopf der Website ersetzen; zur_wurzel z. B. „../../“ für lab/doku/."""
    m = re.search(r'<header class="top">.*?</header>', html, flags=re.S)
    if not m:
        raise SystemExit("ersetze_kopf: alter Kopf (header.top) nicht gefunden: " + html[:300].replace("\n", " "))
    alt = m.group(0)
    for pflicht in ('id="crumbs"', 'id="theme"', 'id="lang"'):
        if pflicht not in alt:
            raise SystemExit(f"ersetze_kopf: {pflicht} fehlt im alten Kopf (page.html geändert?)")
    mlink = re.search(r'<a class="mlink[^"]*" id="mlink"[^>]*>.*?</a>', alt, flags=re.S)
    sp = "en" if en else "de"
    nav = "".join(f'<a href="{zur_wurzel}{h}">{t}</a>' for h, t in NAV[sp])
    neu = (f'<header class="top ef-kopf"><div class="ef-zeile">'
           f'<div class="marke-box"><a class="marke" href="{zur_wurzel}" aria-label="{"Entwurfsforschung – AI Lab, home" if en else "Entwurfsforschung – KI Lab, Startseite"}">'
           f'<img class="logo" src="{zur_wurzel}favicon.svg" alt="" width="30" height="30"><b>Entwurfsforschung</b><span class="pill">{"AI Lab" if en else "KI Lab"}</span></a>'
           f'{herkunft(Q)}</div>'
           f'<nav class="ef-nav" aria-label="{"Main navigation" if en else "Hauptnavigation"}">{nav}</nav>'
           f'<div class="werkzeug">{mlink.group(0) if mlink else ""}<a class="lang-sw" id="lang" hidden></a>'
           f'<button class="theme-btn" type="button" id="theme" aria-label="{"Toggle appearance" if en else "Darstellung umschalten"}"></button></div></div>'
           f'<div class="ef-pfad"><nav class="crumbs label" id="crumbs" aria-label="{"Path" if en else "Pfad"}"></nav></div></header>\n'
           '<script>/* Höhe des Kopfs für Gliederung und Schrittleiste (page.html rechnet mit --head) */\n'
           '(function () { const k = document.querySelector(".ef-kopf"), s = () => document.documentElement.style.setProperty("--head", k.offsetHeight + "px");'
           ' s(); if (window.ResizeObserver) new ResizeObserver(s).observe(k); })();</script>')
    html = html.replace(alt, neu, 1)
    # Hell/Dunkel mit dem Speicher der Website, dunkel voreingestellt (wie Startseite und Apps, AGENTS.md Punkt 10)
    if 'const THEME_KEY = "infau-tutorials-theme";' not in html:
        raise SystemExit("ersetze_kopf: THEME_KEY in page.html nicht gefunden")
    html = html.replace('const THEME_KEY = "infau-tutorials-theme";', 'const THEME_KEY = "entwurfsforschung-theme";', 1)
    html = html.replace("<head>\n", '<head>\n<script>document.documentElement.dataset.theme = "dark"; try { const t = localStorage.getItem("entwurfsforschung-theme"); '
                        'if (t === "light" || t === "dark") document.documentElement.dataset.theme = t; } catch (e) {}</script>\n', 1)
    html = html.replace("</head>", f"<style>{HERKUNFT_CSS}{KOPF_CSS}</style>\n</head>", 1)
    return html
