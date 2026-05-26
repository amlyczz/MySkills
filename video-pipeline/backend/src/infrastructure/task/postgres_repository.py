import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ...domain.task.entities import PipelineTask, QAScorecard, PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.repo_analyzer.entities import ContentModel, MaterialManifest, Script
from ...domain.repo_analyzer.domain_analysis import DomainAnalysis
from ...domain.visual_blueprint.entities import Blueprint
from ...domain.github_trending.entities import ScoredRepo
from .postgres_models import PipelineTaskDB

class PostgresPipelineTaskRepository(PipelineTaskRepository):

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def save(self, task: PipelineTask) -> None:
        db_task = PipelineTaskDB(
            id=task.id,
            repo_url=task.repo_url,
            status=task.status,
            content_model=task.content_model.model_dump() if task.content_model else None,
            material_manifest=task.material_manifest.model_dump() if task.material_manifest else None,
            script=task.script.model_dump() if task.script else None,
            blueprint=task.blueprint.model_dump() if task.blueprint else None,
            trending_repos=[r.model_dump() for r in task.trending_repos] if task.trending_repos else None,
            qa_script=task.qa_script.model_dump() if task.qa_script else None,
            qa_blueprint=task.qa_blueprint.model_dump() if task.qa_blueprint else None,
            domain_analysis=task.domain_analysis.model_dump() if task.domain_analysis else None,
            project_category=task.project_category,
            voiceover_path=task.voiceover_path,
            bgm_path=task.bgm_path,
            video_mp4_path=task.video_mp4_path,
            final_mp4_path=task.final_mp4_path,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )
        self.session.add(db_task)
        await self.session.commit()

    async def get_by_id(self, task_id: uuid.UUID) -> Optional[PipelineTask]:
        result = await self.session.execute(
            select(PipelineTaskDB).where(PipelineTaskDB.id == task_id)
        )
        db_task = result.scalars().first()
        if not db_task:
            return None

        content_model = ContentModel.model_validate(db_task.content_model) if db_task.content_model else None
        material_manifest = MaterialManifest.model_validate(db_task.material_manifest) if db_task.material_manifest else None
        script = Script.model_validate(db_task.script) if db_task.script else None
        blueprint = Blueprint.model_validate(db_task.blueprint) if db_task.blueprint else None
        trending_repos = [ScoredRepo.model_validate(r) for r in db_task.trending_repos] if db_task.trending_repos else None
        qa_script = QAScorecard.model_validate(db_task.qa_script) if db_task.qa_script else None
        qa_blueprint = QAScorecard.model_validate(db_task.qa_blueprint) if db_task.qa_blueprint else None
        domain_analysis = DomainAnalysis.model_validate(db_task.domain_analysis) if db_task.domain_analysis else None

        return PipelineTask(
            id=db_task.id,
            repo_url=db_task.repo_url,
            status=db_task.status,
            content_model=content_model,
            material_manifest=material_manifest,
            script=script,
            blueprint=blueprint,
            trending_repos=trending_repos,
            qa_script=qa_script,
            qa_blueprint=qa_blueprint,
            domain_analysis=domain_analysis,
            project_category=db_task.project_category,
            voiceover_path=db_task.voiceover_path,
            bgm_path=db_task.bgm_path,
            video_mp4_path=db_task.video_mp4_path,
            final_mp4_path=db_task.final_mp4_path,
            created_at=db_task.created_at,
            updated_at=db_task.updated_at,
        )

    async def get_completed_repo_urls(self) -> set[str]:
        """Return repo_url of all completed (or post-processed) tasks for dedup."""
        result = await self.session.execute(
            select(PipelineTaskDB.repo_url).where(
                PipelineTaskDB.status.in_([
                    PipelineStatus.POST_PROCESSING,
                    PipelineStatus.COMPLETED,
                ])
            )
        )
        return {row[0] for row in result.all() if row[0] and row[0] not in ("trending", "pending")}

    async def update(self, task: PipelineTask) -> None:
        db_task = await self.session.get(PipelineTaskDB, task.id)
        if db_task:
            db_task.status = task.status
            db_task.content_model = task.content_model.model_dump() if task.content_model else None
            db_task.material_manifest = task.material_manifest.model_dump() if task.material_manifest else None
            db_task.script = task.script.model_dump() if task.script else None
            db_task.blueprint = task.blueprint.model_dump() if task.blueprint else None
            db_task.trending_repos = [r.model_dump() for r in task.trending_repos] if task.trending_repos else None
            db_task.qa_script = task.qa_script.model_dump() if task.qa_script else None
            db_task.qa_blueprint = task.qa_blueprint.model_dump() if task.qa_blueprint else None
            db_task.domain_analysis = task.domain_analysis.model_dump() if task.domain_analysis else None
            db_task.project_category = task.project_category
            db_task.voiceover_path = task.voiceover_path
            db_task.bgm_path = task.bgm_path
            db_task.video_mp4_path = task.video_mp4_path
            db_task.final_mp4_path = task.final_mp4_path
            db_task.updated_at = datetime.utcnow()
            await self.session.commit()
