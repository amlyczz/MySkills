from abc import ABC, abstractmethod
from typing import Any

class DiagramGenerator(ABC):
    """Interface for generating diagrams from script segments."""

    @abstractmethod
    async def generate(self, script: Any, output_dir: str) -> list[str]:
        """Generate diagrams from a script's segments.

        Args:
            script: The Script entity containing segments.
            output_dir: The directory to save generated diagrams.
            
        Returns:
            list[str]: A list of generated file paths.
        """
        pass
