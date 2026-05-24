from langchain_core.prompts import ChatPromptTemplate
from ...domain.analyzer.entities import RepoAnalysis
from ...domain.composer.entities import VideoScript
from ...domain.composer.interfaces import ScriptComposer
from ..llm.client import get_llm_client

COMPOSE_SCRIPT_SYSTEM_PROMPT = """You are a professional video director and script writer.
Create an engaging narration script based on the project analysis.

### Subtitle Division Rules (排版防撞字幕):
- You MUST split each scene's subtitles strictly by **punctuation marks** (whole sentences or short clauses).
- **NEVER split subtitles word-by-word or term-by-term!** Word-by-word subtitles cause rapid flashing and layout collisions. Short sentences display naturally and are wrapped automatically by the engine.

### Narration Script Requirements:
- Target duration is around {target_duration} seconds.
- **Technical Architecture Segment**: At least one segment MUST explain the codebase structure, technical highlights, or main design patterns, utilizing the source code insights.
- Provide a list of segments with title, narration text, visual prompt, visual_type (intro, generic, code, outro).
"""

COMPOSE_SCRIPT_USER_PROMPT = """Project Name: {name}
Description: {desc}
Features: {features}
Pain Points: {pain_points}
"""

class LLMScriptComposer(ScriptComposer):
    
    def __init__(self) -> None:
        self.llm = get_llm_client()

    async def compose_script(self, analysis: RepoAnalysis, target_duration: int) -> VideoScript:
        prompt = ChatPromptTemplate.from_messages([
            ("system", COMPOSE_SCRIPT_SYSTEM_PROMPT),
            ("user", COMPOSE_SCRIPT_USER_PROMPT),
        ])
        
        chain = prompt | self.llm.with_structured_output(VideoScript)
        script: VideoScript = await chain.ainvoke({
            "project_type": analysis.project_type.value,
            "target_duration": target_duration,
            "name": analysis.project_name,
            "desc": analysis.description,
            "features": ", ".join(analysis.key_features),
            "pain_points": ", ".join(analysis.pain_points),
        })
        return script
