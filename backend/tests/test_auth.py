import pytest

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "Service is running"}

def test_register_user(client, db_session):
    response = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "testpassword123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data

def test_register_duplicate_user(client, db_session):
    client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "testpassword123"}
    )
    response = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "newpassword456"}
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

def test_login_user(client, db_session):
    client.post(
        "/api/auth/register",
        json={"email": "test2@example.com", "password": "testpassword123"}
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "testpassword123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_get_me(client, db_session):
    client.post(
        "/api/auth/register",
        json={"email": "test3@example.com", "password": "testpassword123"}
    )
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test3@example.com", "password": "testpassword123"}
    )
    token = login_response.json()["access_token"]
    
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "test3@example.com"
