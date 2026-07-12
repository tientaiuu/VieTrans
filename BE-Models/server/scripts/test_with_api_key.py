#!/usr/bin/env python3
"""Smoke test: image upload is accepted with a valid API key."""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "https://masterdzzzz-vietrans-backend.hf.space"
DEFAULT_ENDPOINT = "/api/upload"
DEFAULT_IMAGE = "input.jpg"


def build_url(base_url: str, endpoint: str) -> str:
    base = base_url.rstrip("/") + "/"
    path = endpoint.lstrip("/")
    return urljoin(base, path)


def build_multipart_body(image_path: Path) -> tuple[bytes, str]:
    boundary = "----VieTransApiKeyTestBoundary"
    mime_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
    image_bytes = image_path.read_bytes()
    parts = [
        f"--{boundary}\r\n".encode("utf-8"),
        (
            'Content-Disposition: form-data; name="file"; '
            f'filename="{image_path.name}"\r\n'
        ).encode("utf-8"),
        f"Content-Type: {mime_type}\r\n\r\n".encode("utf-8"),
        image_bytes,
        f"\r\n--{boundary}--\r\n".encode("utf-8"),
    ]
    return b"".join(parts), boundary


def read_response(url: str, image_path: Path, api_key: str, timeout: float) -> tuple[int, str]:
    body, boundary = build_multipart_body(image_path)
    request = Request(
        url,
        data=body,
        method="POST",
        headers={
            "Accept": "application/json",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
            "X-API-Key": api_key,
        },
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return exc.code, body


def pretty_body(body: str) -> str:
    if not body:
        return "<empty>"
    try:
        return json.dumps(json.loads(body), indent=2, ensure_ascii=False)
    except json.JSONDecodeError:
        return body


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify that image upload accepts input.png with a valid API key."
    )
    parser.add_argument(
        "--base-url",
        default=os.getenv("VIETRANS_API_BASE_URL", os.getenv("API_BASE_URL", DEFAULT_BASE_URL)),
        help=f"Backend base URL. Default: {DEFAULT_BASE_URL}",
    )
    parser.add_argument(
        "--endpoint",
        default=os.getenv("API_TEST_ENDPOINT", DEFAULT_ENDPOINT),
        help=f"Upload endpoint to call. Default: {DEFAULT_ENDPOINT}",
    )
    parser.add_argument(
        "--image",
        default=os.getenv("API_TEST_IMAGE", DEFAULT_IMAGE),
        help=f"Image file to upload. Default: {DEFAULT_IMAGE}",
    )
    parser.add_argument(
        "--api-key",
        default=os.getenv("VT_API_KEY"),
        help="VieTrans API key. Can also be provided with the VT_API_KEY env var.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=float(os.getenv("API_TEST_TIMEOUT", "10")),
        help="Request timeout in seconds. Default: 10",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    api_key = (args.api_key or input("Paste VieTrans API key: ")).strip()
    if not api_key:
        print("ERROR: API key is required for this test.", file=sys.stderr)
        return 2

    url = build_url(args.base_url, args.endpoint)
    image_path = Path(args.image)
    if not image_path.is_file():
        print(f"ERROR: Image file not found: {image_path}", file=sys.stderr)
        return 2

    print(f"Testing with API key: POST {url}")
    print(f"Image: {image_path}")

    try:
        status, body = read_response(url, image_path, api_key, args.timeout)
    except URLError as exc:
        print(f"ERROR: Could not connect to API server: {exc}", file=sys.stderr)
        return 2
    except TimeoutError as exc:
        print(f"ERROR: Request timed out: {exc}", file=sys.stderr)
        return 2

    print(f"Status: {status}")
    print("Body:")
    print(pretty_body(body))

    if status == 202:
        print("PASS: Upload with API key was accepted.")
        return 0

    print(f"FAIL: Expected HTTP 202, got HTTP {status}.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
