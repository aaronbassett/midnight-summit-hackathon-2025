# Bandaid - LLM Security Proxy

<div align="center">

🔒 **Local-first security proxy for LLM applications**

[![Python Version](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

Bandaid protects your LLM applications from prompt injection, data leaks, and AI-specific threats through transparent proxying and multi-layer threat detection.

**[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [CLI Commands](#cli-commands)**

</div>

---

## Why Bandaid?

Building LLM applications? You need security. But adding security shouldn't take weeks.

Bandaid provides enterprise-grade LLM security in **under 10 minutes**:
- 🎯 **Drop-in replacement** - Change one URL in your code
- 🚫 **Block threats automatically** - Prompt injection, jailbreaks, PII leaks
- 🧠 **Learn from attacks** - Self-improving defense with vector embeddings
- 📊 **Monitor everything** - Local dashboard with real-time security events
- 🔒 **Keep data local** - No external services, no data leaves your machine

## Features

### 🛡️ Multi-Layer Threat Detection

Four security layers working together:
1. **Learned Patterns** (fastest) - Catches known attack variants via embeddings
2. **Regex Patterns** - Detects structured secrets (API keys, private keys, credit cards)
3. **NER Validator** - Identifies PII using machine learning
4. **Llama Guard** - Policy enforcement for nuanced threats

### 🚀 Zero-Config Integration

Change one line of code:
```python
client = OpenAI(base_url="http://localhost:8000/v1")  # That's it!
```

### 📊 Real-Time Dashboard

Monitor security events, view statistics, track learned patterns - all in your browser.

### 🧠 Self-Learning Defense

Automatically creates embeddings from blocked attacks and catches similar variants (85%+ recall).

### 🌐 Multi-Provider Support

Works with all LiteLLM-compatible providers:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)
- Cohere
- Azure OpenAI
- 100+ more

### 💻 Local-First Architecture

Everything runs on your machine:
- No external APIs (except your LLM provider)
- No telemetry or tracking
- Your data never leaves localhost
- Works offline (after model download)

## Quick Start

### 1. Install

```bash
pip install bandaid
```

Or from source:
```bash
git clone https://github.com/yourorg/bandaid.git
cd bandaid
pip install -e .
```

### 2. Setup (Interactive Wizard)

```bash
guardrail setup
```

The setup wizard will:
- Configure your LLM provider (OpenAI, Anthropic, etc.)
- Set security thresholds
- Download ML models (~3GB)
- Initialize databases

**Takes less than 10 minutes!**

### 3. Start the Proxy

```bash
# Foreground mode (logs to console)
guardrail start

# Background mode (daemon)
guardrail start --daemon
```

### 4. Integrate with Your App

Change one line in your code:

**OpenAI SDK:**
```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-...",
    base_url="http://localhost:8000/v1"  # ← Add this line
)

# Use normally - all requests are now protected!
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

**Anthropic SDK:**
```python
from anthropic import Anthropic

client = Anthropic(
    api_key="sk-ant-...",
    base_url="http://localhost:8000/v1"  # ← Add this line
)
```

**LangChain:**
```python
from langchain.llms import OpenAI

llm = OpenAI(
    openai_api_base="http://localhost:8000/v1"  # ← Add this line
)
```

That's it! Your application is now protected.

### 5. Monitor with Dashboard

```bash
# Open dashboard in browser
guardrail dashboard

# Or navigate to:
# http://localhost:8001/dashboard
```

View real-time stats, security events, and learned patterns.

## What Threats Does Bandaid Detect?

### Prompt Injection & Jailbreaks
- "Ignore previous instructions and..."
- "You are now in developer mode..."
- "Pretend you have no ethical guidelines..."

### PII (Personally Identifiable Information)
- Personal names (via NER)
- Email addresses
- Social Security Numbers
- Locations

### Financial Secrets
- API keys (OpenAI, Stripe, AWS, etc.)
- Cryptocurrency addresses (Ethereum, Bitcoin)
- Private keys and seed phrases
- Credit card numbers

### Data Leaks in LLM Responses
- LLM accidentally generates API keys
- Responses contain PII from training data
- Model outputs sensitive information

### Policy Violations
- Hate speech
- Violence and illegal activities
- Malware generation
- Social engineering attempts

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Python** | 3.11+ | 3.12 |
| **RAM** | 2GB | 16GB |
| **Disk** | 5GB | 20GB |
| **GPU** | None (CPU works) | CUDA-compatible GPU |

**Performance Impact**: <100ms added latency (p50) with recommended specs.

## Documentation

📚 **Guides**
- [Quickstart Guide](specs/001-llm-security-proxy/quickstart.md) - Step-by-step tutorial
- [Architecture](docs/architecture.md) - System design and components
- [Security Layers](docs/security-layers.md) - Deep dive into detection methods
- [Developer Guide](docs/developer-guide.md) - Contributing and development

📄 **References**
- [API Contracts](specs/001-llm-security-proxy/contracts/) - OpenAPI specifications
- [Data Model](specs/001-llm-security-proxy/data-model.md) - Database schemas
- [Research Decisions](specs/001-llm-security-proxy/research.md) - Technology choices

## CLI Commands

### Core Commands
```bash
guardrail setup              # Interactive setup wizard
guardrail start              # Start proxy (foreground)
guardrail start --daemon     # Start proxy (background)
guardrail stop               # Stop proxy
guardrail status             # Show runtime status
```

### Management Commands
```bash
guardrail dashboard          # Open dashboard in browser
guardrail config show        # Display configuration
guardrail config set KEY VAL # Update configuration
guardrail validate           # Validate setup
```

### Options
```bash
guardrail start --port 8080     # Custom port
guardrail start --host 0.0.0.0  # Bind to all interfaces
guardrail config show --format json  # JSON output
```

See [Quickstart Guide](specs/001-llm-security-proxy/quickstart.md) for detailed command reference.

## How It Works

```
┌─────────────┐
│ Your App    │
└──────┬──────┘
       │ LLM Request
       ▼
┌─────────────────────────────────────────┐
│          Bandaid Proxy                  │
│  ┌────────────────────────────────┐    │
│  │  1. Check Learned Patterns     │    │ ← Fastest, catches known attacks
│  │     (ChromaDB embeddings)      │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │  2. Regex Pattern Matching     │    │ ← Detects structured secrets
│  │     (API keys, addresses)      │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │  3. NER Validator              │    │ ← Finds PII (names, emails)
│  │     (bert-base-NER)            │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │  4. Llama Guard                │    │ ← Policy enforcement
│  │     (Llama-Guard-3-8B)         │    │
│  └────────────────────────────────┘    │
│                                         │
│  ✅ Safe? → Forward to LLM             │
│  ❌ Threat? → Block + Log + Learn      │
└─────────────┬───────────────────────────┘
              │
              ▼
      ┌───────────────┐
      │  LLM Provider │
      │ (OpenAI, etc) │
      └───────────────┘
```

After blocking a threat, Bandaid:
1. Logs event to SQLite
2. Creates vector embedding
3. Stores in ChromaDB for future detection
4. Alerts via Sentry (if configured)

## Performance

Typical latency breakdown:
- **Learned patterns**: <10ms
- **Regex patterns**: <1ms
- **NER validator**: 20-30ms (CPU), 5-10ms (GPU)
- **Llama Guard**: 50-80ms (CPU), 10-20ms (GPU)

**Total added latency**: ~70ms (CPU) or ~30ms (GPU)

### Optimization Tips

1. **Enable GPU**: 3-5x faster inference
   ```yaml
   security:
     ner:
       device: "cuda"
     guard:
       device: "cuda"
   ```

2. **Disable slow validators**: If latency is critical
   ```yaml
   security:
     guard:
       enabled: false  # Skip Llama Guard (fastest option)
   ```

3. **Adjust confidence thresholds**: Reduce false positives
   ```yaml
   security:
     confidence:
       high_threshold: 0.95  # Higher = fewer blocks
   ```

## Development

See [Developer Guide](docs/developer-guide.md) for comprehensive development instructions.

### Quick Start for Contributors

```bash
# Clone and setup
git clone https://github.com/yourorg/bandaid.git
cd bandaid
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black src/ tests/
ruff check --fix src/ tests/

# Start development server
guardrail start
```

## FAQ

**Q: Does this work with streaming responses?**
A: Yes! Bandaid fully supports streaming. Request validation happens before streaming starts, and response leak detection happens after streaming completes (non-blocking).

**Q: What's the performance impact?**
A: Typically <100ms added latency. With GPU acceleration, often <30ms. See [Performance](#performance) for details.

**Q: Can I customize the security policies?**
A: Yes! Edit `config/blockchain-policy.txt` to define custom Llama Guard policies. You can also add custom regex patterns in `src/bandaid/security/patterns.py`.

**Q: Does this require internet access?**
A: Only for initial model download (~3GB) and forwarding requests to your LLM provider. After setup, Bandaid works offline (except for LLM calls).

**Q: Is my data sent anywhere?**
A: No. All processing happens locally. Your data only goes to your configured LLM provider. Optional Sentry integration sends error reports (can be disabled).

**Q: Can I use this in production?**
A: Bandaid is currently in alpha (v0.1.0). It's suitable for development and testing, but use with caution in production. Monitor performance and false positive rates carefully.

## Roadmap

- [ ] Fine-tuned models for better accuracy
- [ ] Multi-language support (beyond English)
- [ ] Advanced rate limiting and quotas
- [ ] Browser extension for LLM playground protection
- [ ] Kubernetes deployment guides
- [ ] Integration tests with major LLM providers

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

We welcome contributions! Please see:
- [Developer Guide](docs/developer-guide.md) - Setup and guidelines
- [Architecture](docs/architecture.md) - System design
- [Security Layers](docs/security-layers.md) - Detection mechanisms

### Ways to Contribute
- 🐛 Report bugs and issues
- 💡 Suggest new features
- 📝 Improve documentation
- 🔧 Submit pull requests
- ⭐ Star the project!

## Security

Found a security vulnerability? Please email **security@bandaid.dev** instead of opening a public issue.

We take security seriously and will respond within 48 hours.

## Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/yourorg/bandaid/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourorg/bandaid/discussions)
- 📚 **Documentation**: [docs.bandaid.dev](https://docs.bandaid.dev)
- 📧 **Email**: support@bandaid.dev

## Acknowledgments

Built with:
- [LiteLLM](https://github.com/BerriAI/litellm) - Universal LLM proxy
- [FastAPI](https://fastapi.tiangolo.com/) - Modern web framework
- [Llama Guard 3](https://huggingface.co/meta-llama/Llama-Guard-3-8B) - Content safety
- [dslim/bert-base-NER](https://huggingface.co/dslim/bert-base-NER) - Named entity recognition
- [sentence-transformers](https://www.sbert.net/) - Embeddings
- [ChromaDB](https://www.trychroma.com/) - Vector database

## Citation

If you use Bandaid in your research, please cite:

```bibtex
@software{bandaid2025,
  title = {Bandaid: Local-first LLM Security Proxy},
  author = {Bandaid Contributors},
  year = {2025},
  url = {https://github.com/yourorg/bandaid}
}
```

---

<div align="center">

**Made with 🔒 by security-minded developers**

[Website](https://bandaid.dev) • [Documentation](https://docs.bandaid.dev) • [GitHub](https://github.com/yourorg/bandaid)

</div>
