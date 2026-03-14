from beanie import Document
from pydantic import Field
from typing import List, Optional
from datetime import datetime

class KnowledgeBaseArticle(Document):
    """Knowledge Base Article document model"""
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1, max_length=50) # SOPs, Safety, Documentation, Emergency
    tags: List[str] = Field(default_factory=list)
    
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    
    view_count: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "knowledge_base"
        indexes = [
            "title",
            "category",
            "tags"
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Waste Management SOP",
                "content": "Standard operating procedure for waste collection...",
                "category": "SOPs",
                "tags": ["waste", "sanitation", "protocol"],
                "author_name": "Admin User",
                "view_count": 15
            }
        }
