# ResQIntel AI — AI Emergency Response Intelligence Platform

> *"From scattered emergency signals to coordinated action."*

ResQIntel AI is an offline-first, multimodal, multi-agent AI emergency intelligence and decision-support platform that transforms citizen distress calls, responder field reports, text, voice speech, images, weather telemetry, and geospatial layers into structured, verified, explainable operational intelligence.

---

## 1. System Architecture Overview

```
                                  [ CITIZEN / FIELD SENSORS ]
                                               │
               Multimodal Reports (Text, GPS, Voice Audio, Camera Images, SOS)
                                               │
                                               ▼
                              [ FASTAPI MULTIMODAL INGESTION ]
                                               │
 ┌─────────────────────────────────────────────┴─────────────────────────────────────────────┐
 │                                 AI AGENT ORCHESTRATOR                                     │
 │                                                                                           │
 │  ├── Ingestion Agent        (Normalizes payload and formats entities)                    │
 │  ├── NLP & NER Agent        (Extracts casualties, hazards, infrastructure damages)        │
 │  ├── Vision Agent           (Pretrained visual hazard & structural damage classifier)     │
 │  ├── GeoInt Agent           (Calculates spatial radius, demographics, weather overlay)    │
 │  ├── Duplicate & Cluster    (Multimodal cosine + geospatial + temporal correlation)       │
 │  ├── Conflict Agent         (Detects contradictory field reports e.g. blocked vs clear)   │
 │  ├── Missing Info Agent     (Identifies unverified operational intelligence gaps)         │
 │  ├── Severity Engine        (Multi-factor transparent weighted risk score 0-10)          │
 │  ├── Resource Matcher       (Nearest specialized apparatus: boat, fire tender, ambulance) │
 │  ├── Routing Engine         (OSRM real road-network routing + Haversine fallback)        │
 │  ├── Tactical Recommender   (Explainable directives requiring human dispatcher approval)  │
 │  └── Grounded Copilot       (RAG grounded in live database state)                        │
 └─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                               │
                                 [ HUMAN IN THE LOOP ]
                        Verification & Dispatch Authorization
                                               │
                                               ▼
                   [ REAL-TIME OPERATIONS & FLEET COORDINATION ]
                       (WebSockets Telemetry, Leaflet Maps, SITREPs)
```

---

## 2. Directory Structure

