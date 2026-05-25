from fastapi import APIRouter, HTTPException
from typing import List, Any
import subprocess
import json
from pathlib import Path
from ...infrastructure.config.app_config import PROJECT_ROOT

router = APIRouter(prefix="/api/v1/trending", tags=["trending"])

@router.get("")
async def get_trending_repos(limit: int = 20) -> List[Any]:
    """
    Fetch trending github repositories by executing the standard skill script.
    """
    script_path = PROJECT_ROOT / ".claude" / "skills" / "github-trending" / "scripts" / "fetch_trending.py"
    if not script_path.exists():
        raise HTTPException(status_code=500, detail="Trending script not found.")
        
    try:
        # Run the standard skill script as a subprocess
        result = subprocess.run(
            ["python", str(script_path), "--limit", str(limit)],
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Script failed: {e.stderr}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse script output.")
