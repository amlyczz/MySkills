"""Claude Code CLI as a LangChain BaseChatModel.

Wraps ``claude -p`` (headless mode) so it can be used anywhere a LangChain
ChatModel is expected.  Claude Code itself is an agent that can Glob/Grep/Read
code — no need to pre-fetch files.
"""

import json
import logging
import os
import subprocess
from typing import Any, Callable, Iterator, List, Optional

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage, HumanMessage, SystemMessage
from langchain_core.outputs import ChatGeneration, ChatResult

logger = logging.getLogger(__name__)


class ClaudeCodeChatModel(BaseChatModel):
    """LangChain ChatModel backed by the Claude Code CLI.

    Each ``_generate`` call spawns a ``claude -p`` process.  Claude Code acts
    as an autonomous agent: it can glob, grep and read files on its own, so
    callers do not need to pre-fetch source code.

    Attributes:
        model_name: Model identifier (passed through to CLI).
        allowed_tools: Tools Claude Code may use.
        effort: Reasoning effort level (low / medium / high / max).
        dangerously_skip_permissions: Skip interactive permission prompts.
        timeout: Max seconds per CLI call.
        extra_args: Additional CLI arguments appended verbatim.
    """

    model_name: str = "claude"
    allowed_tools: List[str] = ["Read", "Glob", "Grep", "Bash(gh:*)"]
    effort: str = "high"
    dangerously_skip_permissions: bool = True
    timeout: int = 600  # 10 minutes
    extra_args: List[str] = []
    on_progress: Optional[Callable[[str], Any]] = None
    json_schema: Optional[dict] = None

    # ── LangChain plumbing ─────────────────────────────────────────────

    @property
    def _llm_type(self) -> str:
        return "claude-code"

    @property
    def _identifying_params(self) -> dict[str, Any]:
        return {
            "model_name": self.model_name,
            "allowed_tools": self.allowed_tools,
            "effort": self.effort,
            "timeout": self.timeout,
            "json_schema": bool(self.json_schema),
        }

    @classmethod
    def from_pydantic(
        cls,
        schema: type,
        **kwargs: Any,
    ) -> "ClaudeCodeChatModel":
        """Create a model constrained to output a specific Pydantic schema."""
        return cls(json_schema=schema.model_json_schema(), **kwargs)

    # ── Message → prompt conversion ────────────────────────────────────

    @staticmethod
    def _messages_to_prompt(messages: List[BaseMessage]) -> str:
        """Flatten a list of LangChain messages into a single prompt string.

        The ``-p`` flag of ``claude`` accepts a single string.  We concatenate
        role-prefixed blocks so the model sees the full conversation context.
        """
        parts: list[str] = []
        for msg in messages:
            if isinstance(msg, SystemMessage):
                parts.append(f"[System]\n{msg.content}")
            elif isinstance(msg, HumanMessage):
                parts.append(f"[User]\n{msg.content}")
            elif isinstance(msg, AIMessage):
                parts.append(f"[Assistant]\n{msg.content}")
            else:
                parts.append(f"[{msg.type}]\n{msg.content}")
        return "\n\n".join(parts)

    # ── Core generation ────────────────────────────────────────────────

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        prompt = self._messages_to_prompt(messages)

        cmd = [
            "claude", "-p", prompt,
            "--output-format", "json",
            "--no-session-persistence",
            "--effort", self.effort,
        ]
        if self.dangerously_skip_permissions:
            cmd.append("--dangerously-skip-permissions")
        if self.json_schema:
            cmd.extend(["--json-schema", json.dumps(self.json_schema, ensure_ascii=False)])
        if self.allowed_tools:
            cmd.extend(["--allowedTools"] + self.allowed_tools)
        cmd.extend(self.extra_args)

        logger.info("[ClaudeCode] starting (timeout=%ds, effort=%s)", self.timeout, self.effort)

        # Unset Claude Code env vars to allow nested invocation
        env = os.environ.copy()
        for key in ["CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"]:
            env.pop(key, None)

        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env,
            )
        except FileNotFoundError:
            raise RuntimeError(
                "Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
            )

        try:
            stdout, stderr = proc.communicate(timeout=self.timeout)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
            raise TimeoutError(f"Claude Code CLI timed out after {self.timeout}s")

        if proc.returncode != 0:
            cmd_str = " ".join(cmd[:6]) + "..."
            raise RuntimeError(
                f"Claude Code CLI exited {proc.returncode}. cmd: {cmd_str}. "
                f"stderr: {stderr[:500] if stderr else '(none)'}"
            )

        output = self._parse_output(stdout)
        # --output-format json wraps in {"type":"result","result":"..."} envelope.
        # When --json-schema is also passed, structured output appears in the
        # "structured_output" top-level field (not inside "result").
        structured = output.get("structured_output")
        if structured is not None:
            content = json.dumps(structured, ensure_ascii=False)
        else:
            content = output.get("result", "") if isinstance(output.get("result"), str) else json.dumps(output, ensure_ascii=False)

        if not content:
            logger.warning("[ClaudeCode] empty result. Full output: %s", json.dumps(output, ensure_ascii=False)[:1000])

        logger.info("[ClaudeCode] finished (%d chars)", len(content))
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=content))])

    # ── Streaming (required by BaseChatModel, but we delegate to _generate) ──

    def _stream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> Iterator[AIMessageChunk]:
        result = self._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
        yield AIMessageChunk(content=result.generations[0].message.content)

    # ── Output parsing ─────────────────────────────────────────────────

    @staticmethod
    def _parse_output(stdout: str) -> dict:
        """Parse the JSON output from ``claude --output-format json``."""
        stdout = stdout.strip()
        if not stdout:
            raise ValueError("Claude Code CLI returned empty output")

        try:
            data = json.loads(stdout)
        except json.JSONDecodeError:
            for line in reversed(stdout.splitlines()):
                line = line.strip()
                if line.startswith("{"):
                    try:
                        data = json.loads(line)
                        break
                    except json.JSONDecodeError:
                        continue
            else:
                raise ValueError(f"Claude Code CLI returned non-JSON output: {stdout[:500]}")

        if isinstance(data, dict) and data.get("type") == "result":
            return data

        return data


