#!/usr/bin/env python3
"""Download all required ML models for Bandaid.

This script pre-downloads HuggingFace models to avoid download delays during first use.
Models are cached in ~/.cache/huggingface/hub/ for offline use.

Usage:
    python src/scripts/download_models.py
    python src/scripts/download_models.py --device cuda
    python src/scripts/download_models.py --skip-llama-guard
"""

import argparse
import sys
from pathlib import Path

try:
    import torch
    from sentence_transformers import SentenceTransformer
    from transformers import (
        AutoModelForCausalLM,
        AutoModelForTokenClassification,
        AutoTokenizer,
    )
except ImportError as e:
    print("Error: Missing required packages. Please install dependencies:")
    print("  pip install transformers torch sentence-transformers")
    print(f"\nOriginal error: {e}")
    sys.exit(1)


def print_header(text: str):
    """Print formatted section header."""
    print(f"\n{'=' * 70}")
    print(f"  {text}")
    print(f"{'=' * 70}\n")


def check_disk_space():
    """Check available disk space in cache directory."""
    cache_dir = Path.home() / ".cache" / "huggingface"
    if cache_dir.exists():
        try:
            import shutil

            total, used, free = shutil.disk_usage(cache_dir)
            free_gb = free / (1024**3)

            print(f"Cache directory: {cache_dir}")
            print(f"Free disk space: {free_gb:.1f} GB")

            if free_gb < 15:
                print(
                    f"\n⚠️  Warning: Low disk space ({free_gb:.1f} GB free). "
                    f"Models require ~10-12 GB."
                )
                response = input("Continue anyway? (y/n): ")
                if response.lower() != "y":
                    print("Aborted by user.")
                    sys.exit(0)
        except Exception as e:
            print(f"Warning: Could not check disk space: {e}")


def check_gpu_availability(device: str) -> str:
    """Check GPU availability and return actual device to use."""
    if device == "auto":
        if torch.cuda.is_available():
            device = "cuda"
            print("✓ CUDA GPU detected and will be used")
        elif torch.backends.mps.is_available():
            device = "mps"
            print("✓ MPS (Apple Silicon) detected and will be used")
        else:
            device = "cpu"
            print("✓ No GPU detected, using CPU")
    elif device == "cuda":
        if not torch.cuda.is_available():
            print("Warning: CUDA requested but not available. Falling back to CPU.")
            device = "cpu"
    elif device == "mps":
        if not torch.backends.mps.is_available():
            print("Warning: MPS requested but not available. Falling back to CPU.")
            device = "cpu"

    return device


def download_ner_model():
    """Download NER model (dslim/bert-base-NER)."""
    print_header("Downloading NER Model (dslim/bert-base-NER)")

    model_name = "dslim/bert-base-NER"

    try:
        print("Downloading tokenizer...")
        AutoTokenizer.from_pretrained(model_name)
        print("✓ Tokenizer downloaded")

        print("Downloading model (~400 MB)...")
        AutoModelForTokenClassification.from_pretrained(model_name)
        print("✓ Model downloaded")

        print(f"\n✅ NER model ready: {model_name}")
        return True

    except Exception as e:
        print(f"\n❌ Failed to download NER model: {e}")
        return False


def download_llama_guard(skip: bool = False):
    """Download Llama Guard model (meta-llama/Llama-Guard-3-8B-INT8)."""
    if skip:
        print_header("Skipping Llama Guard Model")
        print("Llama Guard model download skipped (--skip-llama-guard)")
        return True

    print_header("Downloading Llama Guard Model (meta-llama/Llama-Guard-3-8B-INT8)")

    model_name = "meta-llama/Llama-Guard-3-8B-INT8"

    print("Note: This model requires:")
    print("  1. HuggingFace account")
    print("  2. Access request approval: https://huggingface.co/meta-llama/Llama-Guard-3-8B-INT8")
    print("  3. HuggingFace CLI login: huggingface-cli login")
    print()

    try:
        # Check if user is logged in
        from huggingface_hub import HfFolder

        token = HfFolder.get_token()
        if not token:
            print("❌ Not logged in to HuggingFace.")
            print("Please run: huggingface-cli login")
            return False

        print("Downloading tokenizer...")
        AutoTokenizer.from_pretrained(model_name)
        print("✓ Tokenizer downloaded")

        print("Downloading model (~4-5 GB, this will take a while)...")
        print("Progress will be shown by transformers library...")

        AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.int8,
            device_map="cpu",
            low_cpu_mem_usage=True,
        )
        print("✓ Model downloaded")

        print(f"\n✅ Llama Guard model ready: {model_name}")
        return True

    except Exception as e:
        print(f"\n❌ Failed to download Llama Guard model: {e}")
        print("\nCommon issues:")
        print("  - Not logged in: run 'huggingface-cli login'")
        print("  - Access not granted: request access at HuggingFace")
        print("  - Network error: check internet connection")
        return False


def download_sentence_transformer():
    """Download sentence transformer model (all-MiniLM-L6-v2)."""
    print_header("Downloading Sentence Transformer (all-MiniLM-L6-v2)")

    model_name = "sentence-transformers/all-MiniLM-L6-v2"

    try:
        print("Downloading model (~80 MB)...")
        SentenceTransformer(model_name)
        print("✓ Model downloaded")

        print(f"\n✅ Sentence Transformer ready: {model_name}")
        return True

    except Exception as e:
        print(f"\n❌ Failed to download Sentence Transformer: {e}")
        return False


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Download all ML models required by Bandaid",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--device",
        choices=["auto", "cpu", "cuda", "mps"],
        default="auto",
        help="Device to use for model inference (default: auto)",
    )
    parser.add_argument(
        "--skip-llama-guard",
        action="store_true",
        help="Skip downloading Llama Guard model (useful if not approved yet)",
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only check which models are already downloaded",
    )

    args = parser.parse_args()

    print("=" * 70)
    print("  Bandaid Model Downloader")
    print("=" * 70)
    print()
    print("This script will download ~5-10 GB of ML models.")
    print("Models are cached in ~/.cache/huggingface/hub/")
    print()

    # Check disk space
    check_disk_space()

    # Check GPU availability
    device = check_gpu_availability(args.device)
    print(f"Target device: {device}\n")

    if args.check_only:
        print_header("Checking Downloaded Models")
        # TODO: Implement model check logic
        print("Model check not yet implemented.")
        return

    # Download models
    results = []

    # 1. NER Model (required)
    results.append(("NER Model", download_ner_model()))

    # 2. Llama Guard (optional if not approved yet)
    results.append(("Llama Guard", download_llama_guard(skip=args.skip_llama_guard)))

    # 3. Sentence Transformer (required for self-learning)
    results.append(("Sentence Transformer", download_sentence_transformer()))

    # Summary
    print_header("Download Summary")

    success_count = sum(1 for _, success in results if success)
    total_count = len(results)

    for name, success in results:
        status = "✅" if success else "❌"
        print(f"{status} {name}")

    print()
    print(f"Successfully downloaded: {success_count}/{total_count} models")

    if success_count == total_count:
        print("\n🎉 All models downloaded successfully!")
        print("\nYou can now run: guardrail start")
    else:
        print("\n⚠️  Some models failed to download.")
        print("Bandaid may still work with partial models, but some features will be disabled.")

        if not args.skip_llama_guard:
            print("\nTip: If you don't have Llama Guard access yet, run with --skip-llama-guard")

    return 0 if success_count == total_count else 1


if __name__ == "__main__":
    sys.exit(main())
