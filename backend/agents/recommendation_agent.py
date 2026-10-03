from typing import Dict, Any, List

class RecommendationAgent:
    """Agent formulating explainable tactical response recommendations requiring human approval"""

    @classmethod
    async def generate_recommendations(
        cls, 
        incident_type: str, 
        severity_class: str, 
        injuries: int, 
        matched_resources: List[Dict[str, Any]],
        conflicts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        recommendations = []

        # 1. Primary Resource Dispatch
        top_resources = [r for r in matched_resources if r.get("status") == "AVAILABLE"][:3]
        if top_resources:
            res_names = ", ".join([f"{r['resource_name']} ({r['resource_type']})" for r in top_resources])
            recommendations.append({
                "type": "RESOURCE_DISPATCH",
                "title": f"Dispatch Primary Strike Team: {top_resources[0]['resource_name']}",
                "action": f"Deploy {res_names} to incident perimeter.",
                "rationale": f"Incident classified as {severity_class} {incident_type}. Nearest assets are stationed within {top_resources[0]['distance_km']} km (ETA ~{top_resources[0]['eta_minutes']} min).",
                "recommended_resource_ids": [r["resource_id"] for r in top_resources],
                "priority": "URGENT" if severity_class in ["HIGH", "CRITICAL"] else "HIGH",
                "disclaimer": "AI RECOMMENDATION: Human dispatcher verification and authorization required."
            })

        # 2. Medical / Triage Alert
        if injuries > 0:
            recommendations.append({
                "type": "MEDICAL_ALERT",
                "title": f"Pre-Alert Regional Trauma & ICU Beds ({injuries} Reported Injuries)",
                "action": "Transmit casualty notification to nearest Level-1 Trauma Hospital and stage ambulances.",
                "rationale": f"Reports cite {injuries} casualties requiring priority trauma reception and emergency surgical readiness.",
                "recommended_resource_ids": [],
                "priority": "URGENT",
                "disclaimer": "AI RECOMMENDATION: Human dispatcher verification and authorization required."
            })

        # 3. Hazard Mitigation / Evacuation
        if incident_type in ["Flood", "Building Collapse", "Industrial Accident"] or severity_class == "CRITICAL":
            recommendations.append({
                "type": "EVACUATION_PERIMETER",
                "title": "Establish 500m Hazard Safety Perimeter & Open Nearest Emergency Shelter",
                "action": "Issue geofenced localized emergency advisory and prepare shelter intake facilities.",
                "rationale": f"High risk of cascading structural failure or water surge based on current {incident_type} classification.",
                "recommended_resource_ids": [],
                "priority": "HIGH",
                "disclaimer": "AI RECOMMENDATION: Human dispatcher verification and authorization required."
            })

        # 4. Conflict Resolution Directive
        if conflicts:
            recommendations.append({
                "type": "RECON_DISPATCH",
                "title": "Dispatch Scout Unit to Resolve Field Report Contradictions",
                "action": "Task approaching responder to confirm roadway accessibility before heavy tender ingress.",
                "rationale": "Conflicting field reports detected regarding road passability.",
                "recommended_resource_ids": [],
                "priority": "MEDIUM",
                "disclaimer": "AI RECOMMENDATION: Human dispatcher verification and authorization required."
            })

        return recommendations
