# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Two independent components querying Israel's `data.gov.il` CKAN API for vehicle registration, ownership history, and mileage data:

1. **Python CLI** (`main.py`) — single-file tool with rich terminal output and Hebrew text support
2. **Chrome Extension** (`chrome-extension/`) — Manifest V3 side-panel extension replicating the same lookups in the browser

## Commands

```bash
# Run the tool
python main.py <license_plate>
python main.py <license_plate> --history   # or -H

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest tests/ -v
pytest tests/test_main.py::TestClassName::test_method -xvs   # single test

# Type checking / formatting (install first if needed)
mypy main.py --ignore-missing-imports
black main.py && isort main.py
```

## Architecture

### Python CLI (`main.py`)

Single flat file — no package structure, keep it that way.

**Data flow:** CLI args → `fetch_*` functions (httpx GET to CKAN API) → display functions (rich tables/panels) → stdout.

**Three CKAN API resource IDs** (all via `BASE_URL = "https://data.gov.il/api/3/action/datastore_search"`):
- `RESOURCE_ID` — main vehicle registration data
- `HISTORY_RESOURCE_ID` — ownership history (`baalut_dt` in YYYYMM int format)
- `MILEAGE_RESOURCE_ID` — modifications/mileage (`kilometer_test_aharon` field)

**Hebrew text:** Always wrap with `get_display(str(text))` from `python-bidi` for correct RTL rendering. Windows UTF-8 console is fixed at startup via `chcp 65001`.

**Tests** are in `tests/test_main.py`. HTTP calls are mocked with the `httpx_mock` fixture from `pytest-httpx`; `os.system` is patched at module import time via `unittest.mock`. JSON files in the root are sample API responses used as test reference data.

### Chrome Extension (`chrome-extension/`)

Manifest V3 side-panel extension. Entry points:
- `sidepanel/sidepanel.js` — all UI logic; duplicates the same `FIELD_NAMES`, field ordering, pollution scale, and date formatting logic from `main.py` (intentionally self-contained)
- `background/service-worker.js` — opens the side panel on toolbar click

The extension calls the same three CKAN resource IDs directly from the browser (no backend proxy). `host_permissions` in `manifest.json` covers `https://data.gov.il/*`.

### CI (`human-crafted-badge.yml`)

On push to master, runs `calculate-stats.js` (Node 20) which scans git log for AI tool signatures, then commits updated `hand-crafted-stats.json` (Shields.io endpoint format) back to the repo.

## Code Conventions

- Constants: `UPPER_CASE` at module level after imports
- Functions: `snake_case`, Google-style docstrings with Args/Returns
- Private helpers: leading underscore (e.g., `_format_date()`)
- Error handling: catch `httpx.RequestError` specifically; show partial data with warnings rather than failing entirely
- Date display: DD/MM/YYYY for Israeli users; color-code dates green (>30 days), yellow (<30 days), red (expired)
- Commit format: `<type>: <description>` (feat, fix, docs, style, refactor, test, chore)
