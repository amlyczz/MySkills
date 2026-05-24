from langchain_core.prompts import ChatPromptTemplate
from ...domain.analyzer.entities import RepoAnalysis
from ...domain.composer.entities import VideoScript
from ...domain.blueprint.entities import Blueprint
from ...domain.blueprint.interfaces import BlueprintComposer
from ..llm.client import get_llm_client

BLUEPRINT_SYSTEM_PROMPT = """You are a professional visual scene director. 
Given a VideoScript and RepoAnalysis, orchestrate a stunning visual Blueprint of scenes.
Perform a strict 13-dimensional visual decision making workflow for each scene:

1. **Top-Level layoutId**: Choose ONLY from: "center-layout", "split-layout", "split-media", "code-carousel", "code-display", "hero-center", "media-gallery", "media-full".
2. **Dynamic Background**: Match bgType to mood: "dark-neon", "fluid-aurora", "tech-overlay", "aurora-bg", "fluid-background", "noise-background", "dot-grid-bg".
3. **排版防撞铁律 (Flex Layouts)**: Instruct child elements to use Flex alignments by settings layout parameters in content. Avoid absolute X/Y positions.
4. **安全退场 (OutFrame)**: For all child elements that animate, you MUST configure their outFrame to expire at: scene.durationInFrames - 15 (e.g. if duration is 150, outFrame is 135) so that older elements exit cleanly before scene transitions.
5. **错位展示 (Stagger)**: For code carousel or lists, include delay parameters in motionMap, e.g. "stagger": "15".
6. **物理弹簧 (Spring)**: Use spring-like motions: "scale-bounce" or "snappy-slide" for core headers.
7. **Transition series**: Specify transitionToNext using "slide-left" or "whip-pan" instead of basic crossfades.

Format the output strictly as the Blueprint schema:
- version: "1.0.0"
- fps: 30
- durationInFrames: Total sum of frames.
- scenes: List of SceneConfig(layoutId, motionMap, content)
"""

BLUEPRINT_USER_PROMPT = """Video Script:
Title: {script_title}
Target Duration: {script_duration}s
Segments: {script_segments}

Repository Insight:
Project Name: {project_name}
Features: {project_features}
"""

class LLMBlueprintComposer(BlueprintComposer):
    
    def __init__(self) -> None:
        self.llm = get_llm_client()

    async def compose_blueprint(self, script: VideoScript, analysis: RepoAnalysis) -> Blueprint:
        prompt = ChatPromptTemplate.from_messages([
            ("system", BLUEPRINT_SYSTEM_PROMPT),
            ("user", BLUEPRINT_USER_PROMPT),
        ])
        
        segments_repr = ""
        for i, s in enumerate(script.segments):
            segments_repr += f"\nSegment {i+1}: text='{s.text}', type='{s.visual_type}', params={s.visual_params}"
            
        chain = prompt | self.llm.with_structured_output(Blueprint)
        blueprint: Blueprint = await chain.ainvoke({
            "script_title": script.title,
            "script_duration": script.target_duration_seconds,
            "script_segments": segments_repr,
            "project_name": analysis.project_name,
            "project_features": ", ".join(analysis.key_features),
        })
        
        # Enforce durationInFrames safety check
        if not blueprint.durationInFrames:
            blueprint.durationInFrames = script.target_duration_seconds * 30
            
        return blueprint
