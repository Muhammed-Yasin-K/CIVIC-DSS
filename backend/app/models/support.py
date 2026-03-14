"""Support model for helpdesk tickets and reset requests"""
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime
from enum import Enum


class TicketStatus(str, Enum):
    """Support ticket status"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketCategory(str, Enum):
    """Support ticket category"""
    TECHNICAL_BUG = "Technical Bug"
    DATA_CORRECTION = "Data Correction"
    FEATURE_REQUEST = "Feature Request"
    ACCOUNT_ACCESS = "Account Access"
    ANALYTICS_INQUIRY = "Analytics Inquiry"


class SupportTicket(Document):
    """Support ticket document model"""
    
    user_id: str = Field(..., index=True)
    username: str
    subject: str = Field(..., min_length=5, max_length=200)
    category: TicketCategory = TicketCategory.TECHNICAL_BUG
    description: str = Field(..., min_length=10)
    status: TicketStatus = TicketStatus.OPEN
    priority: str = "medium"
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    
    # Admin response
    admin_response: Optional[str] = None
    admin_id: Optional[str] = None

    class Settings:
        name = "support_tickets"
        indexes = [
            "user_id",
            "status",
            "category",
            "created_at"
        ]


class PasswordResetRequest(Document):
    """Password reset request document model"""
    
    username_or_id: str = Field(..., index=True)
    email: Optional[str] = None
    status: str = "pending" # pending, approved, rejected
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None
    
    class Settings:
        name = "password_reset_requests"
        indexes = [
            "username_or_id",
            "status",
            "created_at"
        ]
