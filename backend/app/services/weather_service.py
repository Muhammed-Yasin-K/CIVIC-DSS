"""Weather service for OpenWeather API integration"""
import httpx
from typing import Optional, Dict, Any
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class WeatherService:
    """Weather data service using OpenWeather API"""
    
    BASE_URL = "https://api.openweathermap.org/data/2.5"
    
    @staticmethod
    async def get_current_weather(
        latitude: float, 
        longitude: float
    ) -> Optional[Dict[str, Any]]:
        """
        Get current weather data for coordinates
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            
        Returns:
            Weather data dictionary or None if failed
        """
        if not settings.OPENWEATHER_API_KEY:
            logger.warning("OpenWeather API key not configured")
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{WeatherService.BASE_URL}/weather",
                    params={
                        "lat": latitude,
                        "lon": longitude,
                        "appid": settings.OPENWEATHER_API_KEY,
                        "units": "metric"
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "temperature": data["main"]["temp"],
                        "feels_like": data["main"]["feels_like"],
                        "humidity": data["main"]["humidity"],
                        "pressure": data["main"]["pressure"],
                        "weather": data["weather"][0]["main"],
                        "description": data["weather"][0]["description"],
                        "wind_speed": data["wind"]["speed"],
                        "clouds": data["clouds"]["all"],
                        "timestamp": data["dt"]
                    }
                else:
                    logger.error(f"OpenWeather API error: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to fetch weather data: {e}")
            return None
    
    @staticmethod
    async def get_weather_by_city(city: str) -> Optional[Dict[str, Any]]:
        """
        Get current weather data for a city
        
        Args:
            city: City name
            
        Returns:
            Weather data dictionary or None if failed
        """
        if not settings.OPENWEATHER_API_KEY:
            logger.warning("OpenWeather API key not configured")
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{WeatherService.BASE_URL}/weather",
                    params={
                        "q": city,
                        "appid": settings.OPENWEATHER_API_KEY,
                        "units": "metric"
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "temperature": data["main"]["temp"],
                        "feels_like": data["main"]["feels_like"],
                        "humidity": data["main"]["humidity"],
                        "pressure": data["main"]["pressure"],
                        "weather": data["weather"][0]["main"],
                        "description": data["weather"][0]["description"],
                        "wind_speed": data["wind"]["speed"],
                        "clouds": data["clouds"]["all"],
                        "latitude": data["coord"]["lat"],
                        "longitude": data["coord"]["lon"],
                        "timestamp": data["dt"]
                    }
                else:
                    logger.error(f"OpenWeather API error: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to fetch weather data: {e}")
            return None
    
    @staticmethod
    async def get_forecast(
        latitude: float, 
        longitude: float,
        days: int = 5
    ) -> Optional[Dict[str, Any]]:
        """
        Get weather forecast for coordinates
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            days: Number of days (max 5 for free tier)
            
        Returns:
            Forecast data dictionary or None if failed
        """
        if not settings.OPENWEATHER_API_KEY:
            logger.warning("OpenWeather API key not configured")
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{WeatherService.BASE_URL}/forecast",
                    params={
                        "lat": latitude,
                        "lon": longitude,
                        "appid": settings.OPENWEATHER_API_KEY,
                        "units": "metric",
                        "cnt": days * 8  # 8 forecasts per day (3-hour intervals)
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    forecasts = []
                    
                    for item in data["list"]:
                        forecasts.append({
                            "timestamp": item["dt"],
                            "temperature": item["main"]["temp"],
                            "humidity": item["main"]["humidity"],
                            "weather": item["weather"][0]["main"],
                            "description": item["weather"][0]["description"],
                            "wind_speed": item["wind"]["speed"],
                            "rain_probability": item.get("pop", 0)
                        })
                    
                    return {
                        "city": data["city"]["name"],
                        "forecasts": forecasts
                    }
                else:
                    logger.error(f"OpenWeather API error: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to fetch forecast data: {e}")
            return None
