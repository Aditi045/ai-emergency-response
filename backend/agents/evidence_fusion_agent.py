from typing import Dict, Any, List
from datetime import datetime, timezone

class EvidenceFusionAgent:
    """Agent fusing multimodal signals into an explainable verified dossier"""

    @classmethod
    async def process(
        cls, 
        reports: List[Dict[str, Any]], 
        weather_info: Dict[str, Any], 
        geoint_info: Dict[str, Any],
        cv_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        evidence_items = []

        # 1. Citizen & Field Reports
        for idx, r in enumerate(reports):
            src_type = r.get("report_type", "CITIZEN_REPORT")
            evidence_items.append({
                "id": f"ev-rpt-{idx+1}",
                "evidence_type": "FIELD_REPORT",
                "source": f"{src_type} ({r.get('submitter_name') or 'Anonymous'})",
                "timestamp": str(r.get("created_at") or datetime.now(timezone.utc)),
                "snippet": r.get("raw_text") or r.get("transcript") or "Report submitted",
                "relationship": "Direct witness testimony / on-scene report",
                "confidence": 0.88 if src_type == "RESPONDER" else 0.75
            })

        # 2. Computer Vision Evidence
        if cv_info.get("status") == "COMPLETED" and cv_info.get("detections"):
            evidence_items.append({
                "id": "ev-cv-1",
                "evidence_type": "COMPUTER_VISION_DETECTION",
                "source": "Multimodal Image Feature Detector",
                "timestamp": str(datetime.now(timezone.utc)),
                "snippet": f"Identified {cv_info.get('primary_hazard')} with {len(cv_info.get('detections'))} bounding features. Damage Level: {cv_info.get('inferred_damage_level')}.",
                "relationship": "Visual confirmation of physical disaster state",
                "confidence": round(cv_info.get("confidence", 0.85), 2)
            })

        # 3. Weather Evidence
        if weather_info and weather_info.get("status") in ["ONLINE", "FALLBACK"]:
            rainfall = weather_info.get("rainfall_mm", 0.0)
            cond = weather_info.get("condition", "Normal")
            evidence_items.append({
                "id": "ev-wx-1",
                "evidence_type": "METEOROLOGICAL_SENSOR",
                "source": weather_info.get("provider", "Meteorological API"),
                "timestamp": str(datetime.now(timezone.utc)),
                "snippet": f"Conditions: {cond}, Current Rainfall: {rainfall} mm/hr, Wind: {weather_info.get('wind_speed_kmh')} km/h.",
                "relationship": "Environmental contributing risk factor",
                "confidence": 0.95
            })

        # 4. Geospatial Exposure Evidence
        if geoint_info and "spatial_impact" in geoint_info:
            exp = geoint_info["spatial_impact"].get("estimated_exposed_population", 0)
            radius = geoint_info["spatial_impact"].get("radius_meters", 500)
            evidence_items.append({
                "id": "ev-geo-1",
                "evidence_type": "GEOSPATIAL_DEMOGRAPHIC",
                "source": "PostGIS / Urban Population Exposure Layer",
                "timestamp": str(datetime.now(timezone.utc)),
                "snippet": f"Estimated {exp} residents situated within {radius}m operational hazard perimeter.",
                "relationship": "Spatial impact & evacuation sizing context",
                "confidence": 0.90
            })

        return {
            "status": "COMPLETED",
            "total_evidence_items": len(evidence_items),
            "evidence": evidence_items,
            "agent_metadata": {"agent": "EvidenceFusionAgent", "version": "1.5.0"}
        }
