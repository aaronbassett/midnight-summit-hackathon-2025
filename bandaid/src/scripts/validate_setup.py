#!/usr/bin/env python3
"""Validate Bandaid setup and environment.

This script checks that all dependencies, models, and configurations are correct
before running Bandaid for the first time.

Usage:
    python src/scripts/validate_setup.py
    python src/scripts/validate_setup.py --verbose
    python src/scripts/validate_setup.py --fix
"""

import argparse
import socket
import sys
from pathlib import Path

# Color codes for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_header(text: str):
    """Print formatted section header."""
    print(f"\n{BLUE}{'=' * 70}")
    print(f"  {text}")
    print(f"{'=' * 70}{RESET}\n")


def print_success(text: str):
    """Print success message."""
    print(f"{GREEN}✓{RESET} {text}")


def print_error(text: str):
    """Print error message."""
    print(f"{RED}✗{RESET} {text}")


def print_warning(text: str):
    """Print warning message."""
    print(f"{YELLOW}⚠{RESET}  {text}")


def check_python_version() -> bool:
    """Check Python version is 3.11+."""
    version = sys.version_info
    if version.major == 3 and version.minor >= 11:
        print_success(f"Python version: {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print_error(
            f"Python version: {version.major}.{version.minor}.{version.micro} (3.11+ required)"
        )
        return False


def check_package_installed(package_name: str, import_name: str | None = None) -> bool:
    """Check if a Python package is installed."""
    import_name = import_name or package_name

    try:
        __import__(import_name)
        return True
    except ImportError:
        return False


def check_dependencies() -> tuple[list[str], list[str]]:
    """Check all required Python dependencies."""
    dependencies = [
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("litellm", "litellm"),
        ("transformers", "transformers"),
        ("torch", "torch"),
        ("sentence-transformers", "sentence_transformers"),
        ("chromadb", "chromadb"),
        ("aiosqlite", "aiosqlite"),
        ("pydantic", "pydantic"),
        ("typer", "typer"),
        ("rich", "rich"),
        ("structlog", "structlog"),
        ("httpx", "httpx"),
        ("cryptography", "cryptography"),
    ]

    installed = []
    missing = []

    for package_name, import_name in dependencies:
        if check_package_installed(package_name, import_name):
            installed.append(package_name)
        else:
            missing.append(package_name)

    return installed, missing


def check_gpu_availability(verbose: bool = False) -> dict:
    """Check GPU availability."""
    try:
        import torch

        cuda_available = torch.cuda.is_available()
        mps_available = torch.backends.mps.is_available()

        if cuda_available:
            device_name = torch.cuda.get_device_name(0)
            device_count = torch.cuda.device_count()
            print_success(f"CUDA GPU: {device_name} ({device_count} device(s))")
        elif mps_available:
            print_success("MPS (Apple Silicon GPU) available")
        else:
            print_warning("No GPU detected (CPU will be used)")
            if verbose:
                print("  Tip: GPU acceleration improves performance 3-5x")

        return {"cuda": cuda_available, "mps": mps_available}

    except Exception as e:
        print_error(f"Failed to check GPU: {e}")
        return {"cuda": False, "mps": False}


def check_model_cache() -> tuple[list[str], list[str]]:
    """Check which models are downloaded in HuggingFace cache."""
    cache_dir = Path.home() / ".cache" / "huggingface" / "hub"

    if not cache_dir.exists():
        return [], []

    required_models = {
        "dslim/bert-base-NER": "models--dslim--bert-base-NER",
        "meta-llama/Llama-Guard-3-8B-INT8": "models--meta-llama--Llama-Guard-3-8B-INT8",
        "sentence-transformers/all-MiniLM-L6-v2": "models--sentence-transformers--all-MiniLM-L6-v2",
    }

    downloaded = []
    missing = []

    for model_name, cache_folder in required_models.items():
        model_path = cache_dir / cache_folder
        if model_path.exists():
            downloaded.append(model_name)
        else:
            missing.append(model_name)

    return downloaded, missing


def check_config_file() -> bool:
    """Check if configuration file exists."""
    config_path = Path("config/config.yaml")

    if config_path.exists():
        print_success(f"Configuration file: {config_path}")
        return True
    else:
        print_warning(f"Configuration file not found: {config_path}")
        print("  Run: guardrail setup")
        return False


