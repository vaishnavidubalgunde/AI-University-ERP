import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("university_erp.email")


class EmailService:
    """Production-grade email dispatch service with SMTP support and resilient development fallback."""

    def __init__(self):
        self.provider = os.getenv("EMAIL_PROVIDER", "smtp")
        self.host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
        self.port = int(os.getenv("EMAIL_PORT", "587"))
        self.username = os.getenv("EMAIL_USERNAME", "")
        self.password = os.getenv("EMAIL_PASSWORD", "")
        self.sender = os.getenv("EMAIL_FROM", "admissions@dsuonline.com")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        self.enabled = bool(self.username and self.password)

    def _send_or_simulate(self, to_email: str, subject: str, html_content: str, text_content: str) -> bool:
        if not self.enabled:
            logger.info(
                f"[EMAIL SIMULATION] => TO: {to_email} | SUBJECT: {subject}\n"
                f"--- CONTENT ---\n{text_content}\n----------------"
            )
            print(f"\n[EMAIL DISPATCH TO {to_email}] Subject: {subject}\n{text_content}\n")
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.sender
            msg["To"] = to_email

            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")
            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.sendmail(self.sender, [to_email], msg.as_string())
            logger.info(f"Successfully sent email to {to_email} with subject '{subject}'")
            return True
        except Exception as e:
            logger.warning(f"SMTP error sending email to {to_email}: {e}. Falling back to simulation mode.")
            print(f"\n[SIMULATED EMAIL TO {to_email}] Subject: {subject}\n{text_content}\n")
            return True

    def send_verification_email(self, to_email: str, user_name: str, verification_token: str) -> bool:
        verify_url = f"{self.frontend_url}/verify-email?token={verification_token}"
        subject = "Verify Your University ERP Account"
        text_content = (
            f"Hello {user_name},\n\n"
            f"Welcome to Sagar University Online ERP.\n"
            f"Please verify your institutional email address by clicking the link below:\n\n"
            f"{verify_url}\n\n"
            f"This link will expire in 24 hours.\n"
            f"If you did not create this account, please contact admissions@dsuonline.com immediately.\n\n"
            f"Sagar University Admissions & Registry"
        )
        html_content = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #0d3880 0%, #1e5bb8 100%); padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">SAGAR UNIVERSITY</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">AI-Integrated University ERP Portal</p>
          </div>
          <div style="padding: 32px 24px; color: #334155;">
            <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Verify Your Institutional Email</h2>
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>Your account has been registered with Sagar University ERP. To activate your student/faculty privileges, please verify your email address below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{verify_url}" style="background: #26a69a; color: #ffffff; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(38,166,154,0.3);">Verify Email Address</a>
            </div>
            <p style="font-size: 12px; color: #64748b;">Or paste this link into your browser:<br><a href="{verify_url}" style="color: #1e88e5;">{verify_url}</a></p>
            <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">This security link expires in 24 hours. If you did not initiate this registration, please disregard this notice.</p>
          </div>
        </div>
        """
        return self._send_or_simulate(to_email, subject, html_content, text_content)

    def send_login_notification(
        self,
        to_email: str,
        user_name: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        browser: Optional[str] = None,
        device: Optional[str] = None,
    ) -> bool:
        now_utc = datetime.now(timezone.utc).strftime("%B %d, %Y at %I:%M:%S %p UTC")
        subject = "Security Alert: New Login to Your University ERP Account"
        text_content = (
            f"Hello {user_name},\n\n"
            f"Your University ERP account was successfully accessed on {now_utc}.\n\n"
            f"Security Details:\n"
            f"- IP Address: {ip_address or 'Local Client'}\n"
            f"- Browser: {browser or 'Modern Web Browser'}\n"
            f"- Device: {device or 'Desktop Workstation'}\n\n"
            f"If you did not perform this login, please secure your account immediately or contact support@dsuonline.com.\n\n"
            f"University ERP Security & Identity Management"
        )
        html_content = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
          <div style="background: #0f172a; padding: 20px 24px; text-align: left; color: #ffffff;">
            <span style="background: #22c55e; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase;">Active Session</span>
            <h2 style="margin: 8px 0 0 0; font-size: 18px; font-weight: 700;">Account Login Notification</h2>
          </div>
          <div style="padding: 24px; color: #334155;">
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>Your University ERP account was just accessed with valid credentials.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px; overflow: hidden;">
              <tr><td style="padding: 10px 14px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Timestamp</td><td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0;">{now_utc}</td></tr>
              <tr><td style="padding: 10px 14px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">IP Address</td><td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0;">{ip_address or '127.0.0.1 (Local)'}</td></tr>
              <tr><td style="padding: 10px 14px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Browser</td><td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0;">{browser or 'Chrome / Web Browser'}</td></tr>
              <tr><td style="padding: 10px 14px; font-size: 13px; color: #64748b;">Device</td><td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #1e293b;">{device or 'Desktop Platform'}</td></tr>
            </table>
            <p style="font-size: 12px; color: #e11d48; margin-top: 16px;"><strong>Security Notice:</strong> If this was not you, reset your password immediately and notify IT security at <code>security@dsuonline.com</code>.</p>
          </div>
        </div>
        """
        return self._send_or_simulate(to_email, subject, html_content, text_content)

    def send_password_reset_email(self, to_email: str, user_name: str, reset_token: str) -> bool:
        reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"
        subject = "Reset Your University ERP Password"
        text_content = (
            f"Hello {user_name},\n\n"
            f"We received a request to reset the password for your University ERP account.\n"
            f"To set a new password, click the link below:\n\n"
            f"{reset_url}\n\n"
            f"This link expires in 15 minutes.\n"
            f"If you did not request this, you can safely ignore this email.\n\n"
            f"Sagar University Identity Security"
        )
        html_content = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
          <div style="background: #b91c1c; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Password Reset Request</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Sagar University ERP</p>
          </div>
          <div style="padding: 32px 24px; color: #334155;">
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>A password reset was requested for your account. Click the button below to choose a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{reset_url}" style="background: #e53935; color: #ffffff; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password</a>
            </div>
            <p style="font-size: 12px; color: #64748b;">This token will expire in 15 minutes.</p>
          </div>
        </div>
        """
        return self._send_or_simulate(to_email, subject, html_content, text_content)

    def send_account_notification(self, to_email: str, user_name: str, subject: str, message: str) -> bool:
        text_content = f"Hello {user_name},\n\n{message}\n\nSagar University ERP System"
        html_content = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <h2 style="color: #0f172a; margin-top: 0;">{subject}</h2>
          <p>Hello <strong>{user_name}</strong>,</p>
          <p>{message}</p>
        </div>
        """
        return self._send_or_simulate(to_email, subject, html_content, text_content)

email_service = EmailService()
