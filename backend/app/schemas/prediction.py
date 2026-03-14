"""Prediction schemas for request/response validation"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime


class PredictionRequest(BaseModel):
    """Prediction request schema"""
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "zone": "Zone A",
                "category": "road_safety",
                "description": "Pothole on main road",
                "model_name": "xgboost",
            }
        },
    )

    zone: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    features: Optional[Dict[str, Any]] = None
    model_name: str = "xgboost"


class PredictionResponse(BaseModel):
    """Prediction response schema"""
    model_config = ConfigDict(
        protected_namespaces=(),
        from_attributes=True,
    )

    id: str
    prediction_type: str
    model_name: str
    zone: Optional[str] = None
    risk_score: float
    risk_level: str
    confidence: float
    predicted_category: Optional[str] = None
    predicted_priority: Optional[str] = None
    estimated_resolution_time: Optional[int] = None
    recommendations: List[str] = []
    suggested_actions: List[str] = []
    feature_importance: Optional[Dict[str, float]] = None
    created_at: datetime


class BatchPredictionRequest(BaseModel):
    """Batch prediction request schema"""
    model_config = ConfigDict(protected_namespaces=())

    zones: List[str]
    model_name: str = "xgboost"


class RiskAssessmentRequest(BaseModel):
    """Risk assessment request for a zone"""
    zone: str
    time_period_days: int = 7
    include_forecast: bool = True
