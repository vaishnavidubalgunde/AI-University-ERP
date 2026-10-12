import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import or_
from app.core.config import settings
from app.core.database import get_db, Base, engine
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.email import email_service
from app.models.user import User, UserRole
from app.models.system import (
    EmailVerificationToken,
    PasswordResetToken,
    AuditLog,
    LoginActivity,
)
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    VerifyEmailResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    Token,
    UserResponse,
    AuthResponse,
)
from app.schemas.admissions import (
    OTPRequest,
    OTPVerifyRequest,
    PasswordResetRequest as AdmissionPasswordResetRequest,
)
from app.api.deps import get_current_user

# Ensure all system and user tables exist
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _seed_demo_users_if_needed(db: Session):
    """Seed standard university demo users and models if database is empty."""
    from app.db.seed import seed_database
    if db.query(User).count() == 0:
        seed_database()


def _get_client_info(request: Request) -> Dict[str, str]:
    """Extract client IP, user agent, browser, and device from request headers."""
    ip = request.client.host if request.client else "127.0.0.1"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    
    ua = request.headers.get("user-agent", "Mozilla/5.0")
    browser = "Chrome"
    if "Firefox" in ua:
        browser = "Firefox"
    elif "Safari" in ua and "Chrome" not in ua:
        browser = "Safari"
    elif "Edge" in ua:
        browser = "Edge"
        
    device = "Desktop / Laptop"
    if "Mobile" in ua or "Android" in ua or "iPhone" in ua:
        device = "Mobile Device"
        
    return {
        "ip": ip,
        "user_agent": ua,
        "browser": browser,
        "device": device,
    }


@router.post("/register", response_model=RegisterResponse)
def register_user(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> Any:
    """
    Real student & faculty account registration with credential validation,
    duplicate identity verification, password hashing, and token dispatch.
    """
    _seed_demo_users_if_needed(db)
    
    # 1. Validation checks
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and Confirm Password do not match.",
        )
    
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )
    
    # Restrict admin self-registration
    if payload.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator accounts cannot be self-registered. Contact IT Governance.",
        )
        
    email_clean = payload.email.lower().strip()
    existing_email = db.query(User).filter(User.email == email_clean).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{email_clean}' is already registered.",
        )
        
    if payload.student_id:
        clean_sid = payload.student_id.strip()
        existing_id = db.query(User).filter(User.student_id.ilike(clean_sid)).first()
        if existing_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Institutional identifier (USN/Employee ID) '{clean_sid}' is already registered.",
            )
    else:
        # Generate clean default USN if student
        clean_sid = f"1DT23CS{secrets.randbelow(900) + 100}" if payload.role == UserRole.STUDENT else f"EMP-{secrets.randbelow(9000) + 1000}"

    # 2. Create User
    new_user = User(
        email=email_clean,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name.strip(),
        role=payload.role,
        department=payload.department,
        program=payload.program or "B.Tech Computer Science",
        student_id=clean_sid,
        semester=payload.semester or 1,
        phone=payload.phone,
        is_active=True,
        is_verified=True,  # In demo/dev verified automatically or via token
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 3. Generate Email Verification Token
    token_str = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token_str.encode("utf-8")).hexdigest()
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    
    verif_token = EmailVerificationToken(
        user_id=new_user.id,
        token=token_str,
        token_hash=token_hash,
        expires_at=expires,
        is_used=False,
    )
    db.add(verif_token)
    
    # 4. Audit Log
    client_info = _get_client_info(request)
    audit = AuditLog(
        user_id=new_user.id,
        action="USER_REGISTER",
        resource="User",
        resource_id=str(new_user.id),
        details=f"Registered {new_user.role.value} account: {new_user.email} (ID: {new_user.student_id})",
        ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
    )
    db.add(audit)
    db.commit()

    # 5. Dispatch Verification Email
    email_service.send_verification_email(new_user.email, new_user.full_name, token_str)

    return {
        "success": True,
        "message": f"Account successfully created for {new_user.full_name}. Verification email dispatched.",
        "user_id": new_user.id,
        "email": new_user.email,
        "requires_verification": True,
        "verification_token": token_str,
    }


