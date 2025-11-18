"""Redaction utilities for PII and sensitive data (T056).

Provides functions to mask/redact sensitive information before logging or storage.
"""

import re

from bandaid.models.events import ThreatType


def redact_email(text: str) -> str:
    """Redact email addresses from text.

    Args:
        text: Text containing emails

    Returns:
        Text with emails redacted
    """
    if not text:
        return text

    email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    return re.sub(email_pattern, "***EMAIL_REDACTED***", text)


def redact_phone(text: str) -> str:
    """Redact phone numbers from text.

    Args:
        text: Text containing phone numbers

    Returns:
        Text with phone numbers redacted
    """
    if not text:
        return text

    # Match various phone number formats
    phone_patterns = [
        r"(?<!\d)\d{3}[-.]?\d{3}[-.]?\d{4}(?!\d)",  # 555-123-4567, 555.123.4567, 5551234567
        r"\(\d{3}\)\s*\d{3}[-.]?\d{4}",  # (555) 123-4567
        r"\+\d{1,3}\s?\d{1,14}\b",  # International: +1 5551234567
    ]

    result = text
    for pattern in phone_patterns:
        result = re.sub(pattern, "***PHONE_REDACTED***", result)

    return result


def redact_ssn(text: str) -> str:
    """Redact Social Security Numbers from text.

    Args:
        text: Text containing SSNs

    Returns:
        Text with SSNs redacted
    """
    if not text:
        return text

    # Match SSN patterns with negative lookbehind/lookahead to avoid false positives
    # Pattern: 123-45-6789 or 123 45 6789 (avoid matching serial numbers, etc.)
    ssn_pattern = r"(?<!\d)\d{3}[-\s]\d{2}[-\s]\d{4}(?!\d)"
    return re.sub(ssn_pattern, "***SSN_REDACTED***", text)


def redact_credit_card(text: str) -> str:
    """Redact credit card numbers from text.

    Args:
        text: Text containing credit cards

    Returns:
        Text with credit cards redacted
    """
    if not text:
        return text

    # Match credit card patterns: 16 digits with optional spaces/dashes
    cc_pattern = r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b"
    return re.sub(cc_pattern, "***CC_REDACTED***", text)


def redact_address(text: str) -> str:
    """Redact physical addresses from text.

    Args:
        text: Text containing addresses

    Returns:
        Text with addresses redacted
    """
    if not text:
        return text

    # Match street addresses with number, street name, and optional unit
    # Examples: "123 Main St", "456 Oak Ave Apt 2B"
    street_pattern = (
        r"\b\d+\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+"
        r"(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place|"
        r"Pkwy|Parkway)(\.?)(\s+(Apt|Suite|Unit|#)\s*[A-Za-z0-9]+)?\b"
    )

    # Match ZIP codes (5 digits or 5+4 format)
    zip_pattern = r"\b\d{5}(-\d{4})?\b"

    # Redact street addresses and ZIP codes
    text = re.sub(street_pattern, "***ADDRESS_REDACTED***", text, flags=re.IGNORECASE)
    text = re.sub(zip_pattern, "***ZIP_REDACTED***", text)

    return text


def redact_blockchain_address(text: str) -> str:
    """Redact blockchain wallet addresses from text.

    Args:
        text: Text containing blockchain addresses

    Returns:
        Text with addresses redacted
    """
    if not text:
        return text

    # Ethereum addresses
    text = re.sub(r"\b0x[a-fA-F0-9]{40}\b", "[ETH_ADDRESS_REDACTED]", text)

    # Bitcoin addresses (legacy and SegWit)
    text = re.sub(r"\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b", "[BTC_ADDRESS_REDACTED]", text)
    text = re.sub(r"\bbc1[a-z0-9]{39,59}\b", "[BTC_ADDRESS_REDACTED]", text)

    return text


def redact_private_key(text: str) -> str:
    """Redact private keys from text.

    Args:
        text: Text containing private keys

    Returns:
        Text with private keys redacted
    """
    if not text:
        return text

    # Ethereum-style hex keys (64 chars)
    text = re.sub(r"\b(0x)?[a-fA-F0-9]{64}\b", "[PRIVATE_KEY_REDACTED]", text)

    # Bitcoin WIF format
    text = re.sub(r"\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b", "[PRIVATE_KEY_REDACTED]", text)

    # Contextual private keys
    text = re.sub(
        r"(?i)(private[_\s]?key|secret[_\s]?key|priv[_\s]?key|wallet[_\s]?key)[\s:=]+[a-fA-F0-9]{64}\b",
        r"\1: [PRIVATE_KEY_REDACTED]",
        text,
    )

    return text


