"""User management API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.api.v1.auth import get_current_user
from app.models.user import User, UserRole
from app.schemas.auth import UserResponse, UserRegister, UserUpdate
from app.services.user_service import UserService
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/users", tags=["User Management"])


class PasswordReset(BaseModel):
    """Password reset request"""
    new_password: str = Field(..., min_length=8)


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.get("")
async def get_users(
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_admin)
):
    """Get all users with optional filtering (Admin only)"""
    users = await UserService.get_all_users(
        role=role,
        is_active=is_active,
        skip=skip,
        limit=limit
    )
    
    return {
        "users": [
            UserResponse(
                id=str(user.id),
                email=user.email,
                username=user.username,
                full_name=user.full_name,
                role=user.role.value,
                assigned_zones=user.assigned_zones,
                jurisdiction=user.jurisdiction,
                is_active=user.is_active,
                created_at=user.created_at,
                last_login=user.last_login
            )
            for user in users
        ],
        "total": len(users)
    }


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserRegister,
    current_user: User = Depends(require_admin)
):
    """Create a new user (Admin only)"""
    user = await UserService.create_user(
        user_data.model_dump(),
        created_by=str(current_user.id)
    )
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role.value,
        assigned_zones=user.assigned_zones,
        jurisdiction=user.jurisdiction,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(require_admin)
):
    """Get user by ID (Admin only)"""
    user = await UserService.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role.value,
        assigned_zones=user.assigned_zones,
        jurisdiction=user.jurisdiction,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    update_data: UserUpdate,
    current_user: User = Depends(require_admin)
):
    """Update user information (Admin only)"""
    user = await UserService.update_user(
        user_id,
        update_data.model_dump(exclude_unset=True),
        updated_by=str(current_user.id)
    )
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role.value,
        assigned_zones=user.assigned_zones,
        jurisdiction=user.jurisdiction,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_admin)
):
    """Delete a user (Admin only)"""
    # Prevent self-deletion
    if str(current_user.id) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    await UserService.delete_user(user_id, deleted_by=str(current_user.id))
    return None


@router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    password_data: PasswordReset,
    current_user: User = Depends(require_admin)
):
    """Reset user password (Admin only)"""
    user = await UserService.reset_user_password(
        user_id,
        password_data.new_password,
        reset_by=str(current_user.id)
    )
    
    return {
        "message": "Password reset successfully",
        "user_id": str(user.id),
        "email": user.email
    }
