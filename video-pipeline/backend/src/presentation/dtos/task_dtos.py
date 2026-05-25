from pydantic import BaseModel

class TaskSubmitRequest(BaseModel):
    repo_url: str | None = None
    project_type: str = "educational"

class TaskResumeRequest(BaseModel):
    """Resume a paused (HITL) task with a human decision."""
    action: str  # skip | retry | abort | code_gen
    feedback: str | None = None
