"""FastAPI application factory for AI Academic Assistant Microservice."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI Academic Assistant - AI Microservice",
    description="LangGraph multi-agent RAG, embedding inference, and semantic evaluation engine.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
