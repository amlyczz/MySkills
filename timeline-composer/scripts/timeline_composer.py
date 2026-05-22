#!/usr/bin/env python3
"""
timeline_composer.py — Layer 2: content.json + material_manifest.json → timeline.json v2

Implements voiceover-material matching, chapter division, BGM/SFX orchestration,
and subtitle generation per the video pipeline spec.

Usage:
    python3 timeline_composer.py content.json material_manifest.json \\
        --output timeline.json \\
        --total-duration 180 \\
        --bgm-track bgm_ambient_tech
"""

import json
import re
import sys
import argparse
import os
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from pipeline_contracts import (
    TimelineSegment,
    AudioConfig,
    VoiceoverSegment,
    VoiceoverSplit,
    SfxEntry,
)
from pipeline_contracts.enums import LAYOUTS, TRANSITIONS

# ── seg.type → template mapping (from spec) ─────────────────

SEG_TYPE_LAYOUT = {
    "hook":               {"layout_id": "hero-center",          "motion": {"headline": "bounce-in"}},
    "problem":            {"layout_id": "hero-center",          "motion": {}},
    "solution":           {"layout_id": "split-left-text",      "motion": {}},
    "features":           {"layout_id": "card-grid",            "motion": {"cards": "spring-slide-up"}},
    "showcase":           {"layout_id": "media-full",           "motion": {}},
    "code_showcase":      {"layout_id": "code-display",         "motion": {}},
    "source_highlight":   {"layout_id": "code-display",         "motion": {}},
    "stats_showcase":     {"layout_id": "stat-highlight",       "motion": {}},
    "proof":              {"layout_id": "stat-highlight",       "motion": {"title": "spring-elastic"}},
    "changelog_showcase": {"layout_id": "card-grid",            "motion": {"cards": "spring-slide-up"}},
    "social_proof":       {"layout_id": "quote-style",          "motion": {}},
    "comparison":         {"layout_id": "stat-highlight",       "motion": {}},
    "cta":                {"layout_id": "hero-center",          "motion": {"title": "spring-slide-up"}},
    "manual":             {"layout_id": "media-full",           "motion": {}},
}

# ── Segment type sequence pattern (funnel structure) ────────

FUNNEL_SEQUENCE = [
    "hook", "problem", "solution", "showcase",
    "code_showcase", "features", "stats_showcase", "cta",
]


class Utterance(BaseModel):
    """A single voiceover utterance unit."""
    text: str
    duration_est: float
    seg_idx: int            # which content.json.script.segments[] index
    keywords: list[str] = Field(default_factory=list)
    matched_material: Optional[str] = None


