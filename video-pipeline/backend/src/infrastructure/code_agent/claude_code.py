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
        }

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
            stdout, _ = proc.communicate(timeout=self.timeout)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
            raise TimeoutError(f"Claude Code CLI timed out after {self.timeout}s")

        if proc.returncode != 0:
            raise RuntimeError(f"Claude Code CLI exited {proc.returncode}")

        output = self._parse_output(stdout)
        content = output.get("result", "")

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

