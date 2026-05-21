"""Specialized text generation capability types.

Used only for creative formats that code agent struggles with:
classical poems (四言诗), lyrics with rhyme, couplets (对联).
General text (scripts, titles, copy) is done by code agent directly.
"""

from typing import Optional

from pydantic import BaseModel


class SpecializedTextRequest(BaseModel):
    format: str = "other"  # "classical_poem" | "lyrics" | "couplet" | "other"
    theme: str = ""
    style: Optional[str] = None
    length: str = "medium"  # "short" | "medium" | "long"
    rhyme_scheme: Optional[str] = None


class SpecializedTextResult(BaseModel):
    content: str
    format: str = "other"
