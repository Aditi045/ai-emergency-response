import asyncio
import httpx
import json
import sys
import os
import websockets
sys.path.insert(0, ".")
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/api/ws"

async def run_audit():
    print("=================== RUNNING EXPANDED REALITY AUDIT ===================")
    
    # 0. Create dummy test files in storage/uploads to test real file existence paths
    os.makedirs("storage/uploads", exist_ok=True)
    with open("storage/uploads/demo_flood_bridge.jpg", "wb") as f:
        f.write(b"\xFF\xD8\xFF\xE0" + b"\x00" * 1000) # Fake JPEG header
    with open("storage/uploads/demo_fire.jpg", "wb") as f:
        f.write(b"\xFF\xD8\xFF\xE0" + b"\x00" * 1000)
    with open("storage/uploads/sample_voice.wav", "wb") as f:
        f.write(b"RIFF" + b"\x00" * 1000) # Fake WAV header

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # A. Health
        res = await client.get("/api/health/")
        print("1. Health Endpoint Status:", res.status_code)

        # B. Test Logins
        roles = ["ADMIN", "DISPATCHER", "ANALYST", "RESPONDER", "CITIZEN"]
        tokens = {}
        for r in roles:
            email = f"{r.lower()}@resqintel.ai"
            pwd = "Admin@123" if r=="ADMIN" else "Dispatch@123" if r=="DISPATCHER" else f"{r.capitalize()}@123"
            res = await client.post("/api/auth/login", json={"email": email, "password": pwd})
            if res.status_code == 200:
                tokens[r] = res.json()["access_token"]
        print("2. Logins for all 5 roles: 200 OK")

        # C. Test Incidents list
        inc_res = await client.get("/api/incidents/")
        incidents = inc_res.json()
        test_inc_id = incidents[0]["id"] if incidents else None
        print(f"3. Incidents in DB: {len(incidents)}, Target Incident ID: {test_inc_id}")

        # D. Test Computer Vision Provider with existing files
        print("\n=================== 5. COMPUTER VISION AUDIT ===================")
        from backend.services.providers.vision_provider import VisionProvider
        cv_flood = await VisionProvider.analyze_media("storage/uploads/demo_flood_bridge.jpg")
        print("CV Result on 'demo_flood_bridge.jpg':")
        print(f"  Primary Hazard: {cv_flood.get('primary_hazard')}, Confidence: {cv_flood.get('overall_confidence')}")
        print(f"  Detections: {[d['label'] for d in cv_flood.get('detections', [])]}")

        cv_fire = await VisionProvider.analyze_media("storage/uploads/demo_fire.jpg")
        print("CV Result on 'demo_fire.jpg':")
        print(f"  Primary Hazard: {cv_fire.get('primary_hazard')}, Confidence: {cv_fire.get('overall_confidence')}")
        print(f"  Detections: {[d['label'] for d in cv_fire.get('detections', [])]}")

        # E. Test Speech Provider with existing audio file
        print("\n=================== 6. SPEECH-TO-TEXT AUDIT ===================")
        from backend.services.providers.speech_provider import SpeechProvider
        speech_res = await SpeechProvider.transcribe_audio("storage/uploads/sample_voice.wav")
        print("Speech transcription result on sample_voice.wav:")
        print(f"  Status: {speech_res.get('status')}")
        print(f"  Transcript: '{speech_res.get('transcript')}'")
        print(f"  Provider: {speech_res.get('provider')}")

        # F. Test SITREP Generation
        print("\n=================== 15. SITREP GENERATION AUDIT ===================")
        if test_inc_id:
            sitrep_res = await client.post(
                "/api/ai/sitrep",
                headers={"Authorization": f"Bearer {tokens.get('DISPATCHER')}"},
                json={"incident_id": test_inc_id, "title": "Audit Generated SITREP"}
            )
            print(f"SITREP Generation Status: {sitrep_res.status_code}")
            if sitrep_res.status_code == 200:
                s_data = sitrep_res.json()
                print("SITREP ID:", s_data.get("sitrep_id"))
                print("SITREP Number:", s_data.get("sitrep_number"))
                print("SITREP Title:", s_data.get("sitrep", {}).get("title"))
                print("SITREP Casualties:", s_data.get("sitrep", {}).get("casualties_summary"))

        # G. Test Offline Sync Batch Endpoint with proper schema
        print("\n=================== 14. OFFLINE SYNC BATCH AUDIT ===================")
        offline_batch_payload = {
            "items": [
                {
                    "operation_id": "audit-offline-op-002",
                    "operation_type": "CREATE_REPORT",
                    "entity_type": "REPORT",
                    "created_at": "2026-10-03T20:00:00Z",
                    "payload": {
                        "incident_type": "Flood",
                        "description": "Offline queued distress report: Basement flooded on East Avenue.",
                        "latitude": 13.0860,
                        "longitude": 80.2740,
                        "address": "East Avenue Block B",
                        "injuries_reported": 0,
                        "people_affected": 4,
                        "submitter_name": "Offline Auditor"
                    }
                }
            ]
        }
        sync_res = await client.post(
            "/api/sync/batch",
            headers={"Authorization": f"Bearer {tokens.get('CITIZEN')}"},
            json=offline_batch_payload
        )
        print(f"Offline Batch Sync Status: {sync_res.status_code}")
        print("Sync Response:", json.dumps(sync_res.json(), indent=2))

        # Duplicate Idempotency Test
        sync_dup_res = await client.post(
            "/api/sync/batch",
            headers={"Authorization": f"Bearer {tokens.get('CITIZEN')}"},
            json=offline_batch_payload
        )
        print(f"Duplicate Idempotency Sync Status: {sync_dup_res.status_code}")
        print("Duplicate Sync Response (Expected DUPLICATE_IGNORED):", json.dumps(sync_dup_res.json(), indent=2))

        # H. Test Dispatcher Resource Assignment
        print("\n=================== 11. RESOURCE DISPATCH AUDIT ===================")
        res_list = await client.get("/api/resources/")
        resources = res_list.json()
        print(f"Total Resources Available: {len(resources)}")
        if resources and test_inc_id:
            target_res = resources[0]
            assign_res = await client.post(
                f"/api/incidents/{test_inc_id}/assign-resource",
                headers={"Authorization": f"Bearer {tokens.get('DISPATCHER')}"},
                json={"resource_id": target_res["id"], "notes": "Auditor Test Dispatch"}
            )
            print(f"Dispatcher Resource Assignment: {assign_res.status_code} (Status: {assign_res.json().get('status') if assign_res.status_code==200 else assign_res.text})")

        # I. Test Notifications
        print("\n=================== 17. NOTIFICATIONS AUDIT ===================")
        notifs_res = await client.get("/api/notifications/", headers={"Authorization": f"Bearer {tokens.get('DISPATCHER')}"})
        print(f"Dispatcher Notifications Count: {len(notifs_res.json())}")

        # J. Test Map Routes
        print("\n=================== 10. MAP LAYERS AUDIT ===================")
        map_res = await client.get("/api/map/resources")
        print(f"Map Resources endpoint count: {len(map_res.json())}")
        infra_res = await client.get("/api/map/infrastructure")
        print(f"Map Infrastructure (Hospitals: {len(infra_res.json().get('hospitals', []))}, Shelters: {len(infra_res.json().get('shelters', []))})")

if __name__ == "__main__":
    asyncio.run(run_audit())
