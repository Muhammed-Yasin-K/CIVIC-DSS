"""Inspection schemas for request/response validation"""
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing import Optional, Annotated
from datetime import datetime
from app.models.inspection import InspectionStatus, InspectionPriority


class InspectionCreate(BaseModel):
    """Schema for creating an inspection"""
    alert_id: Optional[str] = None
    location: str
    zone: str
    assigned_officer_id: str
    assigned_officer_name: Optional[str] = None
    scheduled_date: datetime
    priority: InspectionPriority = InspectionPriority.MEDIUM
    description: Optional[str] = None


class InspectionUpdate(BaseModel):
    """Schema for updating an inspection"""
    status: Optional[InspectionStatus] = None
    priority: Optional[InspectionPriority] = None
    findings: Optional[str] = None
    actions_taken: Optional[str] = None
    photos: Optional[list[str]] = None
    scheduled_date: Optional[datetime] = None
    description: Optional[str] = None


class InspectionResponse(BaseModel):
    """Schema for inspection response"""
    model_config = ConfigDict(from_attributes=True)

    id: Annotated[str, BeforeValidator(str)]
    alert_id: Optional[Annotated[str, BeforeValidator(str)]] = None
    location: str
    zone: str
    assigned_officer_id: str
    assigned_officer_name: Optional[str] = None
    scheduled_date: datetime
    status: str
    priority: str
    description: Optional[str] = None
    findings: Optional[str] = None
    actions_taken: Optional[str] = None
    photos: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class InspectionStats(BaseModel):
    """Schema for inspection statistics"""
    total: int
    pending: int
    in_progress: int
    completed: int
    cancelled: int
    by_priority: dict[str, int]
