"""Data preprocessing for ML models"""
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime


def preprocess_complaint_data(complaints: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Preprocess complaint data for ML models
    
    Args:
        complaints: List of complaint dictionaries
        
    Returns:
        Preprocessed DataFrame
    """
    df = pd.DataFrame(complaints)
    
    # Convert datetime strings to datetime objects
    if 'created_at' in df.columns:
        df['created_at'] = pd.to_datetime(df['created_at'])
    
    # Extract time features
    if 'created_at' in df.columns:
        df['hour'] = df['created_at'].dt.hour
        df['day_of_week'] = df['created_at'].dt.dayofweek
        df['month'] = df['created_at'].dt.month
        df['day_of_month'] = df['created_at'].dt.day
    
    # Handle missing values
    df = df.fillna({
        'latitude': 0.0,
        'longitude': 0.0,
        'upvotes': 0,
        'priority': 'medium',
        'status': 'pending'
    })
    
    return df


def encode_categorical_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Encode categorical features
    
    Args:
        df: Input DataFrame
        
    Returns:
        DataFrame with encoded features
    """
    # One-hot encode category
    if 'category' in df.columns:
        category_dummies = pd.get_dummies(df['category'], prefix='category')
        df = pd.concat([df, category_dummies], axis=1)
    
    # Encode priority
    priority_map = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
    if 'priority' in df.columns:
        df['priority_encoded'] = df['priority'].map(priority_map).fillna(2)
    
    # Encode status
    status_map = {'pending': 0, 'in_progress': 1, 'resolved': 2, 'closed': 3}
    if 'status' in df.columns:
        df['status_encoded'] = df['status'].map(status_map).fillna(0)
    
    return df


def normalize_features(df: pd.DataFrame, features: List[str]) -> pd.DataFrame:
    """
    Normalize numerical features to [0, 1] range
    
    Args:
        df: Input DataFrame
        features: List of feature names to normalize
        
    Returns:
        DataFrame with normalized features
    """
    for feature in features:
        if feature in df.columns:
            min_val = df[feature].min()
            max_val = df[feature].max()
            if max_val > min_val:
                df[f'{feature}_normalized'] = (df[feature] - min_val) / (max_val - min_val)
            else:
                df[f'{feature}_normalized'] = 0.0
    
    return df


def clean_text_data(text: str) -> str:
    """
    Clean text data
    
    Args:
        text: Input text
        
    Returns:
        Cleaned text
    """
    if not isinstance(text, str):
        return ""
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    return text