class TimelineComposer:
    """Compose a timeline.json v2 from content.json + material_manifest.json.

    Usage:
        composer = TimelineComposer(content_data, material_data)
        timeline = composer.compose(total_duration=180, bgm_track="bgm_ambient_tech")
        with open("timeline.json", "w") as f:
            json.dump(timeline, f, indent=2)
    """

    def __init__(self, content: dict, materials: dict):
        self.content = content
        self.materials = materials

    # ── Public API ───────────────────────────────────────────

    def compose(self, total_duration: float = 180,
                bgm_track: str = "bgm_ambient_tech",
                bgm_volume: float = 0.2,
                resolution: tuple[int, int] = (1920, 1080),
                fps: int = 30,
                progress_bar_style: str = "labeled-bar") -> dict:
        """Run the full composition pipeline."""

        repo = self.content.get("repo", {})
        global_cfg = {
            "title": self.content.get("content", {}).get("title", ""),
            "total_duration": total_duration,
            "resolution": list(resolution),
            "fps": fps,
            "bgm_track": bgm_track,
            "bgm_volume": bgm_volume,
            "progress_bar_style": progress_bar_style,
        }

        # Step 1: split voiceover into utterances
        utterances = self._split_voiceover()

        # Step 2: extract keywords per utterance
        utterances = self._extract_keywords(utterances)

        # Step 3: match materials to utterances
        utterances = self._match_materials(utterances)

        # Step 4: merge consecutive same-material utterances → segments
        segments = self._merge_into_segments(utterances, total_duration)

        # Step 5: assign segment types
        segments = self._assign_seg_types(segments)

        # Step 6: build layout + audio
        segments = self._build_layout_and_audio(segments)

        # Step 7: divide chapters
        chapters = self._divide_chapters(segments)

        # Step 8: generate subtitles
        subtitles = self._generate_subtitles(segments)

        return {
            "version": "2",
            "repo": {"full_name": repo.get("full_name", ""), "url": repo.get("url", "")},
            "global": global_cfg,
            "segments": [s.model_dump(exclude_none=True) for s in segments],
            "chapters": [c.model_dump() for c in chapters],
            "subtitles": [s.model_dump() for s in subtitles],
        }

    # ── Step 1: Voiceover splitting ──────────────────────────

    def _split_voiceover(self) -> list[Utterance]:
        """Split script segments into utterance units."""
        utterances = []
        script = self.content.get("script", {})
        segments = script.get("segments", [])

        if not segments:
            full_text = script.get("full_text", "")
            if full_text:
                segments = [{"text": full_text, "duration_est": len(full_text) / 4.0}]

        for seg_idx, seg in enumerate(segments):
            text = seg.get("text", "")
            # Split on punctuation boundaries
            parts = re.split(r"[。！？，；：\n]", text)
            parts = [p.strip() for p in parts if p.strip()]

            # Estimate duration per part (~4 chars/sec for Chinese)
            total_chars = sum(len(p) for p in parts)
            seg_duration = seg.get("duration_est", total_chars / 4.0)

            for part in parts:
                if total_chars > 0:
                    dur = seg_duration * len(part) / total_chars
                else:
                    dur = 1.0
                utterances.append(Utterance(
                    text=part,
                    duration_est=max(0.5, dur),
                    seg_idx=seg_idx,
                ))

        return utterances

    # ── Step 2: Keyword extraction ───────────────────────────

    def _extract_keywords(self, utterances: list[Utterance]) -> list[Utterance]:
        """Extract keywords from each utterance for material matching."""
        content_data = self.content.get("content", {})
        points = content_data.get("points", [])
        domains = content_data.get("domains", "")

        for utt in utterances:
            kw: list[str] = []

            # English terms (2+ uppercase letters — likely API/CLI/MVP terms)
            english_terms = re.findall(r"\b[A-Za-z]{2,}(?:\s*[/+-]\s*[A-Za-z]{2,})*\b", utt.text)
            kw.extend(t.lower() for t in english_terms)

            # Feature keywords from content.points
            for pt in points:
                pt_words = set(re.findall(r"[\u4e00-\u9fff\w]+", pt))
                utt_words = set(re.findall(r"[\u4e00-\u9fff\w]+", utt.text))
                overlap = pt_words & utt_words
                if len(overlap) >= 2:
                    kw.extend(overlap)

            # Domain tags
            if domains:
                domain_parts = re.split(r"[、,]", domains)
                for d in domain_parts:
                    if d.strip() and d.strip() in utt.text:
                        kw.append(d.strip())

            utt.keywords = list(set(kw))

        return utterances

    # ── Step 3: Material matching ────────────────────────────

    def _match_materials(self, utterances: list[Utterance]) -> list[Utterance]:
        """Match each utterance to its best material."""
        materials = self.materials.get("materials", [])
        if not materials:
            return utterances

        for utt in utterances:
            best_score = 0
            best_id = None

            for mat in materials:
                score = self._score_material(utt, mat)
                if score > best_score:
                    best_score = score
                    best_id = mat.get("id")

            # Only assign if score exceeds threshold
            if best_score >= 1:
                utt.matched_material = best_id

        return utterances

    def _score_material(self, utt: Utterance, mat: dict) -> int:
        """Score how well a material matches an utterance. Higher = better match."""
        score = 0
        mat_type = mat.get("type", "")
        source = mat.get("source", {})
        metadata = mat.get("metadata", {})

        # code_snippet: match section heading
        if mat_type == "code_snippet":
            section = source.get("section", "")
            lang = metadata.get("language", "")
            for kw in utt.keywords:
                if kw in section.lower():
                    score += 3
                if lang and kw in lang.lower():
                    score += 2

        # image: match alt_text
        if mat_type == "image":
            alt = metadata.get("alt_text", "").lower()
            for kw in utt.keywords:
                if kw in alt:
                    score += 3

        # scroll_video: match section
        if mat_type == "scroll_video":
            section = source.get("section", "").lower()
            for kw in utt.keywords:
                if kw in section:
                    score += 2

        # screenshot: use highlight_score
        if mat_type == "screenshot":
            hscore = metadata.get("highlight_score", 0) or 0
            score += int(hscore * 2)

        # link_video: match URL keywords
        if mat_type == "link_video":
            url = source.get("url", "").lower()
            for kw in utt.keywords:
                if kw in url:
                    score += 3

        # source_code / doc_page: match module/section names
        if mat_type in ("source_code", "doc_page"):
            module = metadata.get("module", "").lower()
            section = source.get("section", "").lower()
            for kw in utt.keywords:
                if kw in module or kw in section:
                    score += 2

        return score

    # ── Step 4: Merge consecutive utterances ─────────────────

    def _merge_into_segments(self, utterances: list[Utterance],
                             total_duration: float) -> list[TimelineSegment]:
        """Merge consecutive utterances with the same matched material into segments."""
        if not utterances:
            return []

        raw_segments: list[TimelineSegment] = []
        current = self._init_segment(utterances[0])

        for i in range(1, len(utterances)):
            prev = utterances[i - 1]
            curr = utterances[i]

            if (prev.seg_idx == curr.seg_idx
                    and prev.matched_material == curr.matched_material):
                current.voiceover.text += "。" + curr.text
                current.voiceover.duration_est += curr.duration_est
                current.voiceover.splits.append(VoiceoverSplit(
                    text=curr.text,
                    time_offset=current.voiceover.duration_est - curr.duration_est,
                ))
                current.duration += curr.duration_est
            else:
                raw_segments.append(current)
                current = self._init_segment(curr)

        raw_segments.append(current)

        raw_total = sum(s.duration for s in raw_segments)
        scale = total_duration / raw_total if raw_total > 0 else 1.0

        time_cursor = 0.0
        for i, seg in enumerate(raw_segments):
            seg.id = f"seg_{i + 1:03d}"
            seg.duration = seg.duration * scale
            seg.time_start = time_cursor
            seg.time_end = time_cursor + seg.duration
            time_cursor = seg.time_end

        return raw_segments

    def _init_segment(self, utt: Utterance) -> TimelineSegment:
        return TimelineSegment(
            duration=utt.duration_est,
            voiceover=VoiceoverSegment(
                text=utt.text,
                duration_est=utt.duration_est,
                splits=[VoiceoverSplit(text=utt.text, time_offset=0.0)],
            ),
            primary_material=utt.matched_material,
            material_refs=[utt.matched_material] if utt.matched_material else [],
        )

    # ── Step 5: Assign segment types ─────────────────────────

    def _assign_seg_types(self, segments: list[TimelineSegment]) -> list[TimelineSegment]:
        """Assign segment types based on position and material presence."""
        n = len(segments)
        for i, seg in enumerate(segments):
            mat_type = self._find_material_type(seg.primary_material) if seg.primary_material else None

            if i == 0:
                seg.type = "hook"
                seg.label = "开篇"
            elif i == n - 1:
                seg.type = "cta"
                seg.label = "结尾"
            elif mat_type == "code_snippet":
                seg.type = "code_showcase"
                seg.label = "代码展示"
            elif mat_type == "source_code":
                seg.type = "source_highlight"
                seg.label = "源码分析"
            elif mat_type == "scroll_video":
                seg.type = "showcase"
                seg.label = "项目浏览"
            elif mat_type == "link_video":
                seg.type = "showcase"
                seg.label = "Demo 演示"
            elif mat_type in ("repo_stats", "changelog"):
                seg.type = "stats_showcase"
                seg.label = "数据亮点"
            elif mat_type == "social_proof":
                seg.type = "social_proof"
                seg.label = "行业认可"
            elif mat_type == "comparison":
                seg.type = "comparison"
                seg.label = "竞品对比"
            elif seg.voiceover.text:
                seg.type = "features"
                seg.label = "核心功能"
            else:
                seg.type = "showcase"
                seg.label = "展示"

        return segments

    def _find_material_type(self, mat_id: str) -> Optional[str]:
        for mat in self.materials.get("materials", []):
            if mat.get("id") == mat_id:
                return mat.get("type")
        return None

    # ── Step 6: Layout + Audio orchestration ─────────────────

    def _build_layout_and_audio(self, segments: list[TimelineSegment]) -> list[TimelineSegment]:
        """Assign layout, motion, and audio configuration per segment."""
        for seg in segments:
            seg_type = seg.type or "showcase"
            map_entry = SEG_TYPE_LAYOUT.get(seg_type, SEG_TYPE_LAYOUT["showcase"])
            seg.layout = LayoutConfig(
                layout_id=map_entry["layout_id"],
                motion_map=map_entry.get("motion", {}),
            )

            if seg_type == "hook":
                seg.audio = AudioConfig(
                    bgm_volume=0.3, bgm_fade_in=0.5,
                    sfx=[SfxEntry(id="whoosh", time=0.2, volume=0.6)],
                )
            elif seg_type == "cta":
                seg.audio = AudioConfig(bgm_volume=0.3, bgm_fade_out=2.0)
            elif seg_type == "code_showcase":
                seg.audio = AudioConfig(
                    bgm_volume=0.2,
                    sfx=[SfxEntry(id="keypress", time=0.1, volume=0.3, repeat_every=0.3)],
                )
            elif seg_type == "features":
                points = self.content.get("content", {}).get("points", [])
                sfx_list = [SfxEntry(id="pop", time=j * 2.5, volume=0.5)
                            for j in range(min(len(points), 5))]
                seg.audio = AudioConfig(bgm_volume=0.25, sfx=sfx_list)
            elif seg_type == "stats_showcase":
                seg.audio = AudioConfig(
                    bgm_volume=0.25,
                    sfx=[SfxEntry(id="impact", time=0.3, volume=0.7)],
                )
            else:
                seg.audio = AudioConfig(bgm_volume=0.25)

        return segments

    # ── Step 7: Chapter division ─────────────────────────────

    def _divide_chapters(self, segments: list[TimelineSegment]) -> list[ChapterMarker]:
        """Create chapter markers from segment boundaries."""
        chapters = []
        for seg in segments:
            if seg.label:
                chapters.append(ChapterMarker(label=seg.label, time=seg.time_start))

        if chapters and chapters[0].time > 0:
            chapters.insert(0, ChapterMarker(label="开始", time=0.0))

        return chapters

    # ── Step 8: Subtitle generation ──────────────────────────

    def _generate_subtitles(self, segments: list[TimelineSegment]) -> list[SubtitleEntry]:
        """Generate subtitle entries from voiceover text (~15 chars per sub)."""
        subtitles = []
        for seg in segments:
            text = seg.voiceover.text
            duration = seg.voiceover.duration_est or len(text) / 4.0
            seg_start = seg.time_start

            chunks = self._split_for_subtitles(text, chunk_size=15)
            if not chunks:
                continue

            chunk_dur = duration / len(chunks)
            for j, chunk in enumerate(chunks):
                subtitles.append(SubtitleEntry(
                    text=chunk,
                    time_start=seg_start + j * chunk_dur,
                    time_end=seg_start + (j + 1) * chunk_dur,
                ))

        return subtitles

    @staticmethod
    def _split_for_subtitles(text: str, chunk_size: int = 15) -> list[str]:
        """Split text into subtitle-friendly chunks without breaking words."""
        chunks = []
        current = ""
        for char in text:
            current += char
            if len(current) >= chunk_size:
                chunks.append(current)
                current = ""
        if current:
            # Merge short trailing chunk into previous
            if len(current) < 5 and chunks:
                chunks[-1] += current
            else:
                chunks.append(current)
        return chunks


