"""
repo-analyzer Pydantic 模型 — 仅作为 import 重定向。

所有模型定义已迁移到 pipeline-contracts 包：
    contracts/pipeline_contracts/content.py

保留此文件保持向后兼容。
"""
# flake8: noqa
from pipeline_contracts import (
    ContentModel,
    ContentInfo,
    RepoInfo,
    Script,
    ScriptSegment,
    Covers,
    CoverVariant,
    PublishCopy,
    PublishTitle,
    SourceCodeInsight,
    Meta,
)

__all__ = [
    "ContentModel", "ContentInfo", "RepoInfo", "Script", "ScriptSegment",
    "Covers", "CoverVariant", "PublishCopy", "PublishTitle",
    "SourceCodeInsight", "Meta",
]
