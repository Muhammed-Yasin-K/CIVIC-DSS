"""Email utility functions for sending notifications"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


async def send_email(
    to_email: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None
) -> bool:
    """
    Send an email using SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Plain text email body
        html_body: Optional HTML email body
        cc: Optional list of CC recipients
        bcc: Optional list of BCC recipients
        
    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        # Admin Email Override: Reroute admin@civic.gov to user's real mail
        if to_email == "admin@civic.gov":
            logger.info(f"Rerouting admin email from {to_email} to yazholic94@gmail.com")
            to_email = "yazholic94@gmail.com"

        # Create message
        message = MIMEMultipart("alternative")
        message["From"] = settings.EMAIL_FROM
        message["To"] = to_email
        message["Subject"] = subject
        
        if cc:
            message["Cc"] = ", ".join(cc)
        
        # Add plain text part
        text_part = MIMEText(body, "plain")
        message.attach(text_part)
        
        # Add HTML part if provided
        if html_body:
            html_part = MIMEText(html_body, "html")
            message.attach(html_part)
        
        # Prepare recipient list
        recipients = [to_email]
        if cc:
            recipients.extend(cc)
        if bcc:
            recipients.extend(bcc)
        
        # Send email
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True
        )
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


async def send_alert_email(
    to_email: str,
    alert_title: str,
    alert_message: str,
    severity: str,
    zone: Optional[str] = None,
    extra_details: Optional[Dict[str, str]] = None
) -> bool:
    """
    Send an alert notification email
    
    Args:
        to_email: Recipient email address
        alert_title: Alert title
        alert_message: Alert message
        severity: Alert severity level
        zone: Optional zone information
        extra_details: Optional dictionary of extra key-value pairs to display in the email table.
        
    Returns:
        True if email sent successfully
    """
    subject = f"[{severity.upper()}] Civic Risk Alert: {alert_title}"
    
    # Text fallback
    body = f"CIVIC RISK COMMAND\n\n{alert_title}\n\n{alert_message}\n\nZone: {zone if zone else 'N/A'}\n"
    if extra_details:
        for k, v in extra_details.items():
            body += f"{k}: {v}\n"
    
    # Determine styles based on context and severity
    is_completion = "completed" in alert_title.lower() or "accomplished" in alert_title.lower()
    is_event_op = "event operations" in alert_title.lower() or "event response" in alert_title.lower()
    
    bg_color = "#111827"  # Deep dark background per screenshot
    table_bg = "#1f2937"  # Charcoal table background
    border_color = "#374151"
    
    color_map = {
        "critical": "#ef4444",
        "high": "#f97316",
        "medium": "#eab308",
        "low": "#3b82f6",
        "info": "#3b82f6",
    }
    
    accent_color = color_map.get(severity.lower(), "#3b82f6")
    
    # Icon and Label Logic from screenshots
    header_icon = "🏛️" 
    
    if is_event_op:
        status_icon = "✅" if is_completion else "ℹ️" # Blue info-like icon for event ops
        status_label = "MISSION ACCOMPLISHED" if is_completion else f"{severity.upper()} PRIORITY DISPATCH"
        card_title = "Tactical Mission Completed" if is_completion else "Event Operations Deployed"
    else:
        status_icon = "✅" if is_completion else "🚨" if severity.lower() in ["critical", "high"] else "⚠️"
        status_label = "MISSION ACCOMPLISHED" if is_completion else f"{severity.upper()} PRIORITY DISPATCH"
        card_title = "Tactical Mission Completed" if is_completion else "Tactical Mission Deployed"
    
    # Detail rows construction
    table_rows = ""
    
    # Logic to handle first field dynamically
    details = extra_details or {}
    
    # Special Handling for Task Emails (Event Operations)
    if is_event_op:
        # If "Event Name" isn't in details, use zone as proxy if available
        if "Event Name" not in details:
             table_rows += f"""
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid {border_color}; width: 35%; background-color: {table_bg};">
                <span style="color: #ffffff; font-size: 14px; font-weight: 700;">Event Name</span>
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid {border_color}; background-color: {table_bg};">
                <span style="color: #d1d5db; font-size: 14px;">{zone if zone else 'Administrative Task'}</span>
            </td>
        </tr>
        """
    else:
        # Inspection format: "Location" first
        if "Location" not in details:
             table_rows += f"""
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid {border_color}; width: 35%; background-color: {table_bg};">
                <span style="color: #ffffff; font-size: 14px; font-weight: 700;">Location</span>
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid {border_color}; background-color: {table_bg};">
                <span style="color: #d1d5db; font-size: 14px;">{zone if zone else 'Global'}</span>
            </td>
        </tr>
        """
    
    for key, value in details.items():
        # Avoid duplicate Status field since it's added manually at the end
        if key.lower() == "status":
            continue

        # Handle priority labels with icons if they are strings
        display_value = value
        if key.lower() == "priority level" or key.lower() == "priority":
            if "SUDDEN ACTION" in str(value).upper():
                display_value = f"🔴 SUDDEN ACTION" if "🔴" not in str(value) else value
            elif "NORMAL" in str(value).upper():
                display_value = f"🔵 NORMAL" if "🔵" not in str(value) else value
            elif "CRITICAL" in str(value).upper():
                display_value = f"🔴 CRITICAL" if "🔴" not in str(value) else value
            elif "HIGH" in str(value).upper():
                display_value = f"🟠 HIGH" if "🟠" not in str(value) else value

        table_rows += f"""
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid {border_color}; width: 35%; background-color: {table_bg}; vertical-align: top;">
                <span style="color: #ffffff; font-size: 14px; font-weight: 700;">{key}</span>
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid {border_color}; background-color: {table_bg};">
                <span style="color: #d1d5db; font-size: 14px;">{display_value}</span>
            </td>
        </tr>
        """
        
    final_status = "Completed" if is_completion else "Action Required"
    table_rows += f"""
    <tr>
        <td style="padding: 12px 16px; width: 35%; background-color: {table_bg};">
            <span style="color: #ffffff; font-size: 14px; font-weight: 700;">Status</span>
        </td>
        <td style="padding: 12px 16px; background-color: {table_bg};">
            <span style="color: #d1d5db; font-size: 14px;">{final_status}</span>
        </td>
    </tr>
    """

    footer_info = "Review Full Report in System" if is_completion else "Login to the system to take action"

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Civic Risk Alert</title>
</head>
<body style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <div style="background-color: #000000; padding: 20px 10px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: {bg_color}; border-radius: 16px; overflow: hidden; border: 1px solid #1f2937; padding: 32px; box-sizing: border-box; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);">
            
            <!-- Header -->
            <div style="margin-bottom: 28px; text-align: left;">
                <div style="margin-bottom: 12px; line-height: 1;">
                    <span style="font-size: 24px; vertical-align: middle; display: inline-block;">{header_icon}</span>
                    <span style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 1px; vertical-align: middle; margin-left: 8px; text-transform: uppercase;">CIVIC RISK COMMAND</span>
                </div>
                <div style="padding-left: 2px;">
                    <span style="font-size: 16px; vertical-align: middle; display: inline-block;">{status_icon}</span>
                    <span style="font-size: 11px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px; vertical-align: middle; margin-left: 6px;">{status_label}</span>
                </div>
            </div>

            <!-- Title -->
            <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #ffffff; letter-spacing: -0.03em; line-height: 1.2;">{card_title}</h2>

            <!-- Details Table -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid {border_color}; border-radius: 12px; border-collapse: separate; border-spacing: 0; overflow: hidden; margin-bottom: 28px; background-color: {table_bg}; table-layout: fixed;">
                <thead>
                    <tr style="background-color: rgba(255,255,255,0.03);">
                        <th align="left" style="padding: 14px 16px; border-bottom: 1px solid {border_color}; width: 35%; color: #9ca3af; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Field</th>
                        <th align="left" style="padding: 14px 16px; border-bottom: 1px solid {border_color}; color: #9ca3af; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Details</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows}
                </tbody>
            </table>

            <!-- Security Footer -->
            <div style="border-top: 1px solid #1f2937; padding-top: 20px; text-align: left;">
                <p style="font-size: 14px; font-weight: 800; color: #3b82f6; margin: 0 0 10px 0; letter-spacing: 0.5px;">[ {footer_info.upper()} ]</p>
                <p style="font-size: 13px; color: #9ca3af; line-height: 1.6; margin: 0; font-style: italic;">
                    This is a secure dispatch from the Civic Risk System. Do not reply directly to this automated email.
                </p>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <p style="font-size: 11px; color: #4b5563; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">&copy; 2026 Civic Risk Operations</p>
        </div>
    </div>
</body>
</html>"""
    
    return await send_email(to_email, subject, body, html_body)
    
    return await send_email(to_email, subject, body, html_body)



async def send_welcome_email(to_email: str, username: str) -> bool:
    """Send welcome email to new user"""
    subject = "Welcome to Civic Risk Management System"
    
    body = f"""
Hello {username},

Welcome to the Civic Risk Management System!

Your account has been successfully created. You can now log in to access the platform.

If you have any questions, please contact your administrator.

Best regards,
Civic Risk Management Team
    """
    
    return await send_email(to_email, subject, body)
