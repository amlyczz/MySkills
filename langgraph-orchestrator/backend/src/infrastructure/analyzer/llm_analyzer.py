from langchain_core.prompts import ChatPromptTemplate
from ...domain.analyzer.entities import RepoAnalysis
from ...domain.analyzer.interfaces import RepoAnalyzer
from ..llm.client import get_llm_client

ANALYZE_REPO_SYSTEM_PROMPT = """You are an expert repository analyst and video content strategist.
Your task is to analyze the README and repository context through a strict 4-Phase Pipeline framework:

### 4-Phase Pipeline Framework:
- **Phase 1: Repo Exploration**: Parse the repository structures, language, frameworks, and architecture.
- **Phase 2: Material Discovery**: Locate visual materials. Target discovering 14-35 assets and selecting 12-25 assets to download, covering at least 4 distinct types (e.g. logo, screenshots, scroll recordings, code files).
- **Phase 3: Source Code Insight**: Deeply inspect and extract the architectural designs, core components, and main algorithms. Highlight at least one technical innovation.
- **Phase 4: Material Binding**: Match visual and code materials to segments to explain technical features.

### AI / ML Repository Special Rules:
If the project represents an AI/ML model, you MUST:
1. Parse the main modeling layer architecture (e.g., Encoder -> Processor -> Decoder).
2. Create a visual representation layout of the neural network blocks.
3. List parameters and dimensions (e.g. 3B parameters, hidden_size, layer counts).
4. Dedicate at least one script segment to walk through this visual diagram.

Ensure the final structured output matches:
- project_name: Name of repository.
- project_type: "educational" (tutorial) or "promo" (showcase).
- description: Executive summary.
- key_features: Major milestones/technical points.
- pain_points: Pain points solved.
- raw_materials: List of files discovered (logo, screenshots, code files, diagrams).
"""

ANALYZE_REPO_USER_PROMPT = "README Content:\n{readme}\n\nRepo URL: {url}"

class LLMRepoAnalyzer(RepoAnalyzer):
    
    def __init__(self) -> None:
        self.llm = get_llm_client()

    async def analyze_repo(self, readme_text: str, repo_url: str) -> RepoAnalysis:
        prompt = ChatPromptTemplate.from_messages([
            ("system", ANALYZE_REPO_SYSTEM_PROMPT),
            ("user", ANALYZE_REPO_USER_PROMPT),
        ])
        
        chain = prompt | self.llm.with_structured_output(RepoAnalysis)
        analysis: RepoAnalysis = await chain.ainvoke({
            "readme": readme_text,
            "url": repo_url,
        })
        return analysis
