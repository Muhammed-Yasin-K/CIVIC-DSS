"""FastAPI application entry point - Predictive Hotspots v1.5"""# Reload: conflict fixes applied
# Fix for passlib/bcrypt 4.0.0+ incompatibility
try:
    import bcrypt
    if not hasattr(bcrypt, "__about__"):
        class About:
            __version__ = getattr(bcrypt, "__version__", "unknown")
        bcrypt.__about__ = About()
except ImportError:
    pass

from fastapi import FastAPI
from contextlib import asynccontextmanager
import logging
import os
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.middleware.cors import setup_cors
from app.middleware.error_handler import setup_exception_handlers
from app.api.v1 import auth, predictions, analytics, hotspots, alerts, reports, events, audit_logs, config, knowledge_base, tasks, users, inspections, risk_analysis, models, support, zones

# Configure logging
_log_dir = os.path.dirname(settings.LOG_FILE)
if _log_dir:
    os.makedirs(_log_dir, exist_ok=True)
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(settings.LOG_FILE),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Civic Risk Backend...")
    
    # 1. Primary initialization: Database connection
    # This remains blocking as the app cannot function without DB
    try:
        await connect_to_mongo()
    except Exception as e:
        logger.critical(f"CRITICAL: Failed to connect to MongoDB on startup: {e}")
        # We don't raise here to allow the process to stay alive for debugging/health check
        # but the app will be in a degraded state.
    
    # 2. Secondary initialization: ML models and Seeding
    # These are wrapped in a try-except to avoid crashing the whole server
    # and we perform them sequentially.
    from app.ml.model_manager import model_manager
    from app.services.forecast_service import ForecastService
    
    async def initialize_background_tasks():
        try:
            from app.core.database import db
            # Wait for Beanie initialization (max 60 seconds)
            wait_count = 0
            logger.info("Background tasks waiting for database initialization...")
            while not db.initialized and wait_count < 120:
                await asyncio.sleep(0.5)
                wait_count += 1
                if wait_count % 20 == 0:
                    logger.info(f"Still waiting for DB initialization ({wait_count//2}s elapsed)...")
            
            if not db.initialized:
                logger.error("Database initialization TIMED OUT after 60s. Background tasks aborted.")
                return

            logger.info("Database link verified. Initializing ML models and background data tasks...")
            model_manager.load_all_models()
            
            # Auto-update forecasts if DB is connected
            from app.core.database import get_db
            db_instance = await get_db()
            if db_instance is not None:
                # 1. Hotspots seeding
                from app.services.hotspot_service import HotspotService
                logger.info("Checking for hotspot seed data...")
                await HotspotService.seed_hotspots_if_empty()
                
                # 2. Global ARIMA forecast
                logger.info("Synchronizing global forecasts...")
                await ForecastService.auto_update_forecasts()
                
                # 3. Regional forecasts
                logger.info("Synchronizing regional forecasts...")
                await ForecastService.auto_update_regional_forecasts()
                
                logger.info("ML Models and Data initialization completed successfully.")
            else:
                logger.warning("Database unavailable — skipping auto-updates and seeding.")
        except Exception as e:
            logger.error(f"Failed to initialize background tasks: {e}")
            import traceback
            traceback.print_exc()

    # We run this in the background if possible, or just catch all errors
    import asyncio
    asyncio.create_task(initialize_background_tasks())
    
    logger.info("Application lifespan startup sequence completed")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Civic Risk Backend...")
    await close_mongo_connection()
    logger.info("Application shut down successfully")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Civic Risk Management Backend API with ML-powered predictions",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None
)

# Setup middleware
setup_cors(app)
setup_exception_handlers(app)

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(predictions.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(hotspots.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(audit_logs.router, prefix="/api/v1")
app.include_router(config.router, prefix="/api/v1")
app.include_router(knowledge_base.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(inspections.router, prefix="/api/v1")
app.include_router(risk_analysis.router, prefix="/api/v1")
app.include_router(models.router, prefix="/api/v1")
app.include_router(support.router, prefix="/api/v1")
app.include_router(zones.router, prefix="/api/v1/zones", tags=["Zones"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Civic Risk Management API",
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/api/v1/health")
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "api_v1": "active"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )

