#!/usr/bin/env python3
"""
Convert every .MOV under a folder (recursively) to browser-friendly .mp4
(H.264 + AAC), then delete the original .MOV.

Drop new sign category folders with .MOV files anywhere under the root and
just run the script again. It finds them automatically.

Usage (run from project root):
    python convert_mov_to_mp4.py                  # convert + delete .MOV files
    python convert_mov_to_mp4.py --dry-run        # preview only, changes nothing
    python convert_mov_to_mp4.py --keep-originals # convert but keep the .MOV files
    python convert_mov_to_mp4.py --overwrite      # re-convert even if .mp4 exists
    python convert_mov_to_mp4.py --root assets/videos/basic

Requires ffmpeg on PATH.
"""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

DEFAULT_ROOT = "assets"
SKIP_DIRS = {".git", "node_modules", "__pycache__"}


def find_mov_files(root: Path):
    found = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if name.lower().endswith(".mov"):
                found.append(Path(dirpath) / name)
    return sorted(found)


def convert(src: Path, dst: Path) -> bool:
    """Convert to a temp file first, then rename, so a crash never leaves a broken .mp4."""
    tmp = dst.with_name(f".{dst.stem}.converting.mp4")
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(src),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-pix_fmt", "yuv420p",       # max browser compatibility
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",   # start playing before fully loaded
        str(tmp),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not tmp.exists() or tmp.stat().st_size == 0:
        print(f"  FAILED: {src}\n  {result.stderr[-500:]}")
        if tmp.exists():
            tmp.unlink()
        return False
    os.replace(tmp, dst)
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert .MOV files to .mp4 and delete the originals")
    parser.add_argument("--root", default=DEFAULT_ROOT, help=f"Folder to scan recursively (default: {DEFAULT_ROOT})")
    parser.add_argument("--keep-originals", action="store_true",
                        help="Do NOT delete .MOV files after conversion")
    parser.add_argument("--overwrite", action="store_true",
                        help="Re-convert even if the .mp4 already exists")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would happen without changing anything")
    args = parser.parse_args()

    if shutil.which("ffmpeg") is None:
        print("ERROR: ffmpeg not found on PATH. Install it first (winget install -e --id Gyan.FFmpeg).")
        return 1

    root = Path(args.root)
    if not root.is_dir():
        print(f"ERROR: folder not found: {root.resolve()}")
        return 1

    delete_originals = not args.keep_originals
    files = find_mov_files(root)
    print(f"Found {len(files)} .MOV file(s) under {root}")
    if args.dry_run:
        print("(dry run, nothing will be changed)")

    converted = skipped = deleted = failed = 0
    for i, src in enumerate(files, 1):
        dst = src.with_suffix(".mp4")
        label = f"[{i}/{len(files)}] {src.relative_to(root)} -> {dst.name}"

        already_done = dst.exists() and dst.stat().st_size > 0 and not args.overwrite

        if already_done:
            print(f"{label}  (mp4 exists, skipping conversion)")
            skipped += 1
        else:
            print(label)
            if args.dry_run:
                if delete_originals:
                    print("    would delete original .MOV")
                continue
            if not convert(src, dst):
                failed += 1
                continue  # never delete the original if conversion failed
            converted += 1

        if delete_originals:
            if args.dry_run:
                print("    would delete original .MOV")
            else:
                src.unlink()
                deleted += 1

    print(f"\nDone. Converted: {converted} | Skipped: {skipped} | "
          f"Deleted .MOV: {deleted} | Failed: {failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())