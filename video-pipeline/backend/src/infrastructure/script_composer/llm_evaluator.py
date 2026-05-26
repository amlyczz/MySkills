from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from ...domain.repo_analyzer.entities import Script
from ...domain.script_composer.interfaces import ScriptEvaluator
from ...domain.task.entities import QAScorecard
from ..llm.client import get_qa_client
from ..llm.prompt_loader import load_prompt

from .schemas import QAResultSchema

class LLMScriptEvaluator(ScriptEvaluator):

    def __init__(self) -> None:
        self.llm = get_qa_client()  # 不同模型 + 更高温度

    async def evaluate_script(
        self, script: Script, source_context: str | None = None,
    ) -> QAScorecard:
        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("qa_evaluator", "script_qa_system.md")),
            ("user", load_prompt("qa_evaluator", "script_qa_user.md")),
        ])

        script_text = f"Full Text: {script.full_text}\nTotal Duration: {script.total_duration_est}s\nSegments:\n"
        for i, s in enumerate(script.segments):
            script_text += f"\n{i+1}. [ASSET: {s.assigned_asset}] ({s.duration_est}s)\nHOOK: {s.visual_hook}\nTEXT: {s.text}"

        chain = prompt | self.llm.with_structured_output(QAResultSchema, method="json_mode")
        result: QAResultSchema = await chain.ainvoke({
            "script_text": script_text,
            "source_context": (source_context or "") + "\n\nNote: You must respond in valid JSON format conforming to the expected schema.",
        })

        return QAScorecard(
            score=result.score,
            reasoning=result.reasoning,
            retry_count=0,
        )
