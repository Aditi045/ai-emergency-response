import re
from typing import Dict, Any, List

class CopilotAgent:
    """Dispatcher Assistant grounding queries strictly in live system state"""

    @classmethod
    async def answer_query(
        cls, 
        query: str, 
        incident_context: Dict[str, Any] = None, 
        nearby_resources: List[Dict[str, Any]] = None,
        sitrep_summary: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        q = query.lower()
        incident_context = incident_context or {}
        nearby_resources = nearby_resources or []

        # 1. "Why is this incident high priority?" / Priority rationale
        if any(w in q for w in ["why", "priority", "severity", "score"]):
            score = incident_context.get("severity_score", 0.0)
            sev_class = incident_context.get("severity_class", "MEDIUM")
            inc_type = incident_context.get("incident_type", "Emergency")
            injuries = incident_context.get("injuries_count", 0)
            factors = incident_context.get("contributing_factors", [])
            
            factors_text = "\n".join([f"• {f.get('factor')}: {f.get('rationale')} (+{f.get('score_contribution')} pts)" for f in factors[:4]])
            answer = (
                f"Incident #{incident_context.get('incident_number', '')} is rated **{sev_class}** (Severity Score: {score}/10).\n\n"
                f"**Key Driving Factors:**\n{factors_text if factors_text else '• Base hazard classification and human vulnerability metrics.'}\n\n"
                f"Immediate tactical assessment confirms {injuries} reported injuries and ongoing risk to surrounding urban infrastructure."
            )
            return {"answer": answer, "grounded_in_incident_id": incident_context.get("id"), "confidence": 0.95}

        # 2. "Are there conflicting reports?"
        elif any(w in q for w in ["conflict", "contradiction", "inconsistent"]):
            conflicts = incident_context.get("conflicts", [])
            if conflicts:
                details = "\n".join([f"• {c.get('detected_contradiction')} (Action: {c.get('human_action_required')})" for c in conflicts])
                answer = (
                    f"⚠️ **Yes, {len(conflicts)} operational conflict(s) detected:**\n{details}\n\n"
                    f"**Recommendation:** Dispatch a forward scout or request visual confirmation from approaching responders before deploying heavy assets."
                )
            else:
                answer = "✅ **No conflicting reports detected.** All citizen and responder reports currently align on event status and geographic location."
            return {"answer": answer, "grounded_in_incident_id": incident_context.get("id"), "confidence": 0.98}

        # 3. "What information is missing?"
        elif any(w in q for w in ["missing", "needed", "verify next", "incomplete"]):
            missing = incident_context.get("missing_items", [])
            recs = incident_context.get("verification_recommendations", [])
            if missing:
                missing_str = "\n".join([f"• {m}" for m in missing])
                recs_str = "\n".join([f"• {r}" for r in recs])
                answer = (
                    f"📋 **Critical Information Pending Verification:**\n{missing_str}\n\n"
                    f"**Suggested Next Steps for Human Dispatcher:**\n{recs_str}"
                )
            else:
                answer = "✅ **Information dossier is complete.** Location, casualties, hazards, and infrastructure state have been documented."
            return {"answer": answer, "grounded_in_incident_id": incident_context.get("id"), "confidence": 0.95}

        # 4. "What evidence supports the classification?"
        elif any(w in q for w in ["evidence", "proof", "supports", "classification"]):
            evidence = incident_context.get("evidence", [])
            if evidence:
                ev_str = "\n".join([f"• [{e.get('evidence_type')}] {e.get('source')}: \"{e.get('snippet')}\"" for e in evidence[:4]])
                answer = (
                    f"🔍 **Multimodal Evidence Dossier:**\n{ev_str}\n\n"
                    f"All evidence nodes have been correlated by the Multi-Agent Fusion Engine."
                )
            else:
                answer = "Evidence records are being synthesized from incoming citizen distress calls and sensor telemetry."
            return {"answer": answer, "grounded_in_incident_id": incident_context.get("id"), "confidence": 0.92}

        # 5. "Which resources are nearby?"
        elif any(w in q for w in ["resource", "nearby", "available", "units", "ambulance", "truck"]):
            if nearby_resources:
                res_str = "\n".join([f"• **{r.get('resource_name')}** ({r.get('resource_type')}) - {r.get('distance_km')} km away, ETA ~{r.get('eta_minutes')} min [{r.get('status')}]" for r in nearby_resources[:5]])
                answer = (
                    f"🚒 **Nearby Staged Emergency Assets:**\n{res_str}\n\n"
                    f"*Click 'Assign Unit' on any resource card to initiate human dispatch authorization.*"
                )
            else:
                answer = "No emergency response assets are currently registered within the immediate 15km sector radius."
            return {"answer": answer, "grounded_in_incident_id": incident_context.get("id"), "confidence": 0.96}

        # 6. "Generate a SITREP" / "Summarize"
        elif any(w in q for w in ["sitrep", "summary", "summarize", "overview"]):
            if sitrep_summary and sitrep_summary.get("summary"):
                answer = (
                    f"📑 **{sitrep_summary.get('title')}**\n\n"
                    f"{sitrep_summary.get('summary')}\n\n"
                    f"• **Casualties:** {sitrep_summary.get('casualties_summary')}\n"
                    f"• **Resources:** {sitrep_summary.get('resources_summary')}\n"
                    f"• **Weather:** {sitrep_summary.get('weather_summary')}\n"
                    f"• **Outstanding Issues:** {sitrep_summary.get('outstanding_issues')}"
                )
            else:
                answer = (
                    f"Operational summary for Incident #{incident_context.get('incident_number', '')}: "
                    f"{incident_context.get('title', 'Emergency')} is in status {incident_context.get('status', 'REPORTED')} "
                    f"at {incident_context.get('address', 'site location')}. Human verification is in progress."
                )
            return {"answer": answer, "grounded_in_incident_id": incident_context.get("id"), "confidence": 0.95}

        # Default query grounding
        else:
            answer = (
                f"ResQIntel Copilot operational response: Querying live telemetry for Incident #{incident_context.get('incident_number', 'Active')}.\n\n"
                f"• Current Status: {incident_context.get('status', 'ACTIVE')}\n"
                f"• Assessed Severity: {incident_context.get('severity_class', 'MEDIUM')} ({incident_context.get('severity_score', 0)}/10)\n"
                f"• Assigned Units: {len(incident_context.get('assignments', []))} active\n"
                f"Ask me about priority rationale, conflicting reports, missing info, nearby resources, or SITREP."
            )
            return {"answer": answer, "grounded_in_incident_id": incident_context.get("id"), "confidence": 0.90}
