from typing import List
from pydantic import BaseModel, Field

class SubjectiveEvaluation(BaseModel):
    owner: str
    name: str
    tech_depth: int = Field(..., description="技术深度评分 (1-5)")
    video_friendly: int = Field(..., description="视频友好评分 (1-5)")
    topic_heat: int = Field(..., description="话题热度评分 (1-5)")
    onboarding_exp: int = Field(..., description="上手体验评分 (1-5)")
    one_liner: str = Field(..., description="一句话核心亮点")

class TrendingResponse(BaseModel):
    repos: List[SubjectiveEvaluation]
