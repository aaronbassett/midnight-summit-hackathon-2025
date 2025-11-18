"""Database migration framework for schema versioning.

Simple migration system for SQLite schema changes. Migrations are applied
automatically on startup if needed.
"""

from collections.abc import Callable
from datetime import datetime
from pathlib import Path

import aiosqlite

from bandaid.observability.logger import get_logger

logger = get_logger(__name__)


class Migration:
    """Database migration definition."""

    def __init__(
        self,
        version: str,
        description: str,
        up: Callable[[aiosqlite.Connection], None],
        down: Callable[[aiosqlite.Connection], None] | None = None,
    ):
        """Initialize migration.

        Args:
            version: Migration version (e.g., "1.0.0", "1.1.0")
            description: Human-readable description
            up: Function to apply migration (takes connection)
            down: Optional function to rollback migration
        """
        self.version = version
        self.description = description
        self.up = up
        self.down = down


class MigrationManager:
    """Database migration manager."""

    def __init__(self, db_path: str):
        """Initialize migration manager.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = Path(db_path)
        self.migrations: list[Migration] = []

    def register(self, migration: Migration) -> None:
        """Register a migration.

        Args:
            migration: Migration to register
        """
        self.migrations.append(migration)
        # Keep migrations sorted by version
        self.migrations.sort(key=lambda m: self._version_tuple(m.version))

    def _version_tuple(self, version: str) -> tuple:
        """Convert version string to tuple for comparison.

        Args:
            version: Version string (e.g., "1.2.3")

        Returns:
            Tuple of integers (e.g., (1, 2, 3))
        """
        return tuple(int(x) for x in version.split("."))

    async def get_current_version(self) -> str | None:
        """Get current schema version from database.

        Returns:
            Current version string or None if not set
        """
        if not self.db_path.exists():
            return None

        async with aiosqlite.connect(self.db_path) as conn:
            try:
                async with conn.execute(
                    "SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1"
                ) as cursor:
                    row = await cursor.fetchone()
                    return row[0] if row else None
            except aiosqlite.OperationalError:
                # Table doesn't exist yet
                return None

    async def apply_migrations(self) -> list[str]:
        """Apply pending migrations.

        Returns:
            List of applied migration versions
        """
        current_version = await self.get_current_version()
        current_tuple = self._version_tuple(current_version) if current_version else (0, 0, 0)

        applied = []

        async with aiosqlite.connect(self.db_path) as conn:
            for migration in self.migrations:
                migration_tuple = self._version_tuple(migration.version)

                if migration_tuple > current_tuple:
                    logger.info(
                        "applying migration",
                        version=migration.version,
                        description=migration.description,
                    )

                    try:
                        # Apply migration
                        migration.up(conn)

                        # Record migration
                        await conn.execute(
                            "INSERT INTO schema_version (version, applied_at) VALUES (?, ?)",
                            (migration.version, datetime.utcnow().isoformat()),
                        )

                        await conn.commit()
                        applied.append(migration.version)

                        logger.info("migration applied", version=migration.version)

                    except Exception as e:
                        logger.error(
                            "migration failed",
                            version=migration.version,
                            error=str(e),
                            exc_info=True,
                        )
                        await conn.rollback()
                        raise

        return applied

    async def rollback_migration(self, version: str) -> None:
        """Rollback a specific migration.

        Args:
            version: Version to rollback

        Raises:
            ValueError: If migration not found or no rollback defined
        """
        migration = next((m for m in self.migrations if m.version == version), None)

        if not migration:
            raise ValueError(f"Migration {version} not found")

        if not migration.down:
            raise ValueError(f"Migration {version} has no rollback defined")

        async with aiosqlite.connect(self.db_path) as conn:
            logger.info("rolling back migration", version=version)

            try:
                # Rollback migration
                migration.down(conn)

                # Remove from schema_version
                await conn.execute("DELETE FROM schema_version WHERE version = ?", (version,))

                await conn.commit()
                logger.info("migration rolled back", version=version)

            except Exception as e:
                logger.error(
                    "rollback failed",
                    version=version,
                    error=str(e),
                    exc_info=True,
                )
                await conn.rollback()
                raise


# Define migrations
def register_default_migrations(manager: MigrationManager) -> None:
    """Register default migrations.

    Args:
        manager: MigrationManager instance
    """

    # Initial schema (v1.0.0) is created by events_db.py, so no migration needed

    # Example future migration:
    # async def add_user_feedback_column(conn: aiosqlite.Connection) -> None:
    #     """Add user_feedback column to security_events table."""
    #     await conn.execute(
    #         "ALTER TABLE security_events ADD COLUMN user_feedback TEXT"
    #     )
    #
    # async def remove_user_feedback_column(conn: aiosqlite.Connection) -> None:
    #     """Remove user_feedback column (rollback)."""
    #     # SQLite doesn't support DROP COLUMN, would need to recreate table
    #     pass
    #
    # manager.register(
    #     Migration(
    #         version="1.1.0",
    #         description="Add user feedback column",
    #         up=add_user_feedback_column,
    #         down=remove_user_feedback_column,
    #     )
    # )

    pass  # No migrations yet beyond initial schema


# Global migration manager
_migration_manager: MigrationManager | None = None


def get_migration_manager(db_path: str = "./data/events.db") -> MigrationManager:
    """Get global migration manager instance.

    Args:
        db_path: Path to database

    Returns:
        MigrationManager instance
    """
    global _migration_manager
    if _migration_manager is None:
        _migration_manager = MigrationManager(db_path)
        register_default_migrations(_migration_manager)
    return _migration_manager


async def apply_migrations(db_path: str = "./data/events.db") -> list[str]:
    """Apply pending migrations to database.

    Args:
        db_path: Path to database

    Returns:
        List of applied migration versions
    """
    manager = get_migration_manager(db_path)
    return await manager.apply_migrations()
