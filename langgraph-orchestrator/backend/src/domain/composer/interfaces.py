from abc import ABC, abstractmethod
from ..analyzer.entities import RepoAnalysis
from .entities import VideoScript
from ..task.entities import QAScorecard # Imported cleanly from task entities for scores

class ScriptComposer(ABC):
    
    @abstractmethod
    async def compose_script(self, analysis: RepoAnalysis, target_duration: int) -> VideoScript:
        """Composes script based on RepoAnalysis."""
        pass

class ScriptEvaluator(ABC):
    
    @abstractmethod
    async def evaluate_script(self, script: VideoScript) -> QAScorecard:
        """Evaluates video script and returns QAScorecard."""
        pass
