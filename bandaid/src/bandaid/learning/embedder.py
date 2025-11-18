"""Sentence embedder for pattern similarity matching (T062).

Uses sentence-transformers/all-MiniLM-L6-v2 to generate 384-dimensional embeddings
for attack patterns, enabling semantic similarity search and self-learning.
"""

from bandaid.observability.logger import get_logger

logger = get_logger(__name__)


class SentenceEmbedder:
    """Sentence transformer embedder for generating semantic embeddings."""

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """Initialize embedder (lazy-loaded).

        Args:
            model_name: HuggingFace model identifier
        """
        self.model_name = model_name
        self.model = None
        self._initialized = False

    def initialize(self) -> None:
        """Load the sentence transformer model.

        Loads model from HuggingFace transformers library.
        """
        if self._initialized:
            logger.debug("embedder already initialized")
            return

        try:
            from sentence_transformers import SentenceTransformer

            logger.info("loading sentence transformer", model=self.model_name)

            self.model = SentenceTransformer(self.model_name)
            self._initialized = True

            logger.info("sentence transformer loaded", model=self.model_name)

        except ImportError:
            logger.error("sentence-transformers not installed")
            raise RuntimeError(
                "sentence-transformers package required. Install with: pip install sentence-transformers"
            ) from None
        except Exception as e:
            logger.error("failed to load sentence transformer", error=str(e), exc_info=True)
            raise

    def is_initialized(self) -> bool:
        """Check if embedder is initialized.

        Returns:
            True if model is loaded
        """
        return self._initialized

    def encode(self, text: str) -> list[float]:
        """Generate embedding vector for text.

        Args:
            text: Input text to embed

        Returns:
            384-dimensional embedding vector

        Raises:
            RuntimeError: If embedder not initialized
        """
        if not self._initialized:
            raise RuntimeError("Embedder not initialized. Call initialize() first.")

        try:
            # Generate embedding
            embedding = self.model.encode(text, convert_to_tensor=False)

            # Convert to list for serialization
            return embedding.tolist()

        except Exception as e:
            logger.error("embedding generation failed", error=str(e), exc_info=True)
            raise

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts (batched for efficiency).

        Args:
            texts: List of input texts

        Returns:
            List of 384-dimensional embedding vectors

        Raises:
            RuntimeError: If embedder not initialized
        """
        if not self._initialized:
            raise RuntimeError("Embedder not initialized. Call initialize() first.")

        try:
            # Generate embeddings in batch
            embeddings = self.model.encode(texts, convert_to_tensor=False, show_progress_bar=False)

            # Convert to list of lists
            return [emb.tolist() for emb in embeddings]

        except Exception as e:
            logger.error("batch embedding generation failed", error=str(e), exc_info=True)
            raise


# Global embedder instance (singleton pattern)
_embedder_instance: SentenceEmbedder | None = None


def get_sentence_embedder(
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
) -> SentenceEmbedder:
    """Get or create sentence embedder instance (singleton).

    Args:
        model_name: HuggingFace model identifier

    Returns:
        SentenceEmbedder instance
    """
    global _embedder_instance

    if _embedder_instance is None:
        _embedder_instance = SentenceEmbedder(model_name=model_name)

    return _embedder_instance


async def learn_pattern_async(
    text: str,
    threat_types: list,
    confidence: float,
    pattern_store,
) -> str | None:
    """Asynchronously learn a new attack pattern (T065).

    Creates embedding for detected attack pattern and stores in ChromaDB.
    Performs deduplication check - if similar pattern exists (>0.95 similarity),
    increments its detection count instead of creating new pattern.

    Args:
        text: Attack pattern text
        threat_types: List of ThreatType enums
        confidence: Detection confidence (0.0-1.0)
        pattern_store: PatternStore instance

    Returns:
        Pattern ID if learned (str), None if duplicate or error
    """
    import asyncio
    from datetime import datetime
    from uuid import uuid4

    from bandaid.models.patterns import AttackPattern

    try:
        # Run in thread pool to avoid blocking (embedding is CPU-intensive)
        loop = asyncio.get_event_loop()

        def _generate_embedding_and_learn():
            try:
                # Get embedder
                embedder = get_sentence_embedder()
                if not embedder.is_initialized():
                    embedder.initialize()

                # Generate embedding
                embedding = embedder.encode(text)

                # Check for duplicate (similarity > 0.95)
                duplicate = pattern_store.check_duplicate(
                    query_embedding=embedding,
                    similarity_threshold=0.95,
                )

                if duplicate:
                    pattern_id, similarity = duplicate
                    logger.info(
                        "duplicate pattern detected, incrementing count",
                        pattern_id=str(pattern_id),
                        similarity=similarity,
                    )

                    # Get existing pattern and increment detection count
                    results = pattern_store.query_similar(
                        query_embedding=embedding,
                        n_results=1,
                        similarity_threshold=0.95,
                    )

                    if results:
                        _, _, existing_pattern = results[0]
                        pattern_store.update_pattern(
                            pattern_id=pattern_id,
                            detection_count=existing_pattern.detection_count + 1,
                            last_seen=datetime.utcnow().isoformat(),
                        )

                    return None  # Duplicate, not a new pattern

                # Create new attack pattern
                pattern = AttackPattern(
                    id=uuid4(),
                    pattern_text=text[:500],  # Truncate long texts
                    threat_types=threat_types,
                    confidence_level=confidence,
                    detection_count=1,
                    first_seen=datetime.utcnow(),
                    last_seen=datetime.utcnow(),
                )

                # Store pattern with embedding
                pattern_store.add_pattern(pattern=pattern, embedding=embedding)

                logger.info(
                    "new attack pattern learned",
                    pattern_id=str(pattern.id),
                    threat_types=[t.value if hasattr(t, "value") else str(t) for t in threat_types],
                    confidence=confidence,
                )

                return str(pattern.id)

            except Exception as e:
                logger.error("pattern learning failed", error=str(e), exc_info=True)
                return None

        # Run in thread pool
        pattern_id = await loop.run_in_executor(None, _generate_embedding_and_learn)
        return pattern_id

    except Exception as e:
        logger.error("async pattern learning failed", error=str(e), exc_info=True)
        return None
