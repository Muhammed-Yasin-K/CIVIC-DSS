"""Audit logging service"""
from typing import Dict, Any, Optional
from app.models.audit_log import AuditLog
from datetime import datetime


class AuditService:
    """Service for audit logging operations"""
    
    @staticmethod
    async def log_action(
        user_id: Optional[str],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        user_email: Optional[str] = None,
        status: str = "success"
    ) -> AuditLog:
        """Log an audit action"""
        from app.models.system_config import SystemConfig
        config = await SystemConfig.find_one()
        if config and not config.enable_audit_logging:
            return None

        audit_log = AuditLog(
            user_id=user_id,
            user_email=user_email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            status=status,
            timestamp=datetime.utcnow()
        )
        
        await audit_log.insert()
        return audit_log

    @staticmethod
    async def log_data_event(
        action: str,
        details: Optional[Dict[str, Any]] = None,
        user: Optional[Any] = None,
        status: str = "success"
    ) -> AuditLog:
        """Helper for data management logging"""
        return await AuditService.log_action(
            user_id=str(user.id) if user else "system",
            user_email=user.email if user else "system",
            action=action,
            resource_type="data_management",
            details=details,
            status=status
        )
