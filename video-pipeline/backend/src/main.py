import sys
import os
import logging
from pathlib import Path


class ColoredFormatter(logging.Formatter):
    """Formatter with ANSI colors per log level."""

    COLORS = {
        logging.DEBUG:    "\033[90m",   # grey
        logging.INFO:     "\033[36m",   # cyan
        logging.WARNING:  "\033[33m",   # yellow
        logging.ERROR:    "\033[31m",   # red
        logging.CRITICAL: "\033[35m",   # magenta
    }
    RESET = "\033[0m"
    BOLD = "\033[1m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelno, "")
        levelname = f"{color}{self.BOLD}{record.levelname:<8}{self.RESET}"
        name = f"{color}{record.name}{self.RESET}"
        msg = super().format(record)
        # Replace the plain levelname/name with colored versions
        msg = msg.replace(record.levelname, levelname, 1)
        msg = msg.replace(record.name, name, 1)
        return msg


# Configure logging before anything else
_handler = logging.StreamHandler()
_handler.setFormatter(ColoredFormatter(
    "%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    datefmt="%H:%M:%S",
))
logging.basicConfig(level=logging.INFO, handlers=[_handler])

# Also apply to uvicorn loggers
for _name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
    _uv = logging.getLogger(_name)
    _uv.handlers.clear()
    _uv.addHandler(_handler)
    _uv.propagate = False

logger = logging.getLogger(__name__)

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
    logger.info("Initializing database tables...")
    await init_db()

    # Log proxy configuration
    from src.infrastructure.config.app_config import settings as app_settings
    proxy = app_settings.http_proxy
    if proxy:
        logger.info("Proxy configured: %s (HTTP_PROXY=%s HTTPS_PROXY=%s)",
            "WSL" if "172.28" in (proxy or "") else "macOS" if "7890" in (proxy or "") else "custom",
            os.environ.get("HTTP_PROXY", "unset"),
            os.environ.get("HTTPS_PROXY", "unset"),
        )
    else:
        logger.warning("No proxy detected — GitHub/Twitter access may fail")
    
    # 2. Boot Uvicorn ASGI server
    logger.info("Booting Uvicorn ASGI Server...")
    config = uvicorn.Config(
        "src.presentation.server:app",
        host="0.0.0.0",
        port=18274,
        reload=False,
    )
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    asyncio.run(run_server())
