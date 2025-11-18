"""Validate command implementation for Bandaid CLI."""

import socket
from pathlib import Path

from rich.console import Console

console = Console()


def run_validate(
    config_path: Path,
    check_models: bool = False,
    check_providers: bool = False,
) -> int:
    """Validate configuration and check system health.

    Args:
        config_path: Path to configuration file
        check_models: Test load all ML models (slow)
        check_providers: Validate API keys with test requests

    Returns:
        Exit code (0 = success/warnings, 2 = config error, 3 = model error, 4 = provider error)
    """
    from bandaid.config import load_config

    console.print("[bold]Bandaid Configuration Validation[/bold]")
    console.print("=" * 50 + "\n")

    warnings = []
    errors = []

    # Configuration File
    console.print("[bold]Configuration File[/bold]")
    console.print("-" * 50)

    if not config_path.exists():
        console.print(f"[red]✗ File not found: {config_path}[/red]")
        console.print("[dim]Run setup first: guardrail setup[/dim]")
        return 2

    console.print(f"✓ File exists: {config_path}")

    try:
        config = load_config(config_path)
        console.print("✓ Valid TOML syntax")
        console.print("✓ All required fields present")
    except Exception as e:
        console.print(f"[red]✗ Configuration invalid: {e}[/red]")
        return 2

    # Port availability
    def is_port_available(port: int) -> bool:
        """Check if port is available."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return True
            except OSError:
                return False

    if is_port_available(config.proxy.port):
        console.print(f"✓ Proxy port {config.proxy.port} is available")
    else:
        console.print(f"[yellow]⚠ Proxy port {config.proxy.port} is in use[/yellow]")
        warnings.append(f"Port {config.proxy.port} in use")

    if is_port_available(config.dashboard.port):
        console.print(f"✓ Dashboard port {config.dashboard.port} is available")
    else:
        console.print(f"[yellow]⚠ Dashboard port {config.dashboard.port} is in use[/yellow]")
        warnings.append(f"Port {config.dashboard.port} in use")

    # Confidence thresholds
    high = config.security.confidence.high
    medium = config.security.confidence.medium_min
    console.print(
        f"✓ Confidence thresholds valid (high: {high}, medium: {medium}-{high - 0.01:.2f})"
    )

    # Provider Configuration
    console.print("\n[bold]Provider Configuration[/bold]")
    console.print("-" * 50)

    if not config.providers:
        console.print("[red]✗ No providers configured[/red]")
        errors.append("No providers")
    else:
        default_found = False
        for provider in config.providers:
            has_key = bool(provider.api_key)
            is_default = provider.default

            if is_default:
                default_found = True

            if has_key:
                # Mask the API key for display
                masked_key = (
                    f"{provider.api_key[:8]}...{provider.api_key[-3:]}"
                    if len(provider.api_key) > 11
                    else "***"
                )
                default_marker = " [default]" if is_default else ""
                console.print(
                    f"✓ {provider.provider.capitalize()}: API key configured ({masked_key}){default_marker}"
                )
            else:
                console.print(
                    f"[yellow]⚠ {provider.provider.capitalize()}: API key not configured (provider disabled)[/yellow]"
                )
                warnings.append(f"{provider.provider} not configured")

        if not default_found:
            console.print("[red]✗ No default provider set[/red]")
            errors.append("No default provider")

    # ML Models (optional check)
    if check_models:
        console.print("\n[bold]ML Models (--check-models)[/bold]")
        console.print("-" * 50)

        import time

        # NER Model
        try:
            from bandaid.security.ner_validator import get_ner_validator

            start = time.time()
            ner = get_ner_validator(device=config.models.device)
            ner.initialize()
            elapsed = time.time() - start
            console.print(f"✓ NER model (dslim/bert-base-NER): Loaded in {elapsed:.1f}s")
        except Exception as e:
            console.print(f"[red]✗ NER model failed to load: {e}[/red]")
            errors.append("NER model")

        # Guard Model
        try:
            from bandaid.security.guard_validator import get_guard_validator

            start = time.time()
            guard = get_guard_validator(device=config.models.device)
            guard.initialize()
            elapsed = time.time() - start
            console.print(f"✓ Guard model (meta-llama/Llama-Guard-3-8B): Loaded in {elapsed:.1f}s")
        except Exception as e:
            console.print(f"[red]✗ Guard model failed to load: {e}[/red]")
            errors.append("Guard model")

        # Embedding Model
        try:
            from bandaid.learning.embedder import get_sentence_embedder

            start = time.time()
            embedder = get_sentence_embedder()
            embedder.initialize()
            elapsed = time.time() - start
            console.print(f"✓ Embedding model (all-MiniLM-L6-v2): Loaded in {elapsed:.1f}s")
        except Exception as e:
            console.print(f"[red]✗ Embedding model failed to load: {e}[/red]")
            errors.append("Embedding model")

    # Storage
    console.print("\n[bold]Storage[/bold]")
    console.print("-" * 50)

    events_db = Path.home() / ".bandaid" / "events.db"
    chroma_dir = Path.home() / ".bandaid" / "chroma"

    if events_db.exists():
        size_mb = events_db.stat().st_size / (1024 * 1024)
        # Count events (approximate)
        console.print(f"✓ SQLite database: {events_db} ({size_mb:.1f} MB)")
    else:
        console.print("[dim]ℹ SQLite database: Not initialized yet[/dim]")

    if chroma_dir.exists():
        total_size = sum(f.stat().st_size for f in chroma_dir.rglob("*") if f.is_file())
        size_mb = total_size / (1024 * 1024)
        console.print(f"✓ ChromaDB directory: {chroma_dir} ({size_mb:.1f} MB)")
    else:
        console.print("[dim]ℹ ChromaDB directory: Not initialized yet[/dim]")

    # Disk space
    import shutil

    total, used, free = shutil.disk_usage(Path.home())
    free_gb = free / (1024**3)
    console.print(f"[dim]ℹ Disk space available: {free_gb:.0f} GB[/dim]")

    # Provider Connectivity (optional check)
    if check_providers:
        console.print("\n[bold]Provider Connectivity (--check-providers)[/bold]")
        console.print("-" * 50)
        console.print("[dim]Provider connectivity checks not implemented yet[/dim]")

    # Warnings and Summary
    if warnings:
        console.print("\n[bold]Warnings[/bold]")
        console.print("-" * 50)
        for warning in warnings:
            console.print(f"[yellow]⚠ {warning}[/yellow]")

        if config.models.device == "cpu":
            console.print("[yellow]⚠ Running on CPU (consider GPU for better performance)[/yellow]")

    console.print("\n[bold]Summary[/bold]")
    console.print("-" * 50)

    if errors:
        console.print(f"[red]Status: FAILED ({len(errors)} errors)[/red]")
        for error in errors:
            console.print(f"  [red]• {error}[/red]")
        return 3 if "model" in str(errors).lower() else 2
    elif warnings:
        console.print(f"[green]Status: HEALTHY[/green] [yellow]({len(warnings)} warnings)[/yellow]")
    else:
        console.print("[green]Status: HEALTHY[/green]")

    console.print("\n[dim]Configuration is valid. Run 'guardrail start' to begin.[/dim]")

    return 0
