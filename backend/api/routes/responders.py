from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from datetime import datetime, timezone
from typing import List, Optional

from backend.core.database import get_db
from backend.models.all_models import Responder, ResourceAssignment, Incident, IncidentTimeline, User
from backend.schemas.all_schemas import ResponderStatusUpdate, ResponderCreate
from backend.api.deps import get_required_user, require_roles
from backend.core.websocket_manager import ws_manager

router = APIRouter(prefix="/responders", tags=["Responder Field Coordination"])

@router.get("/")
async def list_responders(
    status: Optional[str] = None,
    specialization: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Responder)
    if status:
        query = query.where(Responder.status == status)
    if specialization:
        query = query.where(Responder.specialization == specialization)
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/my-assignment")
async def get_my_assignment(
    user: User = Depends(require_roles(["RESPONDER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve currently active incident dispatched to the logged-in responder"""
    resp_res = await db.execute(select(Responder).where(Responder.user_id == user.id))
    responder = resp_res.scalars().first()
    if not responder or not responder.current_incident_id:
        return {"assigned": False, "incident": None}

    inc_res = await db.execute(select(Incident).where(Incident.id == responder.current_incident_id))
    incident = inc_res.scalars().first()
    return {
        "assigned": True,
        "responder": responder,
        "incident": incident
    }

@router.post("/heartbeat")
async def responder_heartbeat(
    status_in: ResponderStatusUpdate,
    user: User = Depends(require_roles(["RESPONDER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Updates responder live telemetry, GPS coordinates, and duty status"""
    resp_res = await db.execute(select(Responder).where(Responder.user_id == user.id))
    responder = resp_res.scalars().first()
    if not responder:
        # Auto-create responder profile if none exists for this user
        responder = Responder(
            user_id=user.id,
            responder_name=user.full_name,
            badge_number=f"BDG-{user.id[:6].upper()}",
            specialization="Rapid Emergency Tactical Responder",
            status=status_in.status.upper()
        )
        db.add(responder)

    responder.status = status_in.status.upper()
    if status_in.latitude is not None:
        responder.latitude = status_in.latitude
    if status_in.longitude is not None:
        responder.longitude = status_in.longitude
    responder.last_heartbeat = datetime.now(timezone.utc)

    await db.commit()

    # Broadcast position update to dispatchers
    await ws_manager.broadcast_to_role("DISPATCHER", {
        "event": "RESPONDER_LOCATION_UPDATE",
        "responder_id": responder.id,
        "responder_name": responder.responder_name,
        "latitude": responder.latitude,
        "longitude": responder.longitude,
        "status": responder.status
    })

    return {"status": "SUCCESS", "current_duty_status": responder.status}
