"""Blueprint v2 normalize: convert seconds-based JSON to frames-based JSON for Remotion.

LLM generates seconds (durationSec, startSec, inSec, fromSec, atSec, ...).
This module converts all time fields to frame equivalents that Remotion consumes.
It also auto-calculates scene startFrame from sequential duration + transition overlap.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

FPS = 30


def _sec_to_frames(sec: float) -> int:
    """Convert seconds to frames, rounding to nearest int."""
    return max(0, round(sec * FPS))


def normalize_blueprint(bp: dict[str, Any], fps: int = FPS) -> dict[str, Any]:
    """Convert v2 seconds-based blueprint to Remotion-consumable frame-based JSON.

    Operations (in order):
    1. Convert all xxxSec fields to xxxFrame / xxxInFrames
    2. Auto-calculate scene startFrame from sequential durations + transition overlap
    3. Remove all Sec fields (Remotion doesn't need them)

    Args:
        bp: Blueprint dict with v2 second-based fields.
        fps: Frames per second (default 30).

    Returns:
        Blueprint dict with frame-based fields, ready for Remotion.
    """
    bp = _deep_copy(bp)

    for scene in bp.get("scenes", []):
        _normalize_scene(scene, fps)

    # Auto-calculate startFrame for all scenes
    _auto_start_frames(bp, fps)

    return bp


def _deep_copy(obj: Any) -> Any:
    """Simple deep copy for JSON-serializable data."""
    if isinstance(obj, dict):
        return {k: _deep_copy(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_deep_copy(v) for v in obj]
    return obj


def _normalize_scene(scene: dict, fps: int) -> None:
    """Convert all time fields in a scene from seconds to frames."""
    # Scene duration
    dur_sec = scene.pop("durationSec", None)
    if dur_sec is not None:
        scene["durationInFrames"] = _sec_to_frames(dur_sec)
    elif "durationInFrames" not in scene:
        scene["durationInFrames"] = _sec_to_frames(3.0)

    # startSec → startFrame (will be overwritten by auto-calc if not specified)
    start_sec = scene.pop("startSec", None)
    if start_sec is not None:
        scene["startFrame"] = _sec_to_frames(start_sec)

    # Transition
    t = scene.get("transitionToNext")
    if t:
        t_dur_sec = t.pop("durationSec", None)
        if t_dur_sec is not None:
            t["durationInFrames"] = _sec_to_frames(t_dur_sec)
        elif "durationInFrames" not in t:
            t["durationInFrames"] = _sec_to_frames(0.5)

    # Voiceover
    vo = scene.get("voiceover")
    if vo:
        _normalize_voiceover(vo, fps)

    # Subtitles
    subs = scene.get("subtitles")
    if subs and subs.get("tokens"):
        for token in subs["tokens"]:
            _normalize_subtitle_token(token, fps)

    # SFX
    for trigger in scene.get("sfx", []):
        _normalize_sfx_trigger(trigger, fps)

    # Elements (recursive)
    for elem in scene.get("elements", []):
        _normalize_element(elem, fps)


def _normalize_voiceover(vo: dict, fps: int) -> None:
    start_sec = vo.pop("startSec", None)
    if start_sec is not None:
        vo["startFrame"] = _sec_to_frames(start_sec)

    end_sec = vo.pop("endSec", None)
    if end_sec is not None:
        vo["endFrame"] = _sec_to_frames(end_sec)


def _normalize_subtitle_token(token: dict, fps: int) -> None:
    from_sec = token.pop("fromSec", None)
    if from_sec is not None:
        token["fromFrame"] = _sec_to_frames(from_sec)

    to_sec = token.pop("toSec", None)
    if to_sec is not None:
        token["toFrame"] = _sec_to_frames(to_sec)


def _normalize_sfx_trigger(trigger: dict, fps: int) -> None:
    at_sec = trigger.pop("atSec", None)
    if at_sec is not None:
        trigger["atFrame"] = _sec_to_frames(at_sec)


def _normalize_element(elem: dict, fps: int) -> None:
    """Recursively normalize element animation timelines."""
    anim = elem.get("animation")
    if anim:
        timeline = anim.get("timeline")
        if timeline:
            in_sec = timeline.pop("inSec", None)
            if in_sec is not None:
                timeline["inFrame"] = _sec_to_frames(in_sec)

            dur_sec = timeline.pop("durationSec", None)
            if dur_sec is not None:
                timeline["duration"] = _sec_to_frames(dur_sec)

            out_sec = timeline.pop("outSec", None)
            if out_sec is not None:
                timeline["outFrame"] = _sec_to_frames(out_sec)

        # loopStartDelaySec → loopStartDelay
        delay_sec = anim.pop("loopStartDelaySec", None)
        if delay_sec is not None:
            anim["loopStartDelay"] = _sec_to_frames(delay_sec)

    for child in elem.get("children", []):
        _normalize_element(child, fps)


def _auto_start_frames(bp: dict, fps: int) -> None:
    """Auto-calculate startFrame for scenes that don't have one."""
    scenes = bp.get("scenes", [])
    offset = 0
    for i, scene in enumerate(scenes):
        if "startFrame" not in scene:
            scene["startFrame"] = offset
        else:
            # If startFrame was already set (from startSec), use it but adjust offset
            offset = scene["startFrame"]

        offset += scene["durationInFrames"]
        t = scene.get("transitionToNext")
        if t and t.get("type", "none") != "none" and i < len(scenes) - 1:
            offset -= t.get("durationInFrames", _sec_to_frames(0.5))
