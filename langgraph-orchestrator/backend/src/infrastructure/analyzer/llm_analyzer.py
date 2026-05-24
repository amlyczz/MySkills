from langchain_core.prompts import ChatPromptTemplate
from ...domain.analyzer.entities import RepoAnalysis
from ...domain.analyzer.interfaces import RepoAnalyzer
from ..llm.client import get_llm_client

ANALYZE_REPO_SYSTEM_PROMPT = """You are an expert repository analyst. Analyze the following GitHub README and extract the project details matching the schema.
You MUST determine the project_type. It should be:
- "educational": educational/tutorial style concepts.
- "promo": promo/showcase style.
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
