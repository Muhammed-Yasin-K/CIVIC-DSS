"""Inspection service for managing field inspections"""
from typing import List, Optional, Dict, Any
from beanie import PydanticObjectId
from fastapi import HTTPException, status
from datetime import datetime
from app.models.inspection import Inspection, InspectionStatus, InspectionPriority
from app.services.audit_service import AuditService
from app.utils.date_utils import get_current_ist


class InspectionService:
    """Service for inspection management operations"""
    
    @staticmethod
    async def create_inspection(inspection_data: Dict[str, Any], created_by: str) -> Inspection:
        """Create a new inspection"""
        from app.services.alert_service import AlertService
        from app.models.alert import AlertType, AlertSeverity
        inspection = Inspection(**inspection_data)
        await inspection.insert()
        
        # Log audit
        await AuditService.log_action(
            user_id=created_by,
            action="create_inspection",
            resource_type="inspection",
            resource_id=str(inspection.id),
            details={
                "location": inspection.location,
                "zone": inspection.zone,
                "priority": inspection.priority.value
            }
        )
        
        # Get Officer Full Name for the Alert Record
        from app.models.user import User
        officer = await User.get(PydanticObjectId(inspection.assigned_officer_id))
        officer_display = officer.full_name if officer and officer.full_name else str(inspection.assigned_officer_id)

        # Get Priority Label with Icon for the Form
        priority_label = f"{'🔴' if inspection.priority.value == 'critical' else '🟠' if inspection.priority.value == 'high' else '🟡' if inspection.priority.value == 'medium' else '🔵'} {inspection.priority.value.upper()}"

        # Dispatch alert to assigned officer
        alert = await AlertService.create_alert(
            title=f"New Inspection Assigned: {inspection.zone}",
            message=f"You have been assigned a new {inspection.priority.value} priority inspection at {inspection.location}.",
            alert_type=AlertType.SYSTEM_ALERT,
            severity=AlertSeverity.INFO,
            zone=inspection.zone,
            assigned_to=[officer_display],
            details={
                "Location": inspection.location,
                "Priority": priority_label,
                "Deployed On": get_current_ist().strftime("%d %b %Y, %I:%M %p"),
                "Tactical Instructions": inspection.description if inspection.description else "No instructions provided.",
                "Status": "Action Required"
            }
        )
        
        # Link Alert ID to Inspection for cascading delete/actions
        inspection.alert_id = str(alert.id)
        await inspection.save()
        
        return inspection
    
    @staticmethod
    async def get_inspection(inspection_id: str) -> Optional[Inspection]:
        """Get inspection by ID"""
        try:
            inspection = await Inspection.get(PydanticObjectId(inspection_id))
            return inspection
        except Exception:
            return None
    
    @staticmethod
    async def get_inspections(
        status: Optional[InspectionStatus] = None,
        zone: Optional[str] = None,
        officer_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Inspection]:
        """Get inspections with optional filtering"""
        query = {}
        
        if status:
            query["status"] = status
        if zone:
            query["zone"] = {"$regex": zone, "$options": "i"}
        if officer_id:
            query["assigned_officer_id"] = officer_id
        
        inspections = await Inspection.find(query).skip(skip).limit(limit).sort("-created_at").to_list()
        return inspections
    
    @staticmethod
    async def update_inspection(
        inspection_id: str,
        update_data: Dict[str, Any],
        updated_by: str
    ) -> Inspection:
        """Update inspection"""
        inspection = await InspectionService.get_inspection(inspection_id)
        
        if not inspection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inspection not found"
            )
        
        # Prevent changes if inspection is already completed or cancelled
        if inspection.status in [InspectionStatus.COMPLETED, InspectionStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inspection is already {inspection.status.value} and cannot be modified"
            )
        
        # Update fields
        for key, value in update_data.items():
            if hasattr(inspection, key):
                setattr(inspection, key, value)
        
        inspection.updated_at = datetime.utcnow()
        
        # Set completed_at if status changed to completed
        if update_data.get("status") == InspectionStatus.COMPLETED and not inspection.completed_at:
            inspection.completed_at = datetime.utcnow()
            
            # Dispatch RESOLVED email back to Admin
            from app.services.alert_service import AlertService
            from app.models.alert import AlertType, AlertSeverity
            
            # 1. Automatically resolve the associated alert if it exists
            if inspection.alert_id:
                try:
                    await AlertService.resolve_alert(
                        alert_id=inspection.alert_id,
                        user_id=updated_by, # Assuming updated_by is the user who completed the inspection
                        notes=inspection.findings,
                        actions=inspection.actions_taken
                    )
                except Exception as e:
                    # Log error but don't fail the inspection update
                    import logging
                    logging.error(f"Failed to auto-resolve alert {inspection.alert_id}: {e}")
        
        await inspection.save()
        
        # Log audit
        await AuditService.log_action(
            user_id=updated_by,
            action="update_inspection",
            resource_type="inspection",
            resource_id=str(inspection.id),
            details={"updated_fields": list(update_data.keys())}
        )
        
        return inspection
    
    @staticmethod
    async def delete_inspection(inspection_id: str, deleted_by: str) -> bool:
        """Delete inspection"""
        inspection = await InspectionService.get_inspection(inspection_id)
        
        if not inspection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inspection not found"
            )
        
        # Log audit
        await AuditService.log_action(
            user_id=deleted_by,
            action="delete_inspection",
            resource_type="inspection",
            resource_id=str(inspection.id),
            details={"location": inspection.location}
        )
        
        # Cascading Delete: Remove the associated alert 
        if inspection.alert_id:
            from app.models.alert import Alert
            alert = await Alert.get(inspection.alert_id)
            if alert:
                await alert.delete()

        await inspection.delete()
        return True
    
    @staticmethod
    async def get_inspection_stats(zone: Optional[str] = None) -> Dict[str, Any]:
        """Get inspection statistics"""
        query = {}
        if zone:
            query["zone"] = {"$regex": zone, "$options": "i"}
        
        inspections = await Inspection.find(query).to_list()
        
        stats = {
            "total": len(inspections),
            "pending": 0,
            "in_progress": 0,
            "completed": 0,
            "cancelled": 0,
            "by_priority": {
                "low": 0,
                "medium": 0,
                "high": 0,
                "critical": 0
            }
        }
        
        for inspection in inspections:
            # Count by status
            if inspection.status == InspectionStatus.PENDING:
                stats["pending"] += 1
            elif inspection.status == InspectionStatus.IN_PROGRESS:
                stats["in_progress"] += 1
            elif inspection.status == InspectionStatus.COMPLETED:
                stats["completed"] += 1
            elif inspection.status == InspectionStatus.CANCELLED:
                stats["cancelled"] += 1
            
            # Count by priority
            stats["by_priority"][inspection.priority.value] += 1
        
        return stats