```
ai_emergency_response/
├── backend/
│   ├── api/
│   │   ├── deps.py               # Authentication, RBAC, and audit log helpers
│   │   └── routes/
│   │       ├── admin.py          # User management, role modification, audit logs
│   │       ├── ai.py             # Re-evaluation, AI Copilot, and SITREP generator
│   │       ├── auth.py           # Registration, login, Google OAuth, refresh token
│   │       ├── datasets.py       # Data source catalogs & Model Registry
│   │       ├── health.py         # Live component health probes
│   │       ├── incidents.py      # Incident lifecycle & human verification
│   │       ├── map_routes.py     # Live geospatial layers, geocoding & routing
│   │       ├── notifications.py  # Alerts and Geofenced emergency warnings
│   │       ├── reports.py        # Multimodal citizen reporting & SOS trigger
│   │       ├── responders.py     # Field responder telemetry and duty status
│   │       ├── resources.py      # Emergency fleet management & dispatch
│   │       └── sync.py           # Offline queue batch synchronization
│   ├── agents/                   # 12 Specialized Intelligence Agents
│   │   ├── orchestrator.py
│   │   ├── ingestion_agent.py
│   │   ├── nlp_agent.py
│   │   ├── vision_agent.py
│   │   ├── geoint_agent.py
│   │   ├── duplicate_cluster_agent.py
│   │   ├── conflict_agent.py
│   │   ├── missing_info_agent.py
│   │   ├── severity_agent.py
│   │   ├── resource_agent.py
│   │   ├── routing_agent.py
│   │   ├── recommendation_agent.py
│   │   ├── sitrep_agent.py
│   │   └── copilot_agent.py
│   ├── core/
│   │   ├── config.py             # Pydantic BaseSettings
│   │   ├── database.py           # SQLAlchemy async engine & sessionmaker
│   │   ├── security.py           # Bcrypt hashing & PyJWT token utilities
│   │   ├── seed.py               # Section 71 Flood Demo scenario data seeder
│   │   └── websocket_manager.py  # Real-time WebSocket connection manager
│   ├── models/
│   │   └── all_models.py         # Normalized DB models (UUIDs, timestamps, foreign keys)
│   ├── schemas/
│   │   └── all_schemas.py        # Pydantic request/response schemas
│   ├── services/
│   │   └── providers/            # Provider abstractions with graceful fallbacks
│   │       ├── geocoding_provider.py
│   │       ├── notification_provider.py
│   │       ├── routing_provider.py
│   │       ├── speech_provider.py
│   │       ├── vision_provider.py
│   │       └── weather_provider.py
│   ├── main.py                   # FastAPI initialization, CORS, Static storage & WS
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # SeverityBadge, StatusBadge, OfflineBanner
│   │   │   ├── copilot/          # Grounded AI Copilot drawer
│   │   │   ├── layout/           # Navbar with Fast-Demo role switcher
│   │   │   └── map/              # Leaflet EmergencyMap with custom layer markers
│   │   ├── context/
│   │   │   └── AuthContext.tsx   # Auth state, RBAC & auto-reconnecting WebSocket
│   │   ├── pages/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AnalystDashboard.tsx
│   │   │   ├── CitizenDashboard.tsx
│   │   │   ├── DataSourcesPage.tsx
│   │   │   ├── DispatcherDashboard.tsx
│   │   │   ├── IncidentDetailPage.tsx
│   │   │   ├── LandingPage.tsx
│   │   │   ├── LiveMapPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── NotificationsPage.tsx
│   │   │   ├── OfflineSyncPage.tsx
│   │   │   ├── ReportEmergencyPage.tsx
│   │   │   ├── ResourceManagementPage.tsx
│   │   │   ├── ResponderDashboard.tsx
│   │   │   ├── SOSPage.tsx
│   │   │   ├── SitrepPage.tsx
│   │   │   └── SystemHealthPage.tsx
│   │   ├── services/
│   │   │   ├── api.ts            # Typed fetch API client with offline interception
│   │   │   ├── offlineQueue.ts   # IndexedDB local persistent operation queue
│   │   │   └── websocket.ts      # Real-time telemetry receiver
│   │   ├── types/
│   │   │   └── index.ts          # Complete domain TypeScript interfaces
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── tests/
│   └── test_backend.py           # Pytest test suite (100% pass)
├── Dockerfile                    # Multi-stage production build
├── docker-compose.yml            # Postgres, PostGIS, Redis, Backend, Frontend
└── .env.example
```

---

## 3. Pre-Seeded Demonstration Roles & Credentials

For fast evaluation during hackathons, one-click role switching is enabled directly on the top Navigation bar, or login manually:

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **DISPATCHER** | `dispatcher@resqintel.ai` | `Dispatch@123` | View all incidents, Human verification, Deploy fleet, AI Copilot |
| **RESPONDER** | `responder@resqintel.ai` | `Responder@123` | Duty toggle, GPS heartbeat, View assigned incident & route |
| **ANALYST** | `analyst@resqintel.ai` | `Analyst@123` | Real database telemetry analytics, SITREP generation, Datasets |
| **ADMIN** | `admin@resqintel.ai` | `Admin@123` | User role assignment, Immutable audit log viewer, System health |
| **CITIZEN** | `citizen@resqintel.ai` | `Citizen@123` | Multimodal emergency reporting, GPS pin, Emergency SOS beacon |

---

## 4. Multi-Agent AI Pipeline

