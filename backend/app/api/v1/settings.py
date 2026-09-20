import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.setting import Setting, GlobalAIStatus
from app.models.user import User
from app.schemas.setting import SettingRead, SettingUpdate
from app.ai.persona import TONE_PROMPTS_DEFAULT
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])


def _build_default_personality_json() -> str:
    """Returns the 7-tier tone prompts as a JSON string for default settings."""
    return json.dumps(TONE_PROMPTS_DEFAULT, ensure_ascii=False, indent=2)


async def _get_or_create_user_settings(db: AsyncSession, user_id: int) -> Setting:
    res = await db.execute(select(Setting).where(Setting.user_id == user_id))
    setting = res.scalars().first()
    if not setting:
        setting = Setting(
            user_id=user_id,
            personality=_build_default_personality_json(),
            default_language="Banglish",
            default_tone="Casual",
            global_ai_status=GlobalAIStatus.ON
        )
        db.add(setting)
        await db.commit()
        await db.refresh(setting)
    else:
        # Migrate old plain-text personality to new 7-tone JSON format
        needs_migration = False
        try:
            data = json.loads(setting.personality or "")
            if not isinstance(data, dict) or not any(k in data for k in ["Casual", "Serious", "Romantic"]):
                needs_migration = True
        except (json.JSONDecodeError, TypeError):
            needs_migration = True

        if needs_migration:
            setting.personality = _build_default_personality_json()
            await db.commit()
            await db.refresh(setting)

    return setting


@router.get("", response_model=SettingRead)
async def get_settings(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await _get_or_create_user_settings(db, current_user.id)


@router.patch("", response_model=SettingRead)
async def update_settings(update_in: SettingUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    setting = await _get_or_create_user_settings(db, current_user.id)
    
    update_data = update_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(setting, field, value)

    await db.commit()
    await db.refresh(setting)
    return setting
