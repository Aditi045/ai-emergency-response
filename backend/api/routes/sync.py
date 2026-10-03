from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from datetime import datetime, timezone

from backend.core.database import get_db
from backend.models.all_models import OfflineSyncQueue, IncidentReport, User
from backend.schemas.all_schemas import OfflineSyncBatch, IncidentReportCreate
from backend.api.deps import get_current_user, log_audit_event
from backend.api.routes.reports import submit_emergency_report

router = APIRouter(prefix="/sync", tags=["Offline-First PWA Synchronization"])

@router.post("/batch")
async def sync_offline_batch(
    batch: OfflineSyncBatch,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Section 34: Processes locally queued offline operations with idempotent deduplication"""
    synced_count = 0
    failed_count = 0
    duplicate_count = 0
    results = []

    for item in batch.items:
        # Check idempotency: if operation_id already processed
        q = select(OfflineSyncQueue).where(OfflineSyncQueue.operation_id == item.operation_id)
        res = await db.execute(q)
        existing = res.scalars().first()

        if existing and existing.sync_status == "SYNCED":
            duplicate_count += 1
            results.append({
                "operation_id": item.operation_id,
                "status": "DUPLICATE_IGNORED",
                "message": "Operation already synchronized previously."
            })
            continue

        sync_record = existing or OfflineSyncQueue(
            operation_id=item.operation_id,
            user_id=user.id if user else None,
            operation_type=item.operation_type,
            entity_type=item.entity_type,
            payload_json=item.payload
        )
        if not existing:
            db.add(sync_record)

        try:
            if item.operation_type in ["CREATE_REPORT", "SOS"]:
                report_payload = IncidentReportCreate(
                    incident_type=item.payload.get("incident_type", "Emergency"),
                    description=item.payload.get("description", ""),
                    latitude=float(item.payload.get("latitude", 0.0)),
                    longitude=float(item.payload.get("longitude", 0.0)),
                    address=item.payload.get("address"),
                    injuries_reported=item.payload.get("injuries_reported", 0),
                    people_affected=item.payload.get("people_affected", 0),
                    hazards=item.payload.get("hazards"),
                    damage=item.payload.get("damage"),
                    submitter_name=item.payload.get("submitter_name"),
                    submitter_phone=item.payload.get("submitter_phone"),
                    is_anonymous=item.payload.get("is_anonymous", False),
                    is_offline_synced=True,
                    sync_id=item.operation_id
                )
                await submit_emergency_report(report_payload, request, user, db)
                
            sync_record.sync_status = "SYNCED"
            sync_record.synced_at = datetime.now(timezone.utc)
            synced_count += 1
            results.append({
                "operation_id": item.operation_id,
                "status": "SYNCED",
                "synced_at": sync_record.synced_at.isoformat()
            })
        except Exception as e:
            sync_record.sync_status = "FAILED"
            sync_record.error_message = str(e)
            sync_record.retry_count += 1
            failed_count += 1
            results.append({
                "operation_id": item.operation_id,
                "status": "FAILED",
                "error": str(e)
            })

    await db.commit()

    return {
        "batch_status": "COMPLETED",
        "total_items": len(batch.items),
        "synced": synced_count,
        "duplicates": duplicate_count,
        "failed": failed_count,
        "items": results
    }

@router.get("/status")
async def get_sync_queue_status(
    db: AsyncSession = Depends(get_db)
):
    q = select(OfflineSyncQueue).order_by(OfflineSyncQueue.created_at.desc()).limit(20)
    res = await db.execute(q)
    return res.scalars().all()
