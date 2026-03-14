"""Model health and status API endpoints"""
from fastapi import APIRouter, Depends
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.ml.model_manager import model_manager

router = APIRouter(prefix="/models", tags=["ML Models"])


@router.get("/health")
async def get_model_health(current_user: User = Depends(get_current_user)):
    """
    Get ML model health status
    
    Returns information about loaded models and their status
    """
    model_info = model_manager.get_model_info()
    
    return {
        "status": "healthy" if model_info["total_models"] > 0 else "degraded",
        "models": {
            "xgboost": {
                "loaded": model_manager.is_model_loaded("xgboost"),
                "status": "ready" if model_manager.is_model_loaded("xgboost") else "not_loaded"
            },
            "arima": {
                "loaded": model_manager.is_model_loaded("arima"),
                "status": "ready" if model_manager.is_model_loaded("arima") else "not_loaded"
            }
        },
        "encoders": {
            "label_encoder": model_manager.get_encoder("label_encoder") is not None,
            "feature_columns": model_manager.get_encoder("feature_columns") is not None
        },
        "data": {
            "shap_values": model_manager.get_data("shap_values") is not None,
            "arima_forecast": model_manager.get_data("arima_forecast") is not None,
            "dbscan_hotspots": model_manager.get_data("dbscan_hotspots") is not None
        },
        "model_path": model_info["model_path"],
        "total_loaded": model_info["total_models"] + len(model_info.get("loaded_data", []))
    }


@router.post("/reload")
async def reload_models(current_user: User = Depends(get_current_user)):
    """
    Reload all ML models
    
    Requires authentication. Useful for updating models without restarting the server.
    """
    success = model_manager.reload_models()
    
    return {
        "success": success,
        "message": "Models reloaded successfully" if success else "Failed to reload some models",
        "model_info": model_manager.get_model_info()
    }