# ── to_video_config: timeline → VideoConfig ────────────────

def to_video_config(timeline: dict,
                    style_id: str = "dark-purple",
                    bg_type: str = "starfield",
                    structure_id: str = "timeline-adaptive",
                    existing_config: Optional[dict] = None) -> dict:
    """Convert timeline.json output to VideoConfig format for Remotion VideoComposer.

    Maps each timeline segment to a SceneConfig with layoutId, motionMap,
    content, voiceover splits, material refs, code template, and duration.

    If existing_config is provided (e.g., from Agent's initial decision),
    top-level fields like styleId/bgType/audio.bgm are preserved.
    sceneConfigs and audio.voiceover are always overwritten with
    timeline-derived data (more precise).
    """
    segments = timeline.get("segments", [])
    scene_configs = {}
    voiceover_list = []

    for seg in segments:
        seg_id = seg.get("id", f"seg_{len(scene_configs) + 1:03d}")
        seg_type = seg.get("type", "showcase")
        layout_entry = SEG_TYPE_LAYOUT.get(seg_type, SEG_TYPE_LAYOUT["showcase"])

        content = {}
        vo = seg.get("voiceover", {})
        vo_text = vo.get("text", "")
        vo_dur = vo.get("duration_est", 0)
        if vo_text:
            content["headline"] = vo_text[:60]
            if len(vo_text) > 60:
                content["body"] = vo_text

        mat_ref = seg.get("primary_material")
        if mat_ref:
            content["visual"] = mat_ref

        # ── Transition mapping (timeline → VideoConfig) ──
        tin = _map_transition(seg.get("transition_in", "crossfade"))
        tout = _map_transition(seg.get("transition_out", "crossfade"))

        scene = {
            "layoutId": layout_entry["layout_id"],
            "motionMap": layout_entry.get("motion", {}),
            "content": content,
            "durationSeconds": max(seg.get("duration", 5), 2),
        }

        # Carry code_template if present
        ct = seg.get("code_template")
        if ct:
            scene["content"]["code"] = ct.get("language", "")
            scene["content"]["codeAnimation"] = ct.get("animation", "fade")

        # Carry transition configs
        seg_audio = seg.get("audio", {})
        seg_audio_sfx = seg_audio.get("sfx", [])
        if tin and tin != "none":
            scene["transitionIn"] = {"type": tin, "durationFrames": 15}
        if tout and tout != "none":
            scene["transitionOut"] = {"type": tout, "durationFrames": 15}

        scene_configs[seg_id] = scene

        # ── Build voiceover list from splits ──
        for split in vo.get("splits", []):
            voiceover_list.append({
                "sceneId": seg_id,
                "elementRole": "voiceover",
                "src": "",
                "text": split.get("text", ""),
                "durationSeconds": vo_dur / max(len(vo.get("splits", [])), 1),
                "startOffsetSeconds": split.get("time_offset", 0),
            })

    # ── Build audio config: merge existing bgm with timeline voiceover ──
    existing_audio = (existing_config or {}).get("audio", {})
    audio_config = {
        "sfxEnabled": bool(any(
            seg.get("audio", {}).get("sfx", [])
            for seg in segments
        )),
        "voiceover": voiceover_list,
        "voiceoverEnabled": bool(voiceover_list),
    }
    # Preserve BGM track from Agent's initial decision if not regenerating
    if existing_audio.get("bgm"):
        audio_config["bgm"] = existing_audio["bgm"]
        # Attach pre-computed volume curve so both Remotion and post-producer
        # consume the same curve, eliminating duplicate bgmCurve logic.
        curve = _generate_bgm_curve(segments, timeline.get("global", {}).get("total_duration", 180))
        audio_config["bgm"]["volumeCurve"] = curve

    result = {
        "generated_by": {
            "phase": "phase2",
            "layer": "timeline-composer",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0",
        },
        "structureId": structure_id,
        "styleId": style_id,
        "bgType": bg_type,
        "sceneConfigs": scene_configs,
        "audio": audio_config,
    }

    # Preserve top-level fields from Agent's initial config
    if existing_config:
        result["structureId"] = existing_config.get("structureId", structure_id)
        result["styleId"] = existing_config.get("styleId", style_id)
        result["bgType"] = existing_config.get("bgType", bg_type)

    return result


