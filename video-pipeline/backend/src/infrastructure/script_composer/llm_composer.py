from typing import Optional

from langchain_core.prompts import ChatPromptTemplate
from ...domain.repo_analyzer.entities import ContentModel, DomainAnalysis
from ...domain.script_composer.entities import Script
from ...domain.script_composer.interfaces import ScriptComposer
from ..llm.client import get_llm_client
from ..llm.prompt_loader import load_prompt

class LLMScriptComposer(ScriptComposer):

    def __init__(self) -> None:
        self.llm = get_llm_client()

    async def compose_script(
        self,
        content: ContentModel,
        target_duration: int,
        domain_analysis: Optional[DomainAnalysis] = None,
        qa_feedback: Optional[str] = None,
    ) -> Script:
        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("script_composer", "compose_script_system.md")),
            ("user", load_prompt("script_composer", "compose_script_user.md")),
        ])

        encyclopedia = content.content
        name = encyclopedia.title if encyclopedia else "Unknown Project"
        summary = encyclopedia.summary if encyclopedia else ""
        quick_start = encyclopedia.quick_start if encyclopedia else ""
        use_cases = encyclopedia.use_cases if encyclopedia else ""
        usage_intro = encyclopedia.usage_intro if encyclopedia else ""
        architecture = encyclopedia.architecture_breakdown if encyclopedia else ""
        domain_specific_insights = encyclopedia.domain_specific_insights if encyclopedia else ""

        # Supplement with source code insight if available
        if content.source_code_insight:
            sci = content.source_code_insight
            if sci.architecture and not architecture:
                architecture = sci.architecture
            if sci.highlights:
                extra = "\n\nSource Code Highlights: " + "; ".join(sci.highlights)
                domain_specific_insights = (domain_specific_insights + extra).strip()

        # Format curated materials
        curated_materials_text = (
            "\n".join(content.curated_materials)
            if content.curated_materials
            else "No explicit assets provided. Use Mermaid diagrams for architecture visualization."
        )

        audience_primary = domain_analysis.audience.primary if domain_analysis else "General Developers"
        audience_expertise = domain_analysis.audience.expertise_level if domain_analysis else "Intermediate"
        technical_depth = domain_analysis.technical_depth if domain_analysis else "Moderate"
        narrative_angle = domain_analysis.narrative.angle if domain_analysis else "Educational Breakdown"

        # Inject HITL feedback
        feedback_section = ""
        if qa_feedback:
            feedback_section = (
                f"\n## Human Review Feedback\n"
                f"The reviewer gave the following feedback on the previous version:\n\n"
                f"{qa_feedback}\n\n"
                f"You MUST address this feedback in your new version."
            )

        chain = prompt | self.llm.with_structured_output(Script)
        script: Script = await chain.ainvoke({
            "target_duration": "180-600 (3-10 minutes), decide based on project complexity and depth of content",
            "hook_pct": "~5-8%",
            "context_pct": "~10-15%",
            "deep_dive_pct": "~55-70%",
            "climax_pct": "~8-12%",
            "resolution_pct": "~3-5%",
            "audience_primary": audience_primary,
            "audience_expertise": audience_expertise,
            "technical_depth": technical_depth,
            "narrative_angle": narrative_angle,
            "curated_materials": curated_materials_text,
            "name": name,
            "summary": summary,
            "quick_start": quick_start,
            "use_cases": use_cases,
            "usage_intro": usage_intro,
            "architecture": architecture,
            "domain_specific_insights": domain_specific_insights,
            "feedback_section": feedback_section,
        })
        return script
