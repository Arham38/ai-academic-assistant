"""Configuration settings for AI Microservice."""

import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application runtime settings loaded from environment variables."""

    SERVICE_NAME: str = "ai-academic-assistant-ai-engine"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # MongoDB connection settings
    MONGO_URI: str = os.getenv(
        "MONGO_URI",
        "mongodb://localhost:27017/academic_assistant?authSource=admin",
    )
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "academic_assistant")

    # Service-to-service internal authentication secret
    INTERNAL_SERVICE_KEY: str = os.getenv(
        "INTERNAL_SERVICE_KEY",
        "default-internal-microservice-secret-change-in-prod",
    )

    # Base physical upload directory (shared Docker volume / host path)
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()
