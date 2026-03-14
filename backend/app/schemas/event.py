from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing import Optional, List, Annotated
from datetime import datetime
from app.models.event import EventType

from app.utils.date_utils import robust_parse_datetime

DateTime = Annotated[datetime, BeforeValidator(robust_parse_datetime)]

class EventCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    event_type: EventType = EventType.FESTIVAL
    start_date: DateTime
    end_date: DateTime
    region: Optional[str] = None
    officer_assigned: Optional[str] = None
    zones_affected: List[str] = []
    risk_multiplier: float = 1.0
    priority: str = "normal"
    description: Optional[str] = None

class EventUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    event_type: Optional[EventType] = None
    start_date: Optional[DateTime] = None
    end_date: Optional[DateTime] = None
    region: Optional[str] = None
    officer_assigned: Optional[str] = None
    zones_affected: Optional[List[str]] = None
    risk_multiplier: Optional[float] = None
    priority: Optional[str] = None
    description: Optional[str] = None

class EventResponse(EventCreate):
    model_config = ConfigDict(from_attributes=True)
    
    id: Annotated[str, BeforeValidator(str)]
    created_at: datetime
    updated_at: datetime

class EventFilter(BaseModel):
    event_type: Optional[EventType] = None
    start_date: Optional[DateTime] = None
    end_date: Optional[DateTime] = None
    skip: int = 0
    limit: int = 100
