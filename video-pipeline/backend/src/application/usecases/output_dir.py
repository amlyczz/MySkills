"""Shared output directory resolution for all pipeline use cases."""

import os
from datetime import datetime

from ...infrastructure.config.app_config import PROJECT_ROOT
from ..workflow.state import PipelineState


def resolve_output_dir(state: PipelineState) -> str:
    """Compute output directory: video-pipeline/output/{source}/{date}/{repo_name}/"""
    source = state.get("project_category", "github")
    date_str = datetime.now().strftime("%Y-%m-%d")
    repo_url = state.get("repo_url", "unknown")
    repo_name = repo_url.rstrip("/").split("/")[-1] if "/" in repo_url else "unknown"
    output_dir = str(PROJECT_ROOT / "output" / source / date_str / repo_name)
    os.makedirs(output_dir, exist_ok=True)
    return output_dir
