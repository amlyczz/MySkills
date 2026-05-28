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
from ...domain.twitter_analyzer.entities import TwitterContentModel
from .postgres_models import PipelineTaskDB

class PostgresPipelineTaskRepository(PipelineTaskRepository):

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def save(self, task: PipelineTask) -> None:
        db_task = PipelineTaskDB(
            id=task.id,
            repo_url=task.repo_url,
            status=task.status,
            project_id=task.project_id,
            content_model=task.content_model.model_dump() if task.content_model else None,
            twitter_content=task.twitter_content.model_dump() if task.twitter_content else None,
            material_manifest=task.material_manifest.model_dump() if task.material_manifest else None,
            script=task.script.model_dump() if task.script else None,
            blueprint=task.blueprint.model_dump() if task.blueprint else None,
            trending_repos=[r.model_dump() for r in task.trending_repos] if task.trending_repos else None,
            qa_script=task.qa_script.model_dump() if task.qa_script else None,
            qa_blueprint=task.qa_blueprint.model_dump() if task.qa_blueprint else None,
            domain_analysis=task.domain_analysis.model_dump() if task.domain_analysis else None,
            voiceover_path=task.voiceover_path,
            bgm_path=task.bgm_path,
            video_mp4_path=task.video_mp4_path,
            final_mp4_path=task.final_mp4_path,
            current_node=task.current_node,
            completed_nodes=task.completed_nodes or [],
            failed_node=task.failed_node,
            node_error=task.node_error,
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
        await self.session.commit()
        if not db_task:
            return None

        content_model = ContentModel.model_validate(db_task.content_model) if db_task.content_model else None
        twitter_content = TwitterContentModel.model_validate(db_task.twitter_content) if db_task.twitter_content else None
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
            twitter_content=twitter_content,
            material_manifest=material_manifest,
            script=script,
            blueprint=blueprint,
            trending_repos=trending_repos,
            qa_script=qa_script,
            qa_blueprint=qa_blueprint,
            domain_analysis=domain_analysis,
            voiceover_path=db_task.voiceover_path,
            bgm_path=db_task.bgm_path,
            video_mp4_path=db_task.video_mp4_path,
            final_mp4_path=db_task.final_mp4_path,
            current_node=db_task.current_node,
            completed_nodes=db_task.completed_nodes or [],
            failed_node=db_task.failed_node,
            node_error=db_task.node_error,
            created_at=db_task.created_at,
            updated_at=db_task.updated_at,
        )

    async def get_completed_repo_urls(self) -> set[str]:
        """Return repo_url of all completed (or post-processed) tasks for dedup."""
        result = await self.session.execute(
            select(PipelineTaskDB.repo_url).where(
                PipelineTaskDB.status.in_([
                    PipelineStatus.COMPLETED,
                ])
            )
        )
        urls = {row[0] for row in result.all() if row[0] and row[0] not in ("trending", "pending")}
        await self.session.commit()
        return urls

    async def update(self, task: PipelineTask) -> None:
        db_task = await self.session.get(PipelineTaskDB, task.id)
        if db_task:
            db_task.status = task.status
            db_task.content_model = task.content_model.model_dump() if task.content_model else None
            db_task.twitter_content = task.twitter_content.model_dump() if task.twitter_content else None
            db_task.material_manifest = task.material_manifest.model_dump() if task.material_manifest else None
            db_task.script = task.script.model_dump() if task.script else None
            db_task.blueprint = task.blueprint.model_dump() if task.blueprint else None
            db_task.trending_repos = [r.model_dump() for r in task.trending_repos] if task.trending_repos else None
            db_task.qa_script = task.qa_script.model_dump() if task.qa_script else None
            db_task.qa_blueprint = task.qa_blueprint.model_dump() if task.qa_blueprint else None
            db_task.domain_analysis = task.domain_analysis.model_dump() if task.domain_analysis else None
            db_task.voiceover_path = task.voiceover_path
            db_task.bgm_path = task.bgm_path
            db_task.video_mp4_path = task.video_mp4_path
            db_task.final_mp4_path = task.final_mp4_path
            db_task.current_node = task.current_node
            db_task.completed_nodes = task.completed_nodes or []
            db_task.failed_node = task.failed_node
            db_task.node_error = task.node_error
            db_task.updated_at = datetime.utcnow()
            await self.session.commit()

    async def delete(self, task_id: uuid.UUID) -> bool:
        from sqlalchemy import delete as sa_delete
        stmt = sa_delete(PipelineTaskDB).where(PipelineTaskDB.id == task_id)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount > 0

    async def list_by_project(self, project_id: uuid.UUID) -> list[PipelineTask]:
        stmt = (
            select(PipelineTaskDB)
            .where(PipelineTaskDB.project_id == project_id)
            .order_by(PipelineTaskDB.created_at.desc())
        )
        result = await self.session.execute(stmt)
        db_tasks = result.scalars().all()
        
        tasks = []
        for db_task in db_tasks:
            tasks.append(PipelineTask(
                id=db_task.id,
                repo_url=db_task.repo_url or "",
                status=db_task.status,
                project_id=db_task.project_id,
                created_at=db_task.created_at,
                updated_at=db_task.updated_at,
            ))
        return tasks
