from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from backend.core.database import get_db
from backend.models.all_models import (
    Resource, ResourceAssignment, Incident, IncidentTimeline, Responder, User
)
from backend.schemas.all_schemas import (
    ResourceCreate, ResourceAssignmentCreate, ResourceAssignmentStatusUpdate
)
from backend.api.deps import get_required_user, require_roles, log_audit_event
from backend.services.providers.routing_provider import RoutingProvider
from backend.core.websocket_manager import ws_manager

router = APIRouter(prefix="/resources", tags=["Emergency Resources & Fleet Deployment"])

@router.get("/")
async def list_resources(
    resource_type: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Resource).where(Resource.is_active == True)
    if resource_type:
        query = query.where(Resource.resource_type == resource_type)
    if status:
        query = query.where(Resource.status == status)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", status_code=201)
async def create_resource(
    res_in: ResourceCreate,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER"])),
    db: AsyncSession = Depends(get_db)
):
    new_res = Resource(
        resource_name=res_in.resource_name,
        resource_type=res_in.resource_type.upper(),
        latitude=res_in.latitude,
        longitude=res_in.longitude,
        address=res_in.address,
        capacity=res_in.capacity,
        contact_number=res_in.contact_number,
        station_name=res_in.station_name or "Station Central",
        status="AVAILABLE"
    )
    db.add(new_res)
    await db.commit()
    await db.refresh(new_res)
    return new_res

@router.post("/assign")
async def assign_resource_to_incident(
    assign_in: ResourceAssignmentCreate,
    request: Request,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER"])),
    db: AsyncSession = Depends(get_db)
):
    """HUMAN IN THE LOOP: Consequential Dispatcher approval to deploy emergency asset"""
    inc_res = await db.execute(select(Incident).where(Incident.id == assign_in.incident_id))
    incident = inc_res.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    resource = None
    if assign_in.resource_id:
        r_res = await db.execute(select(Resource).where(Resource.id == assign_in.resource_id))
        resource = r_res.scalars().first()
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")

    # Compute road route and ETA
    route_data = {"distance_km": 0.0, "eta_minutes": 0.0, "geometry": None}
    if resource:
        route_data = await RoutingProvider.get_route(
            resource.latitude, resource.longitude,
            incident.latitude, incident.longitude
        )
        # Update resource status
        resource.status = "ASSIGNED"
        resource.current_incident_id = incident.id

    assignment = ResourceAssignment(
        incident_id=incident.id,
        resource_id=resource.id if resource else None,
        responder_id=assign_in.responder_id,
        status="APPROVED", # Human dispatcher approved
        dispatch_time=datetime.now(timezone.utc),
        route_distance_km=route_data.get("distance_km"),
        route_eta_minutes=route_data.get("eta_minutes"),
        route_geometry_geojson=route_data.get("geometry"),
        assigned_by_id=user.id,
        notes=assign_in.notes
    )
    db.add(assignment)

    # Advance incident status if needed
    if incident.status in ["REPORTED", "PENDING_VERIFICATION", "VERIFIED", "PRIORITIZED"]:
        incident.status = "DISPATCHED"

    # Add to timeline
    unit_name = resource.resource_name if resource else "Response Unit"
    timeline_event = IncidentTimeline(
        incident_id=incident.id,
        event_type="DISPATCH_APPROVED",
        title=f"Deployment Authorized: {unit_name}",
        description=f"Dispatcher {user.full_name} approved deployment. Route: {route_data.get('distance_km')} km, Estimated ETA: {route_data.get('eta_minutes')} min.",
        previous_status="VERIFIED",
        new_status=incident.status,
        actor_name=user.full_name,
        actor_role=user.role
    )
    db.add(timeline_event)
    await db.commit()

    # Log audit event
    await log_audit_event(
        db, action="RESOURCE_DISPATCH_AUTHORIZED", entity_type="RESOURCE_ASSIGNMENT", entity_id=assignment.id,
        user=user, new_state={"resource_id": resource.id if resource else None, "incident_id": incident.id},
        request=request
    )

    # Real-time WebSocket broadcast
    await ws_manager.broadcast({
        "event": "RESOURCE_DISPATCHED",
        "incident_id": incident.id,
        "resource_name": unit_name,
        "route_distance_km": route_data.get("distance_km"),
        "route_eta_minutes": route_data.get("eta_minutes")
    })

    return {
        "status": "DISPATCHED",
        "assignment_id": assignment.id,
        "resource_name": unit_name,
        "route": route_data
    }

@router.put("/assignments/{assignment_id}/status")
async def update_assignment_status(
    assignment_id: str,
    status_in: ResourceAssignmentStatusUpdate,
    request: Request,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER", "RESPONDER"])),
    db: AsyncSession = Depends(get_db)
):
    """Tracks: APPROVED -> DISPATCHED -> ARRIVED (ON_SCENE) -> RELEASED"""
    res = await db.execute(select(ResourceAssignment).where(ResourceAssignment.id == assignment_id))
    assignment = res.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    new_status = status_in.status.upper()
    assignment.status = new_status
    if status_in.notes:
        assignment.notes = status_in.notes

    if new_status == "ARRIVED":
        assignment.arrival_time = datetime.now(timezone.utc)
        # Advance incident to ON_SCENE if not already
        inc_res = await db.execute(select(Incident).where(Incident.id == assignment.incident_id))
        inc = inc_res.scalars().first()
        if inc and inc.status != "RESOLVED":
            inc.status = "ON_SCENE"

    elif new_status == "RELEASED":
        assignment.completion_time = datetime.now(timezone.utc)
        # Set resource back to AVAILABLE
        if assignment.resource_id:
            r_res = await db.execute(select(Resource).where(Resource.id == assignment.resource_id))
            resource = r_res.scalars().first()
            if resource:
                resource.status = "AVAILABLE"
                resource.current_incident_id = None

    await db.commit()

    # WebSocket broadcast
    await ws_manager.broadcast({
        "event": "ASSIGNMENT_STATUS_CHANGED",
        "assignment_id": assignment.id,
        "status": new_status
    })

    return {"status": "UPDATED", "assignment_status": new_status}
