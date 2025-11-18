"""Configuration management system for Bandaid LLM Security Proxy.

Loads configuration from TOML file with environment variable interpolation,
validates using Pydantic models, and provides type-safe access to settings.
"""

import os
import tomllib
from pathlib import Path
from typing import Any, Literal

from cryptography.fernet import Fernet
from pydantic import BaseModel, Field, model_validator


class ProxyConfig(BaseModel):
    """Proxy server configuration."""

    host: str = Field(default="0.0.0.0", description="Proxy server host")
    port: int = Field(default=8000, ge=1024, le=65535, description="Proxy server port")
    workers: int = Field(default=1, ge=1, description="Number of workers")
    reload: bool = Field(default=False, description="Enable auto-reload for development")


class DashboardConfig(BaseModel):
    """Dashboard server configuration."""

    host: str = Field(default="127.0.0.1", description="Dashboard host (localhost only)")
    port: int = Field(default=8001, ge=1024, le=65535, description="Dashboard port")
    enabled: bool = Field(default=True, description="Enable dashboard")


class NERModelConfig(BaseModel):
    """NER model configuration."""

    model_name: str = Field(default="dslim/bert-base-NER", description="HuggingFace model name")
    enabled: bool = Field(default=True, description="Enable NER validation")


class GuardModelConfig(BaseModel):
    """Llama Guard model configuration."""

    model_name: str = Field(
        default="meta-llama/Llama-Guard-3-8B-INT8", description="HuggingFace model name"
    )
    enabled: bool = Field(default=True, description="Enable Guard validation")
    timeout_seconds: float = Field(
        default=2.0, ge=0.1, description="Timeout for Guard validation (graceful degradation)"
    )


class EmbeddingsModelConfig(BaseModel):
    """Embeddings model configuration."""

    model_name: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2", description="Sentence transformer model"
    )
    enabled: bool = Field(default=True, description="Enable embeddings/self-learning")


class ModelsConfig(BaseModel):
    """ML models configuration."""

    lazy_load: bool = Field(default=True, description="Lazy-load models on first use")
    device: Literal["cpu", "cuda", "mps", "auto"] = Field(
        default="auto", description="Device for model inference"
    )
    ner: NERModelConfig = Field(default_factory=NERModelConfig)
    guard: GuardModelConfig = Field(default_factory=GuardModelConfig)
    embeddings: EmbeddingsModelConfig = Field(default_factory=EmbeddingsModelConfig)


class ConfidenceThresholdsConfig(BaseModel):
    """Confidence threshold configuration."""

    high: float = Field(
        default=0.9, ge=0.0, le=1.0, description="High confidence threshold (block)"
    )
    medium_min: float = Field(
        default=0.5, ge=0.0, le=1.0, description="Medium confidence minimum (warn)"
    )
    low: float = Field(default=0.3, ge=0.0, le=1.0, description="Low confidence threshold (log)")

    @model_validator(mode="after")
    def validate_thresholds(self) -> "ConfidenceThresholdsConfig":
        """Ensure thresholds are in correct order."""
        if not (self.high > self.medium_min > self.low):
            raise ValueError("Thresholds must be: high > medium_min > low")
        return self


class SecurityChecksConfig(BaseModel):
    """Security checks configuration."""

    ner_enabled: bool = Field(default=True, description="Enable NER validation")
    guard_enabled: bool = Field(default=True, description="Enable Llama Guard validation")
    regex_enabled: bool = Field(default=True, description="Enable regex pattern matching")
    seed_phrase_enabled: bool = Field(
        default=True, description="Enable BIP39 seed phrase detection"
    )
    embeddings_enabled: bool = Field(default=True, description="Enable embedding-based matching")


class RedactionConfig(BaseModel):
    """Redaction configuration."""

    enabled: bool = Field(default=True, description="Enable redaction of sensitive data")
    placeholder: str = Field(default="[REDACTED]", description="Placeholder for redacted data")


class SecurityConfig(BaseModel):
    """Security configuration."""

    confidence: ConfidenceThresholdsConfig = Field(default_factory=ConfidenceThresholdsConfig)
    checks: SecurityChecksConfig = Field(default_factory=SecurityChecksConfig)
    redaction: RedactionConfig = Field(default_factory=RedactionConfig)


class SQLiteConfig(BaseModel):
    """SQLite storage configuration."""

    path: str = Field(default="./data/events.db", description="Path to SQLite database")
    retention_days: int = Field(
        default=30, ge=1, le=365, description="Days to retain security events"
    )


