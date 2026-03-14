"""Alert service for notification management"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.alert import Alert, AlertType, AlertSeverity, AlertStatus
from app.models.user import User
from app.utils.email_utils import send_alert_email
import logging

logger = logging.getLogger(__name__)


class AlertService:
    """Alert management service"""
    
    @staticmethod
    async def create_alert(
        title: str,
        message: str,
        alert_type: AlertType,
        severity: AlertSeverity,
        zone: Optional[str] = None,
        assigned_to: Optional[List[str]] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> Alert:
        """Create a new clean alert"""
        alert = Alert(
            title=title,
            message=message,
            alert_type=alert_type,
            severity=severity,
            zone=zone,
            assigned_to=assigned_to or [],
            details=details
        )
        
        await alert.insert()
        
        import asyncio
        # Notify relevant users via email in background
        asyncio.create_task(AlertService.notify_users(alert))
        
        return alert
    
    @staticmethod
    async def get_active_alerts(zone: Optional[str] = None, status: Optional[str] = None) -> List[Alert]:
        """Get alerts filtered by zone and status (defaults to ACTIVE)"""
        query = {}
        # Map 'pending' and 'completed' to multiple internal statuses
        if status == "pending":
            query["status"] = {"$in": [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED]}
        elif status == "completed":
            query["status"] = {"$in": [AlertStatus.RESOLVED, AlertStatus.COMPLETED]}
        elif status:
            query["status"] = status
        else:
            query["status"] = AlertStatus.ACTIVE
            
        if zone:
            query["zone"] = {"$regex": zone, "$options": "i"}
        
        return await Alert.find(query).sort("-created_at").to_list()
    
    @staticmethod
    async def resolve_alert(alert_id: str, user_id: str, notes: Optional[str] = None, actions: Optional[str] = None) -> Alert:
        """Resolve an alert and update the 'form' details"""
        alert = await Alert.get(alert_id)
        if not alert:
            raise ValueError("Alert not found")
        
        # Get Real User Name for completion
        user = await User.get(user_id)
        real_name = user.full_name if user else "Unknown Officer"

        # Distinguish between Task and Inspection for status
        if "inspection" in alert.title.lower():
            alert.status = AlertStatus.RESOLVED
        else:
            alert.status = AlertStatus.COMPLETED
            
        alert.completed_at = datetime.utcnow()
        
        # 1. Update the 'Form' details with completion data
        if not alert.details:
            alert.details = {}
            
        alert.details["Status"] = "Completed"
        alert.details["Completed By"] = real_name
        
        if "inspection" in alert.title.lower():
            # For Inspections: Location, Findings, Actions, Completed By
            # Location stays if it was already there
            if notes: alert.details["OFFICER FINDINGS"] = notes
            if actions: alert.details["ACTIONS TAKEN"] = actions
            # Remove instruction field to clean up final report if needed (optional, keeping it simple)
        else:
            # For Tasks: Event Name, Location, Assigned Officer, Updates, tactical actions
            # Use original "Target Zone" as Location if Location not present
            if "Target Zone" in alert.details:
                alert.details["Location"] = alert.details.pop("Target Zone")
            
            # Use the first name from assigned_to for "Assigned Officer"
            if alert.assigned_to:
                alert.details["Assigned Officer"] = alert.assigned_to[0]

            if notes: alert.details["MISSION UPDATES & FINDINGS"] = notes
            if actions: alert.details["TACTICAL ACTIONS TAKEN"] = actions

        # Update title to reflect completion for emails/dashboard
        if " [COMPLETED]" not in alert.title:
            alert.title += " [COMPLETED]"

        await alert.save()
        
        import asyncio
        # Notify completion in background
        asyncio.create_task(AlertService.notify_users(alert))
        
        return alert

    @staticmethod
    async def notify_users(alert: Alert) -> None:
        """Send professional dispatch emails"""
        try:
            users_to_notify = []
            
            is_success = alert.status in [AlertStatus.RESOLVED, AlertStatus.COMPLETED]
            
            if is_success:
                # MISSION COMPLETED: Strictly Notify Admins only (for reports)
                unique_users = await User.find({"role": "admin", "is_active": True}).to_list()
            else:
                # MISSION DEPLOYED: Strictly Notify assigned Officers only (for field action)
                assigned_candidates = []
                for user_id in alert.assigned_to:
                    user = None
                    try:
                        from beanie import PydanticObjectId
                        user = await User.get(PydanticObjectId(user_id))
                    except:
                        user = await User.find_one(User.full_name == user_id)
                    
                    if user and user.is_active and user.role != "admin":
                        assigned_candidates.append(user)
                
                # Use dict for uniqueness
                unique_users = {str(u.id): u for u in assigned_candidates}.values()
            
            for user in unique_users:
                try:
                    # Using send_alert_email which handles the HTML form table
                    await send_alert_email(
                        to_email=user.email,
                        alert_title=alert.title,
                        alert_message=alert.message,
                        severity=alert.severity,
                        zone=alert.zone if alert.zone else "Global",
                        extra_details=alert.details
                    )
                except Exception as e:
                    logger.error(f"Email failed for {user.email}: {e}")
            
        except Exception as e:
            logger.error(f"Dispatch failed for alert {alert.id}: {e}")

    @staticmethod
    async def get_alert_statistics(zone: Optional[str] = None) -> Dict[str, Any]:
        """Aggregate alert performance"""
        base_query = {}
        if zone:
            base_query["zone"] = {"$regex": zone, "$options": "i"}
        
        return {
            "total": await Alert.find(base_query).count(),
            "active": await Alert.find({**base_query, "status": {"$in": [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED]}}).count(),
            "resolved": await Alert.find({**base_query, "status": {"$in": [AlertStatus.RESOLVED, AlertStatus.COMPLETED]}}).count(),
            "critical": await Alert.find({**base_query, "severity": AlertSeverity.CRITICAL}).count()
        }
