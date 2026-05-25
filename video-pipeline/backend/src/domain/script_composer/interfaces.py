from abc import ABC, abstractmethod

from .entities import ContentModel, Script, VisualPlan
from ..repo_analyzer.entities import DomainAnalysis
from ..task.entities import QAScorecard
from typing import Optional


class ScriptComposer(ABC):

    @abstractmethod
    async def compose_script(
        self,
        content: ContentModel,
        target_duration: int = 0,
        domain_analysis: Optional[DomainAnalysis] = None,
        qa_feedback: Optional[str] = None,
    ) -> Script:
        """Compose a narration script based on the Project Encyclopedia and Domain Analysis.

        Args:
            target_duration: 0 means let LLM decide duration (3-10 min range).
        """
        pass


class ScriptEvaluator(ABC):

    @abstractmethod
    async def evaluate_script(
        self, script: Script, source_context: Optional[str] = None,
    ) -> QAScorecard:
        """Evaluates video script and returns QAScorecard."""
        pass


class VisualPlanner(ABC):

    @abstractmethod
    async def plan_visuals(self, script: Script, content: ContentModel) -> list[VisualPlan]:
        """Generates visual plans for each script segment, bridging to blueprint composition."""
        pass
