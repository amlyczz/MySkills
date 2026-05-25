"""Load prompt templates from domain prompt directories.

Prompts live in backend/src/infrastructure/<domain>/prompts/*.md files.
"""

from pathlib import Path
from functools import lru_cache

_INFRASTRUCTURE_DIR = Path(__file__).resolve().parents[1]

@lru_cache(maxsize=64)
def load_prompt(domain_name: str, filename: str) -> str:
    """Load a prompt template from a domain's prompts/ directory.

    Args:
        domain_name: Directory name under infrastructure/ (e.g. "analyzer")
        filename: File name under prompts/ (e.g. "analyze_repo_system.md")

    Returns:
        The prompt template as a string (with {placeholders} intact).
    """
    path = _INFRASTRUCTURE_DIR / domain_name / "prompts" / filename
    return path.read_text(encoding="utf-8")
