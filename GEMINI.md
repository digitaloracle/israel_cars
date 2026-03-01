# AGENTS.md - Development Guidelines for israel_cars

## Project Overview

A Python CLI tool that queries Israel Government's open data portal (data.gov.il) for vehicle registration, ownership history, and mileage data. Single-file application with rich terminal output.

## Environment

- **Python:** 3.13.7 (works with 3.8+)
- **Platform:** Windows/Linux/macOS with UTF-8 support
- **Key libraries:** httpx (async HTTP), rich (terminal UI), python-bidi (Hebrew RTL)

## Dependencies

Core dependencies (see requirements.txt):
- `httpx>=0.28.1` - HTTP client for API requests
- `rich>=14.3.1` - Terminal UI, tables, and panels
- `python-bidi>=0.6.6` - Hebrew RTL text handling

Recommended development tools (install manually):
```bash
pip install black isort mypy pytest pytest-httpx
```

## Commands

### Running the Application
```bash
# Basic query
python main.py <license_plate>

# With ownership history
python main.py <license_plate> --history  # or -H

# Examples
python main.py 11111111
python main.py 11111111 --history
```

### Development Commands
```bash
# Run CLI (development)
python main.py 11111111

# Type checking (install mypy first)
mypy main.py --ignore-missing-imports

# Formatting (install black/isort first)
black main.py
isort main.py

# Run exploratory API tests
python test_search.py 2> test_output.txt
```

**Note:** No formal test suite exists. When adding tests, create `tests/` directory with pytest.

## Code Style Guidelines

### Imports
Order: stdlib → third-party → local. Group by type with blank lines.

```python
import argparse
import sys
from datetime import datetime
from typing import Optional, List, Dict, Any

import httpx
from bidi.algorithm import get_display
from rich.console import Console
from rich.table import Table
```

### Type Hints
- Use for all function parameters and return values
- Use `Optional[T]` for nullable parameters
- Import from `typing` module
- Known type issue: `get_display()` returns `StrOrBytes`, handle with explicit str()

```python
def display_hebrew(text: Optional[str]) -> str:
    """Display Hebrew text correctly with RTL support."""
    if text is None or text == "":
        return "N/A"
    return str(get_display(str(text) if text is not None else ""))
```

### Naming Conventions
- **Constants:** UPPER_CASE (e.g., `BASE_URL`, `RESOURCE_ID`)
- **Functions:** snake_case (e.g., `fetch_vehicle_data()`)
- **Variables:** snake_case (e.g., `license_plate`)
- **Private functions:** Leading underscore (e.g., `_format_date()`)

### Function Structure
Google-style docstrings with Args/Returns. Keep functions focused.

```python
def fetch_mileage_data(license_plate: str) -> Optional[int]:
    """Fetch mileage data from modifications endpoint.
    
    Args:
        license_plate: Vehicle license plate number
        
    Returns:
        Mileage in kilometers if found, None otherwise
    """
```

### Error Handling
Use specific exception types (not bare `except`). Wrap API calls in try/except.

```python
try:
    response = httpx.get(url, timeout=20.0)
    response.raise_for_status()
except httpx.RequestError as e:
    console.print(Panel(f"[red]Network error: {e}[/red]", title="Error"))
    return None
except Exception as e:
    console.print(Panel(f"[yellow]Unexpected error: {e}[/yellow]", title="Warning"))
    return None
```

### Constants
Define at module level after imports:
- `BASE_URL = "https://data.gov.il/api/3/action/datastore_search"`
- `RESOURCE_ID = "053cea08-09bc-40ec-8f7a-156f0677aff3"` (main vehicle data)
- `HISTORY_RESOURCE_ID = "bb2355dc-9ec7-4f06-9c3f-3344672171da"` (ownership history)
- `MILEAGE_RESOURCE_ID = "56063a99-8a3e-4ff4-912e-5966c0279bad"` (modifications/mileage)
- `FIELD_NAMES` - Field name mappings (Hebrew→English)

