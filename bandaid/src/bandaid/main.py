"""Main FastAPI application for Bandaid LLM Security Proxy.

Entry point for the security proxy server with middleware, CORS, and lifecycle management.
"""

import signal
import sys
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from bandaid.config import load_config
from bandaid.dashboard import api as dashboard_api
from bandaid.observability.logger import configure_logging, get_logger
from bandaid.observability.sentry import initialize_sentry
from bandaid.proxy import routes, server
from bandaid.storage.events_db import get_events_db
from bandaid.storage.migrations import apply_migrations
from bandaid.storage.scheduler import shutdown_scheduler, start_scheduler

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Lifecycle manager for FastAPI application.

    Handles startup and shutdown events.
    """
    # Startup
    logger.info("bandaid security proxy starting up")

    try:
        # Load configuration
        config = load_config()
        logger.info(
            "configuration loaded",
            proxy_port=config.proxy.port,
            dashboard_port=config.dashboard.port,
        )

        # Configure logging
        configure_logging(
            log_level=config.observability.logging.level,
            log_format=config.observability.logging.format,
        )

        # Initialize Sentry if configured
        if config.observability.sentry.dsn:
            initialize_sentry(
                dsn=config.observability.sentry.dsn,
                environment=config.observability.sentry.environment,
                traces_sample_rate=config.observability.sentry.traces_sample_rate,
            )
            logger.info("sentry initialized")

        # Apply database migrations
        await apply_migrations(config.storage.sqlite.path)
        logger.info("database migrations applied")

        # Initialize database
        db = await get_events_db(config.storage.sqlite.path)
        logger.info("database initialized")

        # Configure LiteLLM
        server.configure_litellm()
        logger.info("litellm configured")

        # Start scheduler for cleanup jobs
        start_scheduler()
        logger.info("cleanup scheduler started")

        logger.info("bandaid security proxy ready")

        yield

    except Exception as e:
        logger.error("startup failed", error=str(e), exc_info=True)
        raise

    # Shutdown
    logger.info("bandaid security proxy shutting down")

    try:
        # Shutdown scheduler
        try:
            shutdown_scheduler()
            logger.info("scheduler shut down")
        except Exception as sched_err:
            logger.error("error shutting down scheduler", error=str(sched_err))

        # Flush any pending log writes
        import logging

        logging.shutdown()

        # Close database connections gracefully
        try:
            db = await get_events_db()
            if db:
                # Ensure all pending writes are committed
                await db.flush_pending()
                await db.close()
                logger.info("database connections closed")
        except Exception as db_err:
            logger.error("error closing database", error=str(db_err))

        # Close ChromaDB client (if initialized)
        try:
            from bandaid.learning.pattern_store import get_pattern_store

            pattern_store = get_pattern_store()
            if pattern_store and hasattr(pattern_store, "client"):
                # ChromaDB client cleanup (persist any pending operations)
                logger.info("flushing chromadb operations")
        except Exception as chroma_err:
            logger.error("error closing chromadb", error=str(chroma_err))

        logger.info("shutdown complete")

    except Exception as e:
        logger.error("shutdown error", error=str(e), exc_info=True)


# Create FastAPI application
app = FastAPI(
    title="Bandaid LLM Security Proxy",
    description="Local-first security proxy for LLM applications with multi-layer threat detection",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware (allow all origins for local development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(server.router)
app.include_router(routes.router)

# Include dashboard API router
app.include_router(dashboard_api.router)

# Mount static files for dashboard
dashboard_static_path = Path(__file__).parent / "dashboard" / "static"
app.mount(
    "/dashboard/static", StaticFiles(directory=str(dashboard_static_path)), name="dashboard_static"
)


@app.get("/dashboard")
async def dashboard():
    """Serve dashboard HTML."""
    dashboard_html = dashboard_static_path / "index.html"
    return FileResponse(dashboard_html)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors.

    Args:
        request: FastAPI request
        exc: Exception raised

    Returns:
        JSON error response
    """
    logger.error(
        "unhandled exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
        exc_info=True,
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An internal error occurred. Please check logs.",
        },
    )


@app.get("/")
async def root():
    """Root endpoint with service information.

    Returns:
        Service information
    """
    return {
        "service": "bandaid-security-proxy",
        "version": "0.1.0",
        "status": "running",
        "endpoints": {
            "proxy": "/v1/chat/completions",
            "health": "/health",
            "metrics": "/metrics",
            "dashboard": "/dashboard",
        },
    }


def handle_shutdown(signum, frame):
    """Handle shutdown signals.

    Args:
        signum: Signal number
        frame: Current stack frame
    """
    logger.info("received shutdown signal", signal=signum)
    sys.exit(0)


# Register signal handlers
signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)


if __name__ == "__main__":
    import uvicorn

    # Load config for port
    try:
        config = load_config()
        port = config.proxy.port
        host = config.proxy.host
    except Exception:
        # Use defaults if config not available
        port = 8000
        host = "0.0.0.0"

    uvicorn.run(
        "bandaid.main:app",
        host=host,
        port=port,
        log_level="info",
        access_log=True,
    )
