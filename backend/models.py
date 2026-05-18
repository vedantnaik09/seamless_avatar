"""
Shared in-memory job store.
Swap `jobs` for a Redis-backed dict for multi-worker / persistent deployments.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List

jobs: Dict[str, Dict[str, Any]] = {}


def create_job_record(comfy_url: str | None = None) -> Dict[str, Any]:
	return {
		"status": "queued",
		"progress": 0,
		"total_segments": 0,
		"segments": [],
		"output": None,
		"error": None,
		"logs": [],
		"comfy_url": comfy_url,
	}


def append_job_log(job_id: str, message: str, level: str = "info") -> None:
	job = jobs.get(job_id)
	if not job:
		return

	logs: List[Dict[str, Any]] = job.setdefault("logs", [])
	logs.append(
		{
			"ts": datetime.now(timezone.utc).isoformat(),
			"level": level,
			"message": message,
		}
	)
	if len(logs) > 200:
		del logs[:-200]

