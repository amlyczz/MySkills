from typing import Optional
from langchain_core.prompts import ChatPromptTemplate
from ...domain.analyzer.entities import ContentModel, Script, ScriptSegment
from ...domain.composer.interfaces import ScriptComposer
from ..llm.client import get_llm_client
from ..llm.prompt_loader import load_prompt

class LLMScriptComposer(ScriptComposer):

    def __init__(self) -> None:
        self.llm = get_llm_client()

    async def compose_script(
        self,
        content: ContentModel,
        target_duration: int,
        qa_feedback: Optional[str] = None,
    ) -> Script:
        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("script_composer", "compose-script-system.md")),
            ("user", load_prompt("script_composer", "compose-script-user.md")),
        ])

        # Extract content fields safely
        name = content.content.title if content.content else "Unknown Project"
        tagline = content.content.tagline if content.content else ""
        summary = content.content.summary if content.content else ""
        points = ", ".join(content.content.points[:8]) if content.content and content.content.points else ""
        stats_text = content.content.stats_text if content.content else ""
        target_users = content.content.target_users if content.content else ""

        code_highlights = ""
        architecture = ""
        patterns = ""
        if content.source_code_insight:
            if content.source_code_insight.highlights:
                code_highlights = ", ".join(content.source_code_insight.highlights[:5])
            if content.source_code_insight.architecture:
                architecture = content.source_code_insight.architecture
            if content.source_code_insight.patterns:
                patterns = ", ".join(content.source_code_insight.patterns[:5])

        # Inject QA feedback if available (retry with feedback)
        feedback_section = ""
        if qa_feedback:
            feedback_section = f"\n{qa_feedback}\n\nThis is a RETRY. Address the deficiencies above."

        chain = prompt | self.llm.with_structured_output(Script)
        script: Script = await chain.ainvoke({
            "target_duration": target_duration,
            "name": name,
            "tagline": tagline,
            "summary": summary,
            "points": points,
            "stats_text": stats_text,
            "target_users": target_users,
            "code_highlights": code_highlights,
            "architecture": architecture,
            "patterns": patterns,
            "feedback_section": feedback_section,
        })
        return script
