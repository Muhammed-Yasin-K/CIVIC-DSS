"""MongoDB database connection and initialization"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from beanie import init_beanie
from app.core.config import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class Database:
    """Database connection manager"""
    
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    initialized: bool = False


db = Database()


def get_database() -> Optional[AsyncIOMotorDatabase]:
    """
    Get database instance
    
    Returns:
        Optional MongoDB database instance
    """
    if not db.initialized:
        logger.warning("Accessing database before initialization!")
    return db.db


async def get_db() -> Optional[AsyncIOMotorDatabase]:
    """
    Get database instance (async wrapper for consistency)
    
    Returns:
       Optional MongoDB database instance
    """
    if db.db is None:
        logger.warning("Database not initialized. Ensure connect_to_mongo() was called.")
    return db.db


async def connect_to_mongo():
    """Connect to MongoDB database"""
    try:
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}")
        
        # Add connection timeouts and SSL flexibility for local development
        # serverSelectionTimeoutMS prevents hanging forever if DB is down
        db.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            tlsAllowInvalidCertificates=True # Helpful for Windows/Local dev environments
        )
        db.db = db.client[settings.DATABASE_NAME]
        
        from app.models.user import User
        from app.models.prediction import Prediction
        from app.models.hotspot import Hotspot
        from app.models.forecast import Forecast
        from app.models.alert import Alert
        from app.models.report import Report
        from app.models.event import Event
        from app.models.audit_log import AuditLog
        from app.models.system_config import SystemConfig
        from app.models.knowledge_base import KnowledgeBaseArticle
        from app.models.task import Task
        from app.models.inspection import Inspection
        from app.models.support import SupportTicket, PasswordResetRequest
        from app.models.zone import Zone
        
        # Initialize Beanie with all document models
        await init_beanie(
            database=db.db,
            document_models=[
                User,
                Prediction,
                Hotspot,
                Forecast,
                Alert,
                Report,
                Event,
                AuditLog,
                SystemConfig,
                KnowledgeBaseArticle,
                Task,
                Inspection,
                SupportTicket,
                PasswordResetRequest,
                Zone
            ]
        )
        
        db.initialized = True
        logger.info("Successfully connected to MongoDB and initialized Beanie")
    except Exception as e:
        db.initialized = False
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close MongoDB connection"""
    try:
        if db.client:
            db.client.close()
            logger.info("Closed MongoDB connection")
    except Exception as e:
        logger.error(f"Error closing MongoDB connection: {e}")
        raise
