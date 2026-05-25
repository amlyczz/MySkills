from pydantic import BaseModel

class StyleConfig(BaseModel):
    """Segment visual style."""
    theme_id: str = "dark-purple"
    bg_type: str = "starfield"
