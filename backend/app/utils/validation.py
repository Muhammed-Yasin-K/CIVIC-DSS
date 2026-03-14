"""Data validation utility functions"""
from typing import Optional
import re


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """Validate phone number format (Indian format)"""
    # Remove spaces and dashes
    phone = phone.replace(" ", "").replace("-", "")
    
    # Check for valid Indian phone number
    pattern = r'^(\+91)?[6-9]\d{9}$'
    return bool(re.match(pattern, phone))


def validate_latitude(lat: float) -> bool:
    """Validate latitude value"""
    return -90 <= lat <= 90


def validate_longitude(lon: float) -> bool:
    """Validate longitude value"""
    return -180 <= lon <= 180


def validate_coordinates(lat: float, lon: float) -> bool:
    """Validate geographic coordinates"""
    return validate_latitude(lat) and validate_longitude(lon)


def sanitize_string(text: str, max_length: Optional[int] = None) -> str:
    """
    Sanitize string input by removing potentially harmful characters
    
    Args:
        text: Input text
        max_length: Optional maximum length
        
    Returns:
        Sanitized text
    """
    # Remove control characters
    sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    
    # Trim whitespace
    sanitized = sanitized.strip()
    
    # Truncate if max_length specified
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized


def validate_zone_name(zone: str) -> bool:
    """Validate zone name format"""
    # Zone names should be alphanumeric with spaces, hyphens, or underscores
    pattern = r'^[a-zA-Z0-9\s\-_]+$'
    return bool(re.match(pattern, zone)) and 1 <= len(zone) <= 50


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength
    
    Returns:
        Tuple of (is_valid, message)
    """
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    
    if len(password) > 128:
        return False, "Password must be less than 128 characters"
    
    # Check for at least one letter and one number
    has_letter = bool(re.search(r'[a-zA-Z]', password))
    has_number = bool(re.search(r'\d', password))
    
    if not (has_letter and has_number):
        return False, "Password must contain at least one letter and one number"
    
    return True, "Password is valid"


def normalize_category(category: str) -> str:
    """Normalize category name to lowercase with underscores"""
    return category.lower().replace(" ", "_").replace("-", "_")
