import logging
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from app.core.config import settings

logger = logging.getLogger(__name__)


def setup_cors(app: FastAPI) -> None:
    """
    Configure CORS middleware for the FastAPI application
    
    Args:
        app: FastAPI application instance
    """
    # Use wildcard in development to avoid preflight 400s from origin mismatches.
    # When allow_origins=["*"], allow_credentials must be False (browser restriction).
    # We handle auth via Bearer token in header, so credentials=False is fine.
    logger.info("Setting up CORS with allow_origins=['*']")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"]
    )
    logger.info("CORS middleware added.")
