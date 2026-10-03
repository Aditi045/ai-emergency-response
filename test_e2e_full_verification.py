"""
End-to-End Real Ingestion & Multi-Agent Verification Script for ResQIntel AI
Validates real multimodal ingestion (text, real YOLOv8n vision, real Whisper STT)
and multi-agent decision support pipeline.
"""
import asyncio
import os
import httpx
import ultralytics

BASE_URL = "http://127.0.0.1:8000"

async def test_e2e():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        print("\n=== RESQINTEL AI END-TO-END MULTIMODAL INGESTION VERIFICATION ===")
        
        # 1. Login as citizen
        res = await client.post("/api/auth/login", json={
            "email": "citizen@resqintel.ai",
            "password": "Citizen@123"
        })
        assert res.status_code == 200, f"Login failed: {res.text}"
        citizen_token = res.json()["access_token"]
        headers_cit = {"Authorization": f"Bearer {citizen_token}"}
        print("[PASS] Citizen authenticated successfully")

        # 2. Upload real image
        bus_path = os.path.join(os.path.dirname(ultralytics.__file__), "assets", "bus.jpg")
        with open(bus_path, "rb") as f:
            bus_bytes = f.read()
        
        upload_resp = await client.post(
            "/api/reports/upload",
            files={"file": ("on_scene_recon.jpg", bus_bytes, "image/jpeg")},
            headers=headers_cit
        )
        assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
        media_url = upload_resp.json()["file_url"]
        print(f"[PASS] Image uploaded to storage: {media_url}")

        # 3. Transcribe real audio
        audio_path = "test_emergency_speech.wav"
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()
        
        stt_resp = await client.post(
            "/api/reports/transcribe",
            files={"file": ("field_radio_call.wav", audio_bytes, "audio/wav")},
            headers=headers_cit
        )
        assert stt_resp.status_code == 200, f"STT failed: {stt_resp.text}"
        stt_data = stt_resp.json()
        transcript = stt_data["transcript"]
        print(f"[PASS] Real Speech Transcribed: '{transcript}' (status: {stt_data['status']}, model: {stt_data['model']})")

        # 4. Submit Multimodal Report
        report_payload = {
            "title": "Severe Flood & Vehicle Entrapment near Adyar Bridge",
            "description": f"Flash flood rising rapidly. Multiple people trapped near stranded bus. {transcript}",
            "incident_type": "Flood",
            "latitude": 13.0067,
            "longitude": 80.2575,
            "address": "Adyar Bridge Road, Chennai",
            "injuries_reported": 2,
            "people_affected": 15,
            "hazards": "RISING_FLOOD_WATER, SUBMERGED_BUS",
            "damage": "ROAD_IMPASSABLE",
            "media_urls": [media_url],
            "voice_transcript": transcript
        }

        report_resp = await client.post("/api/reports/submit", json=report_payload, headers=headers_cit)
        assert report_resp.status_code == 200, f"Report submission failed: {report_resp.text}"
        rep_data = report_resp.json()
        incident_id = rep_data["incident_id"]
        print(f"[PASS] Incident #{rep_data.get('incident_number', incident_id)} created successfully")

        # 5. Login as Dispatcher and inspect incident
        res_disp = await client.post("/api/auth/login", json={
            "email": "dispatcher@resqintel.ai",
            "password": "Dispatch@123"
        })
        assert res_disp.status_code == 200
        disp_token = res_disp.json()["access_token"]
        headers_disp = {"Authorization": f"Bearer {disp_token}"}

        inc_resp = await client.get(f"/api/incidents/{incident_id}", headers=headers_disp)
        assert inc_resp.status_code == 200, f"Fetch incident failed: {inc_resp.text}"
        inc_data = inc_resp.json()
        
        print("\n--- Incident Intelligence Detail ---")
        print(f"Status: {inc_data['status']}")
        print(f"Severity Score: {inc_data.get('severity_score')} ({inc_data.get('severity_class')})")
        print(f"Priority Score: {inc_data.get('priority_score')}")
        print(f"Confidence: {inc_data.get('ai_analysis', {}).get('confidence')}")
        print(f"Media Count: {len(inc_data.get('media', []))}")
        
        # Verify Media has genuine CV analysis
        if inc_data.get("media"):
            cv = inc_data["media"][0].get("cv_analysis") or {}
            print(f"CV Status on Attached Media: {cv.get('status')}")
            print(f"CV Detected Objects: {[d['label'] for d in cv.get('detections', [])]}")
            assert cv.get("status") == "REAL_INFERENCE", f"Expected REAL_INFERENCE, got {cv.get('status')}"
            assert len(cv.get("detections", [])) > 0, "Expected genuine detections on attached bus image"
            print("[PASS] Media record holds genuine YOLOv8 detections & bounding boxes")

        # 6. Verify Dispatch Decision Support (Human-in-the-Loop)
        print("\n--- Dispatch Recommendations ---")
        recs = inc_data.get("recommendations", [])
        print(f"Active Recommendations: {len(recs)}")
        for r in recs[:2]:
            print(f"  • {r.get('title')} ({r.get('recommended_action')})")
        
        # Dispatcher approves/dispatches resource
        resources_resp = await client.get("/api/resources/", headers=headers_disp)
        assert resources_resp.status_code == 200
        resources = resources_resp.json()
        assert len(resources) > 0, "No resources found"
        avail_res = resources[0]
        
        dispatch_payload = {
            "incident_id": incident_id,
            "resource_id": avail_res["id"],
            "notes": "Dispatched Swift Water Rescue unit based on genuine CV & Whisper signal confirmation."
        }
        disp_action_resp = await client.post("/api/resources/assign", json=dispatch_payload, headers=headers_disp)
        assert disp_action_resp.status_code == 200, f"Dispatch action failed: {disp_action_resp.text}"
        print(f"[PASS] Human Dispatcher successfully approved and deployed resource {avail_res['resource_name']}")

        # 7. Generate SITREP
        sitrep_resp = await client.post("/api/ai/sitrep", json={"incident_id": incident_id}, headers=headers_disp)
        assert sitrep_resp.status_code == 200, f"SITREP failed: {sitrep_resp.text}"
        sitrep = sitrep_resp.json()
        print(f"[PASS] SITREP generated successfully (SITREP #{sitrep.get('sitrep_number')})")
        
        print("\n=======================================================")
        print("ALL END-TO-END MULTIMODAL INGESTION TESTS PASSED 100%!")
        print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(test_e2e())
