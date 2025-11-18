"""Bandaid Security Proxy CLI.

Provides command-line interface for managing the proxy lifecycle, configuration,
and monitoring via the `guardrail` command.
"""

from pathlib import Path

import typer
from rich import print as rprint
from rich.console import Console

from bandaid.observability.logger import get_logger

logger = get_logger(__name__)
console = Console()

# Create Typer app
app = typer.Typer(
    name="guardrail",
    help="Bandaid Security Proxy - LLM security and threat detection",
    add_completion=True,
    rich_markup_mode="rich",
)

# Create config subcommand group
config_app = typer.Typer(help="Configuration management commands")
app.add_typer(config_app, name="config")


def version_callback(value: bool):
    """Show version and exit."""
    if value:
        rprint("[bold]Bandaid Security Proxy[/bold]")
        rprint("Version: [cyan]1.0.0[/cyan]")
        rprint("Python ML-based security proxy for LLM applications")
        raise typer.Exit()


@app.callback()
def main(
    ctx: typer.Context,
    config: Path | None = typer.Option(
        None,
        "--config",
        help="Path to config file (default: ~/.bandaid/config.toml)",
        envvar="BANDAID_CONFIG",
    ),
    verbose: bool = typer.Option(
        False,
        "--verbose",
        "-v",
        help="Enable verbose logging output",
    ),
    quiet: bool = typer.Option(
        False,
        "--quiet",
        "-q",
        help="Suppress all non-error output",
    ),
    version: bool | None = typer.Option(
        None,
        "--version",
        callback=version_callback,
        is_eager=True,
        help="Show version and exit",
    ),
):
    """Bandaid Security Proxy CLI - Global options and configuration."""
    ctx.obj = {
        "config_path": config or Path.home() / ".bandaid" / "config.toml",
        "verbose": verbose,
        "quiet": quiet,
    }


@app.command()
def setup(
    ctx: typer.Context,
    non_interactive: bool = typer.Option(
        False,
        "--non-interactive",
        help="Skip wizard, use defaults (for CI/testing)",
    ),
    force: bool = typer.Option(
        False,
        "--force",
        help="Overwrite existing configuration",
    ),
    model_device: str | None = typer.Option(
        None,
        "--model-device",
        help="Set model device (cpu, cuda, mps)",
    ),
):
    """
    Interactive wizard for initial configuration.

    Sets up proxy ports, LLM providers, Sentry integration, and downloads ML models.
    """
    from bandaid.cli_commands.setup import run_setup

    try:
        config_path = ctx.obj["config_path"]
        run_setup(
            config_path=config_path,
            non_interactive=non_interactive,
            force=force,
            model_device=model_device,
        )
    except KeyboardInterrupt:
        console.print("\n[yellow]Setup cancelled by user[/yellow]")
        raise typer.Exit(1) from None
    except Exception as e:
        console.print(f"[red]✗ Setup failed: {e}[/red]")
        logger.error("setup command failed", error=str(e), exc_info=True)
        raise typer.Exit(1) from e


@app.command()
def start(
    ctx: typer.Context,
    foreground: bool = typer.Option(
        False,
        "--foreground",
        "-f",
        help="Run in foreground (don't detach)",
    ),
    port: int | None = typer.Option(
        None,
        "--port",
        help="Override proxy port from config",
    ),
    dashboard_port: int | None = typer.Option(
        None,
        "--dashboard-port",
        help="Override dashboard port from config",
    ),
    reload: bool = typer.Option(
        False,
        "--reload",
        help="Enable auto-reload on code changes (development)",
    ),
):
    """
    Start the Bandaid proxy server.

    Starts both the proxy server (default: port 8000) and dashboard (default: port 8001).
    """
    from bandaid.cli_commands.start import run_start

    try:
        config_path = ctx.obj["config_path"]
        exit_code = run_start(
            config_path=config_path,
            foreground=foreground,
            port_override=port,
            dashboard_port_override=dashboard_port,
            reload=reload,
        )
        raise typer.Exit(exit_code)
    except KeyboardInterrupt:
        console.print("\n[yellow]Proxy startup cancelled[/yellow]")
        raise typer.Exit(1) from None
    except Exception as e:
        console.print(f"[red]✗ Failed to start proxy: {e}[/red]")
        logger.error("start command failed", error=str(e), exc_info=True)
        raise typer.Exit(1) from e


