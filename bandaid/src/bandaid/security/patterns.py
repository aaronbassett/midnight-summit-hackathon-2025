"""Regex patterns for threat detection.

Contains regex patterns for detecting various security threats including:
- Prompt injection attempts
- Blockchain addresses (Ethereum, Bitcoin)
- Private keys
- API keys
- BIP39 seed phrases
"""

import re
from pathlib import Path

from bandaid.models.events import ThreatType
from bandaid.models.patterns import ThreatDetection
from bandaid.observability.logger import get_logger

logger = get_logger(__name__)


# Prompt Injection Patterns
PROMPT_INJECTION_PATTERNS = [
    # Direct instruction override (allow any word between verb and target)
    r"(?i)ignore\s+(\w+\s+)?(previous|prior|above)\s+(instructions?|commands?|rules?|prompts?)",
    r"(?i)disregard\s+(\w+\s+)?(previous|prior|above)\s+(instructions?|commands?|rules?)",
    r"(?i)forget\s+(\w+\s+)?(previous|prior|above)\s+(instructions?|commands?|rules?)",
    r"(?i)override\s+(\w+\s+)?(previous|prior|system)\s+(instructions?|commands?|settings?)",
    # System prompt extraction
    r"(?i)(show|reveal|display|print|output)(\s+me)?\s+(your|the)\s+(\w+\s+)?(system\s+)?(prompt|instructions?|rules?)",
    r"(?i)tell\s+me\s+(your|the)\s+(\w+\s+)?(system\s+)?(prompt|instructions?|rules?)",
    r"(?i)what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?|rules?)",
    r"(?i)repeat\s+(your|the)\s+(system\s+)?(prompt|instructions?)",
    r"(?i)repeat\s+the\s+(text|content|instructions?)\s+(above|before)",
    # Role manipulation
    r"(?i)you\s+are\s+(now\s+)?(a|an|the)",
    r"(?i)act\s+as\s+(a|an|the|if)",
    r"(?i)pretend\s+(you|to)\s+(are|be|have)",
    r"(?i)pretend\s+that\s+you",
    r"(?i)roleplay\s+as",
    r"(?i)simulate\s+(a|an|being)",
    # DAN (Do Anything Now) style
    r"(?i)(DAN|do\s+anything\s+now)",
    r"(?i)you\s+(have|can)\s+break(en)?\s+(free|out)",
    r"(?i)no\s+longer\s+(have|bound\s+by)\s+(rules|restrictions|limitations)",
    # Developer mode / Debug mode
    r"(?i)(enable|activate|enter|switch\s+to)\s+(developer|debug|admin|god)\s+mode",
    r"(?i)developer\s+mode\s+enabled",
    # Encoding attempts
    r"(?i)(base64|hex|rot13|encode|decode).*ignore",
    r"(?i)(base64|hex|rot13).*previous.*instructions?",
]

# Blockchain Address Patterns
ETHEREUM_ADDRESS_PATTERN = r"\b0x[a-fA-F0-9]{40}\b"
BITCOIN_LEGACY_PATTERN = r"\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b"
BITCOIN_SEGWIT_PATTERN = r"\bbc1[a-z0-9]{39,59}\b"

# Private Key Patterns
ETHEREUM_PRIVATE_KEY_PATTERN = r"\b(0x)?[a-fA-F0-9]{64}\b"
BITCOIN_WIF_PATTERN = r"\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b"

# Contextual private key (with surrounding context)
CONTEXTUAL_PRIVATE_KEY_PATTERN = (
    r"(?i)(private[_\s]?key|secret[_\s]?key|priv[_\s]?key|wallet[_\s]?key)[\s:=]+[a-fA-F0-9]{64}\b"
)

# PEM format private keys
PEM_PRIVATE_KEY_PATTERN = (
    r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?"
    r"-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"
)

# API Key Patterns
API_KEY_PATTERNS = [
    # OpenAI, Anthropic (allow hyphens and longer keys)
    r"(?i)\b(sk|pk)[-_][\w\-]{15,100}\b",
    # Explicit API key assignments (allow optional prefix like ANTHROPIC_, OPENAI_, etc.)
    r"(?i)(\w+_)?api[_-]?key[\s:=]+['\"]?[a-zA-Z0-9/+=\-_]{15,}\b",
    # AWS secret keys (allow special chars)
    r"(?i)(aws|amazon)[_\s]?secret[_\s]?access[_\s]?key[\s:=]+['\"]?[a-zA-Z0-9/+=]{20,}\b",
    # Google API keys
    r"\bAIza[a-zA-Z0-9\-_]{35,}\b",
    # Generic long alphanumeric with context check
    r"\b[a-zA-Z0-9]{40,}\b",
]


