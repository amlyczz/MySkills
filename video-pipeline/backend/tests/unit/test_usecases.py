import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

from src.domain.analyzer.entities import ContentModel, NormalizedContent, Script, ScriptSegment, GitHubSourceMeta, MaterialManifest
from src.domain.analyzer.entities import DomainAnalysis, ProjectCategory
from src.domain.blueprint.entities import Blueprint, BlueprintMeta, SceneConfig, GlobalSettings
from src.domain.task.entities import PipelineTask, PipelineStatus
from src.domain.task.interfaces import PipelineTaskRepository
from src.domain.analyzer.interfaces import RepoAnalyzer
from src.domain.blueprint.interfaces import BlueprintComposer
from src.application.usecases.analyze import AnalyzeRepoUseCase
from src.application.usecases.blueprint import GenerateBlueprintUseCase


def _make_content_model() -> ContentModel:
    """Helper to create a minimal ContentModel for testing."""
    return ContentModel(
        source=GitHubSourceMeta(
            source_type="github",
            url="https://github.com/user/repo",
            name="repo",
            full_name="user/repo",
            language="Python",
            stars=100,
            forks=20,
        ),
        content=NormalizedContent(
            title="Test Repo",
            tagline="A great test repo",
            summary="This is a test repository",
            points=["Feature 1", "Feature 2"],
        ),
        script=Script(
            full_text="This is a test narration.",
            segments=[
                ScriptSegment(text="Intro segment", duration_est=5.0, visual_type="intro"),
            ],
            total_duration_est=5.0,
        ),
    )


@pytest.mark.asyncio
async def test_analyze_repo_usecase() -> None:
    # 1. Arrange Mocks
    content_model = _make_content_model()

    mock_analyzer = MagicMock(spec=RepoAnalyzer)
    mock_analyzer.analyze_repo = AsyncMock(return_value=content_model)
    mock_analyzer.classify_category = AsyncMock(return_value=ProjectCategory.EDUCATIONAL)
    mock_domain_analysis = DomainAnalysis(architecture_pattern="Clean Architecture")
    mock_analyzer.analyze_domain = AsyncMock(return_value=mock_domain_analysis)

    mock_repo = MagicMock(spec=PipelineTaskRepository)
    task = PipelineTask(
        id=uuid.uuid4(),
        repo_url="https://github.com/user/repo",
        status=PipelineStatus.PENDING,
    )
    mock_repo.get_by_id = AsyncMock(return_value=task)
    mock_repo.update = AsyncMock()

    # Mock the GitHubMaterialCollector
    mock_manifest = MaterialManifest(materials=[])

    with patch("src.application.usecases.analyze.GitHubMaterialCollector") as MockCollector:
        mock_collector_instance = MockCollector.return_value
        mock_collector_instance.collect = AsyncMock(return_value=(
            "README content",  # readme_text
            mock_manifest,     # material_manifest
            {"full_name": "user/repo", "language": "Python", "stargazers_count": 100},  # repo_metadata
            {"language": "Python", "frameworks": [], "key_deps": []},  # dependency_summary
        ))

        # 2. Act
        usecase = AnalyzeRepoUseCase(mock_analyzer, mock_repo)
        state = {
            "task_id": str(task.id),
            "repo_url": task.repo_url,
            "project_category": "educational",
            "status": PipelineStatus.PENDING,
            "qa_script_retry_count": 0,
            "qa_blueprint_retry_count": 0,
            "content_model": None,
            "material_manifest": None,
            "domain_analysis": None,
            "script": None,
            "blueprint": None,
            "qa_script": None,
            "qa_blueprint": None,
            "segment_actual_durations": [],
            "qa_script_feedback": None,
            "qa_blueprint_feedback": None,
            "voiceover_path": None,
            "bgm_path": None,
            "video_mp4_path": None,
            "final_mp4_path": None,
            "error": None,
        }
        result = await usecase(state)

    # 3. Assert
    mock_analyzer.analyze_repo.assert_called_once()
    mock_repo.get_by_id.assert_called_once_with(task.id)
    mock_repo.update.assert_called_once()

    assert result["content_model"] == content_model
    assert result["material_manifest"] == mock_manifest
    assert result["project_category"] == "educational"
    assert result["domain_analysis"] == mock_domain_analysis
    assert result["status"] == PipelineStatus.ANALYZING

    mock_analyzer.analyze_domain.assert_called_once()


@pytest.mark.asyncio
async def test_generate_blueprint_usecase() -> None:
    # 1. Arrange Mocks
    mock_composer = MagicMock(spec=BlueprintComposer)
    blueprint_result = Blueprint(
        meta=BlueprintMeta(id="test-bp", name="Test Blueprint"),
        globalSettings=GlobalSettings(),
        scenes=[
            SceneConfig(
                id="scene_1",
                type="intro",
                startFrame=0,
                durationInFrames=90,
                elements=[],
            )
        ],
    )
    mock_composer.compose_blueprint = AsyncMock(return_value=blueprint_result)

    mock_repo = MagicMock(spec=PipelineTaskRepository)
    task = PipelineTask(
        id=uuid.uuid4(),
        repo_url="https://github.com/user/repo",
        status=PipelineStatus.COMPOSING,
    )
    mock_repo.get_by_id = AsyncMock(return_value=task)
    mock_repo.update = AsyncMock()

    script = Script(
        full_text="Test narration",
        segments=[ScriptSegment(text="Intro segment", duration_est=3.0, visual_type="intro")],
        total_duration_est=3.0,
    )
    content_model = _make_content_model()

    # 2. Act
    usecase = GenerateBlueprintUseCase(mock_composer, mock_repo)
    state = {
        "task_id": str(task.id),
        "repo_url": task.repo_url,
        "project_category": "educational",
        "status": PipelineStatus.COMPOSING,
        "qa_script_retry_count": 0,
        "qa_blueprint_retry_count": 0,
        "content_model": content_model,
        "material_manifest": None,
        "script": script,
        "blueprint": None,
        "qa_script": None,
        "qa_blueprint": None,
        "segment_actual_durations": [],
        "voiceover_path": None,
        "bgm_path": None,
        "video_mp4_path": None,
        "final_mp4_path": None,
        "error": None,
    }
    result = await usecase(state)

    # 3. Assert
    mock_composer.compose_blueprint.assert_called_once_with(script, content_model, qa_feedback=None, domain_analysis=None)
    mock_repo.get_by_id.assert_called_once_with(task.id)
    mock_repo.update.assert_called_once()

    assert result["blueprint"] == blueprint_result
    assert result["status"] == PipelineStatus.BLUEPRINTING
