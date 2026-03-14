"""Date and time utility functions"""
from datetime import datetime, timedelta
from typing import Optional
import pytz


def get_current_utc() -> datetime:
    """Get current UTC datetime"""
    return datetime.utcnow()


def get_current_ist() -> datetime:
    """Get current IST datetime"""
    ist = pytz.timezone('Asia/Kolkata')
    return datetime.now(ist)


def format_datetime(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Format datetime to string"""
    return dt.strftime(format_str)


def parse_datetime(date_str: str, format_str: str = "%Y-%m-%d %H:%M:%S") -> Optional[datetime]:
    """Parse string to datetime"""
    try:
        return datetime.strptime(date_str, format_str)
    except ValueError:
        return None


def robust_parse_datetime(v: any) -> any:
    """
    Robustly parse datetime from string or other formats.
    Specifically handles date-only strings (YYYY-MM-DD) by appending T00:00:00.
    This is used as a Pydantic BeforeValidator.
    """
    import datetime as dt
    if isinstance(v, str) and len(v) == 10:
        try:
            # Check if it matches YYYY-MM-DD
            dt.datetime.strptime(v, "%Y-%m-%d")
            return f"{v}T00:00:00"
        except ValueError:
            pass
    elif isinstance(v, (int, float)):
        # Handle timestamps
        return dt.datetime.fromtimestamp(v)
    return v


def get_date_range(days: int = 7) -> tuple[datetime, datetime]:
    """
    Get date range from current date
    
    Args:
        days: Number of days to go back
        
    Returns:
        Tuple of (start_date, end_date)
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    return start_date, end_date


def calculate_time_difference(start: datetime, end: datetime) -> float:
    """
    Calculate time difference in hours
    
    Args:
        start: Start datetime
        end: End datetime
        
    Returns:
        Time difference in hours
    """
    delta = end - start
    return delta.total_seconds() / 3600


def is_within_time_range(dt: datetime, start: datetime, end: datetime) -> bool:
    """Check if datetime is within a time range"""
    return start <= dt <= end


def get_week_start_end(dt: Optional[datetime] = None) -> tuple[datetime, datetime]:
    """Get start and end of week for given datetime"""
    if dt is None:
        dt = datetime.utcnow()
    
    start = dt - timedelta(days=dt.weekday())
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    return start, end


def get_month_start_end(dt: Optional[datetime] = None) -> tuple[datetime, datetime]:
    """Get start and end of month for given datetime"""
    if dt is None:
        dt = datetime.utcnow()
    
    start = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get last day of month
    if dt.month == 12:
        end = dt.replace(year=dt.year + 1, month=1, day=1) - timedelta(seconds=1)
    else:
        end = dt.replace(month=dt.month + 1, day=1) - timedelta(seconds=1)
    
    return start, end
