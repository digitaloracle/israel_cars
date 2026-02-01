import pytest
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, Any
from unittest.mock import MagicMock, patch

# Mock the Windows console encoding call before importing main
os.system = MagicMock()

# Import the module under test
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import main


# Fixtures for test data
@pytest.fixture
def sample_vehicle_record():
    """Sample vehicle record from API."""
    return {
        "_id": 1000001,
        "mispar_rechev": 11111111,
        "tozeret_cd": 676,
        "sug_degem": "P",
        "tozeret_nm": "סקודה צ'כיה",
        "degem_cd": 993,
        "degem_nm": "NU74ND",
        "ramat_gimur": "STYLE",
        "ramat_eivzur_betihuty": 2,
        "kvutzat_zihum": 14,
        "shnat_yitzur": 2020,
        "degem_manoa": "DPC",
        "mivchan_acharon_dt": "2025-03-25",
        "tokef_dt": "2026-03-28",
        "baalut": "פרטי",
        "misgeret": "TMB00000000000000X",
        "tzeva_cd": 11,
        "tzeva_rechev": "שחור מטלי",
        "zmig_kidmi": "215/55 R17",
        "zmig_ahori": "215/55 R17",
        "sug_delek_nm": "בנזין",
        "horaat_rishum": 123456,
        "moed_aliya_lakvish": "2020-3",
        "kinuy_mishari": "KAROQ",
        "rank": 0.123456789,
    }


@pytest.fixture
def sample_mileage_record():
    """Sample mileage record from API."""
    return {
        "_id": 2000001,
        "mispar_rechev": 11111111,
        "mispar_manoa": "DPC A99999",
        "kilometer_test_aharon": 50000,
        "shinui_mivne_ind": 0,
        "gapam_ind": 0,
        "shnui_zeva_ind": 0,
        "shinui_zmig_ind": 0,
        "rishum_rishon_dt": "2020-03-29 00:00:00",
        "mkoriut_nm": "",
        "rank": 0.123456789,
    }


@pytest.fixture
def sample_ownership_records():
    """Sample ownership history records from API."""
    return [
        {"_id": 1, "mispar_rechev": 11111111, "baalut_dt": 202002, "baalut": "פרטי"},
        {"_id": 2, "mispar_rechev": 11111111, "baalut_dt": 202202, "baalut": "ליסינג"},
    ]


@pytest.fixture
def mock_console():
    """Mock Rich console for testing."""
    console = MagicMock()
    console.status = MagicMock()
    console.status.return_value.__enter__ = MagicMock(return_value=MagicMock())
    console.status.return_value.__exit__ = MagicMock(return_value=False)
    return console


# Tests for display_hebrew()
class TestDisplayHebrew:
    def test_display_hebrew_with_valid_text(self):
        result = main.display_hebrew("Hello")
        assert result is not None
        assert isinstance(result, str)

    def test_display_hebrew_with_hebrew_text(self):
        result = main.display_hebrew("סקודה")
        assert result is not None
        assert isinstance(result, str)

    def test_display_hebrew_with_none(self):
        result = main.display_hebrew(None)
        assert result == "N/A"

    def test_display_hebrew_with_empty_string(self):
        result = main.display_hebrew("")
        assert result == "N/A"

    def test_display_hebrew_with_whitespace(self):
        result = main.display_hebrew("   ")
        assert result is not None


# Tests for format_date()
class TestFormatDate:
    def test_format_date_with_valid_future_date(self):
        future_date = "2030-01-01T00:00:00"
        formatted, color = main.format_date(future_date)
        assert formatted == "2030-01-01"
        assert color == "green"

    def test_format_date_with_valid_past_date(self):
        past_date = "2020-01-01T00:00:00"
        formatted, color = main.format_date(past_date)
        assert formatted == "2020-01-01"
        assert color == "red"

    def test_format_date_with_near_future_date(self):
        # A date less than 30 days in the future
        near_future = datetime.now() + timedelta(days=5)
        near_future_str = near_future.strftime("%Y-%m-%dT%H:%M:%S")
        formatted, color = main.format_date(near_future_str)
        assert color == "yellow"

    def test_format_date_with_none(self):
        formatted, color = main.format_date(None)
        assert formatted == "N/A"
        assert color == "white"

    def test_format_date_with_empty_string(self):
        formatted, color = main.format_date("")
        assert formatted == "N/A"
        assert color == "white"

    def test_format_date_with_invalid_format(self):
        invalid_date = "not-a-date"
        formatted, color = main.format_date(invalid_date)
        assert formatted == "not-a-date"
        assert color == "white"


