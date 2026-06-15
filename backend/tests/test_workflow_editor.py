from types import SimpleNamespace

from fastapi.testclient import TestClient

from chainlit.auth import get_current_user
from chainlit.server import app


class FakeWorkflowDataLayer:
    def __init__(self):
        self.get_project_args = None
        self.update_project_args = None

    async def get_project(self, identifier: str, project_id: str):
        self.get_project_args = (identifier, project_id)
        if identifier != "user-1" or project_id != "project-1":
            return None
        return {
            "id": project_id,
            "name": "Demo Project",
            "scene": "code",
            "config": {},
        }

    async def update_project(self, identifier: str, project_id: str, config=None):
        self.update_project_args = (identifier, project_id, config)
        return {
            "id": project_id,
            "name": "Demo Project",
            "scene": "code",
            "updatedAt": "2026-01-01T00:00:00.000Z",
            "config": config or {},
        }


def test_save_workflow_persists_project_scoped_config(monkeypatch):
    data_layer = FakeWorkflowDataLayer()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        identifier="user-1"
    )
    monkeypatch.setattr("chainlit.workflow_editor.get_data_layer", lambda: data_layer)

    try:
        response = TestClient(app).post(
            "/api/save-workflow",
            json={
                "projectId": "project-1",
                "workflow": {
                    "nodes": [{"id": "node-1", "data": {"label": "Start"}}],
                    "edges": [],
                    "metadata": {"source": "test"},
                },
            },
        )
    finally:
        del app.dependency_overrides[get_current_user]

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["success"] is True
    assert data_layer.get_project_args == ("user-1", "project-1")
    assert data_layer.update_project_args[0:2] == ("user-1", "project-1")
    workflow = data_layer.update_project_args[2]["workflow"]
    assert workflow["version"] == 1
    assert workflow["nodes"][0]["id"] == "node-1"
    assert workflow["edges"] == []
    assert workflow["metadata"] == {"source": "test"}
    assert "updatedAt" in workflow
