"""Hotspot model for geographic risk clusters"""
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime


class Hotspot(Document):
    """Hotspot document model for detected risk areas"""
    
    zone: str
    latitude: float
    longitude: float
    avg_risk_score: float = Field(..., ge=0.0, le=100.0)
    occurrence_count: int = Field(default=0)
    risk_frequency: str  # 'Daily', 'Weekly', 'Monthly'
    hotspot_level: Optional[str] = None # 'CRITICAL', 'HIGH', 'MEDIUM'
    cluster_id: int
    category: Optional[str] = None
    last_occurrence: Optional[datetime] = None
    city: Optional[str] = None
    ward: Optional[str] = None
    state: Optional[str] = None
    issue_type: Optional[str] = None
    top_season: Optional[str] = None
    real_incident: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "hotspots"
        indexes = [
            "zone",
            "avg_risk_score",
            "cluster_id",
            "created_at"
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "zone": "Central Market",
                "latitude": 12.9716,
                "longitude": 77.5946,
                "avg_risk_score": 85.5,
                "risk_frequency": "Daily",
                "cluster_id": 1
            }
        }
