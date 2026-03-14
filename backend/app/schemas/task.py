from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing import Optional, Annotated
from datetime import datetime
from app.models.task import TaskPriority, TaskStatus
from app.utils.date_utils import robust_parse_datetime

DateTime = Annotated[datetime, BeforeValidator(robust_parse_datetime)]

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[DateTime] = None
    location: Optional[str] = None
    event_id: Optional[str] = None
    notes: Optional[str] = None
    actions_taken: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[DateTime] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    actions_taken: Optional[str] = None

class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Annotated[str, BeforeValidator(str)]
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_by: Optional[str] = None
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime] = None
    location: Optional[str] = None
    event_id: Optional[str] = None
    notes: Optional[str] = None
    actions_taken: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

class TaskFilter(BaseModel):
    assigned_to: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    start_date: Optional[DateTime] = None
    end_date: Optional[DateTime] = None
    skip: int = 0
    limit: int = 50
