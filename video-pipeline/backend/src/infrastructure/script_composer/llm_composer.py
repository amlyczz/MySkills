from typing import Optional

from langchain_core.prompts import ChatPromptTemplate
from ...domain.repo_analyzer.entities import ContentModel, DomainAnalysis
from ...domain.script_composer.entities import Script
from ...domain.script_composer.interfaces import ScriptComposer
from ...domain.twitter_analyzer.entities import TwitterContentModel
from ..llm.client import get_llm, LLMRole, structured_chain
from ..llm.prompt_loader import load_prompt

class LLMScriptComposer(ScriptComposer):

    def __init__(self) -> None:
        # CREATIVE role: low reasoning_effort — lets the model briefly plan the narrative arc
        # (segment structure, pacing, story beats) before writing, without the token exhaustion
        # of max thinking mode. EXTRACTION (reasoning_effort=max) was burning 20-40k tokens
        # on chain-of-thought and leaving no budget for the actual JSON script output.
        self.llm = get_llm(LLMRole.CREATIVE)


    async def compose_script(
        self,
        content: Optional[ContentModel] = None,
        target_duration: int = 0,
        domain_analysis: Optional[DomainAnalysis] = None,
        qa_feedback: Optional[str] = None,
        twitter_content: Optional[TwitterContentModel] = None,
    ) -> Script:
        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("script_composer", "compose_script_system.md")),
            ("user", load_prompt("script_composer", "compose_script_user.md")),
        ])

        if content is not None:
            # GitHub repo flow
            encyclopedia = content.content
            name = encyclopedia.title if encyclopedia else "Unknown Project"
            summary = encyclopedia.tagline if encyclopedia else ""
            quick_start = encyclopedia.quick_start if encyclopedia else ""
            use_cases = encyclopedia.use_cases if encyclopedia else ""
            usage_intro = encyclopedia.usage_intro if encyclopedia else ""
            architecture = encyclopedia.architecture_breakdown if encyclopedia else ""
            domain_specific_insights = encyclopedia.domain_specific_insights if encyclopedia else ""

            if content.source_code_insight:
                sci = content.source_code_insight
                if sci.architecture and not architecture:
                    architecture = sci.architecture
                if sci.highlights:
                    extra = "\n\nSource Code Highlights: " + "; ".join(sci.highlights)
                    domain_specific_insights = (domain_specific_insights + extra).strip()

            curated_materials_text = (
                "\n".join(content.curated_materials)
                if content.curated_materials
                else "No explicit assets provided."
            )
        elif twitter_content is not None:
            # Twitter flow — build context from twitter_content object
            tc = twitter_content
            name = tc.title or "Twitter Thread"
            author = tc.author
            handle = tc.handle
            summary = tc.summary
            main_text = tc.main_tweet_text
            thread_flow = tc.thread_context
            sentiment = tc.community_sentiment
            domain = tc.tech_domain or ""

            quick_start = ""
            use_cases = ""
            usage_intro = ""
            architecture = ""
            domain_specific_insights = (
                f"Author: @{handle} ({author})\n"
                f"Tech domain: {domain}\n"
                f"Community tone: {sentiment.overall_tone}\n"
                f"Thread narrative: {thread_flow.narrative_flow[:500]}"
            )
            curated_materials_text = f"Main tweet content:\n{main_text[:2000]}"
        else:
            name = "Unknown"
            summary = ""
            quick_start = ""
            use_cases = ""
            usage_intro = ""
            architecture = ""
            domain_specific_insights = ""
            curated_materials_text = "No content available."

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

        import logging
        logger = logging.getLogger(__name__)

        from ..llm.prompt_loader import load_prompt as _lp
        _lp.cache_clear()  # pick up edited prompt files without restart

        chain = structured_chain(prompt, self.llm, Script)
        
        script: Script = await chain.ainvoke({
            "target_duration": "360-600 (6-10 minutes), decide based on project complexity and depth of content",
            "hook_pct": "~5-8%",
            "context_pct": "~10-15%",
            "deep_dive_pct": "~55-65%",
            "climax_pct": "~10-15%",
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

