"""Feature engineering for ML models"""
import pandas as pd
from typing import Dict, Any, List
from datetime import datetime


def extract_temporal_features(df: pd.DataFrame, datetime_col: str = 'created_at') -> pd.DataFrame:
    """Extract temporal features from datetime column"""
    if datetime_col not in df.columns:
        return df
    
    df[datetime_col] = pd.to_datetime(df[datetime_col])
    
    df['hour'] = df[datetime_col].dt.hour
    df['day_of_week'] = df[datetime_col].dt.dayofweek
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    df['month'] = df[datetime_col].dt.month
    df['quarter'] = df[datetime_col].dt.quarter
    df['is_business_hours'] = df['hour'].between(9, 17).astype(int)
    
    return df


def extract_location_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract location-based features"""
    if 'latitude' in df.columns and 'longitude' in df.columns:
        # Calculate distance from city center (example: Bangalore)
        center_lat, center_lon = 12.9716, 77.5946
        
        df['distance_from_center'] = ((df['latitude'] - center_lat)**2 + 
                                       (df['longitude'] - center_lon)**2)**0.5
    
    return df


def calculate_aggregated_features(
    df: pd.DataFrame, 
    group_by: str, 
    agg_col: str
) -> pd.DataFrame:
    """Calculate aggregated features"""
    if group_by not in df.columns or agg_col not in df.columns:
        return df
    
    # Count by group
    count_by_group = df.groupby(group_by)[agg_col].count().to_dict()
    df[f'{group_by}_count'] = df[group_by].map(count_by_group)
    
    return df


def create_interaction_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create interaction features"""
    # Example: priority × upvotes
    if 'priority_encoded' in df.columns and 'upvotes' in df.columns:
        df['priority_upvotes_interaction'] = df['priority_encoded'] * df['upvotes']
    
    # Example: is_weekend × hour
    if 'is_weekend' in df.columns and 'hour' in df.columns:
        df['weekend_hour_interaction'] = df['is_weekend'] * df['hour']
    
    return df


def extract_text_features(text: str) -> Dict[str, Any]:
    """Extract features from text"""
    if not isinstance(text, str):
        return {
            'text_length': 0,
            'word_count': 0,
            'has_urgent_keywords': 0
        }
    
    urgent_keywords = ['urgent', 'emergency', 'critical', 'immediate', 'danger']
    
    return {
        'text_length': len(text),
        'word_count': len(text.split()),
        'has_urgent_keywords': int(any(keyword in text.lower() for keyword in urgent_keywords))
    }
