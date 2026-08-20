"""Re-check the clubs `scrape.py` could not download.

footylogos adds monochrome pages over time, so clubs recorded as
NO_MONOCHROME_PUBLISHED may become available later. This re-runs only those,
leaving already-downloaded logos untouched, and updates `results.json` in place.

    python3 src/logos/retry.py
"""

import json
import os
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from scrape import RESULTS, WHITE, fetch_club


def main():
    os.makedirs(WHITE, exist_ok=True)
    with open(RESULTS) as handle:
        results = json.load(handle)

    pending = sorted(slug for slug, v in results.items() if v["status"] != "OK")
    if not pending:
        print("nothing pending")
        return
    print(f"re-checking {len(pending)} clubs\n")

    with ThreadPoolExecutor(max_workers=6) as pool:
        for slug, status, url in pool.map(fetch_club, pending):
            results[slug]["status"] = status
            results[slug]["url"] = url
            if status == "OK":
                print(f"  RECOVERED  {slug} -> {url}")

    with open(RESULTS, "w") as handle:
        json.dump(results, handle, indent=2, sort_keys=True)
        handle.write("\n")

    print()
    for status, count in Counter(v["status"] for v in results.values()).most_common():
        print(f"{count:4d}  {status}")


if __name__ == "__main__":
    main()
