"""Risk scoring logic"""
from typing import Dict, Any
import numpy as np


class RiskScorer:
    """Risk scoring calculator"""
    
    @staticmethod
    def calculate_risk_score(features: Dict[str, Any]) -> float:
        """
        Calculate risk score based on features
        
        Args:
            features: Dictionary of features
            
        Returns:
            Risk score between 0 and 1
        """
        score = 0.0
        
        # Category risk weights
        category_weights = {
            'road_safety': 0.8,
            'public_health': 0.9,
            'infrastructure': 0.7,
            'sanitation': 0.6,
            'water_supply': 0.7,
            'electricity': 0.6,
            'environment': 0.5,
            'other': 0.3
        }
        
        category = features.get('category', 'other')
        score += category_weights.get(category, 0.3) * 0.4
        
        # Priority weight
        priority_weights = {'low': 0.2, 'medium': 0.5, 'high': 0.8, 'critical': 1.0}
        priority = features.get('priority', 'medium')
        score += priority_weights.get(priority, 0.5) * 0.3
        
        # Upvotes weight (normalized)
        upvotes = features.get('upvotes', 0)
        upvote_score = min(upvotes / 20.0, 1.0)  # Cap at 20 upvotes
        score += upvote_score * 0.2
        
        # Time-based urgency
        if features.get('is_business_hours', 0):
            score += 0.05
        
        if features.get('is_weekend', 0):
            score += 0.05
        
        # Clamp to [0, 1]
        return max(0.0, min(1.0, score))
    
    @staticmethod
    def get_risk_level(risk_score: float) -> str:
        """Convert risk score to risk level"""
        if risk_score >= 0.8:
            return "critical"
        elif risk_score >= 0.6:
            return "high"
        else:
            return "medium"
    
    @staticmethod
    def calculate_zone_risk(complaints_data: list) -> Dict[str, float]:
        """Calculate aggregate risk score for zones"""
        zone_risks = {}
        
        for complaint in complaints_data:
            zone = complaint.get('zone')
            if not zone:
                continue
            
            risk_score = RiskScorer.calculate_risk_score(complaint)
            
            if zone not in zone_risks:
                zone_risks[zone] = []
            zone_risks[zone].append(risk_score)
        
        # Calculate average risk per zone
        return {
            zone: np.mean(scores) 
            for zone, scores in zone_risks.items()
        }
