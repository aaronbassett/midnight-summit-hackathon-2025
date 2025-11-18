"""Dashboard command implementation for Bandaid CLI."""

import os
import webbrowser
from pathlib import Path

from rich.console import Console

console = Console()


def run_dashboard(port_override: int | None = None, no_open: bool = False) -> int:
    """Open the web dashboard in the default browser.

    Args:
        port_override: Override dashboard port
        no_open: Print URL but don't open browser

    Returns:
        Exit code (0 = success, 7 = not running)
    """
    from bandaid.config import load_config

    pid_file = Path.home() / ".bandaid" / "proxy.pid"
    config_path = Path.home() / ".bandaid" / "config.toml"

    console.print("Opening Bandaid Dashboard...")

    # Check if proxy is running
    if not pid_file.exists():
        console.print("[yellow]⚠ Proxy is not running[/yellow]")
        console.print("[dim]ℹ Start the proxy first: guardrail start[/dim]")
        console.print("[red]✗ Cannot open dashboard[/red]")
        return 7

    try:
        pid = int(pid_file.read_text().strip())
        os.kill(pid, 0)  # Check if process exists
        console.print(f"✓ Proxy is running (PID: [cyan]{pid}[/cyan])")
    except (ProcessLookupError, ValueError, OSError):
        console.print("[yellow]⚠ Proxy is not running[/yellow]")
        console.print("[dim]Stale PID file detected[/dim]")
        return 7

    # Determine dashboard port
    if port_override:
        dashboard_port = port_override
    elif config_path.exists():
        try:
            config = load_config(config_path)
            dashboard_port = config.dashboard.port
        except Exception:
            dashboard_port = 8001  # Default
    else:
        dashboard_port = 8001  # Default

    dashboard_url = f"http://localhost:{dashboard_port}/dashboard"
    console.print(f"✓ Dashboard available at [cyan]{dashboard_url}[/cyan]")

    if not no_open:
        console.print("🌐 Opening in default browser...")
        try:
            webbrowser.open(dashboard_url)
        except Exception as e:
            console.print(f"[yellow]⚠ Failed to open browser: {e}[/yellow]")
            console.print(f"[dim]Open manually: {dashboard_url}[/dim]")

    return 0
