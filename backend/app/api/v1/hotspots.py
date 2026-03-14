"""Hotspot detection API endpoints"""
import re
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.prediction import Prediction
from app.ml.models.dbscan_model import DBSCANModel
from app.services.hotspot_service import HotspotService

import pandas as pd
import os
from app.services.prediction_service import HOTSPOT_DATA_PATH

router = APIRouter(prefix="/hotspots", tags=["Hotspots"])


@router.get("/summary")
async def get_hotspot_summary(current_user: User = Depends(get_current_user)):
    """Fetch global hotspot summary statistics for the dashboard"""
    try:
        if not os.path.exists(HOTSPOT_DATA_PATH):
            return {"total_hotspots": 0, "high_risk_count": 0}
            
        df = pd.read_csv(HOTSPOT_DATA_PATH)
        
        # Filter by regional jurisdiction for officers
        if current_user.role == "officer":
            zones = current_user.assigned_zones if current_user.assigned_zones else ([current_user.jurisdiction] if current_user.jurisdiction else [])
            if zones:
                regex_pattern = "|".join([re.escape(z) for z in zones])
                if 'City' in df.columns:
                    df = df[df['City'].str.contains(regex_pattern, case=False, na=False)]
                elif 'Zone' in df.columns:
                    df = df[df['Zone'].str.contains(regex_pattern, case=False, na=False)]
        
        return {
            "total_hotspots": len(df),
            "high_risk_count": int((df['Risk_Level'] == 'High').sum())
        }
    except Exception as e:
        return {"total_hotspots": 0, "high_risk_count": 0, "error": str(e)}


@router.get("/detect")
async def detect_hotspots(
    zone: Optional[str] = None,
    days: int = Query(7, ge=1, le=90),
    eps: float = Query(0.01, gt=0),
    min_samples: int = Query(3, ge=2),
    current_user: User = Depends(get_current_user)
):
    """Detect geographic hotspots using DBSCAN clustering on recent predictions"""
    # Force regional/jurisdiction filter for officers
    if current_user.role == "officer":
        if current_user.assigned_zones:
            zone = "|".join([re.escape(z) for z in current_user.assigned_zones])
        elif current_user.jurisdiction:
            zone = current_user.jurisdiction
        
    # Get recent predictions
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    query = {
        "created_at": {"$gte": start_date, "$lte": end_date}
    }
    if zone:
        query["zone"] = {"$regex": zone, "$options": "i"}
    
    predictions = await Prediction.find(query).to_list()
    
    # Convert to dict format for DBSCAN
    prediction_dicts = []
    for p in predictions:
        # Prediction model has latitude and longitude
        if p.latitude and p.longitude:
            prediction_dicts.append({
                "latitude": p.latitude,
                "longitude": p.longitude,
                "risk_level": p.risk_level,
                "risk_score": p.risk_score
            })
    
    # Detect hotspots
    dbscan = DBSCANModel(eps=eps, min_samples=min_samples)
    results = dbscan.find_hotspots_from_complaints(prediction_dicts)
    
    return {
        "hotspots": results["clusters"],
        "num_hotspots": results["num_clusters"],
        "noise_points": results["noise_points"],
        "total_points": results.get("total_points", 0),
        "parameters": {
            "eps": eps,
            "min_samples": min_samples,
            "days": days,
            "zone": zone
        }
    }


@router.get("/zones")
async def get_hotspot_zones(
    days: int = Query(7, ge=1, le=90),
    current_user: User = Depends(get_current_user)
):
    """Get zones with detected hotspots based on recent predictions"""
    # Get all predictions to identify zones
    all_predictions = await Prediction.find().to_list()
    zones = list(set(p.zone for p in all_predictions if p.zone))
    
    # Filter zones for officers
    if current_user.role == "officer":
        zones_filter = current_user.assigned_zones if current_user.assigned_zones else ([current_user.jurisdiction] if current_user.jurisdiction else [])
        if zones_filter:
            zones = [z for z in zones if any(rf.lower() in z.lower() for rf in zones_filter)]
    
    # Detect hotspots for each zone
    zone_hotspots = []
    
    for zone in zones:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        zone_predictions = await Prediction.find({
            "zone": zone,
            "created_at": {"$gte": start_date, "$lte": end_date}
        }).to_list()
        
        prediction_dicts = []
        for p in zone_predictions:
            if p.latitude and p.longitude:
                prediction_dicts.append({
                    "latitude": p.latitude,
                    "longitude": p.longitude
                })
        
        if len(prediction_dicts) >= 3:
            dbscan = DBSCANModel(eps=0.01, min_samples=3)
            results = dbscan.find_hotspots_from_complaints(prediction_dicts)
            
            if results["num_clusters"] > 0:
                zone_hotspots.append({
                    "zone": zone,
                    "num_hotspots": results["num_clusters"],
                    "total_predictions": len(prediction_dicts),
                    "hotspots": results["clusters"]
                })
    
    return {
        "zones_with_hotspots": zone_hotspots,
        "total_zones": len(zone_hotspots)
    }

@router.get("/recurring")
async def get_recurring_hotspots(
    zone: Optional[str] = None,
    city: Optional[str] = None,
    issue_type: Optional[str] = None,
    min_priority_score: Optional[int] = Query(None, ge=1),
    hotspot_level: Optional[str] = None,
    category: Optional[str] = None,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = None,
    min_risk_score: float = Query(0.0, ge=0.0, le=100.0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user)
):
    """Get recurring hotspots from the database with DSS categorical filters"""
    # Force regional jurisdiction filter for officers
    if current_user.role == "officer":
        zones_filter = current_user.assigned_zones if current_user.assigned_zones else ([current_user.jurisdiction] if current_user.jurisdiction else [])
        if zones_filter:
            # We use regex for city match if multiple
            city = "|".join([re.escape(z) for z in zones_filter])
            # Respect requested zone only if it matches one of the regional cities
            if zone and not any(rf.lower() in zone.lower() for rf in zones_filter):
                zone = None
            
    hotspots = await HotspotService.get_recurring_hotspots(
        zone=zone,
        city=city,
        issue_type=issue_type,
        min_priority_score=min_priority_score,
        hotspot_level=hotspot_level,
        category=category,
        month=month,
        year=year,
        min_risk_score=min_risk_score,
        limit=limit
    )
    return {
        "hotspots": hotspots,
        "count": len(hotspots)
    }
