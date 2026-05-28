from typing import Optional

from langchain_core.prompts import ChatPromptTemplate
from ...domain.repo_analyzer.entities import ContentModel, DomainAnalysis
from ...domain.script_composer.entities import Script
from ...domain.script_composer.interfaces import ScriptComposer
from ...domain.twitter_analyzer.entities import TwitterContentModel
from ..llm.client import get_llm, LLMRole, structured_chain
from ..llm.prompt_loader import load_prompt

class LLMScriptComposer(ScriptComposer):

    def __init__(self, model: str | None = None) -> None:
        # CREATIVE role: low reasoning_effort — lets the model briefly plan the narrative arc
        # (segment structure, pacing, story beats) before writing, without the token exhaustion
        # of max thinking mode. EXTRACTION (reasoning_effort=max) was burning 20-40k tokens
        # on chain-of-thought and leaving no budget for the actual JSON script output.
        self.llm = get_llm(LLMRole.CREATIVE, model=model)


    async def compose_script(
        self,
        content: Optional[ContentModel] = None,
        target_duration: int = 0,
        domain_analysis: Optional[DomainAnalysis] = None,
        qa_feedback: Optional[str] = None,
        twitter_content: Optional[TwitterContentModel] = None,
    ) -> Script:
        # 1. Build common context payload
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
            # Twitter flow
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
        _lp.cache_clear()
        
        target_mins = max(3, target_duration // 60) if target_duration > 0 else 4
        total_duration_str = f"{target_mins-1}-{target_mins+1} minutes"

        base_params = {
            "target_duration": total_duration_str,
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
        }

        # Step 1: Generate Plan
        from ...domain.repo_analyzer.entities import ScriptPlan, ChapterScript
        
        plan_prompt = ChatPromptTemplate.from_messages([
            ("system", _lp("script_composer", "compose_plan_system.md")),
            ("user", _lp("script_composer", "compose_plan_user.md")),
        ])
        plan_chain = structured_chain(plan_prompt, self.llm, ScriptPlan)
        
        logger.info("[LLMScriptComposer] Generating script plan for duration: %s", total_duration_str)
        plan: Optional[ScriptPlan] = None
        for attempt in range(3):
            try:
                plan = await plan_chain.ainvoke(base_params)
                break
            except ValueError as e:
                if "token limit" in str(e).lower() or "empty content" in str(e).lower() or "empty json" in str(e).lower():
                    logger.warning("[LLMScriptComposer] Plan generation attempt %d failed: %s", attempt + 1, e)
                    if attempt == 2:
                        logger.warning("[LLMScriptComposer] Falling back to non-reasoning model for script plan")
                        from ..config.app_config import settings
                        fallback_llm = get_llm(LLMRole.GENERATION, model=settings.llm_model_fast)
                        fallback_plan_chain = structured_chain(plan_prompt, fallback_llm, ScriptPlan)
                        plan = await fallback_plan_chain.ainvoke(base_params)
                else:
                    raise e
                    
        logger.info("[LLMScriptComposer] Script plan generated with %d chapters", len(plan.chapters))
        
        # Step 2: Iteratively Generate Chapters
        script_prompt = ChatPromptTemplate.from_messages([
            ("system", _lp("script_composer", "compose_script_system.md")),
            ("user", _lp("script_composer", "compose_script_user.md")),
        ])
        script_chain = structured_chain(script_prompt, self.llm, ChapterScript)
        
        all_segments = []
        previous_summary = ""
        last_few_sentences = ""
        
        for i, chapter in enumerate(plan.chapters):
            logger.info("[LLMScriptComposer] Generating chapter %d/%d: %s", i+1, len(plan.chapters), chapter.chapter_title)
            
            chapter_params = base_params.copy()
            chapter_params.update({
                "overall_narrative_arc": plan.overall_narrative_arc,
                "chapter_title": chapter.chapter_title,
                "chapter_description": chapter.description,
                "chapter_target_duration": chapter.target_duration_est,
                "chapter_key_points": "\n".join(f"- {kp}" for kp in chapter.key_points),
                "previous_summary": previous_summary or "This is the first chapter.",
                "last_few_sentences": last_few_sentences or "None",
            })
            
            chapter_script: Optional[ChapterScript] = None
            for attempt in range(3):
                try:
                    chapter_script = await script_chain.ainvoke(chapter_params)
                    break
                except ValueError as e:
                    if "token limit" in str(e).lower() or "empty content" in str(e).lower() or "empty json" in str(e).lower():
                        logger.warning("[LLMScriptComposer] Chapter %d attempt %d failed: %s", i+1, attempt + 1, e)
                        if attempt == 2:
                            logger.warning("[LLMScriptComposer] Falling back to non-reasoning model for chapter %d", i + 1)
                            from ..config.app_config import settings
                            fallback_llm = get_llm(LLMRole.GENERATION, model=settings.llm_model_fast)
                            fallback_chain = structured_chain(script_prompt, fallback_llm, ChapterScript)
                            chapter_script = await fallback_chain.ainvoke(chapter_params)
                    else:
                        raise e
            
            all_segments.extend(chapter_script.segments)
            previous_summary = chapter_script.chapter_summary
            if chapter_script.segments:
                last_few_sentences = chapter_script.segments[-1].text[-100:]
                
        # Step 3: Aggregate
        full_text = "\n\n".join(seg.text for seg in all_segments)
        total_duration = sum(seg.duration_est for seg in all_segments)
        
        if not all_segments:
            raise ValueError("LLM generated no script segments.")
            
        logger.info("[LLMScriptComposer] Script generation complete. Total segments: %d, Duration: %.1fs", len(all_segments), total_duration)
        
        return Script(
            full_text=full_text,
            segments=all_segments,
            total_duration_est=total_duration
        )
