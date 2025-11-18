"""Tests for confidence threshold decision logic.

These tests validate REAL threshold logic and action determination algorithms.
No mocks - testing pure decision-making logic.
"""

import pytest

from bandaid.models.events import SeverityLevel, ThreatType
from bandaid.security.confidence import (
    Action,
    ConfidenceLevel,
    ConfidenceThresholdManager,
)


class TestConfidenceLevelClassification:
    """Test confidence tier classification."""

    def test_high_confidence_classification(self):
        """Test that scores >= 0.9 are classified as HIGH."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        assert manager.get_confidence_level(0.9) == ConfidenceLevel.HIGH
        assert manager.get_confidence_level(0.95) == ConfidenceLevel.HIGH
        assert manager.get_confidence_level(1.0) == ConfidenceLevel.HIGH

    def test_medium_confidence_classification(self):
        """Test that scores between medium and high thresholds are MEDIUM."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        assert manager.get_confidence_level(0.5) == ConfidenceLevel.MEDIUM
        assert manager.get_confidence_level(0.7) == ConfidenceLevel.MEDIUM
        assert manager.get_confidence_level(0.89) == ConfidenceLevel.MEDIUM

    def test_low_confidence_classification(self):
        """Test that scores < medium threshold are LOW."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        assert manager.get_confidence_level(0.0) == ConfidenceLevel.LOW
        assert manager.get_confidence_level(0.3) == ConfidenceLevel.LOW
        assert manager.get_confidence_level(0.49) == ConfidenceLevel.LOW

    def test_custom_thresholds(self):
        """Test classification with custom threshold values."""
        # More conservative thresholds
        manager = ConfidenceThresholdManager(high_threshold=0.95, medium_threshold=0.7)

        assert manager.get_confidence_level(0.96) == ConfidenceLevel.HIGH
        assert manager.get_confidence_level(0.8) == ConfidenceLevel.MEDIUM
        assert manager.get_confidence_level(0.6) == ConfidenceLevel.LOW

    def test_boundary_conditions(self):
        """Test exact boundary values."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        # Exactly at high threshold
        assert manager.get_confidence_level(0.9) == ConfidenceLevel.HIGH

        # Exactly at medium threshold
        assert manager.get_confidence_level(0.5) == ConfidenceLevel.MEDIUM

        # Just below thresholds
        assert manager.get_confidence_level(0.8999) == ConfidenceLevel.MEDIUM
        assert manager.get_confidence_level(0.4999) == ConfidenceLevel.LOW


class TestActionDetermination:
    """Test action determination based on confidence and settings."""

    def test_high_confidence_always_blocks(self):
        """Test that high confidence always results in BLOCK action."""
        manager = ConfidenceThresholdManager(
            high_threshold=0.9,
            medium_threshold=0.5,
        )

        action = manager.get_action(0.95)
        assert action == Action.BLOCK

    def test_medium_confidence_with_guard_required(self):
        """Test medium confidence requires validation when guard is required."""
        manager = ConfidenceThresholdManager(
            high_threshold=0.9,
            medium_threshold=0.5,
        )

        action = manager.get_action(0.7, guard_enabled=True)
        assert action == Action.VALIDATE_FURTHER

    def test_medium_confidence_without_guard_required(self):
        """Test medium confidence blocks when guard is not required."""
        manager = ConfidenceThresholdManager(
            high_threshold=0.9,
            medium_threshold=0.5,
        )

        action = manager.get_action(0.7, guard_enabled=False)
        assert action == Action.BLOCK

    def test_low_confidence_allows(self):
        """Test that low confidence results in ALLOW action."""
        manager = ConfidenceThresholdManager(
            high_threshold=0.9,
            medium_threshold=0.5,
        )

        action = manager.get_action(0.3)
        assert action == Action.ALLOW

    def test_zero_confidence_allows(self):
        """Test that zero confidence is allowed."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        action = manager.get_action(0.0)
        assert action == Action.ALLOW


class TestShouldBlock:
    """Test blocking decision logic."""

    def test_high_confidence_should_block(self):
        """Test that high confidence triggers blocking."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        assert manager.should_block(0.95) is True
        assert manager.should_block(0.9) is True

    def test_medium_confidence_should_not_block(self):
        """Test that medium confidence does not trigger blocking."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        assert manager.should_block(0.7) is False
        assert manager.should_block(0.5) is False

    def test_low_confidence_should_not_block(self):
        """Test that low confidence does not trigger blocking."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        assert manager.should_block(0.3) is False
        assert manager.should_block(0.0) is False

    def test_guard_result_affects_blocking(self):
        """Test that Guard validation result affects blocking decision."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        # Medium confidence + Guard says unsafe = block
        assert manager.should_block(0.7, guard_result="unsafe") is True

        # Medium confidence + Guard says safe = no block
        assert manager.should_block(0.7, guard_result="safe") is False

        # Low confidence + Guard says unsafe = no block (confidence too low)
        assert manager.should_block(0.3, guard_result="unsafe") is False


class TestSeverityMapping:
    """Test severity level determination."""

    def test_high_confidence_critical_severity(self):
        """Test that high confidence threats are CRITICAL."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        severity = manager.get_severity(
            confidence=0.95,
            threat_type=ThreatType.PROMPT_INJECTION,
        )
        assert severity == SeverityLevel.CRITICAL

    def test_medium_confidence_high_severity(self):
        """Test that medium confidence threats are HIGH severity."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        severity = manager.get_severity(
            confidence=0.7,
            threat_type=ThreatType.PRIVATE_KEY,
        )
        assert severity == SeverityLevel.HIGH

    def test_low_confidence_medium_severity(self):
        """Test that low confidence threats are MEDIUM severity."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        severity = manager.get_severity(
            confidence=0.3,
            threat_type=ThreatType.PII,
        )
        assert severity == SeverityLevel.MEDIUM

    def test_very_low_confidence_low_severity(self):
        """Test that very low confidence threats are LOW severity."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        severity = manager.get_severity(
            confidence=0.1,
            threat_type=ThreatType.BLOCKCHAIN_ADDRESS,
        )
        assert severity == SeverityLevel.LOW

    def test_severity_adjusts_for_threat_type(self):
        """Test that severity is adjusted based on threat type."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        # Private keys should be more severe than general PII
        key_severity = manager.get_severity(0.7, ThreatType.PRIVATE_KEY)
        pii_severity = manager.get_severity(0.7, ThreatType.PII)

        # Both should be HIGH for medium confidence, but this tests the logic exists
        assert key_severity == SeverityLevel.HIGH
        assert pii_severity == SeverityLevel.MEDIUM


