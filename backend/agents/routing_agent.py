from typing import Dict, Any, List
from backend.services.providers.routing_provider import RoutingProvider

class RoutingAgent:
    """Agent calculating verified ingress and egress emergency routes"""

    @classmethod
    async def compute_routes(
        cls, 
        origin_lat: float, 
        origin_lng: float, 
        dest_lat: float, 
        dest_lng: float
    ) -> Dict[str, Any]:
        route_data = await RoutingProvider.get_route(origin_lat, origin_lng, dest_lat, dest_lng)
        
        return {
            "status": "COMPLETED",
            "primary_route": {
                "distance_km": route_data.get("distance_km"),
                "eta_minutes": route_data.get("eta_minutes"),
                "geometry": route_data.get("geometry"),
                "provider": route_data.get("provider"),
                "provider_status": route_data.get("status")
            },
            "hazard_clearance_status": "CLEAR" if not route_data.get("has_road_blockage_avoidance") else "AVOIDANCE_APPLIED",
            "agent_metadata": {"agent": "RoutingAgent", "version": "1.2.0"}
        }
