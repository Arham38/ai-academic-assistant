"""Tests for async Motor MongoDB client adapter."""

from unittest.mock import MagicMock, patch

import pytest
from src.infrastructure.database import mongo_client


@pytest.mark.asyncio
async def test_get_mongo_client_singleton():
    """Verify get_mongo_client initializes and returns singleton instance."""
    # Reset singleton state
    await mongo_client.close_mongo_client()

    with patch(
        "src.infrastructure.database.mongo_client.AsyncIOMotorClient"
    ) as mock_cls:
        mock_instance = MagicMock()
        mock_cls.return_value = mock_instance

        client1 = mongo_client.get_mongo_client()
        client2 = mongo_client.get_mongo_client()

        assert client1 is client2
        assert mock_cls.call_count == 1

    await mongo_client.close_mongo_client()


@pytest.mark.asyncio
async def test_get_database():
    """Verify get_database returns database reference with specified or default name."""
    await mongo_client.close_mongo_client()

    with patch(
        "src.infrastructure.database.mongo_client.AsyncIOMotorClient"
    ) as mock_cls:
        mock_instance = MagicMock()
        mock_cls.return_value = mock_instance

        db = mongo_client.get_database("custom_db")
        mock_instance.__getitem__.assert_called_with("custom_db")
        assert db is not None

    await mongo_client.close_mongo_client()


@pytest.mark.asyncio
async def test_close_mongo_client():
    """Verify close_mongo_client closes the client and resets singleton to None."""
    await mongo_client.close_mongo_client()

    with patch(
        "src.infrastructure.database.mongo_client.AsyncIOMotorClient"
    ) as mock_cls:
        mock_instance = MagicMock()
        mock_cls.return_value = mock_instance

        client = mongo_client.get_mongo_client()
        assert client is not None

        await mongo_client.close_mongo_client()
        mock_instance.close.assert_called_once()
        assert mongo_client._mongo_client is None


@pytest.mark.asyncio
async def test_ping_database_success():
    """Verify ping_database returns True on successful ping command."""
    await mongo_client.close_mongo_client()

    with patch(
        "src.infrastructure.database.mongo_client.AsyncIOMotorClient"
    ) as mock_cls:
        mock_instance = MagicMock()
        mock_cls.return_value = mock_instance
        mock_admin = MagicMock()
        mock_instance.admin = mock_admin

        # Create async mock for command
        async def fake_command(cmd):
            return {"ok": 1.0}

        mock_admin.command = fake_command

        result = await mongo_client.ping_database()
        assert result is True

    await mongo_client.close_mongo_client()


@pytest.mark.asyncio
async def test_ping_database_failure():
    """Verify ping_database returns False when an exception occurs."""
    await mongo_client.close_mongo_client()

    with patch(
        "src.infrastructure.database.mongo_client.AsyncIOMotorClient"
    ) as mock_cls:
        mock_instance = MagicMock()
        mock_cls.return_value = mock_instance
        mock_admin = MagicMock()
        mock_instance.admin = mock_admin

        async def fake_command_error(cmd):
            raise ConnectionError("Mongo unreachable")

        mock_admin.command = fake_command_error

        result = await mongo_client.ping_database()
        assert result is False

    await mongo_client.close_mongo_client()
