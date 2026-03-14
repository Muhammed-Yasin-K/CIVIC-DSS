from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime
from enum import Enum

class TaskPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Task(Document):
    """Task document model"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    
    assigned_to: Optional[str] = None # User ID or username
    assigned_by: Optional[str] = None # User ID or username
    
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    
    due_date: Optional[datetime] = None
    location: Optional[str] = None
    event_id: Optional[str] = None # Link to Event ID
    alert_id: Optional[str] = None # Link to Alert ID
    notes: Optional[str] = None # Field updates/findings from officer (Mission Updates)
    actions_taken: Optional[str] = None # Detailed actions taken during the mission
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    class Settings:
        name = "tasks"
        indexes = [
            "assigned_to",
            "status",
            "priority",
            "due_date"
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Inspect Central Market",
                "description": "Verify waste bin overflow reports",
                "assigned_to": "officer1",
                "status": "pending",
                "priority": "High",
                "due_date": "2024-06-01T14:00:00",
                "location": "Central Market"
            }
        }
