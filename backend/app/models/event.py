from beanie import Document
from pydantic import Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class EventType(str, Enum):
    FESTIVAL = "festival"
    HOLIDAY = "holiday"
    SEASONAL = "seasonal"
    TOURIST_SEASON = "tourist_season"
    OTHER = "other"

class Event(Document):
    """Civic Event document model"""
    name: str = Field(..., min_length=1, max_length=100)
    event_type: EventType = EventType.FESTIVAL
    start_date: datetime
    end_date: datetime
    region: Optional[str] = None
    officer_assigned: Optional[str] = None
    zones_affected: List[str] = Field(default_factory=list)
    risk_multiplier: float = Field(default=1.0)
    priority: str = Field(default="normal")
    description: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "events"
        indexes = [
            "start_date",
            "end_date",
            "event_type"
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Summer Festival",
                "event_type": "festival",
                "start_date": "2024-06-01T00:00:00",
                "end_date": "2024-06-07T23:59:59",
                "zones_affected": ["Central Market", "Downtown"],
                "risk_multiplier": 1.5,
                "description": "Annual summer festival attracting large crowds."
            }
        }
