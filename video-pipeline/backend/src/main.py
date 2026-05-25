import sys
import os
from pathlib import Path

# Ensure backend/ (parent of src/) is on sys.path so `src.xxx` imports work
_backend_root = str(Path(__file__).resolve().parent.parent)
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

# Load .env from backend root
_env_file = Path(_backend_root) / ".env"
if _env_file.exists():
    with open(_env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

import asyncio
import uvicorn
from src.infrastructure.task.connection import init_db
from src.infrastructure.project.postgres_models import ProjectDB  # register with Base
from src.infrastructure.task.postgres_models import PipelineTaskDB  # register with Base

async def run_server() -> None:
    # 1. Initialize Postgres tables if not present
    print("[Main] Initializing database tables...")
    await init_db()
    
    # 2. Boot Uvicorn ASGI server
    print("[Main] Booting Uvicorn ASGI Server...")
    config = uvicorn.Config(
        "src.presentation.server:app",
        host="0.0.0.0",
        port=18274,
        reload=True,
    )
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    asyncio.run(run_server())
