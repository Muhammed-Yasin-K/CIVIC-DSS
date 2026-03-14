"""Hotspot schemas for API response validation"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class HotspotBase(BaseModel):
    zone: str
    latitude: float
    longitude: float
    avg_risk_score: float
    occurrence_count: int
    risk_frequency: str
    cluster_id: int
    category: Optional[str] = None
    city: Optional[str] = None
    ward: Optional[str] = None
    issue_type: Optional[str] = None


class HotspotCreate(HotspotBase):
    pass


class HotspotResponse(HotspotBase):
    id: str = Field(..., alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
