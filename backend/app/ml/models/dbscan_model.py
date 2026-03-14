"""DBSCAN clustering for hotspot detection"""
from sklearn.cluster import DBSCAN
import numpy as np
from typing import List, Dict, Any, Tuple, Optional


class DBSCANModel:
    """DBSCAN clustering for geographic hotspot detection"""
    
    def __init__(self, eps: float = 0.001, min_samples: int = 3):
        """
        Initialize DBSCAN model
        
        Args:
            eps: Maximum distance between points (in radians for haversine)
                 Approx 0.0001 radians ≈ 0.637 km
            min_samples: Minimum points to form a cluster
        """
        self.eps = eps
        self.min_samples = min_samples
        # Use haversine metric for geographic data
        self.model = DBSCAN(eps=eps, min_samples=min_samples, metric='haversine', algorithm='ball_tree')
    
    def detect_hotspots(
        self, 
        coordinates: List[Tuple[float, float]],
        weights: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """
        Detect geographic hotspots
        
        Args:
            coordinates: List of (latitude, longitude) tuples
            weights: Optional list of weights for each point (e.g., risk scores)
            
        Returns:
            Dictionary with cluster information
        """
        if len(coordinates) < self.min_samples:
            return {
                "num_clusters": 0,
                "clusters": [],
                "noise_points": len(coordinates)
            }
        
        # Convert to numpy array and then to radians for haversine
        X_deg = np.array(coordinates)
        X = np.radians(X_deg)
        
        # Fit model
        labels = self.model.fit_predict(X)
        
        # Process results
        unique_labels = set(labels)
        num_clusters = len(unique_labels) - (1 if -1 in unique_labels else 0)
        
        clusters = []
        for label in unique_labels:
            if label == -1:
                continue  # Skip noise points
            
            mask = (labels == label)
            cluster_points = X[mask]
            
            # Use degrees for human-readable output
            cluster_points_deg = X_deg[mask]
            center = cluster_points_deg.mean(axis=0)
            
            cluster_info = {
                "cluster_id": int(label),
                "center_lat": float(center[0]),
                "center_lon": float(center[1]),
                "num_points": int(mask.sum()),
            }
            
            # Incorporate weights if provided
            if weights is not None:
                cluster_weights = np.array(weights)[mask]
                cluster_info.update({
                    "avg_weight": float(cluster_weights.mean()),
                    "max_weight": float(cluster_weights.max()),
                    "total_weight": float(cluster_weights.sum())
                })
            
            clusters.append(cluster_info)
        
        noise_points = int((labels == -1).sum())
        
        return {
            "num_clusters": num_clusters,
            "clusters": clusters,
            "noise_points": noise_points,
            "total_points": len(coordinates)
        }
    
    def find_hotspots_from_complaints(
        self, 
        complaints: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Find hotspots from complaint data
        
        Args:
            complaints: List of complaint dictionaries with lat/lon
            
        Returns:
            Hotspot detection results
        """
        # Extract coordinates
        coordinates = []
        for complaint in complaints:
            lat = complaint.get('latitude')
            lon = complaint.get('longitude')
            if lat is not None and lon is not None:
                coordinates.append((lat, lon))
        
        if not coordinates:
            return {
                "num_clusters": 0,
                "clusters": [],
                "noise_points": 0
            }
        
        return self.detect_hotspots(coordinates)
