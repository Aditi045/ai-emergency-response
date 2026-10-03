import httpx
from typing import Optional, Dict, Any

class GeocodingProvider:
    """Provider abstraction for Geocoding with fallback"""
    
    @classmethod
    async def reverse_geocode(cls, lat: float, lng: float) -> Dict[str, Any]:
        """Convert latitude, longitude to human-readable address"""
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=18&addressdetails=1"
            headers = {"User-Agent": "ResQIntel-Emergency-Intelligence-Platform/1.0"}
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    display_name = data.get("display_name")
                    address = data.get("address", {})
                    city = address.get("city") or address.get("town") or address.get("county") or "Local District"
                    state = address.get("state", "")
                    return {
                        "address": display_name,
                        "city": city,
                        "state": state,
                        "source": "OpenStreetMap Nominatim (Live)",
                        "status": "ONLINE"
                    }
        except Exception:
            pass
        
        # Local deterministic fallback
        return {
            "address": f"Sector Vicinity Coordinates [{lat:.4f}, {lng:.4f}]",
            "city": "District Operational Zone",
            "state": "State Zone",
            "source": "Local Geospatial Coordinate Resolving Engine (Fallback)",
            "status": "FALLBACK"
        }

    @classmethod
    async def forward_geocode(cls, query: str) -> Optional[Dict[str, Any]]:
        """Search query to coordinates"""
        try:
            url = f"https://nominatim.openstreetmap.org/search?format=json&q={query}&limit=1"
            headers = {"User-Agent": "ResQIntel-Emergency-Intelligence-Platform/1.0"}
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    if data and len(data) > 0:
                        first = data[0]
                        return {
                            "latitude": float(first["lat"]),
                            "longitude": float(first["lon"]),
                            "display_name": first.get("display_name", query),
                            "source": "Nominatim Live",
                            "status": "ONLINE"
                        }
        except Exception:
            pass
        return None
