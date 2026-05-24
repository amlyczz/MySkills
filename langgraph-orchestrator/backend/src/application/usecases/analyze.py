import uuid
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.analyzer.interfaces import RepoScraper, RepoAnalyzer
from ..workflow.state import PipelineState

class AnalyzeRepoUseCase:
    
    def __init__(
        self,
        scraper: RepoScraper,
        analyzer: RepoAnalyzer,
        repository: PipelineTaskRepository,
    ) -> None:
        self.scraper = scraper
        self.analyzer = analyzer
        self.repository = repository

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        print("[UseCase] Running AnalyzeRepo")
        
        # 1. Scrape repository
        screenshot_path = "repo_screenshot.png"
        readme_text = await self.scraper.scrape_repo(state["repo_url"], screenshot_path)
        
        # 2. Extract structured analysis via fine-grained RepoAnalyzer
        analysis = await self.analyzer.analyze_repo(readme_text, state["repo_url"])
        
        # 3. Synchronize DB state
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.status = PipelineStatus.ANALYZING
            task.repo_analysis = analysis
            await self.repository.update(task)
            
        return {
            "repo_analysis": analysis,
            "project_type": analysis.project_type.value,
            "status": PipelineStatus.ANALYZING,
        }
