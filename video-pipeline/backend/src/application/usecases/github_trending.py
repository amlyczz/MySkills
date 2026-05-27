import json
import logging
import uuid

from langchain_core.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)
from ...domain.task.entities import PipelineStatus, StatusTransitionService
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.github_trending.entities import ScoredRepo, TrendingResponse, RawTrendingRepo
from ..workflow.state import PipelineState
from ...infrastructure.llm.client import get_llm, LLMRole
from ...infrastructure.llm.prompt_loader import load_prompt


class GithubTrendingUseCase:
    """LangGraph Node: Fetches trending repos and uses LLM to score subjective dimensions."""

    def __init__(self, repository: PipelineTaskRepository, status_service: StatusTransitionService):
        self.llm = get_llm(LLMRole.SCORING)
        self.repository = repository
        self.status_service = status_service

    async def __call__(self, state: PipelineState) -> PipelineState:
        repo_url = state.get("repo_url", "")
        # Skip if already completed in a prior run (retry guard)
        if repo_url and repo_url not in ("pending", "trending", ""):
            logger.info("[UseCase] GithubTrending: skipping (repoUrl already selected)")
            return {**state}  # pass through all state unchanged
        if state.get("trending_repos"):
            logger.info("[UseCase] GithubTrending: skipping (trending_repos already in state)")
            return {**state}

        task_id = uuid.UUID(state["task_id"])

        # ① Enter node: mark active immediately
        await self.status_service.transition(
            task_id, PipelineStatus.FETCHING_TRENDING, node="github_trending"
        )

        logger.info("[Graph] GithubTrendingUseCase: Fetching top trending repos autonomously...")

        try:
            from ...infrastructure.github.tools import fetch_trending_repos
            logger.info("[Graph] GithubTrendingUseCase: Calling fetch_trending_repos...")

            exclude_urls: set[str] = set()
            try:
                exclude_urls = await self.repository.get_completed_repo_urls()
            except Exception:
                await self.repository.session.rollback()

            raw_repos = await fetch_trending_repos(limit=30, exclude_urls=exclude_urls)
            logger.info(f"[Graph] GithubTrendingUseCase: Got {len(raw_repos)} repos")

            if not raw_repos:
                await self.status_service.transition(
                    task_id, PipelineStatus.ERROR, node="github_trending",
                    error="No trending repositories found.",
                )
                return PipelineState(
                    task_id=state["task_id"],
                    repo_url=state.get("repo_url", ""),
                    status=PipelineStatus.ERROR,
                    error="No trending repositories found.",
                )

            # Objective scoring
            for r in raw_repos:
                vel = r.star_velocity
                velocity_score = 5 if vel > 100 else (4 if vel > 30 else (3 if vel > 10 else (2 if vel > 3 else 1)))

                stars = r.stars
                if stars > 50000:
                    stars_score = 1
                elif stars > 10000:
                    stars_score = 3
                else:
                    stars_score = 5 if stars > 2000 else (4 if stars > 500 else (3 if stars > 100 else 2))

                forks = r.forks
                fork_ratio = (forks / stars) if stars > 0 else 0
                fork_score = 5 if fork_ratio > 0.1 else (4 if fork_ratio > 0.05 else (3 if fork_ratio > 0.02 else 2))

                r.base_heat_score = int(round((velocity_score * 6 + stars_score * 2 + fork_score) / 9))

                deps = r.dependents_count
                deps_score = 5 if deps > 1000 else (4 if deps > 100 else (3 if deps > 10 else (2 if deps > 0 else 1)))

                followers = r.author_followers
                author_score = 5 if followers > 10000 else (4 if followers > 1000 else (3 if followers > 100 else 2))

                r.impact_score = int((deps_score + author_score) / 2)

            # Subjective scoring via LLM
            prompt = ChatPromptTemplate.from_messages([
                ("system", load_prompt("github", "score_trending_system.md")),
                ("user", "项目数据：\n{repos_data}"),
            ])

            chain = prompt | self.llm.with_structured_output(TrendingResponse, method="json_mode", include_raw=True)
            logger.info("[Graph] GithubTrendingUseCase: Sending to LLM for subjective scoring...")

            simplified_data = [
                r.model_dump(include={
                    "owner", "name", "description", "language", "stars",
                    "recent_stars_7d", "star_velocity", "base_heat_score", "impact_score",
                }) | {"readme_snippet": r.readme_snippet[:200]}
                for r in raw_repos
            ]

            raw_result = await chain.ainvoke({
                "repos_data": json.dumps(simplified_data, ensure_ascii=False),
            })

            llm_res: TrendingResponse | None = raw_result.get("parsed")
            if llm_res is None:
                raw_msg = raw_result.get("raw")
                if raw_msg and hasattr(raw_msg, "content") and raw_msg.content:
                    try:
                        import re
                        content = raw_msg.content
                        content = re.sub(r'^```(?:json)?\s*\n?', '', content.strip())
                        content = re.sub(r'\n?```\s*$', '', content.strip())
                        llm_res = TrendingResponse.model_validate_json(content)
                        logger.info("[Graph] GithubTrendingUseCase: Recovered via raw content fallback")
                    except Exception as fb_err:
                        logger.warning(f"[Graph] GithubTrendingUseCase: Raw fallback also failed: {fb_err}")
                        raise ValueError(f"LLM structured output failed: {raw_result.get('parsing_error')}")
                else:
                    raise ValueError("LLM returned no structured output and no raw content")

            # Merge and calculate final score
            final_repos: list[ScoredRepo] = []
            for sr in llm_res.repos:
                raw = next((r for r in raw_repos if r.owner == sr.owner and r.name == sr.name), None)
                if not raw:
                    continue

                content_score = (sr.tech_depth + sr.video_friendly + sr.topic_heat + sr.onboarding_exp) / 4
                final_score = round(((raw.base_heat_score * 6) + (content_score * 2) + raw.impact_score) / 9, 1)

                final_repos.append(ScoredRepo(
                    owner=sr.owner,
                    name=sr.name,
                    url=raw.url,
                    description=raw.description,
                    language=raw.language,
                    stars=raw.stars,
                    recent_stars_7d=raw.recent_stars_7d,
                    forks=raw.forks,
                    dependents_count=raw.dependents_count,
                    author_followers=raw.author_followers,
                    tech_depth=sr.tech_depth,
                    video_friendly=sr.video_friendly,
                    topic_heat=sr.topic_heat,
                    onboarding_exp=sr.onboarding_exp,
                    base_heat_score=raw.base_heat_score,
                    impact_score=raw.impact_score,
                    final_score=final_score,
                    one_liner=sr.one_liner,
                ))

            final_repos.sort(key=lambda x: (x.recent_stars_7d > 0, x.recent_stars_7d, x.final_score), reverse=True)
            final_repos = final_repos[:20]

            logger.info(f"[Graph] GithubTrendingUseCase: Evaluation complete. Top repo: "
                  f"{final_repos[0].owner}/{final_repos[0].name} "
                  f"(score={final_repos[0].final_score}, 7d_stars={final_repos[0].recent_stars_7d})")

            # ② Complete node: update via FSM
            await self.status_service.mark_node_completed(
                task_id, "github_trending",
                updates={"trending_repos": final_repos, "status": PipelineStatus.HITL_TRENDING},
            )

            return PipelineState(
                task_id=state["task_id"],
                repo_url=state.get("repo_url", ""),
                trending_repos=final_repos,
                status=PipelineStatus.HITL_TRENDING,
            )

        except Exception as e:
            logger.exception(f"[Graph] GithubTrendingUseCase ERROR: {e}")
            await self.status_service.transition(
                task_id, PipelineStatus.ERROR, node="github_trending", error=str(e),
            )
            return PipelineState(
                task_id=state["task_id"],
                repo_url=state.get("repo_url", ""),
                status=PipelineStatus.ERROR,
                error=str(e),
            )