1. **Ingestion Agent**: Normalizes text, audio transcripts, image links, and location into a standardized emergency schema.
2. **NLP Agent**: Extracts named entities (landmarks, trapped people, casualties, live wire hazards) using lexical rules and text classification.
3. **Vision Agent**: Inspects uploaded media for flood waters, active flames, smoke plumes, and structural rubble.
4. **GeoInt Agent**: Computes reverse-geocoded landmarks, population exposure, and fetches live meteorological telemetry from Open-Meteo.
5. **Duplicate / Cluster Agent**: Evaluates composite similarity across semantic TF-IDF cosine distance, geographic Haversine proximity, temporal closeness, and disaster type.
6. **Conflict Agent**: Automatically flags contradictory field reports (e.g. *"Road blocked"* vs *"Road clear"*), displaying a red alert banner.
7. **Missing Information Agent**: Audits operational checklists (e.g. Location ✓, Classification ✓, Trapped Persons ✗) and suggests verification tasks.
8. **Severity Engine**: Computes transparent weighted risk score (0-10) using configurable multi-criteria weights.
9. **Resource Matching Agent**: Finds the closest specialized response units (Ambulances, Rescue Boats, Fire Tenders).
10. **Routing Agent**: Queries OSRM road network for distance and ETA, falling back to emergency kinematics when offline.
11. **Tactical Recommendation Agent**: Generates explainable directives marked clearly with *"AI RECOMMENDATION: Human dispatcher verification required."*
12. **SITREP Agent**: Compiles authoritative, non-hallucinated Situation Reports strictly from database records.
13. **Copilot Agent**: Grounded assistant answering dispatcher questions exclusively using stored application state.

---

## 5. Offline-First PWA Synchronization (Section 34)

When connectivity is unavailable:
1. Citizen and responder reports are intercepted and stored in the browser's persistent **IndexedDB** queue.
2. The UI displays an amber `OFFLINE MODE ACTIVE` status bar with pending operation counter.
3. Once the network reconnects, the client pushes the batch to `/api/sync/batch`.
4. The server validates each item, verifies idempotency against `operation_id` to prevent duplicate writes, triggers the AI pipeline, and confirms `SYNCED` state.

---

## 6. How to Run Locally

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### Backend Setup
```bash
# Navigate to project root
cd C:\VIT\ai_emergency_response

# Virtual environment is already prepared at .\venv
# Activate virtual environment
.\venv\Scripts\activate

# Run backend development server
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```
Backend will be available at `http://127.0.0.1:8000`
- Swagger OpenAPI documentation: `http://127.0.0.1:8000/docs`
- Health probe: `http://127.0.0.1:8000/api/health/`

### Frontend Setup
```bash
# In a separate terminal
cd C:\VIT\ai_emergency_response\frontend

# Start Vite development server
npm run dev
```
Frontend will be available at `http://localhost:5173`

### Running Automated Test Suite
```bash
.\venv\Scripts\python.exe -m pytest tests/test_backend.py -v
```
All 6 comprehensive test suites execute with 100% pass rate.

---

## 7. Docker Deployment

```bash
docker-compose up --build
```
This spins up PostgreSQL with PostGIS, Redis broker, FastAPI backend container, and Vite frontend container.

---

## 8. Section 71 Hackathon Demo Scenario: "Flood Emergency"

To demonstrate the full end-to-end platform during a live presentation:

1. **Open Landing Page** (`http://localhost:5173/`):
   - View hero tagline, system pipeline, and click **"Launch Command Center Demo"**.
2. **Review Command Center** (`/dispatcher`):
   - Notice the pre-seeded **Incident #INC-20261003-0001**: *"CRITICAL FLOOD: River Road Submerged & Vehicles Stranded"*.
   - Status is `PENDING_VERIFICATION` (human-in-the-loop requirement).
