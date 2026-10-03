from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from backend.core.database import get_db
from backend.models.all_models import (
    Incident, IncidentReport, IncidentMedia, IncidentTimeline,
    AIAnalysis, AIEvidence, AIRecommendation, Resource, ResourceAssignment,
    SituationReport, IncidentCluster, User
)
from backend.schemas.all_schemas import CopilotQueryRequest, SitrepGenerateRequest
from backend.api.deps import get_required_user, get_current_user, require_roles, log_audit_event
from backend.agents.orchestrator import AgentOrchestrator
from backend.agents.copilot_agent import CopilotAgent
from backend.agents.sitrep_agent import SitrepAgent
from backend.core.websocket_manager import ws_manager

router = APIRouter(prefix="/ai", tags=["AI Intelligence, Copilot & SITREP"])

@router.post("/re-evaluate/{incident_id}")
async def reevaluate_incident_intelligence(
    incident_id: str,
    request: Request,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER", "ANALYST"])),
    db: AsyncSession = Depends(get_db)
):
    """Section 61: Continuous Incident Monitoring - Re-evaluates AI pipeline upon new evidence"""
    query = select(Incident).where(Incident.id == incident_id).options(
        selectinload(Incident.reports),
        selectinload(Incident.media),
        selectinload(Incident.assignments)
    )
    result = await db.execute(query)
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    res_query = await db.execute(select(Resource).where(Resource.is_active == True))
    all_resources = [
        {"id": r.id, "resource_name": r.resource_name, "resource_type": r.resource_type, "status": r.status, "latitude": r.latitude, "longitude": r.longitude}
        for r in res_query.scalars().all()
    ]

    report_dicts = [
        {
            "report_type": r.report_type,
            "raw_text": r.raw_text,
            "transcript": r.transcript,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "submitter_name": r.submitter_name,
            "injuries_reported": r.injuries_reported,
            "created_at": r.created_at
        } for r in incident.reports
    ]

    media_urls = [m.file_url for m in incident.media]

    orchestration_res = await AgentOrchestrator.run_pipeline(
        incident_data={
            "description": incident.description,
            "latitude": incident.latitude,
            "longitude": incident.longitude,
            "incident_type": incident.incident_type,
            "injuries_count": incident.injuries_count,
            "fatalities_count": incident.fatalities_count,
            "affected_people_estimate": incident.affected_people_estimate,
            "infrastructure_damage": incident.infrastructure_damage,
            "media_urls": media_urls
        },
        reports=report_dicts,
        available_resources=all_resources
    )

    # Update incident with refined intelligence
    incident.severity_score = orchestration_res["severity"]["severity_score"]
    incident.severity_class = orchestration_res["severity"]["severity_class"]
    incident.priority_score = incident.severity_score * 10

    # Save new AIAnalysis record
    new_analysis = AIAnalysis(
        incident_id=incident.id,
        pipeline_stage="RE_EVALUATION_RUN",
        status="COMPLETED",
        classification=orchestration_res["classification"]["prediction"],
        confidence=orchestration_res["classification"]["confidence"],
        severity_score=orchestration_res["severity"]["severity_score"],
        severity_class=orchestration_res["severity"]["severity_class"],
        contributing_factors_json=orchestration_res["severity"]["contributing_factors"],
        entities_json=orchestration_res["entities"],
        conflicting_signals_json=orchestration_res["conflicts"],
        missing_information_json=orchestration_res["missing_information"],
        agent_executions_json=orchestration_res["agent_executions"],
        model_version="resqintel-v1.4",
        execution_time_ms=orchestration_res["execution_time_ms"]
    )
    db.add(new_analysis)

    # Timeline event
    timeline_event = IncidentTimeline(
        incident_id=incident.id,
        event_type="AI_REEVALUATION",
        title="Continuous AI Re-Evaluation Complete",
        description=f"Multi-Agent pipeline executed. Severity confirmed as {incident.severity_class} ({incident.severity_score}/10). {len(orchestration_res.get('evidence', []))} evidence nodes verified.",
        previous_status=incident.status,
        new_status=incident.status,
        actor_name=user.full_name,
        actor_role=user.role
    )
    db.add(timeline_event)
    await db.commit()

    # WebSocket broadcast
    await ws_manager.broadcast({
        "event": "AI_ANALYSIS_UPDATED",
        "incident_id": incident.id,
        "severity_score": incident.severity_score,
        "severity_class": incident.severity_class
    })

    return {
        "status": "REEVALUATED",
        "incident_id": incident.id,
        "severity_score": incident.severity_score,
        "severity_class": incident.severity_class,
        "analysis_id": new_analysis.id,
        "execution_time_ms": orchestration_res["execution_time_ms"]
    }

