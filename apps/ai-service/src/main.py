"""FastAPI application factory for AI Academic Assistant Microservice."""

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routers.internal import router as internal_router
from src.infrastructure.ai.hf_embedding_service import HFEmbeddingService
from src.infrastructure.database.mongo_client import close_mongo_client

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager handling startup initialization and graceful shutdown."""
    logger.info("Initializing AI Microservice infrastructure...")

    # Initialize singleton embedding service and attach to app.state
    try:
        embedding_service = HFEmbeddingService()
        app.state.embedding_service = embedding_service
        app.state.embedding_model = embedding_service
        logger.info(
            f"Hugging Face embedding engine ready: model='{embedding_service.model_name}', "
            f"device='{embedding_service.device}', dimension={embedding_service.dimension}"
        )
    except Exception as exc:
        logger.warning(
            f"Embedding model eager initialization deferred or encountered warning: {exc}. "
            "Model will be loaded on demand."
        )

    yield

    await close_mongo_client()


app = FastAPI(
    title="AI Academic Assistant - AI Microservice",
    description="LangGraph multi-agent RAG, embedding inference, and semantic evaluation engine.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(internal_router)


@app.get("/health")
async def health_check() -> dict[str, Any]:
    """Health check endpoint for internal container orchestrator."""
    embedding_service = getattr(app.state, "embedding_service", None)
    return {
        "status": "healthy",
        "service": "ai-academic-assistant-ai-engine",
        "version": "0.1.0",
        "device": embedding_service.device if embedding_service else "cpu",
        "model": (
            embedding_service.model_name
            if embedding_service
            else "BAAI/bge-small-en-v1.5"
        ),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
