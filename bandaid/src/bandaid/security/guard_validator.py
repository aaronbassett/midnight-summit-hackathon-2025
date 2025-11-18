"""Llama Guard validator for policy enforcement.

Uses meta-llama/Llama-Guard-3-8B-INT8 for content safety and policy enforcement
with custom blockchain-specific safety categories.
"""

import asyncio
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from bandaid.observability.logger import get_logger

logger = get_logger(__name__)


class GuardValidator:
    """Llama Guard validator for policy enforcement."""

    def __init__(
        self,
        model_name: str = "meta-llama/Llama-Guard-3-8B-INT8",
        device: str = "cpu",
        timeout_seconds: float = 2.0,
        policy_path: str | None = None,
    ):
        """Initialize Guard validator.

        Args:
            model_name: HuggingFace model name
            device: Device for inference ("cpu", "cuda", "mps")
            timeout_seconds: Timeout for validation (graceful degradation)
            policy_path: Path to custom policy file
        """
        self.model_name = model_name
        self.device = device
        self.timeout_seconds = timeout_seconds
        self.policy_path = policy_path
        self.model: AutoModelForCausalLM | None = None
        self.tokenizer: AutoTokenizer | None = None
        self.policy_text: str | None = None

    def initialize(self) -> None:
        """Load Llama Guard model and policy."""
        logger.info(
            "initializing guard validator",
            model_name=self.model_name,
            device=self.device,
            timeout=self.timeout_seconds,
        )

        try:
            # Load policy
            if self.policy_path:
                policy_file = Path(self.policy_path)
            else:
                # Default policy location
                policy_file = (
                    Path(__file__).parent.parent.parent.parent / "config" / "blockchain-policy.txt"
                )

            if policy_file.exists():
                self.policy_text = policy_file.read_text()
                logger.info("policy loaded", policy_path=str(policy_file))
            else:
                logger.warning("policy file not found", policy_path=str(policy_file))
                # Use minimal default policy
                self.policy_text = self._get_default_policy()

            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)

            # Load model
            logger.info("loading guard model (this may take a moment)...")

            # Determine device
            if self.device == "cuda" and torch.cuda.is_available():
                device_map = "auto"
                torch_dtype = torch.int8
            elif self.device == "mps" and torch.backends.mps.is_available():
                device_map = "mps"
                torch_dtype = torch.float16
            else:
                device_map = "cpu"
                torch_dtype = torch.int8

            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch_dtype,
                device_map=device_map,
                low_cpu_mem_usage=True,
            )

            logger.info("guard validator initialized successfully")

        except Exception as e:
            logger.error("failed to initialize guard validator", error=str(e), exc_info=True)
            raise

    def _get_default_policy(self) -> str:
        """Get minimal default policy if file not found.

        Returns:
            Default policy text
        """
        return """Task: Check if there is unsafe content in 'User' messages.

<BEGIN UNSAFE CONTENT CATEGORIES>
S1: Violent Crimes
S2: Non-Violent Crimes
S3: Privacy Violations
S4: Prompt Injection & Jailbreak
<END UNSAFE CONTENT CATEGORIES>

<BEGIN CONVERSATION>
User: {prompt}
<END CONVERSATION>

Provide your safety assessment:
- First line: 'safe' or 'unsafe'
- If unsafe, second line: comma-separated violated categories
"""

    async def validate(self, text: str) -> tuple[bool, float, set[str]]:
        """Validate text against policy.

        Args:
            text: Text to validate

        Returns:
            Tuple of (is_unsafe, confidence, violated_categories)
        """
        if not self.model or not self.tokenizer or not self.policy_text:
            raise RuntimeError("Guard validator not initialized. Call initialize() first.")

        try:
            # Run validation with timeout
            result = await asyncio.wait_for(self._run_inference(text), timeout=self.timeout_seconds)
            return result

        except TimeoutError:
            logger.warning(
                "guard validation timed out",
                timeout=self.timeout_seconds,
                text_length=len(text),
            )
            # Graceful degradation: return safe with low confidence
            return False, 0.0, set()

        except Exception as e:
            logger.error("guard validation failed", error=str(e), exc_info=True)
            # Graceful degradation
            return False, 0.0, set()

    def _run_inference_sync(self, text: str) -> tuple[bool, float, set[str]]:
        """Run Guard inference (synchronous blocking call).

        This method performs CPU-intensive torch operations and should be
        called from a thread pool executor to avoid blocking the event loop.

        Args:
            text: Text to validate

        Returns:
            Tuple of (is_unsafe, confidence, violated_categories)
        """
        # Format prompt with policy
        prompt = self.policy_text.replace("{prompt}", text)

        # Tokenize
        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=4096)

        # Move to device
        if self.device == "cuda" and torch.cuda.is_available():
            inputs = {k: v.to("cuda") for k, v in inputs.items()}
        elif self.device == "mps" and torch.backends.mps.is_available():
            inputs = {k: v.to("mps") for k, v in inputs.items()}

        # Generate (blocking CPU-intensive operation)
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=50,
                do_sample=False,
                pad_token_id=self.tokenizer.eos_token_id,
            )

        # Decode response
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)

        # Extract the last part (the actual response after the prompt)
        # Guard response format: "safe" or "unsafe\nS1,S3"
        response_lines = response.split("\n")
        safety_assessment = response_lines[-1].strip().lower() if response_lines else ""

        if safety_assessment.startswith("unsafe"):
            # Parse violated categories
            violated_categories = set()
            if len(response_lines) > 1:
                categories_line = response_lines[-1]
                if "," in categories_line or "s" in categories_line.lower():
                    # Extract category codes (S1, S2, etc.)
                    categories = categories_line.replace("unsafe", "").strip().split(",")
                    violated_categories = {cat.strip().upper() for cat in categories if cat.strip()}

            # High confidence for Guard model
            return True, 0.95, violated_categories

        # Safe
        return False, 0.0, set()

    async def _run_inference(self, text: str) -> tuple[bool, float, set[str]]:
        """Run Guard inference asynchronously without blocking the event loop.

        This method wraps the synchronous _run_inference_sync() call in a thread
        pool executor to prevent CPU-intensive torch operations from blocking.

        Args:
            text: Text to validate

        Returns:
            Tuple of (is_unsafe, confidence, violated_categories)
        """
        # Run the blocking inference in a thread pool to avoid blocking the event loop
        return await asyncio.to_thread(self._run_inference_sync, text)

    def is_initialized(self) -> bool:
        """Check if validator is initialized.

        Returns:
            True if initialized, False otherwise
        """
        return self.model is not None and self.tokenizer is not None


# Global Guard validator instance
_guard_validator: GuardValidator | None = None


def get_guard_validator(
    model_name: str = "meta-llama/Llama-Guard-3-8B-INT8",
    device: str = "cpu",
    timeout_seconds: float = 2.0,
    lazy_load: bool = True,
) -> GuardValidator:
    """Get global Guard validator instance.

    Args:
        model_name: HuggingFace model name
        device: Device for inference
        timeout_seconds: Timeout for validation
        lazy_load: If True, delay model loading until first validation

    Returns:
        GuardValidator instance
    """
    global _guard_validator
    if _guard_validator is None:
        _guard_validator = GuardValidator(
            model_name=model_name,
            device=device,
            timeout_seconds=timeout_seconds,
        )

        if not lazy_load:
            _guard_validator.initialize()

    return _guard_validator