class ChromaDBConfig(BaseModel):
    """ChromaDB storage configuration."""

    path: str = Field(default="./data/chroma", description="Path to ChromaDB persistent storage")
    collection_name: str = Field(
        default="attack_patterns", description="Collection name for attack patterns"
    )


class StorageConfig(BaseModel):
    """Storage configuration."""

    sqlite: SQLiteConfig = Field(default_factory=SQLiteConfig)
    chromadb: ChromaDBConfig = Field(default_factory=ChromaDBConfig)


class ProviderConfig(BaseModel):
    """LLM provider configuration."""

    provider: str = Field(..., description="Provider name (openai, anthropic, etc.)")
    api_key: str = Field(..., description="Encrypted API key")
    base_url: str | None = Field(default=None, description="Custom API base URL")
    timeout: int = Field(default=30, ge=1, description="Request timeout in seconds")
    default: bool = Field(default=False, description="Whether this is the default provider")


class SentryConfig(BaseModel):
    """Sentry observability configuration."""

    dsn: str = Field(default="", description="Sentry DSN (empty = disabled)")
    environment: str = Field(default="production", description="Sentry environment")
    traces_sample_rate: float = Field(default=0.1, ge=0.0, le=1.0, description="Traces sample rate")


class LoggingConfig(BaseModel):
    """Logging configuration."""

    level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO", description="Log level"
    )
    format: Literal["json", "text"] = Field(default="json", description="Log format")


class ObservabilityConfig(BaseModel):
    """Observability configuration."""

    sentry: SentryConfig = Field(default_factory=SentryConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)


class Config(BaseModel):
    """Main configuration model."""

    proxy: ProxyConfig = Field(default_factory=ProxyConfig)
    dashboard: DashboardConfig = Field(default_factory=DashboardConfig)
    models: ModelsConfig = Field(default_factory=ModelsConfig)
    security: SecurityConfig = Field(default_factory=SecurityConfig)
    storage: StorageConfig = Field(default_factory=StorageConfig)
    providers: list[ProviderConfig] = Field(default_factory=list, description="LLM providers")
    observability: ObservabilityConfig = Field(default_factory=ObservabilityConfig)
    disabled_checks: list[str] = Field(
        default_factory=list,
        description="Disabled checks (pii, financial_secret, prompt_injection, etc.)",
    )

    @model_validator(mode="after")
    def validate_ports(self) -> "Config":
        """Ensure proxy and dashboard ports are different."""
        if self.proxy.port == self.dashboard.port:
            raise ValueError("Proxy and dashboard ports must be different")
        return self

    @model_validator(mode="after")
    def validate_default_provider(self) -> "Config":
        """Ensure exactly one provider is marked as default if providers exist."""
        if self.providers:
            default_count = sum(1 for p in self.providers if p.default)
            if default_count == 0:
                # Auto-mark first provider as default
                self.providers[0].default = True
            elif default_count > 1:
                raise ValueError("Only one provider can be marked as default")
        return self


