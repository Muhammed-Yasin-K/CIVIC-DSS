"""Email service for sending notifications"""
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails"""
    
    @staticmethod
    async def send_password_reset_email(email: str, token: str):
        """
        Send a password reset email with a token
        
        In a real app, this would send an actual email via SMTP.
        For now, we log it to the console for development.
        """
        reset_link = f"http://localhost:5173/reset-password?token={token}"
        
        logger.info(f"--- PASSWORD RESET EMAIL ---")
        logger.info(f"To: {email}")
        logger.info(f"Subject: Password Reset Request")
        logger.info(f"Link: {reset_link}")
        logger.info(f"Token: {token}")
        logger.info(f"--- END EMAIL ---")
        
        # You could also print it for visibility in terminal if debug is on
        if settings.DEBUG:
            print(f"\n[MOCK EMAIL] Password Reset for {email}: {reset_link}\n")
            
        return True
    @staticmethod
    async def send_task_completion_email(admin_email: str, officer_name: str, task_title: str, updates: str, actions: str, location: str):
        """
        Send a notification to admin when a task is completed.
        """
        import datetime
        from app.utils.date_utils import get_current_ist
        timestamp = get_current_ist().strftime("%d %b %Y, %I:%M %p")
        
        logger.info(f"--- TASK COMPLETION EMAIL TO ADMIN ---")
        logger.info(f"To: {admin_email}")
        logger.info(f"Subject: [COMPLETED] Mission Report: {task_title}")
        logger.info(f"Body:")
        logger.info(f"  Field Officer: {officer_name}")
        logger.info(f"  Tactical Mission: {task_title}")
        logger.info(f"  Operational Zone: {location}")
        logger.info(f"  Time of Resolution: {timestamp}")
        logger.info(f"  --------------------------------------")
        logger.info(f"  MISSION UPDATES:")
        logger.info(f"  {updates}")
        logger.info(f"  --------------------------------------")
        logger.info(f"  ACTIONS TAKEN:")
        logger.info(f"  {actions}")
        logger.info(f"  --------------------------------------")
        logger.info(f"  Status: ✅ RESOLVED / MISSION SUCCESS")
        logger.info(f"--- END EMAIL ---")

        from app.utils.email_utils import send_email
        subject = f"[COMPLETED] Mission Report: {task_title}"
        body = f"""FIELD OFFICER: {officer_name}
TACTICAL MISSION: {task_title}
OPERATIONAL ZONE: {location}
TIME OF RESOLUTION: {timestamp}

--------------------------------------
MISSION UPDATES:
{updates}

--------------------------------------
ACTIONS TAKEN:
{actions}

Status: ✅ RESOLVED / MISSION SUCCESS
"""
        import asyncio
        asyncio.create_task(send_email(to_email=admin_email, subject=subject, body=body))

        if settings.DEBUG:
            print(f"\n[MOCK EMAIL] Admin Notify: {task_title} COMPLETED by {officer_name}\n")
            
        return True