def _generate_bgm_curve(segments: list[dict],
                        total_duration: float) -> list[dict]:
    """Port of bgmCurve.ts generateBgmCurve() — per-segment BGM volume curve.

    Rules (matching bgmCurve.ts semantics):
      - hook segments: BGM fade in from 0.0 over 1.5s
      - cta segments: BGM fade out to 0.0 over 1.5s
      - segments with voiceover: ducked to min(seg.bgm_volume, 0.15)
      - other segments: seg.bgm_volume (default 0.5)

    Returns list of {time, volume} points sorted by time.
    """
    VOL_NORMAL = 0.5
    VOL_DUCKED = 0.15
    VOL_FADE_START = 0.0
    FADE_SECONDS = 1.5

    points: list[dict] = []

    for seg in segments:
        seg_type = seg.get("type", "showcase")
        audio_cfg = seg.get("audio", {})
        bgm_vol = audio_cfg.get("bgm_volume", VOL_NORMAL)
        t0 = seg.get("time_start", 0)
        t1 = seg.get("time_end", t0 + 5)
        has_vo = bool(seg.get("voiceover", {}).get("text", ""))

        if seg_type == "hook":
            # Fade in
            vol = bgm_vol if not has_vo else min(bgm_vol, VOL_DUCKED)
            points.append({"time": max(0, t0), "volume": VOL_FADE_START})
            points.append({"time": t0 + FADE_SECONDS, "volume": vol})
        elif seg_type == "cta":
            # Fade out
            vol = bgm_vol if not has_vo else min(bgm_vol, VOL_DUCKED)
            points.append({"time": t0, "volume": vol})
            points.append({"time": max(t0, t1 - FADE_SECONDS), "volume": vol * 0.6})
            points.append({"time": t1, "volume": VOL_FADE_START})
        else:
            vol = bgm_vol if not has_vo else min(bgm_vol, VOL_DUCKED)
            points.append({"time": t0, "volume": vol})
            points.append({"time": t1, "volume": vol})

    # Sort by time, dedupe adjacent points within 10ms
    points.sort(key=lambda p: p["time"])
    deduped: list[dict] = []
    for p in points:
        if not deduped or abs(p["time"] - deduped[-1]["time"]) > 0.01:
            deduped.append(p)
    return deduped


