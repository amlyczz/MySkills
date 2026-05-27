"""DAG structure definition and state snapshot computation.

Structure (nodes + edges) is derived from the actual LangGraph definition at runtime.
Presentation metadata (labels, icons, positions) is a lookup table — the only thing we maintain.

State snapshot is computed from a PipelineTask entity (DB-persisted progress).
"""

from typing import Any, Optional
from dataclasses import dataclass


# ── UI Presentation Metadata ──
# The actual graph topology comes from LangGraph (via get_graph_structure()).
# This map only provides visual metadata for each node.
# If a node exists in the graph but not here, it gets sensible defaults.

NODE_META: dict[str, dict[str, Any]] = {
    "github_trending":       {"label": "GitHub Trending",  "icon": "🔥", "type": "source",  "position": {"x": 0,    "y": 0}},
    "github_url":            {"label": "GitHub URL",       "icon": "🔗", "type": "source",  "position": {"x": 0,    "y": 110}},
    "twitter_url":           {"label": "Twitter",          "icon": "🐦", "type": "source",  "position": {"x": 0,    "y": 220}},
    "hitl_trending_review":  {"label": "Trending Review",  "icon": "⏸",  "type": "hitl",    "position": {"x": 160,  "y": 140}},
    "analyze_repo":          {"label": "Repo Analyzer",    "icon": "📊", "type": "process", "position": {"x": 340,  "y": 30}},
    "analyze_twitter":       {"label": "Twitter Analyzer", "icon": "📋", "type": "process", "position": {"x": 340,  "y": 210}},
    "compose_script":        {"label": "Script Composer",  "icon": "✍️", "type": "process", "position": {"x": 560,  "y": 120}},
    "hitl_script_review":    {"label": "Script Review",    "icon": "⏸",  "type": "hitl",    "position": {"x": 730,  "y": 120}},
    "generate_diagrams":     {"label": "Diagrams",         "icon": "📐", "type": "process", "position": {"x": 890,  "y": 120}},
    "generate_blueprint":    {"label": "Blueprint",        "icon": "🎨", "type": "process", "position": {"x": 1060, "y": 120}},
    "hitl_blueprint_review": {"label": "Blueprint Review", "icon": "⏸",  "type": "hitl",    "position": {"x": 1230, "y": 120}},
    "audio_design":          {"label": "Audio Design",     "icon": "🎵", "type": "process", "position": {"x": 1390, "y": 120}},
    "render_compose":        {"label": "Render & Export",  "icon": "🎬", "type": "process", "position": {"x": 1560, "y": 120}},
}

# Layout for nodes not in NODE_META (auto-assigned positions)
_AUTO_LAYOUT_X = 0
_AUTO_LAYOUT_Y_STEP = 100

# Edge routing for highlighting active paths
SOURCE_BRANCH_NODES: dict[str, set[str]] = {
    "github_trending": {"github_trending", "hitl_trending_review"},
    "github_url":      {"github_url"},
    "twitter":         {"twitter_url", "analyze_twitter"},
}

CORE_NODES = {
    "compose_script", "hitl_script_review",
    "generate_diagrams", "generate_blueprint", "hitl_blueprint_review",
    "audio_design", "render_compose",
}

# ── Cached graph structure ──
_cached_structure: dict | None = None


def get_graph_structure() -> dict:
    """Extract node IDs and edge tuples from a lightweight LangGraph StateGraph.

    Builds the same graph topology as compile_workflow() but with no-op nodes,
    compiles it, and returns {nodes: [str], edges: [(src, tgt)]}.
    Result is cached for the process lifetime.
    """
    global _cached_structure
    if _cached_structure is not None:
        return _cached_structure

    try:
        from langgraph.graph import StateGraph, END

        wf = StateGraph(dict)

        # Mirror the exact same nodes as compile_workflow() in graph.py
        wf.add_node("github_trending", lambda s: s)
        wf.add_node("hitl_trending_review", lambda s: s)
        wf.add_node("analyze_repo", lambda s: s)
        wf.add_node("analyze_twitter", lambda s: s)
        wf.add_node("compose_script", lambda s: s)
        wf.add_node("hitl_script_review", lambda s: s)
        wf.add_node("generate_diagrams", lambda s: s)
        wf.add_node("generate_blueprint", lambda s: s)
        wf.add_node("hitl_blueprint_review", lambda s: s)
        wf.add_node("audio_design", lambda s: s)
        wf.add_node("render_compose", lambda s: s)

        # Mirror the exact same edges
        wf.set_entry_point("github_trending")
        wf.add_edge("github_trending", "hitl_trending_review")
        wf.add_edge("github_trending", "analyze_repo")
        wf.add_edge("hitl_trending_review", "analyze_repo")
        wf.add_edge("analyze_repo", "compose_script")
        wf.add_edge("analyze_twitter", "compose_script")
        wf.add_edge("compose_script", "hitl_script_review")
        wf.add_edge("hitl_script_review", "generate_diagrams")
        wf.add_edge("generate_diagrams", "generate_blueprint")
        wf.add_edge("generate_blueprint", "hitl_blueprint_review")
        wf.add_edge("hitl_blueprint_review", "audio_design")
        wf.add_edge("audio_design", "render_compose")
        wf.add_edge("render_compose", END)

        compiled = wf.compile()
        drawable = compiled.get_graph()

        _cached_structure = {
            "node_ids": sorted(drawable.nodes),
            "edge_tuples": [(src, tgt) for src, tgt in drawable.edges],
        }
        return _cached_structure
    except Exception:
        # Fallback: hardcoded structure if LangGraph import fails
        _cached_structure = {
            "node_ids": list(NODE_META.keys()),
            "edge_tuples": [
                ("github_trending", "hitl_trending_review"),
                ("github_trending", "analyze_repo"),
                ("github_url", "analyze_repo"),
                ("twitter_url", "analyze_twitter"),
                ("hitl_trending_review", "analyze_repo"),
                ("analyze_repo", "compose_script"),
                ("analyze_twitter", "compose_script"),
                ("compose_script", "hitl_script_review"),
                ("hitl_script_review", "generate_diagrams"),
                ("generate_diagrams", "generate_blueprint"),
                ("generate_blueprint", "hitl_blueprint_review"),
                ("hitl_blueprint_review", "audio_design"),
                ("audio_design", "render_compose"),
            ],
        }
        return _cached_structure