def redact_api_key(text: str) -> str:
    """Redact API keys from text.

    Args:
        text: Text containing API keys

    Returns:
        Text with API keys redacted
    """
    if not text:
        return text

    # Common API key formats
    text = re.sub(r"\b(sk|pk)[-_][a-zA-Z0-9\-]{15,}\b", "[API_KEY_REDACTED]", text)

    # Generic api_key=... patterns
    text = re.sub(
        r'(?i)api[_-]?key[\s:=]+[\'"]?[a-zA-Z0-9]{20,}',
        "api_key=[API_KEY_REDACTED]",
        text,
    )

    return text


def redact_seed_phrase(text: str, bip39_wordlist: list[str] | None = None) -> str:
    """Redact BIP39 seed phrases from text.

    Args:
        text: Text containing seed phrases
        bip39_wordlist: Optional BIP39 word list for validation
            (if provided, only exact matches are redacted)

    Returns:
        Text with seed phrases redacted
    """
    if not text:
        return text

    words = text.split()

    # If we have a BIP39 wordlist, validate against it for higher confidence
    if bip39_wordlist:
        bip39_set = set(bip39_wordlist)
        for phrase_length in [12, 18, 24]:
            for i in range(len(words) - phrase_length + 1):
                # Check if we have phrase_length consecutive valid BIP39 words
                candidate = words[i : i + phrase_length]
                if all(w.islower() and w in bip39_set for w in candidate):
                    # Likely a seed phrase - redact it carefully
                    redacted = " ".join(["[SEED_WORD_REDACTED]"] * phrase_length)
                    text = text.replace(" ".join(candidate), redacted, 1)
    else:
        # Without wordlist, use heuristic: look for 12/18/24 short lowercase words
        # This is a simplified check that reduces false positives but still catches obvious cases
        for phrase_length in [12, 18, 24]:
            for i in range(len(words) - phrase_length + 1):
                candidate = words[i : i + phrase_length]
                # Check if all words are: lowercase, alpha-only, 3-8 chars
                if all(w.islower() and w.isalpha() and 3 <= len(w) <= 8 for w in candidate):
                    # This looks like it could be a seed phrase
                    redacted = " ".join(["[SEED_WORD_REDACTED]"] * phrase_length)
                    text = text.replace(" ".join(candidate), redacted, 1)

    return text


def redact_pii(text: str) -> str:
    """Redact all common PII from text (T056).

    Args:
        text: Text to redact

    Returns:
        Text with PII redacted
    """
    if not text:
        return text

    text = redact_email(text)
    text = redact_phone(text)
    text = redact_ssn(text)
    text = redact_credit_card(text)
    text = redact_address(text)

    return text


def redact_secrets(text: str) -> str:
    """Redact all financial secrets from text (T056).

    Args:
        text: Text to redact

    Returns:
        Text with secrets redacted
    """
    if not text:
        return text

    text = redact_blockchain_address(text)
    text = redact_private_key(text)
    text = redact_api_key(text)
    text = redact_seed_phrase(text)

    return text


def redact_all(text: str) -> str:
    """Redact all sensitive data from text (T056).

    Applies all redaction functions to ensure comprehensive data protection.

    Args:
        text: Text to redact

    Returns:
        Text with all sensitive data redacted
    """
    if not text:
        return text

    text = redact_pii(text)
    text = redact_secrets(text)

    return text


def redact_by_threat_type(text: str, threats: ThreatType | dict[ThreatType, list[str]]) -> str:
    """Redact specific data based on detected threats (T056).

    Args:
        text: Text to redact
        threats: Either a single ThreatType or dictionary mapping ThreatType to detected entities

    Returns:
        Text with detected threats redacted
    """
    if not text:
        return text

    # Handle single ThreatType
    if isinstance(threats, ThreatType):
        threats = {threats: []}

    for threat_type, _entities in threats.items():
        if threat_type == ThreatType.PII:
            text = redact_pii(text)

        elif threat_type == ThreatType.BLOCKCHAIN_ADDRESS:
            text = redact_blockchain_address(text)

        elif threat_type == ThreatType.PRIVATE_KEY:
            text = redact_private_key(text)

        elif threat_type == ThreatType.API_KEY_LEAK:
            text = redact_api_key(text)

        elif threat_type == ThreatType.SEED_PHRASE:
            text = redact_seed_phrase(text)

        elif threat_type == ThreatType.FINANCIAL_SECRET:
            text = redact_secrets(text)

    return text


def mask_sensitive_value(value: str, keep_prefix: int = 4, keep_suffix: int = 4) -> str:
    """Mask a sensitive value, showing only prefix and suffix.

    Args:
        value: Value to mask
        keep_prefix: Number of characters to keep at start
        keep_suffix: Number of characters to keep at end

    Returns:
        Masked value like "sk_t***xyz"
    """
    if not value or len(value) <= keep_prefix + keep_suffix:
        return "***"

    return f"{value[:keep_prefix]}***{value[-keep_suffix:]}"