class TestConfidenceAggregation:
    """Test multi-detector confidence aggregation."""

    def test_max_confidence_aggregation(self):
        """Test that maximum confidence is used for aggregation."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        confidences = [0.3, 0.7, 0.5, 0.9, 0.6]
        aggregated = manager.aggregate_confidence(confidences)

        # Should return the maximum
        assert aggregated == 0.9

    def test_single_confidence_value(self):
        """Test aggregation with single confidence value."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        aggregated = manager.aggregate_confidence([0.75])
        assert aggregated == 0.75

    def test_empty_confidence_list(self):
        """Test that empty confidence list returns 0.0."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        aggregated = manager.aggregate_confidence([])
        assert aggregated == 0.0

    def test_all_low_confidence(self):
        """Test aggregation when all detectors have low confidence."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        confidences = [0.1, 0.2, 0.15, 0.3]
        aggregated = manager.aggregate_confidence(confidences)

        assert aggregated == 0.3
        assert manager.get_confidence_level(aggregated) == ConfidenceLevel.LOW

    def test_all_high_confidence(self):
        """Test aggregation when all detectors have high confidence."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        confidences = [0.95, 0.92, 0.98]
        aggregated = manager.aggregate_confidence(confidences)

        assert aggregated == 0.98
        assert manager.get_confidence_level(aggregated) == ConfidenceLevel.HIGH


class TestThresholdValidation:
    """Test threshold configuration validation."""

    def test_valid_threshold_ordering(self):
        """Test that valid threshold ordering is accepted."""
        # Should not raise
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)
        assert manager is not None

    def test_invalid_threshold_ordering(self):
        """Test that invalid threshold ordering is rejected."""
        with pytest.raises(ValueError, match="Thresholds must be: high > medium > low"):
            ConfidenceThresholdManager(high_threshold=0.5, medium_threshold=0.9)

    def test_equal_thresholds(self):
        """Test that equal thresholds are rejected."""
        with pytest.raises(ValueError):
            ConfidenceThresholdManager(high_threshold=0.7, medium_threshold=0.7)

    def test_threshold_out_of_range(self):
        """Test that thresholds must be between 0 and 1."""
        with pytest.raises(ValueError):
            ConfidenceThresholdManager(high_threshold=1.5, medium_threshold=0.5)

        with pytest.raises(ValueError):
            ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=-0.1)


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_confidence_exactly_1_0(self):
        """Test handling of maximum possible confidence."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        assert manager.get_confidence_level(1.0) == ConfidenceLevel.HIGH
        assert manager.should_block(1.0) is True
        assert manager.get_severity(1.0, ThreatType.PROMPT_INJECTION) == SeverityLevel.CRITICAL

    def test_confidence_exactly_0_0(self):
        """Test handling of minimum possible confidence."""
        manager = ConfidenceThresholdManager(high_threshold=0.9, medium_threshold=0.5)

        assert manager.get_confidence_level(0.0) == ConfidenceLevel.LOW
        assert manager.should_block(0.0) is False
        assert manager.get_action(0.0) == Action.ALLOW

    def test_very_strict_thresholds(self):
        """Test with very high thresholds (conservative)."""
        manager = ConfidenceThresholdManager(high_threshold=0.99, medium_threshold=0.95)

        # Only very high confidence triggers blocking
        assert manager.should_block(0.98) is False
        assert manager.should_block(0.99) is True

    def test_very_lenient_thresholds(self):
        """Test with very low thresholds (aggressive)."""
        manager = ConfidenceThresholdManager(
            high_threshold=0.6, medium_threshold=0.3, low_threshold=0.1
        )

        # Lower confidence triggers blocking
        assert manager.should_block(0.7) is True
        assert manager.get_confidence_level(0.4) == ConfidenceLevel.MEDIUM
