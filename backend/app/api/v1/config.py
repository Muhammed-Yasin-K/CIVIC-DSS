from fastapi import APIRouter, Depends, HTTPException, status
from app.models.system_config import SystemConfig
from app.schemas.system_config import SystemConfigResponse, SystemConfigUpdate
from app.api.v1.auth import get_current_user
from app.models.user import User, UserRole
from app.services.audit_service import AuditService
from datetime import datetime

router = APIRouter(prefix="/config", tags=["System Configuration"])

async def get_or_create_config() -> SystemConfig:
    """Helper to get the singleton config or create it if missing"""
    config = await SystemConfig.find_one()
    if not config:
        config = SystemConfig()
        await config.create()
    return config

@router.get("/", response_model=SystemConfigResponse)
async def get_config(
    current_user: User = Depends(get_current_user)
):
    """Get system configuration (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view system configuration"
        )
        
    return await get_or_create_config()

@router.put("/", response_model=SystemConfigResponse)
async def update_config(
    config_data: SystemConfigUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update system configuration (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update system configuration"
        )
        
    config = await get_or_create_config()
    
    # Update primitive fields
    if config_data.prediction_confidence_threshold is not None:
        config.prediction_confidence_threshold = config_data.prediction_confidence_threshold
    if config_data.max_alerts_per_hour is not None:
        config.max_alerts_per_hour = config_data.max_alerts_per_hour
    if config_data.enable_audit_logging is not None:
        config.enable_audit_logging = config_data.enable_audit_logging
    if config_data.data_retention_days is not None:
        config.data_retention_days = config_data.data_retention_days
        
    # Update nested risk_thresholds
    if config_data.risk_thresholds:
        from app.models.system_config import RiskThresholds
        rt = config_data.risk_thresholds
        config.risk_thresholds = RiskThresholds(
            low_max=rt.low_max,
            medium_max=rt.medium_max,
            high_min=rt.high_min
        )
        
    config.updated_at = datetime.utcnow()
    config.updated_by = getattr(current_user, "username", current_user.email)
    
    await config.save()
    
    # Create audit log
    if config_data.change_description:
        await AuditService.log_action(
            user_id=str(current_user.id),
            user_email=current_user.email,
            action="update_config",
            resource_type="system_config",
            resource_id=str(config.id),
            details={"description": config_data.change_description},
            status="success"
        )
            
    return config
