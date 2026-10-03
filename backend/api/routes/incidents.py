from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from backend.core.database import get_db
from backend.models.all_models import (
    Incident, IncidentReport, IncidentMedia, IncidentTimeline, 
    AIAnalysis, AIRecommendation, ResourceAssignment, User, Resource
)
from backend.schemas.all_schemas import (
    IncidentStatusUpdate, IncidentVerificationRequest, IncidentUpdate
)
from backend.api.deps import get_required_user, get_current_user, require_roles, log_audit_event
from backend.core.websocket_manager import ws_manager

router = APIRouter(prefix="/incidents", tags=["Incidents & Operational Lifecycle"])

@router.get("/")
async def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    incident_type: Optional[str] = None,
    verification: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    query = select(Incident).where(Incident.is_active == True).order_by(desc(Incident.created_at))
    
    if status:
        query = query.where(Incident.status == status)
    if severity:
        query = query.where(Incident.severity_class == severity)
    if incident_type:
        query = query.where(Incident.incident_type == incident_type)
    if verification:
        query = query.where(Incident.verification_status == verification)
        
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    incidents = result.scalars().all()
    
    # Format list
    output = []
    for inc in incidents:
        output.append({
            "id": inc.id,
            "incident_number": inc.incident_number,
            "title": inc.title,
            "description": inc.description,
            "incident_type": inc.incident_type,
            "status": inc.status,
            "severity_score": inc.severity_score,
            "severity_class": inc.severity_class,
            "priority_score": inc.priority_score,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "address": inc.address,
            "city": inc.city,
            "state": inc.state,
            "affected_people_estimate": inc.affected_people_estimate,
            "injuries_count": inc.injuries_count,
            "fatalities_count": inc.fatalities_count,
            "verification_status": inc.verification_status,
            "is_demo": inc.is_demo,
            "created_at": inc.created_at.isoformat() if inc.created_at else None,
            "updated_at": inc.updated_at.isoformat() if inc.updated_at else None
        })
    return output

@router.get("/{incident_id}")
async def get_incident_detail(
    incident_id: str,
    db: AsyncSession = Depends(get_db)
):
    query = select(Incident).where(Incident.id == incident_id).options(
        selectinload(Incident.reports),
        selectinload(Incident.media),
        selectinload(Incident.timeline),
        selectinload(Incident.analyses),
        selectinload(Incident.recommendations),
        selectinload(Incident.assignments)
    )
    result = await db.execute(query)
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    # Get latest AI analysis
    latest_analysis = incident.analyses[-1] if incident.analyses else None
    
    # Format response
    return {
        "id": incident.id,
        "incident_number": incident.incident_number,
        "title": incident.title,
        "description": incident.description,
        "incident_type": incident.incident_type,
        "status": incident.status,
        "severity_score": incident.severity_score,
        "severity_class": incident.severity_class,
        "priority_score": incident.priority_score,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "address": incident.address,
        "city": incident.city,
        "state": incident.state,
        "radius_meters": incident.radius_meters,
        "affected_people_estimate": incident.affected_people_estimate,
        "injuries_count": incident.injuries_count,
        "fatalities_count": incident.fatalities_count,
        "hazards_description": incident.hazards_description,
        "infrastructure_damage": incident.infrastructure_damage,
        "verification_status": incident.verification_status,
        "verified_at": incident.verified_at.isoformat() if incident.verified_at else None,
        "verification_notes": incident.verification_notes,
        "cluster_id": incident.cluster_id,
        "is_demo": incident.is_demo,
        "created_at": incident.created_at.isoformat() if incident.created_at else None,
        "reports": [
            {
                "id": r.id,
                "report_type": r.report_type,
                "raw_text": r.raw_text,
                "transcript": r.transcript,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "address": r.address,
                "injuries_reported": r.injuries_reported,
                "people_affected": r.people_affected,
                "submitter_name": r.submitter_name if not r.is_anonymous else "Anonymous Citizen",
                "submitter_phone": r.submitter_phone if not r.is_anonymous else None,
                "is_offline_synced": r.is_offline_synced,
                "created_at": r.created_at.isoformat() if r.created_at else None
            } for r in incident.reports
        ],
        "media": [
            {
                "id": m.id,
                "media_type": m.media_type,
                "file_url": m.file_url,
                "file_name": m.file_name,
                "cv_analysis": m.cv_analysis_json,
                "created_at": m.created_at.isoformat() if m.created_at else None
            } for m in incident.media
        ],
        "timeline": [
            {
                "id": t.id,
                "event_type": t.event_type,
                "title": t.title,
                "description": t.description,
                "previous_status": t.previous_status,
                "new_status": t.new_status,
                "actor_name": t.actor_name,
                "actor_role": t.actor_role,
                "created_at": t.created_at.isoformat() if t.created_at else None
            } for t in incident.timeline
        ],
        "ai_analysis": {
            "classification": latest_analysis.classification if latest_analysis else incident.incident_type,
            "confidence": latest_analysis.confidence if latest_analysis else 0.85,
            "severity_score": latest_analysis.severity_score if latest_analysis else incident.severity_score,
            "severity_class": latest_analysis.severity_class if latest_analysis else incident.severity_class,
            "contributing_factors": latest_analysis.contributing_factors_json if latest_analysis else [],
            "conflicts": latest_analysis.conflicting_signals_json if latest_analysis else {},
            "missing_information": latest_analysis.missing_information_json if latest_analysis else {},
            "agent_executions": latest_analysis.agent_executions_json if latest_analysis else [],
            "model_version": latest_analysis.model_version if latest_analysis else "resqintel-v1.0"
        } if latest_analysis else None,
        "recommendations": [
            {
                "id": rec.id,
                "recommendation_type": rec.recommendation_type,
                "title": rec.title,
                "action": rec.action,
                "rationale": rec.rationale,
                "recommended_resource_ids": rec.recommended_resources_json,
                "priority": rec.priority,
                "is_approved": rec.is_approved,
                "created_at": rec.created_at.isoformat() if rec.created_at else None
            } for rec in incident.recommendations
        ],
        "assignments": [
            {
                "id": a.id,
                "resource_id": a.resource_id,
                "responder_id": a.responder_id,
                "status": a.status,
                "route_distance_km": a.route_distance_km,
                "route_eta_minutes": a.route_eta_minutes,
                "route_geometry": a.route_geometry_geojson,
                "notes": a.notes,
                "created_at": a.created_at.isoformat() if a.created_at else None
            } for a in incident.assignments
        ]
    }

