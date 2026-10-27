"""Environment-based local service configuration."""
import os

HOST = os.getenv("WORD_EXPLAINER_HOST", "127.0.0.1")
PORT = int(os.getenv("WORD_EXPLAINER_PORT", "8000"))
MAX_TEXT_LENGTH = 1000
MAX_BODY_BYTES = 16384
