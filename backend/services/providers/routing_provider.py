import math
import httpx
from typing import Dict, Any, List

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance in kilometers between two points on Earth"""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class RoutingProvider:
    """Provider abstraction for Emergency Routing with OSRM and mathematical fallback"""
    
    @classmethod
    async def get_route(cls, start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> Dict[str, Any]:
        """Calculates distance, ETA, and geojson path"""
        # Try OSRM public service
        try:
            url = f"http://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=full&geometries=geojson"
            async with httpx.AsyncClient(timeout=3.5) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("routes") and len(data["routes"]) > 0:
                        route = data["routes"][0]
                        distance_km = round(route["distance"] / 1000.0, 2)
                        eta_minutes = round(route["duration"] / 60.0, 1)
                        geometry = route.get("geometry", {})
                        return {
                            "distance_km": distance_km,
                            "eta_minutes": eta_minutes,
                            "geometry": geometry,
                            "provider": "Open Source Routing Machine (OSRM Live)",
                            "status": "ONLINE",
                            "has_road_blockage_avoidance": True
                        }
        except Exception:
            pass
            
        # Resilient Geospatial Fallback (Road-network estimated Haversine)
        straight_km = haversine_distance_km(start_lat, start_lng, end_lat, end_lng)
        # Detour factor for urban emergency road navigation is typically ~1.28
        road_distance_km = round(straight_km * 1.28, 2)
        # Assuming average response speed 40 km/h in emergency conditions
        eta_minutes = round((road_distance_km / 40.0) * 60.0, 1)
        
        # Simple step interpolation coordinates
        steps = 5
        coords: List[List[float]] = []
        for i in range(steps + 1):
            t = i / steps
            interp_lat = round(start_lat + t * (end_lat - start_lat), 6)
            interp_lng = round(start_lng + t * (end_lng - start_lng), 6)
            coords.append([interp_lng, interp_lat])
            
        return {
            "distance_km": road_distance_km,
            "eta_minutes": eta_minutes,
            "geometry": {
                "type": "LineString",
                "coordinates": coords
            },
            "provider": "ResQIntel Geospatial Kinematics Engine (Fallback)",
            "status": "FALLBACK",
            "has_road_blockage_avoidance": False
        }
