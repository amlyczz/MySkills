from abc import ABC, abstractmethod
from .entities import Blueprint
from ..task.entities import QAScorecard
from ..composer.entities import VideoScript
from ..analyzer.entities import RepoAnalysis

class BlueprintComposer(ABC):
    
    @abstractmethod
    async def compose_blueprint(self, script: VideoScript, analysis: RepoAnalysis) -> Blueprint:
        """AI Agent 主导的 13 维视觉编排决策"""
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
