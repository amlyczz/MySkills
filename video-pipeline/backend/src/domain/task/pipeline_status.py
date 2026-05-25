from enum import Enum

class PipelineStatus(str, Enum):
    """Pipeline execution stages — ordered by typical progression."""
    PENDING = "pending"
    HITL_TRENDING = "hitl_trending"
    ANALYZING = "analyzing"
    COMPOSING = "composing"
    QA_SCRIPT_FAILED = "qa_script_failed"
    BLUEPRINTING = "blueprinting"
    QA_BLUEPRINT_FAILED = "qa_blueprint_failed"
    GENERATE_MEDIA = "generate_media"
    RENDERING = "rendering"
    QA_VIDEO_FAILED = "qa_video_failed"
    POST_PROCESSING = "post_processing"
    COMPLETED = "completed"
    ERROR = "error"