def _detect_source_type(repo_url: str) -> str:
    if repo_url == "trending":
        return "github_trending"
    if repo_url and ("twitter.com" in repo_url or "x.com" in repo_url):
        return "twitter"
    return "github_url"


def _compute_active_path_nodes(
    source_type: str,
    completed_nodes: set[str],
    current_node: Optional[str],
) -> set[str]:
    active = set(SOURCE_BRANCH_NODES.get(source_type, {"github_url"}))

    if completed_nodes & {"analyze_repo", "analyze_twitter"} or \
       current_node in {"analyze_repo", "analyze_twitter"}:
        active.add("analyze_repo")
        active.add("analyze_twitter")
        active.update(CORE_NODES)

    if source_type == "github_trending" and "hitl_trending_review" in completed_nodes:
        active.add("analyze_repo")
        if completed_nodes & {"analyze_repo", "analyze_twitter"} or \
           current_node in {"analyze_repo", "analyze_twitter"}:
            active.update(CORE_NODES)

    return active


def compute_dag_snapshot(task: Optional[Any] = None) -> dict:
    """Compute the full DAG snapshot: structure from LangGraph, state from task entity.

    Args:
        task: PipelineTask entity, or None for idle/all-idle snapshot.
    """
    from .entities import PipelineTask

    structure = get_graph_structure()
    node_ids = structure["node_ids"]
    edge_tuples = structure["edge_tuples"]

    # Merge orphaned source nodes (github_url, twitter_url) not in graph but needed for UI
    for nid in ("github_url", "twitter_url"):
        if nid not in node_ids:
            node_ids.append(nid)

    # Build edges with IDs
    edges = []
    for i, (src, tgt) in enumerate(edge_tuples):
        edges.append({"id": f"e-{src}-{tgt}", "source": src, "target": tgt})

    if task is None:
        nodes = []
        for i, nid in enumerate(node_ids):
            meta = NODE_META.get(nid, {})
            pos = meta.get("position", {"x": _AUTO_LAYOUT_X, "y": i * _AUTO_LAYOUT_Y_STEP})
            nodes.append({
                "id": nid,
                "label": meta.get("label", nid),
                "icon": meta.get("icon", ""),
                "type": meta.get("type", "process"),
                "position": pos,
                "state": "idle",
                "status_label": "IDLE",
            })
        return {
            "nodes": nodes,
            "edges": edges,
            "active_path_nodes": [],
            "pipeline_status": "pending",
            "source_type": "github_url",
        }

    completed = set(task.completed_nodes or []) if isinstance(task, PipelineTask) else set()
    source_type = _detect_source_type(getattr(task, "repo_url", ""))
    current = getattr(task, "current_node", None)
    failed = getattr(task, "failed_node", None)
    status = getattr(task.status, "value", "pending") if hasattr(task.status, "value") else "pending"

    hitl_statuses = {"hitl_trending", "hitl_script_review", "hitl_blueprint_review"}
    is_hitl = status in hitl_statuses

    nodes = []
    for i, nid in enumerate(node_ids):
        meta = NODE_META.get(nid, {})
        pos = meta.get("position", {"x": _AUTO_LAYOUT_X, "y": i * _AUTO_LAYOUT_Y_STEP})
        ntype = meta.get("type", "process")

        if nid in completed:
            state = "completed"
            status_label = "DONE"
        elif nid == failed:
            state = "error"
            status_label = "FAILED"
        elif nid == current:
            if ntype == "hitl" and is_hitl:
                state = "hitl"
                status_label = "WAITING"
            else:
                state = "active"
                status_label = "FETCHING" if ntype == "source" else "RUNNING"
        else:
            state = "idle"
            status_label = "IDLE"

        nodes.append({
            "id": nid,
            "label": meta.get("label", nid),
            "icon": meta.get("icon", ""),
            "type": ntype,
            "position": pos,
            "state": state,
            "status_label": status_label,
        })

    active_path_nodes = sorted(_compute_active_path_nodes(source_type, completed, current))

    return {
        "nodes": nodes,
        "edges": edges,
        "active_path_nodes": active_path_nodes,
        "pipeline_status": status,
        "source_type": source_type,
    }
