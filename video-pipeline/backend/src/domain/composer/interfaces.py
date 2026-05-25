from abc import ABC, abstractmethod

from .entities import ContentModel, Script, VisualPlan
from ..task.entities import QAScorecard
from typing import Optional


class ScriptComposer(ABC):

    @abstractmethod
    async def compose_script(
        self, content: ContentModel, target_duration: int,
        qa_feedback: Optional[str] = None,
    ) -> Script:
        """Composes script from ContentModel.

        Args:
            qa_feedback: Previous QA reasoning to address in retry attempts.
        """
        pass


class ScriptEvaluator(ABC):

    @abstractmethod
    async def evaluate_script(
        self, script: Script, source_context: Optional[str] = None,
    ) -> QAScorecard:
        """Evaluates video script and returns QAScorecard.

        Args:
            source_context: Source materials for fact-checking technical claims.
        """
        pass


class VisualPlanner(ABC):

    @abstractmethod
    async def plan_visuals(self, script: Script, content: ContentModel) -> list[VisualPlan]:
        """Generates visual plans for each script segment, bridging to blueprint composition."""
        pass
