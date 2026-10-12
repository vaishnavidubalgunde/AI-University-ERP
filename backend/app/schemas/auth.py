from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # Seconds


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None


class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str
    student_id: Optional[str] = None  # USN or Employee ID e.g. 1DT23CS238
    department: str
    program: Optional[str] = "B.Tech Computer Science"
    semester: Optional[int] = 1
    phone: Optional[str] = None
    role: UserRole = UserRole.STUDENT


class RegisterResponse(BaseModel):
    success: bool
    message: str
    user_id: int
    email: str
    requires_verification: bool = True
    verification_token: Optional[str] = None


class VerifyEmailRequest(BaseModel):
    token: str


class VerifyEmailResponse(BaseModel):
    success: bool
    message: str
    email: str
    verified_at: str


class ForgotPasswordRequest(BaseModel):
    email: Optional[str] = None
    identifier: Optional[str] = None


class ForgotPasswordResponse(BaseModel):
    success: bool
    message: str
    reset_token: Optional[str] = None  # Returned for testing/demo environments


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.STUDENT
    is_active: bool = True
    is_verified: bool = True
    department: Optional[str] = None
    program: Optional[str] = None
    student_id: Optional[str] = None
    semester: Optional[int] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    token: Token
    user: UserResponse


class LoginActivityResponse(BaseModel):
    id: int
    user_id: int
    email: str
    ip_address: Optional[str] = None
    browser: Optional[str] = None
    device: Optional[str] = None
    location: Optional[str] = None
    status: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