def _map_transition(timeline_transition: str) -> str:
    """Map timeline transition enum to VideoConfig transition enum.

    Timeline (old): fade, dissolve, slide-left, slide-right, none
    VideoConfig:    crossfade, whip-pan, slide-in, slide-out, none
    """
    mapping = {
        "fade": "crossfade",
        "dissolve": "crossfade",
        "slide-left": "slide-in",
        "slide-right": "slide-out",
        "none": "none",
        "crossfade": "crossfade",
        "whip-pan": "whip-pan",
        "slide-in": "slide-in",
        "slide-out": "slide-out",
    }
    return mapping.get(timeline_transition, "crossfade")


# ── CLI ─────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Layer 2: Compose timeline.json from content + materials")
    parser.add_argument("content_json", help="Path to content.json (Layer 0 output)")
    parser.add_argument("material_manifest", help="Path to material_manifest.json (Layer 1 output)")
    parser.add_argument("--output", "-o", default="timeline.json", help="Output path (default: timeline.json)")
    parser.add_argument("--total-duration", "-d", type=float, default=180, help="Target total duration in seconds")
    parser.add_argument("--bgm-track", default="bgm_ambient_tech", help="BGM track identifier")
    parser.add_argument("--bgm-volume", type=float, default=0.2, help="Global BGM volume (0-1)")
    parser.add_argument("--progress-bar-style", default="labeled-bar",
                        choices=["minimal-dots", "labeled-bar", "gradient-fill", "segment-blocks", "timeline-ticks"])
    parser.add_argument("--output-video-config", default=None,
                        help="Also output VideoConfig JSON for Remotion VideoComposer render")
    parser.add_argument("--style-id", default="dark-purple",
                        help="Style template ID for VideoConfig (default: dark-purple)")
    parser.add_argument("--bg-type", default="starfield",
                        help="Background type for VideoConfig (default: starfield)")
    args = parser.parse_args()

    # Load inputs
    with open(args.content_json, "r") as f:
        content = json.load(f)
    with open(args.material_manifest, "r") as f:
        materials = json.load(f)

    # Compose
    composer = TimelineComposer(content, materials)
    timeline = composer.compose(
        total_duration=args.total_duration,
        bgm_track=args.bgm_track,
        bgm_volume=args.bgm_volume,
        progress_bar_style=args.progress_bar_style,
    )

    # Write output
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(timeline, f, indent=2, ensure_ascii=False)

    # Write SRT subtitle file
    srt_path = os.path.splitext(args.output)[0] + ".srt"
    _write_srt(timeline["subtitles"], srt_path)

    # Write BGM volume curve for post-producer consumption
    # (eliminates duplicate curve logic in audio_mixer.py and bgmCurve.ts)
    _write_bgm_curve(timeline, args.output)

    # Summary
    n_segs = len(timeline["segments"])
    n_chapters = len(timeline["chapters"])
    n_subs = len(timeline["subtitles"])
    print(f"Timeline composed: {n_segs} segments, {n_chapters} chapters, {n_subs} subtitles")
    print(f"Output: {args.output}")
    print(f"SRT:     {srt_path}")

    # Optional: write VideoConfig for Remotion VideoComposer
    if args.output_video_config:
        # Read existing config (from Agent) to merge, if present
        existing_vc = None
        if os.path.exists(args.output_video_config):
            try:
                with open(args.output_video_config) as f:
                    existing_vc = json.load(f)
            except (json.JSONDecodeError, OSError):
                pass
        vc = to_video_config(timeline, style_id=args.style_id, bg_type=args.bg_type,
                             existing_config=existing_vc)
        with open(args.output_video_config, "w") as f:
            json.dump(vc, f, indent=2, ensure_ascii=False)
        print(f"VideoConfig: {args.output_video_config}")


