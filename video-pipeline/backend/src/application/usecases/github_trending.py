import asyncio
import json
import subprocess
import uuid
import subprocess
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

import os
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.github_trending.entities import ScoredRepo, TrendingResponse, SubjectiveEvaluation
from ..workflow.state import PipelineState
from ...infrastructure.config.app_config import PROJECT_ROOT
from ...infrastructure.github.tools import fetch_trending_repos
from ...infrastructure.llm.prompt_loader import load_prompt

class GithubTrendingUseCase:
    """
    LangGraph Node: Fetches trending repos and uses LLM to score subjective dimensions.
    """
    def __init__(self, repository: PipelineTaskRepository):
        api_key = os.getenv("DEEPSEEK_V4_API_KEY")
        api_base = os.getenv("DEEPSEEK_V4_API_BASE", "https://api.deepseek.com")
        self.llm = ChatOpenAI(
            model="deepseek-chat", 
            api_key=api_key, 
            base_url=api_base,
            temperature=0.2
        )
        self.repository = repository

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        repo_url = state.get("repo_url")
        if repo_url and repo_url != "pending" and repo_url != "trending":
            return {}  # Bypass if a specific URL is already provided
            
        print("[Graph] GithubTrendingUseCase: Fetching top trending repos autonomously...")
        
        try:
            # We need 20 repos for scoring, call coroutine directly
            raw_repos = await fetch_trending_repos(limit=20)
            
            if not raw_repos:
                return {"status": PipelineStatus.ERROR, "error": "No trending repositories found."}
                
            # Perform Base Scoring (Objective)
            for r in raw_repos:
                # 1. Base Heat Score
                stars = r.get("stars", 0)
                stars_score = 5 if stars > 20000 else (4 if stars > 5000 else (3 if stars > 1000 else (2 if stars > 100 else 1)))
                
                recent = r.get("recent_stars_7d", 0)
                growth = (recent / stars) if stars > 0 else 0
                growth_score = 5 if growth > 0.02 else (4 if growth > 0.01 else (3 if growth > 0.005 else (2 if growth > 0.001 else 1)))
                
                forks = r.get("forks", 0)
                fork_ratio = (forks / stars) if stars > 0 else 0
                fork_score = 5 if fork_ratio > 0.1 else (4 if fork_ratio > 0.05 else (3 if fork_ratio > 0.02 else (2 if fork_ratio > 0.01 else 1)))
                
                r["base_heat_score"] = int((stars_score + growth_score + fork_score) / 3)
                
                # 2. Impact Score
                deps = r.get("dependents_count", 0)
                deps_score = 5 if deps > 1000 else (4 if deps > 100 else (3 if deps > 10 else (2 if deps > 0 else 1)))
                
                followers = r.get("author_followers", 0)
                author_score = 5 if followers > 10000 else (4 if followers > 1000 else (3 if followers > 100 else 2))
                
                r["impact_score"] = int((deps_score + author_score) / 2)

            # Perform Subjective Scoring via LLM
            prompt = ChatPromptTemplate.from_messages([
                ("system", load_prompt("github", "score_trending_system.md")),
                ("user", "Repos Data:\n{repos_data}")
            ])
            
            chain = prompt | self.llm.with_structured_output(TrendingResponse)
            print("[Graph] GithubTrendingUseCase: Sending to LLM for subjective scoring...")
            
            # Send simplified data to avoid massive context
            simplified_data = []
            for r in raw_repos:
                simplified_data.append({
                    "owner": r["owner"],
                    "name": r["name"],
                    "description": r["description"],
                    "language": r["language"],
                    "readme_snippet": r.get("readme_snippet", ""),
                    "base_heat_score": r["base_heat_score"],
                    "impact_score": r["impact_score"]
                })
                
            llm_res: TrendingResponse = await chain.ainvoke({
                "repos_data": json.dumps(simplified_data, ensure_ascii=False)
            })
            
            # Merge and Calculate Final Score
            final_repos = []
            for sr in llm_res.repos:
                # Find matching raw
                raw = next((r for r in raw_repos if r["owner"] == sr.owner and r["name"] == sr.name), None)
                if not raw: continue
                
                content_score = (sr.tech_depth + sr.video_friendly + sr.topic_heat + sr.onboarding_exp) / 4
                final_score = round(((raw["base_heat_score"] * 3) + (raw["impact_score"] * 3) + (content_score * 2)) / 8, 1)
                
                scored_repo = ScoredRepo(
                    owner=sr.owner,
                    name=sr.name,
                    url=raw["url"],
                    description=raw.get("description"),
                    language=raw.get("language"),
                    stars=raw.get("stars", 0),
                    recent_stars_7d=raw.get("recent_stars_7d", 0),
                    forks=raw.get("forks", 0),
                    dependents_count=raw.get("dependents_count", 0),
                    author_followers=raw.get("author_followers", 0),
                    tech_depth=sr.tech_depth,
                    video_friendly=sr.video_friendly,
                    topic_heat=sr.topic_heat,
                    onboarding_exp=sr.onboarding_exp,
                    base_heat_score=raw["base_heat_score"],
                    impact_score=raw["impact_score"],
                    final_score=final_score,
                    one_liner=sr.one_liner
                )
                
                final_repos.append(scored_repo)
            
            final_repos.sort(key=lambda x: x.final_score, reverse=True)
            
            # Store the 20 repos in state for HITL review
            print("[Graph] GithubTrendingUseCase: Evaluation complete. Proceeding to HITL.")
            
            task_id = uuid.UUID(state["task_id"])
            task = await self.repository.get_by_id(task_id)
            if task:
                task.status = PipelineStatus.HITL_TRENDING
                task.trending_repos = final_repos
                await self.repository.update(task)
            
            return {
                "trending_repos": final_repos, 
                "status": PipelineStatus.HITL_TRENDING
            }
            
        except Exception as e:
            return {"status": PipelineStatus.ERROR, "error": str(e)}
