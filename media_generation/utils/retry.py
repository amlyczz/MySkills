"""Async retry with exponential backoff + jitter."""

import asyncio
import random
from typing import TypeVar, Callable, Awaitable, Tuple, Type

T = TypeVar("T")


async def retry_with_backoff(
    fn: Callable[[], Awaitable[T]],
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    backoff_factor: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: Tuple[Type[BaseException], ...] = (Exception,),
) -> T:
    """Call `fn` with exponential backoff on temporary failures.

    Args:
        fn: Async callable to retry.
        max_retries: Maximum number of retry attempts.
        base_delay: Initial delay in seconds.
        max_delay: Cap on per-attempt delay.
        backoff_factor: Multiplier applied to delay after each failure.
        jitter: Whether to add random jitter (±25%) to delay.
        retryable_exceptions: Exception types considered transient.

    Returns:
        The result of `fn()` on success.

    Raises:
        The last exception if all retries are exhausted.
    """
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            return await fn()
        except retryable_exceptions as e:
            last_exception = e
            if attempt < max_retries:
                delay = min(base_delay * (backoff_factor ** attempt), max_delay)
                if jitter:
                    delay *= random.uniform(0.75, 1.25)
                await asyncio.sleep(delay)

    raise last_exception  # type: ignore[misc]
