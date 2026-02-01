import argparse
import sys
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

# Fix Windows console encoding for Hebrew text
if sys.platform == "win32":
    os.system("chcp 65001 > nul")

import httpx
from bidi.algorithm import get_display
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

BASE_URL = "https://data.gov.il/api/3/action/datastore_search"
RESOURCE_ID = "053cea08-09bc-40ec-8f7a-156f0677aff3"

# Ownership History API
HISTORY_RESOURCE_ID = "bb2355dc-9ec7-4f06-9c3f-3344672171da"

# Modifications/Mileage API
MILEAGE_RESOURCE_ID = "56063a99-8a3e-4ff4-912e-5966c0279bad"

FIELD_NAMES = {
    "_id": "Record ID",
    "mispar_rechev": "License Plate",
    "tozeret_cd": "Make Code",
    "sug_degem": "Model Type",
    "tozeret_nm": "Vehicle Make",
    "degem_cd": "Model Code",
    "degem_nm": "Model Name",
    "ramat_gimur": "Trim Level",
    "ramat_eivzur_betihuty": "Safety Level",
    "kvutzat_zihum": "Pollution Group",
    "shnat_yitzur": "Year",
    "degem_manoa": "Engine Model",
    "mivchan_acharon_dt": "Last Inspection",
    "tokef_dt": "Registration Expiry",
    "baalut": "Ownership",
    "misgeret": "Chassis Number",
    "tzeva_cd": "Color Code",
    "tzeva_rechev": "Color",
    "zmig_kidmi": "Front Tire",
    "zmig_ahori": "Rear Tire",
    "sug_delek_nm": "Fuel Type",
    "horaat_rishum": "Registration Status",
    "moed_aliya_lakvish": "Road Entry Date",
    "kinuy_mishari": "Commercial Name",
    "rank": "Rank",
}


def display_hebrew(text: Optional[str]) -> str:
    """Display Hebrew text correctly with RTL support."""
    if text is None or text == "":
        return "N/A"
    return get_display(str(text) if text is not None else "")


def format_date(date_str: Optional[str]) -> tuple[str, str]:
    """Format date string and return (formatted_date, color)."""
    if not date_str:
        return ("N/A", "white")

    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S")
        formatted = date_obj.strftime("%Y-%m-%d")

        if date_obj < datetime.now():
            return (formatted, "red")
        else:
            days_until = (date_obj - datetime.now()).days
            if days_until < 30:
                return (formatted, "yellow")
            else:
                return (formatted, "green")
    except ValueError:
        return (date_str, "white")


def create_pollution_scale(pollution_group: int) -> str:
    """Create a visual pollution scale with colors using emoji blocks.

    The Israeli pollution scale has 15 grades (1-15).
    1-5: Excellent (Green)
    6-9: Good (Yellow-Green)
    10-12: Fair (Yellow)
    13-14: Moderate (Orange)
    15: Poor (Red)
    """
    try:
        group = int(pollution_group)
        if group < 1 or group > 15:
            return f"{group}"
    except (ValueError, TypeError):
        return "N/A"

    # Use colored emoji squares for better visibility
    GREEN = "🟩"
    YELLOW_GREEN = "🟨"
    YELLOW = "🟧"
    ORANGE = "🟥"
    RED = "⬛"
    SELECTED = "◉"

    # Create visual scale segments
    segments = []
    for i in range(1, 16):
        if i == group:
            # Highlight the current position with selection marker
            segments.append(f"[bold]{SELECTED}[/bold]")
        else:
            # Regular segments with color-coded blocks
            if i <= 5:
                segments.append(GREEN)
            elif i <= 9:
                segments.append(YELLOW_GREEN)
            elif i <= 12:
                segments.append(YELLOW)
            elif i <= 14:
                segments.append(ORANGE)
            else:
                segments.append(RED)

    scale_bar = "".join(segments)

    # Add category description
    if group <= 5:
        category = "[bold green]Excellent[/bold green]"
    elif group <= 9:
        category = "[bold yellow]Good[/bold yellow]"
    elif group <= 12:
        category = "[bold bright_yellow]Fair[/bold bright_yellow]"
    elif group <= 14:
        category = "[bold bright_red]Moderate[/bold bright_red]"
    else:
        category = "[bold red]Poor[/bold red]"

    return f"{scale_bar} {group}/15 ({category})"


