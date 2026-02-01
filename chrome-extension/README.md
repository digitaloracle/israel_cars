# Israel Vehicle Lookup - Chrome Extension

A Chrome extension that queries Israeli vehicle registration, mileage, and ownership history from data.gov.il.

## Features

- **Vehicle Registration Details**: License plate, make, model, year, color, fuel type, and more
- **Last Reported Mileage**: From vehicle modification/test records
- **Ownership History Timeline**: Historical ownership transfers with dates
- **Recent Searches**: Remembers your last 5 searches
- **RTL Support**: Hebrew text displays correctly
- **Progressive Loading**: Shows vehicle data immediately, then loads mileage and history

## Installation

### From Source (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder
5. The extension icon will appear in your toolbar

### Usage

1. Click the extension icon in Chrome toolbar
2. The side panel will open on the right side of your browser
3. Enter a license plate number (e.g., `11111111`)
4. Click **Search** or press Enter
5. View vehicle details, mileage, and ownership history

## Project Structure

```
chrome-extension/
├── manifest.json           # Extension configuration (MV3)
├── sidepanel/
│   ├── sidepanel.html      # Main UI
│   ├── sidepanel.css       # Blue/cyan theme styling
│   └── sidepanel.js        # API calls & rendering
├── background/
│   └── service-worker.js   # Side panel activation
├── icons/
│   ├── icon16.png          # Toolbar icon
│   ├── icon48.png          # Extension page icon
│   └── icon128.png         # Chrome Web Store icon
└── README.md               # This file
```

## API Endpoints

Uses Israel Government's open data portal (data.gov.il):

| Endpoint | Resource ID | Description |
|----------|-------------|-------------|
| Vehicle Data | `053cea08-09bc-40ec-8f7a-156f0677aff3` | Registration details |
| Ownership History | `bb2355dc-9ec7-4f06-9c3f-3344672171da` | Historical owners |
| Mileage Data | `56063a99-8a3e-4ff4-912e-5966c0279bad` | Last reported mileage |

## Permissions

- `sidePanel`: Display results in Chrome's side panel
- `storage`: Remember recent searches
- `host_permissions`: Access data.gov.il API

## Development

### Regenerate Icons

```bash
python generate_icons.py
```

### Testing

1. Load the extension in developer mode
2. Open any webpage
3. Click the extension icon
4. Enter test license plate: `11111111`

## Color Theme

Matches the Python CLI tool's Rich terminal output:

- **Header/Tables**: Blue (#0066cc)
- **Field Labels**: Cyan (#00d4ff)
- **Values**: White
- **Valid Dates**: Green (#00cc66)
- **Warnings**: Yellow (#ffcc00)
- **Errors/Expired**: Red (#ff4444)

## License

MIT License - See parent project for details.
