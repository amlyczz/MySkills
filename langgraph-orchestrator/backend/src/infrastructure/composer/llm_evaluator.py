from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from ...domain.composer.entities import VideoScript
from ...domain.composer.interfaces import ScriptEvaluator
from ...domain.task.entities import QAScorecard
from ..llm.client import get_llm_client

QA_SCRIPT_SYSTEM_PROMPT = """You are a harsh QA evaluator for video scripts. 
Grade the script strictly on a scale of 0 to 100 based on its technical accuracy, pacing, and engaging narrative.
Provide your score and detailed reasoning.
"""

QA_SCRIPT_USER_PROMPT = "Script:\n{script_text}"

class QAResultSchema(BaseModel):
    score: int
    reasoning: str

class LLMScriptEvaluator(ScriptEvaluator):
    
    def __init__(self) -> None:
        self.llm = get_llm_client()

    async def evaluate_script(self, script: VideoScript) -> QAScorecard:
        prompt = ChatPromptTemplate.from_messages([
            ("system", QA_SCRIPT_SYSTEM_PROMPT),
            ("user", QA_SCRIPT_USER_PROMPT),
        ])
        
        script_text = f"Title: {script.title}\n"
        for s in script.segments:
            script_text += f"\n- [{s.visual_type}]: {s.text}"
            
        chain = prompt | self.llm.with_structured_output(QAResultSchema)
        result: QAResultSchema = await chain.ainvoke({"script_text": script_text})
        
        return QAScorecard(
            score=result.score,
            reasoning=result.reasoning,
            retry_count=0,
        )
