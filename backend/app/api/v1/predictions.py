"""Prediction API endpoints"""
from fastapi import APIRouter, Depends, HTTPException
import re
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.prediction_service import PredictionService
from app.api.v1.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/predictions", tags=["Predictions"])


# ─── New flat-input predict endpoint ────────────────────────────────────────

class NewPredictRequest(BaseModel):
    ward: str
    city: str
    state: str
    date: str           # "YYYY-MM-DD"
    issue_type: str
    area_type: str
    complaint_count: int
    population: int
    latitude: float
    longitude: float
    risk_profile: Optional[str] = "Public Event & Gathering"


class SHAPFeature(BaseModel):
    feature: str
    raw_name: str
    value: str          # Formatted string (e.g., "2.88M" or "1.2K")
    shap_value: float
    impact: str         # "increases risk" | "decreases risk"


class Recommendation(BaseModel):
    title: str
    message: str
    color: str


class NewPredictResponse(BaseModel):
    ward: str
    city: str
    predicted_risk: str        # Low / Medium / High / Critical
    confidence: float          # 0–100
    shap_features: List[SHAPFeature]
    recommendation: Recommendation
    base_value: Optional[float] = None
    model_accuracy: Optional[float] = None
    historical_mean: Optional[float] = None
    risk_profile: Optional[str] = None
    priority_score: Optional[float] = None

    class Config:
        protected_namespaces = ()


