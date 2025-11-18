"""Config set command implementation for Bandaid CLI."""

from pathlib import Path

import toml
from rich.console import Console

console = Console()

# Keys that require proxy restart
RESTART_REQUIRED_KEYS = {
    "proxy_port",
    "dashboard_port",
    "model_device",
    "confidence.high",
    "confidence.medium_min",
}


def run_config_set(config_path: Path, key: str, value: str) -> int:
    """Update a configuration value.

    Args:
        config_path: Path to configuration file
        key: Configuration key to set
        value: New value

    Returns:
        Exit code (0 = success, 2 = invalid key/value)
    """
    if not config_path.exists():
        console.print(f"[red]✗ Configuration file not found: {config_path}[/red]")
        console.print("[dim]Run setup first: guardrail setup[/dim]")
        return 2

    try:
        with open(config_path) as f:
            config_data = toml.load(f)
    except Exception as e:
        console.print(f"[red]✗ Failed to load configuration: {e}[/red]")
        return 2

    console.print("Updating configuration...")

    # Parse and validate key
    try:
        if key == "proxy_port":
            port = int(value)
            if not (1024 <= port <= 65535):
                raise ValueError("Port must be between 1024 and 65535")
            config_data["general"]["proxy_port"] = port

        elif key == "dashboard_port":
            port = int(value)
            if not (1024 <= port <= 65535):
                raise ValueError("Port must be between 1024 and 65535")
            config_data["general"]["dashboard_port"] = port

        elif key == "log_retention_days":
            days = int(value)
            if not (1 <= days <= 365):
                raise ValueError("Retention days must be between 1 and 365")
            config_data["general"]["log_retention_days"] = days

        elif key == "model_device":
            if value not in ("cpu", "cuda", "mps"):
                raise ValueError("Device must be one of: cpu, cuda, mps")
            config_data["general"]["model_device"] = value

        elif key == "confidence.high":
            threshold = float(value)
            if not (0.0 <= threshold <= 1.0):
                raise ValueError("Threshold must be between 0.0 and 1.0")
            if "confidence_thresholds" not in config_data:
                config_data["confidence_thresholds"] = {}
            config_data["confidence_thresholds"]["high"] = threshold

        elif key == "confidence.medium_min":
            threshold = float(value)
            if not (0.0 <= threshold <= 1.0):
                raise ValueError("Threshold must be between 0.0 and 1.0")
            if "confidence_thresholds" not in config_data:
                config_data["confidence_thresholds"] = {}
            config_data["confidence_thresholds"]["medium_min"] = threshold

        elif key == "sentry_dsn":
            if value.lower() in ("none", "null", ""):
                if "observability" not in config_data:
                    config_data["observability"] = {}
                config_data["observability"]["sentry_dsn"] = ""
            else:
                if "observability" not in config_data:
                    config_data["observability"] = {}
                config_data["observability"]["sentry_dsn"] = value

        else:
            console.print(f"[red]✗ Unknown configuration key: {key}[/red]")
            console.print("\n[dim]Supported keys:[/dim]")
            console.print("  • proxy_port")
            console.print("  • dashboard_port")
            console.print("  • log_retention_days")
            console.print("  • model_device")
            console.print("  • confidence.high")
            console.print("  • confidence.medium_min")
            console.print("  • sentry_dsn")
            return 2

    except ValueError as e:
        console.print(f"[red]✗ Invalid value for {key}: {e}[/red]")
        return 2

    # Write updated configuration
    try:
        with open(config_path, "w") as f:
            toml.dump(config_data, f)
        console.print(f"✓ Set [cyan]{key}[/cyan] = [green]{value}[/green]")
    except Exception as e:
        console.print(f"[red]✗ Failed to write configuration: {e}[/red]")
        return 2

    # Warn if restart required
    if key in RESTART_REQUIRED_KEYS:
        console.print("[yellow]⚠ Restart required: guardrail stop && guardrail start[/yellow]")

    return 0
