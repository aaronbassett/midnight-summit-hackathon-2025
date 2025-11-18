"""ChromaDB pattern storage for self-learning attack detection.

Manages vector embeddings of attack patterns using ChromaDB in embedded/persistent mode.
"""

from pathlib import Path
from uuid import UUID

import chromadb
from chromadb.config import Settings

from bandaid.models.patterns import AttackPattern, PatternMetadata
from bandaid.observability.logger import get_logger

logger = get_logger(__name__)


class PatternStore:
    """Pattern storage manager using ChromaDB."""

    def __init__(
        self,
        persist_directory: str = "./data/chroma",
        collection_name: str = "attack_patterns",
    ):
        """Initialize pattern store.

        Args:
            persist_directory: Directory for persistent ChromaDB storage
            collection_name: Name of the ChromaDB collection
        """
        self.persist_directory = Path(persist_directory)
        self.collection_name = collection_name
        self.client: chromadb.PersistentClient | None = None
        self.collection: chromadb.Collection | None = None

    def initialize(self) -> None:
        """Initialize ChromaDB client and collection."""
        self.persist_directory.mkdir(parents=True, exist_ok=True)

        self.client = chromadb.PersistentClient(
            path=str(self.persist_directory),
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True,
            ),
        )

        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={
                "hnsw:space": "cosine",
                "description": "Learned attack pattern embeddings for self-learning threat detection",
            },
        )

        logger.info(
            "pattern store initialized",
            persist_directory=str(self.persist_directory),
            collection_name=self.collection_name,
        )

    def add_pattern(
        self,
        pattern: AttackPattern,
        embedding: list[float],
    ) -> None:
        """Add a new attack pattern with its embedding.

        Args:
            pattern: AttackPattern to store
            embedding: Vector embedding (384-dimensional)
        """
        if not self.collection:
            raise RuntimeError("Pattern store not initialized")

        metadata = PatternMetadata.from_attack_pattern(pattern)

        self.collection.add(
            ids=[str(pattern.id)],
            embeddings=[embedding],
            metadatas=[metadata.model_dump()],
        )

        logger.debug(
            "pattern added",
            pattern_id=str(pattern.id),
            threat_types=[t.value for t in pattern.threat_types],
        )

    def query_similar(
        self,
        query_embedding: list[float],
        n_results: int = 5,
        similarity_threshold: float = 0.85,
        threat_type_filter: str | None = None,
    ) -> list[tuple[UUID, float, AttackPattern]]:
        """Query for similar attack patterns.

        Args:
            query_embedding: Query vector embedding
            n_results: Maximum number of results to return
            similarity_threshold: Minimum similarity score (0.0-1.0)
            threat_type_filter: Optional filter by threat type

        Returns:
            List of tuples (pattern_id, similarity, pattern)
        """
        if not self.collection:
            raise RuntimeError("Pattern store not initialized")

        # Build where filter for threat type
        where_filter = None
        if threat_type_filter:
            where_filter = {"threat_types": {"$contains": threat_type_filter}}

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where_filter,
        )

        if not results["ids"] or not results["ids"][0]:
            return []

        matches = []
        for i, pattern_id_str in enumerate(results["ids"][0]):
            # ChromaDB returns distance, convert to similarity (cosine)
            # ChromaDB cosine distance = 1 - cosine_similarity
            distance = results["distances"][0][i] if results["distances"] else 0.0
            similarity = 1.0 - distance

            if similarity < similarity_threshold:
                continue

            pattern_id = UUID(pattern_id_str)
            metadata = results["metadatas"][0][i]

            # Convert metadata back to AttackPattern
            pattern_metadata = PatternMetadata(**metadata)
            pattern = pattern_metadata.to_attack_pattern(pattern_id)

            matches.append((pattern_id, similarity, pattern))

        logger.debug(
            "pattern query completed",
            matches_found=len(matches),
            similarity_threshold=similarity_threshold,
        )

        return matches

    def update_pattern(
        self,
        pattern_id: UUID,
        detection_count: int,
        last_seen: str,
    ) -> None:
        """Update pattern metadata (e.g., increment detection count).

        Args:
            pattern_id: Pattern UUID
            detection_count: Updated detection count
            last_seen: Updated last seen timestamp (ISO 8601)
        """
        if not self.collection:
            raise RuntimeError("Pattern store not initialized")

        # Get existing metadata
        result = self.collection.get(ids=[str(pattern_id)])
        if not result["ids"]:
            logger.warning("pattern not found for update", pattern_id=str(pattern_id))
            return

        # Update metadata
        existing_metadata = result["metadatas"][0]
        existing_metadata["detection_count"] = detection_count
        existing_metadata["last_seen"] = last_seen

        self.collection.update(
            ids=[str(pattern_id)],
            metadatas=[existing_metadata],
        )

        logger.debug(
            "pattern metadata updated",
            pattern_id=str(pattern_id),
            detection_count=detection_count,
        )

    def get_pattern(self, pattern_id: UUID) -> AttackPattern | None:
        """Get a pattern by ID.

        Args:
            pattern_id: Pattern UUID

        Returns:
            AttackPattern or None if not found
        """
        if not self.collection:
            raise RuntimeError("Pattern store not initialized")

        result = self.collection.get(ids=[str(pattern_id)])

        if not result["ids"]:
            return None

        metadata = result["metadatas"][0]
        pattern_metadata = PatternMetadata(**metadata)
        return pattern_metadata.to_attack_pattern(pattern_id)

    def delete_pattern(self, pattern_id: UUID) -> None:
        """Delete a pattern by ID.

        Args:
            pattern_id: Pattern UUID
        """
        if not self.collection:
            raise RuntimeError("Pattern store not initialized")

        self.collection.delete(ids=[str(pattern_id)])
        logger.debug("pattern deleted", pattern_id=str(pattern_id))

    def delete_old_patterns(self, cutoff_date: str) -> int:
        """Delete patterns older than cutoff date.

        Args:
            cutoff_date: Cutoff timestamp (ISO 8601)

        Returns:
            Number of patterns deleted
        """
        if not self.collection:
            raise RuntimeError("Pattern store not initialized")

        # Query all patterns older than cutoff
        result = self.collection.get(
            where={"first_seen": {"$lt": cutoff_date}},
        )

        if not result["ids"]:
            return 0

        deleted_count = len(result["ids"])
        self.collection.delete(ids=result["ids"])

        logger.info(
            "old patterns deleted",
            deleted_count=deleted_count,
            cutoff_date=cutoff_date,
        )

        return deleted_count

    def get_all_patterns(
        self,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[AttackPattern]:
        """Get all patterns (for dashboard display).

        Args:
            limit: Maximum number of patterns to return
            offset: Number of patterns to skip

        Returns:
            List of AttackPatterns
        """
        if not self.collection:
            raise RuntimeError("Pattern store not initialized")

        result = self.collection.get(
            limit=limit,
            offset=offset,
        )

        patterns = []
        for i, pattern_id_str in enumerate(result["ids"]):
            pattern_id = UUID(pattern_id_str)
            metadata = result["metadatas"][i]
            pattern_metadata = PatternMetadata(**metadata)
            pattern = pattern_metadata.to_attack_pattern(pattern_id)
            patterns.append(pattern)

        return patterns

    def count_patterns(self) -> int:
        """Get total number of patterns stored.

        Returns:
            Pattern count
        """
        if not self.collection:
            raise RuntimeError("Pattern store not initialized")

        return self.collection.count()

    def check_duplicate(
        self,
        query_embedding: list[float],
        similarity_threshold: float = 0.95,
    ) -> tuple[UUID, float] | None:
        """Check if a pattern is a duplicate (very high similarity).

        Args:
            query_embedding: Query vector embedding
            similarity_threshold: Minimum similarity to consider duplicate (default 0.95)

        Returns:
            Tuple of (pattern_id, similarity) if duplicate found, None otherwise
        """
        matches = self.query_similar(
            query_embedding,
            n_results=1,
            similarity_threshold=similarity_threshold,
        )

        if matches:
            pattern_id, similarity, _ = matches[0]
            return (pattern_id, similarity)

        return None

    def reset(self) -> None:
        """Reset the collection (delete all patterns). Use with caution!"""
        if not self.client:
            raise RuntimeError("Pattern store not initialized")

        self.client.delete_collection(name=self.collection_name)
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={
                "hnsw:space": "cosine",
                "description": "Learned attack pattern embeddings for self-learning threat detection",
            },
        )

        logger.warning("pattern store reset - all patterns deleted")


# Global pattern store instance
_pattern_store: PatternStore | None = None


def get_pattern_store(
    persist_directory: str | None = None,
    collection_name: str | None = None,
) -> PatternStore:
    """Get global pattern store instance.

    Args:
        persist_directory: Optional persist directory (uses default if None)
        collection_name: Optional collection name (uses default if None)

    Returns:
        PatternStore instance
    """
    global _pattern_store
    if _pattern_store is None:
        _pattern_store = PatternStore(
            persist_directory=persist_directory or "./data/chroma",
            collection_name=collection_name or "attack_patterns",
        )
        _pattern_store.initialize()
    return _pattern_store
