"""Authentication schemas for request/response validation"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserLogin(BaseModel):
    """Login request schema"""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: str = Field(..., min_length=6)
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "johndoe",
                "password": "securepassword123"
            }
        }


class UserRegister(BaseModel):
    """User registration schema"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    role: str = "viewer"
    assigned_zones: Optional[list[str]] = Field(default_factory=list)
    jurisdiction: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "securepassword123",
                "full_name": "New User",
                "role": "viewer",
                "assigned_zones": ["Zone A"],
                "jurisdiction": "North District"
            }
        }


class Token(BaseModel):
    """JWT token response schema"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data"""
    email: Optional[str] = None


class UserResponse(BaseModel):
    """User response schema"""
    id: str
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    role: str
    assigned_zones: list[str] = []
    jurisdiction: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "email": "user@example.com",
                "username": "johndoe",
                "full_name": "John Doe",
                "role": "officer",
                "assigned_zones": ["Zone A"],
                "is_active": True
            }
        }


class PasswordChange(BaseModel):
    """Password change request schema"""
    current_password: str
    new_password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    """User update schema"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = None
    assigned_zones: Optional[list[str]] = None
    jurisdiction: Optional[str] = None
