import time
from datetime import datetime, timezone
from typing import Dict, Any, List

from backend.agents.ingestion_agent import IngestionAgent
from backend.agents.nlp_agent import NLPAgent
from backend.agents.vision_agent import VisionAgent
from backend.agents.geoint_agent import GeoIntAgent
from backend.agents.duplicate_cluster_agent import DuplicateClusterAgent
from backend.agents.evidence_fusion_agent import EvidenceFusionAgent
from backend.agents.conflict_agent import ConflictAgent
from backend.agents.missing_info_agent import MissingInformationAgent
from backend.agents.severity_agent import SeverityAgent
from backend.agents.resource_agent import ResourceAgent
from backend.agents.routing_agent import RoutingAgent
from backend.agents.recommendation_agent import RecommendationAgent

class AgentOrchestrator:
    """Central Multi-Agent Emergency Orchestrator executing the complete pipeline"""

    @classmethod
    async def run_pipeline(
        cls, 
        incident_data: Dict[str, Any], 
        reports: List[Dict[str, Any]], 
        available_resources: List[Dict[str, Any]] = None,
        existing_incidents: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        agent_executions = []
        available_resources = available_resources or []
        existing_incidents = existing_incidents or []

        # 1. Ingestion Agent
        try:
            t0 = time.time()
            ingestion_res = await IngestionAgent.process(incident_data)
            agent_executions.append({
                "agent_name": "IngestionAgent",
                "status": "COMPLETED",
                "execution_ms": int((time.time() - t0) * 1000),
                "model_version": "1.0.0"
            })
        except Exception as e:
            ingestion_res = {"text": incident_data.get("description", ""), "latitude": incident_data.get("latitude", 0), "longitude": incident_data.get("longitude", 0)}
            agent_executions.append({"agent_name": "IngestionAgent", "status": "DEGRADED", "error": str(e)})

        # 2. NLP Agent
        combined_text = ingestion_res.get("text", "")
        try:
            t0 = time.time()
            nlp_res = await NLPAgent.process(combined_text)
            agent_executions.append({
                "agent_name": "NLPAgent",
                "status": "COMPLETED",
                "execution_ms": int((time.time() - t0) * 1000),
                "confidence": nlp_res["classification"]["confidence"],
                "prediction": nlp_res["classification"]["prediction"],
                "model_version": nlp_res["classification"]["model_version"]
            })
        except Exception as e:
            nlp_res = {"classification": {"prediction": "Emergency", "confidence": 0.5}, "entities": {}}
            agent_executions.append({"agent_name": "NLPAgent", "status": "DEGRADED", "error": str(e)})

        # 3. Vision Agent
        media_urls = ingestion_res.get("media_urls", [])
        try:
            t0 = time.time()
            vision_res = await VisionAgent.process(media_urls)
            agent_executions.append({
                "agent_name": "VisionAgent",
                "status": vision_res.get("status", "COMPLETED"),
                "execution_ms": int((time.time() - t0) * 1000),
                "model_version": "2.0.0"
            })
        except Exception as e:
            vision_res = {"status": "UNAVAILABLE", "detections": []}
            agent_executions.append({"agent_name": "VisionAgent", "status": "UNAVAILABLE", "error": str(e)})

        # 4. GeoInt Agent
        lat = ingestion_res.get("latitude", 0.0)
        lng = ingestion_res.get("longitude", 0.0)
        try:
            t0 = time.time()
            geoint_res = await GeoIntAgent.process(lat, lng)
            agent_executions.append({
                "agent_name": "GeoIntAgent",
                "status": "COMPLETED",
                "execution_ms": int((time.time() - t0) * 1000),
                "model_version": "1.2.0"
            })
        except Exception as e:
            geoint_res = {"weather": {}, "spatial_impact": {}}
            agent_executions.append({"agent_name": "GeoIntAgent", "status": "DEGRADED", "error": str(e)})

        # 5. Duplicate & Clustering Agent
        try:
            t0 = time.time()
            clustering_res = await DuplicateClusterAgent.evaluate(
                new_text=combined_text,
                new_lat=lat,
                new_lng=lng,
                new_type=nlp_res["classification"]["prediction"],
                existing_incidents=existing_incidents
            )
            agent_executions.append({
                "agent_name": "DuplicateClusterAgent",
                "status": "COMPLETED",
                "execution_ms": int((time.time() - t0) * 1000),
                "prediction": clustering_res["decision"],
                "model_version": "2.1.0"
            })
        except Exception as e:
            clustering_res = {"decision": "SEPARATE_INCIDENT", "rationale": "Clustering fallback"}
            agent_executions.append({"agent_name": "DuplicateClusterAgent", "status": "DEGRADED", "error": str(e)})

        # 6. Conflict Detection Agent
        try:
            t0 = time.time()
            conflict_res = await ConflictAgent.process(reports)
            agent_executions.append({
                "agent_name": "ConflictAgent",
                "status": "COMPLETED",
                "execution_ms": int((time.time() - t0) * 1000),
                "model_version": "1.1.0"
            })
        except Exception as e:
            conflict_res = {"has_conflict": False, "conflicts": []}
            agent_executions.append({"agent_name": "ConflictAgent", "status": "DEGRADED", "error": str(e)})

        # 7. Missing Information Agent
        try:
            t0 = time.time()
            missing_info_res = await MissingInformationAgent.process(incident_data, reports)
            agent_executions.append({
                "agent_name": "MissingInformationAgent",
                "status": "COMPLETED",
                "execution_ms": int((time.time() - t0) * 1000),
                "model_version": "1.0.0"
            })
        except Exception as e:
            missing_info_res = {"missing_items": [], "checklist": []}
            agent_executions.append({"agent_name": "MissingInformationAgent", "status": "DEGRADED", "error": str(e)})

        # 8. Evidence Fusion Agent
        try:
            t0 = time.time()
            evidence_res = await EvidenceFusionAgent.process(
                reports=reports,
                weather_info=geoint_res.get("weather", {}),
                geoint_info=geoint_res,
                cv_info=vision_res
            )
            agent_executions.append({
                "agent_name": "EvidenceFusionAgent",
                "status": "COMPLETED",
                "execution_ms": int((time.time() - t0) * 1000),
                "model_version": "1.5.0"
            })
        except Exception as e:
            evidence_res = {"evidence": []}
            agent_executions.append({"agent_name": "EvidenceFusionAgent", "status": "DEGRADED", "error": str(e)})

        # 9. Severity Engine
        try:
            t0 = time.time()
            injuries = incident_data.get("injuries_count", 0) or nlp_res.get("entities", {}).get("injuries", 0)
            fatalities = incident_data.get("fatalities_count", 0) or nlp_res.get("entities", {}).get("fatalities", 0)
            people_affected = incident_data.get("affected_people_estimate", 0) or nlp_res.get("entities", {}).get("people_affected", 0)
            has_infra_damage = bool(incident_data.get("infrastructure_damage") or nlp_res.get("entities", {}).get("infrastructure_damage"))
            
            severity_res = await SeverityAgent.process(
                incident_type=nlp_res["classification"]["prediction"],
                injuries=injuries,
                fatalities=fatalities,
                people_affected=people_affected,
                has_infra_damage=has_infra_damage,
                weather_info=geoint_res.get("weather", {}),
                report_count=len(reports) or 1,
                cv_info=vision_res
            )
            agent_executions.append({
                "agent_name": "SeverityAgent",
                "status": "COMPLETED",
                "execution_ms": int((time.time() - t0) * 1000),
                "prediction": f"{severity_res['severity_class']} ({severity_res['severity_score']}/10)",
                "model_version": severity_res["model_version"]
            })
        except Exception as e:
            severity_res = {"severity_score": 5.0, "severity_class": "MEDIUM", "contributing_factors": []}
            agent_executions.append({"agent_name": "SeverityAgent", "status": "DEGRADED", "error": str(e)})

        # 10. Resource Matching Agent
        try:
            t0 = time.time()
            matched_resources = await ResourceAgent.match_resources(
                incident_lat=lat,
                incident_lng=lng,
                incident_type=nlp_res["classification"]["prediction"],
                injuries=injuries,
                available_resources=available_resources
            )
            agent_executions.append({
                "agent_name": "ResourceAgent",
                "status": "COMPLETED",
                "execution_ms": int((time.time() - t0) * 1000),
                "model_version": "1.0.0"
            })
        except Exception as e:
            matched_resources = []
            agent_executions.append({"agent_name": "ResourceAgent", "status": "DEGRADED", "error": str(e)})

        # 11. Routing Agent
        top_route = None
        if matched_resources:
            try:
                t0 = time.time()
                first_res = matched_resources[0]
                # Match against origin resource coords
                orig_res = next((r for r in available_resources if r.get("id") == first_res.get("resource_id")), None)
                if orig_res:
                    routing_res = await RoutingAgent.compute_routes(
                        origin_lat=orig_res["latitude"],
                        origin_lng=orig_res["longitude"],
                        dest_lat=lat,
                        dest_lng=lng
                    )
                    top_route = routing_res.get("primary_route")
                    agent_executions.append({
                        "agent_name": "RoutingAgent",
                        "status": "COMPLETED",
                        "execution_ms": int((time.time() - t0) * 1000),
                        "model_version": "1.2.0"
                    })
            except Exception as e:
                agent_executions.append({"agent_name": "RoutingAgent", "status": "UNAVAILABLE", "error": str(e)})

        # 12. Recommendation Agent
        try:
            t0 = time.time()
            recommendations = await RecommendationAgent.generate_recommendations(
                incident_type=nlp_res["classification"]["prediction"],
                severity_class=severity_res["severity_class"],
                injuries=injuries,
                matched_resources=matched_resources,
                conflicts=conflict_res.get("conflicts", [])
            )
            agent_executions.append({
                "agent_name": "RecommendationAgent",
                "status": "COMPLETED",
                "execution_ms": int((time.time() - t0) * 1000),
                "model_version": "1.0.0"
            })
        except Exception as e:
            recommendations = []
            agent_executions.append({"agent_name": "RecommendationAgent", "status": "DEGRADED", "error": str(e)})

        total_execution_ms = int((time.time() - start_time) * 1000)

        return {
            "status": "COMPLETED",
            "pipeline": "ResQIntel Multi-Agent Pipeline",
            "execution_time_ms": total_execution_ms,
            "classification": nlp_res["classification"],
            "entities": nlp_res["entities"],
            "vision": vision_res,
            "geoint": geoint_res,
            "clustering": clustering_res,
            "conflicts": conflict_res,
            "missing_information": missing_info_res,
            "evidence": evidence_res.get("evidence", []),
            "severity": severity_res,
            "matched_resources": matched_resources,
            "primary_route": top_route,
            "recommendations": recommendations,
            "agent_executions": agent_executions,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
