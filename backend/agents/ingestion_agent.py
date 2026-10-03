from typing import Dict, Any

class IngestionAgent:
    """Agent responsible for validating, normalizing, and standardizing incoming emergency inputs"""
    
    @classmethod
    async def process(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        raw_text = payload.get("description") or payload.get("raw_text") or ""
        transcript = payload.get("voice_transcript") or payload.get("transcript") or ""
        
        # Combined text narrative
        combined_text = raw_text
        if transcript and transcript != raw_text:
            combined_text = f"{raw_text}. Voice report: {transcript}".strip(". ")
            
        lat = float(payload.get("latitude", 0.0))
        lng = float(payload.get("longitude", 0.0))
        
        normalized = {
            "source_type": payload.get("report_type", "CITIZEN"),
            "text": combined_text.strip(),
            "has_voice": bool(transcript or payload.get("audio_url")),
            "has_media": bool(payload.get("media_urls")),
            "media_urls": payload.get("media_urls", []),
            "latitude": round(lat, 6),
            "longitude": round(lng, 6),
            "injuries_reported": int(payload.get("injuries_reported") or 0),
            "people_affected": int(payload.get("people_affected") or 0),
            "hazards": payload.get("hazards") or "",
            "damage": payload.get("damage") or "",
            "is_anonymous": bool(payload.get("is_anonymous", False)),
            "agent_metadata": {
                "agent": "IngestionAgent",
                "version": "1.0.0",
                "status": "NORMALIZED"
            }
        }
        return normalized
