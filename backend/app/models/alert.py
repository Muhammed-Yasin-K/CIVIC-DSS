"""Alert model for notifications and warnings"""
from beanie import Document
from pydantic import Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AlertType(str, Enum):
    """Alert type enumeration"""
    HOTSPOT_DETECTED = "hotspot_detected"
    HIGH_RISK_AREA = "high_risk_area"
    THRESHOLD_EXCEEDED = "threshold_exceeded"
    TREND_WARNING = "trend_warning"
    SYSTEM_ALERT = "system_alert"
    CUSTOM = "custom"


class AlertSeverity(str, Enum):
    """Alert severity enumeration"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    """Alert status enumeration"""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    COMPLETED = "completed"
    DISMISSED = "dismissed"


class Alert(Document):
    """Clean alert document model for form-based notifications"""
    
    # Core Information
    title: str = Field(..., min_length=5, max_length=200)
    message: str
    alert_type: AlertType
    severity: AlertSeverity
    status: AlertStatus = AlertStatus.ACTIVE
    
    # Location
    zone: Optional[str] = None
    
    # Dynamic Form Details (No more null top-level fields!)
    details: Optional[Dict[str, Any]] = None
    
    # Relationships
    assigned_to: List[str] = Field(default_factory=list)  # User IDs/Names
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    class Settings:
        name = "alerts"
        indexes = [
            "alert_type",
            "severity",
            "status",
            "zone",
            "created_at",
            "assigned_to"
        ]
    
    class Config:
        # Crucial for preventing 'null' from being stored
        json_schema_extra = {
            "example": {
                "title": "Tactical Mission Deployed: Area Inspection",
                "alert_type": "inspection",
                "severity": "medium",
                "status": "active",
                "details": {
                    "Location": "Ward 94",
                    "Priority": "🔵 NORMAL",
                    "Status": "Action Required"
                }
            }
        }
