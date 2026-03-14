from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.models.knowledge_base import KnowledgeBaseArticle
from app.schemas.knowledge_base import KnowledgeBaseArticleCreate, KnowledgeBaseArticleUpdate, KnowledgeBaseArticleResponse
from app.api.v1.auth import get_current_user
from app.models.user import User, UserRole
from datetime import datetime

router = APIRouter(prefix="/knowledge-base", tags=["Knowledge Base"])

@router.post("/", response_model=KnowledgeBaseArticleResponse, status_code=status.HTTP_201_CREATED)
async def create_article(
    article_data: KnowledgeBaseArticleCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new article (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create articles"
        )
    
    article = KnowledgeBaseArticle(
        **article_data.model_dump(),
        author_id=str(current_user.id),
        author_name=current_user.full_name or current_user.username
    )
    await article.create()
    return article

@router.get("/", response_model=List[KnowledgeBaseArticleResponse])
async def get_articles(
    category: Optional[str] = None,
    search: Optional[str] = None,
    tag: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Get articles with filters"""
    query = KnowledgeBaseArticle.find_all()
    
    if category:
        query = query.find(KnowledgeBaseArticle.category == category)
        
    if tag:
        from beanie.operators import In
        query = query.find(In(KnowledgeBaseArticle.tags, [tag]))
        
    if search:
        # Simple regex search on title
        from beanie.operators import RegEx
        query = query.find(RegEx(KnowledgeBaseArticle.title, search, "i"))
        
    articles = await query.skip(skip).limit(limit).sort("-created_at").to_list()
    return articles

@router.get("/{article_id}", response_model=KnowledgeBaseArticleResponse)
async def get_article(
    article_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get article by ID and increment view count"""
    article = await KnowledgeBaseArticle.get(article_id)
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
        
    # Increment view count
    article.view_count += 1
    await article.save()
    
    return article

@router.put("/{article_id}", response_model=KnowledgeBaseArticleResponse)
async def update_article(
    article_id: str,
    article_data: KnowledgeBaseArticleUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update article (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update articles"
        )
        
    article = await KnowledgeBaseArticle.get(article_id)
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
        
    update_dict = article_data.model_dump(exclude_unset=True)
    if update_dict:
        article.updated_at = datetime.utcnow()
        await article.update({"$set": update_dict})
        
    return article

@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    article_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete article (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete articles"
        )
        
    article = await KnowledgeBaseArticle.get(article_id)
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
        
    await article.delete()
