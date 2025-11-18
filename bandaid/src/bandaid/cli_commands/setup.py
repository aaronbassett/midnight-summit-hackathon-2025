"""Setup command implementation for Bandaid CLI.

Interactive wizard for initial configuration with API key encryption and model downloads.
"""

from pathlib import Path

import toml
import typer
from cryptography.fernet import Fernet
from rich.console import Console
from rich.prompt import Confirm, IntPrompt, Prompt

console = Console()


def run_setup(
    config_path: Path,
    non_interactive: bool = False,
    force: bool = False,
    model_device: str | None = None,
):
    """Interactive wizard for initial configuration.

    Args:
        config_path: Path to configuration file
        non_interactive: Skip wizard, use defaults
        force: Overwrite existing configuration
        model_device: Set model device (cpu, cuda, mps)

    Raises:
        typer.Exit: On completion or error
    """
    # Check if config exists
    if config_path.exists() and not force:
        console.print(f"[yellow]⚠ Configuration already exists: {config_path}[/yellow]")
        if not Confirm.ask("Overwrite existing configuration?", default=False):
            console.print("[dim]Setup cancelled[/dim]")
            raise typer.Exit(0)

    # Welcome screen
    if not non_interactive:
        console.print("\n[bold cyan]Welcome to Bandaid Security Proxy Setup![/bold cyan]\n")
        console.print("This wizard will guide you through initial configuration.")
        console.print(f"You can change these settings later by editing {config_path}\n")

        if not Confirm.ask("Press Enter to continue", default=True):
            console.print("[dim]Setup cancelled[/dim]")
            raise typer.Exit(1)

    # Configuration dictionary
    config = {
        "general": {
            "proxy_port": 8000,
            "dashboard_port": 8001,
            "log_retention_days": 30,
            "model_device": "cpu",
        },
        "confidence_thresholds": {
            "high": 0.9,
            "medium_min": 0.5,
        },
        "disabled_checks": {
            "checks": [],
        },
        "providers": [],
        "observability": {
            "sentry_dsn": "",
        },
    }

    # Proxy port configuration
    if not non_interactive:
        console.print("\n[bold]Proxy Server Port[/bold]")
        console.print("-" * 50)
        console.print("Your applications will send requests to this port.\n")
        console.print(f"Default port: [cyan]{config['general']['proxy_port']}[/cyan]")

        proxy_port = IntPrompt.ask(
            "Enter port (1024-65535) or press Enter for default",
            default=config["general"]["proxy_port"],
        )

        if not (1024 <= proxy_port <= 65535):
            console.print("[red]✗ Invalid port number[/red]")
            raise typer.Exit(2)

        config["general"]["proxy_port"] = proxy_port

    # Dashboard port configuration
    if not non_interactive:
        console.print("\n[bold]Dashboard Port[/bold]")
        console.print("-" * 50)
        console.print("The web dashboard will be available at http://localhost:PORT/dashboard\n")
        console.print(f"Default port: [cyan]{config['general']['dashboard_port']}[/cyan]")

        dashboard_port = IntPrompt.ask(
            "Enter port (1024-65535, must differ from proxy port) or press Enter for default",
            default=config["general"]["dashboard_port"],
        )

        if not (1024 <= dashboard_port <= 65535):
            console.print("[red]✗ Invalid port number[/red]")
            raise typer.Exit(2)

        if dashboard_port == config["general"]["proxy_port"]:
            console.print("[red]✗ Dashboard port must differ from proxy port[/red]")
            raise typer.Exit(2)

        config["general"]["dashboard_port"] = dashboard_port

    # Provider configuration
    if not non_interactive:
        console.print("\n[bold]LLM Provider Setup[/bold]")
        console.print("-" * 50)
        console.print("Configure at least one LLM provider. You can add more later.\n")
        console.print(
            "Available providers: [cyan]OpenAI, Anthropic, Google (Gemini), Cohere[/cyan]\n"
        )

        providers_configured = _configure_providers()
        config["providers"] = providers_configured

        if not providers_configured:
            console.print("[red]✗ At least one provider must be configured[/red]")
            raise typer.Exit(2)
    else:
        # Non-interactive: skip provider setup (can be done later)
        console.print("[dim]Skipping provider setup (non-interactive mode)[/dim]")

    # Sentry configuration
    if not non_interactive:
        console.print("\n[bold]Sentry Integration (Optional)[/bold]")
        console.print("-" * 50)
        console.print("Send security events to Sentry for centralized monitoring.\n")

        if Confirm.ask("Enable Sentry?", default=False):
            sentry_dsn = Prompt.ask("Sentry DSN")
            config["observability"]["sentry_dsn"] = sentry_dsn
        else:
            config["observability"]["sentry_dsn"] = ""

    # Model device selection
    if model_device:
        config["general"]["model_device"] = model_device
    elif not non_interactive:
        console.print("\n[bold]ML Model Device[/bold]")
        console.print("-" * 50)
        console.print("Choose where to run security models:")
        console.print("  • [cyan]cpu[/cyan]: Universal, slower (~1200ms for Guard)")
        console.print("  • [cyan]cuda[/cyan]: NVIDIA GPU, faster (~300ms for Guard)")
        console.print("  • [cyan]mps[/cyan]: Apple Silicon GPU, faster (~400ms for Guard)\n")

        # Detect available hardware
        detected = _detect_device()
        console.print(f"Detected hardware: [cyan]{detected}[/cyan]\n")

        device = Prompt.ask(
            "Select device",
            default=detected,
            choices=["cpu", "cuda", "mps"],
        )
        config["general"]["model_device"] = device

    # Configuration summary
    if not non_interactive:
        console.print("\n[bold]Configuration Summary[/bold]")
        console.print("-" * 50)
        console.print(f"Proxy Port: {config['general']['proxy_port']}")
        console.print(f"Dashboard Port: {config['general']['dashboard_port']}")

        if config["providers"]:
            provider_names = [
                f"{p['provider'].capitalize()}{' (default)' if p.get('default') else ''}"
                for p in config["providers"]
            ]
            console.print(f"Providers: {', '.join(provider_names)}")
        else:
            console.print("Providers: (none)")

        sentry_status = "Enabled" if config["observability"]["sentry_dsn"] else "Disabled"
        console.print(f"Sentry: {sentry_status}")
        console.print(f"Model Device: {config['general']['model_device']}\n")

        if not Confirm.ask("Save configuration?", default=True):
            console.print("[dim]Setup cancelled[/dim]")
            raise typer.Exit(0)

    # Save configuration
    try:
        config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(config_path, "w") as f:
            toml.dump(config, f)
        console.print(f"\n✓ Configuration saved to [cyan]{config_path}[/cyan]")
    except Exception as e:
        console.print(f"[red]✗ Failed to save configuration: {e}[/red]")
        raise typer.Exit(2) from e

    # Model download
    if not non_interactive:
        console.print("\n[bold]Downloading ML Models...[/bold]")
        _download_models(config["general"]["model_device"])

    # Completion
    console.print("\n[bold green]✓ Setup Complete![/bold green]\n")
    console.print("[bold]Next Steps:[/bold]")
    console.print("  1. Start the proxy: [cyan]guardrail start[/cyan]")
    console.print("  2. View the dashboard: [cyan]guardrail dashboard[/cyan]")
    console.print(
        "  3. Test integration: Change your LLM API endpoint to [cyan]http://localhost:8000/v1[/cyan]\n"
    )
    console.print("For help, run: [cyan]guardrail --help[/cyan]\n")


