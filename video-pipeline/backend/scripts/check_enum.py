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
        res = await conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'pipelinestatus';"))
        labels = [row[0] for row in res]
        print("ENUM VALUES IN DB:", labels)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