def _write_srt(subtitles: list[dict], output_path: str) -> None:
    """Convert subtitle entries to standard .srt format and write to disk."""
    if not subtitles:
        print("  (no subtitles to write)")
        return

    def _fmt_srt_time(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int((seconds % 1) * 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    lines = []
    for i, sub in enumerate(subtitles, 1):
        start = sub.get("time_start", 0)
        end = sub.get("time_end", start + 2)
        text = sub.get("text", "")
        lines.append(str(i))
        lines.append(f"{_fmt_srt_time(start)} --> {_fmt_srt_time(end)}")
        lines.append(text)
        lines.append("")  # blank line separator

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def _write_bgm_curve(timeline: dict, timeline_path: str) -> None:
    """Generate and write bgm_volume_curve.json alongside timeline.json.

    Consumed by audio_mixer.py to avoid duplicating curve logic.
    """
    segments = timeline.get("segments", [])
    total_duration = timeline.get("global", {}).get("total_duration", 180)
    curve = _generate_bgm_curve(segments, total_duration)
    if not curve:
        return
    curve_path = os.path.splitext(timeline_path)[0] + ".bgm_curve.json"
    with open(curve_path, "w") as f:
        json.dump(curve, f, indent=2)
    print(f"BGM curve: {curve_path} ({len(curve)} points)")


if __name__ == "__main__":
    main()
