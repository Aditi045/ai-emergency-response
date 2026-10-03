"""
Verify Real Computer Vision (YOLOv8n) and Speech-to-Text (faster-whisper) APIs
Testing genuine inference, filename independence, pixel dependence, and error handling.
"""
import asyncio
import os
import io
import json
import httpx
from PIL import Image

BASE_URL = "http://127.0.0.1:8000"

async def main():
    results = {}
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        # 1. Health check
        r = await client.get("/api/health/")
        assert r.status_code == 200, f"Health check failed: {r.status_code}"
        print("[PASS] Backend is ONLINE")

        # 2. Login to get token
        login_data = {
            "email": "dispatcher@resqintel.ai",
            "password": "Dispatch@123"
        }
        r = await client.post("/api/auth/login", json=login_data)
        assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("[PASS] Authenticated as Dispatcher")

        # Locate test assets
        import ultralytics
        bus_path = os.path.join(os.path.dirname(ultralytics.__file__), "assets", "bus.jpg")
        assert os.path.exists(bus_path), "bus.jpg not found"
        with open(bus_path, "rb") as f:
            bus_bytes = f.read()

        # Create a plain blank image (no objects)
        blank_img = Image.new("RGB", (300, 300), color=(128, 128, 128))
        blank_buf = io.BytesIO()
        blank_img.save(blank_buf, format="JPEG")
        blank_bytes = blank_buf.getvalue()

        # Locate audio asset
        audio_path = os.path.join("test_emergency_speech.wav")
        assert os.path.exists(audio_path), "test_emergency_speech.wav not found"
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        print("\n--- TEST 1: REAL COMPUTER VISION INFERENCE ---")
        files = {"file": ("bus.jpg", bus_bytes, "image/jpeg")}
        r = await client.post("/api/reports/analyze-media", files=files, headers=headers)
        assert r.status_code == 200, f"CV endpoint failed: {r.status_code} {r.text}"
        cv_res1 = r.json()
        print(f"Status: {cv_res1['status']}")
        print(f"Model: {cv_res1.get('model')}")
        print(f"Detections count: {len(cv_res1.get('detections', []))}")
        print(f"Sample detections: {cv_res1.get('detections', [])[:3]}")
        assert cv_res1["status"] == "REAL_INFERENCE", f"Expected REAL_INFERENCE, got {cv_res1['status']}"
        assert len(cv_res1["detections"]) > 0, "Expected at least 1 detection on bus.jpg"
        assert "yolo" in cv_res1["model"].lower(), f"Expected yolo model, got {cv_res1['model']}"
        results["cv_real_inference"] = True
        print("[PASS] Real CV inference succeeded on bus.jpg")

        print("\n--- TEST 2: CV FILENAME INDEPENDENCE ---")
        # Upload exact same bytes with a misleading disaster filename
        files_flood = {"file": ("catastrophic_mega_flood_fire_hazard.jpg", bus_bytes, "image/jpeg")}
        r = await client.post("/api/reports/analyze-media", files=files_flood, headers=headers)
        assert r.status_code == 200
        cv_res_flood = r.json()
        
        # Verify detected classes match the bus image, NOT the filename words
        det1_classes = sorted([d["label"] for d in cv_res1["detections"]])
        det_flood_classes = sorted([d["label"] for d in cv_res_flood["detections"]])
        assert det1_classes == det_flood_classes, "Classes differ despite identical pixels!"
        assert "flood" not in det_flood_classes, "Fabricated 'flood' detected from filename!"
        assert "fire" not in det_flood_classes, "Fabricated 'fire' detected from filename!"
        results["cv_filename_independence"] = True
        print(f"[PASS] Filename independence verified: '{det_flood_classes}' detected regardless of filename")

        print("\n--- TEST 3: CV PIXEL SENSITIVITY (BLANK IMAGE) ---")
        files_blank = {"file": ("emergency_disaster_fire.jpg", blank_bytes, "image/jpeg")}
        r = await client.post("/api/reports/analyze-media", files=files_blank, headers=headers)
        assert r.status_code == 200
        cv_res_blank = r.json()
        print(f"Blank image status: {cv_res_blank['status']}, detections: {cv_res_blank['detections']}")
        assert cv_res_blank["status"] == "REAL_INFERENCE"
        assert len(cv_res_blank["detections"]) == 0, "Expected 0 detections on blank gray image"
        results["cv_pixel_sensitivity"] = True
        print("[PASS] Pixel sensitivity verified: 0 detections on blank image despite 'fire' filename")

        print("\n--- TEST 4: CV CORRUPTED IMAGE ERROR HANDLING ---")
        files_corrupt = {"file": ("corrupt.jpg", b"NOT_A_REAL_IMAGE_DATA", "image/jpeg")}
        r = await client.post("/api/reports/analyze-media", files=files_corrupt, headers=headers)
        assert r.status_code == 200
        cv_res_corrupt = r.json()
        print(f"Corrupted image status: {cv_res_corrupt['status']}, error: {cv_res_corrupt.get('error')}")
        assert cv_res_corrupt["status"] in ["PROCESSING_FAILED", "INFERENCE_FAILED"]
        assert cv_res_corrupt["detections"] == []
        results["cv_corrupt_handling"] = True
        print("[PASS] Corrupted image cleanly returns error status with empty detections")

        print("\n--- TEST 5: REAL SPEECH-TO-TEXT INFERENCE ---")
        files_audio = {"file": ("emergency_dispatch.wav", audio_bytes, "audio/wav")}
        r = await client.post("/api/reports/transcribe", files=files_audio, headers=headers)
        assert r.status_code == 200, f"STT endpoint failed: {r.status_code} {r.text}"
        stt_res1 = r.json()
        print(f"Status: {stt_res1['status']}")
        print(f"Model: {stt_res1.get('model')}")
        print(f"Transcript: '{stt_res1.get('transcript')}'")
        print(f"Segments: {len(stt_res1.get('segments', []))}")
        assert stt_res1["status"] == "REAL_TRANSCRIPTION", f"Expected REAL_TRANSCRIPTION, got {stt_res1['status']}"
        assert "rising" in stt_res1["transcript"].lower() or "flood" in stt_res1["transcript"].lower(), "Expected genuine transcript content"
        results["stt_real_inference"] = True
        print("[PASS] Real Speech-to-Text inference succeeded")

        print("\n--- TEST 6: STT FILENAME INDEPENDENCE ---")
        files_audio_rename = {"file": ("casual_recipe_podcast.wav", audio_bytes, "audio/wav")}
        r = await client.post("/api/reports/transcribe", files=files_audio_rename, headers=headers)
        assert r.status_code == 200
        stt_res_rename = r.json()
        assert stt_res_rename["transcript"] == stt_res1["transcript"], "Transcript changed when filename changed!"
        results["stt_filename_independence"] = True
        print("[PASS] STT filename independence verified: identical transcript returned")

        print("\n--- TEST 7: STT CORRUPTED AUDIO ERROR HANDLING ---")
        files_corrupt_audio = {"file": ("corrupt.wav", b"RIFF....NOT_VALID_AUDIO_DATA", "audio/wav")}
        r = await client.post("/api/reports/transcribe", files=files_corrupt_audio, headers=headers)
        assert r.status_code == 200
        stt_res_corrupt = r.json()
        print(f"Corrupt audio status: {stt_res_corrupt['status']}, error: {stt_res_corrupt.get('error')}")
        assert stt_res_corrupt["status"] == "TRANSCRIPTION_FAILED"
        assert stt_res_corrupt["transcript"] == ""
        results["stt_corrupt_handling"] = True
        print("[PASS] Corrupted audio cleanly returns TRANSCRIPTION_FAILED with empty transcript")

        print("\n--- SUMMARY OF REAL AI VERIFICATION ---")
        for k, v in results.items():
            print(f"  {k}: {'PASS' if v else 'FAIL'}")
        
        assert all(results.values()), "Some tests failed!"
        print("\nALL REAL AI INFERENCE TESTS PASSED 100%!")

if __name__ == "__main__":
    asyncio.run(main())
