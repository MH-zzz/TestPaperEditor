#!/usr/bin/env python3
"""
Download random photos from https://picsum.photos into `static/picsum/`.

Note: this requires public internet access. The Codex sandbox may not have it,
so this script is mainly for running on your local machine / HBuilderX env.
"""

from __future__ import annotations

import argparse
import random
import time
import urllib.request
from pathlib import Path
from urllib.parse import quote


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(
        url,
        headers={
            # Some CDNs behave better with a UA.
            "User-Agent": "TestPaperEditor/1.0 (+https://picsum.photos/)",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    dest.write_bytes(data)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="static/picsum", help="Output directory")
    parser.add_argument("--seed", type=int, default=None, help="Seed for stable randomness")
    parser.add_argument("--sleep", type=float, default=0.15, help="Sleep between downloads (seconds)")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    out_dir = (root / args.out).resolve()

    # If seed isn't given, make it different per run.
    seed = args.seed if args.seed is not None else int(time.time())
    rnd = random.Random(seed)

    plan = []
    plan += [("opt", 12, 512, 512)]
    plan += [("stem", 6, 1280, 720)]
    plan += [("tall", 4, 720, 1280)]

    written = []
    for prefix, count, w, h in plan:
        for i in range(1, count + 1):
            file = f"{prefix}-{i:02d}.jpg"
            dest = out_dir / file
            # Use a per-file seed so re-running with same --seed is stable.
            file_seed = f"{seed}-{prefix}-{i}"
            url = f"https://picsum.photos/seed/{quote(file_seed)}/{w}/{h}"
            download(url, dest)
            written.append(str(dest.relative_to(root)))
            if args.sleep:
                time.sleep(args.sleep)

    print(f"download seed={seed}")
    print("written:")
    for p in written:
        print(" -", p)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
