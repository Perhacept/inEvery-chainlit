from __future__ import annotations

import html
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from chainlit.auth import get_current_user
from chainlit.config import config
from chainlit.data import get_data_layer
from chainlit.utils import utc_now


WORKFLOW_EDITOR_ROUTE = "/workflow-editor"
WORKFLOW_SAVE_ROUTE = "/api/save-workflow"
WORKFLOW_EDITOR_DIST_DIR = (
    Path(__file__).resolve().parents[3] / "inEvery-reactflow" / "dist"
)


def register_workflow_routes(app: FastAPI, router: APIRouter) -> None:
    """Expose the workflow editor and the workflow save endpoint."""

    if _workflow_editor_is_available():
        app.mount(
            _with_root_path(WORKFLOW_EDITOR_ROUTE),
            StaticFiles(directory=WORKFLOW_EDITOR_DIST_DIR, html=True),
            name="workflow-editor",
        )
    else:
        _register_workflow_fallback(router)

    _register_workflow_save_route(router)


def _register_workflow_fallback(router: APIRouter) -> None:
    @router.get(WORKFLOW_EDITOR_ROUTE)
    @router.get(f"{WORKFLOW_EDITOR_ROUTE}/{{full_path:path}}")
    async def workflow_editor_unavailable(full_path: str = "") -> HTMLResponse:
        del full_path
        message = (
            "<!doctype html><html lang='en'><head><meta charset='utf-8'/>"
            "<meta name='viewport' content='width=device-width, initial-scale=1'/>"
            "<title>Workflow editor unavailable</title>"
            "<style>body{font-family:system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#0f172a;color:#e2e8f0;padding:24px}"
            "main{max-width:640px;border:1px solid #334155;border-radius:12px;background:#111827;padding:24px}"
            "code{background:#1e293b;padding:2px 6px;border-radius:6px}</style></head>"
            "<body><main><h1>Workflow editor is not built</h1>"
            f"<p>The static editor bundle was not found at <code>{html.escape(str(WORKFLOW_EDITOR_DIST_DIR))}</code>.</p>"
            "<p>Build <code>inEvery-reactflow</code> and retry, or open the workspace workflow tab from a machine that has the editor bundle.</p>"
            "</main></body></html>"
        )
        return HTMLResponse(content=message, status_code=200)


def _register_workflow_save_route(router: APIRouter) -> None:
    @router.post(WORKFLOW_SAVE_ROUTE)
    async def save_workflow(
        request: Request,
        current_user=Depends(get_current_user),
    ) -> JSONResponse:
        if not current_user:
            raise HTTPException(status_code=401, detail="Unauthorized")

        data_layer = get_data_layer()
        if not data_layer or not hasattr(data_layer, "get_project"):
            raise HTTPException(
                status_code=400,
                detail="Project persistence is not enabled",
            )
        if not hasattr(data_layer, "update_project"):
            raise HTTPException(
                status_code=400,
                detail="Project persistence is not enabled",
            )

        payload = await request.json()
        if not isinstance(payload, dict):
            raise HTTPException(
                status_code=400,
                detail="Workflow payload must be an object",
            )

        project_id = str(
            payload.get("projectId") or payload.get("project_id") or ""
        ).strip()
        if not project_id:
            raise HTTPException(status_code=400, detail="projectId is required")

        project = await data_layer.get_project(current_user.identifier, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        workflow_payload = payload.get("workflow")
        if isinstance(workflow_payload, dict):
            nodes = workflow_payload.get("nodes")
            edges = workflow_payload.get("edges")
            metadata = workflow_payload.get("metadata")
        else:
            nodes = payload.get("nodes")
            edges = payload.get("edges")
            metadata = payload.get("metadata")

        if nodes is None:
            nodes = []
        if edges is None:
            edges = []
        if not isinstance(nodes, list):
            raise HTTPException(status_code=400, detail="workflow.nodes must be an array")
        if not isinstance(edges, list):
            raise HTTPException(status_code=400, detail="workflow.edges must be an array")

        workflow_record: dict[str, Any] = {
            "version": 1,
            "nodes": nodes,
            "edges": edges,
            "updatedAt": utc_now(),
        }
        if isinstance(metadata, dict):
            workflow_record["metadata"] = metadata

        updated_project = await data_layer.update_project(
            current_user.identifier,
            project_id,
            config={"workflow": workflow_record},
        )
        if not updated_project:
            raise HTTPException(status_code=404, detail="Project not found")

        return JSONResponse(
            content={
                "success": True,
                "projectId": project_id,
                "workflow": workflow_record,
                "project": {
                    "id": updated_project.get("id"),
                    "name": updated_project.get("name"),
                    "scene": updated_project.get("scene") or "code",
                    "updatedAt": updated_project.get("updatedAt"),
                    "config": updated_project.get("config")
                    if isinstance(updated_project.get("config"), dict)
                    else {},
                },
            }
        )


def _workflow_editor_is_available() -> bool:
    return WORKFLOW_EDITOR_DIST_DIR.is_dir() and (
        WORKFLOW_EDITOR_DIST_DIR / "index.html"
    ).is_file()


def _with_root_path(path: str) -> str:
    root_path = config.run.root_path.rstrip("/")
    if not path.startswith("/"):
        path = f"/{path}"
    if not root_path:
        return path
    return f"{root_path}{path}"
