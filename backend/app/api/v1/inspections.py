"""Inspection API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
import re
from typing import List, Optional
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.inspection import InspectionStatus
from app.schemas.inspection import InspectionCreate, InspectionUpdate, InspectionResponse, InspectionStats
from app.services.inspection_service import InspectionService

router = APIRouter(prefix="/inspections", tags=["Inspections"])


@router.post("", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    inspection_data: InspectionCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new inspection"""
    inspection = await InspectionService.create_inspection(
        inspection_data.model_dump(),
        created_by=str(current_user.id)
    )
    
    return InspectionResponse(
        id=str(inspection.id),
        alert_id=inspection.alert_id,
        location=inspection.location,
        zone=inspection.zone,
        assigned_officer_id=inspection.assigned_officer_id,
        assigned_officer_name=inspection.assigned_officer_name,
        scheduled_date=inspection.scheduled_date,
        status=inspection.status.value,
        priority=inspection.priority.value,
        description=inspection.description,
        findings=inspection.findings,
        actions_taken=inspection.actions_taken,
        photos=inspection.photos,
        created_at=inspection.created_at,
        updated_at=inspection.updated_at,
        completed_at=inspection.completed_at
    )


@router.get("", response_model=List[InspectionResponse])
async def get_inspections(
    status: Optional[str] = Query(None),
    zone: Optional[str] = Query(None),
    officer_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user)
):
    """Get inspections with optional filtering"""
    # Convert status string to enum if provided
    status_enum = None
    if status:
        try:
            status_enum = InspectionStatus(status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status}"
            )
    
    # Officers can only see their own inspections
    if current_user.role.value == "officer":
        if not officer_id:
            officer_id = str(current_user.id)
        # When fetching by officer_id, skip zone filter so cross-city
        # assignments (e.g., Ward in Hyderabad assigned to a Kerala officer) still appear.
        # Only apply zone filter for browsing without an officer_id (admin use).
        if officer_id:
            zone = None
    
    inspections = await InspectionService.get_inspections(
        status=status_enum,
        zone=zone,
        officer_id=officer_id,
        skip=skip,
        limit=limit
    )
    
    return [
        InspectionResponse(
            id=str(inspection.id),
            alert_id=inspection.alert_id,
            location=inspection.location,
            zone=inspection.zone,
            assigned_officer_id=inspection.assigned_officer_id,
            assigned_officer_name=inspection.assigned_officer_name,
            scheduled_date=inspection.scheduled_date,
            status=inspection.status.value,
            priority=inspection.priority.value,
            description=inspection.description,
            findings=inspection.findings,
            actions_taken=inspection.actions_taken,
            photos=inspection.photos,
            created_at=inspection.created_at,
            updated_at=inspection.updated_at,
            completed_at=inspection.completed_at
        )
        for inspection in inspections
    ]


@router.get("/stats", response_model=InspectionStats)
async def get_inspection_stats(
    zone: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get inspection statistics"""
    # Force regional/jurisdiction filter for officers
    if current_user.role == "officer":
        if current_user.assigned_zones:
             zone = "|".join([re.escape(z) for z in current_user.assigned_zones])
        elif current_user.jurisdiction:
            zone = current_user.jurisdiction
            
    stats = await InspectionService.get_inspection_stats(zone=zone)
    
    return InspectionStats(**stats)


@router.get("/{inspection_id}", response_model=InspectionResponse)
async def get_inspection(
    inspection_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get inspection by ID"""
    inspection = await InspectionService.get_inspection(inspection_id)
    
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection not found"
        )
    
    return InspectionResponse(
        id=str(inspection.id),
        alert_id=inspection.alert_id,
        location=inspection.location,
        zone=inspection.zone,
        assigned_officer_id=inspection.assigned_officer_id,
        assigned_officer_name=inspection.assigned_officer_name,
        scheduled_date=inspection.scheduled_date,
        status=inspection.status.value,
        priority=inspection.priority.value,
        description=inspection.description,
        findings=inspection.findings,
        actions_taken=inspection.actions_taken,
        photos=inspection.photos,
        created_at=inspection.created_at,
        updated_at=inspection.updated_at,
        completed_at=inspection.completed_at
    )


@router.put("/{inspection_id}", response_model=InspectionResponse)
async def update_inspection(
    inspection_id: str,
    update_data: InspectionUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update inspection"""
    inspection = await InspectionService.update_inspection(
        inspection_id,
        update_data.model_dump(exclude_unset=True),
        updated_by=str(current_user.id)
    )
    
    return InspectionResponse(
        id=str(inspection.id),
        alert_id=inspection.alert_id,
        location=inspection.location,
        zone=inspection.zone,
        assigned_officer_id=inspection.assigned_officer_id,
        assigned_officer_name=inspection.assigned_officer_name,
        scheduled_date=inspection.scheduled_date,
        status=inspection.status.value,
        priority=inspection.priority.value,
        description=inspection.description,
        findings=inspection.findings,
        actions_taken=inspection.actions_taken,
        photos=inspection.photos,
        created_at=inspection.created_at,
        updated_at=inspection.updated_at,
        completed_at=inspection.completed_at
    )


@router.delete("/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inspection(
    inspection_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete inspection"""
    await InspectionService.delete_inspection(
        inspection_id,
        deleted_by=str(current_user.id)
    )
    return None