def create_vehicle_table(record: dict, mileage: Optional[int] = None) -> Table:
    """Create a rich table with vehicle information."""
    table = Table(
        show_header=True,
        header_style="bold white on blue",
        border_style="blue",
        title="Vehicle Registration Details",
        title_style="bold cyan",
        padding=(0, 1),
        expand=False,
    )

    table.add_column("Field", style="cyan", justify="right", width=25)
    table.add_column("Value", style="white", justify="left")

    field_order = [
        "mispar_rechev",
        "tozeret_nm",
        "kinuy_mishari",
        "degem_nm",
        "shnat_yitzur",
        "tzeva_rechev",
        "sug_delek_nm",
        "misgeret",
        "degem_manoa",
        "ramat_gimur",
        "ramat_eivzur_betihuty",
        "kvutzat_zihum",
        "mivchan_acharon_dt",
        "tokef_dt",
        "moed_aliya_lakvish",
        "baalut",
        "horaat_rishum",
        "zmig_kidmi",
        "zmig_ahori",
        "tozeret_cd",
        "sug_degem",
        "degem_cd",
        "tzeva_cd",
        "rank",
        "_id",
    ]

    # Add mileage row after year if available
    if mileage is not None:
        field_name = "Last Reported Mileage"
        display_value = f"{mileage:,} km"
        table.add_row(field_name, Text(display_value))
    else:
        field_name = "Last Reported Mileage"
        display_value = "N/A"
        table.add_row(field_name, Text.from_markup("[dim]N/A[/dim]"))

    for field_key in field_order:
        if field_key in record:
            field_name = FIELD_NAMES.get(field_key, field_key)
            value = record[field_key]

            if value is None or value == "":
                display_value = "N/A"
                style = "dim"
            elif field_key == "kvutzat_zihum":
                # Special handling for pollution group with visual scale
                display_value = create_pollution_scale(value)
                style = "white"
            elif "dt" in field_key or field_key in [
                "mivchan_acharon_dt",
                "tokef_dt",
                "moed_aliya_lakvish",
            ]:
                display_value, color = format_date(str(value))
                style = color
            else:
                display_value = display_hebrew(str(value))
                style = "white"

            table.add_row(field_name, Text.from_markup(display_value))

    return table


def fetch_mileage_data(license_plate: str) -> Optional[int]:
    """Fetch mileage data from modifications endpoint.

    Args:
        license_plate: Vehicle license plate number

    Returns:
        Mileage in kilometers if found, None otherwise
    """
    params = {
        "resource_id": MILEAGE_RESOURCE_ID,
        "q": license_plate,
        "limit": 1,
    }

    try:
        response = httpx.get(BASE_URL, params=params, timeout=20.0)
        response.raise_for_status()

        data = response.json()

        if not data.get("success"):
            return None

        records = data.get("result", {}).get("records", [])
        if not records:
            return None

        # Extract kilometer_test_aharon field
        record = records[0]
        mileage = record.get("kilometer_test_aharon")

        if mileage is None or mileage == "":
            return None

        # Convert to integer if possible
        try:
            return int(float(mileage))
        except (ValueError, TypeError):
            return None

    except httpx.RequestError:
        return None
    except httpx.HTTPStatusError:
        return None
    except Exception:
        return None


def query_vehicle(
    license_plate: str, console: Console, show_history: bool = False
) -> None:
    """Query the API for vehicle information.

    Args:
        license_plate: Vehicle license plate number
        console: Rich console instance for output
        show_history: Whether to fetch and display ownership history
    """
    params = {
        "resource_id": RESOURCE_ID,
        "q": license_plate,
        "distinct": "true",
        "plain": "true",
        "limit": 1,
        "include_total": "true",
        "records_format": "objects",
    }

    try:
        with console.status("[bold blue]Querying vehicle database...", spinner="dots"):
            response = httpx.get(BASE_URL, params=params, timeout=30.0)
            response.raise_for_status()

        data = response.json()

        if not data.get("success"):
            console.print(
                Panel(
                    "[red]API request failed. The server returned an error.[/red]",
                    title="Error",
                    border_style="red",
                )
            )
            return

        records = data.get("result", {}).get("records", [])
        total = data.get("result", {}).get("total", 0)

        if not records:
            console.print(
                Panel(
                    f"[yellow]No vehicle found with license plate: {license_plate}[/yellow]",
                    title="Not Found",
                    border_style="yellow",
                )
            )
            return

        if total > 1:
            console.print(
                f"[dim]Note: Found {total} matching records, showing the first one.[/dim]\n"
            )

        # Fetch mileage data
        with console.status("[bold blue]Fetching mileage data...", spinner="dots"):
            mileage = fetch_mileage_data(license_plate)

        table = create_vehicle_table(records[0], mileage)
        console.print(table)

        # Fetch and display ownership history if requested
        if show_history:
            try:
                with console.status(
                    "[bold blue]Fetching ownership history...", spinner="dots"
                ):
                    ownership_records = fetch_ownership_history(license_plate)

                if ownership_records:
                    console.print()  # Add spacing
                    ownership_table = create_ownership_table(ownership_records)
                    console.print(ownership_table)
                else:
                    console.print(
                        Panel(
                            "[yellow]No ownership history available for this vehicle.[/yellow]",
                            title="Ownership History",
                            border_style="yellow",
                        )
                    )
            except Exception as e:
                console.print(
                    Panel(
                        f"[yellow]Warning: Could not fetch ownership history: {e}[/yellow]",
                        title="Partial Data",
                        border_style="yellow",
                    )
                )

    except httpx.RequestError as e:
        console.print(
            Panel(
                f"[red]Network error: {e}[/red]",
                title="Connection Error",
                border_style="red",
            )
        )
    except httpx.HTTPStatusError as e:
        console.print(
            Panel(
                f"[red]HTTP error: {e.response.status_code} - {e.response.reason_phrase}[/red]",
                title="HTTP Error",
                border_style="red",
            )
        )
    except Exception as e:
        console.print(
            Panel(
                f"[red]Unexpected error: {e}[/red]", title="Error", border_style="red"
            )
        )


