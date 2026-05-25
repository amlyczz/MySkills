import asyncio
import uvicorn
from infrastructure.task.connection import init_db

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
