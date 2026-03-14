"""User model for authentication and authorization"""
from beanie import Document
from pydantic import EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration"""
    ADMIN = "admin"
    OFFICER = "officer"
    VIEWER = "viewer"


class User(Document):
    """User document model"""
    
    email: EmailStr = Field(..., unique=True, index=True)
    username: str = Field(..., min_length=3, max_length=50)
    hashed_password: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.VIEWER
    
    # Officer-specific fields
    assigned_zones: List[str] = Field(default_factory=list)
    jurisdiction: Optional[str] = None
    
    # Account status
    is_active: bool = True
    is_verified: bool = False
    is_custom: bool = False  # Track if user was created via UI vs seed script
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    class Settings:
        name = "users"
        indexes = [
            "email",
            "role",
            "assigned_zones"
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "officer@civicrisk.com",
                "username": "johndoe",
                "full_name": "John Doe",
                "role": "officer",
                "assigned_zones": ["Zone A", "Zone B"],
                "jurisdiction": "North District"
            }
        }