def fetch_ownership_history(license_plate: str) -> List[Dict[str, Any]]:
    """Fetch vehicle ownership history from CKAN DataStore API.

    Args:
        license_plate: Vehicle license plate number

    Returns:
        List of ownership records with dates and owner types
    """
    params = {"resource_id": HISTORY_RESOURCE_ID, "q": license_plate, "limit": 100}

    response = httpx.get(BASE_URL, params=params, timeout=30.0)
    response.raise_for_status()

    data = response.json()

    if not data.get("success"):
        raise Exception(
            f"API error: {data.get('error', {}).get('message', 'Unknown error')}"
        )

    records = data.get("result", {}).get("records", [])

    # Sort by date (baalut_dt in YYYYMM format)
    records.sort(key=lambda x: x.get("baalut_dt", 0))

    ownership_records = []
    for i, record in enumerate(records):
        # baalut_dt is in YYYYMM format
        date_val = record.get("baalut_dt", 0)

        # Calculate end date (next record's date or None for current)
        end_date = None
        if i < len(records) - 1:
            end_date = records[i + 1].get("baalut_dt")

        ownership_records.append(
            {
                "start_date": date_val,
                "end_date": end_date,
                "owner_type": record.get("baalut", ""),
            }
        )

    return ownership_records


def format_israeli_date(date_val) -> str:
    """Format date value to Israeli format (DD/MM/YYYY).

    Args:
        date_val: Date value in various formats (string or int YYYYMM)

    Returns:
        Formatted date string in DD/MM/YYYY format
    """
    if date_val is None or date_val == "" or date_val == 0:
        return "Present"

    # Handle YYYYMM format (int like 202003)
    if isinstance(date_val, int) or (isinstance(date_val, str) and date_val.isdigit()):
        date_str = str(date_val)
        if len(date_str) == 6:
            year = date_str[:4]
            month = date_str[4:6]
            return f"{month}/{year}"

    # Try different date formats for string dates
    if isinstance(date_val, str):
        formats = [
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d",
            "%d/%m/%Y",
        ]

        for fmt in formats:
            try:
                date_obj = datetime.strptime(date_val, fmt)
                return date_obj.strftime("%d/%m/%Y")
            except ValueError:
                continue

    # If no format matches, return as string
    return str(date_val)


def create_ownership_table(ownership_records: List[Dict[str, Any]]) -> Table:
    """Create a rich table displaying ownership history timeline.

    Args:
        ownership_records: List of ownership records

    Returns:
        Rich Table with ownership timeline
    """
    table = Table(
        show_header=True,
        header_style="bold white on blue",
        border_style="blue",
        title="Ownership History Timeline",
        title_style="bold cyan",
        padding=(0, 1),
        expand=False,
    )

    table.add_column("Period Start", style="cyan", justify="center", width=15)
    table.add_column("Period End", style="cyan", justify="center", width=15)
    table.add_column("Owner Type", style="white", justify="left")

    if not ownership_records:
        table.add_row(
            "-", "-", Text("[dim]No ownership history available[/dim]", style="dim")
        )
        return table

    for i, record in enumerate(ownership_records):
        start_date = format_israeli_date(record.get("start_date", ""))
        end_date = format_israeli_date(record.get("end_date", ""))
        owner_type = display_hebrew(record.get("owner_type", "Unknown"))

        # Highlight current owner (last record with no end date)
        is_current = (i == len(ownership_records) - 1) and (not record.get("end_date"))

        if is_current:
            style = "bold green"
            end_date = "[bold green]Present[/bold green]"
        else:
            style = "white"

        table.add_row(
            Text(start_date, style=style),
            Text.from_markup(end_date) if is_current else Text(end_date, style=style),
            Text(owner_type, style=style),
        )

    return table


def main():
    parser = argparse.ArgumentParser(
        description="Query Israeli vehicle registration information by license plate",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py 11111111
  python main.py 22222222
        """,
    )
    parser.add_argument(
        "license_plate", help="Vehicle license plate number to search for"
    )
    parser.add_argument(
        "--history",
        "-H",
        action="store_true",
        help="Display vehicle ownership history timeline",
    )

    args = parser.parse_args()

    console = Console()
    query_vehicle(args.license_plate, console, show_history=args.history)


if __name__ == "__main__":
    main()
