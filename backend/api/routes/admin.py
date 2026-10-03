from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional, Dict, Any

from backend.core.database import get_db
from backend.models.all_models import (
    User, AuditLog, Incident, Resource, Responder, SituationReport
)
from backend.api.deps import require_roles, log_audit_event

router = APIRouter(prefix="/admin", tags=["Admin Operations, Auditing & Analytics"])

@router.get("/users")
async def list_all_users(
    user: User = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).order_by(desc(User.created_at)))
    users = res.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "phone": u.phone,
            "organization": u.organization,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None
        } for u in users
    ]

@router.put("/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    new_role: str,
    request: Request,
    admin_user: User = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    role_clean = new_role.upper()
    if role_clean not in ["ADMIN", "DISPATCHER", "ANALYST", "RESPONDER", "CITIZEN"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    res = await db.execute(select(User).where(User.id == user_id))
    target_user = res.scalars().first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = target_user.role
    target_user.role = role_clean
    await db.commit()

    await log_audit_event(
        db, action="USER_ROLE_CHANGED", entity_type="USER", entity_id=target_user.id,
        user=admin_user, previous_state={"role": old_role}, new_state={"role": role_clean},
        request=request
    )

    return {"status": "SUCCESS", "user_id": target_user.id, "new_role": role_clean}

@router.get("/audit-logs")
async def list_audit_logs(
    action: Optional[str] = None,
    limit: int = 100,
    user: User = Depends(require_roles(["ADMIN", "ANALYST"])),
    db: AsyncSession = Depends(get_db)
):
    """Section 47: Immutable audit trail inspection"""
    query = select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit)
    if action:
        query = query.where(AuditLog.action == action)
    res = await db.execute(query)
    logs = res.scalars().all()
    return [
        {
            "id": l.id,
            "user_email": l.user_email,
            "user_role": l.user_role,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "previous_state": l.previous_state_json,
            "new_state": l.new_state_json,
            "ip_address": l.ip_address,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None
        } for l in logs
    ]

@router.get("/analytics")
async def get_system_analytics(
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER", "ANALYST"])),
    db: AsyncSession = Depends(get_db)
):
    """Section 60: Real analytics aggregated directly from PostgreSQL/database records"""
    inc_count_res = await db.execute(select(func.count(Incident.id)))
    total_incidents = inc_count_res.scalar() or 0

    if total_incidents == 0:
        return {
            "has_data": False,
            "message": "Insufficient data in operational store."
        }

    # Incident Types distribution
    type_query = select(Incident.incident_type, func.count(Incident.id)).group_by(Incident.incident_type)
    type_res = await db.execute(type_query)
    type_distribution = [{"name": row[0], "count": row[1]} for row in type_res.all()]

    # Severity distribution
    sev_query = select(Incident.severity_class, func.count(Incident.id)).group_by(Incident.severity_class)
    sev_res = await db.execute(sev_query)
    severity_distribution = [{"name": row[0], "count": row[1]} for row in sev_res.all()]

    # Status distribution
    status_query = select(Incident.status, func.count(Incident.id)).group_by(Incident.status)
    status_res = await db.execute(status_query)
    status_distribution = [{"name": row[0], "count": row[1]} for row in status_res.all()]

    # Resource availability
    res_avail_query = select(Resource.status, func.count(Resource.id)).group_by(Resource.status)
    res_avail_res = await db.execute(res_avail_query)
    resource_status = [{"name": row[0], "count": row[1]} for row in res_avail_res.all()]

    # Casualty totals
    casualty_query = select(
        func.sum(Incident.injuries_count),
        func.sum(Incident.fatalities_count),
        func.sum(Incident.affected_people_estimate)
    )
    cas_res = await db.execute(casualty_query)
    row = cas_res.first()
    total_injuries = row[0] or 0
    total_fatalities = row[1] or 0
    total_affected = row[2] or 0

    return {
        "has_data": True,
        "total_incidents": total_incidents,
        "total_injuries": total_injuries,
        "total_fatalities": total_fatalities,
        "total_affected": total_affected,
        "type_distribution": type_distribution,
        "severity_distribution": severity_distribution,
        "status_distribution": status_distribution,
        "resource_status": resource_status
    }
