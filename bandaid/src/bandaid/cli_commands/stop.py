"""Stop command implementation for Bandaid CLI."""

import os
import signal
import time
from pathlib import Path

from rich.console import Console

console = Console()


def run_stop(force: bool = False, timeout: int = 30) -> int:
    """Stop the Bandaid proxy server gracefully.

    Args:
        force: Force kill if graceful shutdown fails
        timeout: Graceful shutdown timeout in seconds

    Returns:
        Exit code (0 = success, 7 = not running, 1 = error)
    """
    pid_file = Path.home() / ".bandaid" / "proxy.pid"

    # Check if PID file exists
    if not pid_file.exists():
        console.print("[yellow]⚠ Proxy is not running[/yellow]")
        console.print("[dim]PID file not found[/dim]")
        return 7

    # Read PID
    try:
        pid = int(pid_file.read_text().strip())
    except (ValueError, OSError) as e:
        console.print(f"[red]✗ Invalid PID file: {e}[/red]")
        # Clean up invalid PID file
        pid_file.unlink(missing_ok=True)
        return 7

    # Verify process exists
    try:
        os.kill(pid, 0)  # Signal 0 checks if process exists
    except ProcessLookupError:
        console.print("[yellow]⚠ Proxy is not running[/yellow]")
        console.print(f"[dim]PID {pid} not found (stale PID file)[/dim]")
        # Clean up stale PID file
        pid_file.unlink(missing_ok=True)
        return 7
    except PermissionError:
        console.print(f"[red]✗ Cannot access process {pid} (permission denied)[/red]")
        return 1

    console.print(f"Stopping Bandaid Security Proxy (PID: [cyan]{pid}[/cyan])...")

    # Graceful shutdown
    if not force:
        try:
            console.print("✓ Sent SIGTERM (graceful shutdown)")
            os.kill(pid, signal.SIGTERM)

            # Wait for process to exit
            console.print(f"⏳ Waiting for shutdown (timeout: {timeout}s)...")
            start_time = time.time()

            while time.time() - start_time < timeout:
                try:
                    os.kill(pid, 0)  # Check if still alive
                    time.sleep(0.5)
                except ProcessLookupError:
                    # Process has exited
                    break

            # Check if process is still alive
            try:
                os.kill(pid, 0)
                # Still alive - force kill if requested, otherwise error
                if force:
                    console.print("[yellow]⚠ Graceful shutdown timed out[/yellow]")
                else:
                    console.print(f"[red]✗ Process did not stop within {timeout}s[/red]")
                    console.print("[dim]Use --force to force kill[/dim]")
                    return 1
            except ProcessLookupError:
                # Process has exited
                console.print("[green]✓ Process stopped[/green]")
                pid_file.unlink(missing_ok=True)
                console.print("✓ PID file removed")
                return 0

        except PermissionError:
            console.print(f"[red]✗ Cannot send signal to process {pid}[/red]")
            return 1
        except OSError as e:
            console.print(f"[red]✗ Error stopping process: {e}[/red]")
            return 1

    # Force kill
    if force:
        try:
            console.print("✓ Sent SIGKILL (force kill)")
            os.kill(pid, signal.SIGKILL)
            time.sleep(0.5)  # Give it a moment

            # Verify process is dead
            try:
                os.kill(pid, 0)
                console.print("[red]✗ Failed to kill process[/red]")
                return 1
            except ProcessLookupError:
                console.print("[green]✓ Process terminated[/green]")
                pid_file.unlink(missing_ok=True)
                console.print("✓ PID file removed")
                return 0

        except PermissionError:
            console.print(f"[red]✗ Cannot kill process {pid}[/red]")
            return 1
        except OSError as e:
            console.print(f"[red]✗ Error killing process: {e}[/red]")
            return 1

    return 0
