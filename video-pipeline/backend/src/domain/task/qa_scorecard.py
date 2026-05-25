from pydantic import BaseModel

class QAScorecard(BaseModel):
    score: int
    reasoning: str
    retry_count: int = 0
