"""
utils — 通用工具函数，消除 pipeline 各层的重复实现。
"""

import subprocess
import json


def probe_media(path: str) -> dict:
    """使用 ffprobe 探测媒体文件，返回 format + streams 信息。"""
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_format", "-show_streams", path],
        capture_output=True, text=True, check=True,
    )
    return json.loads(result.stdout)


def get_duration(path: str) -> float:
    """获取媒体文件时长（秒）。"""
    info = probe_media(path)
    return float(info.get("format", {}).get("duration", 0))


def get_resolution(path: str) -> tuple[int, int]:
    """获取视频分辨率 (width, height)。"""
    info = probe_media(path)
    for stream in info.get("streams", []):
        if stream.get("codec_type") == "video":
            return (stream["width"], stream["height"])
    return (0, 0)