# ── Shared JSON parsing utilities ──────────────────────────────────────────

import ast
import json as _json
import re


def _to_json_compatible(obj):
    """Recursively convert Python objects to JSON-serializable dict/list."""
    if isinstance(obj, dict):
        return {str(k): _to_json_compatible(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_to_json_compatible(item) for item in obj]
    elif isinstance(obj, (int, float, str, bool, type(None))):
        return obj
    return str(obj)


def parse_claude_json(raw: str, cwd: str | None = None) -> dict | list:
    """Parse Claude Code output as JSON, with fallbacks for common deviations.

    Tries in order:
    1. Strict JSON
    2. Extract {...} substring as JSON
    3. ast.literal_eval (Python dict syntax) → JSON
    4. Read a JSON file referenced in the output (Claude Code may write to a file)
    """
    import logging
    logger = logging.getLogger(__name__)

    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        end_idx = len(lines)
        for i in range(len(lines) - 1, 0, -1):
            if lines[i].strip() == "```":
                end_idx = i
                break
        raw = "\n".join(lines[1:end_idx])

    # Strategy 1: strict JSON
    try:
        return _json.loads(raw)
    except _json.JSONDecodeError:
        pass

    # Strategy 2: extract {...} substring
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start < 0 or end <= start:
        # No braces found, try array
        start = raw.find("[")
        end = raw.rfind("]") + 1

    snippet = raw[start:end] if start >= 0 and end > start else raw

    try:
        return _json.loads(snippet)
    except _json.JSONDecodeError:
        pass

    # Strategy 3: Python dict syntax (unquoted keys: {segments: [...]})
    try:
        python_obj = ast.literal_eval(snippet)
        return _to_json_compatible(python_obj)
    except Exception:
        pass

    # Strategy 4: Claude Code may have written JSON to a file and returned a summary.
    # Look for .json file references in the output and try to read them.
    import re
    import os

    # Strategy 5: Parse markdown table (Claude sometimes returns tables instead of JSON).
    # Table format: | col1 | col2 | ... |  (with header row and separator row)
    table_pattern = re.compile(r"^\s*\|\s*(.+?)\s*\|\s*$", re.MULTILINE)
    rows = table_pattern.findall(raw)
    if len(rows) >= 3:  # need header + separator + at least one data row
        lines = raw.strip().splitlines()
        header_line = None
        data_lines = []
        in_separator = False
        for line in lines:
            line_stripped = line.strip()
            if not line_stripped.startswith("|"):
                continue
            cols = [c.strip() for c in line_stripped.strip("|").split("|")]
            if not header_line:
                # First table-like row — check if it looks like a header
                if any(re.match(r"^[-:\s]+$", c) for c in cols):
                    continue  # skip separator
                header_line = cols
                continue
            # Check for separator row
            if len(cols) == len(header_line) and all(re.match(r"^[-:\s]+$", c) for c in cols):
                in_separator = True
                continue
            if in_separator or (len(cols) == len(header_line)):
                data_lines.append(cols)

        if header_line and data_lines:
            try:
                result_list: list[dict] = []
                # Detect column mapping from header names
                h = [c.lower() for c in header_line]
                # Common Chinese header aliases
                repo_col = next((i for i, c in enumerate(h) if "仓库" in c or "项目" in c or "repo" in c), 1)
                score_col = next((i for i, c in enumerate(h) if "综合" in c or "得分" in c or "score" in c or "评分" in c), None)
                highlight_col = next((i for i, c in enumerate(h) if "亮点" in c or "原因" in c or "描述" in c), None)

                for cols in data_lines:
                    if len(cols) <= repo_col:
                        continue
                    repo_raw = cols[repo_col].strip()
                    # Strip emoji/prefix like 🥇, 1, 2 ...
                    repo_raw = re.sub(r"^[🥇🥈🥉\d\.\s]+", "", repo_raw).strip()
                    if "/" not in repo_raw:
                        # Try to find a "/" in the cell
                        parts = re.split(r"[/\\]", repo_raw)
                        if len(parts) < 2:
                            continue
                        owner, name = parts[0].strip(), parts[-1].strip()
                    else:
                        owner, name = repo_raw.split("/", 1)
                        owner, name = owner.strip(), name.strip()

                    score = 0
                    if score_col is not None and len(cols) > score_col:
                        score_str = re.sub(r"[^\d]", "", cols[score_col])
                        score = int(score_str) if score_str.isdigit() else 0

                    highlight = cols[highlight_col].strip() if highlight_col is not None and len(cols) > highlight_col else ""

                    # Distribute combined score (max 20 = 4*5) across 4 dimensions
                    # Use a fixed heuristic since table doesn't have per-dimension scores
                    dim_score = max(1, round(score / 4))
                    entry = {
                        "owner": owner,
                        "name": name,
                        "tech_depth": dim_score,
                        "video_friendly": dim_score,
                        "topic_heat": dim_score,
                        "onboarding_exp": dim_score,
                        "one_liner": highlight,
                    }
                    result_list.append(entry)
                if result_list:
                    logger.info("parse_claude_json: extracted %d repos from markdown table", len(result_list))
                    return {"repos": result_list}
            except Exception as table_err:
                logger.warning("parse_claude_json: table parse failed: %s", table_err)
    json_file_matches = re.findall(r'`([^`]+\.json)`', raw)
    if not json_file_matches:
        json_file_matches = re.findall(r'(\S+\.json)', raw)

    search_dirs = [d for d in [cwd, os.getcwd()] if d]
    for fname in json_file_matches:
        for search_dir in search_dirs:
            candidate = os.path.join(search_dir, fname) if not os.path.isabs(fname) else fname
            if os.path.isfile(candidate):
                try:
                    with open(candidate, "r", encoding="utf-8") as f:
                        data = _json.load(f)
                    logger.info("parse_claude_json: loaded JSON from file %s", candidate)
                    return data
                except Exception:
                    continue

    logger.error("parse_claude_json: all strategies failed. Raw (first 400 chars): %s", raw[:400])
    raise ValueError(f"Could not parse Claude Code JSON: {raw[:200]}")