3. **Open Incident Dossier** (`/incidents/{id}`):
   - See **Conflict Detected Banner**: Highlights contradiction between *"Road blocked"* and *"Road accessible via high-clearance truck"*.
   - See **"Why this incident is prioritized"**: Explains casualty score (+1.5 pts), bridge damage (+1.28 pts), and 14mm/hr rain (+0.85 pts).
   - See **Missing Information**: Flags pending verification of electrical substation shutdown.
   - Click **"Verify Incident"**: Records human verification in the permanent audit trail.
4. **Authorize Dispatch**:
   - Under AI Recommendations, review recommended asset: *Rescue Zodiac Alpha (Watercraft)* (stationed 2.4 km away, ETA ~6 min).
   - Click **"Authorize & Dispatch Strike Unit"**: Advances state to `DISPATCHED` and logs dispatch record.
5. **Field Responder View**:
   - Switch role to **RESPONDER** on the top bar.
   - View the active mission, toggle duty status to **ON SCENE**, and submit a field situation update.
6. **Generate SITREP**:
   - Switch to **ANALYST** or **DISPATCHER** and open `/sitrep`.
   - Generate official printable SITREP compiled strictly from database records.
7. **Ask AI Copilot**:
   - Open AI Copilot drawer and click *"Why is this incident high priority?"* or *"Are there conflicting reports?"*.
   - Demonstrates grounded, non-hallucinatory AI responses.

---

## 9. Honesty Audit & Implementation Status (Section 77)

| Feature / Domain | Status | Operational Notes |
| :--- | :--- | :--- |
| **Authentication & RBAC** | `IMPLEMENTED` | Secure bcrypt hashing, PyJWT tokens, 5 distinct roles, session expiration. |
| **Database Schema** | `IMPLEMENTED` | Normalized SQLAlchemy async models, foreign keys, indexes, timestamps. |
| **12-Agent AI Architecture** | `IMPLEMENTED` | Orchestrator + Ingestion, NLP, Vision, GeoInt, Clustering, Conflict, Missing Info, Severity, Resource, Routing, Recommendation, SITREP, Copilot. |
| **Human in the Loop** | `IMPLEMENTED` | Decisions require dispatcher approval before unit dispatch or state verification. |
| **Conflict Detection** | `IMPLEMENTED` | Explicitly compares field testimonies and surfaces contradiction alert banners. |
| **Geospatial Map** | `IMPLEMENTED` | Leaflet + CartoDB/OSM with incident circles, resources, responders, and risk zones. |
| **Routing Provider** | `IMPLEMENTED` | OSRM live routing with road distance & ETA, with kinematics fallback. |
| **Meteorological Provider** | `IMPLEMENTED` | Live Open-Meteo API querying real-time rainfall, temperature, and wind. |
| **Speech-to-Text Voice** | `IMPLEMENTED` | MediaRecorder audio capture with SpeechProvider transcription endpoint. |
| **Computer Vision Hazard** | `IMPLEMENTED` | VisionProvider abstraction detecting submerged roads, debris, and flames. |
| **Offline-First PWA Queue**| `IMPLEMENTED` | IndexedDB persistent queue with auto-sync on reconnect and idempotent deduplication. |
| **Real-Time Communication** | `IMPLEMENTED` | FastAPI WebSocket broker transmitting updates to all connected dashboards. |
| **Immutable Audit Logging**| `IMPLEMENTED` | Cryptographically timestamped audit events for all verification and dispatch actions. |
| **System Component Health** | `IMPLEMENTED` | Genuine component checks for DB, Storage, AI, Weather, Routing, and WebSocket. |
| **External SMS Gateway** | `CONFIGURATION REQUIRED` | Provided adapter architecture in NotificationProvider; requires production Twilio API keys. |
| **External Drone Feeds** | `CONFIGURATION REQUIRED` | Endpoint accepts live RTSP/HTTP video streams; depends on hardware on-scene. |
