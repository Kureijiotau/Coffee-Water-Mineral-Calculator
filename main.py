"""Send prompts from a text file to a Google Gemini model."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from google import genai


# Gemini reports gemini-2.5-pro as unavailable for this API key, so use the
# currently available Pro model by default. Set GEMINI_MODEL to override it.
DEFAULT_MODEL = "gemini-3.1-pro-preview"


def read_prompts(path: Path) -> list[str]:
    """Read non-empty, non-comment prompt lines from a UTF-8 text file."""
    try:
        contents = path.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise FileNotFoundError(f"Prompt file not found: {path}") from error

    return [
        line.strip()
        for line in contents.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]


def read_single_prompt(path: Path) -> list[str]:
    """Read an entire UTF-8 file as one prompt."""
    try:
        prompt = path.read_text(encoding="utf-8").strip()
    except FileNotFoundError as error:
        raise FileNotFoundError(f"Prompt file not found: {path}") from error
    if not prompt:
        return []
    return [prompt]


def send_prompts(prompts: list[str], api_key: str, model: str) -> int:
    """Send prompts one at a time and print each response."""
    client = genai.Client(api_key=api_key)
    failures = 0

    for index, prompt in enumerate(prompts, start=1):
        print(f"--- Prompt {index} ---")
        print(prompt)
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
            )
        except Exception as error:
            failures += 1
            print(f"ERROR: Gemini request failed: {error}", file=sys.stderr)
            print()
            continue

        print("--- Response ---")
        print(response.text or "[Gemini returned an empty response]")
        print()

    return failures


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Send one prompt per line to Gemini 2.5 Pro."
    )
    parser.add_argument(
        "prompt_file",
        nargs="?",
        default="prompts.txt",
        type=Path,
        help="UTF-8 input file; defaults to prompts.txt",
    )
    parser.add_argument(
        "--single",
        action="store_true",
        help="Send the entire input file as one multi-line prompt",
    )
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print(
            "Error: GEMINI_API_KEY is not set in the environment.",
            file=sys.stderr,
        )
        return 2

    model = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)
    try:
        prompts = (
            read_single_prompt(args.prompt_file)
            if args.single
            else read_prompts(args.prompt_file)
        )
    except (OSError, UnicodeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    if not prompts:
        print(f"Error: no prompts found in {args.prompt_file}.", file=sys.stderr)
        return 2

    failures = send_prompts(prompts, api_key, model)
    if failures:
        print(
            f"{failures} of {len(prompts)} prompt(s) failed.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
