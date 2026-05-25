from fastapi import APIRouter, HTTPException
import subprocess
import json

from ...domain.github_trending.entities import RawTrendingRepo
from ...infrastructure.config.app_config import PROJECT_ROOT

router = APIRouter(prefix="/api/v1/trending", tags=["trending"])


@router.get("")
async def get_trending_repos(limit: int = 20) -> list[RawTrendingRepo]:
    """Fetch trending github repositories."""
    script_path = PROJECT_ROOT / ".claude" / "skills" / "github-trending" / "scripts" / "fetch_trending.py"
    if not script_path.exists():
        raise HTTPException(status_code=500, detail="Trending script not found.")

    try:
        result = subprocess.run(
            ["python", str(script_path), "--limit", str(limit)],
            capture_output=True,
            text=True,
            check=True,
        )
        raw_list = json.loads(result.stdout)
        return [RawTrendingRepo.model_validate(r) for r in raw_list]
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Script failed: {e.stderr}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse script output.")
