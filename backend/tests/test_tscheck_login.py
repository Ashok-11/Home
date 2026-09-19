"""Backend coverage for: 'Login works for both household accounts'."""

import httpx

from .conftest import api_url

ACCOUNTS = [
    ("ashokthulas@gmail.com", "Manshok@1411", "Ashok"),
    ("manasavenky29@gmail.com", "Manshok@1411", "Manasa"),
]


def test_login_succeeds_for_both_accounts():
    for email, password, name in ACCOUNTS:
        resp = httpx.post(api_url("/auth/login"), json={"email": email, "password": password})
        assert resp.status_code == 200, f"{email} login failed: {resp.status_code} {resp.text}"
        body = resp.json()
        assert body["email"] == email
        assert body["name"] == name
        assert "hb_session" in resp.cookies


def test_login_rejects_wrong_password():
    resp = httpx.post(
        api_url("/auth/login"),
        json={"email": "ashokthulas@gmail.com", "password": "wrong-password-xyz"},
    )
    assert resp.status_code == 401, f"expected 401, got {resp.status_code} {resp.text}"
    assert "hb_session" not in resp.cookies
