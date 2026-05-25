from abc import ABC, abstractmethod
from typing import Optional

from ..analyzer.entities import ContentModel, DomainAnalysis, Script
from .entities import Blueprint
from ..task.entities import QAScorecard


class BlueprintComposer(ABC):

    @abstractmethod
    async def compose_blueprint(
        self, script: Script, content: ContentModel,
        qa_feedback: Optional[str] = None,
        domain_analysis: Optional[DomainAnalysis] = None,
    ) -> Blueprint:
        """AI Agent-driven visual blueprint composition.

        Takes the script and content model and produces a complete Blueprint
        that the Remotion engine can render directly.

        Args:
            qa_feedback: Previous QA reasoning to address in retry attempts.
            domain_analysis: Domain analysis for template selection and style anchoring.
        """
        pass


class BlueprintEvaluator(ABC):

    @abstractmethod
    async def evaluate_blueprint(self, blueprint: Blueprint) -> QAScorecard:
        """Evaluates blueprint visual properties and returns QAScorecard."""
        pass


class VideoRenderer(ABC):

    @abstractmethod
    async def render_video(self, blueprint: Blueprint, output_video_path: str) -> str:
        """Invokes visual rendering to generate the raw MP4 video."""
        pass