# Tests for create_pollution_scale()
class TestCreatePollutionScale:
    def test_pollution_scale_excellent_group_1(self):
        result = main.create_pollution_scale(1)
        assert "1" in result
        assert "15" in result

    def test_pollution_scale_excellent_group_5(self):
        result = main.create_pollution_scale(5)
        assert "5" in result
        assert "15" in result

    def test_pollution_scale_good_group_7(self):
        result = main.create_pollution_scale(7)
        assert "7" in result

    def test_pollution_scale_fair_group_10(self):
        result = main.create_pollution_scale(10)
        assert "10" in result

    def test_pollution_scale_moderate_group_13(self):
        result = main.create_pollution_scale(13)
        assert "13" in result

    def test_pollution_scale_poor_group_15(self):
        result = main.create_pollution_scale(15)
        assert "15" in result

    def test_pollution_scale_invalid_low(self):
        result = main.create_pollution_scale(0)
        assert result == "0"

    def test_pollution_scale_invalid_high(self):
        result = main.create_pollution_scale(16)
        assert result == "16"

    def test_pollution_scale_none(self):
        result = main.create_pollution_scale(None)
        assert result == "N/A"

    def test_pollution_scale_string_number(self):
        result = main.create_pollution_scale("8")
        assert "8" in result


# Tests for fetch_mileage_data() using pytest-httpx
class TestFetchMileageData:
    def test_fetch_mileage_data_success(self, httpx_mock, sample_mileage_record):
        # Use any URL pattern matching - pytest-httpx will match by base URL
        httpx_mock.add_response(
            json={
                "success": True,
                "result": {"records": [sample_mileage_record]},
            },
        )

        result = main.fetch_mileage_data("11111111")
        assert result == 50000

    def test_fetch_mileage_data_no_records(self, httpx_mock):
        httpx_mock.add_response(
            json={"success": True, "result": {"records": []}},
        )

        result = main.fetch_mileage_data("22222222")
        assert result is None

    def test_fetch_mileage_data_api_failure(self, httpx_mock):
        httpx_mock.add_response(
            json={"success": False, "error": {"message": "API error"}},
        )

        result = main.fetch_mileage_data("22222222")
        assert result is None

    def test_fetch_mileage_data_no_mileage_field(self, httpx_mock):
        httpx_mock.add_response(
            json={
                "success": True,
                "result": {"records": [{"mispar_rechev": 22222222}]},
            },
        )

        result = main.fetch_mileage_data("22222222")
        assert result is None

    def test_fetch_mileage_data_empty_mileage(self, httpx_mock):
        httpx_mock.add_response(
            json={
                "success": True,
                "result": {"records": [{"kilometer_test_aharon": ""}]},
            },
        )

        result = main.fetch_mileage_data("22222222")
        assert result is None

    def test_fetch_mileage_data_network_error(self, httpx_mock):
        import httpx

        httpx_mock.add_exception(httpx.RequestError("Network error"))

        result = main.fetch_mileage_data("22222222")
        assert result is None

    def test_fetch_mileage_data_http_error(self, httpx_mock):
        import httpx

        httpx_mock.add_exception(
            httpx.HTTPStatusError(
                "Server error",
                request=MagicMock(),
                response=MagicMock(status_code=500),
            )
        )

        result = main.fetch_mileage_data("22222222")
        assert result is None


