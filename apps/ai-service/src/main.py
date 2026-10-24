"""FastAPI application factory for AI Academic Assistant Microservice."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routers.internal import router as internal_router
from src.infrastructure.database.mongo_client import close_mongo_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager handling startup initialization and graceful shutdown."""
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
async def health_check() -> dict[str, str]:
    """Health check endpoint for internal container orchestrator."""
    return {
        "status": "healthy",
        "service": "ai-academic-assistant-ai-engine",
        "version": "0.1.0",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
