"""Confidence threshold logic for threat detection.

Implements three-tier confidence system with action-based thresholds:
- High confidence (≥0.9): Block immediately
- Medium confidence (0.5-0.89): Run additional validation
- Low confidence (<0.5): Log only, allow request
"""

from enum import Enum

from bandaid.models.events import SeverityLevel, ThreatType
from bandaid.observability.logger import get_logger

logger = get_logger(__name__)


class ConfidenceLevel(str, Enum):
    """Confidence level tiers."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class Action(str, Enum):
    """Actions to take based on confidence level."""

    BLOCK = "block"
    VALIDATE_FURTHER = "validate_further"
    LOG_ONLY = "log_only"
    ALLOW = "allow"


class ConfidenceThresholdManager:
    """Manager for confidence thresholds and action mapping."""

    def __init__(
        self,
        high_threshold: float = 0.9,
        medium_threshold: float = 0.5,
        low_threshold: float = 0.3,
    ):
        """Initialize confidence threshold manager.

        Args:
            high_threshold: High confidence threshold (default: 0.9)
            medium_threshold: Medium confidence minimum (default: 0.5)
            low_threshold: Low confidence threshold (default: 0.3)
        """
        self.high_threshold = high_threshold
        self.medium_threshold = medium_threshold
        self.low_threshold = low_threshold

        # Validate threshold ranges
        for name, value in [
            ("high_threshold", high_threshold),
            ("medium_threshold", medium_threshold),
            ("low_threshold", low_threshold),
        ]:
            if not (0.0 <= value <= 1.0):
                raise ValueError(f"{name} must be between 0.0 and 1.0, got {value}")

        # Validate thresholds ordering
        if not (high_threshold > medium_threshold > low_threshold):
            raise ValueError(
                "Thresholds must be: high > medium > low. "
                f"Got: {high_threshold} > {medium_threshold} > {low_threshold}"
            )

    def get_confidence_level(self, confidence: float) -> ConfidenceLevel:
        """Determine confidence level tier.

        Args:
            confidence: Confidence score (0.0-1.0)

        Returns:
            ConfidenceLevel enum
        """
        if confidence >= self.high_threshold:
            return ConfidenceLevel.HIGH
        elif confidence >= self.medium_threshold:
            return ConfidenceLevel.MEDIUM
        else:
            # All other confidences (including 0.0) are LOW
            return ConfidenceLevel.LOW

    def get_action(self, confidence: float, guard_enabled: bool = True) -> Action:
        """Determine action to take based on confidence level.

        Args:
            confidence: Confidence score (0.0-1.0)
            guard_enabled: Whether Llama Guard is enabled

        Returns:
            Action enum
        """
        level = self.get_confidence_level(confidence)

        if level == ConfidenceLevel.HIGH:
            # High confidence: Block immediately
            return Action.BLOCK

        elif level == ConfidenceLevel.MEDIUM:
            # Medium confidence: Run additional validation if Guard enabled
            if guard_enabled:
                return Action.VALIDATE_FURTHER
            else:
                # If Guard disabled, block anyway (medium is high enough)
                return Action.BLOCK

        elif level == ConfidenceLevel.LOW:
            # Low confidence: Allow but log for learning
            return Action.ALLOW

        else:
            # Very low or no confidence: Allow
            return Action.ALLOW

    def get_severity(self, confidence: float, threat_type: ThreatType) -> SeverityLevel:
        """Determine severity level based on confidence and threat type.

        Args:
            confidence: Confidence score (0.0-1.0)
            threat_type: Type of threat detected

        Returns:
            SeverityLevel enum
        """
        # Critical threats (always high severity if detected with confidence)
        critical_threats = {
            ThreatType.PRIVATE_KEY,
            ThreatType.SEED_PHRASE,
            ThreatType.FINANCIAL_SECRET,
            ThreatType.PROMPT_INJECTION,  # Add prompt injection as critical
        }

        # High severity threats
        high_severity_threats = {
            ThreatType.API_KEY_LEAK,
            ThreatType.BLOCKCHAIN_ADDRESS,
        }

        # Medium severity threats

        # Determine base severity from confidence first
        level = self.get_confidence_level(confidence)

        if level == ConfidenceLevel.HIGH:
            # High confidence: use threat type to determine severity
            if threat_type in critical_threats:
                return SeverityLevel.CRITICAL
            elif threat_type in high_severity_threats:
                return SeverityLevel.HIGH
            else:
                return SeverityLevel.MEDIUM

        elif level == ConfidenceLevel.MEDIUM:
            # Medium confidence: cap at HIGH
            if threat_type in critical_threats or threat_type in high_severity_threats:
                return SeverityLevel.HIGH
            else:
                return SeverityLevel.MEDIUM

        else:  # LOW confidence
            # Distinguish between low and very low
            if confidence >= self.low_threshold:
                # Low confidence (≥ low_threshold): MEDIUM severity
                return SeverityLevel.MEDIUM
            else:
                # Very low confidence (< low_threshold): LOW severity
                return SeverityLevel.LOW

    def should_block(
        self, confidence: float, guard_result: str | bool | None = None, guard_enabled: bool = True
    ) -> bool:
        """Determine if request should be blocked.

        Args:
            confidence: Initial confidence score
            guard_result: Optional Guard validation result
                ("unsafe" or "safe" or boolean for backwards compat)
            guard_enabled: Whether Guard is enabled for validation

        Returns:
            True if should block, False otherwise
        """
        action = self.get_action(confidence, guard_enabled=guard_enabled)

        if action == Action.BLOCK:
            return True

        # Handle guard result (support both string and boolean)
        if action == Action.VALIDATE_FURTHER:
            if guard_result == "unsafe" or guard_result is True:
                return True

        return False

    def aggregate_confidence(self, confidences: dict[str, float] | list[float]) -> float:
        """Aggregate multiple confidence scores.

        Uses maximum confidence across all detectors.

        Args:
            confidences: Dictionary mapping detector name to confidence score, or list of scores

        Returns:
            Aggregated confidence score
        """
        if not confidences:
            return 0.0

        # Handle both dict and list
        if isinstance(confidences, dict):
            return max(confidences.values())
        else:
            return max(confidences)

    def log_decision(
        self,
        confidence: float,
        action: Action,
        threat_type: ThreatType | None,
        guard_result: bool | None = None,
    ) -> None:
        """Log confidence-based decision.

        Args:
            confidence: Confidence score
            action: Action taken
            threat_type: Type of threat detected
            guard_result: Optional Guard validation result
        """
        logger.info(
            "confidence decision",
            confidence=confidence,
            level=self.get_confidence_level(confidence).value,
            action=action.value,
            threat_type=threat_type.value if threat_type else None,
            guard_result=guard_result,
        )


# Global confidence threshold manager
_confidence_manager: ConfidenceThresholdManager | None = None


def get_confidence_manager(
    high_threshold: float = 0.9,
    medium_threshold: float = 0.5,
    low_threshold: float = 0.3,
) -> ConfidenceThresholdManager:
    """Get global confidence threshold manager.

    Args:
        high_threshold: High confidence threshold
        medium_threshold: Medium confidence minimum
        low_threshold: Low confidence threshold

    Returns:
        ConfidenceThresholdManager instance
    """
    global _confidence_manager
    if _confidence_manager is None:
        _confidence_manager = ConfidenceThresholdManager(
            high_threshold=high_threshold,
            medium_threshold=medium_threshold,
            low_threshold=low_threshold,
        )
    return _confidence_manager