@app.command()
def stop(
    ctx: typer.Context,
    force: bool = typer.Option(
        False,
        "--force",
        "-f",
        help="Force kill if graceful shutdown fails",
    ),
    timeout: int = typer.Option(
        30,
        "--timeout",
        help="Graceful shutdown timeout in seconds",
    ),
):
    """
    Stop the Bandaid proxy server gracefully.

    Sends SIGTERM for graceful shutdown, waits for completion, and removes PID file.
    """
    from bandaid.cli_commands.stop import run_stop

    try:
        exit_code = run_stop(force=force, timeout=timeout)
        raise typer.Exit(exit_code)
    except Exception as e:
        console.print(f"[red]✗ Failed to stop proxy: {e}[/red]")
        logger.error("stop command failed", error=str(e), exc_info=True)
        raise typer.Exit(1) from e


@app.command()
def validate(
    ctx: typer.Context,
    check_models: bool = typer.Option(
        False,
        "--check-models",
        help="Test load all ML models (slow)",
    ),
    check_providers: bool = typer.Option(
        False,
        "--check-providers",
        help="Validate API keys with test requests",
    ),
):
    """
    Validate configuration and check system health.

    Checks config file, ports, models, providers, and storage.
    """
    from bandaid.cli_commands.validate import run_validate

    try:
        config_path = ctx.obj["config_path"]
        exit_code = run_validate(
            config_path=config_path,
            check_models=check_models,
            check_providers=check_providers,
        )
        raise typer.Exit(exit_code)
    except Exception as e:
        console.print(f"[red]✗ Validation failed: {e}[/red]")
        logger.error("validate command failed", error=str(e), exc_info=True)
        raise typer.Exit(2) from e


@app.command()
def dashboard(
    ctx: typer.Context,
    port: int | None = typer.Option(
        None,
        "--port",
        help="Override dashboard port",
    ),
    no_open: bool = typer.Option(
        False,
        "--no-open",
        help="Print URL but don't open browser",
    ),
):
    """
    Open the web dashboard in the default browser.

    Requires the proxy to be running.
    """
    from bandaid.cli_commands.dashboard import run_dashboard

    try:
        exit_code = run_dashboard(
            port_override=port,
            no_open=no_open,
        )
        raise typer.Exit(exit_code)
    except Exception as e:
        console.print(f"[red]✗ Failed to open dashboard: {e}[/red]")
        logger.error("dashboard command failed", error=str(e), exc_info=True)
        raise typer.Exit(1) from e


@config_app.command("show")
def config_show(
    ctx: typer.Context,
    format: str = typer.Option(
        "table",
        "--format",
        help="Output format (table, json, yaml)",
    ),
    show_keys: bool = typer.Option(
        False,
        "--show-keys",
        help="Show masked API keys (e.g., sk-...abc)",
    ),
):
    """
    Display current configuration (sanitized).

    Shows ports, providers, thresholds, and settings without exposing sensitive data.
    """
    from bandaid.cli_commands.config_show import run_config_show

    try:
        config_path = ctx.parent.obj["config_path"] if ctx.parent else None
        from pathlib import Path

        exit_code = run_config_show(
            config_path=Path(config_path)
            if config_path
            else Path.home() / ".bandaid" / "config.toml",
            output_format=format,
            show_keys=show_keys,
        )
        raise typer.Exit(exit_code)
    except Exception as e:
        console.print(f"[red]✗ Failed to show config: {e}[/red]")
        logger.error("config show command failed", error=str(e), exc_info=True)
        raise typer.Exit(2) from e


@config_app.command("set")
def config_set(
    ctx: typer.Context,
    key: str = typer.Argument(..., help="Configuration key to set"),
    value: str = typer.Argument(..., help="New value"),
):
    """
    Update a configuration value without editing the file.

    Validates the new value and warns if proxy restart is required.

    Supported keys: proxy_port, dashboard_port, log_retention_days, model_device,
    confidence.high, confidence.medium_min, sentry_dsn
    """
    from bandaid.cli_commands.config_set import run_config_set

    try:
        config_path = ctx.parent.obj["config_path"] if ctx.parent else None
        from pathlib import Path

        exit_code = run_config_set(
            config_path=Path(config_path)
            if config_path
            else Path.home() / ".bandaid" / "config.toml",
            key=key,
            value=value,
        )
        raise typer.Exit(exit_code)
    except Exception as e:
        console.print(f"[red]✗ Failed to set config: {e}[/red]")
        logger.error("config set command failed", error=str(e), exc_info=True)
        raise typer.Exit(2) from e


@app.command()
def status(ctx: typer.Context):
    """
    Show proxy runtime status.

    Displays PID, uptime, recent activity, resource usage, and logs.
    """
    from bandaid.cli_commands.status import run_status

    try:
        exit_code = run_status()
        raise typer.Exit(exit_code)
    except Exception as e:
        console.print(f"[red]✗ Failed to get status: {e}[/red]")
        logger.error("status command failed", error=str(e), exc_info=True)
        raise typer.Exit(1) from e


def cli():
    """Entry point for the CLI."""
    app()


if __name__ == "__main__":
    cli()