class PatternDetector:
    """Detector for regex-based threat patterns."""

    def __init__(self, bip39_wordlist_path: str | None = None):
        """Initialize pattern detector.

        Args:
            bip39_wordlist_path: Path to BIP39 wordlist file
        """
        self.prompt_injection_patterns = [
            re.compile(pattern) for pattern in PROMPT_INJECTION_PATTERNS
        ]
        self.ethereum_address_pattern = re.compile(ETHEREUM_ADDRESS_PATTERN)
        self.bitcoin_legacy_pattern = re.compile(BITCOIN_LEGACY_PATTERN)
        self.bitcoin_segwit_pattern = re.compile(BITCOIN_SEGWIT_PATTERN)
        self.ethereum_private_key_pattern = re.compile(ETHEREUM_PRIVATE_KEY_PATTERN)
        self.bitcoin_wif_pattern = re.compile(BITCOIN_WIF_PATTERN)
        self.contextual_private_key_pattern = re.compile(CONTEXTUAL_PRIVATE_KEY_PATTERN)
        self.pem_private_key_pattern = re.compile(PEM_PRIVATE_KEY_PATTERN)
        self.api_key_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in API_KEY_PATTERNS]

        # Load BIP39 wordlist for seed phrase detection
        self.bip39_wordset: set[str] | None = None

        # Use provided path or calculate default path
        if bip39_wordlist_path is None:
            default_path = Path(__file__).parent.parent / "data" / "bip39-english.txt"
            bip39_wordlist_path = str(default_path)

        self._load_bip39_wordlist(bip39_wordlist_path)

    def _load_bip39_wordlist(self, wordlist_path: str) -> None:
        """Load BIP39 wordlist from file.

        Args:
            wordlist_path: Path to wordlist file
        """
        try:
            path = Path(wordlist_path)
            if not path.exists():
                logger.warning("bip39 wordlist not found", path=wordlist_path)
                return

            with open(path) as f:
                words = [line.strip().lower() for line in f if line.strip()]

            self.bip39_wordset = set(words)
            logger.info("bip39 wordlist loaded", word_count=len(words))

        except Exception as e:
            logger.error("failed to load bip39 wordlist", error=str(e), exc_info=True)

    def detect_prompt_injection(self, text: str) -> list[ThreatDetection]:
        """Detect prompt injection attempts.

        Args:
            text: Text to analyze

        Returns:
            List of ThreatDetection objects (empty if none found)
        """
        matched_patterns = []

        for pattern in self.prompt_injection_patterns:
            match = pattern.search(text)
            if match:
                matched_patterns.append(match.group())

        if matched_patterns:
            # Higher confidence with more matches
            confidence = min(0.95, 0.8 + (len(matched_patterns) * 0.05))
            # Return single detection with highest confidence
            return [
                ThreatDetection(
                    threat_type=ThreatType.PROMPT_INJECTION,
                    confidence=confidence,
                    matched_text=matched_patterns[0],  # First match
                )
            ]

        return []

    def detect_blockchain_address(self, text: str) -> list[ThreatDetection]:
        """Detect blockchain wallet addresses.

        Args:
            text: Text to analyze

        Returns:
            List of ThreatDetection objects (one per address found)
        """
        detections = []

        # Check all blockchain address patterns
        blockchain_patterns = [
            self.ethereum_address_pattern,
            self.bitcoin_legacy_pattern,
            self.bitcoin_segwit_pattern,
        ]

        for pattern in blockchain_patterns:
            matches = pattern.findall(text)
            for addr in matches:
                detections.append(
                    ThreatDetection(
                        threat_type=ThreatType.BLOCKCHAIN_ADDRESS,
                        confidence=0.95,
                        matched_text=addr,
                    )
                )

        return detections

    def detect_private_key(self, text: str) -> list[ThreatDetection]:
        """Detect private keys (with context awareness).

        Args:
            text: Text to analyze

        Returns:
            List of ThreatDetection objects (empty if none found)
        """
        detections = []

        # Check for PEM format keys first (highest confidence)
        pem_matches = self.pem_private_key_pattern.findall(text)
        for match in pem_matches:
            detections.append(
                ThreatDetection(
                    threat_type=ThreatType.PRIVATE_KEY,
                    confidence=0.99,
                    matched_text=match,
                )
            )

        # Check for contextual private keys first (higher confidence)
        contextual_matches = self.contextual_private_key_pattern.findall(text)
        for match in contextual_matches:
            detections.append(
                ThreatDetection(
                    threat_type=ThreatType.PRIVATE_KEY,
                    confidence=0.98,
                    matched_text=str(match),
                )
            )

        # Check for Ethereum-style hex keys (64 chars)
        eth_key_matches = self.ethereum_private_key_pattern.findall(text)
        for match in eth_key_matches:
            # Lower confidence without context
            detections.append(
                ThreatDetection(
                    threat_type=ThreatType.PRIVATE_KEY,
                    confidence=0.85,
                    matched_text=str(match),
                )
            )

        # Check for Bitcoin WIF format
        btc_wif_matches = self.bitcoin_wif_pattern.findall(text)
        for match in btc_wif_matches:
            # Check if in context of "private key" keywords
            context_check = re.search(r"(?i)(private|secret|wallet|priv)[\s_]?key", text)
            confidence = 0.95 if context_check else 0.7  # Lower confidence without context
            detections.append(
                ThreatDetection(
                    threat_type=ThreatType.PRIVATE_KEY,
                    confidence=confidence,
                    matched_text=match,
                )
            )

        return detections

    def detect_api_key(self, text: str) -> list[ThreatDetection]:
        """Detect API keys and tokens.

        Args:
            text: Text to analyze

        Returns:
            List of ThreatDetection objects (empty if none found)
        """
        matches = []

        for pattern in self.api_key_patterns:
            found = pattern.findall(text)
            if found:
                matches.extend(found)

        if matches:
            # Check if in context of "api_key", "token", etc.
            context_keywords = ["api_key", "apikey", "api-key", "token", "secret", "auth"]
            has_context = any(keyword in text.lower() for keyword in context_keywords)

            confidence = 0.9 if has_context else 0.6

            # Return first match (most significant)
            return [
                ThreatDetection(
                    threat_type=ThreatType.API_KEY_LEAK,
                    confidence=confidence,
                    matched_text=matches[0],
                )
            ]

        return []

    def detect_seed_phrase(
        self, text: str, phrase_lengths: list[int] | None = None
    ) -> list[ThreatDetection]:
        """Detect BIP39 seed phrases.

        Args:
            text: Text to analyze
            phrase_lengths: Valid seed phrase lengths (default: 12, 18, 24)

        Returns:
            List of ThreatDetection objects (empty if none found)
        """
        if phrase_lengths is None:
            phrase_lengths = [12, 18, 24]
        if not self.bip39_wordset:
            return []

        # Tokenize and normalize
        words = text.lower().split()

        detections = []

        # Check for consecutive BIP39 words
        for phrase_length in phrase_lengths:
            for i in range(len(words) - phrase_length + 1):
                candidate = words[i : i + phrase_length]

                # Count how many words match BIP39 dictionary
                bip39_matches = sum(1 for word in candidate if word in self.bip39_wordset)

                # High threshold for detection
                if bip39_matches >= phrase_length:
                    phrase = " ".join(candidate)
                    confidence = 0.98
                    detections.append(
                        ThreatDetection(
                            threat_type=ThreatType.SEED_PHRASE,
                            confidence=confidence,
                            matched_text=phrase,
                        )
                    )
                elif bip39_matches >= phrase_length - 2:
                    # Close match (10-11 out of 12, etc.) - medium confidence
                    phrase = " ".join(candidate)
                    confidence = 0.75
                    detections.append(
                        ThreatDetection(
                            threat_type=ThreatType.SEED_PHRASE,
                            confidence=confidence,
                            matched_text=phrase,
                        )
                    )

        return detections

    def detect_all(self, text: str) -> list[ThreatDetection]:
        """Run all detectors and return aggregated results.

        Args:
            text: Text to analyze

        Returns:
            List of ThreatDetection objects sorted by confidence (descending)
        """
        # Collect all detections
        all_detections = []
        all_detections.extend(self.detect_prompt_injection(text))
        all_detections.extend(self.detect_blockchain_address(text))
        all_detections.extend(self.detect_private_key(text))
        all_detections.extend(self.detect_api_key(text))
        all_detections.extend(self.detect_seed_phrase(text))

        # Sort by confidence (descending)
        all_detections.sort(key=lambda d: d.confidence, reverse=True)

        return all_detections


# Global pattern detector instance
_pattern_detector: PatternDetector | None = None


def get_pattern_detector(bip39_wordlist_path: str | None = None) -> PatternDetector:
    """Get global pattern detector instance.

    Args:
        bip39_wordlist_path: Optional path to BIP39 wordlist

    Returns:
        PatternDetector instance
    """
    global _pattern_detector
    if _pattern_detector is None:
        # Try default path
        default_path = Path(__file__).parent.parent / "data" / "bip39-english.txt"
        wordlist_path = bip39_wordlist_path or str(default_path)

        _pattern_detector = PatternDetector(wordlist_path)

    return _pattern_detector
