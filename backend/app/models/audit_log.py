from beanie import Document
from pydantic import Field
from typing import Optional, Any
from datetime import datetime

class AuditLog(Document):
    """Audit Log document model"""
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str = Field(..., min_length=1)
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[Any] = None
    status: str = "success"  # success or failed
    ip_address: Optional[str] = None
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "audit_logs"
        indexes = [
            "timestamp",
            "user_id",
            "action",
            "resource_type"
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "user_email": "admin@civicrisk.com",
                "action": "create_user",
                "resource_type": "user",
                "details": "Created new officer account",
                "status": "success",
                "ip_address": "127.0.0.1"
            }
        }
