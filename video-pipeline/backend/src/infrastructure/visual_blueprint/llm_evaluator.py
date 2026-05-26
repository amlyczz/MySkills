from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from ...domain.visual_blueprint.entities import Blueprint
from ...domain.visual_blueprint.interfaces import BlueprintEvaluator
from ...domain.task.entities import QAScorecard
from ..llm.client import get_qa_client
from ..llm.prompt_loader import load_prompt

from .schemas import QAResultSchema

class LLMBlueprintEvaluator(BlueprintEvaluator):

    def __init__(self) -> None:
        self.llm = get_qa_client()  # 不同模型 + 更高温度

    async def evaluate_blueprint(self, blueprint: Blueprint) -> QAScorecard:
        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("qa_evaluator", "blueprint_qa_system.md")),
            ("user", load_prompt("qa_evaluator", "blueprint_qa_user.md")),
        ])

        # Pass 1: Structure overview (always fits in context)
        overview = self._build_structure_overview(blueprint) + "\n\nNote: You must respond in valid JSON format conforming to the expected schema."
        chain = prompt | self.llm.with_structured_output(QAResultSchema, method="json_mode")
        result: QAResultSchema = await chain.ainvoke({"blueprint_json": overview})

        # If score is very low, return immediately (no point in detailed check)
        if result.score < 50:
            return QAScorecard(score=result.score, reasoning=result.reasoning, retry_count=0)

        # Pass 2: Spot-check individual scenes (sample up to 3)
        scene_results: list[int] = []
        for scene in blueprint.scenes[:3]:
            scene_json = scene.model_dump_json(exclude_none=True, indent=2)
            scene_chain = prompt | self.llm.with_structured_output(QAResultSchema, method="json_mode")
            scene_result: QAResultSchema = await scene_chain.ainvoke(
                {"blueprint_json": f"## Scene Detail Check\n\nScene ID: {scene.id}\n{scene_json}\n\nNote: You must respond in valid JSON format conforming to the expected schema."}
            )
            scene_results.append(scene_result.score)

        # Average the overview score with scene-level scores
        avg_scene_score = sum(scene_results) / len(scene_results) if scene_results else result.score
        final_score = int((result.score * 0.4) + (avg_scene_score * 0.6))

        return QAScorecard(score=final_score, reasoning=result.reasoning, retry_count=0)

    @staticmethod
    def _build_structure_overview(blueprint: Blueprint) -> str:
        """Build a compact structure summary for QA overview pass."""
        lines = ["## Blueprint Structure Overview\n"]
        lines.append(f"Total scenes: {len(blueprint.scenes)}")
        lines.append(f"Global settings: {'Yes' if blueprint.globalSettings else 'No'}\n")

        for scene in blueprint.scenes:
            elem_count = len(scene.elements) if scene.elements else 0
            anim_count = sum(1 for e in (scene.elements or []) if e.animation)
            has_subtitles = bool(scene.subtitles and scene.subtitles.tokens)
            has_voiceover = bool(scene.voiceover)
            has_sfx = bool(scene.sfx)

            lines.append(f"### Scene: {scene.id}")
            lines.append(f"- Type: {scene.type}, Duration: {scene.durationInFrames} frames ({scene.durationInFrames/30:.1f}s)")
            lines.append(f"- Background: {scene.background.type if scene.background else 'none'}")
            lines.append(f"- Elements: {elem_count} total, {anim_count} animated")
            lines.append(f"- Voiceover: {'Yes' if has_voiceover else 'No'}")
            lines.append(f"- Subtitles: {'Yes' if has_subtitles else 'No'} ({len(scene.subtitles.tokens) if has_subtitles else 0} tokens)")
            lines.append(f"- SFX: {len(scene.sfx) if has_sfx else 0} triggers")
            if scene.transitionToNext:
                lines.append(f"- Transition: {scene.transitionToNext.type} ({scene.transitionToNext.durationInFrames}f)")

            # Element summary
            if scene.elements:
                lines.append("- Element tree:")
                for elem in scene.elements:
                    anim_info = ""
                    if elem.animation and elem.animation.timeline:
                        anim_info = f" [{elem.animation.type} in:{elem.animation.timeline.inFrame} out:{elem.animation.timeline.outFrame}]"
                    layout_info = f" pos:{elem.layout.position}" if elem.layout and elem.layout.position else ""
                    lines.append(f"  - {elem.type}: {elem.id}{anim_info}{layout_info}")
                    if elem.children:
                        for child in elem.children[:3]:
                            lines.append(f"    - {child.type}: {child.id}")
            lines.append("")

        return "\n".join(lines)
