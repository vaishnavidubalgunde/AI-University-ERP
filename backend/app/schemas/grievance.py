from typing import List, Optional
from pydantic import BaseModel


class GrievanceItem(BaseModel):
    id: int
    ticket_number: str
    subject: str
    description: str
    category: str
    priority: str
    status: str
    submitted_at: str
    resolved_at: Optional[str] = None
    admin_response: Optional[str] = None


class CreateGrievanceRequest(BaseModel):
    subject: str
    description: str
    category: str  # "academic", "hostel", "finance", "infrastructure", "general"
    priority: str = "normal"  # "low", "normal", "high", "urgent"


class CreateGrievanceResponse(BaseModel):
    success: bool
    ticket_number: str
    message: str
    status: str
    created_at: str
