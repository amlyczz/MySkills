import os

def setup_langfuse():
    """
    Configure Langfuse tracing using environment variables.
    This should be called at the entrypoint of the application.
    """
    # Assuming langfuse variables are injected via .env in production
    if not os.getenv("LANGFUSE_PUBLIC_KEY"):
        os.environ["LANGFUSE_PUBLIC_KEY"] = "pk-lf-test"
    if not os.getenv("LANGFUSE_SECRET_KEY"):
        os.environ["LANGFUSE_SECRET_KEY"] = "sk-lf-test"
    if not os.getenv("LANGFUSE_HOST"):
        os.environ["LANGFUSE_HOST"] = "http://localhost:3000"
        
    # Enable LangChain automatic tracing
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_PROJECT"] = "video-pipeline"
    
    from langfuse.callback import CallbackHandler
    return CallbackHandler()
