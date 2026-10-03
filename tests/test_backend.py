import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.agents.nlp_agent import NLPAgent
from backend.agents.severity_agent import SeverityAgent
from backend.agents.duplicate_cluster_agent import DuplicateClusterAgent
from backend.services.providers.routing_provider import RoutingProvider, haversine_distance_km

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/health/")
    assert response.status_code == 200
    data = response.json()
    assert "system_status" in data
    assert "services" in data
    assert "database" in data["services"]

@pytest.mark.asyncio
async def test_auth_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Test Dispatcher login
        resp = await ac.post("/api/auth/login", json={
            "email": "dispatcher@resqintel.ai",
            "password": "Dispatch@123"
        })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "DISPATCHER"

@pytest.mark.asyncio
async def test_incidents_list():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/incidents/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["incident_type"] == "Flood"

@pytest.mark.asyncio
async def test_nlp_agent_classification():
    text = "Severe flash flood overflowing River bridge with 5 people trapped in car."
    res = await NLPAgent.process(text)
    assert res["status"] == "COMPLETED"
    assert res["classification"]["prediction"] == "Flood"
    assert res["classification"]["confidence"] >= 0.8
    assert res["entities"]["people_affected"] == 5

@pytest.mark.asyncio
async def test_severity_agent_calculation():
    sev = await SeverityAgent.process(
        incident_type="Flood",
        injuries=3,
        fatalities=0,
        people_affected=45,
        has_infra_damage=True,
        weather_info={"rainfall_mm": 15.0, "wind_speed_kmh": 25.0},
        report_count=3,
        cv_info={"status": "REAL_INFERENCE", "confidence": 0.94}
    )
    assert sev["severity_score"] >= 7.0
    assert sev["severity_class"] in ["HIGH", "CRITICAL"]
    assert len(sev["contributing_factors"]) >= 4

@pytest.mark.asyncio
async def test_haversine_and_routing():
    # Distance between Chennai Central (13.0827, 80.2707) and Egmore (13.0790, 80.2610)
    dist = haversine_distance_km(13.0827, 80.2707, 13.0790, 80.2610)
    assert 0.5 <= dist <= 2.5
    
    route = await RoutingProvider.get_route(13.0827, 80.2707, 13.0790, 80.2610)
    assert "distance_km" in route
    assert "eta_minutes" in route
    assert route["distance_km"] > 0

@pytest.mark.asyncio
async def test_real_cv_yolo_inference():
    import os
    import ultralytics
    from backend.services.providers.vision_provider import VisionProvider
    
    bus_path = os.path.join(os.path.dirname(ultralytics.__file__), "assets", "bus.jpg")
    assert os.path.exists(bus_path)
    with open(bus_path, "rb") as f:
        img_bytes = f.read()
    
    # Test real inference
    res = await VisionProvider.analyze_media(bus_path)
    assert res["status"] == "REAL_INFERENCE"
    assert "yolo" in res["model"].lower()
    assert res["detected"] is True
    assert len(res["detections"]) > 0
    labels = [d["label"] for d in res["detections"]]
    assert "bus" in labels or "person" in labels
    
    # Test filename independence (give a fake disaster name to identical bytes)
    fake_path = os.path.join("storage", "uploads", "test_massive_volcano_fire.jpg")
    with open(fake_path, "wb") as f:
        f.write(img_bytes)
    res_fake_name = await VisionProvider.analyze_media(fake_path)
    assert res_fake_name["status"] == "REAL_INFERENCE"
    fake_labels = [d["label"] for d in res_fake_name["detections"]]
    assert "volcano" not in fake_labels
    assert "fire" not in fake_labels
    assert fake_labels == labels

@pytest.mark.asyncio
async def test_real_speech_whisper_transcription():
    import os
    from backend.services.providers.speech_provider import SpeechProvider
    
    audio_path = "test_emergency_speech.wav"
    assert os.path.exists(audio_path)
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()
    
    # Test real transcription
    res = await SpeechProvider.transcribe_audio(audio_path)
    assert res["status"] == "REAL_TRANSCRIPTION"
    assert "whisper" in res["model"].lower()
    assert len(res["transcript"]) > 0
    assert "flood" in res["transcript"].lower() or "rising" in res["transcript"].lower()
    
    # Test filename independence
    fake_audio_path = os.path.join("storage", "uploads", "unrelated_cooking_show.wav")
    with open(fake_audio_path, "wb") as f:
        f.write(audio_bytes)
    res_rename = await SpeechProvider.transcribe_audio(fake_audio_path)
    assert res_rename["status"] == "REAL_TRANSCRIPTION"
    assert res_rename["transcript"] == res["transcript"]
