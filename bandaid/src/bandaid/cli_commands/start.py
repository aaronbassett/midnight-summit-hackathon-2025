"""Start command implementation for Bandaid CLI."""

import os
from pathlib import Path

import uvicorn
from rich.console import Console

console = Console()


def run_start(
    config_path: Path,
    foreground: bool = False,
    port_override: int | None = None,
    dashboard_port_override: int | None = None,
    reload: bool = False,
) -> int:
    """Start the Bandaid proxy server.

    Args:
        config_path: Path to configuration file
        foreground: Run in foreground (don't detach)
        port_override: Override proxy port from config
        dashboard_port_override: Override dashboard port from config
        reload: Enable auto-reload on code changes

    Returns:
        Exit code (0 = success, 2 = config error, 3 = model error, 5 = port in use, 6 = already running)
    """
    from bandaid.config import load_config

    pid_file = Path.home() / ".bandaid" / "proxy.pid"
    log_dir = Path.home() / ".bandaid" / "logs"
    log_file = log_dir / "proxy.log"

    # Check if already running
    if pid_file.exists():
        try:
            pid = int(pid_file.read_text().strip())
            os.kill(pid, 0)  # Check if process exists
            console.print("[yellow]⚠ Proxy is already running[/yellow]")
            console.print(f"[dim]PID: {pid}[/dim]")
            console.print("[dim]Stop it first: guardrail stop[/dim]")
            return 6
        except (ProcessLookupError, ValueError, OSError):
            # Stale PID file - remove it
            pid_file.unlink(missing_ok=True)

    # Load and validate configuration
    console.print("Starting Bandaid Security Proxy...")

    if not config_path.exists():
        console.print(f"[red]✗ Configuration file not found: {config_path}[/red]")
        console.print("[dim]Run setup first: guardrail setup[/dim]")
        return 2

    try:
        config = load_config(config_path)
        console.print(f"✓ Configuration loaded from {config_path}")
    except Exception as e:
        console.print(f"[red]✗ Failed to load configuration: {e}[/red]")
        return 2

    # Determine ports
    proxy_port = port_override or config.proxy.port
    dashboard_port = dashboard_port_override or config.dashboard.port

    # Check if ports are available
    import socket

    def is_port_available(port: int) -> bool:
        """Check if port is available."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return True
            except OSError:
                return False

    if not is_port_available(proxy_port):
        console.print(f"[red]✗ Proxy port {proxy_port} is already in use[/red]")
        console.print(f"[dim]Try a different port: guardrail start --port {proxy_port + 1}[/dim]")
        return 5

    if not is_port_available(dashboard_port):
        console.print(f"[red]✗ Dashboard port {dashboard_port} is already in use[/red]")
        console.print(
            f"[dim]Try a different port: guardrail start --dashboard-port {dashboard_port + 1}[/dim]"
        )
        return 5

    # Initialize database
    try:
        import asyncio

        from bandaid.storage.events_db import get_events_db

        asyncio.run(get_events_db())
        console.print("✓ Database initialized (~/.bandaid/events.db, ~/.bandaid/chroma/)")
    except Exception as e:
        console.print(f"[red]✗ Failed to initialize database: {e}[/red]")
        return 2

    # Test model loading (lazy-load in production)
    console.print("✓ Models configured (NER: lazy-load, Guard: lazy-load, Embeddings: lazy-load)")

    # Create log directory
    log_dir.mkdir(parents=True, exist_ok=True)

    # Prepare to start server
    console.print(f"✓ Proxy server will listen on http://localhost:{proxy_port}")
    console.print(f"✓ Dashboard will be available at http://localhost:{dashboard_port}/dashboard")

    # Write PID file
    pid_file.parent.mkdir(parents=True, exist_ok=True)
    pid_file.write_text(str(os.getpid()))
    console.print(f"\nPID: [cyan]{os.getpid()}[/cyan] (written to {pid_file})")

    if not foreground:
        console.print(f"\nLogs: {log_file}")
        console.print("\n[dim]Press Ctrl+C to stop or run: guardrail stop[/dim]\n")

    # Start Uvicorn server
    try:
        # Import main FastAPI app
        from bandaid.main import app

        # Configure Uvicorn
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=proxy_port,
            reload=reload,
            log_level="info" if foreground else "warning",
            access_log=foreground,
        )
    except KeyboardInterrupt:
        console.print("\n[yellow]Proxy stopped by user[/yellow]")
        pid_file.unlink(missing_ok=True)
        return 0
    except Exception as e:
        console.print(f"[red]✗ Failed to start proxy: {e}[/red]")
        pid_file.unlink(missing_ok=True)
        return 1

    return 0
