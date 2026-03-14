"""Authentication service for user management"""
from typing import Optional
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.core.security import verify_password, get_password_hash, create_access_token
from app.schemas.auth import UserRegister, UserLogin
from app.services.audit_service import AuditService


class AuthService:
    """Authentication service"""
    
    @staticmethod
    async def register_user(user_data: UserRegister) -> User:
        """
        Register a new user
        
        Args:
            user_data: User registration data
            
        Returns:
            Created user
            
        Raises:
            HTTPException: If user already exists
        """
        # Check if user exists
        existing_user = await User.find_one(User.email == user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check username
        existing_username = await User.find_one(User.username == user_data.username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Create user
        user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=get_password_hash(user_data.password),
            full_name=user_data.full_name,
            role=UserRole(user_data.role) if user_data.role else UserRole.VIEWER
        )
        
        await user.insert()
        
        # Log audit
        await AuditService.log_action(
            user_id=str(user.id),
            user_email=user.email,
            action="user_registered",
            resource_type="user",
            resource_id=str(user.id),
            details={"username": user.username, "role": user.role.value}
        )
        
        return user
    
    @staticmethod
    async def authenticate_user(email: Optional[str], username: Optional[str], password: str) -> Optional[User]:
        """
        Authenticate user with email OR username and password
        
        Args:
            email: User email (optional)
            username: User username (optional)
            password: User password
            
        Returns:
            User if authenticated, None otherwise
        """
        user = None
        if email:
            user = await User.find_one(User.email == email)
        elif username:
            # Try to find by username first
            user = await User.find_one(User.username == username)
            # If not found and input looks like an email, try finding by email
            if not user and "@" in username:
                user = await User.find_one(User.email == username)
            
        if not user:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        await user.save()
        
        return user
    
    @staticmethod
    async def login(login_data: UserLogin) -> dict:
        """
        Login user and generate access token
        
        Args:
            login_data: Login credentials
            
        Returns:
            Dictionary with access token and user data
            
        Raises:
            HTTPException: If credentials are invalid
        """
        user = await AuthService.authenticate_user(
            email=login_data.email,
            username=login_data.username,
            password=login_data.password
        )
        
        if not user:
            # Log failed login attempt
            await AuditService.log_action(
                user_id=None,
                user_email=login_data.email or login_data.username,
                action="user_login_failed",
                resource_type="auth",
                status="failed",
                details={"reason": "incorrect_credentials"}
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email/username or password",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role.value}
        )
        
        # Log successful login
        await AuditService.log_action(
            user_id=str(user.id),
            user_email=user.email,
            action="user_login",
            resource_type="auth",
            resource_id=str(user.id),
            status="success"
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "role": user.role.value,
                "assigned_zones": user.assigned_zones,
                "jurisdiction": user.jurisdiction
            }
        }
    
    @staticmethod
    async def get_user_by_email(email: str) -> Optional[User]:
        """Get user by email"""
        return await User.find_one(User.email == email)
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[User]:
        """Get user by ID"""
        return await User.get(user_id)
    
    @staticmethod
    async def update_user(user_id: str, update_data: dict) -> User:
        """
        Update user information
        
        Args:
            user_id: User ID
            update_data: Fields to update
            
        Returns:
            Updated user
            
        Raises:
            HTTPException: If user not found
        """
        user = await User.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update fields
        for field, value in update_data.items():
            if value is not None and hasattr(user, field):
                setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        await user.save()
        
        return user
    
    @staticmethod
    async def change_password(user_id: str, current_password: str, new_password: str) -> bool:
        """
        Change user password
        
        Args:
            user_id: User ID
            current_password: Current password
            new_password: New password
            
        Returns:
            True if password changed successfully
            
        Raises:
            HTTPException: If current password is incorrect
        """
        user = await User.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        user.hashed_password = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        await user.save()
        
        return True

    @staticmethod
    async def create_reset_token(username_or_email: str) -> Optional[str]:
        """Create a password reset token (15 min expiry)"""
        user = await User.find_one(User.email == username_or_email)
        if not user:
            user = await User.find_one(User.username == username_or_email)
            
        if not user:
            return None
            
        return create_access_token(
            data={"sub": user.email, "type": "password_reset"},
            expires_delta=timedelta(minutes=15)
        )

    @staticmethod
    async def reset_password_with_token(token: str, new_password: str) -> bool:
        """Reset password using a valid reset token"""
        from app.core.security import decode_access_token
        
        payload = decode_access_token(token)
        if not payload or payload.get("type") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
            
        email = payload.get("sub")
        user = await User.find_one(User.email == email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        user.hashed_password = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        await user.save()
        
        return True
