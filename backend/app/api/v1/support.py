"""Support API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.schemas.support import TicketCreate, TicketResponse, TicketUpdate, PasswordResetCreate, PasswordResetResponse
from app.services.support_service import SupportService
from app.api.v1.auth import get_current_user
from app.models.user import User, UserRole


router = APIRouter(prefix="/support", tags=["Support"])


@router.post("/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_data: TicketCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new support ticket"""
    return await SupportService.create_ticket(current_user, ticket_data)


@router.get("/tickets", response_model=List[TicketResponse])
async def get_tickets(
    current_user: User = Depends(get_current_user)
):
    """Get support tickets (user's own or all if admin)"""
    if current_user.role == UserRole.ADMIN:
        return await SupportService.get_all_tickets()
    return await SupportService.get_user_tickets(str(current_user.id))


@router.patch("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    update_data: TicketUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a support ticket (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update tickets"
        )
    
    ticket = await SupportService.update_ticket(ticket_id, update_data, str(current_user.id))
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    return ticket


@router.post("/password-reset", status_code=status.HTTP_202_ACCEPTED)
async def request_password_reset(request_data: PasswordResetCreate):
    """Request a password reset (Public)"""
    await SupportService.create_reset_request(request_data)
    return {"message": "Reset request received"}


@router.get("/password-reset", response_model=List[PasswordResetResponse])
async def get_reset_requests(
    current_user: User = Depends(get_current_user)
):
    """Get all password reset requests (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view reset requests"
        )
    return await SupportService.get_all_reset_requests()


@router.patch("/password-reset/{request_id}", response_model=PasswordResetResponse)
async def process_reset_request(
    request_id: str,
    status: str,
    current_user: User = Depends(get_current_user)
):
    """Process a password reset request (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can process reset requests"
        )
    
    request = await SupportService.process_reset_request(request_id, status)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reset request not found"
        )
    return request
