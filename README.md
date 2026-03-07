# 🚗 Israel Cars - Vehicle Information CLI Tool

![Hand Crafted](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/digitaloracle/israel_cars/master/hand-crafted-stats.json&cacheSeconds=300)

Query Israel Government's open data portal (`data.gov.il`) for vehicle registration, ownership history, and mileage data. Available as a Python CLI, Chrome extension, and Windows desktop app.

## Features

- **Vehicle Registration Details**: Query comprehensive vehicle information by license plate
- **Ownership History**: View historical ownership transfers with timeline
- **Mileage Data**: Get last reported mileage from vehicle modifications database
- **Visual Pollution Scale**: See pollution group with color-coded visual scale (1-15)
- **Hebrew Support**: Proper RTL text rendering for Hebrew fields
- **Rich Terminal UI**: Beautiful tables with color-coded dates and visual elements

## Quick Start

### Option 1: Windows Desktop App

Download `israeli_cars.exe` from the [Releases](https://github.com/digitaloracle/israel_cars/releases) page and run it — no installation required.

### Option 2: Chrome Extension

Load `chrome-extension/` as an unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked). Opens as a side panel on the toolbar.

### Option 3: Python CLI

```bash
# Clone and install dependencies
git clone https://github.com/digitaloracle/israel_cars.git
cd israel_cars
pip install -r requirements.txt

# Query vehicle by license plate
python main.py 11111111

# With ownership history
python main.py 11111111 --history  # or -H
```

## Example Output

```
                         Vehicle Registration Details                         
+----------------------------------------------------------------------------+
|                     Field | Value                                          |
|---------------------------+------------------------------------------------|
|     Last Reported Mileage | 50,000 km                                      |
|             License Plate | 11111111                                       |
|              Vehicle Make | Škoda Czechia                                  |
|         Commercial Name   | KAROQ                                          |
|              Model Name   | NU74ND                                         |
|                     Year  | 2020                                           |
|                    Color  | שחור מטלי (Black Metallic)                     |
|               Fuel Type   | בנזין (Petrol)                                 |
|            Chassis Number | TMB00000000000000X                              |
|              Engine Model | DPC                                            |
|               Trim Level  | STYLE                                          |
|             Safety Level  | 2                                              |
|          Pollution Group  | 🟩🟩🟩🟩◉🟨🟨🟨🟨🟧🟧🟧🟥🟥⬛ 14/15 (Poor)         |
|        Last Inspection    | 2025-03-25 (green)                             |
|   Registration Expiry     | 2026-03-28 (green)                             |
|       Road Entry Date     | 2020-3                                         |
|                Ownership  | פרטי (Private)                                 |
|       Registration Status | 123456                                         |
|              Front Tire   | 215/55 R17                                     |
|               Rear Tire   | 215/55 R17                                     |
|                Make Code  | 123                                            |
|              Model Type   | P                                              |
|               Model Code  | 456                                            |
|               Color Code  | 11                                             |
|                     Rank  | 0.123456789                                    |
|                Record ID  | 1000001                                        |
+----------------------------------------------------------------------------+
```

With ownership history (`--history` flag):

```
                      Ownership History Timeline                         
+-----------------------------------------------------------------------+
|    Period Start |    Period End | Owner Type                          |
|-----------------+---------------+-------------------------------------|
|       02/2020   |       02/2022 | פרטי (Private)                       |
|       02/2022   |       Present | ליסינג (Leasing)                     |
+-----------------------------------------------------------------------+
```

## Features in Detail

### 📋 Vehicle Information
- License plate, make, model, commercial name
- Year, color, fuel type
- Chassis number, engine model, trim level
- Safety level, pollution group with visual scale
- Inspection and registration dates with color coding:
  - 🟢 Green: Valid/future dates (>30 days)
  - 🟡 Yellow: Warning (<30 days until expiry)
  - 🔴 Red: Expired/errors

### 📊 Pollution Scale
The Israeli pollution scale (1-15) is visualized with color-coded emoji blocks:
- **1-5**: Excellent (🟩 Green)
- **6-9**: Good (🟨 Yellow-Green)
- **10-12**: Fair (🟧 Yellow)
- **13-14**: Moderate (🟥 Orange)
- **15**: Poor (⬛ Red)

The current vehicle's pollution group is highlighted with ◉

### 📜 Ownership History
Historical ownership transfers with dates in Israeli format (MM/YYYY). The current owner is highlighted in green with "Present" as the end date.

### 🛣️ Technical Details
- **API**: Israel Government's CKAN DataStore API (`data.gov.il`)
- **Data Sources**:
  - Main vehicle data: `053cea08-09bc-40ec-8f7a-156f0677aff3`
  - Ownership history: `bb2355dc-9ec7-4f06-9c3f-3344672171da`
  - Modifications/mileage: `56063a99-8a3e-4ff4-912e-5966c0279bad`
- **Hebrew Text**: Uses `python-bidi` for proper RTL rendering
- **Terminal UI**: `rich` library for beautiful, responsive tables

## Development

### Requirements
- Python 3.8+ (tested with 3.13.7)
- Dependencies in `requirements.txt`:
  - `httpx>=0.28.1` - HTTP client
  - `rich>=14.3.1` - Terminal UI
  - `python-bidi>=0.6.6` - Hebrew RTL support

### Development Setup

```bash
# Install development dependencies
pip install -r requirements.txt

# Optional: Install development tools
pip install black isort mypy pytest pytest-httpx

# Run type checking
mypy main.py --ignore-missing-imports

# Format code
black main.py
isort main.py

# Run tests
pytest tests/ -v
```

### Testing

The project includes a comprehensive test suite with 61 tests:

```bash
# Run all tests
pytest tests/ -v

# Run specific test class
pytest tests/test_main.py::TestDisplayHebrew -v

# Run tests with coverage report
pytest tests/ --cov=main --cov-report=term-missing
```

Test coverage includes:
- Unit tests for all helper functions
- HTTP mocking for API calls
- Date formatting and Hebrew text handling
- Table creation and UI components
- CLI argument parsing

## Limitations & Notes

- **Rate Limits**: Be mindful of `data.gov.il` API rate limits
- **Data Availability**: Some vehicles may not have mileage or history records
- **Windows Support**: Automatic UTF-8 encoding fix for Hebrew text on Windows
- **Network Dependencies**: Requires internet connection to query APIs

## Contributing

Contributions are welcome! Please check the existing issues or create a new one to discuss changes.

### Code Style
- Follow existing patterns in `main.py`
- Use type hints and Google-style docstrings
- See `AGENTS.md` for detailed development guidelines

## License

[MIT License](LICENSE)

## Acknowledgments

- Data provided by the Israel Government's Open Data Portal (`data.gov.il`)
- Built with `httpx`, `rich`, and `python-bidi` libraries
- Inspired by the need for easy access to Israeli vehicle information

## Related Projects

- [Israeli Vehicle API](https://data.gov.il/dataset/053cea08-09bc-40ec-8f7a-156f0677aff3) - Official data source
- [Rich](https://github.com/Textualize/rich) - Python library for rich text and beautiful formatting
- [python-bidi](https://github.com/MeirKriheli/python-bidi) - Bidirectional text support for Python