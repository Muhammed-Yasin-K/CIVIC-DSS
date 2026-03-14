"""User management service"""
from typing import List, Optional, Dict, Any
from beanie import PydanticObjectId
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.services.audit_service import AuditService


class UserService:
    """Service for user management operations"""
    
    @staticmethod
    async def get_all_users(
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Get all users with optional filtering"""
        query = {}
        
        if role:
            query["role"] = role
        if is_active is not None:
            query["is_active"] = is_active
        
        users = await User.find(query).skip(skip).limit(limit).to_list()
        return users
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            user = await User.get(PydanticObjectId(user_id))
            return user
        except Exception:
            return None
    
    @staticmethod
    async def create_user(user_data: Dict[str, Any], created_by: str) -> User:
        """Create a new user"""
        # Check if user already exists
        existing_user = await User.find_one(User.email == user_data["email"])
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Hash password
        hashed_password = get_password_hash(user_data.pop("password"))
        
        # Create user
        user = User(
            **user_data,
            hashed_password=hashed_password,
            is_custom=True
        )
        
        await user.insert()
        
        # Log audit
        await AuditService.log_action(
            user_id=created_by,
            action="create_user",
            resource_type="user",
            resource_id=str(user.id),
            details={"email": user.email, "role": user.role.value}
        )
        
        return user
    
    @staticmethod
    async def update_user(user_id: str, update_data: Dict[str, Any], updated_by: str) -> User:
        """Update user information"""
        user = await UserService.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Don't allow password updates through this method
        if "password" in update_data:
            del update_data["password"]
        if "hashed_password" in update_data:
            del update_data["hashed_password"]
        
        # Update fields
        for key, value in update_data.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        from datetime import datetime
        user.updated_at = datetime.utcnow()
        
        await user.save()
        
        # Log audit
        await AuditService.log_action(
            user_id=updated_by,
            action="update_user",
            resource_type="user",
            resource_id=str(user.id),
            details={"updated_fields": list(update_data.keys())}
        )
        
        return user
    
    @staticmethod
    async def delete_user(user_id: str, deleted_by: str) -> bool:
        """Delete a user"""
        user = await UserService.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Log audit before deletion
        await AuditService.log_action(
            user_id=deleted_by,
            action="delete_user",
            resource_type="user",
            resource_id=str(user.id),
            details={"email": user.email, "role": user.role.value}
        )
        
        await user.delete()
        return True
    
    @staticmethod
    async def reset_user_password(user_id: str, new_password: str, reset_by: str) -> User:
        """Reset user password"""
        user = await UserService.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Hash new password
        user.hashed_password = get_password_hash(new_password)
        
        from datetime import datetime
        user.updated_at = datetime.utcnow()
        
        await user.save()
        
        # Log audit
        await AuditService.log_action(
            user_id=reset_by,
            action="reset_password",
            resource_type="user",
            resource_id=str(user.id),
            details={"email": user.email}
        )
        
        return user
    
    @staticmethod
    async def get_users_count() -> int:
        """Get total number of users"""
        return await User.count()
    
    @staticmethod
    async def get_users_by_role(role: UserRole) -> List[User]:
        """Get all users with a specific role"""
        users = await User.find(User.role == role).to_list()
        return users
