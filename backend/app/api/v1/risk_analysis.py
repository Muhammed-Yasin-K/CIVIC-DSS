"""Risk factors and forecast API endpoints"""
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.prediction import Prediction

router = APIRouter(tags=["Risk Analysis"])


@router.get("/risk-factors")
async def get_risk_factors(
    date: Optional[str] = Query(None),
    zone: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get risk factors for a date/zone — returns season, event, and contextual risk info"""
    # Parse date if provided
    target_date = datetime.fromisoformat(date) if date else datetime.utcnow()
    month = target_date.month

    # Determine season from month
    if month in [3, 4, 5]:
        season_name = "Summer"
        season_risk = 0.65
    elif month in [6, 7, 8, 9]:
        season_name = "Monsoon"
        season_risk = 0.85
    elif month in [10, 11]:
        season_name = "Post-Monsoon"
        season_risk = 0.55
    else:
        season_name = "Winter"
        season_risk = 0.40

    # Look up active events from the events collection
    try:
        from app.models.event import Event
        all_events = await Event.find().to_list()
        active_events = []
        event_risk = 0.0

        for event in all_events:
            # Check if event date overlaps with target_date (by month/year or date range)
            try:
                ev_start = getattr(event, 'start_date', None)
                ev_end = getattr(event, 'end_date', None)
                ev_date = getattr(event, 'date', None)

                is_active = False
                if ev_start and ev_end:
                    is_active = ev_start.date() <= target_date.date() <= ev_end.date()
                elif ev_date:
                    is_active = ev_date.month == month and ev_date.year == target_date.year

                if is_active:
                    name = getattr(event, 'name', None) or getattr(event, 'title', None) or 'Event'
                    active_events.append(name)
                    risk_val = getattr(event, 'risk_multiplier', 0.8)
                    event_risk = max(event_risk, float(risk_val))
            except Exception:
                continue

        if not active_events:
            event_risk = 0.2  # baseline low event risk when no events found

    except Exception:
        active_events = []
        event_risk = 0.2

    # Build explanation string
    parts = [f"Season: {season_name} (risk {season_risk:.0%})"]
    if active_events:
        parts.append(f"Active events: {', '.join(active_events)}")
    explanation = ". ".join(parts) + ". Risk factors auto-populated for your prediction."

    return {
        "date": target_date.isoformat(),
        "zone": zone,
        "season_name": season_name,
        "season_risk": round(season_risk, 2),
        "event_risk": round(event_risk, 2),
        "active_events": active_events,
        "explanation": explanation,
        # Keep legacy fields for any other consumers
        "total_predictions": 0,
        "category_distribution": {},
        "priority_distribution": {},
        "risk_factors": {
            "season_risk": season_risk,
            "event_risk": event_risk
        }
    }


@router.get("/forecast/global")
async def get_global_forecast(
    forecast_days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_user)
):
    """Get global risk forecast"""
    # Get historical prediction data
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=90)
    
    predictions = await Prediction.find({
        "created_at": {"$gte": start_date, "$lte": end_date}
    }).to_list()
    
    # Group by date
    daily_counts = {}
    for pred in predictions:
        date_key = pred.created_at.date()
        daily_counts[date_key] = daily_counts.get(date_key, 0) + 1
    
    # Calculate simple moving average
    if daily_counts:
        recent_avg = sum(daily_counts.values()) / len(daily_counts)
    else:
        recent_avg = 5.0  # Default base activity
    
    # Generate forecast
    forecast = []
    current_date = end_date.date()
    
    from app.models.event import Event
    all_events = await Event.find().to_list()

    for i in range(forecast_days):
        forecast_dt = datetime.combine(current_date + timedelta(days=i+1), datetime.min.time())
        
        # Calculate event risk for this specific forecast date
        max_multiplier = 1.0
        for ev in all_events:
            if ev.start_date.date() <= forecast_dt.date() <= ev.end_date.date():
                max_multiplier = max(max_multiplier, ev.risk_multiplier)

        # Baseline growth + event spike
        predicted_count = int(recent_avg * (1 + (i * 0.02)) * max_multiplier)
        
        forecast.append({
            "date": forecast_dt.date().isoformat(),
            "predicted_risk_events": predicted_count,
            "confidence": max(0.5, 1.0 - (i * 0.05)),
            "risk_level": "high" if predicted_count > recent_avg * 1.5 else "medium" if predicted_count > recent_avg else "low"
        })
    
    return {
        "forecast": forecast,
        "forecast_days": forecast_days,
        "historical_average": recent_avg,
        "generated_at": end_date.isoformat()
    }


@router.get("/forecast/zone/{zone}")
async def get_zone_forecast(
    zone: str,
    forecast_days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_user)
):
    """Get risk forecast for a specific zone"""
    # Get historical prediction data for zone
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=90)
    
    predictions = await Prediction.find({
        "zone": zone,
        "created_at": {"$gte": start_date, "$lte": end_date}
    }).to_list()
    
    # Group by date
    daily_counts = {}
    for pred in predictions:
        date_key = pred.created_at.date()
        daily_counts[date_key] = daily_counts.get(date_key, 0) + 1
    
    # Calculate average
    if daily_counts:
        recent_avg = sum(daily_counts.values()) / len(daily_counts)
    else:
        recent_avg = 5.0
    
    # Generate forecast
    forecast = []
    current_date = end_date.date()
    
    from app.models.event import Event
    # Fetch events that match the zone or are global
    zone_events = await Event.find({"$or": [{"region": zone}, {"region": None}, {"region": "Global"}]}).to_list()

    for i in range(forecast_days):
        forecast_dt = datetime.combine(current_date + timedelta(days=i+1), datetime.min.time())
        
        # Calculate event risk for this specific forecast date and zone
        max_multiplier = 1.0
        for ev in zone_events:
            if ev.start_date.date() <= forecast_dt.date() <= ev.end_date.date():
                max_multiplier = max(max_multiplier, ev.risk_multiplier)

        # Baseline growth + event spike
        predicted_count = int(recent_avg * (1 + (i * 0.02)) * max_multiplier)
        
        forecast.append({
            "date": forecast_dt.date().isoformat(),
            "predicted_risk_events": predicted_count,
            "confidence": max(0.5, 1.0 - (i * 0.05)),
            "risk_level": "high" if predicted_count > recent_avg * 1.5 else "medium" if predicted_count > recent_avg else "low"
        })
    
    return {
        "zone": zone,
        "forecast": forecast,
        "forecast_days": forecast_days,
        "historical_average": recent_avg,
        "generated_at": end_date.isoformat()
    }