### String Formatting
- Use f-strings for interpolation
- Use double quotes for strings
- For Hebrew text: `get_display(str(text))` for RTL handling
- Windows encoding: `os.system("chcp 65001 > nul")` for UTF-8 console

### API Conventions
- CKAN API endpoint: `https://data.gov.il/api/3/action/datastore_search`
- Pass `resource_id` as query parameter
- Timeout: 20-30 seconds for reliability
- Query format: `{"resource_id": ID, "q": license_plate, "limit": 1}`
- Always handle UTF-8 encoding for Hebrew text

### UI/Display Conventions
- Rich library for all terminal output
- Tables: Blue header (`"bold white on blue"`), cyan fields, white values
- Panels for warnings/errors with appropriate border colors
- Color coding:
  - ✅ Green: Valid/future dates (>30 days)
  - ⚠️ Yellow: Warning (<30 days until expiry)
  - ❌ Red: Expired/errors
  - 💬 Cyan: Field labels
  - 📊 Blue: Table borders

### Date Handling
- Display format: DD/MM/YYYY for Israeli users
- Internal formats: YYYYMM (int) or YYYY-MM-DD (string)
- Handle None/empty: return "N/A" or "Present"
- Date comparison: use `datetime.now()` for relative dates

## Testing

**Current state:** No formal test suite. Exploratory tests in `test_search.py`.

**When adding tests:**
- Use pytest in `tests/` directory
- Name files: `test_<module>.py` (e.g., `test_main.py`)
- Name functions: `test_<function_name>_<scenario>()`
- Mock HTTP calls with `httpx.MockTransport` or `pytest-httpx`
- Example single test run: `pytest tests/test_main.py::test_fetch_vehicle_data_success -xvs`

**Test data files:** JSON files in root directory contain sample API responses for reference.

## API Endpoints Reference

1. **Main Vehicle Data**: `053cea08-09bc-40ec-8f7a-156f0677aff3`
   - 25+ fields including registration, technical specs, ownership
   - Returns current vehicle state

2. **Ownership History**: `bb2355dc-9ec7-4f06-9c3f-3344672171da`
   - Historical ownership transfers with dates
   - `baalut_dt` field in YYYYMM format
   - `baalut` field for owner type (פרטי, etc.)

3. **Modifications/Mileage**: `56063a99-8a3e-4ff4-912e-5966c0279bad`
   - Vehicle modifications and test data
   - `kilometer_test_aharon` field for last reported mileage
   - Returns mileage in kilometers as float/int

## Git Conventions

- Format: `<type>: <description>`
- Types: feat, fix, docs, style, refactor, test, chore
- Examples:
  - `feat: add mileage data display`
  - `fix: resolve type errors in display_hebrew`
  - `docs: update API endpoints in AGENTS.md`

## Key Files

- `main.py` (471 lines) - Main CLI application
- `requirements.txt` - Python dependencies (14 packages)
- `AGENTS.md` - This development guide
- `test_search.py` - Exploratory API testing script
- `*.json` - Sample API responses for reference

**Note:** No pyproject.toml, setup.py, or complex configuration. Keep it simple.

## Important Notes

1. **Hebrew Text:** Always use `get_display()` from python-bidi for RTL rendering
2. **Windows Encoding:** `os.system("chcp 65001 > nul")` fixes UTF-8 console
3. **API Limits:** Be mindful of data.gov.il rate limits (use timeouts, cache)
4. **Resource IDs:** Verify via API before using new data sources
5. **Mileage Data:** Some vehicles may not have mileage records (show "N/A")
6. **Type Safety:** Current type errors in `display_hebrew()` need str() wrapper
7. **Error Resilience:** Show partial data with warnings if APIs fail partially
8. **Keep it simple:** Single-file script for ease of deployment and maintenance
