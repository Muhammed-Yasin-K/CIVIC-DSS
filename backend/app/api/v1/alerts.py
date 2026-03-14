"""Alert API endpoints"""
from fastapi import APIRouter, Depends
from typing import List, Optional
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.alert import Alert
from app.services.alert_service import AlertService
import re

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/", response_model=List[dict])
async def get_alerts(
    zone: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get alerts with role-based visibility"""
    
    # Regional Filtering for Officers
    if current_user.role == "officer":
        if current_user.assigned_zones:
            zone = "|".join([re.escape(z) for z in current_user.assigned_zones])
        elif current_user.jurisdiction:
            zone = current_user.jurisdiction

    # Fetch alerts using service
    alerts_data = await AlertService.get_active_alerts(zone, status)
    
    # Response mapping: Only include existing fields (No nulls)
    return [
        {k: v for k, v in alert.model_dump().items() if v is not None}
        for alert in alerts_data
    ]


@router.get("/my-alerts", response_model=List[dict])
async def get_my_alerts(current_user: User = Depends(get_current_user)):
    """Get alerts assigned to current user"""
    # Officers can see alerts where their name or ID is in 'assigned_to'
    alerts = await Alert.find({
        "assigned_to": {"$in": [str(current_user.id), current_user.full_name]}
    }).sort("-created_at").to_list()
    
    return [
        {k: v for k, v in alert.model_dump().items() if v is not None}
        for alert in alerts
    ]


@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    notes: Optional[str] = None,
    actions: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Finalize and Complete an alert"""
    alert = await AlertService.resolve_alert(
        alert_id=alert_id, 
        user_id=str(current_user.id),
        notes=notes,
        actions=actions
    )
    
    return {
        "message": "Mission Finalized & Completed",
        "alert_id": str(alert.id),
        "completed_at": alert.completed_at
    }


@router.get("/statistics")
async def get_alert_statistics(
    zone: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get clean alert performance stats"""
    if current_user.role == "officer":
        if current_user.assigned_zones:
            zone = "|".join([re.escape(z) for z in current_user.assigned_zones])
        elif current_user.jurisdiction:
            zone = current_user.jurisdiction
        
    return await AlertService.get_alert_statistics(zone)


@router.get("/count")
async def get_alert_count(
    current_user: User = Depends(get_current_user)
):
    """Get high-level status counts"""
    from app.models.alert import Alert, AlertStatus
    
    query = {}
    if current_user.role == "officer":
        zones = current_user.assigned_zones or ([current_user.jurisdiction] if current_user.jurisdiction else [])
        if zones:
            regex_pattern = "|".join([re.escape(z) for z in zones])
            query = {"zone": {"$regex": regex_pattern, "$options": "i"}}

    total = await Alert.find(query).count()
    active = await Alert.find({**query, "status": AlertStatus.ACTIVE}).count()
    completed = await Alert.find({**query, "status": AlertStatus.RESOLVED}).count()
    
    return {
        "total": total,
        "active": active,
        "completed": completed
    }
