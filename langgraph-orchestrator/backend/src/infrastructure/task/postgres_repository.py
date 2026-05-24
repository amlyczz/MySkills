import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ...domain.task.entities import PipelineTask, QAScorecard, PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.analyzer.entities import RepoAnalysis
from ...domain.composer.entities import VideoScript
from ...domain.blueprint.entities import Blueprint
from .postgres_models import PipelineTaskDB

class PostgresPipelineTaskRepository(PipelineTaskRepository):
    
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def save(self, task: PipelineTask) -> None:
        db_task = PipelineTaskDB(
            id=task.id,
            repo_url=task.repo_url,
            status=task.status,
            repo_analysis=task.repo_analysis.model_dump() if task.repo_analysis else None,
            video_script=task.video_script.model_dump() if task.video_script else None,
            blueprint=task.blueprint.model_dump() if task.blueprint else None,
            qa_script=task.qa_script.model_dump() if task.qa_script else None,
            qa_blueprint=task.qa_blueprint.model_dump() if task.qa_blueprint else None,
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

        repo_analysis = RepoAnalysis(**db_task.repo_analysis) if db_task.repo_analysis else None
        video_script = VideoScript(**db_task.video_script) if db_task.video_script else None
        blueprint = Blueprint(**db_task.blueprint) if db_task.blueprint else None
        qa_script = QAScorecard(**db_task.qa_script) if db_task.qa_script else None
        qa_blueprint = QAScorecard(**db_task.qa_blueprint) if db_task.qa_blueprint else None

        return PipelineTask(
            id=db_task.id,
            repo_url=db_task.repo_url,
            status=db_task.status,
            repo_analysis=repo_analysis,
            video_script=video_script,
            blueprint=blueprint,
            qa_script=qa_script,
            qa_blueprint=qa_blueprint,
            video_mp4_path=db_task.video_mp4_path,
            final_mp4_path=db_task.final_mp4_path,
            created_at=db_task.created_at,
            updated_at=db_task.updated_at,
        )

    async def update(self, task: PipelineTask) -> None:
        db_task = await self.session.get(PipelineTaskDB, task.id)
        if db_task:
            db_task.status = task.status
            db_task.repo_analysis = task.repo_analysis.model_dump() if task.repo_analysis else None
            db_task.video_script = task.video_script.model_dump() if task.video_script else None
            db_task.blueprint = task.blueprint.model_dump() if task.blueprint else None
            db_task.qa_script = task.qa_script.model_dump() if task.qa_script else None
            db_task.qa_blueprint = task.qa_blueprint.model_dump() if task.qa_blueprint else None
            db_task.video_mp4_path = task.video_mp4_path
            db_task.final_mp4_path = task.final_mp4_path
            db_task.updated_at = datetime.utcnow()
            await self.session.commit()