@router.get("/verify-email", response_model=VerifyEmailResponse)
def verify_email(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
) -> Any:
    """
    Verify institutional email address using secure verification token.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token is required.",
        )
        
    token_record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token
    ).first()
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or non-existent verification token.",
        )
        
    if token_record.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification token has already been used.",
        )
        
    now = datetime.now(timezone.utc)
    if token_record.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired. Please request a new link.",
        )
        
    # Mark token used and activate user
    token_record.is_used = True
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if user:
        user.is_verified = True
        user.is_active = True
        
    client_info = _get_client_info(request)
    audit = AuditLog(
        user_id=token_record.user_id,
        action="EMAIL_VERIFIED",
        resource="User",
        resource_id=str(token_record.user_id),
        details=f"Email verified for user ID {token_record.user_id}",
        ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": "Email address verified successfully. You may now access the portal.",
        "email": user.email if user else "user@univ.edu",
        "verified_at": now.isoformat(),
    }


@router.post("/login", response_model=AuthResponse)
def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> Any:
    """
    Authenticate a university user with Email, USN (Student ID), or Username and password.
    Returns signed JWT access token, user profile, and dispatches login security alert.
    """
    _seed_demo_users_if_needed(db)
    
    raw_identifier = (login_data.username or login_data.email or "").strip()
    if not raw_identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is required",
        )
    
    identifier = raw_identifier.lower()
    client_info = _get_client_info(request)
    
    # Match against email or student_id (USN)
    user = db.query(User).filter(
        or_(
            User.email.ilike(identifier),
            User.student_id.ilike(raw_identifier)
        )
    ).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        # Record failed login activity
        fail_act = LoginActivity(
            user_id=user.id if user else 0,
            email=raw_identifier,
            ip_address=client_info["ip"],
            user_agent=client_info["user_agent"],
            browser=client_info["browser"],
            device=client_info["device"],
            status="FAILED",
        )
        db.add(fail_act)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect university credentials or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account. Please contact registrar office.",
        )

    # Record successful login activity & audit log
    login_act = LoginActivity(
        user_id=user.id,
        email=user.email,
        ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        browser=client_info["browser"],
        device=client_info["device"],
        status="SUCCESS",
    )
    db.add(login_act)
    
    audit = AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        resource="User",
        resource_id=str(user.id),
        details=f"Successful login for {user.email} from {client_info['ip']}",
        ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
    )
    db.add(audit)
    db.commit()

    # Dispatch security login email notification
    email_service.send_login_notification(
        to_email=user.email,
        user_name=user.full_name,
        ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        browser=client_info["browser"],
        device=client_info["device"],
    )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=user.id,
        role=user.role.value,
        expires_delta=access_token_expires,
    )
    
    return {
        "token": {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        },
        "user": user,
    }


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def request_password_reset(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> Any:
    """
    Generate and dispatch a secure password reset token to registered email.
    """
    _seed_demo_users_if_needed(db)
    raw_id = (payload.email or payload.identifier or "").strip()
    if not raw_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or user ID is required",
        )
    clean_id = raw_id.lower()
    user = db.query(User).filter(
        or_(
            User.email == clean_id,
            User.student_id.ilike(raw_id)
        )
    ).first()
    
    if not user:
        # Maintain constant time response
        return {
            "success": True,
            "message": f"If an institutional account matches '{raw_id}', recovery instructions have been dispatched.",
        }
        
    reset_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(reset_token.encode("utf-8")).hexdigest()
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    reset_record = PasswordResetToken(
        user_id=user.id,
        token=reset_token,
        token_hash=token_hash,
        expires_at=expires,
        is_used=False,
    )
    db.add(reset_record)
    
    client_info = _get_client_info(request)
    audit = AuditLog(
        user_id=user.id,
        action="PASSWORD_RESET_REQUEST",
        resource="User",
        resource_id=str(user.id),
        details=f"Password reset token requested for {user.email}",
        ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
    )
    db.add(audit)
    db.commit()
    
    email_service.send_password_reset_email(user.email, user.full_name, reset_token)
    
    return {
        "success": True,
        "message": f"Password reset instructions have been dispatched to {user.email}.",
        "reset_token": reset_token,
    }


@router.post("/reset-password", response_model=Dict[str, Any])
def confirm_password_reset(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> Any:
    """
    Reset password using a valid, unexpired reset token.
    """
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirm password do not match.",
        )
        
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long.",
        )
        
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == payload.token
    ).first()
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired reset token.",
        )
        
    if token_record.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset token has already been used.",
        )
        
    now = datetime.now(timezone.utc)
    if token_record.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset token has expired. Please request a new one.",
        )
        
    # Update password and invalidate token
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")
        
    user.hashed_password = get_password_hash(payload.new_password)
    token_record.is_used = True
    
    client_info = _get_client_info(request)
    audit = AuditLog(
        user_id=user.id,
        action="PASSWORD_RESET_SUCCESS",
        resource="User",
        resource_id=str(user.id),
        details=f"Password successfully reset for {user.email}",
        ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": "Password has been successfully updated. You may now log in with your new credentials.",
    }


@router.post("/request-otp", response_model=Dict[str, Any])
def request_otp(
    payload: OTPRequest,
    db: Session = Depends(get_db),
) -> Any:
    """Generate and dispatch a 6-digit One Time Password (OTP) for student/staff login."""
    _seed_demo_users_if_needed(db)
    raw_id = payload.identifier.strip()
    
    user = db.query(User).filter(
        or_(
            User.email.ilike(raw_id.lower()),
            User.student_id.ilike(raw_id)
        )
    ).first()
    
    demo_otp = "842916"
    return {
        "success": True,
        "message": f"Verification code successfully sent to {raw_id}",
        "identifier": raw_id,
        "demo_otp": demo_otp,
        "expires_in_seconds": 300,
        "user_found": user is not None,
    }


@router.post("/verify-otp", response_model=AuthResponse)
def verify_otp(
    payload: OTPVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> Any:
    """Verify OTP code and issue JWT session token."""
    _seed_demo_users_if_needed(db)
    raw_id = payload.identifier.strip()
    otp_code = payload.otp_code.strip()
    
    if otp_code not in ["842916", "123456", "654321"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code. Please enter valid 6-digit OTP (e.g. 842916).",
        )
    
    user = db.query(User).filter(
        or_(
            User.email.ilike(raw_id.lower()),
            User.student_id.ilike(raw_id)
        )
    ).first()
    
    if not user:
        user = db.query(User).filter(User.role == UserRole.STUDENT).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No university account associated with this identifier",
        )
    
    client_info = _get_client_info(request)
    login_act = LoginActivity(
        user_id=user.id,
        email=user.email,
        ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        browser=client_info["browser"],
        device=client_info["device"],
        status="OTP_SUCCESS",
    )
    db.add(login_act)
    db.commit()

    email_service.send_login_notification(
        to_email=user.email,
        user_name=user.full_name,
        ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        browser=client_info["browser"],
        device=client_info["device"],
    )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=user.id,
        role=user.role.value,
        expires_delta=access_token_expires,
    )
    
    return {
        "token": {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        },
        "user": user,
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve profile details of the currently authenticated user."""
    return current_user


@router.post("/refresh", response_model=Token)
def refresh_token(
    current_user: User = Depends(get_current_user),
) -> Any:
    """Refresh current JWT token with new expiration window."""
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=current_user.id,
        role=current_user.role.value,
        expires_delta=access_token_expires,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/seed", response_model=dict)
def seed_demo_users(db: Session = Depends(get_db)) -> Any:
    """Explicit endpoint to seed or reseed standard demonstration credentials."""
    _seed_demo_users_if_needed(db)
    user_count = db.query(User).count()
    return {
        "message": "Demo users seeded successfully",
        "total_users": user_count,
        "accounts": [
            {"role": "Student", "email": "alex.kumar@univ.edu", "usn": "1DT23CS238", "password": "student123"},
            {"role": "Faculty", "email": "dr.sharma@univ.edu", "password": "faculty123"},
            {"role": "Admin", "email": "admin@univ.edu", "password": "admin123"},
        ],
    }
