import httpx
from typing import Dict, Any

class WeatherProvider:
    """Provider abstraction for Real-time Meteorological Observation"""
    
    WEATHER_CODES = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy torrential rain",
        71: "Slight snow",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail"
    }

    @classmethod
    async def get_current_weather(cls, lat: float, lng: float) -> Dict[str, Any]:
        """Fetches live meteorological observations"""
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,surface_pressure,wind_speed_10m,weather_code"
            async with httpx.AsyncClient(timeout=3.5) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    current = data.get("current", {})
                    code = current.get("weather_code", 0)
                    condition = cls.WEATHER_CODES.get(code, "Variable Weather")
                    
                    return {
                        "temperature_c": current.get("temperature_2m", 28.0),
                        "rainfall_mm": current.get("precipitation", 0.0),
                        "humidity_pct": current.get("relative_humidity_2m", 75.0),
                        "wind_speed_kmh": current.get("wind_speed_10m", 15.0),
                        "pressure_hpa": current.get("surface_pressure", 1012.0),
                        "condition": condition,
                        "provider": "Open-Meteo Global Meteorological Forecast API (Live)",
                        "status": "ONLINE"
                    }
        except Exception:
            pass
            
        # Fallback contextual observation
        return {
            "temperature_c": 28.5,
            "rainfall_mm": 12.4,
            "humidity_pct": 82.0,
            "wind_speed_kmh": 22.0,
            "pressure_hpa": 1008.5,
            "condition": "Heavy Rain / High Precipitation Alert",
            "provider": "ResQIntel Meteorological Simulator (Fallback)",
            "status": "FALLBACK"
        }
