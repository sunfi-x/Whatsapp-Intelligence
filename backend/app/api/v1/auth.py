from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.models.user import User
from app.models.setting import Setting, GlobalAIStatus
from app.ai.persona import DEFAULT_PERSONA
from app.schemas.auth import UserCreate, UserRead, Token, UserLogin

router = APIRouter(prefix="/auth", tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    if not token:
        # For ease of testing and single-user personal dashboard default fallback
        user_res = await db.execute(select(User).limit(1))
        user = user_res.scalars().first()
        if user:
            return user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        
    user_res = await db.execute(select(User).where(User.id == int(user_id)))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/register", response_model=UserRead)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Initialize user default settings
    setting = Setting(
        user_id=user.id,
        personality=DEFAULT_PERSONA,
        default_language="Banglish",
        default_tone="Casual",
        global_ai_status=GlobalAIStatus.ON
    )
    db.add(setting)
    await db.commit()

    return user


@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    user_res = await db.execute(select(User).where(User.email == login_data.email))
    user = user_res.scalars().first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token)


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
