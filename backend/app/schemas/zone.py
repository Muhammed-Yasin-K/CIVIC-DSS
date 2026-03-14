from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ZoneBase(BaseModel):
    name: str
    city: str
    region: str
    ward_id: Optional[str] = None
    population: int = 0
    area_sq_km: Optional[float] = None
    risk_level_override: Optional[str] = None
    description: Optional[str] = None

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    ward_id: Optional[str] = None
    population: Optional[int] = None
    area_sq_km: Optional[float] = None
    risk_level_override: Optional[str] = None
    description: Optional[str] = None

class ZoneResponse(ZoneBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
