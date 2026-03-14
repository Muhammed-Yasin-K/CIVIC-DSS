"""Service for helpdesk tickets and reset requests"""
from typing import List, Optional
from datetime import datetime
from app.models.support import SupportTicket, PasswordResetRequest, TicketStatus
from app.schemas.support import TicketCreate, TicketUpdate, PasswordResetCreate
from app.models.user import User


class SupportService:
    """Service for managing support tickets and reset requests"""
    
    @staticmethod
    async def create_ticket(user: User, ticket_data: TicketCreate) -> SupportTicket:
        """Create a new support ticket"""
        ticket = SupportTicket(
            user_id=str(user.id),
            username=user.username,
            subject=ticket_data.subject,
            category=ticket_data.category,
            description=ticket_data.description
        )
        await ticket.insert()
        return ticket
    
    @staticmethod
    async def get_user_tickets(user_id: str) -> List[SupportTicket]:
        """Get all tickets for a specific user"""
        return await SupportTicket.find(SupportTicket.user_id == user_id).sort("-created_at").to_list()
    
    @staticmethod
    async def get_all_tickets() -> List[SupportTicket]:
        """Get all tickets (for admins)"""
        return await SupportTicket.find_all().sort("-created_at").to_list()
    
    @staticmethod
    async def update_ticket(ticket_id: str, update_data: TicketUpdate, admin_id: str) -> Optional[SupportTicket]:
        """Update a ticket (status or admin response)"""
        ticket = await SupportTicket.get(ticket_id)
        if not ticket:
            return None
        
        if update_data.status:
            ticket.status = update_data.status
        if update_data.admin_response:
            ticket.admin_response = update_data.admin_response
            ticket.admin_id = admin_id
        
        ticket.updated_at = datetime.utcnow()
        if ticket.status == TicketStatus.RESOLVED:
            ticket.resolved_at = datetime.utcnow()
            
        await ticket.save()
        return ticket

    @staticmethod
    async def create_reset_request(request_data: PasswordResetCreate) -> PasswordResetRequest:
        """Create a new password reset request"""
        # Check if one already exists for this user in pending status
        existing = await PasswordResetRequest.find_one(
            PasswordResetRequest.username_or_id == request_data.username_or_id,
            PasswordResetRequest.status == "pending"
        )
        if existing:
            return existing
            
        request = PasswordResetRequest(
            username_or_id=request_data.username_or_id
        )
        await request.insert()
        return request

    @staticmethod
    async def get_all_reset_requests() -> List[PasswordResetRequest]:
        """Get all reset requests (for admins)"""
        return await PasswordResetRequest.find_all().sort("-created_at").to_list()

    @staticmethod
    async def process_reset_request(request_id: str, status: str) -> Optional[PasswordResetRequest]:
        """Process a reset request (approve or reject)"""
        request = await PasswordResetRequest.get(request_id)
        if not request:
            return None
        
        request.status = status
        request.processed_at = datetime.utcnow()
        await request.save()
        return request
