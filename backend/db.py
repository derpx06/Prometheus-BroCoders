"""MongoDB connection, collection indexes, and test isolation."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import ASCENDING, DESCENDING, MongoClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

_client: MongoClient | None = None
_db = None


def database():
    global _client, _db
    if _db is None:
        uri = os.environ.get("MONGODB_URI")
        if not uri:
            raise RuntimeError("MONGODB_URI is required; add it to .env before starting Lattice.")
        _client = MongoClient(uri, serverSelectionTimeoutMS=8_000)
        _db = _client.get_default_database(default="lattice")
    return _db


def init() -> None:
    db = database()
    db.users.create_index("email", unique=True)
    db.invitations.create_index("token_hash", unique=True)
    db.classes.create_index("join_code", unique=True)
    db.sources.create_index([("owner_id", ASCENDING), ("created_at", DESCENDING)])
    db.materials.create_index([("owner_id", ASCENDING), ("updated_at", DESCENDING)])
    db.class_members.create_index([("class_id", ASCENDING), ("user_id", ASCENDING)], unique=True)
    db.assignments.create_index([("class_id", ASCENDING), ("created_at", DESCENDING)])
    db.attempts.create_index([("user_id", ASCENDING), ("assignment_id", ASCENDING)])
    db.study_states.create_index([("user_id", ASCENDING), ("source_id", ASCENDING)], unique=True)
    db.concept_mastery.create_index([("study_state_id", ASCENDING), ("concept_idx", ASCENDING)], unique=True)
    db.chat_messages.create_index([("user_id", ASCENDING), ("source_id", ASCENDING), ("created_at", ASCENDING)])


def reset_for_tests(_: Path | None = None) -> None:
    """Use an in-memory Mongo-compatible database; never touch Atlas in tests."""
    global _client, _db
    import mongomock

    _client = mongomock.MongoClient()
    _db = _client["lattice_test"]
    init()
