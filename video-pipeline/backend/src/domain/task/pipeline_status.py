from enum import Enum

class PipelineStatus(str, Enum):
    """Pipeline execution stages — ordered by typical progression.
    
    Each DAG node has a unique 1:1 mapping to a status value.
    """
    PENDING = "pending"
    FETCHING_TRENDING = "fetching_trending"  # github_trending node
    HITL_TRENDING = "hitl_trending"
    ANALYZING = "analyzing"
    COMPOSING = "composing"
    HITL_SCRIPT_REVIEW = "hitl_script_review"
    GENERATING_DIAGRAMS = "generating_diagrams"  # generate_diagrams node
    BLUEPRINTING = "blueprinting"
    HITL_BLUEPRINT_REVIEW = "hitl_blueprint_review"
    GENERATE_MEDIA = "generate_media"
    RENDERING = "rendering"
    COMPLETED = "completed"
    ERROR = "error"
