"""Backend coverage for: 'PWA assets still served' and public cook view API."""

import httpx


def test_manifest_webmanifest_served():
    resp = httpx.get("http://localhost:3000/manifest.webmanifest")
    assert resp.status_code == 200, resp.status_code
    body = resp.json()
    assert "Manshok" in body.get("name", ""), body
    assert "Manasa" in body.get("name", "") and "Ashok" in body.get("name", "")
    assert body.get("display") == "standalone", body


def test_icon_and_sw_served():
    icon = httpx.get("http://localhost:3000/icon-512.png")
    assert icon.status_code == 200, icon.status_code
    sw = httpx.get("http://localhost:3000/sw.js")
    assert sw.status_code == 200, sw.status_code


def test_public_cook_today_endpoint_no_auth():
    resp = httpx.get("http://localhost:8001/api/cook/today")
    assert resp.status_code == 200, f"{resp.status_code} {resp.text}"
    body = resp.json()
    assert "entries" in body and isinstance(body["entries"], list)
