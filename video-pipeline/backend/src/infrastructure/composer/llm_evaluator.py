from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from ...domain.analyzer.entities import Script
from ...domain.composer.interfaces import ScriptEvaluator
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
            ("system", load_prompt("qa_evaluator", "script-qa-system.md")),
            ("user", load_prompt("qa_evaluator", "script-qa-user.md")),
        ])

        script_text = f"Full Text: {script.full_text}\nTotal Duration: {script.total_duration_est}s\nSegments:\n"
        for i, s in enumerate(script.segments):
            script_text += f"\n{i+1}. [{s.visual_type}] ({s.duration_est}s): {s.text}"

        chain = prompt | self.llm.with_structured_output(QAResultSchema)
        result: QAResultSchema = await chain.ainvoke({
            "script_text": script_text,
            "source_context": source_context or "",
        })

        return QAScorecard(
            score=result.score,
            reasoning=result.reasoning,
            retry_count=0,
        )
