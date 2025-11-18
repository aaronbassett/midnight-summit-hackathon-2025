"""Status command implementation for Bandaid CLI."""

import asyncio
import os
from datetime import datetime, timedelta
from pathlib import Path

from rich.console import Console

console = Console()


def run_status() -> int:
    """Show proxy runtime status.

    Returns:
        Exit code (0 = success, 7 = not running)
    """
    pid_file = Path.home() / ".bandaid" / "proxy.pid"
    log_file = Path.home() / ".bandaid" / "logs" / "proxy.log"
    events_db = Path.home() / ".bandaid" / "events.db"
    chroma_dir = Path.home() / ".bandaid" / "chroma"

    console.print("[bold]Bandaid Security Proxy Status[/bold]")
    console.print("=" * 30 + "\n")

    # Check if running
    is_running = False
    pid = None

    if pid_file.exists():
        try:
            pid = int(pid_file.read_text().strip())
            os.kill(pid, 0)  # Check if process exists
            is_running = True
        except (ProcessLookupError, ValueError, OSError):
            pass

    if is_running:
        console.print("[green]Status: RUNNING ✓[/green]")
        console.print(f"PID: [cyan]{pid}[/cyan]")

        # Calculate uptime (approximate based on PID file modification time)
        if pid_file.exists():
            start_time = datetime.fromtimestamp(pid_file.stat().st_mtime)
            uptime = datetime.now() - start_time
            uptime_str = str(uptime).split(".")[0]  # Remove microseconds
            console.print(f"Uptime: {uptime_str}")

        # Load config to show URLs
        config_path = Path.home() / ".bandaid" / "config.toml"
        if config_path.exists():
            try:
                from bandaid.config import load_config

                config = load_config(config_path)
                console.print(f"Proxy URL: http://localhost:{config.proxy.port}")
                console.print(f"Dashboard URL: http://localhost:{config.dashboard.port}/dashboard")
            except Exception:
                console.print("Proxy URL: http://localhost:8000")
                console.print("Dashboard URL: http://localhost:8001/dashboard")

        # Recent activity
        console.print("\n[bold]Recent Activity (last 1 hour)[/bold]")
        console.print("-" * 30)

        try:
            from bandaid.storage.events_db import get_events_db

            db = asyncio.run(get_events_db())

            # Get stats from last hour
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            events = asyncio.run(db.get_events(start_time=one_hour_ago, limit=1000))

            total = len(events)
            blocked = sum(1 for e in events if e["event_type"] == "blocked")
            allowed = sum(1 for e in events if e["event_type"] == "allowed")
            warnings = sum(1 for e in events if e["event_type"] == "medium_confidence_warning")
            leaks = sum(1 for e in events if e["event_type"] == "data_leak_alert")

            console.print(f"Total Requests: {total}")
            if total > 0:
                console.print(f"Blocked: {blocked} ({blocked / total * 100:.1f}%)")
                console.print(f"Allowed: {allowed} ({allowed / total * 100:.1f}%)")
            else:
                console.print("Blocked: 0")
                console.print("Allowed: 0")
            console.print(f"Warnings: {warnings}")
            console.print(f"Data Leak Alerts: {leaks}")
        except Exception:
            console.print("[dim]Unable to fetch activity stats[/dim]")

        # Resource usage
        console.print("\n[bold]Storage[/bold]")
        console.print("-" * 30)

        if events_db.exists():
            size_mb = events_db.stat().st_size / (1024 * 1024)
            console.print(f"Events DB: {size_mb:.1f} MB")
        else:
            console.print("Events DB: Not found")

        if chroma_dir.exists():
            total_size = sum(f.stat().st_size for f in chroma_dir.rglob("*") if f.is_file())
            size_mb = total_size / (1024 * 1024)
            console.print(f"Patterns (ChromaDB): {size_mb:.1f} MB")
        else:
            console.print("Patterns (ChromaDB): Not found")

        # Logs
        console.print("\n[bold]Logs[/bold]")
        console.print("-" * 30)

        if log_file.exists():
            size_mb = log_file.stat().st_size / (1024 * 1024)
            mod_time = datetime.fromtimestamp(log_file.stat().st_mtime)
            console.print(f"Location: {log_file}")
            console.print(f"Size: {size_mb:.1f} MB")
            console.print(f"Last Modified: {mod_time.strftime('%Y-%m-%d %H:%M:%S')}")
        else:
            console.print("Location: Not found")

        return 0

    else:
        console.print("[red]Status: NOT RUNNING ✗[/red]")
        console.print("PID File: Not found\n")
        console.print("[dim]To start: guardrail start[/dim]")
        return 7
