from beanie import Document
from pydantic import Field, BaseModel
from typing import Optional
from datetime import datetime

class RiskThresholds(BaseModel):
    low_max: float = Field(default=60.0, ge=0.0, le=100.0)
    medium_max: float = Field(default=80.0, ge=0.0, le=100.0)
    high_min: float = Field(default=80.0, ge=0.0, le=100.0)

class SystemConfig(Document):
    """System Configuration document model (Singleton)"""
    risk_thresholds: RiskThresholds = Field(default_factory=RiskThresholds)
    prediction_confidence_threshold: float = Field(default=0.6, ge=0.0, le=1.0)
    max_alerts_per_hour: int = Field(default=10, ge=1)
    enable_audit_logging: bool = True
    data_retention_days: int = Field(default=90, ge=1)
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None

    class Settings:
        name = "system_config"

    class Config:
        json_schema_extra = {
            "example": {
                "risk_thresholds": {
                    "low_max": 40,
                    "medium_max": 70,
                    "high_min": 70
                },
                "prediction_confidence_threshold": 0.6,
                "max_alerts_per_hour": 10,
                "enable_audit_logging": True,
                "data_retention_days": 90
            }
        }
