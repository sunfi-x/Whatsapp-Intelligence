from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.analytics import AnalyticsOverview, HumanEditComparison
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("", response_model=AnalyticsOverview)
async def get_analytics(db: AsyncSession = Depends(get_db)):
    return await analytics_service.get_analytics_overview(db)


@router.get("/edits", response_model=list[HumanEditComparison])
async def get_human_edits(limit: int = 20, db: AsyncSession = Depends(get_db)):
    return await analytics_service.get_human_edit_learning_data(db, limit=limit)
