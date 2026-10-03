from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.services.providers.routing_provider import haversine_distance_km

class DuplicateClusterAgent:
    """Agent evaluating whether incoming reports are duplicates, related cluster events, or separate incidents"""

    @classmethod
    def compute_semantic_similarity(cls, text1: str, text2: str) -> float:
        if not text1 or not text2:
            return 0.0
        try:
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform([text1, text2])
            sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            return float(sim)
        except Exception:
            return 0.2

    @classmethod
    async def evaluate(
        cls, 
        new_text: str, 
        new_lat: float, 
        new_lng: float, 
        new_type: str, 
        existing_incidents: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not existing_incidents:
            return {
                "decision": "SEPARATE_INCIDENT",
                "similarity_score": 0.0,
                "matched_incident_id": None,
                "cluster_candidate": False,
                "rationale": "No existing active incidents in vicinity to correlate.",
                "agent_metadata": {"agent": "DuplicateClusterAgent", "version": "2.1.0"}
            }

        best_match = None
        highest_composite = 0.0
        breakdown = {}

        for inc in existing_incidents:
            inc_id = inc.get("id")
            inc_lat = inc.get("latitude", 0.0)
            inc_lng = inc.get("longitude", 0.0)
            inc_text = f"{inc.get('title', '')} {inc.get('description', '')}"
            inc_type = inc.get("incident_type", "")

            # 1. Geographic Proximity score (0.0 to 1.0)
            dist_km = haversine_distance_km(new_lat, new_lng, inc_lat, inc_lng)
            # If within 500m -> 1.0, 1km -> 0.8, 3km -> 0.4, >5km -> 0.0
            geo_score = max(0.0, 1.0 - (dist_km / 3.0))

            # 2. Semantic Similarity score
            sem_score = cls.compute_semantic_similarity(new_text, inc_text)

            # 3. Incident Type Match
            type_score = 1.0 if new_type.lower() == inc_type.lower() or "emergency" in new_type.lower() else 0.3

            # 4. Temporal Proximity (incidents are currently active)
            temporal_score = 1.0

            # Composite weighted fusion
            composite = (0.40 * geo_score) + (0.35 * sem_score) + (0.15 * type_score) + (0.10 * temporal_score)

            if composite > highest_composite:
                highest_composite = composite
                best_match = inc_id
                breakdown = {
                    "distance_km": round(dist_km, 2),
                    "geographic_proximity_score": round(geo_score, 2),
                    "semantic_similarity_score": round(sem_score, 2),
                    "type_score": round(type_score, 2),
                    "composite_score": round(composite, 2),
                    "matched_title": inc.get("title")
                }

        # Decision thresholds
        if highest_composite >= 0.72:
            decision = "SAME_INCIDENT"
            rationale = f"High multimodal correlation ({highest_composite:.2f}) with incident '{breakdown.get('matched_title')}'. Proximity {breakdown.get('distance_km')}km with matching semantic disaster signatures."
            is_cluster = True
        elif highest_composite >= 0.42:
            decision = "RELATED_INCIDENT"
            rationale = f"Moderate correlation ({highest_composite:.2f}) with nearby event '{breakdown.get('matched_title')}'. May constitute an escalating broader emergency cluster."
            is_cluster = True
        else:
            decision = "SEPARATE_INCIDENT"
            rationale = "Low correlation with existing active incidents. Distinct spatial and contextual signature."
            is_cluster = False

        return {
            "decision": decision,
            "similarity_score": round(highest_composite, 2),
            "matched_incident_id": best_match if (decision != "SEPARATE_INCIDENT") else None,
            "cluster_candidate": is_cluster,
            "metrics": breakdown,
            "rationale": rationale,
            "agent_metadata": {"agent": "DuplicateClusterAgent", "version": "2.1.0"}
        }
