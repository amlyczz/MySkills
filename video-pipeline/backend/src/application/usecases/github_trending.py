import json
import os
import uuid
from pydantic import BaseModel

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.github_trending.entities import ScoredRepo, TrendingResponse, RawTrendingRepo
from ..workflow.state import PipelineState
from ...infrastructure.llm.prompt_loader import load_prompt


class GithubTrendingUseCase:
    """LangGraph Node: Fetches trending repos and uses LLM to score subjective dimensions."""

    def __init__(self, repository: PipelineTaskRepository):
        api_key = os.getenv("DEEPSEEK_V4_API_KEY")
        api_base = os.getenv("DEEPSEEK_V4_API_BASE", "https://api.deepseek.com")
        self.llm = ChatOpenAI(
            model="deepseek-chat",
            api_key=api_key,
            base_url=api_base,
            temperature=0.2,
        )
        self.repository = repository

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        repo_url = state.get("repo_url")
        if repo_url and repo_url != "pending" and repo_url != "trending":
            return {}

        print("[Graph] GithubTrendingUseCase: Fetching top trending repos autonomously...")

        try:
            from ...infrastructure.github.tools import fetch_trending_repos
            raw_repos = await fetch_trending_repos(limit=20)

            if not raw_repos:
                return {"status": PipelineStatus.ERROR, "error": "No trending repositories found."}

            # Objective scoring
            for r in raw_repos:
                stars = r.stars
                stars_score = 5 if stars > 20000 else (4 if stars > 5000 else (3 if stars > 1000 else (2 if stars > 100 else 1)))

                recent = r.recent_stars_7d
                growth = (recent / stars) if stars > 0 else 0
                growth_score = 5 if growth > 0.02 else (4 if growth > 0.01 else (3 if growth > 0.005 else (2 if growth > 0.001 else 1)))

                forks = r.forks
                fork_ratio = (forks / stars) if stars > 0 else 0
                fork_score = 5 if fork_ratio > 0.1 else (4 if fork_ratio > 0.05 else (3 if fork_ratio > 0.02 else (2 if fork_ratio > 0.01 else 1)))

                r.base_heat_score = int((stars_score + growth_score + fork_score) / 3)

                deps = r.dependents_count
                deps_score = 5 if deps > 1000 else (4 if deps > 100 else (3 if deps > 10 else (2 if deps > 0 else 1)))

                followers = r.author_followers
                author_score = 5 if followers > 10000 else (4 if followers > 1000 else (3 if followers > 100 else 2))

                r.impact_score = int((deps_score + author_score) / 2)

            # Subjective scoring via LLM
            prompt = ChatPromptTemplate.from_messages([
                ("system", load_prompt("github", "score_trending_system.md")),
                ("user", "Repos Data:\n{repos_data}"),
            ])

            chain = prompt | self.llm.with_structured_output(TrendingResponse)
            print("[Graph] GithubTrendingUseCase: Sending to LLM for subjective scoring...")

            simplified_data = [
                {
                    "owner": r.owner,
                    "name": r.name,
                    "description": r.description,
                    "language": r.language,
                    "readme_snippet": r.readme_snippet,
                    "base_heat_score": r.base_heat_score,
                    "impact_score": r.impact_score,
                }
                for r in raw_repos
            ]

            llm_res: TrendingResponse = await chain.ainvoke({
                "repos_data": json.dumps(simplified_data, ensure_ascii=False),
            })

            # Merge and calculate final score
            final_repos: list[ScoredRepo] = []
            for sr in llm_res.repos:
                raw = next((r for r in raw_repos if r.owner == sr.owner and r.name == sr.name), None)
                if not raw:
                    continue

                content_score = (sr.tech_depth + sr.video_friendly + sr.topic_heat + sr.onboarding_exp) / 4
                final_score = round(((raw.base_heat_score * 3) + (raw.impact_score * 3) + (content_score * 2)) / 8, 1)

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

            final_repos.sort(key=lambda x: x.final_score, reverse=True)

            print("[Graph] GithubTrendingUseCase: Evaluation complete. Proceeding to HITL.")

            task_id = uuid.UUID(state["task_id"])
            task = await self.repository.get_by_id(task_id)
            if task:
                task.status = PipelineStatus.HITL_TRENDING
                task.trending_repos = final_repos
                await self.repository.update(task)

            return {
                "trending_repos": final_repos,
                "status": PipelineStatus.HITL_TRENDING,
            }

        except Exception as e:
            return {"status": PipelineStatus.ERROR, "error": str(e)}
