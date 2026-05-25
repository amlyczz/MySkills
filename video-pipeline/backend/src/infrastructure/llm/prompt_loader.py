"""Load prompt templates from skill reference files.

Prompts live in .claude/skills/<skill-name>/references/*.md files.
This loader resolves the skill directory relative to the project root
(video-pipeline/) and caches loaded prompts in memory.
"""

from pathlib import Path
from functools import lru_cache

_PROJECT_ROOT = Path(__file__).resolve().parents[4]
SKILLS_DIR = _PROJECT_ROOT / "backend" / "src" / "infrastructure" / "skills"


@lru_cache(maxsize=64)
def load_prompt(skill_name: str, filename: str) -> str:
    """Load a prompt template from a skill's references/ directory.

    Args:
        skill_name: Directory name under .claude/skills/ (e.g. "repo-analyzer")
        filename: File name under references/ (e.g. "analyze-repo-system.md")

    Returns:
        The prompt template as a string (with {placeholders} intact).
    """
    path = SKILLS_DIR / skill_name / "references" / filename
    return path.read_text(encoding="utf-8")
