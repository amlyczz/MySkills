from langchain_core.prompts import ChatPromptTemplate
from ...domain.analyzer.entities import RepoAnalysis
from ...domain.composer.entities import VideoScript
from ...domain.composer.interfaces import ScriptComposer
from ..llm.client import get_llm_client

COMPOSE_SCRIPT_SYSTEM_PROMPT = """You are a professional video director. Generate a highly engaging video script based on the project analysis. 
The style should match: {project_type}. 
Target duration is around {target_duration} seconds.
Provide a list of segments with narration text and visual prompts.
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
