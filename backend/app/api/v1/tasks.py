from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.models.task import Task, TaskStatus, TaskPriority
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskFilter
from app.api.v1.auth import get_current_user
from app.models.user import User, UserRole
from datetime import datetime
from app.utils.date_utils import get_current_ist

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new task"""
    from app.services.alert_service import AlertService
    from app.models.alert import AlertType, AlertSeverity
    # Officers can create tasks for themselves? Or only admins/managers?
    # Let's assume admins can assign to anyone, officers can create for themselves or report issues.
    # For now, simplistic: anyone can create.
    
    task_dict = task_data.model_dump()
    task_dict["assigned_by"] = str(current_user.id)
    
    # If not admin, can only assign to self
    if current_user.role != UserRole.ADMIN and task_data.assigned_to and task_data.assigned_to != str(current_user.id):
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can assign tasks to others"
        )
         
    task = Task(**task_dict)
    await task.create()
    
    # Dispatch alert to assigned officer if assigned
    if task.assigned_to:
        if task.event_id:
            from app.models.event import Event
            event = await Event.get(task.event_id)
            event_priority_label = "🔵 NORMAL"
            if event and hasattr(event, "priority") and event.priority == "sudden_action":
                event_priority_label = "🔴 SUDDEN ACTION"
                
            event_title = task.title.replace("Deployed Mission: ", "") if task.title.startswith("Deployed Mission: ") else task.title
            details = {
                "Event Name": event_title,
                "Target Zone": task.location if task.location else "Not Specified",
                "Priority Level": event_priority_label,
                "Target Date": task.due_date.strftime("%d %b %Y") if task.due_date else "ASAP",
                "Operational Directives": task.description or "No instructions provided.",
                "Status": "Action Required"
            }
            alert_title = f"Event Operations Deployed: {event_title}"
        else:
            details = {
                "Location": task.location if task.location else "Not Specified",
                "Priority": f"{'🔴' if task.priority.value == 'critical' else '🟠' if task.priority.value == 'high' else '🟡' if task.priority.value == 'medium' else '🔵'} {task.priority.value.upper()}",
                "Deployed On": get_current_ist().strftime("%d %b %Y, %I:%M %p"),
                "Tactical Instructions": task.description or "No instructions provided.",
                "Status": "Action Required"
            }
            alert_title = f"New Mission Deployed: {task.title}"

        # Get Officer Full Name for the Alert Record
        officer = await User.get(task.assigned_to)
        officer_display = officer.full_name if officer and officer.full_name else task.assigned_to

        alert = await AlertService.create_alert(
            title=alert_title,
            message=f"You have been assigned a new {task.priority.value} priority mission: {task.description or 'No description provided.'}",
            alert_type=AlertType.SYSTEM_ALERT,
            severity=AlertSeverity.INFO,
            zone=task.location if task.location else None,
            assigned_to=[officer_display],
            details=details
        )
        
        # Link Alert to Task
        await task.update({"$set": {"alert_id": str(alert.id)}})
        
    return task

@router.get("", response_model=List[TaskResponse])
async def get_tasks(
    assigned_to: Optional[str] = None,
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    event_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Get tasks with filters"""
    query = Task.find_all()
    
    # Officers can only see tasks assigned to them or created by them?
    # Or strict RBAC? Let's assume officers see only their tasks.
    if current_user.role == UserRole.OFFICER:
         query = query.find({"$or": [{"assigned_to": str(current_user.id)}, {"assigned_by": str(current_user.id)}]})
    elif assigned_to:
        query = query.find(Task.assigned_to == assigned_to)
        
    if status:
        query = query.find(Task.status == status)
        
    if priority:
        query = query.find(Task.priority == priority)
        
    if event_id:
        query = query.find(Task.event_id == event_id)
        
    tasks = await query.skip(skip).limit(limit).sort("-created_at").to_list()
    return tasks

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get task by ID"""
    task = await Task.get(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
        
    # Access check
    if current_user.role == UserRole.OFFICER:
        if task.assigned_to != str(current_user.id) and task.assigned_by != str(current_user.id):
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this task"
            )
            
    return task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update task"""
    task = await Task.get(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
        
    # Access check
    if current_user.role == UserRole.OFFICER:
        if task.assigned_to != str(current_user.id) and task.assigned_by != str(current_user.id):
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this task"
            )
        # Officers might only be able to update status
    
    # Prevent changes if task is already completed or cancelled
    if task.status in [TaskStatus.COMPLETED, TaskStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task is already {task.status.value} and cannot be modified"
        )
        
    update_dict = task_data.model_dump(exclude_unset=True)
    if update_dict:
        task.updated_at = datetime.utcnow()
        
        if "status" in update_dict and update_dict["status"] == TaskStatus.COMPLETED and task.status != TaskStatus.COMPLETED:
            task.completed_at = datetime.utcnow()
            
            # Dispatch RESOLVED email back to Admin
            from app.services.alert_service import AlertService
            from app.models.alert import AlertType, AlertSeverity
            
            # 1. Automatically resolve the associated alert if it exists
            if task.alert_id:
                try:
                    await AlertService.resolve_alert(
                        alert_id=task.alert_id,
                        user_id=str(current_user.id),
                        notes=task.notes,
                        actions=task.actions_taken
                    )
                except Exception as e:
                    # Log error but don't fail the task update
                    import logging
                    logging.error(f"Failed to auto-resolve alert {task.alert_id}: {e}")
            
        await task.update({"$set": update_dict})
        
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete task (Admin/Creator only)"""
    task = await Task.get(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
        
    if current_user.role != UserRole.ADMIN and task.assigned_by != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this task"
        )
        
    # Cascading Delete: Remove the associated alert 
    if task.alert_id:
        from app.models.alert import Alert
        alert = await Alert.get(task.alert_id)
        if alert:
            await alert.delete()

    await task.delete()
