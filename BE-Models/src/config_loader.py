"""
Resolve paths in JSON configs relative to the project root.

Set DEBACKX_ROOT to the folder that contains `src/`, `data/`, `configs/`, and `scripts/`.
If unset, it defaults to the parent directory of this file (i.e. the repo root).
"""
from __future__ import annotations

import json
import os
from typing import Any, Dict, Tuple


def get_project_root() -> str:
    return os.path.normpath(
        os.environ.get(
            "DEBACKX_ROOT",
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
        )
    )


def _resolve_str(path: str, root: str) -> str:
    if not path or not str(path).strip():
        return path
    path = str(path).strip()
    if os.path.isabs(path):
        return path
    return os.path.normpath(os.path.join(root, path))


def resolve_config_paths(cfg: Dict[str, Any]) -> Dict[str, Any]:
    root = get_project_root()
    for section in ("data", "train"):
        if section not in cfg or not isinstance(cfg[section], dict):
            continue
        for k, v in cfg[section].items():
            if isinstance(v, str):
                cfg[section][k] = _resolve_str(v, root)
    return cfg


def load_config(config_path: str) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    with open(config_path, encoding="utf-8") as f:
        json_dict = json.load(f)
    resolve_config_paths(json_dict)
    return json_dict["data"], json_dict["train"], json_dict["model"]
