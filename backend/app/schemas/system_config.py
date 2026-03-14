from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing import Optional, Annotated
from datetime import datetime
from app.models.system_config import RiskThresholds

class SystemConfigUpdate(BaseModel):
    risk_thresholds: Optional[RiskThresholds] = None
    prediction_confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    max_alerts_per_hour: Optional[int] = Field(None, ge=1)
    enable_audit_logging: Optional[bool] = None
    data_retention_days: Optional[int] = Field(None, ge=1)
    change_description: Optional[str] = None # For audit logging

class SystemConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Annotated[str, BeforeValidator(str)]
    risk_thresholds: RiskThresholds
    prediction_confidence_threshold: float
    max_alerts_per_hour: int
    enable_audit_logging: bool
    data_retention_days: int
    updated_at: datetime
    updated_by: Optional[str] = None
