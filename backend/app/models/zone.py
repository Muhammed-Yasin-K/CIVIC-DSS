from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime

class Zone(Document):
    """Geographic Zone and Ward metadata model"""
    
    name: str = Field(..., description="Name of the zone or locality")
    city: str = Field(..., description="Parent city")
    region: str = Field(..., description="Broad geographic region (North, South, etc.)")
    ward_id: Optional[str] = Field(None, description="Administrative ward identifier")
    population: int = Field(default=0, ge=0)
    area_sq_km: Optional[float] = Field(None, ge=0)
    risk_level_override: Optional[str] = None  # CRITICAL, HIGH, MEDIUM, LOW
    description: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "administrative_zones"
        indexes = [
            "name",
            "city",
            "region",
            "ward_id"
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Central Market",
                "city": "Mumbai",
                "region": "West",
                "ward_id": "W-08",
                "population": 250000,
                "description": "High-density retail and residential zone"
            }
        }
