#!/usr/bin/env python3
"""Crawl every built HTML page and assert a header link back to the homepage."""
from __future__ import annotations
import pathlib, re, sys
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT / "prototype"
HOME = (SITE / "index.html").resolve()

ABSOLUTE_HOME = (
    "https://ankela.github.io/grokeversity",
    "https://ankela.github.io/grokeversity/",
    "https://ankela.github.io/grokeversity/index.html",
)

class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []  # (href, classes, text, in_header)
        self._header = 0
        self._in_a = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        ad = dict(attrs)
        if tag == "header":
            self._header += 1
        if tag == "a" and "href" in ad:
            self._in_a = (ad.get("href", ""), ad.get("class", ""), self._header > 0)
            self._text = []

    def handle_data(self, data):
        if self._in_a is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self._in_a is not None:
            href, cls, in_header = self._in_a
            self.links.append((href, cls, "".join(self._text).strip(), in_header))
            self._in_a = None
        if tag == "header" and self._header:
            self._header -= 1

def resolve(page: pathlib.Path, href: str) -> pathlib.Path | None:
    if href is None:
        return None
    href = href.strip().split("#")[0].split("?")[0]
    if not href or href.startswith(("mailto:", "javascript:", "tel:")):
        return None
    if href.startswith("http://") or href.startswith("https://"):
        if href.rstrip("/") in {u.rstrip("/") for u in ABSOLUTE_HOME} or href in ABSOLUTE_HOME:
            return HOME
        return None
    return (page.parent / href).resolve()

def is_home(path: pathlib.Path | None) -> bool:
    if path is None:
        return False
    try:
        r = path.resolve()
    except OSError:
        return False
    return r == HOME or r == SITE.resolve()

def pages():
    return sorted(SITE.rglob("*.html"))

def check_page(page: pathlib.Path) -> str | None:
    raw = page.read_text(encoding="utf-8", errors="replace")
    p = LinkParser()
    p.feed(raw)
    header_homes = []
    any_homes = []
    home_control = False
    logo_home = False
    for href, cls, text, in_header in p.links:
        dest = resolve(page, href)
        if not is_home(dest):
            continue
        any_homes.append((href, text, cls, in_header))
        if in_header:
            header_homes.append((href, text, cls))
            classes = set(cls.split())
            low = text.lower()
            if "home-link" in classes or low == "home":
                home_control = True
            if "logo" in classes:
                logo_home = True
    if not header_homes:
        return f"{page.relative_to(SITE)}: no header link resolves to the homepage (index.html or ./)"
    # Homepage itself may use logo + Home; require a visible Home control on every page including home
    if not home_control:
        return f"{page.relative_to(SITE)}: header has a home URL but no visible Home control (a.home-link)"
    if not logo_home:
        return f"{page.relative_to(SITE)}: Grokeversity logo in the header should also link home"
    # The resolved file must exist
    dest = resolve(page, header_homes[0][0])
    if dest == SITE.resolve():
        dest = HOME
    if not dest.exists():
        return f"{page.relative_to(SITE)}: home href {header_homes[0][0]!r} does not resolve to an existing file ({dest})"
    return None

def crawl(site=SITE) -> list[str]:
    global SITE, HOME
    SITE = site
    HOME = (SITE / "index.html").resolve()
    found = pages()
    if not found:
        return [f"no HTML pages under {SITE}"]
    fails = []
    for page in found:
        err = check_page(page)
        if err:
            fails.append(err)
    return fails

def home_links_pass(site=None):
    fails = crawl(site or SITE)
    if fails:
        raise AssertionError("home link crawl failed:\n  " + "\n  ".join(fails))
    print(f"home_links_pass: {len(pages())} HTML pages have a header logo + Home control that resolve to the homepage")

def assert_home_header(pg, label):
    """Visible 44px Home control and logo link on a live page; header stays within the viewport width."""
    info = pg.evaluate("""() => {
      const header = document.querySelector('header');
      const home = document.querySelector('header a.home-link');
      const logo = document.querySelector('header a.logo');
      const hb = header && header.getBoundingClientRect();
      const ho = home && home.getBoundingClientRect();
      const lo = logo && logo.getBoundingClientRect();
      const csHome = home && getComputedStyle(home);
      const overflowX = document.documentElement.scrollWidth > window.innerWidth + 2;
      return {
        hasHeader: !!header,
        hasHome: !!(home && csHome.display !== 'none' && csHome.visibility !== 'hidden'),
        homeHref: home && home.getAttribute('href'),
        logoHref: logo && logo.getAttribute('href'),
        homeW: ho && ho.width, homeH: ho && ho.height,
        logoW: lo && lo.width, logoH: lo && lo.height,
        headerW: hb && hb.width, headerH: hb && hb.height,
        innerW: window.innerWidth,
        overflowX,
        homeText: home && (home.textContent||'').trim()
      };
    }""")
    assert info.get("hasHeader"), f"{label}: missing header"
    assert info.get("hasHome"), f"{label}: Home control missing or hidden: {info}"
    assert (info.get("homeText") or "").lower() == "home", f"{label}: Home control text should be Home, got {info.get('homeText')!r}"
    assert info.get("homeH") is not None and info["homeH"] >= 44 - 0.5, f"{label}: Home tap height {info.get('homeH')} < 44px: {info}"
    assert info.get("homeW") is not None and info["homeW"] >= 44 - 0.5, f"{label}: Home tap width {info.get('homeW')} < 44px: {info}"
    assert info.get("logoH") is not None and info["logoH"] >= 44 - 0.5, f"{label}: logo tap height {info.get('logoH')} < 44px: {info}"
    assert info.get("logoHref"), f"{label}: logo should be a link"
    assert not info.get("overflowX"), f"{label}: header caused horizontal overflow (scrollWidth > innerWidth): {info}"
    print(f"{label}: home header ok ({info['homeW']:.0f}x{info['homeH']:.0f}, header {info['headerW']:.0f}x{info['headerH']:.0f})")
    return info

if __name__ == "__main__":
    try:
        home_links_pass()
    except AssertionError as e:
        print(e)
        sys.exit(1)
