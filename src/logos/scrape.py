"""Download white monochrome club logos from footylogos.com.

Walks each competition page, collects the club slugs from its team grid, then
pulls the white SVG from each club's `-monochrome` sub-page into `white/`.
Writes `results.json` with per-club status, source URL, and source leagues.

Not every club has a monochrome page — coverage is near-total in the top five
leagues and collapses below the Championship. Those clubs are recorded as
NO_MONOCHROME_PUBLISHED rather than treated as failures.

    python3 src/logos/scrape.py
"""

import json
import os
import re
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

BASE = "https://www.footylogos.com"
UA = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
    )
}
HERE = os.path.dirname(os.path.abspath(__file__))
RESULTS = os.path.join(HERE, "results.json")


# Clubs we deliberately do not source from footylogos — we ship our own custom
# logos for these, hand-authored from the path data in
# src/components/TeamLogo/teams.tsx. fetch_club() skips them before any network
# request, so a re-run cannot overwrite them. Mapped to their country so the
# manifest still records where each file lives.
EXCLUDED = {
    "arsenal": "gb-eng",
    "manchester-city": "gb-eng",
    "tottenham-hotspur": "gb-eng",
}

LEAGUES = [
    "premier-league",
    "uefa-champions-league",
    "europa-league",
    "laliga",
    "bundesliga",
    "serie-a",
    "ligue-1",
    "efl-championship",
    "efl-league-one",
    "efl-league-two",
]


def get(url, binary=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as response:
        data = response.read()
    return data if binary else data.decode("utf-8", "replace")


def grid_slugs(html):
    """Club links in the team grid: everything between the first two <h2>s.

    Later sections (winners, standings, "explore") link to clubs too, so a
    document-wide scrape pulls in clubs that are not in the competition.
    """
    headings = [m.start() for m in re.finditer(r"<h2\b", html)]
    if len(headings) < 2:
        return []
    grid = html[headings[0] : headings[1]]
    return [m.group(1) for m in re.finditer(r'href="/logos/([^"/]+)"', grid)]


def white_svg_urls(html):
    """Candidate white-SVG URLs, CDN first.

    The `/downloads/` alias 404s for clubs whose asset sits in a nested CDN
    folder (Chelsea, for one), so the CDN `src` is the more reliable source.
    """
    urls = [
        m.group(1)
        for m in re.finditer(
            r'src="(https://assets\.footylogos\.com/[^"]*-white-logo-footylogos\.svg)"',
            html,
        )
    ]
    urls += [
        BASE + m.group(1)
        for m in re.finditer(
            r'href="(/downloads/[^"]*-white-logo-footylogos\.svg)"', html
        )
    ]
    return urls


def club_country(html):
    """Country code for a club, read from the flag on its page.

    ISO 3166-1 alpha-2 ("es", "de") except for the UK home nations, which keep
    their ISO 3166-2 subdivision codes ("gb-eng", "gb-sct", "gb-wls", "gb-nir").
    Football treats them as separate associations with separate league systems,
    so folding them to "gb" would put clubs that never meet in one directory.
    """
    match = re.search(r"flagcdn\.com/([a-z-]+)\.svg", html)
    return match.group(1) if match else None


def fetch_club(slug):
    """Return (slug, status, url, country). Writes `<country>/<slug>.svg`."""
    if slug in EXCLUDED:
        return slug, "EXCLUDED_CUSTOM_LOGO", None, EXCLUDED[slug]

    # The club page carries both the country flag and the monochrome link, and
    # the monochrome slug is not always `<slug>-monochrome` (chelsea -> chelsea-fc).
    try:
        club_page = get(f"{BASE}/logos/{slug}")
    except Exception as error:
        return slug, f"CLUB_PAGE_ERR {error}", None, None

    country = club_country(club_page)
    match = re.search(r'href="(/logos/[^"]*-monochrome)"', club_page)
    if not match:
        return slug, "NO_MONOCHROME_PUBLISHED", None, country
    try:
        html = get(BASE + match.group(1))
    except Exception as error:
        return slug, f"MONO_PAGE_ERR {error}", None, country

    urls = white_svg_urls(html)
    if not urls:
        return slug, "NO_WHITE_SVG", None, country
    if not country:
        return slug, "NO_COUNTRY", urls[0], None

    for url in urls:
        try:
            data = get(url, binary=True)
        except Exception:
            continue
        if b"<svg" in data[:500]:
            os.makedirs(os.path.join(HERE, country), exist_ok=True)
            with open(os.path.join(HERE, country, f"{slug}.svg"), "wb") as handle:
                handle.write(data)
            return slug, "OK", url, country
    return slug, "ALL_URLS_FAILED", urls[0], country


def main():
    clubs = {}  # slug -> [league, ...]
    for league in LEAGUES:
        try:
            html = get(f"{BASE}/competition/{league}")
        except Exception as error:
            print(f"LEAGUE FAIL {league}: {error}")
            continue
        slugs = grid_slugs(html)
        print(f"{league}: {len(slugs)} clubs")
        for slug in slugs:
            clubs.setdefault(slug, []).append(league)

    print(f"\n{len(clubs)} unique clubs after dedupe\n")

    results = {}
    with ThreadPoolExecutor(max_workers=6) as pool:
        for slug, status, url, country in pool.map(fetch_club, sorted(clubs)):
            results[slug] = {
                "status": status,
                "url": url,
                "country": country,
                "leagues": clubs[slug],
            }
            if status != "OK":
                print(f"  {status:<24} {slug}")

    with open(RESULTS, "w") as handle:
        json.dump(results, handle, indent=2, sort_keys=True)
        handle.write("\n")

    print()
    for status, count in Counter(v["status"] for v in results.values()).most_common():
        print(f"{count:4d}  {status}")


if __name__ == "__main__":
    main()
