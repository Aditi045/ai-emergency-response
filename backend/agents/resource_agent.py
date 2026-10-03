from typing import Dict, Any, List
from backend.services.providers.routing_provider import haversine_distance_km

class ResourceAgent:
    """Agent matching incidents with optimal emergency response assets based on distance, specialization, and capacity"""

    TYPE_REQUIREMENTS = {
        "Flood": ["RESCUE_BOAT", "AMBULANCE", "MEDICAL_TEAM", "SHELTER"],
        "Fire": ["FIRE_TRUCK", "AMBULANCE", "POLICE_CAR"],
        "Building Collapse": ["FIRE_TRUCK", "RESCUE_BOAT", "AMBULANCE", "MEDICAL_TEAM"],
        "Road Accident": ["AMBULANCE", "POLICE_CAR", "FIRE_TRUCK"],
        "Medical Emergency": ["AMBULANCE", "MEDICAL_TEAM"],
        "Industrial Accident": ["HAZMAT_UNIT", "FIRE_TRUCK", "AMBULANCE"],
        "Landslide": ["FIRE_TRUCK", "AMBULANCE", "POLICE_CAR"],
        "Earthquake": ["FIRE_TRUCK", "AMBULANCE", "RESCUE_BOAT", "SHELTER", "MEDICAL_TEAM"],
        "Cyclone": ["RESCUE_BOAT", "SHELTER", "AMBULANCE"],
        "Road Blockage": ["POLICE_CAR", "FIRE_TRUCK"],
        "Other": ["POLICE_CAR", "AMBULANCE"]
    }

    @classmethod
    async def match_resources(
        cls, 
        incident_lat: float, 
        incident_lng: float, 
        incident_type: str, 
        injuries: int,
        available_resources: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        needed_types = cls.TYPE_REQUIREMENTS.get(incident_type, ["AMBULANCE", "POLICE_CAR"])
        
        # If injuries reported, ensure ambulance is high priority
        if injuries > 0 and "AMBULANCE" not in needed_types:
            needed_types.insert(0, "AMBULANCE")

        scored_resources = []
        for res in available_resources:
            res_lat = res.get("latitude", 0.0)
            res_lng = res.get("longitude", 0.0)
            res_type = res.get("resource_type", "")
            res_status = res.get("status", "AVAILABLE")
            
            # Distance
            dist_km = round(haversine_distance_km(incident_lat, incident_lng, res_lat, res_lng), 2)
            # Estimated travel time in minutes at 45km/h average urban speed
            eta_mins = round((dist_km / 45.0) * 60, 1)

            # Specialization match
            type_match = res_type in needed_types
            
            # Base priority score
            score = 100.0 - (dist_km * 2.0)
            if type_match:
                score += 50.0
            if res_status == "AVAILABLE":
                score += 30.0
            else:
                score -= 40.0

            reason = f"Specialized for {res_type} missions. Stationed {dist_km} km away with estimated {eta_mins} mins travel time."
            if not type_match:
                reason = f"General auxiliary support unit. Stationed {dist_km} km away."

            scored_resources.append({
                "resource_id": res.get("id"),
                "resource_name": res.get("resource_name"),
                "resource_type": res_type,
                "status": res_status,
                "distance_km": dist_km,
                "eta_minutes": eta_mins,
                "suitability_score": round(score, 1),
                "is_specialized_match": type_match,
                "recommendation_reason": reason,
                "station_name": res.get("station_name", "Regional Base")
            })

        # Sort by suitability descending
        scored_resources.sort(key=lambda x: x["suitability_score"], reverse=True)
        return scored_resources
