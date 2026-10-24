"""Asynchronous Motor MongoDB client adapter for AI Microservice."""

import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from src.core.config import settings

logger = logging.getLogger(__name__)

_mongo_client: AsyncIOMotorClient | None = None


def get_mongo_client() -> AsyncIOMotorClient:
    """Acquires or initializes the singleton AsyncIOMotorClient."""
    global _mongo_client
    if _mongo_client is None:
        logger.info("Initializing AsyncIOMotorClient connection pool...")
        _mongo_client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000,
            uuidRepresentation="standard",
        )
    return _mongo_client


def get_database(db_name: str | None = None) -> AsyncIOMotorDatabase:
    """Returns the application database instance from the connected client."""
    client = get_mongo_client()
    target_name = db_name or settings.MONGO_DB_NAME
    return client[target_name]


async def close_mongo_client() -> None:
    """Gracefully terminates all active connection pool sockets."""
    global _mongo_client
    if _mongo_client is not None:
        logger.info("Closing AsyncIOMotorClient connection pool...")
        _mongo_client.close()
        _mongo_client = None


async def ping_database() -> bool:
    """Verifies active connectivity to MongoDB cluster."""
    try:
        client = get_mongo_client()
        await client.admin.command("ping")
        return True
    except Exception as exc:
        logger.warning(f"MongoDB ping failed: {exc}")
        return False