@router.post("/predict", response_model=NewPredictResponse, tags=["Predictions"])
async def predict_risk_new(
    request: NewPredictRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Live XGBoost prediction with SHAP explanation.
    Restricted to officer's jurisdiction.
    """
    # Enforce regional jurisdiction for officers
    if current_user.role == "officer":
        zones = current_user.assigned_zones if current_user.assigned_zones else ([current_user.jurisdiction] if current_user.jurisdiction else [])
        if zones and request.city.lower() not in [z.lower() for z in zones]:
            raise HTTPException(
                status_code=403, 
                detail=f"Access restricted. Your region does not include {request.city}."
            )
            
    result = await PredictionService.predict_new(request.dict())
    return NewPredictResponse(**result)


@router.get("/cities", response_model=List[str], tags=["Predictions"])
async def get_cities(current_user: User = Depends(get_current_user)):
    """Fetch all cities available in the dataset."""
    if current_user.role == "officer":
        if current_user.assigned_zones:
            return current_user.assigned_zones
        if current_user.jurisdiction:
            return [current_user.jurisdiction]
            
    return PredictionService.get_cities()


@router.get("/wards", response_model=List[str], tags=["Predictions"])
async def get_wards(
    city: str, 
    risk_category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Fetch all wards for a given city, optionally filtered by risk category."""
    # Force city for officers
    # Force city for officers if it's not in their region
    if current_user.role == "officer":
        zones = current_user.assigned_zones if current_user.assigned_zones else ([current_user.jurisdiction] if current_user.jurisdiction else [])
        if zones and city.lower() not in [z.lower() for z in zones]:
            # Default to their first assigned zone if requested city is outside region
            city = zones[0]
        
    return PredictionService.get_wards_by_city(city, risk_category)


@router.get("/risk-categories", response_model=List[str], tags=["Predictions"])
async def get_risk_categories(current_user: User = Depends(get_current_user)):
    """Fetch all unique risk categories available in the dataset."""
    return PredictionService.get_risk_categories()


@router.get("/ward-location", tags=["Predictions"])
async def get_ward_location(
    ward: str,
    city: str,
    current_user: User = Depends(get_current_user)
):
    """Fetch static geographic + demographic metadata for a ward (lat, lon, state, area_type, population).
    Does NOT require issue_type — intended for immediate auto-fill when a ward is selected."""
    details = PredictionService.get_ward_details(ward, city)
    if not details:
        raise HTTPException(status_code=404, detail="Ward location not found.")
    return {
        "latitude": details.get("latitude", 0.0),
        "longitude": details.get("longitude", 0.0),
        "state": details.get("state", ""),
        "area_type": details.get("area_type", "Residential"),
        "population": details.get("population", 8000),
    }


@router.get("/ward-details", tags=["Predictions"])
async def get_ward_details(
    ward: str, 
    city: str,
    issue_type: str,
    current_user: User = Depends(get_current_user)
):
    """Fetch details (lat, lon, population, complaint_count) for a specific ward in a city."""
    details = await PredictionService.get_ward_details_aggregated(ward, city, issue_type)
    if not details:
        raise HTTPException(status_code=404, detail="Ward details not found for this city.")
    return details



@router.post("/", response_model=PredictionResponse)
async def create_prediction(
    request: PredictionRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate a risk prediction"""
    prediction = await PredictionService.predict_risk(
        zone=request.zone,
        category=request.category,
        features=request.features,
        model_name=request.model_name
    )
    
    return PredictionResponse(
        id=str(prediction.id),
        prediction_type=prediction.prediction_type,
        model_name=prediction.model_name,
        zone=prediction.zone,
        risk_score=prediction.risk_score,
        risk_level=prediction.risk_level,
        confidence=prediction.confidence,
        predicted_category=prediction.predicted_category,
        predicted_priority=prediction.predicted_priority,
        estimated_resolution_time=prediction.estimated_resolution_time,
        recommendations=prediction.recommendations,
        suggested_actions=prediction.suggested_actions,
        feature_importance=prediction.feature_importance,
        created_at=prediction.created_at
    )


@router.get("/{prediction_id}", response_model=PredictionResponse)
async def get_prediction(
    prediction_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get prediction by ID"""
    prediction = await PredictionService.get_prediction(prediction_id)
    
    if not prediction:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found"
        )
    
    return PredictionResponse(
        id=str(prediction.id),
        prediction_type=prediction.prediction_type,
        model_name=prediction.model_name,
        zone=prediction.zone,
        risk_score=prediction.risk_score,
        risk_level=prediction.risk_level,
        confidence=prediction.confidence,
        predicted_category=prediction.predicted_category,
        predicted_priority=prediction.predicted_priority,
        estimated_resolution_time=prediction.estimated_resolution_time,
        recommendations=prediction.recommendations,
        suggested_actions=prediction.suggested_actions,
        feature_importance=prediction.feature_importance,
        created_at=prediction.created_at
    )


@router.get("/zone/{zone}", response_model=List[PredictionResponse])
async def get_predictions_by_zone(
    zone: str,
    current_user: User = Depends(get_current_user)
):
    """Get predictions for a zone"""
    predictions = await PredictionService.get_predictions_for_zone(zone)
    
    return [
        PredictionResponse(
            id=str(p.id),
            prediction_type=p.prediction_type,
            model_name=p.model_name,
            zone=p.zone,
            risk_score=p.risk_score,
            risk_level=p.risk_level,
            confidence=p.confidence,
            predicted_category=p.predicted_category,
            predicted_priority=p.predicted_priority,
            estimated_resolution_time=p.estimated_resolution_time,
            recommendations=p.recommendations,
            suggested_actions=p.suggested_actions,
            feature_importance=p.feature_importance,
            created_at=p.created_at
        )
        for p in predictions
    ]


@router.get("/high-risk/recent", response_model=List[PredictionResponse])
async def get_high_risk_predictions(
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """Get recent high-risk predictions"""
    jurisdiction = current_user.jurisdiction if current_user.role == "officer" else None
    predictions = await PredictionService.get_high_risk_predictions(limit, jurisdiction)
    
    return [
        PredictionResponse(
            id=str(p.id),
            prediction_type=p.prediction_type,
            model_name=p.model_name,
            zone=p.zone,
            risk_score=p.risk_score,
            risk_level=p.risk_level,
            confidence=p.confidence,
            predicted_category=p.predicted_category,
            predicted_priority=p.predicted_priority,
            estimated_resolution_time=p.estimated_resolution_time,
            recommendations=p.recommendations,
            suggested_actions=p.suggested_actions,
            feature_importance=p.feature_importance,
            created_at=p.created_at
        )
        for p in predictions
    ]
