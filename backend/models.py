"""
Shared in-memory job store.
Swap `jobs` for a Redis-backed dict for multi-worker / persistent deployments.
"""

from typing import Dict, Any

jobs: Dict[str, Dict[str, Any]] = {}
