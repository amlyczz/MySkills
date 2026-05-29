"""Blueprint validation hooks: check time-axis legality and auto-fix common errors."""

import logging
from typing import Any

logger = logging.getLogger(__name__)


class BlueprintValidationError(Exception):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__(f"Blueprint validation failed with {len(errors)} error(s)")


def validate_blueprint(bp: dict[str, Any]) -> list[str]:
    """Validate a frame-based blueprint (after normalize).

    Returns:
        List of error strings (empty if valid).
    """
    errors: list[str] = []

    for scene in bp.get("scenes", []):
        scene_id = scene.get("id", "?")
        dur = scene.get("durationInFrames", 0)

        # Elements animation timeline
        for elem in scene.get("elements", []):
            _validate_element(elem, scene_id, dur, errors)

        # Subtitle tokens
        for token in scene.get("subtitles", {}).get("tokens", []):
            if token.get("toFrame", 0) > dur:
                errors.append(
                    f"[{scene_id}] Subtitle '{token.get('text', '')}' "
                    f"toFrame={token['toFrame']} > scene duration {dur}"
                )

        # SFX triggers
        for trigger in scene.get("sfx", []):
            if trigger.get("atFrame", 0) > dur:
                errors.append(
                    f"[{scene_id}] SFX '{trigger.get('sfx', '')}' "
                    f"atFrame={trigger['atFrame']} > scene duration {dur}"
                )

        # Voiceover
        vo = scene.get("voiceover")
        if vo and vo.get("endFrame") and vo["endFrame"] > dur:
            errors.append(
                f"[{scene_id}] Voiceover endFrame={vo['endFrame']} > scene duration {dur}"
            )

    return errors


def auto_fix_blueprint(bp: dict[str, Any]) -> dict[str, Any]:
    """Auto-fix common blueprint errors by clamping out-of-bounds values."""
    for scene in bp.get("scenes", []):
        dur = scene.get("durationInFrames", 0)
        scene_id = scene.get("id", "?")

        for elem in scene.get("elements", []):
            _fix_element(elem, dur)

        for token in scene.get("subtitles", {}).get("tokens", []):
            if token.get("toFrame", 0) > dur:
                token["toFrame"] = dur
                logger.debug(f"[{scene_id}] Fixed subtitle toFrame clamped to {dur}")

        for trigger in scene.get("sfx", []):
            if trigger.get("atFrame", 0) > dur:
                trigger["atFrame"] = max(0, dur - 1)
                logger.debug(f"[{scene_id}] Fixed sfx atFrame clamped to {trigger['atFrame']}")

        vo = scene.get("voiceover")
        if vo and vo.get("endFrame") and vo["endFrame"] > dur:
            vo["endFrame"] = dur
            logger.debug(f"[{scene_id}] Fixed voiceover endFrame clamped to {dur}")

    return bp


def validate_and_fix(bp: dict[str, Any]) -> dict[str, Any]:
    """Validate, auto-fix, then re-validate. Raises on persistent errors."""
    errors = validate_blueprint(bp)
    if not errors:
        return bp

    logger.warning(f"Blueprint validation found {len(errors)} error(s), auto-fixing...")
    bp = auto_fix_blueprint(bp)

    remaining = validate_blueprint(bp)
    if remaining:
        raise BlueprintValidationError(remaining)

    return bp


def _validate_element(elem: dict, scene_id: str, scene_dur: int, errors: list) -> None:
    anim = elem.get("animation")
    if anim:
        timeline = anim.get("timeline", {})
        in_f = timeline.get("inFrame", 0)
        anim_dur = timeline.get("duration", 0)
        if in_f + anim_dur > scene_dur:
            errors.append(
                f"[{scene_id}] Element '{elem.get('id', '')}' animation ends at "
                f"frame {in_f + anim_dur} > scene duration {scene_dur}"
            )
        loop_delay = anim.get("loopStartDelay", 0)
        if loop_delay and in_f + anim_dur + loop_delay > scene_dur:
            errors.append(
                f"[{scene_id}] Element '{elem.get('id', '')}' loop starts at "
                f"frame {in_f + anim_dur + loop_delay} > scene duration {scene_dur}"
            )

    for child in elem.get("children", []):
        _validate_element(child, scene_id, scene_dur, errors)


def _fix_element(elem: dict, scene_dur: int) -> None:
    anim = elem.get("animation")
    if anim:
        timeline = anim.get("timeline", {})
        in_f = timeline.get("inFrame", 0)
        anim_dur = timeline.get("duration", 0)
        if in_f + anim_dur > scene_dur:
            timeline["duration"] = max(1, scene_dur - in_f)

    for child in elem.get("children", []):
        _fix_element(child, scene_dur)