class ConfigManager:
    """Configuration manager with encryption support."""

    def __init__(self, config_path: Path | None = None):
        """Initialize configuration manager.

        Args:
            config_path: Path to configuration file (defaults to ~/.bandaid/config.toml)
        """
        self.config_path = config_path or Path.home() / ".bandaid" / "config.toml"
        self._config: Config | None = None
        self._fernet: Fernet | None = None

    def _get_encryption_key(self) -> bytes:
        """Get or create encryption key for API keys."""
        key_path = Path.home() / ".bandaid" / ".key"
        key_path.parent.mkdir(parents=True, exist_ok=True)

        if key_path.exists():
            return key_path.read_bytes()

        # Generate new key
        key = Fernet.generate_key()
        key_path.write_bytes(key)
        key_path.chmod(0o600)  # Restrict permissions
        return key

    def _get_fernet(self) -> Fernet:
        """Get Fernet cipher for encryption/decryption."""
        if self._fernet is None:
            key = self._get_encryption_key()
            self._fernet = Fernet(key)
        return self._fernet

    def encrypt_api_key(self, api_key: str) -> str:
        """Encrypt API key for storage.

        Args:
            api_key: Plain text API key

        Returns:
            Encrypted API key as base64 string
        """
        fernet = self._get_fernet()
        encrypted = fernet.encrypt(api_key.encode())
        return encrypted.decode()

    def decrypt_api_key(self, encrypted_key: str) -> str:
        """Decrypt API key from storage.

        Args:
            encrypted_key: Encrypted API key as base64 string

        Returns:
            Decrypted API key
        """
        fernet = self._get_fernet()
        decrypted = fernet.decrypt(encrypted_key.encode())
        return decrypted.decode()

    def _interpolate_env_vars(self, value: Any) -> Any:
        """Recursively interpolate environment variables in configuration values.

        Replaces ${VAR_NAME} with environment variable value.

        Args:
            value: Configuration value (can be dict, list, string, etc.)

        Returns:
            Value with environment variables interpolated
        """
        if isinstance(value, str):
            if value.startswith("${") and value.endswith("}"):
                env_var = value[2:-1]
                return os.getenv(env_var, "")
            return value
        elif isinstance(value, dict):
            return {k: self._interpolate_env_vars(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [self._interpolate_env_vars(item) for item in value]
        return value

    def load_config(self, config_path: Path | None = None) -> Config:
        """Load configuration from TOML file.

        Args:
            config_path: Path to configuration file (overrides default)

        Returns:
            Loaded configuration

        Raises:
            FileNotFoundError: If configuration file not found
            ValueError: If configuration is invalid
        """
        path = config_path or self.config_path

        if not path.exists():
            raise FileNotFoundError(
                f"Configuration file not found: {path}\n"
                f"Run 'guardrail setup' to create configuration."
            )

        with open(path, "rb") as f:
            raw_config = tomllib.load(f)

        # Interpolate environment variables
        interpolated_config = self._interpolate_env_vars(raw_config)

        # Validate and create Config model
        try:
            config = Config(**interpolated_config)
            self._config = config
            return config
        except Exception as e:
            raise ValueError(f"Invalid configuration: {e}") from e

    def save_config(self, config: Config, config_path: Path | None = None) -> None:
        """Save configuration to TOML file.

        Args:
            config: Configuration to save
            config_path: Path to save configuration (overrides default)
        """
        path = config_path or self.config_path
        path.parent.mkdir(parents=True, exist_ok=True)

        # Convert config to dict (Pydantic model_dump)
        config_dict = config.model_dump(exclude_none=True)

        # Convert to TOML format (manual serialization since tomllib only loads)
        toml_str = self._dict_to_toml(config_dict)

        path.write_text(toml_str)
        path.chmod(0o600)  # Restrict permissions

    def _dict_to_toml(self, data: dict[str, Any], prefix: str = "") -> str:
        """Convert dictionary to TOML format string.

        Args:
            data: Dictionary to convert
            prefix: Prefix for nested tables

        Returns:
            TOML formatted string
        """
        lines = []

        # Simple values first
        for key, value in data.items():
            if not isinstance(value, (dict, list)):
                lines.append(f"{key} = {self._value_to_toml(value)}")

        # Then tables
        for key, value in data.items():
            if isinstance(value, dict) and not self._is_array_of_tables(value):
                table_name = f"{prefix}.{key}" if prefix else key
                lines.append(f"\n[{table_name}]")
                lines.append(self._dict_to_toml(value, table_name))
            elif isinstance(value, list) and value and isinstance(value[0], dict):
                # Array of tables
                for item in value:
                    table_name = f"{prefix}.{key}" if prefix else key
                    lines.append(f"\n[[{table_name}]]")
                    lines.append(self._dict_to_toml(item, ""))

        return "\n".join(lines)

    def _is_array_of_tables(self, value: Any) -> bool:
        """Check if value should be serialized as array of tables."""
        return bool(isinstance(value, list) and value and isinstance(value[0], dict))

    def _value_to_toml(self, value: Any) -> str:
        """Convert Python value to TOML representation."""
        if isinstance(value, bool):
            return str(value).lower()
        elif isinstance(value, str):
            return f'"{value}"'
        elif isinstance(value, (int, float)):
            return str(value)
        elif isinstance(value, list):
            items = [self._value_to_toml(item) for item in value]
            return f"[{', '.join(items)}]"
        return str(value)

    @property
    def config(self) -> Config:
        """Get loaded configuration.

        Returns:
            Loaded configuration

        Raises:
            RuntimeError: If configuration not loaded
        """
        if self._config is None:
            raise RuntimeError("Configuration not loaded. Call load_config() first.")
        return self._config


# Global config manager instance
_config_manager: ConfigManager | None = None


def get_config_manager() -> ConfigManager:
    """Get global configuration manager instance."""
    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigManager()
    return _config_manager


def load_config(config_path: Path | None = None) -> Config:
    """Load configuration from file.

    Args:
        config_path: Path to configuration file

    Returns:
        Loaded configuration
    """
    manager = get_config_manager()
    return manager.load_config(config_path)


def get_config() -> Config:
    """Get currently loaded configuration.

    Returns:
        Current configuration

    Raises:
        RuntimeError: If configuration not loaded
    """
    manager = get_config_manager()
    return manager.config


def detect_device() -> Literal["cpu", "cuda", "mps"]:
    """Auto-detect best available device for model inference.

    Returns:
        Detected device: "cuda" if NVIDIA GPU available,
                        "mps" if Apple Silicon GPU available,
                        "cpu" otherwise
    """
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        elif torch.backends.mps.is_available():
            return "mps"
        else:
            return "cpu"
    except ImportError:
        # If torch not installed, default to CPU
        return "cpu"


def get_device() -> Literal["cpu", "cuda", "mps"]:
    """Get device for model inference based on configuration.

    Checks configuration for device setting. If set to "auto",
    auto-detects best available device.

    Returns:
        Device to use: "cuda", "mps", or "cpu"
    """
    try:
        config = get_config()
        device = config.models.device

        if device == "auto":
            return detect_device()
        else:
            return device
    except RuntimeError:
        # Configuration not loaded, auto-detect
        return detect_device()


async def validate_provider_config(provider: ProviderConfig, timeout: int = 10) -> dict[str, Any]:
    """Validate provider configuration by testing API connectivity.

    Args:
        provider: Provider configuration to validate
        timeout: Request timeout in seconds

    Returns:
        Dictionary with validation results:
        {
            "valid": bool,
            "provider": str,
            "error": str (if invalid),
            "models": list (if valid)
        }
    """
    import httpx

    result = {"valid": False, "provider": provider.provider, "error": None, "models": []}

    try:
        # Decrypt API key
        manager = get_config_manager()
        api_key = manager.decrypt_api_key(provider.api_key)

        # Build test request based on provider
        if provider.provider.lower() == "openai":
            # Test OpenAI API
            url = provider.base_url or "https://api.openai.com/v1"
            headers = {"Authorization": f"Bearer {api_key}"}

            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(f"{url}/models", headers=headers)

                if response.status_code == 200:
                    data = response.json()
                    result["valid"] = True
                    result["models"] = [m["id"] for m in data.get("data", [])[:5]]  # First 5 models
                else:
                    result["error"] = f"HTTP {response.status_code}: {response.text[:100]}"

        elif provider.provider.lower() == "anthropic":
            # Test Anthropic API
            url = provider.base_url or "https://api.anthropic.com/v1"
            headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01"}

            # Anthropic doesn't have a models endpoint, so we make a small completion request
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{url}/messages",
                    headers=headers,
                    json={
                        "model": "claude-3-haiku-20240307",
                        "max_tokens": 1,
                        "messages": [{"role": "user", "content": "test"}],
                    },
                )

                if response.status_code in [200, 201]:
                    result["valid"] = True
                    result["models"] = [
                        "claude-3-haiku-20240307",
                        "claude-3-sonnet-20240229",
                        "claude-3-opus-20240229",
                    ]
                else:
                    result["error"] = f"HTTP {response.status_code}: {response.text[:100]}"

        elif provider.provider.lower() == "google":
            # Test Google Gemini API
            url = provider.base_url or "https://generativelanguage.googleapis.com/v1"

            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(f"{url}/models?key={api_key}")

                if response.status_code == 200:
                    data = response.json()
                    result["valid"] = True
                    result["models"] = [m["name"] for m in data.get("models", [])[:5]]
                else:
                    result["error"] = f"HTTP {response.status_code}: {response.text[:100]}"

        elif provider.provider.lower() == "cohere":
            # Test Cohere API
            url = provider.base_url or "https://api.cohere.ai/v1"
            headers = {"Authorization": f"Bearer {api_key}"}

            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(f"{url}/models", headers=headers)

                if response.status_code == 200:
                    data = response.json()
                    result["valid"] = True
                    result["models"] = [m["name"] for m in data.get("models", [])[:5]]
                else:
                    result["error"] = f"HTTP {response.status_code}: {response.text[:100]}"

        else:
            # Unknown provider - skip validation
            result["error"] = f"Provider validation not implemented for: {provider.provider}"
            result["valid"] = None  # Neither valid nor invalid

    except httpx.TimeoutException:
        result["error"] = f"Request timeout after {timeout}s"
    except httpx.HTTPError as e:
        result["error"] = f"HTTP error: {str(e)}"
    except Exception as e:
        result["error"] = f"Validation error: {str(e)}"

    return result
