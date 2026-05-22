#!/usr/bin/env bash
# ============================================================================
# pipeline.sh — Video Pipeline 全流程编排器
#
# 串联 5 层管线：素材采集 → 时间线编排 → Remotion 渲染 → 后期合成 → 报告
# 上游内容源只需要提供 content.json，即可一键执行。
#
# Usage:
#   ./pipeline.sh <content.json> <total_duration> [options]
#
# Options:
#   --output-dir DIR      输出目录（默认: ./output）
#   --repo-url URL        仓库 URL（提供则自动录制，省略则跳过录制）
#   --extra-urls URLS     额外 Demo URL 列表（空格分隔引号包裹）
#   --manual-image PATH   手动图片路径（可重复）
#   --manual-video PATH   手动视频路径（可重复）
#   --bg-type TYPE        背景类型（starfield/bokeh/geometric/pixel，默认 starfield）
#   --style ID            风格模板 ID（默认 auto）
#   --structure ID        结构模板 ID（默认 auto）
#   --dry-run            只打印要执行的命令，不实际运行
#   --skip-recording      跳过录制阶段
#   --skip-render         跳过 Remotion 渲染阶段
# ============================================================================

set -euo pipefail

# ── 路径常量 ─────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

CONTENT_GENERATOR_DIR="$REPO_ROOT/content-generator"
MATERIAL_COLLECTOR_DIR="$REPO_ROOT/material-collector"
TIMELINE_COMPOSER_DIR="$REPO_ROOT/timeline-composer"
VIDEO_RENDERER_DIR="$REPO_ROOT/video-renderer"
POST_PRODUCER_DIR="$REPO_ROOT/post-producer"

# ── 颜色输出 ─────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ── 参数解析 ─────────────────────────────────────────────────
CONTENT_JSON=""
TOTAL_DURATION=""
OUTPUT_DIR=""
REPO_URL=""
EXTRA_URLS=""
MANUAL_IMAGES=()
MANUAL_VIDEOS=()
BG_TYPE="starfield"
STYLE_ID=""
STRUCTURE_ID=""
DRY_RUN=false
SKIP_RECORDING=false
SKIP_RENDER=false

usage() {
    sed -n '3,20p' "$0"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --output-dir)     OUTPUT_DIR="$2"; shift 2 ;;
        --repo-url)       REPO_URL="$2"; shift 2 ;;
        --extra-urls)     EXTRA_URLS="$2"; shift 2 ;;
        --manual-image)   MANUAL_IMAGES+=("$2"); shift 2 ;;
        --manual-video)   MANUAL_VIDEOS+=("$2"); shift 2 ;;
        --bg-type)        BG_TYPE="$2"; shift 2 ;;
        --style)          STYLE_ID="$2"; shift 2 ;;
        --structure)      STRUCTURE_ID="$2"; shift 2 ;;
        --dry-run)        DRY_RUN=true; shift ;;
        --skip-recording) SKIP_RECORDING=true; shift ;;
        --skip-render)    SKIP_RENDER=true; shift ;;
        -h|--help)        usage ;;
        *)
            if [[ -z "$CONTENT_JSON" ]]; then
                CONTENT_JSON="$1"
            elif [[ -z "$TOTAL_DURATION" ]]; then
                TOTAL_DURATION="$1"
            else
                log_error "Unknown argument: $1"
                usage
            fi
            shift
            ;;
    esac
done

if [[ -z "$CONTENT_JSON" ]]; then
    log_error "Missing content.json path"
    usage
fi
if [[ -z "$TOTAL_DURATION" ]]; then
    log_error "Missing total_duration"
    usage
fi
if [[ -z "$OUTPUT_DIR" ]]; then
    OUTPUT_DIR="${CONTENT_JSON%.json}"
    OUTPUT_DIR="${OUTPUT_DIR%-content}"
    OUTPUT_DIR="$(dirname "$CONTENT_JSON")/output"
