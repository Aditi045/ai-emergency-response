from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from typing import List, Optional
from datetime import datetime, timezone

from backend.core.database import get_db
from backend.models.all_models import Notification, User
from backend.schemas.all_schemas import GeofenceAlertCreate
from backend.api.deps import get_current_user, require_roles, log_audit_event
from backend.core.websocket_manager import ws_manager

router = APIRouter(prefix="/notifications", tags=["Alerts & Notifications"])

@router.get("/")
async def list_notifications(
    limit: int = 50,
    user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Notification).order_by(desc(Notification.created_at)).limit(limit)
    if user and user.role != "ADMIN":
        query = query.where(
            (Notification.user_id == user.id) | 
            (Notification.target_role == user.role) | 
            (Notification.target_role == "ALL") | 
            (Notification.target_role.is_(None))
        )
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/geofenced-alert")
async def create_geofenced_alert(
    alert_in: GeofenceAlertCreate,
    request: Request,
    user: User = Depends(require_roles(["ADMIN", "DISPATCHER"])),
    db: AsyncSession = Depends(get_db)
):
    """Section 36: Operators define geographic alert zone and trigger broadcast notifications"""
    notif = Notification(
        title=f"⚠️ GEOFENCED EMERGENCY WARNING: {alert_in.title}",
        message=f"{alert_in.message} (Radius: {alert_in.radius_km} km centered at [{alert_in.latitude:.4f}, {alert_in.longitude:.4f}])",
        notification_type="ALERT",
        severity=alert_in.severity.upper(),
        channel=alert_in.channel.upper(),
        target_role="ALL"
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)

    await log_audit_event(
        db, action="GEOFENCE_ALERT_BROADCAST", entity_type="NOTIFICATION", entity_id=notif.id,
        user=user, new_state={"lat": alert_in.latitude, "lng": alert_in.longitude, "radius_km": alert_in.radius_km},
        request=request
    )

    # Broadcast to all live clients
    await ws_manager.broadcast({
        "event": "GEOFENCED_ALERT_BROADCAST",
        "title": notif.title,
        "message": notif.message,
        "severity": notif.severity,
        "latitude": alert_in.latitude,
        "longitude": alert_in.longitude,
        "radius_km": alert_in.radius_km
    })

    return {
        "status": "BROADCASTED",
        "alert_id": notif.id,
        "title": notif.title,
        "affected_perimeter_km": alert_in.radius_km
    }

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Notification).where(Notification.id == notification_id))
    notif = res.scalars().first()
    if notif:
        notif.is_read = True
        await db.commit()
    return {"status": "SUCCESS"}
