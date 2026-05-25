from enum import Enum

class TechDomain(str, Enum):
    """The technical classification domain of a repository."""
    AI_MODEL = "AI_MODEL"
    AI_AGENT = "AI_AGENT"
    WEB_BACKEND = "WEB_BACKEND"
    FRONTEND_UI = "FRONTEND_UI"
    CLI_INFRA = "CLI_INFRA"
    GENERAL = "GENERAL"
