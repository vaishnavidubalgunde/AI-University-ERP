from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import User, Notice, NoticeCategory, NoticePriority
from app.schemas.notice import NoticeFilterResponse, NoticeItem

router = APIRouter(prefix="/notices", tags=["Notices & Bulletins"])


@router.get("", response_model=NoticeFilterResponse)
def get_notices(
    category: Optional[str] = Query(None, description="Filter by category (academic, exam, placement, general)"),
    search: Optional[str] = Query(None, description="Keyword search in title and content"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve university circulars and official bulletin feed with category filters and search.
    """
    query = db.query(Notice)

    if category and category.lower() != "all":
        # Match enum category
        cat_enum = None
        for c in NoticeCategory:
            if c.value.lower() == category.lower():
                cat_enum = c
                break
        if cat_enum:
            query = query.filter(Notice.category == cat_enum)

    if search:
        search_term = f"%{search}%"
        query = query.filter((Notice.title.ilike(search_term)) | (Notice.content.ilike(search_term)))

    # Order pinned first, then newest
    notices = query.order_by(Notice.is_pinned.desc(), Notice.published_at.desc()).all()

    items = [
        NoticeItem(
            id=n.id,
            title=n.title,
            content=n.content,
            category=n.category.value if hasattr(n.category, "value") else str(n.category),
            priority=n.priority.value if hasattr(n.priority, "value") else str(n.priority),
            publisher=n.published_by or "Office of the Registrar",
            target_role=n.target_role or "ALL",
            created_at=n.published_at.strftime("%B %d, %Y") if n.published_at else "February 20, 2026",
            attachment_url=n.attachment_url,
            is_urgent=n.priority == NoticePriority.URGENT,
            is_pinned=n.is_pinned,
        )
        for n in notices
    ]

    all_categories = ["All", "Academic", "Examination", "Placement", "General"]

    return NoticeFilterResponse(
        total_count=len(items),
        categories=all_categories,
        notices=items,
    )