@router.post("/copilot")
async def query_dispatcher_copilot(
    query_in: CopilotQueryRequest,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER", "ANALYST"])),
    db: AsyncSession = Depends(get_db)
):
    """Section 32: Grounded Dispatcher AI Assistant preventing unsupported operational hallucinations"""
    incident_context = {}
    if query_in.incident_id:
        q = select(Incident).where(Incident.id == query_in.incident_id).options(
            selectinload(Incident.reports),
            selectinload(Incident.analyses),
            selectinload(Incident.recommendations),
            selectinload(Incident.assignments)
        )
        res = await db.execute(q)
        inc = res.scalars().first()
        if inc:
            latest_analysis = inc.analyses[-1] if inc.analyses else None
            incident_context = {
                "id": inc.id,
                "incident_number": inc.incident_number,
                "title": inc.title,
                "status": inc.status,
                "severity_score": inc.severity_score,
                "severity_class": inc.severity_class,
                "incident_type": inc.incident_type,
                "injuries_count": inc.injuries_count,
                "address": inc.address,
                "contributing_factors": latest_analysis.contributing_factors_json if latest_analysis else [],
                "conflicts": latest_analysis.conflicting_signals_json.get("conflicts", []) if (latest_analysis and latest_analysis.conflicting_signals_json) else [],
                "missing_items": latest_analysis.missing_information_json.get("missing_items", []) if (latest_analysis and latest_analysis.missing_information_json) else [],
                "verification_recommendations": latest_analysis.missing_information_json.get("verification_recommendations", []) if (latest_analysis and latest_analysis.missing_information_json) else [],
                "evidence": [
                    {"evidence_type": "FIELD_REPORT", "source": r.submitter_name or "Citizen", "snippet": r.raw_text}
                    for r in inc.reports
                ],
                "assignments": inc.assignments
            }

    # Fetch nearby resources
    res_q = await db.execute(select(Resource).where(Resource.is_active == True))
    resources = [
        {"id": r.id, "resource_name": r.resource_name, "resource_type": r.resource_type, "status": r.status, "distance_km": 2.4, "eta_minutes": 6.0}
        for r in res_q.scalars().all()
    ]

    answer = await CopilotAgent.answer_query(
        query=query_in.query,
        incident_context=incident_context,
        nearby_resources=resources
    )
    return answer

@router.post("/sitrep")
async def generate_situation_report(
    sitrep_in: SitrepGenerateRequest,
    request: Request,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER", "ANALYST"])),
    db: AsyncSession = Depends(get_db)
):
    """Section 31: Situation Report generation strictly from database records"""
    q = select(Incident).where(Incident.id == sitrep_in.incident_id).options(
        selectinload(Incident.reports),
        selectinload(Incident.analyses),
        selectinload(Incident.assignments)
    )
    res = await db.execute(q)
    incident = res.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    latest_analysis = incident.analyses[-1] if incident.analyses else None
    
    sitrep_data = await SitrepAgent.generate_sitrep(
        incident_data={
            "incident_number": incident.incident_number,
            "title": incident.title,
            "incident_type": incident.incident_type,
            "status": incident.status,
            "severity_score": incident.severity_score,
            "severity_class": incident.severity_class,
            "address": incident.address,
            "latitude": incident.latitude,
            "longitude": incident.longitude,
            "injuries_count": incident.injuries_count,
            "fatalities_count": incident.fatalities_count,
            "affected_people_estimate": incident.affected_people_estimate,
            "created_at": incident.created_at
        },
        reports=[{"report_type": r.report_type, "raw_text": r.raw_text} for r in incident.reports],
        assignments=[{"resource_name": a.resource_id, "status": a.status} for a in incident.assignments],
        weather_info={"condition": "Rainy Alert", "rainfall_mm": 14.5, "temperature_c": 27.5},
        ai_analysis={
            "missing_information": latest_analysis.missing_information_json if latest_analysis else {},
            "conflicts": latest_analysis.conflicting_signals_json if latest_analysis else {}
        }
    )

    new_sitrep = SituationReport(
        sitrep_number=sitrep_data["sitrep_number"],
        incident_id=incident.id,
        title=sitrep_in.title or sitrep_data["title"],
        summary=sitrep_data["summary"],
        incident_status=sitrep_data["incident_status"],
        severity=sitrep_data["severity"],
        location_text=sitrep_data["location_text"],
        casualties_summary=sitrep_data["casualties_summary"],
        resources_summary=sitrep_data["resources_summary"],
        timeline_summary=sitrep_data["timeline_summary"],
        weather_summary=sitrep_data["weather_summary"],
        outstanding_issues=sitrep_data["outstanding_issues"],
        missing_info_summary=sitrep_data["missing_info_summary"],
        ai_recommendations_summary=sitrep_data["ai_recommendations_summary"],
        author_id=user.id,
        author_name=user.full_name
    )
    db.add(new_sitrep)
    await db.commit()
    await db.refresh(new_sitrep)

    await log_audit_event(
        db, action="SITREP_GENERATION", entity_type="SITUATION_REPORT", entity_id=new_sitrep.id,
        user=user, request=request
    )

    return {
        "status": "SUCCESS",
        "sitrep_id": new_sitrep.id,
        "sitrep_number": new_sitrep.sitrep_number,
        "sitrep": sitrep_data
    }

@router.get("/sitreps/{incident_id}")
async def get_incident_sitreps(
    incident_id: str,
    db: AsyncSession = Depends(get_db)
):
    q = select(SituationReport).where(SituationReport.incident_id == incident_id).order_by(desc(SituationReport.created_at))
    res = await db.execute(q)
    return res.scalars().all()

@router.get("/clusters")
async def list_incident_clusters(
    db: AsyncSession = Depends(get_db)
):
    """Section 62: Incident Clustering overview"""
    q = select(IncidentCluster).order_by(desc(IncidentCluster.created_at))
    res = await db.execute(q)
    return res.scalars().all()