def _configure_providers() -> list[dict]:
    """Configure LLM providers interactively.

    Returns:
        List of provider configurations
    """
    providers = []
    first_provider = True

    while True:
        available = ["openai", "anthropic", "google", "cohere"]

        if first_provider:
            provider_name = Prompt.ask(
                "Which provider do you want to configure?",
                default="openai",
                choices=available,
            )
        else:
            if not Confirm.ask("\nAdd another provider?", default=False):
                break

            provider_name = Prompt.ask(
                "Which provider?",
                choices=available,
            )

        console.print(f"\n[bold]{provider_name.capitalize()} Configuration[/bold]")
        console.print("-" * 50)

        api_key = Prompt.ask("API Key", password=True)

        # Encrypt API key
        encrypted_key = _encrypt_api_key(api_key)

        api_base = Prompt.ask("Custom API Base URL (optional, press Enter to skip)", default="")

        set_default = Confirm.ask("Set as default provider?", default=first_provider)

        providers.append(
            {
                "provider": provider_name,
                "api_key": encrypted_key,
                "api_base": api_base,
                "default": set_default,
            }
        )

        first_provider = False

    return providers


def _encrypt_api_key(api_key: str) -> str:
    """Encrypt an API key using Fernet.

    Args:
        api_key: Plain text API key

    Returns:
        Encrypted API key (base64 encoded)
    """
    # Generate or load encryption key
    key_file = Path.home() / ".bandaid" / ".encryption_key"

    if key_file.exists():
        key = key_file.read_bytes()
    else:
        key = Fernet.generate_key()
        key_file.parent.mkdir(parents=True, exist_ok=True)
        key_file.write_bytes(key)
        key_file.chmod(0o600)  # Restrict permissions

    fernet = Fernet(key)
    encrypted = fernet.encrypt(api_key.encode())
    return encrypted.decode()


def _detect_device() -> str:
    """Detect available hardware acceleration.

    Returns:
        Device name (cpu, cuda, or mps)
    """
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        elif torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass

    return "cpu"


def _download_models(device: str):
    """Download required ML models.

    Args:
        device: Device for model loading (cpu, cuda, mps)
    """
    from transformers import AutoModelForTokenClassification, AutoTokenizer

    models_to_download = [
        ("dslim/bert-base-NER", "NER Model"),
        ("meta-llama/Llama-Guard-3-8B", "Guard Model (this may take a while...)"),
        ("sentence-transformers/all-MiniLM-L6-v2", "Embedding Model"),
    ]

    for model_id, model_name in models_to_download:
        try:
            console.print(f"⏳ Downloading {model_name}...")

            if "sentence-transformers" in model_id:
                from sentence_transformers import SentenceTransformer

                SentenceTransformer(model_id)
            else:
                AutoTokenizer.from_pretrained(model_id)
                AutoModelForTokenClassification.from_pretrained(model_id)

            console.print(f"✓ {model_name} downloaded")
        except Exception as e:
            console.print(f"[yellow]⚠ Failed to download {model_name}: {e}[/yellow]")
            console.print("[dim]Models will be downloaded on first use[/dim]")