# Tests for fetch_ownership_history() using pytest-httpx
class TestFetchOwnershipHistory:
    def test_fetch_ownership_history_success(
        self, httpx_mock, sample_ownership_records
    ):
        httpx_mock.add_response(
            json={
                "success": True,
                "result": {"records": sample_ownership_records},
            },
        )

        result = main.fetch_ownership_history("11111111")
        assert len(result) == 2
        assert result[0]["start_date"] == 202002
        assert result[0]["owner_type"] == "פרטי"
        assert result[1]["start_date"] == 202202

    def test_fetch_ownership_history_sorted_by_date(self, httpx_mock):
        # Records in wrong order
        records = [
            {"_id": 2, "mispar_rechev": 11111111, "baalut_dt": 202202, "baalut": "ליסינג"},
            {"_id": 1, "mispar_rechev": 11111111, "baalut_dt": 202002, "baalut": "פרטי"},
        ]
        httpx_mock.add_response(
            json={"success": True, "result": {"records": records}},
        )

        result = main.fetch_ownership_history("11111111")
        assert result[0]["start_date"] == 202002
        assert result[1]["start_date"] == 202202

    def test_fetch_ownership_history_calculates_end_dates(self, httpx_mock):
        records = [
            {"_id": 1, "mispar_rechev": 11111111, "baalut_dt": 202002, "baalut": "פרטי"},
            {"_id": 2, "mispar_rechev": 11111111, "baalut_dt": 202202, "baalut": "ליסינג"},
        ]
        httpx_mock.add_response(
            json={"success": True, "result": {"records": records}},
        )

        result = main.fetch_ownership_history("11111111")
        assert result[0]["end_date"] == 202202  # First owner ends when second starts
        assert result[1]["end_date"] is None  # Current owner has no end date

    def test_fetch_ownership_history_api_failure(self, httpx_mock):
        httpx_mock.add_response(
            json={"success": False, "error": {"message": "API error"}},
        )

        with pytest.raises(Exception) as exc_info:
            main.fetch_ownership_history("11111111")
        assert "API error" in str(exc_info.value)

    def test_fetch_ownership_history_http_error(self, httpx_mock):
        import httpx

        httpx_mock.add_exception(
            httpx.HTTPStatusError(
                "Not found",
                request=MagicMock(),
                response=MagicMock(status_code=404),
            )
        )

        with pytest.raises(httpx.HTTPStatusError):
            main.fetch_ownership_history("11111111")


# Tests for format_israeli_date()
class TestFormatIsraeliDate:
    def test_format_israeli_date_yyyymm_int(self):
        result = main.format_israeli_date(202002)
        assert result == "02/2020"

    def test_format_israeli_date_yyyymm_string(self):
        result = main.format_israeli_date("202002")
        assert result == "02/2020"

    def test_format_israeli_date_standard_datetime(self):
        result = main.format_israeli_date("2025-03-25T00:00:00")
        assert result == "25/03/2025"

    def test_format_israeli_date_simple_date(self):
        result = main.format_israeli_date("2025-03-25")
        assert result == "25/03/2025"

    def test_format_israeli_date_israeli_format(self):
        result = main.format_israeli_date("25/03/2025")
        assert result == "25/03/2025"

    def test_format_israeli_date_none(self):
        result = main.format_israeli_date(None)
        assert result == "Present"

    def test_format_israeli_date_empty_string(self):
        result = main.format_israeli_date("")
        assert result == "Present"

    def test_format_israeli_date_zero(self):
        result = main.format_israeli_date(0)
        assert result == "Present"

    def test_format_israeli_date_invalid_format(self):
        result = main.format_israeli_date("invalid-date")
        assert result == "invalid-date"


# Tests for create_vehicle_table()
class TestCreateVehicleTable:
    def test_create_vehicle_table_structure(self, sample_vehicle_record):
        table = main.create_vehicle_table(sample_vehicle_record)
        assert table is not None
        assert len(table.columns) == 2  # Field and Value columns

    def test_create_vehicle_table_with_mileage(self, sample_vehicle_record):
        table = main.create_vehicle_table(sample_vehicle_record, mileage=50000)
        assert table is not None

    def test_create_vehicle_table_without_mileage(self, sample_vehicle_record):
        table = main.create_vehicle_table(sample_vehicle_record, mileage=None)
        assert table is not None

    def test_create_vehicle_table_with_pollution_group(self, sample_vehicle_record):
        table = main.create_vehicle_table(sample_vehicle_record)
        assert table is not None

    def test_create_vehicle_table_handles_empty_values(self):
        record = {
            "mispar_rechev": 22222222,
            "tozeret_nm": None,
            "kvutzat_zihum": None,
        }
        table = main.create_vehicle_table(record)
        assert table is not None


