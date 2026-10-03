from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import json

from backend.core.database import get_db
from backend.core.security import decode_token
from backend.models.all_models import User, AuditLog

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    # Check Authorization header if not extracted by oauth2_scheme
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        return None

    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive or not found")
        
    return user

async def get_required_user(current_user: Optional[User] = Depends(get_current_user)) -> User:
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to perform this action",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return current_user

def require_roles(allowed_roles: List[str]):
    async def role_checker(user: User = Depends(get_required_user)) -> User:
        if user.role not in allowed_roles and user.role != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {', '.join(allowed_roles)}. Your role: {user.role}"
            )
        return user
    return role_checker

async def log_audit_event(
    db: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    user: Optional[User] = None,
    previous_state: Optional[dict] = None,
    new_state: Optional[dict] = None,
    request: Optional[Request] = None
):
    """Immutable audit logging for compliance and operational transparency"""
    ip_addr = request.client.host if request and request.client else "internal"
    user_agent = request.headers.get("user-agent") if request else "system"
    
    log_entry = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else "SYSTEM",
        user_role=user.role if user else "SYSTEM",
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        previous_state_json=previous_state,
        new_state_json=new_state,
        ip_address=ip_addr,
        user_agent=user_agent
    )
    db.add(log_entry)
    await db.commit()