def check_port_available(port: int) -> bool:
    """Check if a port is available."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("localhost", port))
            return True
    except OSError:
        return False


def check_ports() -> tuple[list[int], list[int]]:
    """Check if required ports are available."""
    ports = [8000, 8001]  # Proxy and dashboard ports

    available = []
    in_use = []

    for port in ports:
        if check_port_available(port):
            available.append(port)
        else:
            in_use.append(port)

    return available, in_use


def check_database_files() -> dict:
    """Check if database files exist."""
    data_dir = Path("data")

    sqlite_db = data_dir / "events.db"
    chromadb_dir = data_dir / "chromadb"

    results = {
        "sqlite": sqlite_db.exists(),
        "chromadb": chromadb_dir.exists(),
    }

    return results


def check_disk_space() -> tuple[float, bool]:
    """Check available disk space."""
    try:
        import shutil

        cache_dir = Path.home() / ".cache" / "huggingface"
        if not cache_dir.exists():
            cache_dir = Path.home()

        total, used, free = shutil.disk_usage(cache_dir)
        free_gb = free / (1024**3)

        sufficient = free_gb >= 10.0

        return free_gb, sufficient

    except Exception as e:
        print_error(f"Failed to check disk space: {e}")
        return 0.0, False


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Validate Bandaid setup and environment",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed output")
    parser.add_argument(
        "--fix", action="store_true", help="Attempt to fix issues (not implemented yet)"
    )

    args = parser.parse_args()

    print("=" * 70)
    print("  Bandaid Setup Validation")
    print("=" * 70)

    # Track overall status

    # 1. Check Python version
    print_header("Python Environment")
    if not check_python_version():
        print("  Action: Install Python 3.11 or later")

    # 2. Check dependencies
    print_header("Python Dependencies")
    installed, missing = check_dependencies()

    if missing:
        print_error(f"Missing packages: {', '.join(missing)}")
        print(f"  Action: pip install {' '.join(missing)}")
    else:
        print_success(f"All {len(installed)} required packages installed")

    if args.verbose and installed:
        print("\n  Installed packages:")
        for pkg in installed:
            print(f"    - {pkg}")

    # 3. Check GPU
    print_header("GPU Availability")
    check_gpu_availability(verbose=args.verbose)

    # 4. Check models
    print_header("ML Models")
    downloaded_models, missing_models = check_model_cache()

    if missing_models:
        print_warning(f"{len(missing_models)} model(s) not downloaded:")
        for model in missing_models:
            print(f"  - {model}")
        print("\n  Action: python src/scripts/download_models.py")
    else:
        print_success(f"All {len(downloaded_models)} required models downloaded")

    if args.verbose and downloaded_models:
        print("\n  Downloaded models:")
        for model in downloaded_models:
            print(f"    - {model}")

    # 5. Check configuration
    print_header("Configuration")
    if not check_config_file():
        pass

    # 6. Check ports
    print_header("Port Availability")
    available_ports, in_use_ports = check_ports()

    if in_use_ports:
        print_warning(f"Ports in use: {', '.join(map(str, in_use_ports))}")
        print("  Action: Stop processes using these ports or use --port flag")
    else:
        print_success(f"All ports available: {', '.join(map(str, available_ports))}")

    # 7. Check database files
    print_header("Database Files")
    db_status = check_database_files()

    if db_status["sqlite"]:
        print_success("SQLite database exists")
    else:
        print_warning("SQLite database not found (will be created on first run)")

    if db_status["chromadb"]:
        print_success("ChromaDB directory exists")
    else:
        print_warning("ChromaDB directory not found (will be created on first run)")

    # 8. Check disk space
    print_header("Disk Space")
    free_gb, sufficient = check_disk_space()

    if sufficient:
        print_success(f"Free disk space: {free_gb:.1f} GB")
    else:
        print_warning(f"Low disk space: {free_gb:.1f} GB (10+ GB recommended)")

    # Summary
    print_header("Validation Summary")

    critical_issues = []
    warnings = []

    if missing:
        critical_issues.append(f"{len(missing)} missing packages")

    if missing_models:
        warnings.append(f"{len(missing_models)} models not downloaded")

    if not check_config_file():
        warnings.append("Configuration file not found")

    if in_use_ports:
        warnings.append(f"{len(in_use_ports)} ports in use")

    if not sufficient:
        warnings.append("Low disk space")

    if critical_issues:
        print_error("Critical Issues:")
        for issue in critical_issues:
            print(f"  - {issue}")
        print()

    if warnings:
        print_warning("Warnings:")
        for warning in warnings:
            print(f"  - {warning}")
        print()

    if not critical_issues and not warnings:
        print(f"{GREEN}✅ All checks passed! Bandaid is ready to run.{RESET}")
        print("\nNext steps:")
        print("  1. Run: guardrail setup (if not done)")
        print("  2. Run: guardrail start")
        print("  3. Open: http://localhost:8001/dashboard")
        return 0
    elif not critical_issues:
        print(f"{YELLOW}⚠️  Setup has warnings but should work.{RESET}")
        print("\nYou can proceed with: guardrail start")
        return 0
    else:
        print(f"{RED}❌ Setup has critical issues. Please fix before running.{RESET}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
