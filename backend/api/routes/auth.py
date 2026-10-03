from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
import uuid

from backend.core.database import get_db
from backend.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from backend.models.all_models import User
from backend.schemas.all_schemas import UserCreate, UserLogin, GoogleAuthRequest, TokenResponse, UserResponse
from backend.api.deps import get_required_user, log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

@router.post("/register", response_model=TokenResponse)
async def register(user_in: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == user_in.email.lower()))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
        
    # Valid roles: ADMIN, DISPATCHER, ANALYST, RESPONDER, CITIZEN
    role = (user_in.role or "CITIZEN").upper()
    if role not in ["ADMIN", "DISPATCHER", "ANALYST", "RESPONDER", "CITIZEN"]:
        role = "CITIZEN"

    new_user = User(
        email=user_in.email.lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=role,
        phone=user_in.phone,
        organization=user_in.organization,
        is_active=True,
        is_verified=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    await log_audit_event(
        db, action="USER_REGISTRATION", entity_type="USER", entity_id=new_user.id,
        user=new_user, new_state={"email": new_user.email, "role": new_user.role}, request=request
    )

    token = create_access_token(new_user.id, new_user.role)
    refresh_token = create_refresh_token(new_user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "phone": new_user.phone,
            "organization": new_user.organization
        }
    }

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email.lower()))
    user = result.scalars().first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is disabled")

    token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    await log_audit_event(
        db, action="USER_LOGIN", entity_type="USER", entity_id=user.id,
        user=user, request=request
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "phone": user.phone,
            "organization": user.organization
        }
    }

@router.post("/google", response_model=TokenResponse)
async def google_auth(auth_req: GoogleAuthRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Google OAuth authentication endpoint (requires production GOOGLE_CLIENT_ID)"""
    from backend.core.config import settings
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google OAuth is not configured on this instance (GOOGLE_CLIENT_ID is unset). Please authenticate using verified email and password."
        )

    # In production with GOOGLE_CLIENT_ID configured, verify token via google-auth
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        id_info = id_token.verify_oauth2_token(auth_req.credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
        email = id_info['email'].lower()
        full_name = id_info.get('name', 'Google User')
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google OAuth token verification failed: {str(e)}"
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    
    if not user:
        role = (auth_req.role or "CITIZEN").upper()
        user = User(
            email=email,
            hashed_password=get_password_hash(str(uuid.uuid4())),
            full_name=full_name,
            role=role,
            is_active=True,
            is_verified=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        await log_audit_event(
            db, action="GOOGLE_AUTH_REGISTER", entity_type="USER", entity_id=user.id,
            user=user, request=request
        )
    else:
        await log_audit_event(
            db, action="GOOGLE_AUTH_LOGIN", entity_type="USER", entity_id=user.id,
            user=user, request=request
        )

    token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "phone": user.phone,
            "organization": user.organization
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(user: User = Depends(get_required_user)):
    return user

@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(request: Request, db: AsyncSession = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Refresh token required")
    token = auth_header[7:]
    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
        
    new_token = create_access_token(user.id, user.role)
    new_refresh = create_refresh_token(user.id)
    return {
        "access_token": new_token,
        "token_type": "bearer",
        "refresh_token": new_refresh,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "phone": user.phone,
            "organization": user.organization
        }
    }
