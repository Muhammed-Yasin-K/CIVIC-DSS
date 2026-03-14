"""Authentication API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.schemas.auth import UserLogin, UserRegister, Token, UserResponse, PasswordChange, UserUpdate
from app.services.auth_service import AuthService
from app.models.user import User
from app.core.security import verify_token

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    email = verify_token(token)
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user = await AuthService.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """Register a new user"""
    user = await AuthService.register_user(user_data)
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role.value,  # Explicitly convert to value
        assigned_zones=user.assigned_zones,
        jurisdiction=user.jurisdiction,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )


@router.post("/login", response_model=dict)
async def login(login_data: UserLogin):
    """Login and get access token"""
    return await AuthService.login(login_data)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role.value,  # Explicitly convert to value
        assigned_zones=current_user.assigned_zones,
        jurisdiction=current_user.jurisdiction,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user information"""
    user = await AuthService.update_user(
        str(current_user.id),
        update_data.model_dump(exclude_unset=True)
    )
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role.value,  # Explicitly convert to value
        assigned_zones=user.assigned_zones,
        jurisdiction=user.jurisdiction,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user)
):
    """Change user password"""
    await AuthService.change_password(
        str(current_user.id),
        password_data.current_password,
        password_data.new_password
    )
    
    return {"message": "Password changed successfully"}

@router.post("/forgot-password")
async def forgot_password(request_data: dict):
    """Request a password reset token"""
    username_or_email = request_data.get("username_or_email")
    if not username_or_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is required"
        )
        
    token = await AuthService.create_reset_token(username_or_email)
    if not token:
        # For security, don't reveal if user exists, but here we'll be helpful for now
        # Or just return success regardless
        return {"message": "If an account exists with that email, a reset link has been sent."}
        
    # Send email
    from app.services.email_service import EmailService
    user = await AuthService.get_user_by_email(verify_token(token)) # verify_token extracts sub (email)
    if user:
        await EmailService.send_password_reset_email(user.email, token)
        
    return {"message": "If an account exists with that email, a reset link has been sent."}

@router.post("/reset-password")
async def reset_password(request_data: dict):
    """Reset password using token"""
    token = request_data.get("token")
    new_password = request_data.get("new_password")
    
    if not token or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token and new password are required"
        )
        
    await AuthService.reset_password_with_token(token, new_password)
    return {"message": "Password has been reset successfully"}
