"""Analytics schemas for request/response validation"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class AnalyticsFilter(BaseModel):
    """Analytics filter parameters"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    zones: Optional[List[str]] = None


class DashboardStats(BaseModel):
    """Dashboard statistics response"""
    total_events: int
    active_alerts: int
    high_risk_areas: int
    active_officers: int
    online_officers: int
    monitored_zones: int
    system_uptime: float
    average_prediction_confidence: float
    average_risk_score: float
    risk_level_distribution: Dict[str, int]
    alerts: Optional[List[Dict[str, Any]]] = []
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_events": 150,
                "active_alerts": 5,
                "high_risk_areas": 3,
                "average_prediction_confidence": 0.85,
                "risk_level_distribution": {"low": 100, "medium": 40, "high": 10}
            }
        }


class CategoryStats(BaseModel):
    """Category statistics"""
    category: str
    count: int
    percentage: float
    avg_resolution_time: Optional[float] = None


class ZoneStats(BaseModel):
    """Zone statistics"""
    zone: str
    total_events: int
    risk_score: float
    hotspot_count: int


class TrendData(BaseModel):
    """Trend data for time series"""
    date: datetime
    count: int
    category: Optional[str] = None


class AnalyticsResponse(BaseModel):
    """Comprehensive analytics response"""
    dashboard_stats: DashboardStats
    category_breakdown: List[CategoryStats]
    zone_breakdown: List[ZoneStats]
    trends: List[TrendData]
    top_issues: List[Dict[str, Any]]
    
    class Config:
        json_schema_extra = {
            "example": {
                "dashboard_stats": {
                    "total_complaints": 150,
                    "pending_complaints": 45,
                    "resolved_complaints": 90
                },
                "category_breakdown": [],
                "zone_breakdown": [],
                "trends": [],
                "top_issues": []
            }
        }


class HeatmapData(BaseModel):
    """Heatmap data point"""
    latitude: float
    longitude: float
    intensity: float
    count: int
    zone: Optional[str] = None
