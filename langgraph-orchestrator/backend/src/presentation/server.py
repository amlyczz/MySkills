from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.task_controller import router as task_controller_router
from .websocket.task_streamer import router as task_streamer_router

def create_app() -> FastAPI:
    """
    FastAPI Application Factory that configures middleware, HTTP REST routers, and WebSockets.
    """
    app = FastAPI(title="DDD Dialectic Video Pipeline API", version="3.0.0")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.include_router(task_controller_router)
    app.include_router(task_streamer_router)
    
    return app

app = create_app()
