from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from typing import List, Optional, Dict, Any
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogResponse, AuditLogFilter
from app.api.v1.auth import get_current_user
from app.models.user import User, UserRole
from app.services.export_service import ExportService
from datetime import datetime
import math

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("/", response_model=Dict[str, Any])
async def get_audit_logs(
    user: Optional[str] = None, # Username filter
    action_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Get audit logs with filtering and pagination (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view audit logs"
        )
        
    skip = (page - 1) * page_size
    query = AuditLog.find_all()
    
    if user:
        # Simple text search on user_email or user_id
        # Note: This is simplified, ideal would be to search User model first or store username
        pass # Not easily searchable without join or knowing if 'user' is id or email. 
        # But if the frontend sends a specific field, we can filter.
        # Frontend sends 'user' text input.
        # Let's assume we filter by user_email if it looks like email, or just skip if complex.
        # Ideally, audit logs should store 'username' too if we want to search by it easily.
        # Our model has user_email.
        query = query.find({"user_email": {"$regex": user, "$options": "i"}})
        
    if action_type:
        query = query.find(AuditLog.action == action_type)
        
    if start_date:
        query = query.find(AuditLog.timestamp >= start_date)
        
    if end_date:
        query = query.find(AuditLog.timestamp <= end_date)
        
    total_count = await query.count()
    logs = await query.skip(skip).limit(page_size).sort("-timestamp").to_list()
    
    total_pages = math.ceil(total_count / page_size)
    
    return {
        "logs": [AuditLogResponse.model_validate(log) for log in logs],
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.get("/export")
async def export_audit_logs(
    format: Optional[str] = "csv",
    user: Optional[str] = None,
    action_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user)
):
    """Export audit logs to CSV with filtering (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can export audit logs"
        )
        
    query = AuditLog.find_all()
    
    if user:
        query = query.find({"user_email": {"$regex": user, "$options": "i"}})
        
    if action_type:
        query = query.find(AuditLog.action == action_type)
        
    if start_date:
        query = query.find(AuditLog.timestamp >= start_date)
        
    if end_date:
        query = query.find(AuditLog.timestamp <= end_date)
        
    # For export, we usually want more than just one page, but maybe not everything if it's millions of records.
    # However, for Audit Logs in this context, we usually want all matching records.
    logs = await query.sort("-timestamp").to_list()
    
    csv_content, filename = ExportService.export_records_to_csv(logs, "audit_logs")
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
