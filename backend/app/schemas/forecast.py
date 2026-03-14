"""Forecast schemas for API response validation"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ForecastBase(BaseModel):
    date: datetime
    zone: str
    predicted_value: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    confidence: float
    model_type: str

    model_config = {
        "protected_namespaces": ()
    }


class ForecastCreate(ForecastBase):
    pass


class ForecastResponse(ForecastBase):
    created_at: datetime
