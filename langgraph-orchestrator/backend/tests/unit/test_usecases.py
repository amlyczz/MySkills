import pytest
from unittest.mock import AsyncMock, MagicMock
import uuid

from src.domain.analyzer.entities import RepoAnalysis, ProjectType
from src.domain.task.entities import PipelineTask, PipelineStatus
from src.domain.task.interfaces import PipelineTaskRepository
from src.domain.analyzer.interfaces import RepoScraper, RepoAnalyzer
from src.application.usecases.analyze import AnalyzeRepoUseCase

@pytest.mark.asyncio
async def test_analyze_repo_usecase() -> None:
    # 1. Arrange Mocks matching DDD-specific interfaces
    mock_scraper = MagicMock(spec=RepoScraper)
    mock_scraper.scrape_repo = AsyncMock(return_value="README content")
    
    mock_analyzer = MagicMock(spec=RepoAnalyzer)
    analysis_result = RepoAnalysis(
        repo_url="https://github.com/user/repo",
        project_name="repo",
        project_type=ProjectType.EDUCATIONAL,
        description="A great repo",
        key_features=["Feature 1"],
        pain_points=["Pain 1"],
        raw_materials=[],
    )
    mock_analyzer.analyze_repo = AsyncMock(return_value=analysis_result)
    
    mock_repo = MagicMock(spec=PipelineTaskRepository)
    task = PipelineTask(
        id=uuid.uuid4(),
        repo_url="https://github.com/user/repo",
        status=PipelineStatus.PENDING,
    )
    mock_repo.get_by_id = AsyncMock(return_value=task)
    mock_repo.update = AsyncMock()
    
    # 2. Act
    usecase = AnalyzeRepoUseCase(mock_scraper, mock_analyzer, mock_repo)
    state = {
        "task_id": str(task.id),
        "repo_url": task.repo_url,
        "project_type": "educational",
    }
    result = await usecase(state)
    
    # 3. Assert
    mock_scraper.scrape_repo.assert_called_once_with(task.repo_url, "repo_screenshot.png")
    mock_analyzer.analyze_repo.assert_called_once_with("README content", task.repo_url)
    mock_repo.get_by_id.assert_called_once_with(task.id)
    mock_repo.update.assert_called_once()
    
    assert result["repo_analysis"] == analysis_result
    assert result["project_type"] == "educational"
    assert result["status"] == PipelineStatus.ANALYZING
