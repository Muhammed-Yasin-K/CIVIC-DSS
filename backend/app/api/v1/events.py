from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.models.event import Event, EventType
from app.schemas.event import EventCreate, EventUpdate, EventResponse, EventFilter
from app.api.v1.auth import get_current_user
from app.models.user import User, UserRole
from app.services.audit_service import AuditService
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["Events"])

@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new event (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create events"
        )
    
    event = Event(**event_data.model_dump())
    await event.create()
    
    await AuditService.log_action(
        user_id=str(current_user.id),
        user_email=current_user.email,
        action="register_strategic_event",
        resource_type="event",
        resource_id=str(event.id),
        details={"name": event.name, "multiplier": event.risk_multiplier}
    )
    
    return event

@router.get("/", response_model=List[EventResponse])
async def get_events(
    event_type: Optional[EventType] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user)
):
    """Get events with filters"""
    query = Event.find_all()
    
    if event_type:
        query = query.find(Event.event_type == event_type)
    
    if start_date:
        query = query.find(Event.end_date >= start_date)
        
    if end_date:
        query = query.find(Event.start_date <= end_date)
        
    events = await query.skip(skip).limit(limit).sort("-start_date").to_list()
    return events

@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get event by ID"""
    event = await Event.get(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    return event

@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    event_data: EventUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update event (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update events"
        )
        
    event = await Event.get(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
        
    update_dict = event_data.model_dump(exclude_unset=True)
    if update_dict:
        event.updated_at = datetime.utcnow()
        await event.update({"$set": update_dict})
        
    return event

@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete event (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete events"
        )
        
    event = await Event.get(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
        
    # Cascading deletion: Delete all tasks associated with this event
    from app.models.task import Task
    associated_tasks = await Task.find(Task.event_id == str(event.id)).to_list()
    if associated_tasks:
        for task in associated_tasks:
            await task.delete()
        logger.info(f"Deleted {len(associated_tasks)} tasks associated with event {event_id}")

    from app.services.audit_service import AuditService
    await AuditService.log_action(
        user_id=str(current_user.id),
        user_email=current_user.email,
        action="purge_strategic_event",
        resource_type="event",
        resource_id=str(event.id),
        details={"name": event.name}
    )

    await event.delete()