fi

# Resolve paths (gracefully handle dry-run with non-existent files)
CONTENT_JSON=$(realpath "$CONTENT_JSON" 2>/dev/null || echo "$CONTENT_JSON")
OUTPUT_DIR=$(realpath -m "$OUTPUT_DIR" 2>/dev/null || echo "$OUTPUT_DIR")

# ── 辅助函数 ─────────────────────────────────────────────────
run_cmd() {
    if $DRY_RUN; then
        echo -e "${YELLOW}[DRY-RUN]${NC} $*"
        return 0
    fi
    log_info "Running: $*"
    local tmpout; tmpout=$(mktemp)
    eval "$@" > "$tmpout" 2>&1; local rc=$?
    cat "$tmpout" | while IFS= read -r line; do echo "  $line"; done
    rm -f "$tmpout"
    return $rc
}

phase_header() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    printf "║  %-54s ║\n" "$1"
    echo "╚══════════════════════════════════════════════════════════╝"
}

# ── 验证 content.json ────────────────────────────────────────
validate_content_json() {
    if [[ ! -f "$CONTENT_JSON" ]]; then
        log_error "content.json not found: $CONTENT_JSON"
        exit 1
    fi

    # 基本 JSON 验证
    if ! python3 -c "import json; json.load(open('$CONTENT_JSON'))" 2>/dev/null; then
        log_error "Invalid JSON in: $CONTENT_JSON"
        exit 1
    fi

    log_ok "content.json: $CONTENT_JSON"
}

