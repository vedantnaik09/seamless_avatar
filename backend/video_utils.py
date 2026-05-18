"""
Video utilities for the avatar pipeline.

- extract_last_frame  : pull the very last frame from a clip → JPEG
- trim_segment_start  : drop the first N frames from a clip
- stitch_segments     : concatenate clips with optional xfade crossfade
"""

import logging
import shutil
import subprocess
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)


# ── Last-frame extraction ─────────────────────────────────────────────────────

def extract_last_frame(video_path: str, output_path: str, quality: int = 2) -> None:
    """
    Extract the very last frame of a video to a JPEG file.

    Uses ``-sseof -0.15`` to seek 150 ms before the end of the file — much
    faster than decoding the whole clip with OpenCV.

    Args:
        video_path:  Path to the source .mp4 clip.
        output_path: Destination path for the extracted JPEG.
        quality:     FFmpeg JPEG quality scale (1 = best, 31 = worst).
                     Value 2 is perceptually lossless and avoids ringing
                     artifacts that would compound across segments.
    """
    cmd = [
        "ffmpeg",
        "-sseof", "-0.15",         # seek 150ms before EOF
        "-i", video_path,
        "-update", "1",            # allow overwriting a single-image output
        "-vframes", "1",
        "-q:v", str(quality),
        output_path,
        "-y",
    ]
    _run(cmd, f"extract_last_frame({video_path})")


# ── Segment trimming ──────────────────────────────────────────────────────────

def trim_segment_start(
    video_path: str,
    output_path: str,
    trim_frames: int = 2,
    fps: int = 16,
) -> None:
    """
    Remove the first ``trim_frames`` frames from a clip.

    The first frames of every conditioning-image segment closely mirror the
    start image, which can cause a visible "flash" at the join. Trimming a
    couple of frames smooths this out.

    Args:
        video_path:   Source clip path.
        output_path:  Trimmed clip output path.
        trim_frames:  Number of frames to drop from the start.
        fps:          Frame rate of the clip (used to compute trim duration).
    """
    trim_sec = trim_frames / fps
    cmd = [
        "ffmpeg",
        "-ss", f"{trim_sec:.4f}",  # seek BEFORE -i for fast trim
        "-i", video_path,
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        output_path,
        "-y",
    ]
    _run(cmd, f"trim_segment_start({video_path})")


# ── Segment stitching with crossfade ─────────────────────────────────────────

def stitch_segments(
    segment_paths: List[str],
    output_path: str,
    clip_duration: float,
    xfade_duration: float = 0.5,
) -> None:
    """
    Concatenate multiple video segments with a smooth xfade crossfade at each join.

    Uses FFmpeg's ``xfade`` filter (available since FFmpeg 4.3).

    For a single segment, simply copies the file.

    Args:
        segment_paths:  Ordered list of .mp4 clip paths.
        output_path:    Final output .mp4 path.
        clip_duration:  Duration of each (trimmed) segment in seconds.
        xfade_duration: Duration of each crossfade in seconds.
    """
    n = len(segment_paths)

    if n == 0:
        raise ValueError("No segments to stitch")

    if n == 1:
        shutil.copy(segment_paths[0], output_path)
        logger.info(f"Single segment — copied to {output_path}")
        return

    # Build FFmpeg inputs
    inputs = []
    for p in segment_paths:
        inputs += ["-i", p]

    # Build xfade filter chain
    # offset_i = cumulative duration up to clip i, minus accumulated xfade overlap
    filter_parts = []
    prev_label = "0:v"

    for i in range(1, n):
        # Each xfade "overlaps" xfade_duration seconds, so total duration shrinks
        offset = (clip_duration * i) - (xfade_duration * (i - 1)) - xfade_duration
        offset = max(0.0, offset)
        out_label = f"v{i}"
        filter_parts.append(
            f"[{prev_label}][{i}:v]xfade="
            f"transition=fade:"
            f"duration={xfade_duration:.3f}:"
            f"offset={offset:.3f}"
            f"[{out_label}]"
        )
        prev_label = out_label

    filter_complex = ";".join(filter_parts)

    cmd = [
        "ffmpeg",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", f"[{prev_label}]",
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",   # web-optimised: moov atom at front
        output_path,
        "-y",
    ]
    _run(cmd, "stitch_segments")
    logger.info(f"Stitched {n} segments → {output_path}")


# ── Internal helper ───────────────────────────────────────────────────────────

def _run(cmd: List[str], label: str) -> None:
    """Run a subprocess command, logging output on failure."""
    logger.debug(f"[{label}] {' '.join(cmd)}")
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")
        raise RuntimeError(f"[{label}] FFmpeg failed (rc={result.returncode}):\n{stderr}")
