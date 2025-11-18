"""Pattern similarity matching using cosine similarity (T064).

Performs semantic similarity search against learned attack patterns stored in ChromaDB.
"""

from bandaid.learning.embedder import get_sentence_embedder
from bandaid.learning.pattern_store import PatternStore
from bandaid.models.patterns import AttackPattern
from bandaid.observability.logger import get_logger

logger = get_logger(__name__)


class PatternMatcher:
    """Semantic pattern matcher using embeddings and cosine similarity."""

    def __init__(
        self,
        pattern_store: PatternStore,
        similarity_threshold: float = 0.85,
    ):
        """Initialize pattern matcher.

        Args:
            pattern_store: ChromaDB pattern store
            similarity_threshold: Cosine similarity threshold (0.0-1.0) for matching
        """
        self.pattern_store = pattern_store
        self.similarity_threshold = similarity_threshold
        self.embedder = get_sentence_embedder()

    def initialize(self) -> None:
        """Initialize pattern store and embedder."""
        if not self.pattern_store.client:
            self.pattern_store.initialize()

        if not self.embedder.is_initialized():
            self.embedder.initialize()

    def find_similar_patterns(
        self,
        text: str,
        top_k: int = 5,
    ) -> list[tuple[AttackPattern, float]]:
        """Find attack patterns similar to the given text.

        Uses cosine similarity to find semantically similar learned patterns.

        Args:
            text: Input text to match against patterns
            top_k: Maximum number of results to return

        Returns:
            List of (AttackPattern, similarity_score) tuples, sorted by score descending

        Raises:
            RuntimeError: If matcher not initialized
        """
        if not self.embedder.is_initialized():
            raise RuntimeError("Matcher not initialized. Call initialize() first.")

        try:
            # Generate embedding for input text
            query_embedding = self.embedder.encode(text)

            # Search ChromaDB for similar patterns
            results = self.pattern_store.query_similar(
                query_embedding=query_embedding,
                n_results=top_k,
                similarity_threshold=self.similarity_threshold,
            )

            # Convert to format (pattern, similarity)
            matches = [(pattern, similarity) for (pattern_id, similarity, pattern) in results]

            logger.debug(
                "pattern matching completed",
                query_length=len(text),
                total_results=len(results),
                matches_above_threshold=len(matches),
                threshold=self.similarity_threshold,
            )

            return matches

        except Exception as e:
            logger.error("pattern matching failed", error=str(e), exc_info=True)
            return []

    def is_similar_to_known_pattern(self, text: str) -> tuple[bool, AttackPattern | None, float]:
        """Check if text matches any known attack pattern.

        Args:
            text: Input text to check

        Returns:
            Tuple of (is_match, matched_pattern, similarity_score)
        """
        try:
            matches = self.find_similar_patterns(text, top_k=1)

            if matches:
                pattern, similarity = matches[0]
                return (True, pattern, similarity)

            return (False, None, 0.0)

        except Exception as e:
            logger.error("similarity check failed", error=str(e), exc_info=True)
            return (False, None, 0.0)


# Global matcher instance (singleton pattern)
_matcher_instance: PatternMatcher | None = None


def get_pattern_matcher(
    pattern_store: PatternStore | None = None,
    similarity_threshold: float = 0.85,
) -> PatternMatcher:
    """Get or create pattern matcher instance (singleton).

    Args:
        pattern_store: Optional pattern store (creates default if None)
        similarity_threshold: Cosine similarity threshold for matching

    Returns:
        PatternMatcher instance
    """
    global _matcher_instance

    if _matcher_instance is None:
        if pattern_store is None:
            # Create default pattern store
            from pathlib import Path

            store_path = Path.home() / ".bandaid" / "chroma"
            pattern_store = PatternStore(persist_directory=str(store_path))

        _matcher_instance = PatternMatcher(
            pattern_store=pattern_store,
            similarity_threshold=similarity_threshold,
        )

    return _matcher_instance