# ═══════════════════════════════════════════════════════════════
# Phase 1: 素材采集 (Layer 1 — material-collector)
# ═══════════════════════════════════════════════════════════════
phase_material_collection() {
    phase_header "Phase 1: 素材采集 (Material Collection)"

    mkdir -p "$OUTPUT_DIR"

    local all_args=(
        "$OUTPUT_DIR/material_manifest.json"
        "$TOTAL_DURATION"
        "--output-dir" "$OUTPUT_DIR"
        "--content-dir" "$(dirname "$CONTENT_JSON")"
        "--bg-type" "$BG_TYPE"
    )

    if [[ -n "$REPO_URL" ]]; then
        all_args+=("--repo-url" "$REPO_URL")
    fi
    if [[ -n "$STYLE_ID" ]]; then
        all_args+=("--style" "$STYLE_ID")
    fi
    if [[ -n "$STRUCTURE_ID" ]]; then
        all_args+=("--structure" "$STRUCTURE_ID")
    fi

    # 手动素材
    if (( ${#MANUAL_IMAGES[@]} > 0 )); then
        for img in "${MANUAL_IMAGES[@]}"; do
            all_args+=("--manual-image" "$img")
        done
    fi
    if (( ${#MANUAL_VIDEOS[@]} > 0 )); then
        for vid in "${MANUAL_VIDEOS[@]}"; do
            all_args+=("--manual-video" "$vid")
        done
    fi

    # Step 1a: 自动录制 (如果提供了 REPO_URL)
    if [[ -n "$REPO_URL" ]] && ! $SKIP_RECORDING; then
        log_info "Starting recorder for: $REPO_URL"
        local recorder_env="REPO_URL='$REPO_URL' TOTAL_DURATION='$TOTAL_DURATION'"
        if [[ -n "$EXTRA_URLS" ]]; then
            recorder_env="$recorder_env EXTRA_URLS='$EXTRA_URLS'"
        fi
        if ! run_cmd "cd '$MATERIAL_COLLECTOR_DIR/scripts' && $recorder_env node recorder.mjs"; then
            log_warn "Recorder failed, continuing with fallback"
        fi

        # 查找 recorder 输出的 manifest
        local recorded_manifest
        recorded_manifest=$(find "$OUTPUT_DIR" -name "material_manifest.json" -o -name "manifest_full.json" 2>/dev/null | head -1)
        if [[ -n "$recorded_manifest" ]]; then
            all_args[0]="$recorded_manifest"
            log_ok "Found recorded manifest: $recorded_manifest"
        else
            log_warn "No recorded manifest found, using empty manifest"
        fi
    fi

    # Step 1b: allocate.py — 素材分配 + 时间分配 + 生成 VideoConfig
    local allocate_script="$MATERIAL_COLLECTOR_DIR/scripts/allocate.py"
    log_info "Running allocate.py..."
    if $DRY_RUN; then
        echo "  python3 $allocate_script ${all_args[*]}"
    else
        python3 "$allocate_script" "${all_args[@]}"
        local rc=$?
        if [[ $rc -ne 0 ]]; then
            log_error "allocate.py failed (exit code: $rc)"
            return 1
        fi
        log_ok "allocate.py completed"
    fi

    return 0
}

# ═══════════════════════════════════════════════════════════════
# Phase 2: 时间线编排 (Layer 2 — timeline-composer)
# ═══════════════════════════════════════════════════════════════
phase_timeline_composition() {
    phase_header "Phase 2: 时间线编排 (Timeline Composition)"

    local manifest="$OUTPUT_DIR/material_manifest.json"
    if [[ ! -f "$manifest" ]]; then
        # Try curated manifest
        manifest="$OUTPUT_DIR/material_manifest_curated.json"
        if [[ ! -f "$manifest" ]]; then
            log_warn "No material manifest found, skipping timeline composition"
            return 1
        fi
    fi

    local composer_script="$TIMELINE_COMPOSER_DIR/scripts/timeline_composer.py"
    local timeline_json="$OUTPUT_DIR/timeline.json"
    local timeline_srt="$OUTPUT_DIR/timeline.srt"
    local video_config_json="$OUTPUT_DIR/video_config.json"

    local composer_args=(
        "$CONTENT_JSON"
        "$manifest"
        "--output" "$timeline_json"
        "--total-duration" "$TOTAL_DURATION"
        "--output-video-config" "$video_config_json"
        "--bg-type" "$BG_TYPE"
    )
    if [[ -n "$STYLE_ID" ]]; then
        composer_args+=("--style-id" "$STYLE_ID")
    fi
    if [[ -n "$STRUCTURE_ID" ]]; then
        composer_args+=("--structure-id" "$STRUCTURE_ID")
    fi

    log_info "Generating timeline and VideoConfig..."
    if $DRY_RUN; then
        echo "  python3 $composer_script ${composer_args[*]}"
    else
        python3 "$composer_script" "${composer_args[@]}"
        local rc=$?
        if [[ $rc -ne 0 ]]; then
            log_error "timeline_composer.py failed (exit code: $rc)"
            return 1
        fi
    fi

    # 验证产出
    if [[ -f "$timeline_json" ]]; then
        log_ok "timeline.json: $timeline_json"
    fi
    if [[ -f "$video_config_json" ]]; then
        log_ok "VideoConfig: $video_config_json"
    fi

    return 0
}

# ═══════════════════════════════════════════════════════════════
# Phase 3: Remotion 渲染 (Layer 3 — video-renderer)
# ═══════════════════════════════════════════════════════════════
phase_remotion_render() {
    phase_header "Phase 3: Remotion 渲染 (Video Rendering)"

    if $SKIP_RENDER; then
        log_info "Skipping render (--skip-render)"
        return 0
    fi

    local video_config="$OUTPUT_DIR/video_config.json"
    if [[ ! -f "$video_config" ]]; then
        log_error "video_config.json not found at $video_config"
        log_error "Did Phase 2 run successfully?"
        return 1
    fi

    local output_video="$OUTPUT_DIR/video.mp4"
    local remotion_dir="$VIDEO_RENDERER_DIR/remotion"

    log_info "Rendering VideoComposer with Remotion..."
    log_info "  Config: $video_config"
    log_info "  Output: $output_video"

    if $DRY_RUN; then
        echo "  cd '$remotion_dir' && npx remotion render VideoComposer '$output_video' --props='$video_config' --codec h264 --crf 18"
    else
        cd "$remotion_dir"
        npx remotion render "VideoComposer" "$output_video" \
            --props="$video_config" \
            --codec h264 \
            --crf 18 \
            2>&1 | while IFS= read -r line; do echo "  $line"; done

        local rc=${PIPESTATUS[0]}
        if [[ $rc -ne 0 ]]; then
            log_error "Remotion render failed (exit code: $rc)"
            return 1
        fi

        cd "$REPO_ROOT"
        log_ok "Rendered video: $output_video"
    fi

    return 0
}

# ═══════════════════════════════════════════════════════════════
# Phase 4: 后期合成 (Layer 4 — post-producer)
# ═══════════════════════════════════════════════════════════════
phase_post_production() {
    phase_header "Phase 4: 后期合成 (Post Production)"

    local video="$OUTPUT_DIR/video.mp4"
    if [[ ! -f "$video" ]]; then
        # Fall back to video_composer.mp4
        video="$OUTPUT_DIR/video_composer.mp4"
        if [[ ! -f "$video" ]]; then
            log_warn "No rendered video found, skipping post-production"
            return 1
        fi
    fi

    # Step 4a: 验证输出
    local verify_script="$POST_PRODUCER_DIR/scripts/verify_output.py"
    log_info "Running verify_output.py..."
    if $DRY_RUN; then
        echo "  python3 '$verify_script' '$OUTPUT_DIR' $TOTAL_DURATION"
    else
        python3 "$verify_script" "$OUTPUT_DIR" "$TOTAL_DURATION" \
            2>&1 | while IFS= read -r line; do echo "  $line"; done
        log_ok "Output verification completed"
    fi

    # Step 4b: 音频混音
    local voiceover="$OUTPUT_DIR/voiceover.mp3"
    local bgm="$OUTPUT_DIR/bgm.mp3"
    local timeline_json="$OUTPUT_DIR/timeline.json"
    local final_output="$OUTPUT_DIR/final.mp4"
    local srt_file="$OUTPUT_DIR/timeline.srt"

    if [[ -f "$voiceover" ]] || [[ -f "$bgm" ]]; then
        local mixer_script="$POST_PRODUCER_DIR/scripts/audio_mixer.py"
        local mixer_args=(
            "$video"
            "$voiceover"
            "$bgm"
            "$timeline_json"
            "--output" "$final_output"
        )
        if [[ -f "$srt_file" ]]; then
            mixer_args+=("--srt" "$srt_file")
        fi

        log_info "Running audio_mixer.py..."
        if $DRY_RUN; then
            echo "  python3 '$mixer_script' ${mixer_args[*]}"
        else
            python3 "$mixer_script" "${mixer_args[@]}" \
                2>&1 | while IFS= read -r line; do echo "  $line"; done
            if [[ -f "$final_output" ]]; then
                log_ok "Final video: $final_output"
            fi
        fi
    else
        # 无音频：直接拷贝为 final.mp4
        log_info "No voiceover or BGM found, using raw video as final output"
        if ! $DRY_RUN && [[ ! -f "$final_output" ]]; then
            cp "$video" "$final_output"
            log_ok "Copied raw video to: $final_output"
        fi

        # 如果有 SRT 但无音频，仍然尝试烧录字幕
        if [[ -f "$srt_file" ]] && ! $DRY_RUN; then
            log_info "Burning subtitles into final video..."
            python3 -c "
import sys; sys.path.insert(0, '$POST_PRODUCER_DIR/scripts')
from audio_mixer import burn_subtitles
burn_subtitles('$final_output', '$srt_file')
" 2>&1 | while IFS= read -r line; do echo "  $line"; done
        fi
    fi

    return 0
}

# ═══════════════════════════════════════════════════════════════
# Phase 5: 报告
# ═══════════════════════════════════════════════════════════════
phase_report() {
    phase_header "Phase 5: 管道执行报告"

    local final_mp4="$OUTPUT_DIR/final.mp4"
    local video_mp4="$OUTPUT_DIR/video.mp4"
    local manifest="$OUTPUT_DIR/material_manifest.json"
    local timeline_json="$OUTPUT_DIR/timeline.json"
    local video_config="$OUTPUT_DIR/video_config.json"

    # 确定最终视频路径
    local target_video=""
    if [[ -f "$final_mp4" ]]; then
        target_video="$final_mp4"
    elif [[ -f "$video_mp4" ]]; then
        target_video="$video_mp4"
    fi

    echo ""
    echo "  ├─ 执行时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "  ├─ 内容来源: $CONTENT_JSON"

    if [[ -f "$manifest" ]]; then
        local material_count
        material_count=$(python3 -c "
import json; m = json.load(open('$manifest'))
assets = []
if isinstance(m, dict):
    assets = m.get('assets', m.get('materials', []))
elif isinstance(m, list):
    assets = m
print(len(assets))
" 2>/dev/null || echo "?")
        echo "  ├─ 素材数量: $material_count"
    fi

    if [[ -f "$target_video" ]]; then
        local duration size
        duration=$(ffprobe -v quiet -print_format json -show_format "$target_video" 2>/dev/null \
            | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"{float(d['format']['duration']):.1f}s\")" 2>/dev/null || echo "?")
        size=$(ls -lh "$target_video" | awk '{print $5}')
        echo "  ├─ 最终视频: $(basename "$target_video")"
        echo "  ├─ 视频时长: $duration"
        echo "  ├─ 文件大小: $size"
    fi

    if [[ -f "$video_config" ]]; then
        local structure_id style_id
        structure_id=$(python3 -c "import json; print(json.load(open('$video_config')).get('structureId','?'))" 2>/dev/null || echo "?")
        style_id=$(python3 -c "import json; print(json.load(open('$video_config')).get('styleId','?'))" 2>/dev/null || echo "?")
        echo "  ├─ 结构模板: $structure_id"
        echo "  ├─ 风格模板: $style_id"
    fi

    echo ""
    echo "  ┌─ 输出目录 ──────────────────────────────────────────"
    echo "  │ $OUTPUT_DIR"
    echo "  └─────────────────────────────────────────────────────"
    echo ""

    # 管线完成状态
    local all_ok=true
    for f in "$manifest" "$timeline_json" "$target_video"; do
        if [[ ! -f "$f" ]]; then
            all_ok=false
            break
        fi
    done
    if $all_ok; then
        log_ok "Video pipeline completed successfully!"
    else
        log_warn "Pipeline completed with some phases skipped or degraded."
    fi
}

# ═══════════════════════════════════════════════════════════════
# 主流程
# ═══════════════════════════════════════════════════════════════
main() {
    echo ""
    echo "  ╔══════════════════════════════════════════════════════╗"
    echo "  ║      Video Pipeline — 一键执行                       ║"
    echo "  ╚══════════════════════════════════════════════════════╝"
    echo ""
    echo "  Content:   $CONTENT_JSON"
    echo "  Duration:  ${TOTAL_DURATION}s"
    echo "  Output:    $OUTPUT_DIR"
    echo "  Repo:      ${REPO_URL:-(none)}"
    echo "  BG:        $BG_TYPE"
    echo "  Dry-run:   $DRY_RUN"
    echo ""

    validate_content_json

    phase_material_collection || log_warn "Phase 1 completed with warnings"
    phase_timeline_composition || log_warn "Phase 2 completed with warnings"
    phase_remotion_render || log_warn "Phase 3 completed with warnings"
    phase_post_production || log_warn "Phase 4 completed with warnings"
    phase_report
}

main "$@"
