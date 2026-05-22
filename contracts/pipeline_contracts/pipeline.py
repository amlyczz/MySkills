"""
Pipeline — 管线编排相关的数据契约。

定义 Pipeline 模板（Processor 组合）和 Processor 注册的结构。
"""

from pydantic import BaseModel, Field
from typing import Optional, Any


class ExecConfig(BaseModel):
    """Processor 的执行方式"""
    type: str = "skill"
    skill: Optional[str] = None
    command: Optional[str] = None


class ContractRef(BaseModel):
    """契约引用"""
    contract: str = ""
    description: str = ""


class ProcessorDef(BaseModel):
    """Processor 声明（对应 processor.json）"""
    name: str
    description: str = ""
    input: ContractRef = Field(default_factory=ContractRef)
    output: ContractRef = Field(default_factory=ContractRef)
    config: dict[str, Any] = Field(default_factory=dict)
    exec: ExecConfig = Field(default_factory=ExecConfig)


class Edge(BaseModel):
    """Pipeline 中的 Processor 连线"""
    from_: str = Field(alias="from")
    to: str = ""
    output: Optional[str] = None

    model_config = {"populate_by_name": True}


class PipelineDef(BaseModel):
    """Pipeline 定义"""
    name: str
    description: str = ""
    version: str = "1.0"
    processors: list[dict] = Field(default_factory=list)
    edges: list[Edge] = Field(default_factory=list)
    inputs: dict[str, Any] = Field(default_factory=dict)
    outputs: dict[str, Any] = Field(default_factory=dict)