# Tests for create_ownership_table()
class TestCreateOwnershipTable:
    def test_create_ownership_table_with_records(self):
        records = [
            {"start_date": 202002, "end_date": 202202, "owner_type": "פרטי"},
            {"start_date": 202202, "end_date": None, "owner_type": "ליסינג"},
        ]
        table = main.create_ownership_table(records)
        assert table is not None
        assert len(table.columns) == 3

    def test_create_ownership_table_empty(self):
        table = main.create_ownership_table([])
        assert table is not None
        assert len(table.columns) == 3

    def test_create_ownership_table_highlights_current_owner(self):
        records = [
            {"start_date": 202002, "end_date": 202202, "owner_type": "Old Owner"},
            {"start_date": 202202, "end_date": None, "owner_type": "Current Owner"},
        ]
        table = main.create_ownership_table(records)
        assert table is not None


# Tests for query_vehicle() using pytest-httpx
class TestQueryVehicle:
    def test_query_vehicle_success(
        self, httpx_mock, mock_console, sample_vehicle_record
    ):
        # Mock main vehicle API
        httpx_mock.add_response(
            json={
                "success": True,
                "result": {"records": [sample_vehicle_record], "total": 1},
            },
        )
        # Mock mileage API
        httpx_mock.add_response(
            json={
                "success": True,
                "result": {"records": []},
            },
        )

        main.query_vehicle("11111111", mock_console, show_history=False)

        # Verify table was printed
        mock_console.print.assert_called()

    def test_query_vehicle_not_found(self, httpx_mock, mock_console):
        httpx_mock.add_response(
            json={
                "success": True,
                "result": {"records": [], "total": 0},
            },
        )

        main.query_vehicle("99999999", mock_console, show_history=False)

        mock_console.print.assert_called()

    def test_query_vehicle_api_error(self, httpx_mock, mock_console):
        httpx_mock.add_response(
            json={"success": False, "error": {}},
        )

        main.query_vehicle("11111111", mock_console, show_history=False)

        mock_console.print.assert_called()

    def test_query_vehicle_network_error(self, httpx_mock, mock_console):
        import httpx

        httpx_mock.add_exception(httpx.RequestError("Connection failed"))

        main.query_vehicle("11111111", mock_console, show_history=False)

        mock_console.print.assert_called()

    def test_query_vehicle_with_history(
        self, httpx_mock, mock_console, sample_vehicle_record, sample_ownership_records
    ):
        # Add multiple mock responses - httpx_mock will match them in order
        # First call - vehicle data
        httpx_mock.add_response(
            json={
                "success": True,
                "result": {"records": [sample_vehicle_record], "total": 1},
            },
        )
        # Second call - mileage data
        httpx_mock.add_response(
            json={
                "success": True,
                "result": {"records": []},
            },
        )
        # Third call - ownership history
        httpx_mock.add_response(
            json={
                "success": True,
                "result": {"records": sample_ownership_records},
            },
        )

        main.query_vehicle("11111111", mock_console, show_history=True)

        mock_console.print.assert_called()


# Tests for constants
class TestConstants:
    def test_base_url_defined(self):
        assert main.BASE_URL == "https://data.gov.il/api/3/action/datastore_search"

    def test_resource_ids_defined(self):
        assert main.RESOURCE_ID is not None
        assert main.HISTORY_RESOURCE_ID is not None
        assert main.MILEAGE_RESOURCE_ID is not None

    def test_field_names_mapping(self):
        assert "mispar_rechev" in main.FIELD_NAMES
        assert "tozeret_nm" in main.FIELD_NAMES
        assert main.FIELD_NAMES["mispar_rechev"] == "License Plate"


# Test main function
class TestMain:
    @patch("main.query_vehicle")
    @patch("main.Console")
    @patch("sys.argv", ["main.py", "11111111"])
    def test_main_basic(self, mock_console_class, mock_query_vehicle):
        main.main()
        mock_query_vehicle.assert_called_once_with(
            "11111111", mock_console_class.return_value, show_history=False
        )

    @patch("main.query_vehicle")
    @patch("main.Console")
    @patch("sys.argv", ["main.py", "11111111", "--history"])
    def test_main_with_history_flag(self, mock_console_class, mock_query_vehicle):
        main.main()
        mock_query_vehicle.assert_called_once_with(
            "11111111", mock_console_class.return_value, show_history=True
        )

    @patch("main.query_vehicle")
    @patch("main.Console")
    @patch("sys.argv", ["main.py", "11111111", "-H"])
    def test_main_with_history_short_flag(self, mock_console_class, mock_query_vehicle):
        main.main()
        mock_query_vehicle.assert_called_once_with(
            "11111111", mock_console_class.return_value, show_history=True
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
