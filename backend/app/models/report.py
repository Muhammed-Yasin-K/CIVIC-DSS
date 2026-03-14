"""Report model for analytics and summaries"""
from beanie import Document
from pydantic import Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class ReportType(str, Enum):
    """Report type enumeration"""
    DAILY_SUMMARY = "daily_summary"
    WEEKLY_SUMMARY = "weekly_summary"
    MONTHLY_SUMMARY = "monthly_summary"
    ZONE_ANALYSIS = "zone_analysis"
    CATEGORY_ANALYSIS = "category_analysis"
    CUSTOM = "custom"


class ReportFormat(str, Enum):
    """Report format enumeration"""
    JSON = "json"
    PDF = "pdf"
    CSV = "csv"
    HTML = "html"


class ReportStatus(str, Enum):
    """Report status enumeration"""
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class Report(Document):
    """Report document model for analytics"""
    
    # Report metadata
    title: str = Field(..., min_length=5, max_length=200)
    description: Optional[str] = None
    report_type: ReportType
    format: ReportFormat = ReportFormat.JSON
    status: ReportStatus = ReportStatus.GENERATING
    
    # Time period
    start_date: datetime
    end_date: datetime
    
    # Scope
    zones: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    
    # Report data
    data: Dict[str, Any] = Field(default_factory=dict)
    
    # Statistics
    total_events: int = 0
    total_alerts: int = 0
    total_tasks: int = 0
    total_inspections: int = 0
    
    # Risk metrics
    high_risk_areas: List[Dict[str, Any]] = Field(default_factory=list)
    hotspots_detected: int = 0
    average_risk_score: Optional[float] = None
    
    # Trends
    trends: List[Dict[str, Any]] = Field(default_factory=list)
    predictions: Dict[str, Any] = Field(default_factory=dict)
    
    # File storage
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[int] = None  # in bytes
    
    # Generation details
    generated_by: Optional[str] = None  # User ID
    generation_time: Optional[float] = None  # in seconds
    error_message: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    class Settings:
        name = "reports"
        indexes = [
            "report_type",
            "status",
            "created_at",
            "start_date",
            "end_date"
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Weekly Zone A Analysis",
                "report_type": "zone_analysis",
                "format": "json",
                "zones": ["Zone A"],
                "total_events": 45,
                "total_alerts": 10,
                "total_tasks": 5
            }
        }
