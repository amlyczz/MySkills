from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from ...domain.blueprint.entities import Blueprint
from ...domain.blueprint.interfaces import BlueprintEvaluator
from ...domain.task.entities import QAScorecard
from ..llm.client import get_llm_client

QA_BLUEPRINT_SYSTEM_PROMPT = """You are a visual director. 
Evaluate if the following JSON blueprint scenes properly translate to the philosophical UI aesthetic (Parchment, Ink, hard borders). 
Score 0-100 and provide reasoning.
"""

QA_BLUEPRINT_USER_PROMPT = "Blueprint Scenes:\n{scenes}"

class QAResultSchema(BaseModel):
    score: int
    reasoning: str

class LLMBlueprintEvaluator(BlueprintEvaluator):
    
    def __init__(self) -> None:
        self.llm = get_llm_client()

    async def evaluate_blueprint(self, blueprint: Blueprint) -> QAScorecard:
        prompt = ChatPromptTemplate.from_messages([
            ("system", QA_BLUEPRINT_SYSTEM_PROMPT),
            ("user", QA_BLUEPRINT_USER_PROMPT),
        ])
        
        scenes_repr = ""
        for i, s in enumerate(blueprint.scenes):
            scenes_repr += f"\nScene {i+1}: layout={s.layoutId}, motions={s.motionMap}, content={s.content}"
            
        chain = prompt | self.llm.with_structured_output(QAResultSchema)
        result: QAResultSchema = await chain.ainvoke({"scenes": scenes_repr})
        
        return QAScorecard(
            score=result.score,
            reasoning=result.reasoning,
            retry_count=0,
        )
