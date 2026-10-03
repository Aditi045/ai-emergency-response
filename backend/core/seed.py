import asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database import AsyncSessionLocal
from backend.core.security import get_password_hash
from backend.models.all_models import (
    User, Incident, IncidentReport, IncidentMedia, IncidentCluster,
    IncidentTimeline, AIAnalysis, AIEvidence, AIRecommendation,
    Resource, Responder, Hospital, Shelter, RiskZone, Dataset, ModelRegistry
)

async def seed_database():
    """Seeds initial administrative roles, facilities, and the Section 71 FLOOD DEMO scenario"""
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        res = await db.execute(select(User))
        if res.scalars().first():
            return # Already initialized

        # 1. Core Users (Admin, Dispatcher, Analyst, Responder, Citizen)
        admin = User(
            email="admin@resqintel.ai",
            hashed_password=get_password_hash("Admin@123"),
            full_name="Chief Operational Director",
            role="ADMIN",
            organization="National Disaster Response Authority"
        )
        dispatcher = User(
            email="dispatcher@resqintel.ai",
            hashed_password=get_password_hash("Dispatch@123"),
            full_name="Sarah Jenkins (Senior Dispatcher)",
            role="DISPATCHER",
            organization="Emergency Operations Command"
        )
        analyst = User(
            email="analyst@resqintel.ai",
            hashed_password=get_password_hash("Analyst@123"),
            full_name="Dr. Marcus Vance (Geoint Analyst)",
            role="ANALYST",
            organization="Crisis Intelligence Unit"
        )
        responder = User(
            email="responder@resqintel.ai",
            hashed_password=get_password_hash("Responder@123"),
            full_name="Lieutenant Alex Chen",
            role="RESPONDER",
            phone="+91 98401 23456",
            organization="Swift Water Rescue Battalion 4"
        )
        citizen = User(
            email="citizen@resqintel.ai",
            hashed_password=get_password_hash("Citizen@123"),
            full_name="Priya Sharma",
            role="CITIZEN",
            phone="+91 94440 98765"
        )
        db.add_all([admin, dispatcher, analyst, responder, citizen])
        await db.flush()

        # 2. Responder Profile
        resp_profile = Responder(
            user_id=responder.id,
            responder_name="Lieutenant Alex Chen",
            badge_number="SWR-042",
            specialization="Swift Water Rescue & Flood Evacuation",
            status="ON_DUTY",
            latitude=13.0845,
            longitude=80.2720
        )
        db.add(resp_profile)

        # 3. Emergency Resources
        r1 = Resource(
            resource_name="Rescue Zodiac Alpha (Watercraft)",
            resource_type="RESCUE_BOAT",
            status="AVAILABLE",
            latitude=13.0880,
            longitude=80.2750,
            address="Marina Harbor Station",
            station_name="Coastal Emergency Command",
            capacity=8
        )
        r2 = Resource(
            resource_name="Medic Ambulance Unit 12",
            resource_type="AMBULANCE",
            status="AVAILABLE",
            latitude=13.0790,
            longitude=80.2650,
            address="Central Medical Station 4",
            station_name="Metropolitan Ambulance Corps",
            capacity=2
        )
        r3 = Resource(
            resource_name="Heavy Pumper Tender 07",
            resource_type="FIRE_TRUCK",
            status="AVAILABLE",
            latitude=13.0920,
            longitude=80.2690,
            address="Central Fire Brigade HQ",
            station_name="Station 1",
            capacity=6
        )
        r4 = Resource(
            resource_name="Tactical Police Patrol 19",
            resource_type="POLICE_CAR",
            status="AVAILABLE",
            latitude=13.0810,
            longitude=80.2780,
            address="Sector 3 Police Station",
            station_name="Sector 3 Precinct",
            capacity=4
        )
        db.add_all([r1, r2, r3, r4])

        # 4. Hospitals & Shelters
        h1 = Hospital(
            name="Metropolitan General Hospital & Trauma Center",
            address="102 Hospital Road, Sector 1",
            latitude=13.0805,
            longitude=80.2675,
            total_beds=450,
            available_beds=48,
            icu_beds=14,
            burn_unit=True,
            trauma_center_level="Level 1",
            phone="+91 44 2530 0000"
        )
        h2 = Hospital(
            name="St. Jude Emergency Medical Center",
            address="45 Coastal Boulevard",
            latitude=13.0910,
            longitude=80.2810,
            total_beds=220,
            available_beds=32,
            icu_beds=6,
            burn_unit=False,
            trauma_center_level="Level 2",
            phone="+91 44 2531 1111"
        )
        s1 = Shelter(
            name="Community Indoor Stadium Relief Shelter",
            address="Stadium Complex, Sector 2",
            latitude=13.0850,
            longitude=80.2610,
            capacity=500,
            current_occupancy=45,
            facilities_json={"food_kitchen": True, "first_aid": True, "power_generator": True, "cots": 400},
            contact_name="Relief Coordinator Kumar",
            phone="+91 94441 12233"
        )
        db.add_all([h1, h2, s1])

        # 5. Risk Zones
        rz = RiskZone(
            zone_name="River Basin Lowland Floodplain Zone A",
            hazard_type="FLOOD",
            risk_level="HIGH",
            coordinates_geojson={
                "type": "Polygon",
                "coordinates": [[
                    [80.265, 13.080],
                    [80.278, 13.082],
                    [80.281, 13.090],
                    [80.269, 13.089],
                    [80.265, 13.080]
                ]]
            },
            description="Low elevation watershed basin subject to rapid inundation during severe rainfall.",
            population_estimate=14500
        )
        db.add(rz)

        # 6. Model Registry (Section 45)
        m1 = ModelRegistry(
            model_name="ResQIntel-NER-Classifier",
            version="v1.4.0",
            task="NLP_NER",
            framework="Scikit-Learn / Lexical Rules",
            training_dataset="Emergency Distress Call Corpus 2024 (12,000 Annotated Signals)",
            metrics_json={"accuracy": 0.942, "f1": 0.938, "precision": 0.951, "recall": 0.926},
            status="DEPLOYED"
        )
        m2 = ModelRegistry(
            model_name="ResQIntel-MultiFactor-Severity-Engine",
            version="v2.0.0",
            task="SEVERITY_SCORING",
            framework="Explainable Multi-Criteria Decision Analysis",
            training_dataset="FEMA & NDMA Disaster Severity Benchmark Matrix",
            metrics_json={"accuracy": 0.965, "f1": 0.961, "mean_absolute_error": 0.28},
            status="DEPLOYED"
        )
        m3 = ModelRegistry(
            model_name="ResQIntel-Vision-YOLO-Disaster",
            version="v2.0.0",
            task="CV_HAZARD",
            framework="PyTorch / YOLOv8",
            training_dataset="DisasterScene Vision Dataset (Flood, Fire, Debris)",
            metrics_json={"mAP_50": 0.887, "precision": 0.902, "recall": 0.871},
            status="DEPLOYED"
        )
        db.add_all([m1, m2, m3])

        # 7. Datasets (Section 42-44)
        ds1 = Dataset(
            name="OpenStreetMap Transportation & Infrastructure Layer",
            provider="OpenStreetMap Contributors",
            license="ODbL (Open Database License)",
            coverage="National Arterial & Secondary Road Network",
            records_count=2480000,
            category="INFRASTRUCTURE",
            source_url="https://www.openstreetmap.org",
            data_quality="VERIFIED_COMMUNITY"
        )
        ds2 = Dataset(
            name="Global High-Resolution Precipitation Telemetry",
            provider="Open-Meteo & ECMWF Integrated Forecasting",
            license="Creative Commons Attribution 4.0",
            coverage="Global Satellite & Ground Radar Grid",
            records_count=520000,
            category="WEATHER",
            source_url="https://open-meteo.com",
            data_quality="OFFICIAL_METEOROLOGICAL"
        )
        ds3 = Dataset(
            name="National Disaster Management Historical Inundation Registry",
            provider="NDMA Public Safety Informatics",
            license="Government Open Data License",
            coverage="Urban Flood Inundation Zones 2015-2025",
            records_count=18400,
            category="DISASTER_HISTORICAL",
            source_url="https://ndma.gov.in",
            data_quality="OFFICIAL_GOVERNMENT"
        )
        db.add_all([ds1, ds2, ds3])

        # 8. SECTION 71 HACKATHON DEMO SCENARIO: FLOOD EMERGENCY
        # Cluster representation
        cluster = IncidentCluster(
            cluster_name="Sector 4 Riverbank Inundation & Bridge Blockage Cluster",
            incident_count=3,
            center_lat=13.0827,
            center_lng=80.2707,
            radius_meters=650.0,
            incident_type="Flood",
            confidence=0.92,
            summary="Multiple converging distress signals along River Road confirming submerged bridge, stranded civilian vehicles, and water entering dwellings."
        )
        db.add(cluster)
        await db.flush()

        flood_incident = Incident(
            incident_number="INC-20261003-0001",
            title="CRITICAL FLOOD: River Road Submerged & Vehicles Stranded",
            description="Heavy torrential rainfall has caused river overflow near the central bridge. Multiple vehicles are stranded and water is rapidly rising into residential ground floors.",
            incident_type="Flood",
            status="PENDING_VERIFICATION", # Human verification required
            severity_score=8.4,
            severity_class="CRITICAL",
            priority_score=84.0,
            latitude=13.0827,
            longitude=80.2707,
            address="River Road near Central Bridge Crossing, Sector 4",
            city="Metropolitan Area",
            state="State District",
            radius_meters=600.0,
            affected_people_estimate=45,
            injuries_count=3,
            fatalities_count=0,
            hazards_description="Fast-flowing flood current, submerged vehicles, downed live electricity lines nearby",
            infrastructure_damage="Arterial bridge approach submerged under 1.2m of water; corridor impassable for light vehicles",
            verification_status="UNVERIFIED",
            cluster_id=cluster.id,
            is_demo=True,
            created_by_id=citizen.id
        )
        db.add(flood_incident)
        await db.flush()

        # Update cluster primary incident
        cluster.primary_incident_id = flood_incident.id

        # 3 Multimodal Reports for this incident
        # Citizen 1: Text + GPS
        r_cit1 = IncidentReport(
            incident_id=flood_incident.id,
            citizen_id=citizen.id,
            report_type="CITIZEN",
            raw_text="Water entering houses near central bridge! The water level is already waist deep and two cars are stuck with people inside.",
            latitude=13.0825,
            longitude=80.2705,
            address="River Road near Central Bridge Crossing",
            injuries_reported=1,
            people_affected=15,
            hazards="Rising water, submerged cars",
            submitter_name="Priya Sharma",
            submitter_phone="+91 94440 98765"
        )
        # Citizen 2: Image + GPS (with contradiction: road blocked)
        r_cit2 = IncidentReport(
            incident_id=flood_incident.id,
            report_type="CITIZEN",
            raw_text="Road blocked by deep water and floating debris. Impassable for cars.",
            latitude=13.0831,
            longitude=80.2712,
            address="Bridge North Ramp",
            injuries_reported=2,
            people_affected=20,
            hazards="Road impassable",
            submitter_name="Rahul Verma",
            submitter_phone="+91 98840 55443"
        )
        # Citizen 3: Voice Report
        r_cit3 = IncidentReport(
            incident_id=flood_incident.id,
            report_type="CITIZEN",
            raw_text="Voice call transcript: Emergency! Live wire sparking near the transformer next to the water! Send rescue boat immediately!",
            transcript="Emergency! Live wire sparking near the transformer next to the water! Send rescue boat immediately!",
            latitude=13.0820,
            longitude=80.2701,
            address="River Road West Alley",
            injuries_reported=0,
            people_affected=10,
            hazards="Live wire sparking near flood water",
            submitter_name="Anand K",
            submitter_phone="+91 97910 11223"
        )
        db.add_all([r_cit1, r_cit2, r_cit3])

        # Media Evidence
        media1 = IncidentMedia(
            incident_id=flood_incident.id,
            report_id=r_cit2.id,
            media_type="IMAGE",
            file_url="/storage/uploads/demo_flood_bridge.jpg",
            file_name="demo_flood_bridge.jpg",
            cv_analysis_json={
                "status": "COMPLETED",
                "model": "ResQIntel-Vision-YOLO-Disaster-v2",
                "primary_hazard": "Flood Waters / Submerged Roadway",
                "overall_confidence": 0.94,
                "inferred_damage_level": "SEVERE",
                "detections": [
                    {"label": "Submerged Road", "confidence": 0.94, "box": [0.1, 0.4, 0.9, 0.85]},
                    {"label": "Trapped Vehicle", "confidence": 0.89, "box": [0.55, 0.45, 0.8, 0.7]}
                ]
            }
        )
        db.add(media1)

        # AI Analysis Record
        analysis = AIAnalysis(
            incident_id=flood_incident.id,
            pipeline_stage="MULTIMODAL_FUSION_COMPLETED",
            status="COMPLETED",
            classification="Flood",
            confidence=0.96,
            severity_score=8.4,
            severity_class="CRITICAL",
            contributing_factors_json=[
                {"factor": "Casualty & Injury Assessment", "weight": 0.25, "score_contribution": 1.5, "rationale": "3 casualties reported on scene."},
                {"factor": "Critical Infrastructure Integrity", "weight": 0.15, "score_contribution": 1.28, "rationale": "Bridge corridor impassable."},
                {"factor": "Meteorological Compounding Risk", "weight": 0.10, "score_contribution": 0.85, "rationale": "Heavy torrential precipitation continuing (14mm/hr)."},
                {"factor": "Population Exposure / Entrapment", "weight": 0.15, "score_contribution": 1.12, "rationale": "45 residents stranded in low-lying area."}
            ],
            entities_json={
                "people_affected": 45,
                "injuries": 3,
                "landmarks": ["Central Bridge", "River Road", "Marina Sector 4"],
                "hazards": ["Fast-flowing Flood Waters", "Downed Live Power Lines"]
            },
            conflicting_signals_json={
                "has_conflict": True,
                "conflict_count": 1,
                "conflicts": [
                    {
                        "type": "CONTRADICTORY_FIELD_REPORT",
                        "severity": "HIGH",
                        "detected_contradiction": "Report cited 'Road blocked by deep water' vs Patrol query 'Road accessible via high-clearance truck'",
                        "human_action_required": "Dispatch scout boat or verify via responder on-scene before committing light ambulances."
                    }
                ]
            },
            missing_information_json={
                "completeness_score_pct": 87.5,
                "has_missing_critical_info": False,
                "missing_items": ["Secondary Hazards Detail (Power Grid Isolation Confirmation)"],
                "verification_recommendations": ["Confirm electrical substation cutoff with municipal grid dispatch."]
            },
            agent_executions_json=[
                {"agent_name": "IngestionAgent", "status": "COMPLETED", "execution_ms": 2},
                {"agent_name": "NLPAgent", "status": "COMPLETED", "execution_ms": 14, "confidence": 0.96},
                {"agent_name": "VisionAgent", "status": "COMPLETED", "execution_ms": 45, "confidence": 0.94},
                {"agent_name": "GeoIntAgent", "status": "COMPLETED", "execution_ms": 32},
                {"agent_name": "DuplicateClusterAgent", "status": "COMPLETED", "execution_ms": 18},
                {"agent_name": "ConflictAgent", "status": "COMPLETED", "execution_ms": 5},
                {"agent_name": "MissingInformationAgent", "status": "COMPLETED", "execution_ms": 3},
                {"agent_name": "SeverityAgent", "status": "COMPLETED", "execution_ms": 8},
                {"agent_name": "ResourceAgent", "status": "COMPLETED", "execution_ms": 12},
                {"agent_name": "RecommendationAgent", "status": "COMPLETED", "execution_ms": 6}
            ],
            model_version="resqintel-v1.4",
            execution_time_ms=145
        )
        db.add(analysis)
        await db.flush()

        # Evidence Items
        ev1 = AIEvidence(
            incident_id=flood_incident.id,
            analysis_id=analysis.id,
            evidence_type="CITIZEN_DISTRESS_CALL",
            source="Priya Sharma (Witness)",
            snippet="Water entering houses near central bridge! Waist deep and two cars stuck.",
            confidence=0.88,
            evidence_relationship="Initial ground report"
        )
        ev2 = AIEvidence(
            incident_id=flood_incident.id,
            analysis_id=analysis.id,
            evidence_type="COMPUTER_VISION_HAZARD",
            source="Image Analysis Pipeline",
            snippet="Identified Flood Waters / Submerged Roadway (94% confidence) with 2 trapped vehicles.",
            confidence=0.94,
            evidence_relationship="Visual confirmation"
        )
        ev3 = AIEvidence(
            incident_id=flood_incident.id,
            analysis_id=analysis.id,
            evidence_type="METEOROLOGICAL_SENSOR",
            source="Open-Meteo Satellite Feed",
            snippet="Current precipitation 14.2 mm/hr with sustained squall wind gusts of 28 km/h.",
            confidence=0.98,
            evidence_relationship="Environmental escalation risk"
        )
        db.add_all([ev1, ev2, ev3])

        # AI Recommendations
        rec1 = AIRecommendation(
            incident_id=flood_incident.id,
            recommendation_type="RESOURCE_DISPATCH",
            title="Deploy Rescue Zodiac Alpha (Watercraft) to Central Bridge",
            action="Deploy watercraft strike unit to rescue trapped occupants from submerged vehicles.",
            rationale="Water level exceeds 1.2m depth; conventional vehicles unable to ford corridor safely.",
            recommended_resources_json=[r1.id],
            priority="URGENT",
            is_approved=False
        )
        rec2 = AIRecommendation(
            incident_id=flood_incident.id,
            recommendation_type="MEDICAL_ALERT",
            title="Pre-Alert Metropolitan General Hospital (Level 1 Trauma)",
            action="Stage Medic Ambulance Unit 12 at northern dry perimeter staging ground.",
            rationale="3 reported casualties with hypothermia and trauma risks.",
            recommended_resources_json=[r2.id],
            priority="HIGH",
            is_approved=False
        )
        db.add_all([rec1, rec2])

        # Incident Timeline
        t1 = IncidentTimeline(
            incident_id=flood_incident.id,
            event_type="REPORTED",
            title="Initial Citizen Distress Signal Ingested",
            description="Signal received via mobile reporting channel with precise GPS coordinates.",
            new_status="REPORTED",
            actor_name="Priya Sharma",
            actor_role="CITIZEN"
        )
        t2 = IncidentTimeline(
            incident_id=flood_incident.id,
            event_type="AI_ANALYZED",
            title="Multi-Agent Pipeline Executed",
            description="Ingestion, NLP, Vision, GeoInt, and Severity Agents concluded analysis. Severity rated CRITICAL (8.4/10).",
            previous_status="REPORTED",
            new_status="PENDING_VERIFICATION",
            actor_name="ResQIntel AI Engine",
            actor_role="AI_ORCHESTRATOR"
        )
        db.add_all([t1, t2])

        await db.commit()
        print(">> Database seeded successfully with Section 71 FLOOD DEMO SCENARIO.")

if __name__ == "__main__":
    asyncio.run(seed_database())
