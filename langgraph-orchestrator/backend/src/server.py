import os
import asyncio
from typing import Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .workflow import graph

app = FastAPI(title="Dialectic Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TaskSubmitRequest(BaseModel):
    repo_url: str
    project_type: str = "educational"

@app.post("/api/v1/task/submit")
async def submit_task(req: TaskSubmitRequest):
    # In a real system, we save to pipeline_tasks in DB here and get a UUID
    import uuid
    task_id = str(uuid.uuid4())
    
    # We kick off the LangGraph task in the background or rely on the WebSocket
    # For this architecture, we will let the frontend trigger it over WS or 
    # we just return the task_id to let WS connect and start it.
    return {"task_id": task_id, "status": "created"}

@app.websocket("/api/v1/task/stream/{task_id}")
async def stream_task(websocket: WebSocket, task_id: str, repo_url: str):
    await websocket.accept()
    
    config = {"configurable": {"thread_id": task_id}}
    state_input = {"repo_url": repo_url, "project_type": "educational"}
    
    try:
        # We use astream_events to get granular logs
        async for event in graph.astream_events(state_input, config=config, version="v2"):
            event_type = event["event"]
            node = event.get("name", "")
            
            # Filter and format events to send to frontend
            if event_type == "on_chat_model_stream":
                # Stream LLM tokens
                content = event["data"]["chunk"].content
                if content:
                    await websocket.send_json({
                        "type": "log", 
                        "node": node, 
                        "content": content
                    })
            elif event_type == "on_chain_start":
                await websocket.send_json({
                    "type": "state_change", 
                    "node": node,
                    "status": "started"
                })
            elif event_type == "on_chain_end":
                await websocket.send_json({
                    "type": "state_change", 
                    "node": node,
                    "status": "completed",
                    "output": str(event["data"].get("output", ""))[:200] # truncate for UI
                })
                
        await websocket.send_json({"type": "pipeline_end"})
        await websocket.close()
    except WebSocketDisconnect:
        print(f"Client disconnected for task {task_id}")
    except Exception as e:
        await websocket.send_json({"type": "error", "content": str(e)})
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.server:app", host="0.0.0.0", port=8000, reload=True)
