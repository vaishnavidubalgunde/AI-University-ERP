from typing import Any
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import or_
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.system import Notification, NotificationCategory, NotificationPriority
from app.api.deps import get_current_user
from app.schemas.notifications import (
    NotificationListResponse,
    CreateNotificationRequest,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _seed_sample_notifications_if_empty(db: Session, user: User):
    if db.query(Notification).count() == 0:
        samples = [
            Notification(
                user_id=user.id,
                title="End-Semester Examination Schedule Published",
                message="The official timetable for May/June 2026 examination cycle is now available.",
                category=NotificationCategory.EXAMINATION,
                priority=NotificationPriority.HIGH,
                is_read=False,
                action_url="/exams",
            ),
            Notification(
                user_id=user.id,
                title="Internal Assessment 2 Marks Released",
                message="Your CIE 2 assessment marks have been verified by faculty.",
                category=NotificationCategory.ACADEMIC,
                priority=NotificationPriority.NORMAL,
                is_read=False,
                action_url="/academics",
            ),
            Notification(
                user_id=user.id,
                title="Semester Fee Receipt Verified",
                message="Your tuition fee receipt of ₹1,42,500 has been verified by the Accounts department.",
                category=NotificationCategory.FINANCE,
                priority=NotificationPriority.NORMAL,
                is_read=True,
                action_url="/fees",
            ),
            Notification(
                user_id=None,  # Broadcast
                title="University Annual Tech Symposium 2026",
                message="Registrations are now open for Hack-DSU 2026. Cash prizes worth ₹5 Lakhs.",
                category=NotificationCategory.NOTICE,
                priority=NotificationPriority.NORMAL,
                is_read=False,
                action_url="/notices",
            ),
        ]
        db.add_all(samples)
        db.commit()


@router.get("", response_model=NotificationListResponse)
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve real-time institutional notifications and alerts for current user.
    """
    _seed_sample_notifications_if_empty(db, current_user)
    
    query = db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.user_id.is_(None)
        )
    ).order_by(Notification.created_at.desc())
    
    items = query.all()
    unread_count = sum(1 for n in items if not n.is_read)
    
    return {
        "unread_count": unread_count,
        "total_count": len(items),
        "notifications": items,
    }


@router.post("/{notification_id}/read", response_model=dict)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Mark a single notification as read.
    """
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        or_(
            Notification.user_id == current_user.id,
            Notification.user_id.is_(None)
        )
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    db.commit()
    return {"success": True, "message": "Notification marked as read."}


@router.post("/read-all", response_model=dict)
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Mark all unread notifications as read for current user.
    """
    db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.user_id.is_(None)
        ),
        Notification.is_read == False
    ).update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"success": True, "message": "All notifications marked as read."}


@router.post("/broadcast", response_model=dict)
def create_broadcast_notification(
    payload: CreateNotificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Broadcast a university-wide notice or specific student alert (Admin/Faculty only).
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.FACULTY]:
        raise HTTPException(status_code=403, detail="Unauthorized to broadcast notifications.")
        
    new_notif = Notification(
        user_id=payload.user_id,
        title=payload.title,
        message=payload.message,
        category=payload.category,
        priority=payload.priority,
        is_read=False,
        action_url=payload.action_url,
    )
    db.add(new_notif)
    db.commit()
    return {"success": True, "message": "Notification created and dispatched successfully."}
