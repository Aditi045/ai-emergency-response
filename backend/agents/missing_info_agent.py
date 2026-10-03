from typing import Dict, Any, List

class MissingInformationAgent:
    """Agent evaluating completeness of operational incident dossier"""

    @classmethod
    async def process(cls, incident_data: Dict[str, Any], reports: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        reports = reports or []
        
        has_location = bool(incident_data.get("latitude") and incident_data.get("longitude"))
        has_type = bool(incident_data.get("incident_type"))
        has_media = bool(incident_data.get("has_media") or any(r.get("media_urls") for r in reports))
        has_people_estimate = bool(incident_data.get("affected_people_estimate", 0) > 0)
        has_injuries = incident_data.get("injuries_count") is not None
        has_hazards = bool(incident_data.get("hazards_description") or incident_data.get("hazards"))
        has_infra_damage = bool(incident_data.get("infrastructure_damage"))
        has_contact = bool(any(r.get("submitter_phone") for r in reports) or incident_data.get("submitter_phone"))

        checklist = [
            {"item": "Exact GPS Coordinates", "present": has_location, "critical": True},
            {"item": "Incident Classification", "present": has_type, "critical": True},
            {"item": "Visual/Photographic Evidence", "present": has_media, "critical": False},
            {"item": "Trapped / Affected People Estimate", "present": has_people_estimate, "critical": True},
            {"item": "Confirmed Injury / Triage Count", "present": has_injuries, "critical": True},
            {"item": "Secondary Hazards Detail (Power/Gas/Bio)", "present": has_hazards, "critical": False},
            {"item": "Structural & Ingress Damage Status", "present": has_infra_damage, "critical": False},
            {"item": "On-scene Submitter Callback Channel", "present": has_contact, "critical": False}
        ]

        missing_items = [c["item"] for c in checklist if not c["present"]]
        verification_recommendations = []

        if not has_people_estimate:
            verification_recommendations.append("Verify number of trapped individuals with nearest drone or field scout.")
        if not has_injuries:
            verification_recommendations.append("Establish immediate triage count to confirm paramedic requirement.")
        if not has_infra_damage:
            verification_recommendations.append("Confirm structural safety of adjacent buildings and bridge crossings.")
        if not has_media:
            verification_recommendations.append("Request photographic evidence from approaching responders.")

        completeness_pct = round(((len(checklist) - len(missing_items)) / len(checklist)) * 100, 1)

        return {
            "completeness_score_pct": completeness_pct,
            "has_missing_critical_info": any(c["critical"] and not c["present"] for c in checklist),
            "checklist": checklist,
            "missing_items": missing_items,
            "verification_recommendations": verification_recommendations,
            "agent_metadata": {"agent": "MissingInformationAgent", "version": "1.0.0"}
        }
