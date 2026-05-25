from pydantic import BaseModel

class QAResultSchema(BaseModel):
    score: int
    reasoning: str
