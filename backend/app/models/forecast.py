"""Forecast model for future risk predictions"""
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime


class Forecast(Document):
    """Forecast document model for daily risk projections"""
    
    date: datetime
    zone: str = "Global"
    predicted_value: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    model_type: str = "ARIMA"
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "forecasts"
        indexes = [
            "date",
            "zone",
            "created_at"
        ]
    
    class Config:
        protected_namespaces = ()
        json_schema_extra = {
            "example": {
                "date": "2024-03-22T00:00:00",
                "zone": "Global",
                "predicted_value": 52.4,
                "confidence": 0.85
            }
        }
