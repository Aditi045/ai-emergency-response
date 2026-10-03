from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from backend.core.database import get_db
from backend.models.all_models import Dataset, ModelRegistry

router = APIRouter(prefix="/datasets", tags=["Data Sources & Model Registry"])

@router.get("/")
async def list_datasets(
    category: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Section 42-44: Official Open Data sources metadata and coverage tracking"""
    query = select(Dataset).where(Dataset.is_active == True)
    if category:
        query = query.where(Dataset.category == category)
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/models")
async def list_model_registry(
    db: AsyncSession = Depends(get_db)
):
    """Section 45: Registered AI Models, frameworks, datasets and genuine evaluated metrics"""
    query = select(ModelRegistry).order_by(ModelRegistry.created_at.desc())
    res = await db.execute(query)
    return res.scalars().all()
