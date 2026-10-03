import os
from typing import Dict, Any, List
from backend.services.providers.vision_provider import VisionProvider
from backend.core.config import settings

class VisionAgent:
    """Agent responsible for image/video computer vision hazard analysis"""
    
    @classmethod
    async def process(cls, media_urls: List[str]) -> Dict[str, Any]:
        if not media_urls:
            return {
                "status": "NO_MEDIA_ATTACHED",
                "detected_hazards": [],
                "primary_hazard": None,
                "confidence": 0.0,
                "detections": [],
                "agent_metadata": {
                    "agent": "VisionAgent",
                    "status": "SKIPPED_NO_INPUT"
                }
            }
            
        results = []
        for media_url in media_urls:
            # Resolve local file path
            base_filename = os.path.basename(media_url)
            local_path = os.path.join(settings.STORAGE_DIR, "uploads", base_filename)
            
            if not os.path.exists(local_path):
                if os.path.exists(media_url):
                    local_path = media_url
                else:
                    results.append({
                        "status": "FILE_NOT_FOUND",
                        "detected": False,
                        "file_path": media_url,
                        "confidence": 0.0,
                        "detections": []
                    })
                    continue
                        
            analysis = await VisionProvider.analyze_media(local_path)
            results.append(analysis)

        primary = results[0] if results else {}
        status = primary.get("status", "MODEL_UNAVAILABLE")
        
        return {
            "status": status,
            "primary_hazard": primary.get("primary_hazard"),
            "confidence": primary.get("overall_confidence", 0.0),
            "detections": primary.get("detections", []),
            "inferred_damage_level": primary.get("inferred_damage_level", "UNKNOWN"),
            "image_metadata": primary.get("image_metadata"),
            "message": primary.get("message"),
            "media_count": len(media_urls),
            "agent_metadata": {
                "agent": "VisionAgent",
                "version": "2.1.0",
                "provider": primary.get("provider", "VisionProvider")
            }
        }
