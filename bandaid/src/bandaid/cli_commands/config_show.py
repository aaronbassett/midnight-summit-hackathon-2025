"""Config show command implementation for Bandaid CLI."""

from pathlib import Path

from rich.console import Console

console = Console()


def run_config_show(
    config_path: Path,
    output_format: str = "table",
    show_keys: bool = False,
) -> int:
    """Display current configuration (sanitized).

    Args:
        config_path: Path to configuration file
        output_format: Output format (table, json, yaml)
        show_keys: Show masked API keys

    Returns:
        Exit code (0 = success, 2 = config not found/invalid)
    """
    if not config_path.exists():
        console.print(f"[red]✗ Configuration file not found: {config_path}[/red]")
        console.print("[dim]Run setup first: guardrail setup[/dim]")
        return 2

    try:
        from bandaid.config import load_config

        config = load_config(config_path)
    except Exception as e:
        console.print(f"[red]✗ Failed to load configuration: {e}[/red]")
        return 2

    if output_format == "json":
        # Output as JSON
        config_dict = {
            "general": {
                "config_file": str(config_path),
                "proxy_port": config.proxy.port,
                "dashboard_port": config.dashboard.port,
                "log_retention_days": config.storage.sqlite.retention_days,
                "model_device": config.models.device,
            },
            "providers": [
                {
                    "provider": p.provider,
                    "configured": bool(p.api_key),
                    "api_key": _mask_key(p.api_key) if show_keys and p.api_key else None,
                    "default": p.default,
                }
                for p in config.providers
            ],
            "confidence_thresholds": {
                "high": config.security.confidence.high,
                "medium_min": config.security.confidence.medium_min,
            },
            "disabled_checks": config.disabled_checks if config.disabled_checks else [],
            "sentry": {
                "enabled": bool(config.observability and config.observability.sentry.dsn),
                "dsn": _mask_dsn(config.observability.sentry.dsn)
                if config.observability and config.observability.sentry.dsn
                else None,
            },
        }
        console.print_json(data=config_dict)
        return 0

    elif output_format == "yaml":
        # Output as YAML (using TOML library for simplicity)
        console.print("[dim]YAML output not implemented, showing TOML:[/dim]\n")
        with open(config_path) as f:
            console.print(f.read())
        return 0

    else:  # table format (default)
        console.print("[bold]Bandaid Configuration[/bold]")
        console.print("=" * 50 + "\n")

        # General
        console.print("[bold]General[/bold]")
        console.print("-" * 50)
        console.print(f"Config File: {config_path}")
        console.print(f"Proxy Port: {config.proxy.port}")
        console.print(f"Dashboard Port: {config.dashboard.port}")
        console.print(f"Log Retention: {config.storage.sqlite.retention_days} days")
        console.print(f"Model Device: {config.models.device}")

        # Providers
        console.print("\n[bold]Providers[/bold]")
        console.print("-" * 50)
        if config.providers:
            for provider in config.providers:
                if provider.api_key:
                    key_display = _mask_key(provider.api_key) if show_keys else "***"
                    default_marker = " [default]" if provider.default else ""
                    console.print(
                        f"{provider.provider.capitalize()}: Configured ({key_display}){default_marker}"
                    )
                else:
                    console.print(f"{provider.provider.capitalize()}: Not configured")
        else:
            console.print("[dim](none)[/dim]")

        # Confidence Thresholds
        console.print("\n[bold]Confidence Thresholds[/bold]")
        console.print("-" * 50)
        console.print(f"High: ≥ {config.security.confidence.high} (block immediately)")
        console.print(
            f"Medium: {config.security.confidence.medium_min} - {config.security.confidence.high - 0.01:.2f} (log warning)"
        )
        console.print(f"Low: < {config.security.confidence.medium_min} (allow)")

        # Disabled Checks
        console.print("\n[bold]Disabled Checks[/bold]")
        console.print("-" * 50)
        if config.disabled_checks:
            for check in config.disabled_checks:
                console.print(f"• {check}")
        else:
            console.print("[dim](none)[/dim]")

        # Sentry
        console.print("\n[bold]Sentry[/bold]")
        console.print("-" * 50)
        if config.observability and config.observability.sentry and config.observability.sentry.dsn:
            console.print("Enabled: Yes")
            if show_keys:
                console.print(f"DSN: {_mask_dsn(config.observability.sentry.dsn)}")
            else:
                console.print("DSN: ***")
        else:
            console.print("Enabled: No")

        return 0


def _mask_key(key: str) -> str:
    """Mask an API key for display."""
    if len(key) > 11:
        return f"{key[:8]}...{key[-3:]}"
    return "***"


def _mask_dsn(dsn: str) -> str:
    """Mask a Sentry DSN for display."""
    if "@" in dsn:
        parts = dsn.split("@")
        return f"https://***@{parts[-1]}"
    return "***"
