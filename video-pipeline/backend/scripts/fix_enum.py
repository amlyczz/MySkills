import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(env_file):
    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()

from sqlalchemy.ext.asyncio import create_async_engine
from src.infrastructure.config.app_config import settings
from sqlalchemy import text

async def run():
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        print("Adding uppercase enum values...")
        await conn.execute(text("ALTER TYPE pipelinestatus ADD VALUE IF NOT EXISTS 'FETCHING_TRENDING';"))
        await conn.execute(text("ALTER TYPE pipelinestatus ADD VALUE IF NOT EXISTS 'GENERATING_DIAGRAMS';"))
        print("Done!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
