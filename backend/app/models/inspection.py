"""Inspection model for field inspections"""
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime
from enum import Enum


class InspectionStatus(str, Enum):
    """Inspection status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InspectionPriority(str, Enum):
    """Inspection priority enumeration"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Inspection(Document):
    """Inspection document model"""
    
    alert_id: Optional[str] = None
    location: str
    zone: str
    assigned_officer_id: str
    assigned_officer_name: Optional[str] = None
    
    scheduled_date: datetime
    status: InspectionStatus = InspectionStatus.PENDING
    priority: InspectionPriority = InspectionPriority.MEDIUM
    
    # Inspection details
    description: Optional[str] = None
    findings: Optional[str] = None
    actions_taken: Optional[str] = None
    photos: list[str] = Field(default_factory=list)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    class Settings:
        name = "inspections"
        indexes = [
            "alert_id",
            "assigned_officer_id",
            "status",
            "zone",
            "scheduled_date"
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "alert_id": "507f1f77bcf86cd799439011",
                "location": "Main Street, Zone A",
                "zone": "Zone A",
                "assigned_officer_id": "507f1f77bcf86cd799439012",
                "assigned_officer_name": "John Doe",
                "scheduled_date": "2024-02-10T10:00:00Z",
                "status": "pending",
                "priority": "high",
                "description": "Investigate reported waste accumulation"
            }
        }
