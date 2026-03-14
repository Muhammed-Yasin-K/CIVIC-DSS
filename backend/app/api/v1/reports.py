"""Report generation API endpoints"""
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta
from app.api.v1.auth import get_current_user
from app.models.user import User, UserRole
from app.models.report import ReportType, ReportFormat
from app.models.task import Task
from app.models.inspection import Inspection
from app.models.alert import Alert
from app.services.report_service import ReportService
from app.services.export_service import ExportService
from fastapi.responses import Response, JSONResponse
from fastapi import HTTPException, status

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/generate")
async def generate_report(
    title: str,
    report_type: ReportType,
    format: ReportFormat = ReportFormat.JSON,
    days: int = Query(7, ge=1, le=365),
    zones: Optional[List[str]] = Query(None),
    categories: Optional[List[str]] = Query(None),
    region: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Generate a new report"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    report = await ReportService.generate_report(
        title=title,
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        zones=zones,
        categories=categories,
        generated_by=str(current_user.id),
        region=region
    )
    
    # Update format if requested
    if format != ReportFormat.JSON:
        report.format = format
        await report.save()
        # Re-run generation logic if needed or just handle in export
    
    return {
        "report_id": str(report.id),
        "title": report.title,
        "status": report.status,
        "format": report.format,
        "created_at": report.created_at
    }


@router.get("/{report_id}/export")
async def export_report(
    report_id: str,
    format: ReportFormat = ReportFormat.CSV,
    current_user: User = Depends(get_current_user)
):
    """Export report in specified format"""
    from fastapi.responses import Response, JSONResponse
    
    report = await ReportService.get_report(report_id)
    if not report:
        return JSONResponse(status_code=404, content={"detail": "Report not found"})
        
    if format == ReportFormat.CSV:
        csv_content = await ReportService.generate_csv_export(report)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=report_{report_id}.csv"
            }
        )
    
    if format == ReportFormat.PDF:
        pdf_content = await ReportService.generate_pdf_export(report)
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=report_{report_id}.pdf"
            }
        )
    
    return JSONResponse(status_code=400, content={"detail": "Unsupported export format"})


@router.get("/export/users")
async def export_users(current_user: User = Depends(get_current_user)):
    """Export all users raw data to CSV"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
        
    csv_content, filename = await ExportService.export_to_csv(User, "users_export")
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/tasks")
async def export_tasks(current_user: User = Depends(get_current_user)):
    """Export all tasks raw data to CSV"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
        
    csv_content, filename = await ExportService.export_to_csv(Task, "tasks_export")
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/inspections")
async def export_inspections(current_user: User = Depends(get_current_user)):
    """Export all inspections raw data to CSV"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
        
    csv_content, filename = await ExportService.export_to_csv(Inspection, "inspections_export")
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/alerts")
async def export_alerts(current_user: User = Depends(get_current_user)):
    """Export all alerts raw data to CSV"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
        
    csv_content, filename = await ExportService.export_to_csv(Alert, "alerts_export")
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get report by ID"""
    report = await ReportService.get_report(report_id)
    
    if not report:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    return {
        "id": str(report.id),
        "title": report.title,
        "report_type": report.report_type,
        "status": report.status,
        "start_date": report.start_date,
        "end_date": report.end_date,
        "zones": report.zones,
        "categories": report.categories,
        "data": report.data,
        "total_events": report.total_events,
        "total_alerts": report.total_alerts,
        "total_tasks": report.total_tasks,
        "total_inspections": report.total_inspections,
        "high_risk_areas": report.high_risk_areas,
        "created_at": report.created_at,
        "completed_at": report.completed_at
    }


@router.get("")
async def get_reports(
    report_type: Optional[ReportType] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    unique_only: bool = Query(True),
    current_user: User = Depends(get_current_user)
):
    """Get list of reports"""
    reports = await ReportService.get_reports(
        report_type=report_type,
        skip=skip,
        limit=limit,
        unique_only=unique_only
    )
    
    return [
        {
            "id": str(r.id),
            "title": r.title,
            "report_type": r.report_type,
            "status": r.status,
            "created_at": r.created_at,
            "completed_at": r.completed_at
        }
        for r in reports
    ]
