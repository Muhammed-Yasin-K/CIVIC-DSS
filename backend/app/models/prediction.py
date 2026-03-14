"""Prediction model for ML risk predictions"""
from beanie import Document
from pydantic import Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    """Risk level enumeration"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PredictionType(str, Enum):
    """Prediction type enumeration"""
    RISK_SCORE = "risk_score"
    HOTSPOT = "hotspot"
    TREND = "trend"
    FORECAST = "forecast"


class Prediction(Document):
    """Prediction document model for ML outputs"""
    
    # Prediction metadata
    prediction_type: PredictionType
    model_name: str  # e.g., "xgboost", "random_forest", "arima"
    model_version: str = "1.0.0"
    
    # Input data reference
    zone: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Prediction results
    risk_score: float = Field(..., ge=0.0, le=1.0)
    risk_level: RiskLevel
    confidence: float = Field(..., ge=0.0, le=1.0)
    
    # Feature importance and explainability
    features_used: Dict[str, Any] = Field(default_factory=dict)
    shap_values: Optional[Dict[str, float]] = None
    feature_importance: Optional[Dict[str, float]] = None
    
    # Prediction details
    predicted_category: Optional[str] = None
    predicted_priority: Optional[str] = None
    estimated_resolution_time: Optional[int] = None  # in hours
    
    # Recommendations
    recommendations: List[str] = Field(default_factory=list)
    suggested_actions: List[str] = Field(default_factory=list)
    
    # Validation
    is_validated: bool = False
    actual_outcome: Optional[str] = None
    validation_notes: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    
    class Settings:
        name = "predictions"
        indexes = [
            "prediction_type",
            "risk_level",
            "zone",
            "created_at"
        ]
    
    class Config:
        protected_namespaces = ()
        json_schema_extra = {
            "example": {
                "prediction_type": "risk_score",
                "model_name": "xgboost",
                "zone": "Zone A",
                "risk_score": 0.85,
                "risk_level": "high",
                "confidence": 0.92,
                "recommendations": ["Immediate inspection required", "Allocate resources"]
            }
        }
