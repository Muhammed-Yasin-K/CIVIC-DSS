from pydantic import BaseModel, ConfigDict, BeforeValidator
from typing import Optional, Any, Annotated, Union, Dict
from datetime import datetime

class AuditLogCreate(BaseModel):
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[str] = None
    status: str = "success"

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Annotated[str, BeforeValidator(str)]
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[Union[str, Dict[str, Any]]] = None
    status: str
    ip_address: Optional[str] = None
    timestamp: datetime

class AuditLogFilter(BaseModel):
    user_id: Optional[str] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    skip: int = 0
    limit: int = 50
