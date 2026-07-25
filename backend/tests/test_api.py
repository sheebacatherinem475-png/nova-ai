import pytest
from io import BytesIO

def test_unauthorized_access(client):
    response = client.get("/api/chat/history")
    assert response.status_code == 401

def test_chat_history_empty(client, db_session):
    client.post("/api/auth/register", json={"email": "chat@example.com", "password": "pass"})
    token = client.post("/api/auth/login", json={"email": "chat@example.com", "password": "pass"}).json()["access_token"]
    
    response = client.get("/api/chat/history", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == []

def test_document_upload(client, db_session):
    client.post("/api/auth/register", json={"email": "doc@example.com", "password": "pass"})
    token = client.post("/api/auth/login", json={"email": "doc@example.com", "password": "pass"}).json()["access_token"]
    
    # Upload a dummy text file
    file_content = b"This is a test document."
    response = client.post(
        "/api/documents/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("test.txt", BytesIO(file_content), "text/plain")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test.txt"
    assert "id" in data
    
    # List documents
    list_res = client.get("/api/documents", headers={"Authorization": f"Bearer {token}"})
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["filename"] == "test.txt"
