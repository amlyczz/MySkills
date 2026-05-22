"""
去重记录管理 — YYYY-repos.md 格式统一管理。

路径规范: content-generator/YYYY-repos.md
格式: 每行一个 `- owner/repo`

供 content-source-github-trending（读取）和 content-generator（追加）统一使用。
"""

import os
import re
from datetime import datetime
from pydantic import BaseModel, Field


DEDUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "content")


class DedupRecord(BaseModel):
    """一条去重记录"""
    owner: str
    repo: str

    @property
    def full_name(self) -> str:
        return f"{self.owner}/{self.repo}"


class DedupDB(BaseModel):
    """全局去重数据库"""
    year: int = Field(default_factory=lambda: datetime.now().year)
    records: list[DedupRecord] = Field(default_factory=list)

    @property
    def file_path(self) -> str:
        return os.path.join(DEDUP_DIR, f"{self.year}-repos.md")

    def load(self) -> "DedupDB":
        """从 YYYY-repos.md 加载去重记录。"""
        path = self.file_path
        if not os.path.exists(path):
            return DedupDB(year=self.year)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        names = re.findall(r"-\s+([\w.-]+/[\w.-]+)", content)
        records = []
        for name in names:
            parts = name.split("/", 1)
            if len(parts) == 2:
                records.append(DedupRecord(owner=parts[0], repo=parts[1]))
        return DedupDB(year=self.year, records=records)

    def save(self) -> None:
        """追加写入 YYYY-repos.md（覆盖写入完整列表）。"""
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        with open(self.file_path, "w", encoding="utf-8") as f:
            f.write(f"# {self.year} 已推荐仓库\n\n")
            for r in self.records:
                f.write(f"- {r.full_name}\n")

    def is_duplicate(self, full_name: str) -> bool:
        """检查仓库是否已推荐过。"""
        return any(r.full_name == full_name for r in self.records)

    def add(self, full_name: str) -> "DedupDB":
        """添加去重记录。"""
        if not self.is_duplicate(full_name):
            parts = full_name.split("/", 1)
            if len(parts) == 2:
                self.records.append(DedupRecord(owner=parts[0], repo=parts[1]))
        return self
