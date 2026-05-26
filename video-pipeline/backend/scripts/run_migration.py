import asyncio
import os
import sys

# Add backend directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Simple .env parser to avoid python-dotenv dependency
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

async def run_migration():
    if not settings.database_url:
        print("Error: DATABASE_URL not found in environment")
        return
        
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        with open("migrations/001_add_node_progress.sql") as f:
            sql = f.read()
        for statement in sql.split(';'):
            statement = statement.strip()
            if statement:
                print(f"Executing: {statement}")
                await conn.execute(text(statement))
    print("Migration successful")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
