from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.system import AuditLog, LoginActivity
from app.api.deps import get_current_user
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    resource: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginActivityItem(BaseModel):
    id: int
    user_id: int
    email: str
    ip_address: Optional[str] = None
    browser: Optional[str] = None
    device: Optional[str] = None
    status: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


router = APIRouter(prefix="/audit", tags=["Governance & Security Audit"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Executive University Administrators.",
        )
    return current_user


@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = 50,
    action: Optional[str] = None,
    current_user: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve comprehensive institutional audit trail for compliance, forensic analysis, and security.
    """
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    return query.order_by(AuditLog.timestamp.desc()).limit(limit).all()


@router.get("/login-activities", response_model=List[LoginActivityItem])
def get_login_activities(
    limit: int = 50,
    current_user: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Inspect real-time session login events, security verifications, IP provenance, and failed attempts.
    """
    return db.query(LoginActivity).order_by(LoginActivity.timestamp.desc()).limit(limit).all()
