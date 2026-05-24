import os
from langchain_openai import ChatOpenAI
from ..config.app_config import settings

def get_llm_client() -> ChatOpenAI:
    """
    Initializes and returns the ChatOpenAI client with active Langfuse tracing configured.
    """
    # Inject tracing variables into environment for LangChain automatic routing
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_PROJECT"] = "video-pipeline"
    os.environ["LANGCHAIN_API_KEY"] = "pk-lf-test" # Dummy value if needed
    os.environ["LANGCHAIN_ENDPOINT"] = "http://localhost:3000" # Local Langfuse
    
    # Configure actual OpenAI key & base URL
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY", "mock-key")
    base_url = settings.openai_base_url
    
    return ChatOpenAI(
        model="gpt-4o",
        temperature=0.2,
        openai_api_key=api_key,
        openai_api_base=base_url
    )
