from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from beanie import PydanticObjectId

class KnowledgeBaseArticleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1, max_length=50)
    tags: List[str] = []

class KnowledgeBaseArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    tags: Optional[List[str]] = None

class KnowledgeBaseArticleResponse(BaseModel):
    id: PydanticObjectId = Field(default_factory=PydanticObjectId, alias="_id")
    title: str
    content: str
    category: str
    tags: List[str]
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    view_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class KnowledgeBaseArticleFilter(BaseModel):
    category: Optional[str] = None
    tags: Optional[str] = None # Comma separated
    search: Optional[str] = None
    skip: int = 0
    limit: int = 20
