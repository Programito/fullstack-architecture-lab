#!/usr/bin/env python3
"""Validate Mermaid fenced blocks in Markdown and MDX files."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path


DOC_EXTENSIONS = {".md", ".mdx"}
SKIP_DIRS = {".angular", ".cache", ".git", ".storybook-static", "coverage", "dist", "node_modules"}


@dataclass(frozen=True)
class MermaidBlock:
    file: Path
    index: int
    line: int
    source: str


def iter_doc_files(paths: list[Path]) -> list[Path]:
    files: list[Path] = []

    for path in paths:
        if path.is_file() and path.suffix.lower() in DOC_EXTENSIONS:
            files.append(path)
            continue

        if not path.is_dir():
            continue

        for root, dirs, names in os.walk(path):
            dirs[:] = [name for name in dirs if name not in SKIP_DIRS]
            for name in names:
                candidate = Path(root) / name
                if candidate.suffix.lower() in DOC_EXTENSIONS:
                    files.append(candidate)

    return sorted(set(files))


def extract_blocks(file: Path) -> list[MermaidBlock]:
    lines = file.read_text(encoding="utf-8").splitlines()
    blocks: list[MermaidBlock] = []
    in_mermaid = False
    fence = ""
    start_line = 0
    current: list[str] = []

    for line_number, line in enumerate(lines, start=1):
        stripped = line.strip()

        if not in_mermaid:
            if stripped.startswith("```"):
                marker = stripped[3:].strip().lower()
                if marker == "mermaid" or marker.startswith("mermaid "):
                    in_mermaid = True
                    fence = "```"
                    start_line = line_number + 1
                    current = []
            elif stripped.startswith("~~~"):
                marker = stripped[3:].strip().lower()
                if marker == "mermaid" or marker.startswith("mermaid "):
                    in_mermaid = True
                    fence = "~~~"
                    start_line = line_number + 1
                    current = []
            continue

        if stripped.startswith(fence):
            source = "\n".join(current).strip()
            if source:
                blocks.append(MermaidBlock(file=file, index=len(blocks) + 1, line=start_line, source=source))
            in_mermaid = False
            fence = ""
            current = []
            continue

        current.append(line)

    if in_mermaid:
        source = "\n".join(current).strip()
        blocks.append(MermaidBlock(file=file, index=len(blocks) + 1, line=start_line, source=source))

    return blocks


def mermaid_command() -> list[str]:
    mmdc = shutil.which("mmdc")
    if mmdc:
        return [mmdc]

    pnpm = shutil.which("pnpm")
    if pnpm:
        return [pnpm, "dlx", "@mermaid-js/mermaid-cli"]

    raise RuntimeError("Neither 'mmdc' nor 'pnpm' is available on PATH.")


def discover_playwright_chromium() -> Path | None:
    node = shutil.which("node")
    if not node:
        return None

    script = "console.log(require('@playwright/test').chromium.executablePath())"
    candidates = [Path.cwd()]
    frontend = Path.cwd() / "frontend"
    if frontend.is_dir():
        candidates.append(frontend)

    for cwd in candidates:
        completed = subprocess.run(
            [node, "-e", script],
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
        )
        if completed.returncode != 0:
            continue

        executable = Path(completed.stdout.strip())
        if executable.is_file():
            return executable

    return None


def validate_block(block: MermaidBlock, command: list[str], temp_dir: Path, puppeteer_config: Path | None) -> tuple[bool, str]:
    input_path = temp_dir / f"{block.file.stem}-{block.index}.mmd"
    output_path = temp_dir / f"{block.file.stem}-{block.index}.svg"
    input_path.write_text(block.source + "\n", encoding="utf-8")

    cli_args = [*command, "-i", str(input_path), "-o", str(output_path), "--quiet"]
    if puppeteer_config:
        cli_args.extend(["--puppeteerConfigFile", str(puppeteer_config)])

    completed = subprocess.run(
        cli_args,
        capture_output=True,
        text=True,
        check=False,
    )

    if completed.returncode == 0:
        return True, ""

    output = "\n".join(part.strip() for part in [completed.stdout, completed.stderr] if part.strip())
    return False, output or f"Mermaid CLI exited with code {completed.returncode}."


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate Mermaid blocks in Markdown and MDX files.")
    parser.add_argument("paths", nargs="+", type=Path, help="Files or directories to scan.")
    parser.add_argument("--list", action="store_true", help="List Mermaid blocks without validating them.")
    parser.add_argument("--browser-executable", type=Path, help="Chrome or Chromium executable for Mermaid CLI.")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    files = iter_doc_files(args.paths)
    blocks = [block for file in files for block in extract_blocks(file)]

    if not blocks:
        print("No Mermaid blocks found.")
        return 0

    if args.list:
        for block in blocks:
            print(f"{block.file}:{block.line} block {block.index}")
        print(f"Found {len(blocks)} Mermaid block(s).")
        return 0

    try:
        command = mermaid_command()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        return 2

    with tempfile.TemporaryDirectory(prefix="mermaid-docs-") as directory:
        temp_dir = Path(directory)
        browser = args.browser_executable or discover_playwright_chromium()
        puppeteer_config = None

        if browser:
            puppeteer_config = temp_dir / "puppeteer-config.json"
            puppeteer_config.write_text(
                json.dumps({"executablePath": str(browser), "args": ["--no-sandbox"]}),
                encoding="utf-8",
            )

        failures: list[tuple[MermaidBlock, str]] = []
        for block in blocks:
            ok, message = validate_block(block, command, temp_dir, puppeteer_config)
            if ok:
                print(f"OK {block.file}:{block.line} block {block.index}")
            else:
                failures.append((block, message))
                print(f"FAIL {block.file}:{block.line} block {block.index}", file=sys.stderr)

        if failures:
            print("", file=sys.stderr)
            for block, message in failures:
                print(f"{block.file}:{block.line} block {block.index}", file=sys.stderr)
                print(message, file=sys.stderr)
                print("", file=sys.stderr)
            return 1

    print(f"Validated {len(blocks)} Mermaid block(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