@router.post("/{incident_id}/verify")
async def verify_incident(
    incident_id: str,
    verif: IncidentVerificationRequest,
    request: Request,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER"])),
    db: AsyncSession = Depends(get_db)
):
    """HUMAN IN THE LOOP: Official verification or rejection of emergency incident"""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    prev_status = incident.status
    incident.verification_status = verif.verification_status.upper()
    incident.verified_by_id = user.id
    incident.verified_at = datetime.now(timezone.utc)
    incident.verification_notes = verif.verification_notes

    if verif.confirmed_type:
        incident.incident_type = verif.confirmed_type
    if verif.confirmed_severity:
        incident.severity_class = verif.confirmed_severity

    if verif.verification_status.upper() == "VERIFIED":
        incident.status = "VERIFIED"
    elif verif.verification_status.upper() == "REJECTED":
        incident.status = "CLOSED"

    # Add to timeline
    timeline_event = IncidentTimeline(
        incident_id=incident.id,
        event_type="HUMAN_VERIFICATION",
        title=f"Incident {verif.verification_status.upper()} by Human Operator",
        description=f"Operator {user.full_name} ({user.role}) recorded verification. Notes: {verif.verification_notes or 'Standard protocol confirmation.'}",
        previous_status=prev_status,
        new_status=incident.status,
        actor_id=user.id,
        actor_name=user.full_name,
        actor_role=user.role
    )
    db.add(timeline_event)
    await db.commit()

    # Log audit event
    await log_audit_event(
        db, action="HUMAN_INCIDENT_VERIFICATION", entity_type="INCIDENT", entity_id=incident.id,
        user=user, previous_state={"status": prev_status}, new_state={"status": incident.status, "verification": incident.verification_status},
        request=request
    )

    # Real-time WebSocket broadcast
    await ws_manager.broadcast({
        "event": "INCIDENT_VERIFIED",
        "incident_id": incident.id,
        "verification_status": incident.verification_status,
        "new_status": incident.status,
        "verified_by": user.full_name
    })

    return {
        "status": "SUCCESS",
        "incident_id": incident.id,
        "verification_status": incident.verification_status,
        "new_status": incident.status
    }

@router.post("/{incident_id}/status")
async def update_incident_status(
    incident_id: str,
    status_in: IncidentStatusUpdate,
    request: Request,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER", "RESPONDER"])),
    db: AsyncSession = Depends(get_db)
):
    """Lifecycle transition: REPORTED -> AI_ANALYZING -> PENDING_VERIFICATION -> VERIFIED -> PRIORITIZED -> DISPATCHED -> RESPONDER_EN_ROUTE -> ON_SCENE -> RESOLVED -> CLOSED"""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    prev_status = incident.status
    incident.status = status_in.status.upper()

    timeline_event = IncidentTimeline(
        incident_id=incident.id,
        event_type="STATUS_CHANGE",
        title=f"Status changed to {incident.status}",
        description=status_in.notes or f"Operational status advanced by {user.full_name}.",
        previous_status=prev_status,
        new_status=incident.status,
        actor_id=user.id,
        actor_name=user.full_name,
        actor_role=user.role
    )
    db.add(timeline_event)
    await db.commit()

    await log_audit_event(
        db, action="INCIDENT_STATUS_CHANGE", entity_type="INCIDENT", entity_id=incident.id,
        user=user, previous_state={"status": prev_status}, new_state={"status": incident.status},
        request=request
    )

    # Broadcast real-time update
    await ws_manager.broadcast({
        "event": "INCIDENT_STATUS_UPDATED",
        "incident_id": incident.id,
        "previous_status": prev_status,
        "new_status": incident.status,
        "updated_by": user.full_name
    })

    return {"status": "SUCCESS", "incident_id": incident.id, "current_status": incident.status}
