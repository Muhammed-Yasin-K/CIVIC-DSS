from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.support import TicketStatus, TicketCategory
from beanie import PydanticObjectId


class TicketCreate(BaseModel):
    """Schema for creating a support ticket"""
    subject: str = Field(..., min_length=5, max_length=200)
    category: TicketCategory = TicketCategory.TECHNICAL_BUG
    description: str = Field(..., min_length=10)


class TicketResponse(BaseModel):
    """Schema for support ticket response"""
    id: PydanticObjectId = Field(..., alias="_id")
    user_id: str
    username: str
    subject: str
    category: TicketCategory
    description: str
    status: TicketStatus
    priority: str
    created_at: datetime
    updated_at: datetime
    admin_response: Optional[str] = None
    
    class Config:
        populate_by_name = True


class TicketUpdate(BaseModel):
    """Schema for updating a support ticket"""
    status: Optional[TicketStatus] = None
    admin_response: Optional[str] = None


class PasswordResetCreate(BaseModel):
    """Schema for password reset request"""
    username_or_id: str = Field(..., min_length=1)


class PasswordResetResponse(BaseModel):
    """Schema for password reset response"""
    id: PydanticObjectId = Field(..., alias="_id")
    username_or_id: str
    status: str
    created_at: datetime
    
    class Config:
        populate_by_name = True
