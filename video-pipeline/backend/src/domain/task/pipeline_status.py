from enum import Enum

class PipelineStatus(str, Enum):
    """Pipeline execution stages — ordered by typical progression."""
    PENDING = "pending"
    HITL_TRENDING = "hitl_trending"
    ANALYZING = "analyzing"
    COMPOSING = "composing"
    HITL_SCRIPT_REVIEW = "hitl_script_review"
    BLUEPRINTING = "blueprinting"
    HITL_BLUEPRINT_REVIEW = "hitl_blueprint_review"
    GENERATE_MEDIA = "generate_media"
    RENDERING = "rendering"
    POST_PROCESSING = "post_processing"
    COMPLETED = "completed"
    ERROR = "error"
