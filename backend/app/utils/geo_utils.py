"""Geographic utility functions"""
from typing import Tuple, List, Optional
from geopy.distance import geodesic
import math


def calculate_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """
    Calculate distance between two coordinates in kilometers
    
    Args:
        lat1: Latitude of first point
        lon1: Longitude of first point
        lat2: Latitude of second point
        lon2: Longitude of second point
        
    Returns:
        Distance in kilometers
    """
    point1 = (lat1, lon1)
    point2 = (lat2, lon2)
    return geodesic(point1, point2).kilometers


def is_within_radius(
    center_lat: float, center_lon: float,
    point_lat: float, point_lon: float,
    radius_km: float
) -> bool:
    """
    Check if a point is within a radius of a center point
    
    Args:
        center_lat: Center latitude
        center_lon: Center longitude
        point_lat: Point latitude
        point_lon: Point longitude
        radius_km: Radius in kilometers
        
    Returns:
        True if point is within radius
    """
    distance = calculate_distance(center_lat, center_lon, point_lat, point_lon)
    return distance <= radius_km


def get_bounding_box(
    lat: float, lon: float, radius_km: float
) -> Tuple[float, float, float, float]:
    """
    Get bounding box coordinates for a radius around a point
    
    Args:
        lat: Center latitude
        lon: Center longitude
        radius_km: Radius in kilometers
        
    Returns:
        Tuple of (min_lat, max_lat, min_lon, max_lon)
    """
    # Earth's radius in kilometers
    earth_radius = 6371.0
    
    # Convert radius to radians
    radius_rad = radius_km / earth_radius
    
    # Calculate latitude bounds
    lat_rad = math.radians(lat)
    min_lat = math.degrees(lat_rad - radius_rad)
    max_lat = math.degrees(lat_rad + radius_rad)
    
    # Calculate longitude bounds
    lon_rad = math.radians(lon)
    delta_lon = math.asin(math.sin(radius_rad) / math.cos(lat_rad))
    min_lon = math.degrees(lon_rad - delta_lon)
    max_lon = math.degrees(lon_rad + delta_lon)
    
    return min_lat, max_lat, min_lon, max_lon


def cluster_points(
    points: List[Tuple[float, float]], 
    radius_km: float = 1.0
) -> List[List[Tuple[float, float]]]:
    """
    Simple clustering of geographic points based on proximity
    
    Args:
        points: List of (latitude, longitude) tuples
        radius_km: Clustering radius in kilometers
        
    Returns:
        List of clusters, each containing points
    """
    if not points:
        return []
    
    clusters = []
    remaining = points.copy()
    
    while remaining:
        # Start new cluster with first remaining point
        center = remaining.pop(0)
        cluster = [center]
        
        # Find all points within radius
        i = 0
        while i < len(remaining):
            point = remaining[i]
            if is_within_radius(center[0], center[1], point[0], point[1], radius_km):
                cluster.append(point)
                remaining.pop(i)
            else:
                i += 1
        
        clusters.append(cluster)
    
    return clusters


def get_center_point(points: List[Tuple[float, float]]) -> Optional[Tuple[float, float]]:
    """
    Calculate the center point (centroid) of a list of coordinates
    
    Args:
        points: List of (latitude, longitude) tuples
        
    Returns:
        Center point as (latitude, longitude) or None if empty
    """
    if not points:
        return None
    
    avg_lat = sum(p[0] for p in points) / len(points)
    avg_lon = sum(p[1] for p in points) / len(points)
    
    return avg_lat, avg_lon
